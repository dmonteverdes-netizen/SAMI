// ─── Envío Directo a SUNAT (SEE – Del Contribuyente) vía Lycet ───
// Lycet (https://github.com/giansalex/lycet, MIT) es una API REST sobre Greenter que arma el XML
// UBL 2.1, lo firma con el certificado de la empresa, lo envía al web service de SUNAT y devuelve el
// CDR. SAMI lo usa como servicio aparte (Docker o PHP):
//   LYCET_API_URL   = URL base de Lycet (p. ej. http://localhost:8000)
//   LYCET_API_TOKEN = token de Lycet (variable CLIENT_TOKEN de Lycet)
//   LYCET_SUNAT_ENV = "beta" | "produccion" (solo informativo; el destino real lo define FE_URL en Lycet)
//
// PENDIENTE para producción (AGENTS.md §8):
// - Cada MYPE debe estar afiliada al SEE – Del Contribuyente ante SUNAT; según fuentes de la industria
//   esto exige un proceso de homologación por contribuyente (confirmar con SUNAT).
// - Certificado digital por MYPE (SUNAT entrega el Certificado Digital Tributario gratis a MYPE hasta
//   el 31-12-2027) y usuario secundario SOL, registrados en Lycet vía
//   PUT /api/v1/configuration/company/{ruc}. Custodiar esos secretos exige cifrado y un acuerdo
//   explícito con la MYPE.
// - Boletas sin identificación del cliente: confirmar en beta el tipo de documento "varios".

import { Invoice } from '../../core/types/types';
import { IGV_RATE } from '../../core/services/accountingService';
import { amountInWordsPE } from '../../core/services/amountInWords';
import { EmissionCustomer, EmissionEmitter, EmissionResult, errorMessage } from './emissionTypes';

// ─── Tipos e Interfaces ───

interface LycetCdrResponse {
  accepted?: boolean;
  id?: string;
  code?: string;
  description?: string;
  notes?: string[];
}

interface LycetBillResult {
  success?: boolean;
  error?: { code?: string; message?: string };
  cdrZip?: string;
  cdrResponse?: LycetCdrResponse;
}

interface LycetDocumentResponse {
  xml?: string;
  hash?: string;
  sunatResponse?: LycetBillResult;
}

interface LycetValidationError {
  message?: string;
  field?: string;
}

export interface LycetRequest {
  path: '/api/v1/invoice/send' | '/api/v1/note/send';
  body: Record<string, unknown>;
}

// ─── Constantes y Configuración ───

/** Catálogo 01 de SUNAT: tipo de comprobante. */
const TIPO_DOC: Record<string, string> = {
  FACTURA: '01',
  BOLETA_DE_VENTA: '03',
  NOTA_DE_CREDITO: '07',
  NOTA_DE_DEBITO: '08',
};

/** Monto desde el cual una boleta debe identificar al cliente (S/ 700). */
const BOLETA_ID_THRESHOLD = 700;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function isSunatDirectConfigured(): boolean {
  return Boolean(process.env.LYCET_API_URL && process.env.LYCET_API_TOKEN);
}

function environmentLabel(): string {
  const env = (process.env.LYCET_SUNAT_ENV || 'beta').toLowerCase();
  return env === 'produccion'
    ? 'SUNAT directo vía Lycet — producción'
    : 'SUNAT directo vía Lycet — entorno beta de pruebas (sin validez tributaria)';
}

// ─── Construcción del Documento ───

/**
 * Arma el JSON de Lycet/Greenter. Igual que con Nubefact, SAMI registra el total con IGV incluido, así
 * que el comprobante es una sola línea gravada (tipAfeIgv 10) con base e IGV al 18 %.
 */
