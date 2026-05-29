
import type { AdminDashboardData, PartnerPerformance, PartnerFinancialInstitution } from '../types';
import { maskAdminKpis, maskPartnerPerformance } from './dataMaskingService';

// --- Environment Simulation ---
// In a real build process, this would be `process.env.NODE_ENV !== 'production'`.
// We set it to true here to demonstrate the data masking functionality.
const IS_DEVELOPMENT_ENVIRONMENT = true;

// Mock data that would exist in other services or a database
const mockPartners: PartnerFinancialInstitution[] = [
    { 
        id: 'fintech_a', 
        name: 'Fintech Veloz', 
        logoUrl: 'https://placehold.co/100x40/007bff/ffffff?text=Veloz',
        contactEmail: 'atencion@veloz.com',
        contactPhone: '+51 912 345 678'
    },
    { 
        id: 'caja_b', 
        name: 'Caja Confianza', 
        logoUrl: 'https://placehold.co/100x40/28a745/ffffff?text=Confianza',
        contactEmail: 'convenios@confianza.com',
        contactPhone: '+51 988 776 554'
    },
    { 
        id: 'banco_c', 
        name: 'Banco ProMYPE', 
        logoUrl: 'https://placehold.co/100x40/ffc107/000000?text=ProMYPE',
        contactEmail: 'negocios@promype.com',
        contactPhone: '+51 1 200 4000'
    },
];

/**
 * Fetches and calculates the main KPIs for the Admin Dashboard.
 * In a real application, this would execute SQL queries against a data warehouse.
 */
export const getAdminDashboardData = async (startDate?: string, endDate?: string): Promise<AdminDashboardData> => {
    // Dynamic calculation simulation based on ecosystem state
    const baseMypes = 820;
    const growthSinceLastSync = Math.floor(Math.random() * 15);
    const currentMypes = baseMypes + growthSinceLastSync;
    const mrrPerMype = 23.5; 
    
    // Calculate conversion from partner performance
    const partnersPerformance = await getPartnerPerformanceData(startDate, endDate);
    const totalOffers = partnersPerformance.reduce((acc, p) => acc + p.offersSent, 0);
    const totalDisbursed = partnersPerformance.reduce((acc, p) => acc + p.loansDisbursed, 0);
    const globalConversion = totalOffers > 0 ? totalDisbursed / totalOffers : 0;

    const rawKpiData: AdminDashboardData = {
        mrr: { 
            value: currentMypes * mrrPerMype, 
            trend: 0.042 // +4.2% month over month
        },
        mrrHistory: [
            { month: 'Dic', value: 8200 },
            { month: 'Ene', value: 11500 },
            { month: 'Feb', value: 13800 },
            { month: 'Mar', value: 16200 },
            { month: 'Abr', value: 19500 },
            { month: 'May', value: currentMypes * mrrPerMype }
        ],
        creditConversionRate: { 
            value: globalConversion, 
            trend: 0.015 
        },
        churnRate: { 
            value: 0.028, 
            trend: -0.005 // churn is decreasing
        },
        portfolioRisk: { 
            value: 0.185, 
            trend: 0.002 
        },
        growthPipeline: {
            totalGoal: 1000,
            activeCount: currentMypes,
            inQueueCount: 245 - growthSinceLastSync,
            onboardingCount: 12 + Math.floor(Math.random() * 3),
            graduatedCount: 85
        }
    };

    // Simulate network delay
    await new Promise(res => setTimeout(res, 500));
    
    // Apply masking if in a non-production environment
    if (IS_DEVELOPMENT_ENVIRONMENT) {
        return maskAdminKpis(rawKpiData);
    }

    return rawKpiData;
};

/**
 * Fetches performance data for financial partners.
 */
export const getPartnerPerformanceData = async (startDate?: string, endDate?: string): Promise<PartnerPerformance[]> => {
    let daysMultiplier = 1.0;
    if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : new Date('2026-01-01');
        const end = endDate ? new Date(endDate) : new Date('2026-05-26');
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        // Assume default mock data represents roughly a standard 120-day period
        daysMultiplier = Math.max(0.01, diffDays / 120);
    }

    const rawPerformanceData: PartnerPerformance[] = [
        {
            partner: mockPartners[2], // Banco ProMYPE
            offersSent: Math.round(120 * daysMultiplier),
            loansDisbursed: Math.round(45 * daysMultiplier),
            conversionRate: 45/120,
            historicalCredits: [
                { month: 'Mar', value: Math.round(12 * daysMultiplier) },
                { month: 'Abr', value: Math.round(15 * daysMultiplier) },
                { month: 'May', value: Math.round(18 * daysMultiplier) },
            ],
            lastActive: 'Hace 5 min',
            isOnline: true,
        },
        {
            partner: mockPartners[1], // Caja Confianza
            offersSent: Math.round(350 * daysMultiplier),
            loansDisbursed: Math.round(80 * daysMultiplier),
            conversionRate: 80/350,
            historicalCredits: [
                { month: 'Mar', value: Math.round(22 * daysMultiplier) },
                { month: 'Abr', value: Math.round(27 * daysMultiplier) },
                { month: 'May', value: Math.round(31 * daysMultiplier) },
            ],
            lastActive: 'Hace 2 h',
            isOnline: true,
        },
        {
            partner: mockPartners[0], // Fintech Veloz
            offersSent: Math.round(800 * daysMultiplier),
            loansDisbursed: Math.round(110 * daysMultiplier),
            conversionRate: 110/800,
            historicalCredits: [
                { month: 'Mar', value: Math.round(30 * daysMultiplier) },
                { month: 'Abr', value: Math.round(38 * daysMultiplier) },
                { month: 'May', value: Math.round(42 * daysMultiplier) },
            ],
            lastActive: 'Hace 1 d',
            isOnline: false,
        },
    ];

    // Re-verify exact dynamic conversion rate
    rawPerformanceData.forEach(p => {
        if (p.offersSent > 0) {
            p.conversionRate = p.loansDisbursed / p.offersSent;
        } else {
            p.loansDisbursed = 0;
            p.conversionRate = 0;
        }
    });

    rawPerformanceData.sort((a,b) => b.loansDisbursed - a.loansDisbursed);

    await new Promise(res => setTimeout(res, 500));
    
    // Apply masking if in a non-production environment
    if (IS_DEVELOPMENT_ENVIRONMENT) {
        return maskPartnerPerformance(rawPerformanceData);
    }
    
    return rawPerformanceData;
};
