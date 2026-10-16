import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import creditRouter, { getTaxSummaryLogic } from '../../server/routes/credit';
import { requirePhase } from '../../server/middleware/phaseGuard';

// Instancia de Express aislada para pruebas de integración de la ruta
const app = express();
app.use(express.json());
app.use('/api/v1/credit', requirePhase(3), creditRouter);

describe('Integration Tests: Credit Router (Marketplace de Microcréditos MYPE - Fase 3)', () => {
  // Asegurar que la fase activa permita el acceso durante todas las pruebas (Fase >= 3)
  const originalEnvPhase = process.env.SAMI_ACTIVE_PHASE;

  beforeAll(() => {
    process.env.SAMI_ACTIVE_PHASE = '3';
  });

  afterAll(() => {
    if (originalEnvPhase !== undefined) {
      process.env.SAMI_ACTIVE_PHASE = originalEnvPhase;
    } else {
      delete process.env.SAMI_ACTIVE_PHASE;
    }
  });

  // ─── 1. Endpoint: POST /api/v1/credit/calculate-tax-health ───
  describe('POST /api/v1/credit/calculate-tax-health', () => {
    // ─── Test 1: Payload válido con historial de ventas/compras de ejemplo ───
    it('1. debe responder 200 con la estructura de TaxSummary esperada cuando el payload es válido (>= 3 facturas)', async () => {
    const validPayload = {
      sales: [
        {
          id: 'sale-1',
          type: 'sale',
          documentType: 'FACTURA',
          series: 'F001',
          correlative: 101,
          issueDate: '2026-01-15',
          ruc: '20131312955',
          totalAmount: 1180.00
        },
        {
          id: 'sale-2',
          type: 'sale',
          documentType: 'BOLETA_DE_VENTA',
          series: 'B001',
          correlative: 102,
          issueDate: '2026-01-20',
          totalAmount: 500.00
        },
        {
          id: 'sale-3',
          type: 'sale',
          documentType: 'FACTURA',
          series: 'F001',
          correlative: 103,
          issueDate: '2026-02-10',
          ruc: '20100047218',
          totalAmount: 2360.00
        }
      ],
      purchases: [
        {
          id: 'purch-1',
          type: 'purchase',
          documentType: 'FACTURA',
          series: 'F002',
          correlative: 50,
          issueDate: '2026-01-18',
          ruc: '20100130204',
          totalAmount: 590.00
        }
      ]
    };

    const response = await request(app)
      .post('/api/v1/credit/calculate-tax-health')
      .send(validPayload)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('taxSummary');

    const { taxSummary } = response.body;
    expect(taxSummary).not.toBeNull();
    expect(typeof taxSummary.avgMonthlySales).toBe('number');
    expect(typeof taxSummary.avgMonthlyPurchases).toBe('number');
    expect(taxSummary.verifiedInvoicesCount).toBe(4); // 3 ventas + 1 compra
    expect(taxSummary.formalityRatio).toBe(100);

    // NOTA: El assert cambió de 'Al día' a 'Sin actividad reciente' porque la última venta del payload
    // de prueba es de 2026-02-10, fecha que con la fecha actual de ejecución dista más de 90 días.
    expect(taxSummary.complianceStatus).toBe('Sin actividad reciente');

    // Validación de cálculos:
    // Mes 2026-01: 1180 + 500 = 1680
    // Mes 2026-02: 2360
    // Promedio mensual ventas = (1680 + 2360) / 2 = 2020
    expect(taxSummary.avgMonthlySales).toBe(2020);
    // Compras: 590 / 2 meses con ventas registradas (2026-01 y 2026-02) -> 590 / 2 = 295
    expect(taxSummary.avgMonthlyPurchases).toBe(295);
  });

  // ─── Test 2: Payload con referenceDate determinista ───
  it('2. debe calcular complianceStatus determinísticamente cuando se envía referenceDate en el payload', async () => {
    const validSales = [
      { id: 's1', type: 'sale', documentType: 'FACTURA', series: 'F001', correlative: 1, issueDate: '2026-01-15', ruc: '20131312955', totalAmount: 1000 },
      { id: 's2', type: 'sale', documentType: 'FACTURA', series: 'F001', correlative: 2, issueDate: '2026-02-15', ruc: '20131312955', totalAmount: 1000 },
      { id: 's3', type: 'sale', documentType: 'FACTURA', series: 'F001', correlative: 3, issueDate: '2026-03-01', ruc: '20131312955', totalAmount: 1000 }
    ];

    // Caso (a): referenceDate a 10 días de la última venta (2026-03-11) -> 'Al día'
    const resAlDia = await request(app)
      .post('/api/v1/credit/calculate-tax-health')
      .send({ sales: validSales, purchases: [], referenceDate: '2026-03-11' })
      .expect(200);
    expect(resAlDia.body.taxSummary.complianceStatus).toBe('Al día');

    // Caso (b): referenceDate a 50 días de la última venta (2026-04-20) -> 'Registro desactualizado'
    const resDesactualizado = await request(app)
      .post('/api/v1/credit/calculate-tax-health')
      .send({ sales: validSales, purchases: [], referenceDate: '2026-04-20' })
      .expect(200);
    expect(resDesactualizado.body.taxSummary.complianceStatus).toBe('Registro desactualizado');

    // Caso (c): referenceDate a 100 días de la última venta (2026-06-09) -> 'Sin actividad reciente'
    const resSinActividad = await request(app)
      .post('/api/v1/credit/calculate-tax-health')
      .send({ sales: validSales, purchases: [], referenceDate: '2026-06-09' })
      .expect(200);
    expect(resSinActividad.body.taxSummary.complianceStatus).toBe('Sin actividad reciente');
  });

  // ─── Test 3: Payload inválido (sales como string en vez de array) ───
  it('3. debe responder 400 con los detalles de error de validación cuando el payload es inválido', async () => {
    const invalidPayload = {
      sales: 'invalido_no_es_array',
      purchases: []
    };

    const response = await request(app)
      .post('/api/v1/credit/calculate-tax-health')
      .send(invalidPayload)
      .expect(400);

    expect(response.body).toHaveProperty('error', 'invalid_payload');
    expect(response.body).toHaveProperty('details');
    expect(response.body.details).toHaveProperty('sales');
    expect(response.body.details.sales._errors.length).toBeGreaterThan(0);
  });

  // ─── Test 4: Payload vacío ({}) - Regresión de comportamiento actual ───
  it('4. debe responder 200 con taxSummary: null cuando el payload está vacío o tiene menos de 3 ventas (regresión)', async () => {
    const emptyPayload = {};

    const response = await request(app)
      .post('/api/v1/credit/calculate-tax-health')
      .send(emptyPayload)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    // getTaxSummaryLogic retorna null si salesHistory.length < 3
    expect(response.body.taxSummary).toBeNull();
  });

  // ─── Test 5: Verificación directa de getTaxSummaryLogic exportada ───
  it('5. debe verificar getTaxSummaryLogic con huecos de meses para calcular formalityRatio = 67', () => {
    const salesWithGaps = [
      { id: 's1', type: 'sale', documentType: 'FACTURA', series: 'F001', correlative: 1, issueDate: '2026-01-05', ruc: '20131312955', totalAmount: 2000 },
      { id: 's2', type: 'sale', documentType: 'FACTURA', series: 'F001', correlative: 2, issueDate: '2026-03-12', ruc: '20131312955', totalAmount: 2000 },
      { id: 's3', type: 'sale', documentType: 'FACTURA', series: 'F001', correlative: 3, issueDate: '2026-04-10', ruc: '20131312955', totalAmount: 2000 },
      { id: 's4', type: 'sale', documentType: 'FACTURA', series: 'F001', correlative: 4, issueDate: '2026-06-25', ruc: '20131312955', totalAmount: 2000 }
    ];

    const res = getTaxSummaryLogic(salesWithGaps, [], new Date('2026-06-30'));
    expect(res).not.toBeNull();
    expect(res?.formalityRatio).toBe(67);
    expect(res?.complianceStatus).toBe('Al día');
  });
});

// ─── FASE 3: Pruebas de Integración de Ofertas de Préstamo y Factoring ───

describe('Integration Test: POST /api/v1/credit/loan-offers', () => {
  // Test 1: Solo cruza el primer umbral (avgMonthlySales = 5000 >= 3000)
  it('1. debe generar exactamente 1 oferta del partner Fintech Veloz cuando avgMonthlySales = 5000', async () => {
    const response = await request(app)
      .post('/api/v1/credit/loan-offers')
      .send({
        taxSummary: { avgMonthlySales: 5000 },
        isFinanceCertified: false
      })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('offers');
    const { offers } = response.body;

    expect(offers).toHaveLength(1);
    expect(offers[0].partner.id).toBe('fintech_a');
    expect(offers[0].partner.name).toBe('Fintech Veloz');
    // maxAmount = Math.floor((5000 * 0.8) / 100) * 100 = 4000
    expect(offers[0].maxAmount).toBe(4000);
    expect(offers[0].monthlyInterestRate).toBe(0.035);
    expect(offers[0].termInMonths).toBe(12);
  });

  // Test 2: Cruza los 3 umbrales (avgMonthlySales = 30000 >= 25000)
  it('2. debe generar 3 ofertas ordenadas de mayor a menor maxAmount cuando avgMonthlySales = 30000', async () => {
    const response = await request(app)
      .post('/api/v1/credit/loan-offers')
      .send({
        taxSummary: { avgMonthlySales: 30000 },
        isFinanceCertified: false
      })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    const { offers } = response.body;

    expect(offers).toHaveLength(3);

    // Verificación del orden descendente por maxAmount (.sort((a, b) => b.maxAmount - a.maxAmount))
    expect(offers[0].maxAmount).toBeGreaterThanOrEqual(offers[1].maxAmount);
    expect(offers[1].maxAmount).toBeGreaterThanOrEqual(offers[2].maxAmount);

    // Oferta 1: Banco ProMYPE (umbral 25k -> multiplier 2.0 -> 30000 * 2.0 = 60000)
    expect(offers[0].partner.id).toBe('banco_c');
    expect(offers[0].maxAmount).toBe(60000);
    expect(offers[0].monthlyInterestRate).toBe(0.018);
    expect(offers[0].termInMonths).toBe(36);

    // Oferta 2: Caja Confianza (umbral 10k -> multiplier 1.2 -> 30000 * 1.2 = 36000)
    expect(offers[1].partner.id).toBe('caja_b');
    expect(offers[1].maxAmount).toBe(36000);
    expect(offers[1].monthlyInterestRate).toBe(0.025);
    expect(offers[1].termInMonths).toBe(24);

    // Oferta 3: Fintech Veloz (umbral 3k -> multiplier 0.8 -> 30000 * 0.8 = 24000)
    expect(offers[2].partner.id).toBe('fintech_a');
    expect(offers[2].maxAmount).toBe(24000);
    expect(offers[2].monthlyInterestRate).toBe(0.035);
    expect(offers[2].termInMonths).toBe(12);
  });

  // Test 3: avgMonthlySales = 0 o taxSummary null
  it('3. debe responder con un array de ofertas vacío cuando avgMonthlySales = 0 o taxSummary es null/undefined', async () => {
    // Caso 3a: avgMonthlySales = 0
    const resZero = await request(app)
      .post('/api/v1/credit/loan-offers')
      .send({ taxSummary: { avgMonthlySales: 0 } })
      .expect(200);
    expect(resZero.body.success).toBe(true);
    expect(resZero.body.offers).toEqual([]);

    // Caso 3b: taxSummary = null
    const resNull = await request(app)
      .post('/api/v1/credit/loan-offers')
      .send({ taxSummary: null })
      .expect(200);
    expect(resNull.body.success).toBe(true);
    expect(resNull.body.offers).toEqual([]);

    // Caso 3c: payload vacío {}
    const resEmpty = await request(app)
      .post('/api/v1/credit/loan-offers')
      .send({})
      .expect(200);
    expect(resEmpty.body.success).toBe(true);
    expect(resEmpty.body.offers).toEqual([]);
  });

  // Test 4: isFinanceCertified: true vs false
  it('4. debe otorgar mayor monto ofertado en cada tramo cuando isFinanceCertified es true', async () => {
    const avgMonthlySales = 30000;

    const resUncertified = await request(app)
      .post('/api/v1/credit/loan-offers')
      .send({ taxSummary: { avgMonthlySales }, isFinanceCertified: false })
      .expect(200);

    const resCertified = await request(app)
      .post('/api/v1/credit/loan-offers')
      .send({ taxSummary: { avgMonthlySales }, isFinanceCertified: true })
      .expect(200);

    const uncertifiedOffers = resUncertified.body.offers;
    const certifiedOffers = resCertified.body.offers;

    expect(uncertifiedOffers).toHaveLength(3);
    expect(certifiedOffers).toHaveLength(3);

    // Tramo 1 (banco_c, base multiplier 2.0 -> certificado 2.0 * 1.2 = 2.4 -> 72000 vs 60000)
    const certBanco = certifiedOffers.find((o: any) => o.partner.id === 'banco_c');
    const uncertBanco = uncertifiedOffers.find((o: any) => o.partner.id === 'banco_c');
    expect(certBanco.maxAmount).toBe(72000);
    expect(uncertBanco.maxAmount).toBe(60000);
    expect(certBanco.maxAmount).toBeGreaterThan(uncertBanco.maxAmount);

    // Tramo 2 (caja_b, base multiplier 1.2 -> certificado 1.2 * 1.15 = 1.38 -> 41400 vs 36000)
    const certCaja = certifiedOffers.find((o: any) => o.partner.id === 'caja_b');
    const uncertCaja = uncertifiedOffers.find((o: any) => o.partner.id === 'caja_b');
    expect(certCaja.maxAmount).toBe(41400);
    expect(uncertCaja.maxAmount).toBe(36000);
    expect(certCaja.maxAmount).toBeGreaterThan(uncertCaja.maxAmount);

    // Tramo 3 (fintech_a, base multiplier 0.8 -> certificado 0.8 * 1.1 = 0.88 -> 26400 vs 24000)
    const certFintech = certifiedOffers.find((o: any) => o.partner.id === 'fintech_a');
    const uncertFintech = uncertifiedOffers.find((o: any) => o.partner.id === 'fintech_a');
    expect(certFintech.maxAmount).toBe(26400);
    expect(uncertFintech.maxAmount).toBe(24000);
    expect(certFintech.maxAmount).toBeGreaterThan(uncertFintech.maxAmount);
  });

  // Test 5: TEST DE PROTECCIÓN DEL MODELO DE NEGOCIO (Ley Peruana y Reglas SAMI)
  it('5. [PROTECCIÓN DE NEGOCIO] NUNCA debe incluir campos de aprobación/denegación/score (SAMI es facilitador, no evaluador ni otorgante)', async () => {
    const response = await request(app)
      .post('/api/v1/credit/loan-offers')
      .send({
        taxSummary: { avgMonthlySales: 35000, formalityRatio: 100, complianceStatus: 'Al día' },
        isFinanceCertified: true
      })
      .expect(200);

    const body = response.body;

    // 1. Verificación en la raíz de la respuesta
    const forbiddenRootKeys = [
      'approved', 'denied', 'finalDecision', 'decision',
      'creditApproved', 'creditStatus', 'approvalStatus',
      'score', 'samiScore', 'riskScore', 'creditScore', 'sbsCategory'
    ];

    forbiddenRootKeys.forEach(key => {
      expect(body).not.toHaveProperty(key);
    });

    // 2. Verificación dentro de cada oferta devuelta
    body.offers.forEach((offer: any) => {
      const forbiddenOfferKeys = [
        'approved', 'denied', 'decision', 'finalDecision',
        'isApproved', 'status', 'approvalStatus', 'rating', 'score'
      ];
      forbiddenOfferKeys.forEach(key => {
        expect(offer).not.toHaveProperty(key);
      });

      // Las ofertas solo deben contener términos informativos de la entidad
      expect(offer).toHaveProperty('partner');
      expect(offer).toHaveProperty('maxAmount');
      expect(offer).toHaveProperty('monthlyInterestRate');
      expect(offer).toHaveProperty('termInMonths');
    });
  });
});

describe('Integration Test: POST /api/v1/credit/factoring-offers', () => {
  // Test 6: Factura válida vs Boleta / Monto <= 500
  it('6. debe generar ofertas de factoring para facturas > 500 y excluir boletas o montos <= 500', async () => {
    const payload = {
      sales: [
        // Factura 1: Válida para factoring (FACTURA y monto 2000 > 500)
        {
          id: 'fact-100',
          type: 'sale',
          documentType: 'FACTURA',
          series: 'F001',
          correlative: 100,
          issueDate: '2026-02-01',
          totalAmount: 2000.00
        },
        // Factura 2: No elegible por monto <= 500
        {
          id: 'fact-101',
          type: 'sale',
          documentType: 'FACTURA',
          series: 'F001',
          correlative: 101,
          issueDate: '2026-02-02',
          totalAmount: 500.00
        },
        // Boleta 3: No elegible para factoring de crédito comercial (es Boleta de Venta)
        {
          id: 'bol-102',
          type: 'sale',
          documentType: 'BOLETA_DE_VENTA',
          series: 'B001',
          correlative: 102,
          issueDate: '2026-02-03',
          totalAmount: 5000.00
        }
      ]
    };

    const response = await request(app)
      .post('/api/v1/credit/factoring-offers')
      .send(payload)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    const { offers } = response.body;

    // Solo fact-100 genera ofertas (2 ofertas: una por cada uno de los 2 primeros partners)
    expect(offers).toHaveLength(2);

    offers.forEach((offer: any) => {
      expect(offer.invoiceId).toBe('fact-100');
    });

    // Partner 1: fintech_a (85% adelanto, 3% comisión)
    const offerFintech = offers.find((o: any) => o.partner.id === 'fintech_a');
    expect(offerFintech).toBeDefined();
    expect(offerFintech.advancePercentage).toBe(0.85);
    expect(offerFintech.feePercentage).toBe(0.03);
    // netAmount = 2000 * 0.85 * (1 - 0.03) = 1700 * 0.97 = 1649
    expect(offerFintech.netAmount).toBeCloseTo(1649, 2);

    // Partner 2: caja_b (90% adelanto, 2.5% comisión)
    const offerCaja = offers.find((o: any) => o.partner.id === 'caja_b');
    expect(offerCaja).toBeDefined();
    expect(offerCaja.advancePercentage).toBe(0.90);
    expect(offerCaja.feePercentage).toBe(0.025);
    // netAmount = 2000 * 0.90 * (1 - 0.025) = 1800 * 0.975 = 1755
    expect(offerCaja.netAmount).toBeCloseTo(1755, 2);
  });

  it('debe responder 400 cuando el payload de factoring no incluye un array de sales', async () => {
    const response = await request(app)
      .post('/api/v1/credit/factoring-offers')
      .send({ sales: 'no_es_un_array' })
      .expect(400);

    expect(response.body).toHaveProperty('error', 'invalid_payload');
  });
});
});