export function buildLycetRequest(invoice: Invoice, emitter: EmissionEmitter, customer: EmissionCustomer = {}): LycetRequest {
  const tipoDoc = TIPO_DOC[invoice.documentType];
  if (!tipoDoc) throw new Error(`Tipo de comprobante no soportado: ${invoice.documentType}`);

  const total = round2(invoice.totalAmount);
  const gravada = round2(total / (1 + IGV_RATE));
  const igv = round2(total - gravada);
  const hasRuc = /^\d{11}$/.test(invoice.ruc || '');

  if (tipoDoc === '01' && !hasRuc) throw new Error('Una factura requiere el RUC del cliente.');
  if (tipoDoc === '01' && !customer.name) throw new Error('Una factura requiere la razón social del cliente.');
  if (tipoDoc === '03' && !hasRuc && total >= BOLETA_ID_THRESHOLD) {
    throw new Error(`Una boleta desde S/ ${BOLETA_ID_THRESHOLD} debe identificar al cliente.`);
  }

  const body: Record<string, unknown> = {
    ublVersion: '2.1',
    tipoDoc,
    serie: invoice.series.toUpperCase(),
    correlativo: String(invoice.correlative),
    fechaEmision: `${invoice.issueDate.slice(0, 10)}T00:00:00-05:00`,
    tipoMoneda: 'PEN',
    client: {
      // 6 = RUC. Sin RUC: "clientes varios" (catálogo 06, tipo 0) — confirmar en beta.
      tipoDoc: hasRuc ? '6' : '0',
      numDoc: hasRuc ? invoice.ruc : '00000000',
      rznSocial: customer.name || 'CLIENTES VARIOS',
      address: customer.address ? { direccion: customer.address, codigoPais: 'PE' } : undefined,
      email: customer.email,
    },
    company: {
      ruc: emitter.ruc,
      razonSocial: emitter.businessName,
      nombreComercial: emitter.tradeName || emitter.businessName,
      address: {
        ubigueo: emitter.ubigeo,
        codigoPais: 'PE',
        departamento: emitter.department.toUpperCase(),
        provincia: '-',
        distrito: '-',
        urbanizacion: '-',
        direccion: emitter.address,
        codLocal: '0000',
      },
    },
    mtoOperGravadas: gravada,
    mtoIGV: igv,
    totalImpuestos: igv,
    valorVenta: gravada,
    subTotal: total,
    mtoImpVenta: total,
    details: [
      {
        codProducto: 'SAMI-001',
        unidad: 'NIU',
        descripcion: invoice.description || invoice.category || 'Venta de mercadería',
        cantidad: 1,
        mtoValorUnitario: gravada,
        mtoValorVenta: gravada,
        mtoBaseIgv: gravada,
        porcentajeIgv: IGV_RATE * 100,
        igv,
        tipAfeIgv: '10',
        totalImpuestos: igv,
        mtoPrecioUnitario: total,
      },
    ],
    legends: [{ code: '1000', value: amountInWordsPE(total) }],
  };

  if (tipoDoc === '07' || tipoDoc === '08') {
    const refTipo = TIPO_DOC[invoice.referencedDocumentType || ''];
    if (!refTipo || !invoice.referencedSeries || !invoice.referencedCorrelative) {
      throw new Error('Una nota de crédito/débito requiere el comprobante que modifica.');
    }
    body.tipDocAfectado = refTipo;
    body.numDocfectado = `${invoice.referencedSeries}-${invoice.referencedCorrelative}`;
    // Catálogo 09 (NC) 01 = anulación de la operación; catálogo 10 (ND) 01 = intereses por mora.
    body.codMotivo = '01';
    body.desMotivo = invoice.noteReason || (tipoDoc === '07' ? 'ANULACIÓN DE LA OPERACIÓN' : 'INTERESES POR MORA');
    return { path: '/api/v1/note/send', body };
  }

  body.tipoOperacion = '0101'; // Venta interna
  if (tipoDoc === '01') body.formaPago = { moneda: 'PEN', tipo: 'Contado' };
  return { path: '/api/v1/invoice/send', body };
}

// ─── Envío ───

export async function emitWithSunatDirect(
  invoice: Invoice,
  emitter: EmissionEmitter | null,
  customer: EmissionCustomer = {}
): Promise<EmissionResult> {
  const base: Pick<EmissionResult, 'isSimulated' | 'provider' | 'environmentLabel'> = {
    isSimulated: false,
    provider: 'SUNAT_DIRECTO',
    environmentLabel: environmentLabel(),
  };

  if (!isSunatDirectConfigured()) {
    return { ...base, success: false, errors: ['Falta configurar LYCET_API_URL y LYCET_API_TOKEN.'] };
  }
  if (!emitter) {
    return { ...base, success: false, errors: ['Faltan los datos del emisor (registre la empresa y cargue el padrón SUNAT).'] };
  }

  let request: LycetRequest;
  try {
    request = buildLycetRequest(invoice, emitter, customer);
  } catch (err: unknown) {
    return { ...base, success: false, errors: [errorMessage(err)] };
  }

  try {
    const url = `${process.env.LYCET_API_URL!.replace(/\/$/, '')}${request.path}?token=${encodeURIComponent(process.env.LYCET_API_TOKEN!)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    if (res.status === 400) {
      const validation: LycetValidationError[] = await res.json().catch(() => []);
      const errors = validation.map(v => (v.field ? `${v.field}: ${v.message}` : String(v.message)));
      return { ...base, success: false, errors: errors.length ? errors : ['Lycet rechazó el comprobante (HTTP 400).'] };
    }
    if (!res.ok) {
      return { ...base, success: false, errors: [`Lycet respondió HTTP ${res.status}`] };
    }

    const data: LycetDocumentResponse = await res.json();
    const sunat = data.sunatResponse || {};
    if (!sunat.success) {
      const code = sunat.error?.code;
      return {
        ...base,
        success: false,
        sunatCode: code,
        signedXml: data.xml,
        documentHash: data.hash,
        errors: [`SUNAT no recibió el comprobante${code ? ` (código ${code})` : ''}: ${sunat.error?.message || 'sin detalle'}`],
      };
    }

    const cdr = sunat.cdrResponse || {};
    const accepted = typeof cdr.accepted === 'boolean' ? cdr.accepted : cdr.code === '0';
    const notes = cdr.notes?.length ? ` Observaciones: ${cdr.notes.join('; ')}` : '';
    return {
      ...base,
      success: true,
      acceptedBySunat: accepted,
      sunatCode: cdr.code,
      sunatMessage: `${cdr.description || ''}${notes}`.trim() || undefined,
      signedXml: data.xml,
      cdrZipBase64: sunat.cdrZip,
      documentHash: data.hash,
    };
  } catch (err: unknown) {
    return { ...base, success: false, errors: [`No se pudo conectar con Lycet: ${errorMessage(err)}`] };
  }
}
