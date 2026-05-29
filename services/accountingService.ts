
import type { Invoice, TaxSummary, DocumentType } from '../types';
import { InvoiceType } from '../types';

// Constants for Peruvian Taxes (as of a certain date, should be configurable)
const IGV_RATE = 0.18; // 18%
const UIT_VALUE = 5150; // Valor UIT 2024 (S/ 5,150)
const RMT_THRESHOLD_UIT = 300; // Límite para tasa del 1% en RMT (300 UIT)
const RMT_LOW_RATE = 0.01; // 1%
const RMT_HIGH_RATE = 0.015; // 1.5%

// --- Validation Functions ---

/**
 * Validates a Peruvian RUC.
 * Must be 11 digits and numeric.
 * @param ruc The RUC string to validate.
 * @returns boolean True if valid, false otherwise.
 */
const isValidRUC = (ruc: string): boolean => {
  return /^\d{11}$/.test(ruc);
};

/**
 * Validates an invoice object based on SUNAT rules.
 * @param invoice The invoice object to validate.
 * @throws Error if validation fails.
 */
const validateInvoice = (invoice: Omit<Invoice, 'id' | 'type'>): void => {
  if (!invoice.series || !/^[FB][A-Z0-9]{3}$/.test(invoice.series.toUpperCase())) {
    throw new Error(`Serie inválida: ${invoice.series}. Debe tener 4 caracteres y empezar con F o B.`);
  }
  if (!invoice.correlative || invoice.correlative <= 0) {
    throw new Error('El correlativo debe ser un número positivo.');
  }
  if (invoice.totalAmount <= 0) {
    throw new Error('El monto total debe ser positivo.');
  }
  if (invoice.documentType === 'FACTURA' && (!invoice.ruc || !isValidRUC(invoice.ruc))) {
    throw new Error('Una Factura debe tener un RUC válido de 11 dígitos.');
  }
  // Check that series prefix matches document type
  if (invoice.documentType === 'FACTURA' && !invoice.series.toUpperCase().startsWith('F')) {
    throw new Error('Las series de Facturas deben empezar con "F".');
  }
  if (invoice.documentType === 'BOLETA_DE_VENTA' && !invoice.series.toUpperCase().startsWith('B')) {
    throw new Error('Las series de Boletas de Venta deben empezar con "B".');
  }
};


/**
 * Calculates preliminary taxes based on lists of sales and purchase invoices.
 * @param salesInvoices - Array of sales invoices.
 * @param purchaseInvoices - Array of purchase invoices.
 * @returns A TaxSummary object with the calculated results.
 */
export const calculateTaxes = (salesInvoices: Invoice[], purchaseInvoices: Invoice[]): TaxSummary => {
  // OWASP: A8 - Software and Data Integrity Failures
  // Validate every single invoice before processing to ensure data integrity.
  [...salesInvoices, ...purchaseInvoices].forEach(validateInvoice);

  let totalSales = 0;
  let netSales = 0; // Ventas netas (base imponible)
  let igvDebit = 0;

  salesInvoices.forEach(inv => {
    totalSales += inv.totalAmount;
    const baseAmount = inv.totalAmount / (1 + IGV_RATE);
    netSales += baseAmount;
    igvDebit += inv.totalAmount - baseAmount;
  });

  let totalPurchases = 0;
  let igvCredit = 0;

  purchaseInvoices.forEach(inv => {
    totalPurchases += inv.totalAmount;
    // IMPORTANT: Only purchases with "Factura" grant tax credit for IGV.
    // Boletas de compra NO dan derecho a crédito fiscal.
    if (inv.documentType === 'FACTURA') {
      const baseAmount = inv.totalAmount / (1 + IGV_RATE);
      igvCredit += inv.totalAmount - baseAmount;
    }
  });

  const igvPayable = igvDebit - igvCredit;
  
  // Dynamic RMT Rate: 1% if annual net income <= 300 UIT, otherwise 1.5%
  // Note: In this preliminary calculation, we use the total net sales of the provided invoices as a proxy.
  const rmtThresholdAmount = UIT_VALUE * RMT_THRESHOLD_UIT;
  const appliedRmtRate = netSales <= rmtThresholdAmount ? RMT_LOW_RATE : RMT_HIGH_RATE;
  const incomeTaxAdvance = netSales * appliedRmtRate;
  
  return {
    totalSales: parseFloat(totalSales.toFixed(2)),
    totalPurchases: parseFloat(totalPurchases.toFixed(2)),
    igvDebit: parseFloat(igvDebit.toFixed(2)),
    igvCredit: parseFloat(igvCredit.toFixed(2)),
    igvPayable: parseFloat(igvPayable.toFixed(2)),
    incomeTaxAdvance: parseFloat(incomeTaxAdvance.toFixed(2)),
    appliedRmtRate
  };
};
