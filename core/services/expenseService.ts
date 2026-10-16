import type { 
    Invoice, 
    Vendor, 
    CostOptimizationReport, 
    FactoringOffer
} from '../types/types';
import { api } from './api';

export const identifyRecurringVendorsSync = (purchases: Invoice[]): Vendor[] => {
    const map = new Map<string, { ruc: string; name: string; count: number; total: number }>();
    purchases.forEach(p => {
        if (!p.ruc) return;
        const name = (p as any).supplierName || (p as any).clientOrSupplierName || p.ruc;
        const existing = map.get(p.ruc) || { ruc: p.ruc, name, count: 0, total: 0 };
        existing.count += 1;
        existing.total += p.totalAmount || 0;
        map.set(p.ruc, existing);
    });
    return Array.from(map.values()).map(v => ({
        id: v.ruc,
        ruc: v.ruc,
        name: v.name,
        category: 'General',
        isKeyVendor: v.count > 1
    }));
};

export const generateCostOptimizationReportSync = (
    purchases: Invoice[], 
    cashFlowStatus: 'healthy' | 'tight' | 'critical'
): CostOptimizationReport => {
    const totalPotentialSavings = purchases.reduce((acc, p) => acc + (p.totalAmount * 0.05), 0);
    return {
        items: [],
        totalPotentialSavings,
        cashFlowStatus
    };
};

/**
 * Identifies recurring vendors from purchase history asynchronously.
 */
export const identifyRecurringVendors = async (purchases: Invoice[]): Promise<Vendor[]> => {
    try {
        const response = await api.post('/expenses/recurring-vendors', { purchases });
        return response.data.vendors;
    } catch (err: any) {
        console.error('[SAMI API Gateway Exception] Failed to identify recurring vendors:', err);
        return [];
    }
};

/**
 * Generates a cost optimization report asynchronously.
 */
export const generateCostOptimizationReport = async (
    purchases: Invoice[], 
    cashFlowStatus: 'healthy' | 'tight' | 'critical'
): Promise<CostOptimizationReport> => {
    try {
        const response = await api.post('/expenses/cost-report', { purchases, cashFlowStatus });
        return response.data.report;
    } catch (err: any) {
        console.error('[SAMI API Gateway Exception] Failed to generate cost report:', err);
        return {
            items: [],
            totalPotentialSavings: 0,
            cashFlowStatus
        };
    }
};

/**
 * Generates factoring offers for accounts receivable (Sales) asynchronously.
 */
export const generateFactoringOffers = async (sales: Invoice[]): Promise<FactoringOffer[]> => {
    try {
        const response = await api.post('/credit/factoring-offers', { sales });
        return response.data.offers;
    } catch (err: any) {
        console.error('[SAMI API Gateway Exception] Failed to generate factoring offers:', err);
        return [];
    }
};
