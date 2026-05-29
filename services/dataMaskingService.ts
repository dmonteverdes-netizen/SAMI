
import type { AdminDashboardData, PartnerPerformance } from '../types';

/**
 * Masks a Peruvian RUC number.
 * Keeps the first 4 and last 3 digits.
 * Example: 20601234567 -> 2060****567
 * @param ruc The RUC string to mask.
 * @returns The masked RUC string.
 */
export const maskRuc = (ruc: string): string => {
    if (!ruc || ruc.length !== 11) {
        return 'RUC_INVALIDO';
    }
    return `${ruc.substring(0, 4)}****${ruc.substring(8)}`;
};


/**
 * Masks a financial amount by applying a random deviation.
 * This makes the number inaccurate but keeps it in a plausible range for testing UI.
 * @param amount The original amount.
 * @returns A slightly modified amount.
 */
export const maskAmount = (amount: number): number => {
    const deviation = (Math.random() - 0.5) * 0.2; // +/- 10%
    const masked = amount * (1 + deviation);
    return parseFloat(masked.toFixed(2));
};


/**
 * Masks a partner name to a generic identifier.
 * @param name The original partner name.
 * @param id The partner's unique ID.
 * @returns A generic partner name.
 */
export const maskPartnerName = (id: string): string => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const letter = String.fromCharCode(65 + (hash % 26)); // A-Z
    return `Partner Financiero ${letter}`;
}

/**
 * Applies masking to the entire Admin KPI data object.
 * @param data The real AdminDashboardData object.
 * @returns A new object with masked values.
 */
export const maskAdminKpis = (data: AdminDashboardData): AdminDashboardData => ({
    ...data,
    mrr: {
        ...data.mrr,
        value: maskAmount(data.mrr.value)
    },
    mrrHistory: data.mrrHistory.map(h => ({ ...h, value: maskAmount(h.value) })),
    churnRate: {
        ...data.churnRate,
        value: maskAmount(data.churnRate.value)
    },
    growthPipeline: {
        ...data.growthPipeline,
        activeCount: Math.floor(maskAmount(data.growthPipeline.activeCount))
    }
});


/**
 * Applies masking to the Partner Performance data array.
 * @param data Array of real PartnerPerformance objects.
 * @returns A new array with masked partner data.
 */
export const maskPartnerPerformance = (data: PartnerPerformance[]): PartnerPerformance[] => {
    return data.map(p => ({
        ...p,
        partner: {
            ...p.partner,
            name: maskPartnerName(p.partner.id),
        },
        offersSent: Math.round(maskAmount(p.offersSent)),
        loansDisbursed: Math.round(maskAmount(p.loansDisbursed)),
    }));
};
