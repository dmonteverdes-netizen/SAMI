
import type { Invoice, SamiScoreResult, LoanOffer, PartnerFinancialInstitution } from '../types';
import { DocumentType } from '../types';

// --- Mock Partner Data ---
const mockPartners: PartnerFinancialInstitution[] = [
    { id: 'fintech_a', name: 'Fintech Veloz', logoUrl: 'https://placehold.co/100x40/007bff/ffffff?text=Veloz' },
    { id: 'caja_b', name: 'Caja Confianza', logoUrl: 'https://placehold.co/100x40/28a745/ffffff?text=Confianza' },
    { id: 'banco_c', name: 'Banco ProMYPE', logoUrl: 'https://placehold.co/100x40/ffc107/000000?text=ProMYPE' },
];

/**
 * Calculates a "SAMI Score" based on sales history.
 * @param salesHistory Array of sales invoices.
 * @returns A SamiScoreResult object or null if data is insufficient.
 */
export const calculateSamiScore = (salesHistory: Invoice[]): SamiScoreResult | null => {
    // Need at least 3 months of data for a meaningful analysis
    if (salesHistory.length < 5) return null;

    // 1. Group sales by month
    const monthlySales: { [key: string]: number } = {};
    salesHistory.forEach(inv => {
        const month = inv.issueDate.substring(0, 7); // YYYY-MM
        if (!monthlySales[month]) monthlySales[month] = 0;
        monthlySales[month] += inv.totalAmount;
    });

    const months = Object.keys(monthlySales).sort();
    if (months.length < 3) return null; // Ensure we have at least 3 distinct months
    
    const monthlyTotals = months.map(m => monthlySales[m]);

    // 2. Calculate Metrics
    const totalSales = monthlyTotals.reduce((a, b) => a + b, 0);
    const avgMonthlySales = totalSales / monthlyTotals.length;

    // --- A. Income Stability Analysis (Refined Volatility Analysis) ---
    // Calculates volatility via Coefficient of Variation (CV)
    const mean = avgMonthlySales;
    const stdDev = Math.sqrt(monthlyTotals.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / monthlyTotals.length);
    const volatilityIndex = mean > 0 ? stdDev / mean : 1; 
    
    // Consistency Factor: Ratio of months with significant sales vs total months
    const activeMonths = monthlyTotals.filter(val => val > (avgMonthlySales * 0.1)).length;
    const consistencyFactor = activeMonths / monthlyTotals.length;

    // Final Stability Score combines low volatility and high consistency
    const stabilityScore = Math.max(0, 100 * (1 - (volatilidadIndexToPenalty(volatilityIndex)))) * consistencyFactor;

    // Helper to map volatility to a penalty (non-linear to favor stable businesses)
    function volatilidadIndexToPenalty(v: number) {
        if (v < 0.15) return v * 0.5; // Very stable
        if (v < 0.40) return v;       // Normal market variation
        return v * 1.5;               // High volatility penalty
    }

    // --- B. Income Growth Analysis (Refined Trend Analysis) ---
    // 1. Long-term trend: Simple linear regression slope
    let regressionSlope = 0;
    if (monthlyTotals.length > 1) {
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        monthlyTotals.forEach((y, i) => {
            sumX += i;
            sumY += y;
            sumXY += i * y;
            sumX2 += i * i;
        });
        const n = monthlyTotals.length;
        regressionSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }
    const normalizedSlope = mean > 0 ? regressionSlope / mean : 0;

    // 2. Short-term momentum: Compare recent performance vs historical average
    const recentAvg = monthlyTotals.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const momentumFactor = mean > 0 ? (recentAvg / mean) : 1;

    // Growth Score combines the regression slope with recent momentum
    // (50 is baseline for 0 growth, >50 is growing, <50 is declining)
    const growthScore = Math.max(0, Math.min(100, 
        (50 + (normalizedSlope * 150)) * 0.7 + (momentumFactor * 30)
    ));

    // Formality Score (percentage of sales made with Factura)
    const facturasCount = salesHistory.filter(inv => inv.documentType === DocumentType.FACTURA).length;
    const formalityScore = (facturasCount / salesHistory.length) * 100;

    // 3. Combine into SAMI Score (Weighted components)
    // Weights: Stability 45%, Growth 35%, Formality 20%
    const weightedScore = (stabilityScore * 0.45) + (growthScore * 0.35) + (formalityScore * 0.20);
    const samiScore = 300 + (weightedScore * 5.5); // Scale to 300-850 range

    let tier: SamiScoreResult['tier'] = 'Necesita Mejora';
    if (samiScore > 720) tier = 'Excelente';
    else if (samiScore > 650) tier = 'Bueno';
    else if (samiScore > 550) tier = 'Regular';

    return {
        score: Math.round(samiScore),
        tier,
        analysis: {
            stability: Math.round(stabilityScore),
            growth: Math.round(growthScore),
            formality: Math.round(formalityScore),
        },
        avgMonthlySales: Math.round(avgMonthlySales),
    };
};


