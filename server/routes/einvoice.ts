// ─── Emisión Electrónica de Comprobantes (PSE) ───
// POST /api/v1/einvoice/emit  { invoiceId, customer? }
// Emite una venta YA registrada en SAMI. Usa Nubefact si hay credenciales; si no, responde en
// Modo Demostración (isSimulated: true) sin afirmar aceptación de SUNAT. El resultado se guarda
// junto a la venta.
import express from 'express';
import { z } from 'zod';
import { logger } from '../../core/services/logger';
import { getPrismaClient } from '../../core/services/db';
import { createAuthenticateToken, requirePermission } from '../middleware/auth';
import { findSale, recordEmission, InvoiceOwner } from '../services/invoiceRepository';
import { emitWithNubefact, NubefactCustomer } from '../services/nubefactClient';

const router = express.Router();

const EmitRequestSchema = z.object({
  invoiceId: z.string().min(1),
  customer: z
    .object({
      name: z.string().max(200).optional(),
      address: z.string().max(300).optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

function resolveOwner(req: express.Request): InvoiceOwner {
  return { businessId: req.user?.businessId || req.user?.ruc || req.user?.id || 'b1', ruc: req.user?.ruc };
}

/** Si el padrón SUNAT está cargado, completa la razón social y dirección del cliente. */
async function completeCustomerFromPadron(ruc: string | undefined, customer: NubefactCustomer): Promise<NubefactCustomer> {
  if (customer.name || !ruc || !process.env.DATABASE_URL) return customer;
  try {
    const row = await getPrismaClient().rucPadron.findUnique({ where: { ruc } });
    return row ? { ...customer, name: row.businessName, address: customer.address || row.address } : customer;
  } catch {
    return customer;
  }
}

router.post('/emit', createAuthenticateToken(), requirePermission('SALES_WRITE'), async (req, res) => {
  const parsed = EmitRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
  }

  try {
    const owner = resolveOwner(req);
    const sale = await findSale(owner, parsed.data.invoiceId);
    if (!sale) {
      return res.status(404).json({ error: 'not_found', message: 'Venta no encontrada para este negocio.' });
    }
    if (sale.emission && !sale.emission.isSimulated && sale.emission.acceptedBySunat) {
      return res.status(409).json({ error: 'already_emitted', message: 'Este comprobante ya fue aceptado por SUNAT.' });
    }

    const customer = await completeCustomerFromPadron(sale.ruc, parsed.data.customer || {});
    const result = await emitWithNubefact(sale, customer);

    if (result.success) {
      await recordEmission(owner, sale.id, {
        provider: result.provider,
        isSimulated: result.isSimulated,
        acceptedBySunat: result.acceptedBySunat,
        sunatDescription: result.sunatMessage,
        pdfUrl: result.pdfUrl,
        xmlUrl: result.xmlUrl,
        cdrUrl: result.cdrUrl,
      });
    }

    logger.info('[E-Invoice] Emisión procesada', {
      invoiceId: sale.id,
      provider: result.provider,
      isSimulated: result.isSimulated,
      success: result.success,
    });
    res.status(result.success ? 200 : 502).json(result);
  } catch (err: any) {
    logger.error('[E-Invoice] Error al emitir comprobante:', {}, err);
    res.status(500).json({ success: false, isSimulated: true, provider: 'SIMULADO', environmentLabel: 'Error interno', errors: [err.message] });
  }
});

export default router;
