// ═══════════════════════════════════════════════════════════════
// ⚠️  DATOS DE DEMOSTRACIÓN — DOMINIO: VENTAS Y COMPROBANTES EMITIDOS
// ═══════════════════════════════════════════════════════════════
// ADVERTENCIA DE SEGURIDAD Y CUMPLIMIENTO REGULATORIO:
// Estos datos corresponden a la simulación de 6 meses de operación de "Bodega Don Carlos".
// NO DEBEN USARSE EN PRODUCCIÓN. En producción, las ventas provienen del PSE / SUNAT.
// ═══════════════════════════════════════════════════════════════

import { Invoice, InvoiceType, DocumentType } from '../../core/types/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

const rawSales = [
  // Noviembre 2025
  { date: '2025-11-03', amount: 890, type: DocumentType.BOLETA },
  { date: '2025-11-08', amount: 1240, type: DocumentType.BOLETA },
  { date: '2025-11-14', amount: 680, type: DocumentType.FACTURA, ruc: '20601234565' },
  { date: '2025-11-20', amount: 2100, type: DocumentType.BOLETA },
  { date: '2025-11-27', amount: 1560, type: DocumentType.BOLETA },
  // Diciembre 2025
  { date: '2025-12-03', amount: 2400, type: DocumentType.BOLETA },
  { date: '2025-12-10', amount: 1800, type: DocumentType.FACTURA, ruc: '20601234565' },
  { date: '2025-12-18', amount: 3200, type: DocumentType.BOLETA },
  { date: '2025-12-24', amount: 4100, type: DocumentType.BOLETA },
  { date: '2025-12-31', amount: 2900, type: DocumentType.BOLETA },
  // Enero 2026
  { date: '2026-01-07', amount: 1650, type: DocumentType.BOLETA },
  { date: '2026-01-15', amount: 890, type: DocumentType.BOLETA },
  { date: '2026-01-22', amount: 1200, type: DocumentType.FACTURA, ruc: '20601234565' },
  { date: '2026-01-29', amount: 980, type: DocumentType.BOLETA },
  // Febrero 2026
  { date: '2026-02-05', amount: 1100, type: DocumentType.BOLETA },
  { date: '2026-02-12', amount: 1450, type: DocumentType.BOLETA },
  { date: '2026-02-19', amount: 2200, type: DocumentType.FACTURA, ruc: '20765432198' },
  { date: '2026-02-26', amount: 1680, type: DocumentType.BOLETA },
  // Marzo 2026
  { date: '2026-03-04', amount: 1900, type: DocumentType.BOLETA },
  { date: '2026-03-12', amount: 2100, type: DocumentType.BOLETA },
  { date: '2026-03-19', amount: 1500, type: DocumentType.FACTURA, ruc: '20601234565' },
  { date: '2026-03-26', amount: 2400, type: DocumentType.BOLETA },
  // Abril 2026
  { date: '2026-04-02', amount: 2200, type: DocumentType.BOLETA },
  { date: '2026-04-09', amount: 2650, type: DocumentType.BOLETA },
  { date: '2026-04-16', amount: 1980, type: DocumentType.FACTURA, ruc: '20765432198' },
  { date: '2026-04-23', amount: 3100, type: DocumentType.BOLETA },
];

export const SEED_SALES: Invoice[] = rawSales.map((s, i) => ({
  id: generateId(),
  type: InvoiceType.SALE,
  documentType: s.type,
  series: s.type === DocumentType.FACTURA ? 'F001' : 'B001',
  correlative: i + 1,
  issueDate: s.date,
  ruc: s.ruc || undefined,
  totalAmount: s.amount,
}));