/**
 * Generates simulated loan offers based on the SAMI Score.
 * Offering better rates and higher amounts for higher scores.
 * @param scoreResult The result from calculateSamiScore.
 * @param isFinanceCertified Whether the user has completed finance courses.
 * @returns An array of LoanOffer objects sorted by maxAmount descending.
 */
export const generateLoanOffers = (scoreResult: SamiScoreResult, isFinanceCertified: boolean = false): LoanOffer[] => {
    const { score, avgMonthlySales } = scoreResult;
    const offers: LoanOffer[] = [];

    // Partner A: Fintech Veloz (Agile, more accessible)
    // Accessible from score 500
    if (score >= 500) {
        // Rate decreases as score increases (range: ~3.5% to ~7%)
        const baseRate = 0.07;
        let rateReduction = Math.min(0.035, (score - 500) * 0.0001);
        
        // Multiplier increases as score increases (range: 0.5x to 1.5x)
        let multiplier = 0.5 + Math.min(1.0, (score - 500) * 0.003);

        if (isFinanceCertified) {
            rateReduction += 0.005; // Extra 0.5% off
            multiplier *= 1.1; // 10% extra amount
        }
        
        offers.push({
            partner: mockPartners[0],
            maxAmount: avgMonthlySales * multiplier,
            monthlyInterestRate: Math.max(0.01, baseRate - rateReduction),
            termInMonths: score > 650 ? 18 : 12,
        });
    }

    // Partner B: Caja Confianza (Regional bank, medium requirements)
    // Accessible from score 620
    if (score >= 620) {
        // Rate range: ~2.5% to ~4%
        const baseRate = 0.04;
        let rateReduction = Math.min(0.015, (score - 620) * 0.0001);
        
        // Multiplier: 0.8x to 2.0x
        let multiplier = 0.8 + Math.min(1.2, (score - 620) * 0.004);

        if (isFinanceCertified) {
            rateReduction += 0.003; // Extra 0.3% off
            multiplier *= 1.15; // 15% extra amount
        }
        
        offers.push({
            partner: mockPartners[1],
            maxAmount: avgMonthlySales * multiplier,
            monthlyInterestRate: Math.max(0.01, baseRate - rateReduction),
            termInMonths: score > 700 ? 36 : 24,
        });
    }

    // Partner C: Banco ProMYPE (Corporate/Large Bank, strict requirements)
    // Accessible from score 720
    if (score >= 720) {
        // Rate range: ~1.2% to ~2.2%
        const baseRate = 0.022;
        let rateReduction = Math.min(0.01, (score - 720) * 0.0001);
        
        // Multiplier: 1.5x to 4.0x
        let multiplier = 1.5 + Math.min(2.5, (score - 720) * 0.008);

        if (isFinanceCertified) {
            rateReduction += 0.002; // Extra 0.2% off
            multiplier *= 1.2; // 20% extra amount
        }
        
        offers.push({
            partner: mockPartners[2],
            maxAmount: avgMonthlySales * multiplier,
            monthlyInterestRate: Math.max(0.01, baseRate - rateReduction),
            termInMonths: score > 800 ? 48 : 36,
        });
    }

    return offers.map(offer => ({
        ...offer,
        maxAmount: Math.floor(offer.maxAmount / 100) * 100, // Round down to nearest 100
    })).sort((a, b) => b.maxAmount - a.maxAmount);
};
