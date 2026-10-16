// ═══════════════════════════════════════════════════════════════
// ⚠️  DATOS DE DEMOSTRACIÓN — DOMINIO: COMPRAS Y GASTOS DE OPERACIÓN
// ═══════════════════════════════════════════════════════════════
// ADVERTENCIA DE SEGURIDAD Y CUMPLIMIENTO REGULATORIO:
// Estos datos son exclusivamente para entorno de desarrollo, pruebas y demostración.
// NO DEBEN USARSE EN PRODUCCIÓN. En producción, las compras se obtienen desde el RCE de SUNAT.
// ═══════════════════════════════════════════════════════════════

import { Invoice, InvoiceType, DocumentType } from '../../core/types/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

export const SEED_PURCHASES: Invoice[] = [
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 1, issueDate: '2025-11-15', ruc: '20100070970', totalAmount: 3200 },
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 2, issueDate: '2025-12-10', ruc: '20100070970', totalAmount: 5800 },
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 3, issueDate: '2026-01-14', ruc: '20100070970', totalAmount: 2900 },
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 4, issueDate: '2026-02-11', ruc: '20553467803', totalAmount: 1800 },
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 5, issueDate: '2026-03-08', ruc: '20100070970', totalAmount: 3500 },
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 6, issueDate: '2026-04-07', ruc: '20553467803', totalAmount: 4200 },
];
