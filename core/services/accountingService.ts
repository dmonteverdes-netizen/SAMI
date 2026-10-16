// ─── Tipos e Interfaces ───
import type { Invoice, TaxSummary, TaxRegime } from '../types/types';
import { DocumentType, InvoiceType } from '../types/types';
import { api } from './api';

export interface CalculateTaxesOptions {
  isNrus?: boolean;
  taxRegime?: TaxRegime | string;
  referenceDate?: Date;
  ruc?: string;
  isBuenContribuyente?: boolean;
}

// ─── Constantes y Configuración ───
export const IGV_RATE = 0.18; // 18%

/**
 * Valor oficial de la Unidad Impositiva Tributaria (UIT) para el año 2026 fijado en S/ 5,500
 * mediante Decreto Supremo N° 301-2025-EF emitido por el MEF el 17 de diciembre de 2025.
 * 
 * NOTA DE MANTENIMIENTO: Este valor debe revisarse cada diciembre cuando el Ministerio de
 * Economía y Finanzas (MEF) publica el D.S. anual de la UIT para el año fiscal siguiente
 * en el diario oficial El Peruano.
 */
export const UIT_2026_VALUE = 5500;
export const UIT_VALUE = UIT_2026_VALUE; // Alias para compatibilidad con código existente

export const RMT_INCOME_TAX_RATE = 0.01; // 1% Pago a Cuenta RMT
export const RER_INCOME_TAX_RATE = 0.015; // 1.5% Pago a Cuenta RER
export const RG_INCOME_TAX_RATE = 0.015; // 1.5% Pago a Cuenta RG (simplificación método de porcentaje)

// Límites de Regímenes Tributarios (SUNAT / MEF 2026)
export const NRUS_MONTHLY_LIMIT = 8000; // S/ 8,000 mensuales
export const NRUS_ANNUAL_LIMIT = 96000; // S/ 96,000 anuales
export const NRUS_CAT1_MAX = 5000; // Hasta S/ 5,000 -> S/ 20
export const NRUS_CAT2_MAX = 8000; // Hasta S/ 8,000 -> S/ 50
export const NRUS_QUOTA_CAT1 = 20;
export const NRUS_QUOTA_CAT2 = 50;

export const RER_ANNUAL_LIMIT = 525000; // S/ 525,000 anuales
export const RMT_ANNUAL_UIT_LIMIT = 1700; // 1,700 UIT (S/ 9,350,000 en 2026)

/**
 * Umbral legal de bancarización obligatoria (Ley N° 28194, modificado por D.L. 1529): S/ 2,000 o US$ 500.
 * Compras a partir de S/ 2,000 deben pagarse mediante medios de pago formales
 * (transferencia, tarjeta, cheques, Yape/Plin vinculados a cuenta bancaria) para tener derecho
 * a deducción del gasto y crédito fiscal del IGV. Si se pagan en efectivo, pierden el crédito fiscal.
 */
export const BANCARIZACION_THRESHOLD_PEN = 2000;

// ─── Cronograma de Vencimientos SUNAT ───

/**
 * Cronograma Oficial de Vencimientos Mensuales SUNAT para el Ejercicio Fiscal 2026.
 * Base Legal: Resolución de Superintendencia N° 281-2022/SUNAT (Cronograma de Obligaciones Tributarias Mensuales).
 * 
 * NOTA DE MANTENIMIENTO: Esta tabla de vencimientos es válida ÚNICAMENTE para el año fiscal 2026.
 * Debe actualizarse y reemplazarse en enero de cada año con la Resolución de Superintendencia que
 * SUNAT publique en el diario oficial El Peruano para el cronograma del ejercicio siguiente.
 */
