
import { SimulationScenario, SimulationResult, TaxRegime } from '../types';

/**
 * Calculates taxes based on the selected regime and income.
 * Simplified for simulation purposes according to Peruvian tax rules.
 */
const calculateTaxesForRegime = (income: number, expenses: number, regime: TaxRegime): number => {
    switch (regime) {
        case 'RUS':
            // RUS has fixed categories: up to 5k -> 20, up to 8k -> 50
            if (income <= 5000) return 20;
            if (income <= 8000) return 50;
            return 50; // RUS limit is 8k usually, but for simulation we cap it
        case 'MYPE_TRIBUTARIO':
            // IGV (18%) + Income Tax (1% of net income if < 300 UIT, simplified)
            const igv = (income - expenses) * 0.18;
            const incomeTax = (income - expenses) * 0.01;
            return Math.max(0, igv + incomeTax);
        case 'REGIMEN_GENERAL':
            // IGV (18%) + Income Tax (1.5% of net income, simplified)
            const igvG = (income - expenses) * 0.18;
            const incomeTaxG = (income - expenses) * 0.015;
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
            taxRegime: 'MYPE_TRIBUTARIO',
            employeeCount: 0,
            avgSalary: 1025
        },
        best: {
            name: 'Mejor Escenario',
            description: 'Crecimiento del 30% en ventas y optimización del 5% en gastos.',
            monthlyIncome: avgIncome * 1.3,
            monthlyExpenses: avgExpenses * 0.95,
            taxRegime: 'MYPE_TRIBUTARIO',
            employeeCount: 0,
            avgSalary: 1025
        }
    };
};
