// ─── Emisión Electrónica de Comprobantes (PSE) ───
// POST /api/v1/einvoice/emit  { invoiceId, customer? }
// Emite una venta YA registrada en SAMI con el proveedor configurado (Nubefact, SUNAT directo vía
// Lycet o Modo Demostración; ver emissionProvider.ts). Nunca afirma aceptación de SUNAT en modo
// simulado. El resultado (y en envío directo, el XML firmado y el CDR) se guarda junto a la venta.
import express from 'express';
import { z } from 'zod';
import { logger } from '../../core/services/logger';
import { createAuthenticateToken, requirePermission } from '../middleware/auth';
import { findSale, recordEmission, InvoiceOwner } from '../services/invoiceRepository';
import { emitInvoice, completeCustomerFromPadron } from '../services/emissionProvider';

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
    const result = await emitInvoice(sale, { customer, emitterRuc: owner.ruc });

    if (result.success) {
      await recordEmission(owner, sale.id, {
        provider: result.provider,
        isSimulated: result.isSimulated,
        acceptedBySunat: result.acceptedBySunat,
        sunatDescription: result.sunatMessage,
        pdfUrl: result.pdfUrl,
        xmlUrl: result.xmlUrl,
        cdrUrl: result.cdrUrl,
        signedXml: result.signedXml,
        cdrZipBase64: result.cdrZipBase64,
        documentHash: result.documentHash,
      });
    }

    logger.info('[E-Invoice] Emisión procesada', {
      invoiceId: sale.id,
      provider: result.provider,
      isSimulated: result.isSimulated,
      success: result.success,
    });
    // El XML y el CDR quedan guardados en la venta; no se envían al navegador.
    const { signedXml: _xml, cdrZipBase64: _cdr, ...publicResult } = result;
    res.status(result.success ? 200 : 502).json(publicResult);
  } catch (err: unknown) {
    logger.error('[E-Invoice] Error al emitir comprobante:', {}, err);
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ success: false, isSimulated: true, provider: 'SIMULADO', environmentLabel: 'Error interno', errors: [message] });
  }
});

export default router;