export const CRONOGRAMA_SUNAT_2026: Record<string, {
  '0': string;
  '1': string;
  '2-3': string;
  '4-5': string;
  '6-7': string;
  '8-9': string;
  'BC/UESP': string;
}> = {
  '2026-01': { '0': '2026-02-16', '1': '2026-02-17', '2-3': '2026-02-18', '4-5': '2026-02-19', '6-7': '2026-02-20', '8-9': '2026-02-23', 'BC/UESP': '2026-02-24' },
  '2026-02': { '0': '2026-03-16', '1': '2026-03-17', '2-3': '2026-03-18', '4-5': '2026-03-19', '6-7': '2026-03-20', '8-9': '2026-03-23', 'BC/UESP': '2026-03-24' },
  '2026-03': { '0': '2026-04-17', '1': '2026-04-20', '2-3': '2026-04-21', '4-5': '2026-04-22', '6-7': '2026-04-23', '8-9': '2026-04-24', 'BC/UESP': '2026-04-27' },
  '2026-04': { '0': '2026-05-18', '1': '2026-05-19', '2-3': '2026-05-20', '4-5': '2026-05-21', '6-7': '2026-05-22', '8-9': '2026-05-25', 'BC/UESP': '2026-05-26' },
  '2026-05': { '0': '2026-06-15', '1': '2026-06-16', '2-3': '2026-06-17', '4-5': '2026-06-18', '6-7': '2026-06-19', '8-9': '2026-06-22', 'BC/UESP': '2026-06-23' },
  '2026-06': { '0': '2026-07-15', '1': '2026-07-16', '2-3': '2026-07-17', '4-5': '2026-07-20', '6-7': '2026-07-21', '8-9': '2026-07-22', 'BC/UESP': '2026-07-24' },
  '2026-07': { '0': '2026-08-18', '1': '2026-08-19', '2-3': '2026-08-20', '4-5': '2026-08-21', '6-7': '2026-08-24', '8-9': '2026-08-25', 'BC/UESP': '2026-08-26' },
  '2026-08': { '0': '2026-09-15', '1': '2026-09-16', '2-3': '2026-09-17', '4-5': '2026-09-18', '6-7': '2026-09-21', '8-9': '2026-09-22', 'BC/UESP': '2026-09-23' },
  '2026-09': { '0': '2026-10-16', '1': '2026-10-19', '2-3': '2026-10-20', '4-5': '2026-10-21', '6-7': '2026-10-22', '8-9': '2026-10-23', 'BC/UESP': '2026-10-26' },
  '2026-10': { '0': '2026-11-16', '1': '2026-11-17', '2-3': '2026-11-18', '4-5': '2026-11-19', '6-7': '2026-11-20', '8-9': '2026-11-23', 'BC/UESP': '2026-11-24' },
  '2026-11': { '0': '2026-12-17', '1': '2026-12-18', '2-3': '2026-12-21', '4-5': '2026-12-22', '6-7': '2026-12-23', '8-9': '2026-12-24', 'BC/UESP': '2026-12-28' },
  '2026-12': { '0': '2027-01-18', '1': '2027-01-19', '2-3': '2027-01-20', '4-5': '2027-01-21', '6-7': '2027-01-22', '8-9': '2027-01-25', 'BC/UESP': '2027-01-26' },
};

export type DigitoGrupoSunat = '0' | '1' | '2-3' | '4-5' | '6-7' | '8-9';

/**
 * Determina el grupo de vencimiento SUNAT según el último dígito del RUC (R.S. 281-2022/SUNAT).
 */
export const getDigitoGrupo = (ruc: string): DigitoGrupoSunat => {
  const clean = (ruc || '').trim();
  const lastChar = clean.slice(-1);
  switch (lastChar) {
    case '0': return '0';
    case '1': return '1';
    case '2':
    case '3': return '2-3';
    case '4':
    case '5': return '4-5';
    case '6':
    case '7': return '6-7';
    case '8':
    case '9': return '8-9';
    default: return '0';
  }
};

/**
 * Obtiene la fecha exacta de vencimiento mensual según el RUC, período tributario y si es Buen Contribuyente (BC/UESP).
 * Si el período no está en la tabla (años distintos a 2026), retorna null.
 */
export const getFechaVencimiento = (
  ruc: string, 
  periodoTributario: string, 
  esBuenContribuyente = false
): string | null => {
  const schedule = CRONOGRAMA_SUNAT_2026[periodoTributario];
  if (!schedule) return null;
  if (esBuenContribuyente) {
    return schedule['BC/UESP'];
  }
  const grupo = getDigitoGrupo(ruc);
  return schedule[grupo] || null;
};

// ─── Funciones de Validación ───

/**
 * Normaliza cualquier string de régimen a uno de los 4 regímenes oficiales SUNAT: NRUS | RER | RMT | RG
 */
export const normalizeTaxRegime = (regime?: string | TaxRegime): 'NRUS' | 'RER' | 'RMT' | 'RG' => {
  if (!regime) return 'RMT';
  const r = regime.toUpperCase().trim();
  if (r === 'NRUS' || r === 'RUS' || r.includes('NUEVO RUS') || r.includes('SIMPLIFICADO')) {
    return 'NRUS';
  }
  if (r === 'RER' || r.includes('ESPECIAL')) {
    return 'RER';
  }
  if (r === 'RG' || r === 'REGIMEN_GENERAL' || r.includes('GENERAL')) {
    return 'RG';
  }
  if (r === 'RMT' || r === 'MYPE_TRIBUTARIO' || r.includes('MYPE')) {
    return 'RMT';
  }
  return 'RMT';
};

/**
 * Valida un RUC peruano según el estándar SUNAT.
 * Verifica formato numérico de 11 dígitos, prefijo válido (10, 15, 16, 17, 20) y algoritmo Módulo 11.
 * @param ruc Cadena de RUC a validar.
 * @returns boolean True si es válido con checksum Módulo 11 correcto, false en caso contrario.
 */
