
import type { 
    Invoice, 
    Vendor, 
    PaymentAlert, 
    CostOptimizationReport, 
    CostOptimizationItem,
    FactoringOffer,
    PartnerFinancialInstitution
} from '../types';
import { InvoiceType, DocumentType } from '../types';

const mockPartners: PartnerFinancialInstitution[] = [
    { id: 'fintech_a', name: 'Fintech Veloz', logoUrl: 'https://placehold.co/100x40/007bff/ffffff?text=Veloz' },
    { id: 'caja_b', name: 'Caja Confianza', logoUrl: 'https://placehold.co/100x40/28a745/ffffff?text=Confianza' },
    { id: 'banco_c', name: 'Banco ProMYPE', logoUrl: 'https://placehold.co/100x40/ffc107/000000?text=ProMYPE' },
];

/**
 * Identifies recurring vendors from purchase history.
 */
export const identifyRecurringVendors = (purchases: Invoice[]): Vendor[] => {
    const vendorCounts: { [ruc: string]: { name: string, count: number } } = {};
    
    purchases.forEach(p => {
        if (p.ruc) {
            if (!vendorCounts[p.ruc]) {
                vendorCounts[p.ruc] = { name: `Proveedor ${p.ruc}`, count: 0 };
            }
            vendorCounts[p.ruc].count += 1;
        }
    });

    return Object.entries(vendorCounts)
        .filter(([_, data]) => data.count >= 2)
        .map(([ruc, data]) => ({
            id: ruc,
            name: data.name,
            ruc,
            category: 'General',
            isKeyVendor: data.count >= 4
        }));
};

/**
 * Generates a cost optimization report.
 */
export const generateCostOptimizationReport = (purchases: Invoice[], cashFlowStatus: 'healthy' | 'tight' | 'critical'): CostOptimizationReport => {
    const vendorTotals: { [ruc: string]: { name: string, total: number, count: number } } = {};
    
    purchases.forEach(p => {
        if (p.ruc) {
            if (!vendorTotals[p.ruc]) {
                vendorTotals[p.ruc] = { name: `Proveedor ${p.ruc}`, total: 0, count: 0 };
            }
            vendorTotals[p.ruc].total += p.totalAmount;
            vendorTotals[p.ruc].count += 1;
        }
    });

    const items: CostOptimizationItem[] = Object.entries(vendorTotals)
        .filter(([_, data]) => data.count >= 2)
        .map(([_, data]) => {
            const suggestedDiscount = 0.02; // 2% standard early payment discount
            return {
                vendorName: data.name,
                recurringAmount: data.total / data.count,
                frequency: 'Mensual',
                suggestedDiscount,
                potentialSavings: (data.total / data.count) * suggestedDiscount,
                reason: 'Proveedor recurrente detectado. Sugerimos negociar descuento por pronto pago.'
            };
        });

    return {
        items,
        totalPotentialSavings: items.reduce((acc, item) => acc + item.potentialSavings, 0),
        cashFlowStatus
    };
};

/**
 * Generates factoring offers for accounts receivable (Sales).
 */
export const generateFactoringOffers = (sales: Invoice[]): FactoringOffer[] => {
    // Only consider Facturas (B2B) for factoring
    const eligibleInvoices = sales.filter(s => s.documentType === DocumentType.FACTURA && s.totalAmount > 500);
    
    const offers: FactoringOffer[] = [];
    
    eligibleInvoices.forEach(inv => {
        // Generate 1-2 offers per invoice
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

    return offers;
};
