
import { SimulationScenario, SimulationResult, TaxRegime } from '../types/types';
import {
    IGV_RATE,
    NRUS_CAT1_MAX,
    NRUS_CAT2_MAX,
    NRUS_QUOTA_CAT1,
    NRUS_QUOTA_CAT2,
    RER_INCOME_TAX_RATE,
    RMT_INCOME_TAX_RATE,
    RG_INCOME_TAX_RATE
} from './accountingService';

/**
 * Calculates taxes based on the selected regime and income.
 * Simplified for simulation purposes according to Peruvian tax rules.
 */
const calculateTaxesForRegime = (income: number, expenses: number, regime: TaxRegime): number => {
    switch (regime) {
        case 'NRUS':
            // NRUS has fixed categories: up to 5k -> 20, up to 8k -> 50
            if (income <= NRUS_CAT1_MAX) return NRUS_QUOTA_CAT1;
            if (income <= NRUS_CAT2_MAX) return NRUS_QUOTA_CAT2;
            return NRUS_QUOTA_CAT2; // NRUS limit is 8k usually, but for simulation we cap it
        case 'RER':
            // IGV (18%) + Income Tax (1.5% of net income)
            const igvRER = (income - expenses) * IGV_RATE;
            const incomeTaxRER = (income - expenses) * RER_INCOME_TAX_RATE;
            return Math.max(0, igvRER + incomeTaxRER);
        case 'RMT':
            // IGV (18%) + Income Tax (1% of net income if < 300 UIT, simplified)
            const igv = (income - expenses) * IGV_RATE;
            const incomeTax = (income - expenses) * RMT_INCOME_TAX_RATE;
            return Math.max(0, igv + incomeTax);
        case 'RG':
            // IGV (18%) + Income Tax (1.5% of net income, simplified)
            const igvG = (income - expenses) * IGV_RATE;
            const incomeTaxG = (income - expenses) * RG_INCOME_TAX_RATE;
            return Math.max(0, igvG + incomeTaxG);
        default:
            return 0;
    }
};

/**
 * Calculates payroll costs including social security and benefits (simplified).
 */
const calculatePayrollCosts = (employeeCount: number, avgSalary: number): number => {
    if (employeeCount <= 0) return 0;
    // Salary + Essalud (9%) + Gratifications/CTS (approx 16.6% + 8.33% = ~25%)
    // Total cost is roughly 1.45x the base salary in Peru for full regime
    const basePayroll = employeeCount * avgSalary;
    const socialSecurity = basePayroll * 0.09;
    const benefits = basePayroll * 0.25;
    return basePayroll + socialSecurity + benefits;
};

/**
 * Runs a financial simulation for a given scenario.
 */
export const runSimulation = (scenario: SimulationScenario): SimulationResult => {
    const payrollCosts = calculatePayrollCosts(scenario.employeeCount, scenario.avgSalary);
    const totalExpenses = scenario.monthlyExpenses + payrollCosts;
    const taxes = calculateTaxesForRegime(scenario.monthlyIncome, scenario.monthlyExpenses, scenario.taxRegime);
    
    const netProfit = scenario.monthlyIncome - totalExpenses - taxes;
    
    return {
        scenarioName: scenario.name,
        netProfit,
        totalTaxes: taxes,
        payrollCosts,
        liquidity: netProfit // In this simplified model, liquidity is net profit
    };
};

/**
 * Generates "Worst Case" and "Best Case" scenarios based on historical data.
 */
export const generateHistoricalScenarios = (avgIncome: number, avgExpenses: number): { worst: SimulationScenario, best: SimulationScenario } => {
    return {
        worst: {
            name: 'Peor Escenario',
            description: 'Caída del 20% en ventas y aumento del 10% en gastos operativos.',
            monthlyIncome: avgIncome * 0.8,
            monthlyExpenses: avgExpenses * 1.1,
            taxRegime: 'RMT',
            employeeCount: 0,
            avgSalary: 1025
        },
        best: {
            name: 'Mejor Escenario',
            description: 'Crecimiento del 30% en ventas y optimización del 5% en gastos.',
            monthlyIncome: avgIncome * 1.3,
            monthlyExpenses: avgExpenses * 0.95,
            taxRegime: 'RMT',
            employeeCount: 0,
            avgSalary: 1025
        }
    };
};