export const isValidRUC = (ruc: string): boolean => {
  if (!ruc || typeof ruc !== 'string') return false;
  if (!/^\d{11}$/.test(ruc)) return false;

  // Prefijos permitidos por SUNAT:
  // 10: Persona Natural con DNI
  // 15: Persona Natural con Carné de Extranjería
  // 16: Persona Natural con RUC especial
  // 17: Persona Natural con Pasaporte / Diplomático
  // 20: Persona Jurídica (Empresa)
  const prefix = ruc.substring(0, 2);
  const validPrefixes = ['10', '15', '16', '17', '20'];
  if (!validPrefixes.includes(prefix)) {
    return false;
  }

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(ruc[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  const diff = 11 - remainder;
  let checkDigit = diff;
  if (diff === 10) checkDigit = 0;
  else if (diff === 11) checkDigit = 1;

  return checkDigit === parseInt(ruc[10], 10);
};

/**
 * Valida un comprobante de pago según las reglas tributarias de SUNAT y el régimen del emisor.
 * Reglas de negocio:
 * - NRUS: No puede emitir Facturas ni Notas de Crédito/Débito que modifiquen Facturas.
 * - Facturas y Notas que modifican Facturas: RUC obligatorio de 11 dígitos y series que inician con 'F'.
 * - Boletas y Notas que modifican Boletas: series que inician con 'B'.
 * - Notas de Crédito / Débito: deben especificar serie y correlativo del comprobante de origen referenciado.
 * 
 * @param invoice Objeto de comprobante a validar.
 * @param issuerTaxRegime Régimen tributario del emisor (opcional, ej. 'NRUS', 'RMT', 'GENERAL', 'RER').
 * @throws Error si alguna validación formal o tributaria falla.
 */
export const validateInvoice = (
  invoice: Omit<Invoice, 'id' | 'type'> & { issuerTaxRegime?: string },
  issuerTaxRegime?: string
): void => {
  if (!invoice) {
    throw new Error('El comprobante no puede ser nulo o indefinido.');
  }

  if (invoice.totalAmount === undefined || invoice.totalAmount === null || invoice.totalAmount <= 0) {
    throw new Error('El monto total debe ser positivo.');
  }

  if (!invoice.series || !/^[FB][A-Z0-9]{3}$/.test(invoice.series.toUpperCase())) {
    throw new Error(`Serie inválida: ${invoice.series}. Debe tener 4 caracteres y empezar con F o B.`);
  }

  if (!invoice.correlative || invoice.correlative <= 0) {
    throw new Error('El correlativo debe ser un número positivo.');
  }

  // Identificación de tipo de documento
  const docTypeStr = String(invoice.documentType || '').toUpperCase();
  const isFactura = docTypeStr === 'FACTURA' || invoice.documentType === DocumentType.FACTURA;
  const isBoleta = docTypeStr === 'BOLETA' || docTypeStr === 'BOLETA_DE_VENTA' || invoice.documentType === DocumentType.BOLETA;
  const isNotaCredito = docTypeStr === 'NOTA_DE_CREDITO' || invoice.documentType === DocumentType.NOTA_DE_CREDITO;
  const isNotaDebito = docTypeStr === 'NOTA_DE_DEBITO' || invoice.documentType === DocumentType.NOTA_DE_DEBITO;
  const isNota = isNotaCredito || isNotaDebito;

  // Validación de régimen tributario del emisor
  const activeRegime = (issuerTaxRegime || invoice.issuerTaxRegime || '').toUpperCase();
  const isNrus = activeRegime.includes('RUS') || activeRegime.includes('NRUS') || activeRegime.includes('NUEVO RUS');

  if (isNrus && isFactura) {
    throw new Error('Los contribuyentes en el Nuevo RUS (NRUS) no están autorizados a emitir Facturas; únicamente pueden emitir Boletas de Venta o Tickets.');
  }

  // Validación de Facturas: Obligatoriedad de RUC válido
  if (isFactura) {
    if (!invoice.ruc || !isValidRUC(invoice.ruc)) {
      throw new Error('Una Factura debe tener un RUC válido de 11 dígitos con dígito verificador correcto.');
    }
    if (!invoice.series.toUpperCase().startsWith('F')) {
      throw new Error('Las series de Facturas deben empezar con "F".');
    }
  }

  // Validación de Boletas de Venta
  if (isBoleta) {
    if (!invoice.series.toUpperCase().startsWith('B')) {
      throw new Error('Las series de Boletas de Venta deben empezar con "B".');
    }
  }

  // Validación de Notas de Crédito y Débito
  if (isNota) {
    if (!invoice.referencedSeries || !invoice.referencedCorrelative || invoice.referencedCorrelative <= 0) {
      throw new Error('Una Nota de Crédito o Débito debe especificar la serie y correlativo del comprobante que modifica.');
    }

    if (!/^[FB][A-Z0-9]{3}$/.test(invoice.referencedSeries.toUpperCase())) {
      throw new Error(`La serie del comprobante modificado (${invoice.referencedSeries}) debe tener 4 caracteres y empezar con F o B.`);
    }

    const noteSeriesStartsF = invoice.series.toUpperCase().startsWith('F');
    const refSeriesStartsF = invoice.referencedSeries.toUpperCase().startsWith('F');

    if (noteSeriesStartsF) {
      if (!refSeriesStartsF) {
        throw new Error('Una Nota con serie F sólo puede modificar comprobantes con serie F (Facturas).');
      }
      if (isNrus) {
        throw new Error('Los contribuyentes en el Nuevo RUS (NRUS) no están autorizados a emitir Notas de Crédito o Débito sobre Facturas.');
      }
      if (!invoice.ruc || !isValidRUC(invoice.ruc)) {
        throw new Error('Una Nota que modifica una Factura debe contener un RUC válido de 11 dígitos con dígito verificador correcto.');
      }
    } else {
      // Serie B
      if (refSeriesStartsF) {
        throw new Error('Una Nota con serie B sólo puede modificar comprobantes con serie B (Boletas).');
      }
    }
  }
};

/**
 * Normaliza el tipo de comprobante para el cálculo de correlativos secuenciales (BOLETA o FACTURA).
 */
const normalizeDocTypeForCorrelative = (type: 'BOLETA' | 'FACTURA' | DocumentType | string): 'BOLETA' | 'FACTURA' | null => {
  const t = String(type || '').toUpperCase();
  if (t === 'BOLETA' || t === 'BOLETA_DE_VENTA' || t === DocumentType.BOLETA) return 'BOLETA';
  if (t === 'FACTURA' || t === DocumentType.FACTURA) return 'FACTURA';
  return null;
};

/**
 * Calcula el siguiente número correlativo secuencial para comprobantes de venta emitidos por la MYPE.
 * Obtiene el valor máximo existente entre los comprobantes de venta del tipo de documento especificado (BOLETA o FACTURA) + 1.
 * Si no existen comprobantes de ese tipo en el historial, retorna 1.
 *
 * @param documentType Tipo de comprobante ('BOLETA' | 'FACTURA' | DocumentType)
 * @param existingSales Lista de comprobantes de venta existentes
 * @returns number Siguiente correlativo entero secuencial (mínimo 1)
 */
export const getNextCorrelative = (
  documentType: 'BOLETA' | 'FACTURA' | DocumentType,
  existingSales: Invoice[] = []
): number => {
  const target = normalizeDocTypeForCorrelative(documentType);
  if (!target) return 1;

  const matchingSales = existingSales.filter(inv => {
    const isSale = !inv.type || inv.type === InvoiceType.SALE || String(inv.type).toUpperCase() === 'SALE';
    const docTypeNorm = normalizeDocTypeForCorrelative(inv.documentType);
    return isSale && docTypeNorm === target;
  });

  if (matchingSales.length === 0) {
    return 1;
  }

  const maxCorrelative = matchingSales.reduce((max, inv) => {
    const corr = typeof inv.correlative === 'number' ? inv.correlative : parseInt(String(inv.correlative), 10);
    return !isNaN(corr) && corr > max ? corr : max;
  }, 0);

  return maxCorrelative + 1;
};

/**
 * Verifica si un comprobante ya existe en el historial registrado comparando
 * tipo de operación (SALE vs PURCHASE), serie y número correlativo.
 *
 * @param newInvoice Comprobante que se intenta registrar
 * @param existingInvoices Lista de comprobantes existentes
 * @returns boolean true si ya existe un comprobante con el mismo tipo, serie y correlativo; false en caso contrario.
 */
export const isDuplicateInvoice = (
  newInvoice: Omit<Invoice, 'id'>,
  existingInvoices: Invoice[] = []
): boolean => {
  if (!newInvoice || !newInvoice.series || newInvoice.correlative === undefined || newInvoice.correlative === null) {
    return false;
  }

  const newType = String(newInvoice.type || InvoiceType.SALE).toUpperCase();
  const newSeries = String(newInvoice.series).trim().toUpperCase();
  const newCorrelative = Number(newInvoice.correlative);

  return existingInvoices.some(inv => {
    const existingType = String(inv.type || InvoiceType.SALE).toUpperCase();
    const existingSeries = String(inv.series || '').trim().toUpperCase();
    const existingCorrelative = Number(inv.correlative);

    return (
      existingType === newType &&
      existingSeries === newSeries &&
      existingCorrelative === newCorrelative
    );
  });
};

// ─── Lógica de Cálculo Tributario ───

/**
 * Calcula los indicadores de formalidad (formalityRatio) y cumplimiento (complianceStatus)
 * a partir del historial de comprobantes de ventas y una fecha de referencia.
 *
 * formalityRatio:
 *   = (número de meses calendario entre el primer y último comprobante con ventas)
 *     / (número total de meses calendario en ese mismo rango) * 100
 *
 * complianceStatus:
 *   - 'Al día': último comprobante a <= 30 días de referenceDate
 *   - 'Registro desactualizado': último comprobante entre 31 y 90 días de referenceDate
 *   - 'Sin actividad reciente': último comprobante a > 90 días de referenceDate o sin ventas
 */
export const calculateTaxHealthIndicators = (
  salesInvoices: Invoice[] = [],
  referenceDate: Date = new Date()
): { formalityRatio: number; complianceStatus: 'Al día' | 'Registro desactualizado' | 'Sin actividad reciente' } => {
  const validDates = salesInvoices
    .map(s => (s.issueDate || (s as any).date || '').trim())
    .filter(d => /^\d{4}-\d{2}/.test(d))
    .map(d => d.substring(0, 10))
    .sort();

  if (validDates.length === 0) {
    return {
      formalityRatio: 0,
      complianceStatus: 'Sin actividad reciente'
    };
  }

  const firstDateStr = validDates[0];
  const lastDateStr = validDates[validDates.length - 1];

  const firstYear = parseInt(firstDateStr.substring(0, 4), 10);
  const firstMonth = parseInt(firstDateStr.substring(5, 7), 10);
  const lastYear = parseInt(lastDateStr.substring(0, 4), 10);
  const lastMonth = parseInt(lastDateStr.substring(5, 7), 10);

  const totalCalendarMonths = (lastYear - firstYear) * 12 + (lastMonth - firstMonth) + 1;

  const activeMonthsSet = new Set(
    validDates.map(d => d.substring(0, 7))
  );
  const activeMonthsCount = activeMonthsSet.size;

  const formalityRatio = totalCalendarMonths > 0
    ? Math.round((activeMonthsCount / totalCalendarMonths) * 100)
    : 0;

  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const refMidnight = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();

  const lastParts = lastDateStr.split('-').map(Number);
  const lastMidnight = new Date(lastParts[0], lastParts[1] - 1, lastParts[2] || 1).getTime();

  const diffMs = refMidnight - lastMidnight;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let complianceStatus: 'Al día' | 'Registro desactualizado' | 'Sin actividad reciente';
  if (diffDays <= 30) {
    complianceStatus = 'Al día';
  } else if (diffDays <= 90) {
    complianceStatus = 'Registro desactualizado';
  } else {
    complianceStatus = 'Sin actividad reciente';
  }

  return { formalityRatio, complianceStatus };
};

/**
 * Realiza el cálculo síncrono oficial de tributos según las reglas de SUNAT 2026 por Régimen Tributario:
 * - NRUS: Sin IGV. Cuota fija según ventas/compras mensuales (Cat 1: S/ 20, Cat 2: S/ 50). Límites: S/ 8k/mes, S/ 96k/año.
 * - RER: 18% IGV (con crédito fiscal de Facturas), 1.5% de Pago a Cuenta de Renta. Límite anual: S/ 525,000.
 * - RMT: 18% IGV (con crédito fiscal de Facturas), 1.0% de Pago a Cuenta de Renta. Límite anual: 1,700 UIT (S/ 9,350,000).
 * - RG: 18% IGV (con crédito fiscal de Facturas), 1.5% de Pago a Cuenta de Renta mensual. Sin límite superior.
 *
 * @param salesInvoices Comprobantes de ventas
 * @param purchaseInvoices Comprobantes de compras
 * @param options Opciones de régimen (taxRegime, isNrus, referenceDate)
 * @param referenceDate Fecha de referencia opcional para calcular complianceStatus
 */
export const calculateTaxesSync = (
  salesInvoices: Invoice[] = [], 
  purchaseInvoices: Invoice[] = [],
  options?: CalculateTaxesOptions | TaxRegime | string,
  referenceDate?: Date
): TaxSummary => {
  // Validación de integridad de datos
  salesInvoices.forEach(inv => validateInvoice(inv));
  purchaseInvoices.forEach(inv => validateInvoice(inv));

  let opts: CalculateTaxesOptions = {};
  if (typeof options === 'string') {
    opts = { taxRegime: options };
  } else if (options && typeof options === 'object') {
    opts = options;
  }

  const rawRegime = opts.taxRegime || (opts.isNrus ? 'NRUS' : 'RMT');
  const regimeType = normalizeTaxRegime(rawRegime);
  const targetRefDate = opts.referenceDate || referenceDate || new Date();

  // Funciones auxiliares para Notas de Crédito / Débito
  const getSignedAmount = (inv: Invoice): number => {
    const docTypeStr = String(inv.documentType || '').toUpperCase();
    const isNotaCredito = docTypeStr === 'NOTA_DE_CREDITO' || inv.documentType === DocumentType.NOTA_DE_CREDITO;
    const rawAmount = Number(inv.totalAmount) || 0;
    return isNotaCredito ? -rawAmount : rawAmount;
  };

  const isFacturaOrModifiesFactura = (inv: Invoice): boolean => {
    const docTypeStr = String(inv.documentType || '').toUpperCase();
    if (docTypeStr === 'FACTURA' || inv.documentType === DocumentType.FACTURA) return true;
    if (
      docTypeStr === 'NOTA_DE_CREDITO' || inv.documentType === DocumentType.NOTA_DE_CREDITO ||
      docTypeStr === 'NOTA_DE_DEBITO' || inv.documentType === DocumentType.NOTA_DE_DEBITO
    ) {
      const series = (inv.series || '').toUpperCase();
      const refSeries = (inv.referencedSeries || '').toUpperCase();
      const refDocType = String(inv.referencedDocumentType || '').toUpperCase();
      return series.startsWith('F') || refSeries.startsWith('F') || refDocType === 'FACTURA' || inv.referencedDocumentType === DocumentType.FACTURA;
    }
    return false;
  };

  const totalSales = Math.max(0, salesInvoices.reduce((sum, inv) => sum + getSignedAmount(inv), 0));
  const totalPurchases = Math.max(0, purchaseInvoices.reduce((sum, inv) => sum + getSignedAmount(inv), 0));

  // Agrupación mensual y anual para análisis de límites y promedio mensual
  const monthlySales: { [month: string]: number } = {};
  const yearlySales: { [year: string]: number } = {};
  salesInvoices.forEach(inv => {
    const rawDate = (inv.issueDate || (inv as any).date || '').trim();
    const month = /^\d{4}-\d{2}/.test(rawDate) ? rawDate.substring(0, 7) : '2026-01';
    const year = /^\d{4}/.test(rawDate) ? rawDate.substring(0, 4) : '2026';
    const signed = getSignedAmount(inv);
    monthlySales[month] = (monthlySales[month] || 0) + signed;
    yearlySales[year] = (yearlySales[year] || 0) + signed;
  });

  const monthlyPurchases: { [month: string]: number } = {};
  purchaseInvoices.forEach(inv => {
    const rawDate = (inv.issueDate || (inv as any).date || '').trim();
    const month = /^\d{4}-\d{2}/.test(rawDate) ? rawDate.substring(0, 7) : '2026-01';
    const signed = getSignedAmount(inv);
    monthlyPurchases[month] = (monthlyPurchases[month] || 0) + signed;
  });

  const salesMonths = Object.keys(monthlySales).sort();
  const allMonthsWithData = Array.from(new Set([...Object.keys(monthlySales), ...Object.keys(monthlyPurchases)])).sort();
  const activeMonthsCount = salesMonths.length > 0 ? salesMonths.length : (allMonthsWithData.length > 0 ? allMonthsWithData.length : 1);
  const avgMonthlySales = totalSales > 0 ? Math.round(totalSales / activeMonthsCount) : 0;
  const avgMonthlyPurchases = totalPurchases > 0 ? Math.round(totalPurchases / activeMonthsCount) : 0;

  const { formalityRatio, complianceStatus } = calculateTaxHealthIndicators(salesInvoices, targetRefDate);

  let netSales = 0;
  let igvDebit = 0;
  let igvCredit = 0;
  let igvPayable = 0;
  let incomeTaxAdvance = 0;
  let appliedRmtRate = 0;
  let fixedQuota: number | undefined = undefined;
  let nrusCategory: 1 | 2 | undefined = undefined;
  let exceedsRegimeLimit = false;
  let regimeLimitMessage: string | undefined = undefined;

  // Bancarización (Ley N° 28194, umbral S/ 2,000)
  // Compras de Factura con monto >= S/ 2,000 pagadas en efectivo o sin medio de pago formal
  // pierden el derecho a crédito fiscal del IGV y deducción del gasto.
  let nonBancarizedAmount = 0;

  const isBancarizedOrUnderThreshold = (inv: Invoice): boolean => {
    const rawAmount = Math.abs(Number(inv.totalAmount) || 0);
    if (rawAmount < BANCARIZACION_THRESHOLD_PEN) {
      return true;
    }
    // A partir de S/ 2,000, solo los medios de pago bancarizados/formales son válidos
    const method = inv.paymentMethod;
    if (method === 'TRANSFERENCIA' || method === 'TARJETA' || method === 'YAPE' || method === 'PLIN') {
      return true;
    }
    // Si es EFECTIVO o no se especificó medio de pago (undefined), NO cumple bancarización
    return false;
  };

  const eligibleFacturas = purchaseInvoices.filter(isFacturaOrModifiesFactura);
  const bancarizedPurchases: Invoice[] = [];

  eligibleFacturas.forEach(inv => {
    if (isBancarizedOrUnderThreshold(inv)) {
      bancarizedPurchases.push(inv);
    } else {
      nonBancarizedAmount += Math.abs(Number(inv.totalAmount) || 0);
    }
  });

  // Cálculo común de crédito fiscal para regímenes RER, RMT y RG
  const calculateIgvCredit = (): number => {
    const totalEligiblePurchases = Math.max(0, bancarizedPurchases.reduce((sum, inv) => sum + getSignedAmount(inv), 0));
    const netPurchases = totalEligiblePurchases > 0 ? totalEligiblePurchases / (1 + IGV_RATE) : 0;
    return totalEligiblePurchases > 0 ? totalEligiblePurchases - netPurchases : 0;
  };

  switch (regimeType) {
    case 'NRUS': {
      // NRUS: No calcula IGV débito/crédito en absoluto. El tributo se abona mediante cuota fija.
      igvDebit = 0;
      igvCredit = 0;
      igvPayable = 0;
      incomeTaxAdvance = 0;
      appliedRmtRate = 0;

      // 1. Verificación de límite mensual por cada mes con operaciones
      for (const month of allMonthsWithData) {
        const mSales = monthlySales[month] || 0;
        const mPurchases = monthlyPurchases[month] || 0;
        const monthMax = Math.max(mSales, mPurchases);
        if (monthMax > NRUS_MONTHLY_LIMIT) {
          exceedsRegimeLimit = true;
          regimeLimitMessage = `Las operaciones en el periodo ${month} (S/ ${monthMax.toFixed(2)}) superan el límite mensual legal de S/ ${NRUS_MONTHLY_LIMIT.toLocaleString('es-PE')} para el Nuevo RUS (NRUS). Debe cambiar de régimen tributario (RER, RMT o RG) a partir del siguiente mes.`;
          break;
        }
      }

      // 2. Verificación de límite anual (S/ 96,000)
      if (!exceedsRegimeLimit) {
        for (const year of Object.keys(yearlySales)) {
          if (yearlySales[year] > NRUS_ANNUAL_LIMIT) {
            exceedsRegimeLimit = true;
            regimeLimitMessage = `Las ventas acumuladas del año ${year} (S/ ${yearlySales[year].toFixed(2)}) superan el límite anual legal de S/ ${NRUS_ANNUAL_LIMIT.toLocaleString('es-PE')} para el Nuevo RUS (NRUS). Debe migrar al RER, RMT o RG.`;
            break;
          }
        }
        if (!exceedsRegimeLimit && totalSales > NRUS_ANNUAL_LIMIT) {
          exceedsRegimeLimit = true;
          regimeLimitMessage = `Las ventas acumuladas (S/ ${totalSales.toFixed(2)}) superan el límite anual legal de S/ ${NRUS_ANNUAL_LIMIT.toLocaleString('es-PE')} para el Nuevo RUS (NRUS).`;
        }
      }

      // 3. Cálculo de cuota fija si no superó límites
      if (!exceedsRegimeLimit) {
        if (allMonthsWithData.length > 0) {
          const latestMonth = allMonthsWithData[allMonthsWithData.length - 1];
          const latestMax = Math.max(monthlySales[latestMonth] || 0, monthlyPurchases[latestMonth] || 0);
          if (latestMax <= NRUS_CAT1_MAX) {
            nrusCategory = 1;
            fixedQuota = NRUS_QUOTA_CAT1; // S/ 20
          } else {
            nrusCategory = 2;
            fixedQuota = NRUS_QUOTA_CAT2; // S/ 50
          }
        } else {
          fixedQuota = 0;
        }
      }
      break;
    }

    case 'RER': {
      // RER: IGV estándar (18%), Renta a cuenta = 1.5% de la base imponible
      netSales = totalSales > 0 ? totalSales / (1 + IGV_RATE) : 0;
      igvDebit = totalSales > 0 ? totalSales - netSales : 0;
      igvCredit = calculateIgvCredit();
      igvPayable = Math.max(0, igvDebit - igvCredit);

      appliedRmtRate = RER_INCOME_TAX_RATE; // 1.5%
      incomeTaxAdvance = netSales * RER_INCOME_TAX_RATE;

      // Verificación de límite anual RER: S/ 525,000
      for (const year of Object.keys(yearlySales)) {
        if (yearlySales[year] > RER_ANNUAL_LIMIT) {
          exceedsRegimeLimit = true;
          regimeLimitMessage = `Los ingresos del ejercicio ${year} superan el tope legal de S/ ${RER_ANNUAL_LIMIT.toLocaleString('es-PE')} para el Régimen Especial de Renta (RER). Debe tributar bajo el RMT o Régimen General.`;
          break;
        }
      }
      if (!exceedsRegimeLimit && totalSales > RER_ANNUAL_LIMIT) {
        exceedsRegimeLimit = true;
        regimeLimitMessage = `Los ingresos acumulados superan el tope legal de S/ ${RER_ANNUAL_LIMIT.toLocaleString('es-PE')} para el Régimen Especial de Renta (RER).`;
      }
      break;
    }

    case 'RMT': {
      // RMT: IGV estándar (18%), Renta a cuenta = 1.0% de la base imponible
      netSales = totalSales > 0 ? totalSales / (1 + IGV_RATE) : 0;
      igvDebit = totalSales > 0 ? totalSales - netSales : 0;
      igvCredit = calculateIgvCredit();
      igvPayable = Math.max(0, igvDebit - igvCredit);

      appliedRmtRate = RMT_INCOME_TAX_RATE; // 1.0%
      incomeTaxAdvance = netSales * RMT_INCOME_TAX_RATE;

      // Verificación de límite anual RMT: 1,700 UIT (S/ 9,350,000 con UIT 2026 de S/ 5,500)
      const rmtMaxAnnualLimit = RMT_ANNUAL_UIT_LIMIT * UIT_2026_VALUE;
      for (const year of Object.keys(yearlySales)) {
        if (yearlySales[year] > rmtMaxAnnualLimit) {
          exceedsRegimeLimit = true;
          regimeLimitMessage = `Los ingresos del ejercicio ${year} superan el límite legal de 1,700 UIT (S/ ${rmtMaxAnnualLimit.toLocaleString('es-PE')}) para el Régimen MYPE Tributario (RMT). Debe tributar bajo el Régimen General (RG).`;
          break;
        }
      }
      if (!exceedsRegimeLimit && totalSales > rmtMaxAnnualLimit) {
        exceedsRegimeLimit = true;
        regimeLimitMessage = `Los ingresos acumulados superan el límite de 1,700 UIT (S/ ${rmtMaxAnnualLimit.toLocaleString('es-PE')}) para el Régimen MYPE Tributario (RMT).`;
      }
      break;
    }

    case 'RG': {
      // RG: IGV estándar (18%).
      // NOTA DE SIMPLIFICACIÓN CONSCIENTE (MVP): Para el Régimen General (RG), el pago a cuenta mensual del Impuesto a la Renta se calcula con la tasa mínima del 1.5% sobre los ingresos netos (método del porcentaje). En la práctica tributaria real, se compara con el sistema de coeficientes (impuesto calculado del ejercicio anterior / ingresos netos del ejercicio anterior), optando por el mayor. La tasa del 29.5% corresponde al Impuesto a la Renta de Regularización Anual y no al pago a cuenta mensual.
      netSales = totalSales > 0 ? totalSales / (1 + IGV_RATE) : 0;
      igvDebit = totalSales > 0 ? totalSales - netSales : 0;
      igvCredit = calculateIgvCredit();
      igvPayable = Math.max(0, igvDebit - igvCredit);

      appliedRmtRate = RG_INCOME_TAX_RATE; // 1.5%
      incomeTaxAdvance = netSales * RG_INCOME_TAX_RATE;

      // El Régimen General no tiene límite superior de ingresos
      exceedsRegimeLimit = false;
      break;
    }
  }

  const result: TaxSummary = {
    totalSales: Number(totalSales.toFixed(2)),
    totalPurchases: Number(totalPurchases.toFixed(2)),
    igvDebit: Number(igvDebit.toFixed(2)),
    igvCredit: Number(igvCredit.toFixed(2)),
    igvPayable: Number(igvPayable.toFixed(2)),
    incomeTaxAdvance: Number(incomeTaxAdvance.toFixed(2)),
    appliedRmtRate,
    avgMonthlySales,
    avgMonthlyPurchases,
    verifiedInvoicesCount: salesInvoices.length + purchaseInvoices.length,
    formalityRatio,
    complianceStatus,
    regimeType,
    exceedsRegimeLimit,
    nonBancarizedAmount: Number(nonBancarizedAmount.toFixed(2))
  };

  if (nonBancarizedAmount > 0) {
    const lostCredit = nonBancarizedAmount - (nonBancarizedAmount / (1 + IGV_RATE));
    result.nonBancarizedMessage = `Se detectaron compras por S/ ${nonBancarizedAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pagadas en efectivo o sin medio de pago formal (Ley N° 28194, umbral S/ 2,000). Se perdió el derecho al crédito fiscal del IGV por S/ ${lostCredit.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
  }

  // Próximo vencimiento según cronograma SUNAT 2026
  const rucToUse = opts.ruc || salesInvoices.find(s => s.ruc)?.ruc || purchaseInvoices.find(p => p.ruc)?.ruc || '20000000000';
  const latestPeriod = allMonthsWithData.length > 0
    ? allMonthsWithData[allMonthsWithData.length - 1]
    : `${targetRefDate.getFullYear()}-${String(targetRefDate.getMonth() + 1).padStart(2, '0')}`;

  const fechaVencimiento = getFechaVencimiento(rucToUse, latestPeriod, opts.isBuenContribuyente);
  if (fechaVencimiento) {
    const [vYear, vMonth, vDay] = fechaVencimiento.split('-').map(Number);
    const vDateMidnight = new Date(vYear, vMonth - 1, vDay).getTime();
    const refMidnight = new Date(targetRefDate.getFullYear(), targetRefDate.getMonth(), targetRefDate.getDate()).getTime();
    const diffMs = vDateMidnight - refMidnight;
    const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));

    result.proximoVencimiento = {
      periodo: latestPeriod,
      fecha: fechaVencimiento,
      diasRestantes
    };
  }

  if (fixedQuota !== undefined) {
    result.fixedQuota = fixedQuota;
  }
  if (nrusCategory !== undefined) {
    result.nrusCategory = nrusCategory;
  }
  if (regimeLimitMessage) {
    result.regimeLimitMessage = regimeLimitMessage;
  }

  return result;
};

/**
 * Calcula impuestos preliminares consultando la pasarela API de SAMI, con fallback síncrono canónico.
 * @param salesInvoices - Comprobantes de venta.
 * @param purchaseInvoices - Comprobantes de compra.
 * @param options - Opciones de cálculo tributario y régimen.
 * @returns Promesa que resuelve a un objeto TaxSummary.
 */
export const calculateTaxes = async (
  salesInvoices: Invoice[] = [], 
  purchaseInvoices: Invoice[] = [],
  options?: CalculateTaxesOptions | TaxRegime | string
): Promise<TaxSummary> => {
  try {
    // Verificación de integridad en cliente
    [...salesInvoices, ...purchaseInvoices].forEach(inv => validateInvoice(inv));

    let taxRegime: string | undefined;
    if (typeof options === 'string') {
      taxRegime = options;
    } else if (options?.taxRegime) {
      taxRegime = options.taxRegime;
    } else if (options?.isNrus) {
      taxRegime = 'NRUS';
    }

    const response = await api.post('/accounting/calculate-taxes', {
      sales: salesInvoices,
      purchases: purchaseInvoices,
      taxRegime
    });
    
    return response.data.summary;
  } catch (err: any) {
    // Si la pasarela API no está disponible en testing unitario, utiliza el cálculo síncrono
    if (!err.response) {
      return calculateTaxesSync(salesInvoices, purchaseInvoices, options);
    }
    console.error('[SAMI API Gateway Exception] Tax calculation request failed:', err);
    throw new Error(err.response?.data?.message || err.message || 'Error al calcular impuestos de SUNAT en la pasarela.');
  }
};


