import express from 'express';
import { z } from 'zod';
import { logger } from '../../core/services/logger';
import { calculateTaxesSync } from '../../core/services/accountingService';

const router = express.Router();

const mockPartners = [
  { id: 'fintech_a', name: 'Fintech Veloz', logoUrl: 'https://placehold.co/100x40/007bff/ffffff?text=Veloz' },
  { id: 'caja_b', name: 'Caja Confianza', logoUrl: 'https://placehold.co/100x40/28a745/ffffff?text=Confianza' },
  { id: 'banco_c', name: 'Banco ProMYPE', logoUrl: 'https://placehold.co/100x40/ffc107/000000?text=ProMYPE' },
];

const InvoiceSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  documentType: z.string(),
  series: z.string(),
  correlative: z.number(),
  issueDate: z.string(),
  ruc: z.string().optional(),
  totalAmount: z.number(),
  category: z.string().optional()
});

const CalculateTaxHealthRequestSchema = z.object({
  sales: z.array(InvoiceSchema).optional(),
  purchases: z.array(InvoiceSchema).optional(),
  referenceDate: z.string().optional(),
  taxRegime: z.string().optional()
});

const FactoringOffersRequestSchema = z.object({
  sales: z.array(InvoiceSchema)
});

export function getTaxSummaryLogic(
  salesHistory: any[] = [], 
  purchasesHistory: any[] = [], 
  referenceDate: Date = new Date(),
  taxRegime?: string
) {
  if (!salesHistory || salesHistory.length < 3) return null;
  return calculateTaxesSync(salesHistory, purchasesHistory, {
    taxRegime,
    referenceDate
  });
}

function generateLoanOffersLogic(taxSummary: any, isFinanceCertified = false) {
  const avgMonthlySales = taxSummary?.avgMonthlySales || 0;
  const offers = [];

  if (avgMonthlySales >= 3000) {
    const baseRate = 0.035;
    let multiplier = 0.8;
    if (isFinanceCertified) multiplier *= 1.1;

    offers.push({
      partner: mockPartners[0],
      maxAmount: avgMonthlySales * multiplier,
      monthlyInterestRate: baseRate,
      termInMonths: 12,
    });
  }

  if (avgMonthlySales >= 10000) {
    const baseRate = 0.025;
    let multiplier = 1.2;
    if (isFinanceCertified) multiplier *= 1.15;

    offers.push({
      partner: mockPartners[1],
      maxAmount: avgMonthlySales * multiplier,
      monthlyInterestRate: baseRate,
      termInMonths: 24,
    });
  }

  if (avgMonthlySales >= 25000) {
    const baseRate = 0.018;
    let multiplier = 2.0;
    if (isFinanceCertified) multiplier *= 1.2;

    offers.push({
      partner: mockPartners[2],
      maxAmount: avgMonthlySales * multiplier,
      monthlyInterestRate: baseRate,
      termInMonths: 36,
    });
  }

  return offers.map(offer => ({
    ...offer,
    maxAmount: Math.floor(offer.maxAmount / 100) * 100,
    monthlyInterestRate: Number(offer.monthlyInterestRate.toFixed(4))
  })).sort((a, b) => b.maxAmount - a.maxAmount);
}

// 1. POST /credit/calculate-tax-health
router.post('/calculate-tax-health', (req, res) => {
  try {
    const parsed = CalculateTaxHealthRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
    }

    const sales = parsed.data.sales || [];
    const purchases = parsed.data.purchases || [];
    const refDate = parsed.data.referenceDate ? new Date(parsed.data.referenceDate) : new Date();
    const taxSummary = getTaxSummaryLogic(sales, purchases, refDate, parsed.data.taxRegime);
    res.json({ success: true, taxSummary });
  } catch (err: any) {
    logger.error('[Credit Router] Error en calculate-tax-health:', {}, err);
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// 2. POST /credit/loan-offers
router.post('/loan-offers', (req, res) => {
  try {
    const taxSummary = req.body.taxSummary || req.body.scoreResult;
    const isFinanceCertified = req.body.isFinanceCertified;
    const offers = generateLoanOffersLogic(taxSummary, isFinanceCertified);
    res.json({ success: true, offers });
  } catch (err: any) {
    logger.error('[Credit Router] Error en loan-offers:', {}, err);
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// 3. POST /credit/factoring-offers
router.post('/factoring-offers', (req, res) => {
  try {
    const parsed = FactoringOffersRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
    }
    
    const { sales } = parsed.data;
    const eligibleInvoices = sales.filter(s => s.documentType === 'FACTURA' && s.totalAmount > 500);
    const offers: any[] = [];
    
    eligibleInvoices.forEach(inv => {
      mockPartners.slice(0, 2).forEach(partner => {
        offers.push({
          id: crypto.randomUUID(),
          invoiceId: inv.id,
          partner,
          advancePercentage: partner.id === 'fintech_a' ? 0.85 : 0.90,
          feePercentage: partner.id === 'fintech_a' ? 0.03 : 0.025,
          netAmount: inv.totalAmount * (partner.id === 'fintech_a' ? 0.85 : 0.90) * (1 - (partner.id === 'fintech_a' ? 0.03 : 0.025))
        });
      });
    });

    res.json({ success: true, offers });
  } catch (err: any) {
    logger.error('[Credit Router] Error en factoring-offers:', {}, err);
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

export default router;
