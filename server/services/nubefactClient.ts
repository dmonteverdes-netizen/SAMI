// ─── Cliente del PSE Nubefact (API JSON) ───
// Nubefact entrega a cada cuenta una RUTA (URL) y un TOKEN. La misma API sirve para el modo
// demo/pruebas y para producción: el modo depende de la cuenta, no del código.
//   NUBEFACT_API_URL   = ruta de la cuenta (p. ej. https://api.nubefact.com/api/v1/<id>)
//   NUBEFACT_API_TOKEN = token de la cuenta
// Sin ambas variables, SAMI responde en Modo Demostración y el comprobante NO se envía a SUNAT.
//
// PENDIENTE DE VERIFICAR contra el manual oficial vigente de Nubefact (enviado al crear la cuenta):
// los nombres de los campos de respuesta (aceptada_por_sunat, sunat_description, enlace_del_pdf,
// enlace_del_xml, enlace_del_cdr). El mapeo de respuesta es tolerante a campos ausentes.

import { Invoice } from '../../core/types/types';
import { IGV_RATE } from '../../core/services/accountingService';

// ─── Tipos e Interfaces ───

export interface NubefactCustomer {
  name?: string;
  address?: string;
  email?: string;
}

export interface EmissionResult {
  success: boolean;
  isSimulated: boolean;
  provider: 'NUBEFACT' | 'SIMULADO';
  environmentLabel: string;
  acceptedBySunat?: boolean;
  sunatCode?: string;
  sunatMessage?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  cdrUrl?: string;
  errors?: string[];
}

// ─── Constantes y Configuración ───

const TIPO_COMPROBANTE: Record<string, number> = {
  FACTURA: 1,
  BOLETA_DE_VENTA: 2,
  NOTA_DE_CREDITO: 3,
  NOTA_DE_DEBITO: 4,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function isNubefactConfigured(): boolean {
  return Boolean(process.env.NUBEFACT_API_URL && process.env.NUBEFACT_API_TOKEN);
}

// ─── Construcción del Payload ───

/** "2026-10-15" → "15-10-2026" (formato de fecha de Nubefact). */
export function toNubefactDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
}

/**
 * Arma el JSON "generar_comprobante". SAMI registra el monto total con IGV incluido, por lo que el
 * comprobante se emite como una sola línea gravada (tipo_de_igv 1) desglosando base e IGV al 18%.
 */
export function buildNubefactPayload(invoice: Invoice, customer: NubefactCustomer = {}) {
  const tipo = TIPO_COMPROBANTE[invoice.documentType];
  if (!tipo) throw new Error(`Tipo de comprobante no soportado por Nubefact: ${invoice.documentType}`);

  const total = round2(invoice.totalAmount);
  const gravada = round2(total / (1 + IGV_RATE));
  const igv = round2(total - gravada);

  const hasRuc = /^\d{11}$/.test(invoice.ruc || '');
  if (tipo === 1 && !hasRuc) throw new Error('Una factura requiere el RUC del cliente.');
  if (tipo === 1 && !customer.name) throw new Error('Una factura requiere la razón social del cliente.');

  const payload: Record<string, unknown> = {
    operacion: 'generar_comprobante',
    tipo_de_comprobante: tipo,
    serie: invoice.series.toUpperCase(),
    numero: invoice.correlative,
    sunat_transaction: 1,
    // 6 = RUC; "-" = cliente varios (boletas sin documento del cliente).
    cliente_tipo_de_documento: hasRuc ? '6' : '-',
    cliente_numero_de_documento: hasRuc ? invoice.ruc : '-',
    cliente_denominacion: customer.name || 'CLIENTES VARIOS',
    cliente_direccion: customer.address || '',
    cliente_email: customer.email || '',
    fecha_de_emision: toNubefactDate(invoice.issueDate),
    moneda: 1, // 1 = Soles
    porcentaje_de_igv: (IGV_RATE * 100).toFixed(2),
    total_gravada: gravada,
    total_igv: igv,
    total,
    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: false,
    items: [
      {
        unidad_de_medida: 'NIU',
        codigo: '',
        descripcion: invoice.description || invoice.category || 'Venta de mercadería',
        cantidad: 1,
        valor_unitario: gravada,
        precio_unitario: total,
        subtotal: gravada,
        tipo_de_igv: 1, // Gravado - Operación onerosa
        igv,
        total,
      },
    ],
  };

  if (tipo === 3 || tipo === 4) {
    const refTipo = TIPO_COMPROBANTE[invoice.referencedDocumentType || ''];
    if (!refTipo || !invoice.referencedSeries || !invoice.referencedCorrelative) {
      throw new Error('Una nota de crédito/débito requiere el comprobante que modifica.');
    }
    payload.documento_que_se_modifica_tipo = refTipo;
    payload.documento_que_se_modifica_serie = invoice.referencedSeries;
    payload.documento_que_se_modifica_numero = invoice.referencedCorrelative;
    // 1 = anulación de la operación (NC) / intereses por mora (ND). Ajustar según el motivo real.
    payload[tipo === 3 ? 'tipo_de_nota_de_credito' : 'tipo_de_nota_de_debito'] = 1;
  }

  return payload;
}

// ─── Envío ───

export async function emitWithNubefact(invoice: Invoice, customer: NubefactCustomer = {}): Promise<EmissionResult> {
  if (!isNubefactConfigured()) {
    return {
      success: true,
      isSimulated: true,
      provider: 'SIMULADO',
      environmentLabel: 'Modo Demostración — comprobante NO enviado a SUNAT (configure NUBEFACT_API_URL y NUBEFACT_API_TOKEN)',
      sunatMessage: 'Simulación: no hubo envío a SUNAT.',
    };
  }

  const base: Pick<EmissionResult, 'isSimulated' | 'provider' | 'environmentLabel'> = {
    isSimulated: false,
    provider: 'NUBEFACT',
    environmentLabel: 'Nubefact (el modo pruebas o producción depende de la cuenta configurada)',
  };

  let payload: Record<string, unknown>;
  try {
    payload = buildNubefactPayload(invoice, customer);
  } catch (err: any) {
    return { ...base, success: false, errors: [err.message] };
  }

  try {
    const res = await fetch(process.env.NUBEFACT_API_URL!, {
      method: 'POST',
      headers: {
        Authorization: `Token token="${process.env.NUBEFACT_API_TOKEN}"`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data: any = await res.json().catch(() => ({}));

    if (!res.ok || data.errors) {
      const message = data.errors ? String(data.errors) : `Nubefact respondió HTTP ${res.status}`;
      return { ...base, success: false, sunatCode: data.codigo != null ? String(data.codigo) : undefined, errors: [message] };
    }

    return {
      ...base,
      success: true,
      acceptedBySunat: typeof data.aceptada_por_sunat === 'boolean' ? data.aceptada_por_sunat : undefined,
      sunatCode: data.sunat_responsecode != null ? String(data.sunat_responsecode) : undefined,
      sunatMessage: data.sunat_description || data.sunat_note || undefined,
      pdfUrl: data.enlace_del_pdf || undefined,
      xmlUrl: data.enlace_del_xml || undefined,
      cdrUrl: data.enlace_del_cdr || undefined,
    };
  } catch (err: any) {
    return { ...base, success: false, errors: [`No se pudo conectar con Nubefact: ${err.message}`] };
  }
}
