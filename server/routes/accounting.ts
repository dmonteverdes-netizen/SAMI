// ─── Enrutador de Contabilidad y Ventas (SAMI Gateway) ───
import express from 'express';
import { z } from 'zod';
import { logger } from '../../core/services/logger';
import { calculateTaxesSync } from '../../core/services/accountingService';
import { createAuthenticateToken, requirePermission } from '../middleware/auth';
import {
  listInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  DuplicateInvoiceError,
  InvoiceOwner
} from '../services/invoiceRepository';
import { Invoice } from '../../core/types/types';

const router = express.Router();

// ─── Esquemas de Validación Zod ───

const InvoiceItemSchema = z.object({
  id: z.string().optional(),
  type: z.string().default('sale'),
  documentType: z.string(),
  series: z.string(),
  correlative: z.number().or(z.string().transform(v => parseInt(v, 10))),
  issueDate: z.string(),
  ruc: z.string().optional(),
  totalAmount: z.number(),
  category: z.string().optional()
});

const UpdateInvoiceSchema = InvoiceItemSchema.partial();

const CalculateTaxesRequestSchema = z.object({
  sales: z.array(InvoiceItemSchema),
  purchases: z.array(InvoiceItemSchema),
  taxRegime: z.string().optional()
});

function resolveBusinessId(req: express.Request): string {
  return req.user?.businessId || req.user?.ruc || req.user?.id || 'b1';
}

function resolveOwner(req: express.Request): InvoiceOwner {
  return { businessId: resolveBusinessId(req), ruc: req.user?.ruc };
}

// ─── 1. GET /api/v1/accounting/sales ───
// Obtiene el historial de ventas del negocio autenticado
router.get(
  '/sales',
  createAuthenticateToken(),
  requirePermission('SALES_READ'),
  async (req, res) => {
    try {
      const sales = await listInvoices(resolveOwner(req), 'sale');
      res.json({
        success: true,
        count: sales.length,
        sales
      });
    } catch (err: any) {
      logger.error('[Accounting Router] Error al obtener ventas:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 2. POST /api/v1/accounting/sales ───
// Registra una nueva venta bajo el businessId del token autenticado
router.post(
  '/sales',
  createAuthenticateToken(),
  requirePermission('SALES_WRITE'),
  async (req, res) => {
    try {
      const parsed = InvoiceItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
      }

      const businessId = resolveBusinessId(req);
      const saleData = parsed.data as Invoice;
      const newSale = await createInvoice(resolveOwner(req), 'sale', saleData);

      logger.info(`[Accounting Router] Venta registrada exitosamente para negocio ${businessId}: ${newSale.id}`);
      res.status(201).json({
        success: true,
        message: 'Venta registrada exitosamente',
        sale: newSale
      });
    } catch (err: any) {
      if (err instanceof DuplicateInvoiceError) {
        return res.status(409).json({ error: 'duplicate_invoice', message: err.message });
      }
      logger.error('[Accounting Router] Error al registrar venta:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 3. PUT /api/v1/accounting/sales/:id ───
// Actualiza una venta existente dentro del negocio autenticado
router.put(
  '/sales/:id',
  createAuthenticateToken(),
  requirePermission('SALES_WRITE'),
  async (req, res) => {
    try {
      const parsed = UpdateInvoiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
      }

      const saleId = String(req.params.id);
      const updated = await updateInvoice(resolveOwner(req), 'sale', saleId, parsed.data as Partial<Invoice>);

      if (!updated) {
        return res.status(404).json({ error: 'not_found', message: 'Comprobante de venta no encontrado' });
      }

      res.json({
        success: true,
        message: 'Venta actualizada exitosamente',
        sale: updated
      });
    } catch (err: any) {
      logger.error('[Accounting Router] Error al actualizar venta:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 4. DELETE /api/v1/accounting/sales/:id ───
// Elimina una venta dentro del negocio autenticado
router.delete(
  '/sales/:id',
  createAuthenticateToken(),
  requirePermission('SALES_WRITE'),
  async (req, res) => {
    try {
      const saleId = String(req.params.id);
      const deleted = await deleteInvoice(resolveOwner(req), 'sale', saleId);

      if (!deleted) {
        return res.status(404).json({ error: 'not_found', message: 'Comprobante de venta no encontrado' });
      }

      res.json({
        success: true,
        message: 'Venta eliminada exitosamente'
      });
    } catch (err: any) {
      logger.error('[Accounting Router] Error al eliminar venta:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 5. POST /api/v1/accounting/calculate-taxes ───
router.post('/calculate-taxes', (req, res) => {
  try {
    const parsed = CalculateTaxesRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
    }
    
    const { sales, purchases, taxRegime } = parsed.data;
    const mappedSales = sales.map(s => ({ ...s, id: s.id || crypto.randomUUID() })) as any;
    const mappedPurchases = purchases.map(p => ({ ...p, id: p.id || crypto.randomUUID() })) as any;
    const summary = calculateTaxesSync(mappedSales, mappedPurchases, { taxRegime });
    res.json({ success: true, summary });
  } catch (err: any) {
    logger.error('[Accounting Router] Error en calculate-taxes:', {}, err);
    res.status(400).json({ error: 'invalid_invoice_data', message: err.message });
  }
});

export default router;
