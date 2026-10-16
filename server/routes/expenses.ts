// ─── Enrutador de Gastos y Compras (SAMI Gateway) ───
import express from 'express';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import {
  createAuthenticateToken,
  requirePermission
} from '../middleware/auth';
import { logger } from '../../core/services/logger';
import {
  getPurchasesForBusiness,
  savePurchaseForBusiness,
  updatePurchaseForBusiness,
  deletePurchaseForBusiness
} from '../services/businessStore';
import { Invoice } from '../../core/types/types';

const router = express.Router();

function resolveBusinessId(req: express.Request): string {
  return req.user?.businessId || req.user?.ruc || req.user?.id || 'b1';
}

// ─── Esquemas de Validación ───

const PurchaseItemSchema = z.object({
  id: z.string().optional(),
  type: z.string().default('purchase'),
  documentType: z.string(),
  series: z.string(),
  correlative: z.number().or(z.string().transform(v => parseInt(v, 10))),
  issueDate: z.string(),
  ruc: z.string().optional(),
  totalAmount: z.number(),
  category: z.string().optional()
});

const UpdatePurchaseSchema = PurchaseItemSchema.partial();

// ─── 1. GET /api/v1/expenses/purchases ───
// Obtiene el historial de compras del negocio autenticado
router.get(
  '/purchases',
  createAuthenticateToken(),
  requirePermission('PURCHASES_READ'),
  (req, res) => {
    try {
      const businessId = resolveBusinessId(req);
      const purchases = getPurchasesForBusiness(businessId);
      res.json({
        success: true,
        count: purchases.length,
        purchases
      });
    } catch (err: any) {
      logger.error('[SAMI Expenses] Error al obtener compras:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 2. POST /api/v1/expenses/purchases ───
// Registra una nueva compra bajo el businessId autenticado
router.post(
  '/purchases',
  createAuthenticateToken(),
  requirePermission('PURCHASES_WRITE'),
  (req, res) => {
    try {
      const parsed = PurchaseItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
      }

      const businessId = resolveBusinessId(req);
      const purchaseData = {
        ...parsed.data,
        type: parsed.data.type || 'purchase',
        analyzed: false,
        anomalyDetected: false,
        registeredAt: new Date().toISOString()
      } as unknown as Invoice;

      const newRecord = savePurchaseForBusiness(businessId, purchaseData);
      logger.info(`[SAMI Expenses] Compra registrada exitosamente para negocio ${businessId}: ${newRecord.id}`);

      res.status(201).json({
        success: true,
        message: 'Compra registrada exitosamente',
        purchase: newRecord
      });
    } catch (err: any) {
      logger.error('[SAMI Expenses] Error al registrar compra:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 3. PUT /api/v1/expenses/purchases/:id ───
// Actualiza una compra existente del negocio autenticado
router.put(
  '/purchases/:id',
  createAuthenticateToken(),
  requirePermission('PURCHASES_WRITE'),
  (req, res) => {
    try {
      const parsed = UpdatePurchaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
      }

      const businessId = resolveBusinessId(req);
      const purchaseId = String(req.params.id);
      const updated = updatePurchaseForBusiness(businessId, purchaseId, parsed.data as Partial<Invoice>);

      if (!updated) {
        return res.status(404).json({ error: 'not_found', message: 'Comprobante de compra no encontrado' });
      }

      res.json({
        success: true,
        message: 'Compra actualizada exitosamente',
        purchase: updated
      });
    } catch (err: any) {
      logger.error('[SAMI Expenses] Error al actualizar compra:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 4. DELETE /api/v1/expenses/purchases/:id ───
// Elimina una compra del negocio autenticado
router.delete(
  '/purchases/:id',
  createAuthenticateToken(),
  requirePermission('PURCHASES_WRITE'),
  (req, res) => {
    try {
      const businessId = resolveBusinessId(req);
      const purchaseId = String(req.params.id);
      const deleted = deletePurchaseForBusiness(businessId, purchaseId);

      if (!deleted) {
        return res.status(404).json({ error: 'not_found', message: 'Comprobante de compra no encontrado' });
      }

      res.json({
        success: true,
        message: 'Compra eliminada exitosamente'
      });
    } catch (err: any) {
      logger.error('[SAMI Expenses] Error al eliminar compra:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 5. GET /api/v1/expenses/monitoring-status ───
router.get(
  '/monitoring-status',
  createAuthenticateToken(),
  requirePermission('EXPENSES_MONITORING_READ'),
  (req, res) => {
    try {
      const businessId = resolveBusinessId(req);
      const purchases = getPurchasesForBusiness(businessId);
      const anomalies = purchases.filter((p: any) => p.anomalyDetected);

      res.json({
        success: true,
        daemonStatus: 'ACTIVE',
        totalAnalyzed: purchases.filter((p: any) => p.analyzed).length,
        anomaliesDetected: anomalies.length,
        recentAnomalies: anomalies.slice(-5)
      });
    } catch (err: any) {
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 6. POST /api/v1/expenses/simulate-spike ───
router.post(
  '/simulate-spike',
  createAuthenticateToken(),
  requirePermission('EXPENSES_SIMULATE'),
  (req, res) => {
    try {
      const businessId = resolveBusinessId(req);
      const spikeAmount = req.body.amount || 25000;

      const spikePurchase: any = {
        id: `spike_${Date.now()}`,
        type: 'purchase',
        documentType: 'FACTURA',
        series: 'F002',
        correlative: Math.floor(Math.random() * 9000) + 1000,
        issueDate: new Date().toISOString().split('T')[0],
        ruc: '20100070970',
        totalAmount: spikeAmount,
        category: 'Tecnología y Equipamiento Mayor',
        analyzed: false,
        anomalyDetected: false,
        simulated: true
      };

      const saved = savePurchaseForBusiness(businessId, spikePurchase);

      res.json({
        success: true,
        message: `Simulación generada: Compra por S/ ${spikeAmount} registrada para detección automática por el daemon.`,
        purchase: saved
      });
    } catch (err: any) {
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 7. POST /api/v1/expenses/recurring-vendors ───
router.post('/recurring-vendors', (req, res) => {
  try {
    const { purchases } = req.body || {};
    const businessId = req.user?.businessId || 'b1';
    const purchaseList = Array.isArray(purchases) ? purchases : getPurchasesForBusiness(businessId);
    const vendorCounts: { [ruc: string]: { name: string; count: number; total: number } } = {};

    purchaseList.forEach((p: any) => {
      if (p.ruc) {
        if (!vendorCounts[p.ruc]) {
          vendorCounts[p.ruc] = { name: `Proveedor ${p.ruc}`, count: 0, total: 0 };
        }
        vendorCounts[p.ruc].count += 1;
        vendorCounts[p.ruc].total += (p.totalAmount || 0);
      }
    });

    const vendors = Object.entries(vendorCounts)
      .filter(([_, data]) => data.count >= 2)
      .map(([ruc, data]) => ({
        id: ruc,
        name: data.name,
        ruc,
        category: 'General',
        isKeyVendor: data.count >= 4,
        totalAmount: data.total
      }));

    res.json({ success: true, vendors });
  } catch (err: any) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// ─── 8. POST /api/v1/expenses/cost-report ───
router.post('/cost-report', (req, res) => {
  try {
    const { purchases, cashFlowStatus } = req.body || {};
    const businessId = req.user?.businessId || 'b1';
    const purchaseList = Array.isArray(purchases) ? purchases : getPurchasesForBusiness(businessId);
    const vendorTotals: { [ruc: string]: { name: string; total: number; count: number } } = {};

    purchaseList.forEach((p: any) => {
      if (p.ruc) {
        if (!vendorTotals[p.ruc]) {
          vendorTotals[p.ruc] = { name: `Proveedor ${p.ruc}`, total: 0, count: 0 };
        }
        vendorTotals[p.ruc].total += (p.totalAmount || 0);
        vendorTotals[p.ruc].count += 1;
      }
    });

    const items = Object.entries(vendorTotals)
      .filter(([_, data]) => data.count >= 2)
      .map(([_, data]) => {
        const suggestedDiscount = 0.02;
        return {
          vendorName: data.name,
          recurringAmount: data.total / data.count,
          frequency: 'Mensual',
          suggestedDiscount,
          potentialSavings: (data.total / data.count) * suggestedDiscount,
          reason: 'Proveedor recurrente detectado. Sugerimos negociar descuento por pronto pago.'
        };
      });

    const report = {
      items,
      totalPotentialSavings: items.reduce((acc, item) => acc + item.potentialSavings, 0),
      cashFlowStatus: cashFlowStatus || 'healthy'
    };

    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// ─── 9. POST /api/v1/expenses/suggest-category ───
router.post('/suggest-category', async (req, res) => {
  try {
    const { textContent, ruc, vendorName, totalAmount } = req.body || {};

    if (!textContent || typeof textContent !== 'string' || textContent.trim().length === 0) {
      return res.json({
        success: true,
        category: 'Otros Gastos',
        confidence: 0,
        reason: 'Escriba el detalle o descripción de la compra para que la IA la clasifique.',
        alternativeCategories: ['Mercadería y Suministros']
      });
    }

    const cleanText = textContent.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    const runHeuristicFallback = () => {
      const lower = (cleanText + ' ' + (vendorName || '')).toLowerCase();
      let category = 'Otros Gastos';
      let reason = 'Clasificado según palabras clave del comprobante.';
      let confidence = 0.85;
      let alt: string[] = ['Mercadería y Suministros'];

      if (/luz|agua|internet|telefon|sedapal|enel|luz del sur|movistar|claro|entel|recibo/i.test(lower)) {
        category = 'Servicios Públicos';
        reason = 'Detectado pago de servicios básicos o telecomunicaciones.';
        confidence = 0.93;
        alt = ['Alquileres y Oficinas', 'Otros Gastos'];
      } else if (/flete|transporte|envio|despacho|gasolina|combustible|peaje|encomienda|logistica|carga/i.test(lower)) {
        category = 'Logística y Transporte';
        reason = 'Detectado gasto de traslado, flete o logística de distribución.';
        confidence = 0.94;
        alt = ['Servicios Públicos', 'Otros Gastos'];
      } else if (/harina|materia|insumo|saco|mercaderia|tela|hilo|alimento|producto|stock|carne|verdura|cuero|embalaje/i.test(lower)) {
        category = 'Mercadería y Suministros';
        reason = 'Detectada adquisición de materias primas o productos para venta.';
        confidence = 0.92;
        alt = ['Otros Gastos', 'Logística y Transporte'];
      } else if (/software|hosting|dominio|licencia|laptop|impresora|computador|app|cloud|sistema|hardware/i.test(lower)) {
        category = 'Tecnología y Software';
        reason = 'Detectada adquisición de herramientas tecnológicas o licencias.';
        confidence = 0.91;
        alt = ['Alquileres y Oficinas', 'Servicios Públicos'];
      } else if (/alquiler|arriendo|local|oficina|mueble|escritorio|papel|silla|utiles/i.test(lower)) {
        category = 'Alquileres y Oficinas';
        reason = 'Detectado costo de arrendamiento de local u suministros de oficina.';
        confidence = 0.89;
        alt = ['Servicios Públicos', 'Otros Gastos'];
      } else if (/facebook|instagram|ads|publicidad|marketing|banner|volante|diseno|imprenta|promocion/i.test(lower)) {
        category = 'Marketing y Ventas';
        reason = 'Detectado gasto promocional o de marketing para incremento de ventas.';
        confidence = 0.90;
        alt = ['Otros Gastos', 'Servicios Públicos'];
      } else if (/mantenimiento|repuesto|reparacion|tecnico|limpieza|lubricante|taller/i.test(lower)) {
        category = 'Mantenimiento y Reparación';
        reason = 'Detectados servicios de acondicionamiento, servicio técnico o repuestos.';
        confidence = 0.88;
        alt = ['Otros Gastos', 'Mercadería y Suministros'];
      }

      return {
        success: true,
        category,
        confidence,
        reason,
        alternativeCategories: alt,
        source: 'heuristic'
      };
    };

    if (!apiKey) {
      return res.json(runHeuristicFallback());
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Actúas como un clasificador contable experto para MYPES en el sistema tributario peruano SUNAT.
Analiza la siguiente información de una compra/gasto realizado por la empresa:
- Detalle/Texto: "${cleanText}"
${ruc ? `- RUC del Proveedor: ${ruc}` : ''}
${vendorName ? `- Proveedor: ${vendorName}` : ''}
${totalAmount ? `- Monto Total: S/ ${totalAmount}` : ''}

Selecciona la categoría contable más adecuada entre exactamente las siguientes opciones estándar:
1. "Mercadería y Suministros"
2. "Servicios Públicos"
3. "Tecnología y Software"
4. "Alquileres y Oficinas"
5. "Marketing y Ventas"
6. "Logística y Transporte"
7. "Mantenimiento y Reparación"
8. "Otros Gastos"

Devuelve tu respuesta strictly en formato JSON con la siguiente estructura:
{
  "category": "Nombre exacto de la categoría elegida",
  "confidence": 0.95,
  "reason": "Explicación concisa en 1 oración en español del motivo de la selección",
  "alternativeCategories": ["Categoría Secundaria 1", "Categoría Secundaria 2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText.trim());

      if (parsed && parsed.category) {
        return res.json({
          success: true,
          category: parsed.category,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
          reason: parsed.reason || 'Categorizado automáticamente por IA según el contenido del comprobante.',
          alternativeCategories: Array.isArray(parsed.alternativeCategories) ? parsed.alternativeCategories : [],
          source: 'gemini'
        });
      }

      return res.json(runHeuristicFallback());
    } catch (geminiError: any) {
      logger.warn('[SAMI Expenses] Error llamando a Gemini para categorización:', geminiError?.message);
      return res.json(runHeuristicFallback());
    }
  } catch (err: any) {
    logger.error('[SAMI Expenses] Error en suggest-category:', {}, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
