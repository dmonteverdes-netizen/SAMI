import type { Invoice, TaxSummary, LoanOffer, TaxRegime } from '../types/types';
import { api } from './api';
import { calculateTaxesSync } from './accountingService';

const DEMO_PARTNERS = [
  { id: 'fintech_a', name: 'Fintech Veloz', logoUrl: 'https://placehold.co/100x40/007bff/ffffff?text=Veloz' },
  { id: 'caja_b', name: 'Caja Confianza', logoUrl: 'https://placehold.co/100x40/28a745/ffffff?text=Confianza' },
  { id: 'banco_c', name: 'Banco ProMYPE', logoUrl: 'https://placehold.co/100x40/ffc107/000000?text=ProMYPE' },
];

/**
 * Consolida el expediente de información tributaria de la MYPE a partir de sus comprobantes de venta y compra.
 * IMPORTANTE: SAMI NO es una agencia de calificación de riesgo ni calcula puntajes/scores.
 * SAMI consolida y transmite la información tributaria ordenada para que las entidades financieras aliadas
 * evalúen la solicitud de crédito con sus propios modelos de riesgo.
 * 
 * @param salesHistory Array de comprobantes de ventas emitidos.
 * @param purchasesHistory Array de comprobantes de compras.
 * @param referenceDate Fecha de referencia opcional para calcular complianceStatus.
 * @param taxRegime Régimen tributario opcional de la MYPE.
 * @returns Promesa con el resumen consolidado de información tributaria.
 */
export const getTaxFinancialSummary = async (
    salesHistory: Invoice[] = [],
    purchasesHistory: Invoice[] = [],
    referenceDate: Date = new Date(),
    taxRegime?: TaxRegime | string
): Promise<TaxSummary | null> => {
    try {
        if (!salesHistory || salesHistory.length < 3) return null;

        const response = await api.post('/credit/calculate-tax-health', {
            sales: salesHistory,
            purchases: purchasesHistory,
            referenceDate: referenceDate.toISOString(),
            taxRegime
        });

        const result: TaxSummary = response.data.taxSummary;
        return result;
    } catch (err: any) {
        // Fallback local canonical calculation if offline/demo
        return calculateTaxesSync(salesHistory, purchasesHistory, {
            taxRegime,
            referenceDate
        });
    }
};

export const calculateTaxHealth = getTaxFinancialSummary;

/**
 * Consulta ofertas de crédito de entidades financieras aliadas
 * basadas en las ventas mensuales consolidadas y el cumplimiento tributario.
 * 
 * @param taxSummary Resumen tributario consolidado.
 * @param isFinanceCertified Indica si la MYPE completó módulos de educación financiera.
 * @returns Promesa con ofertas de crédito enviadas por bancos y fintechs aliadas.
 */
export const generateLoanOffers = async (
    taxSummary: TaxSummary,
    isFinanceCertified: boolean = false
): Promise<LoanOffer[]> => {
    try {
        const response = await api.post('/credit/loan-offers', {
            taxSummary,
            isFinanceCertified
        });
        return response.data.offers || [];
    } catch (err) {
        console.error('[SAMI API Gateway] Error al consultar ofertas de crédito:', err);
        return [];
    }
};

/**
 * Descripciones informativas sobre el expediente tributario para la MYPE.
 */
export const getTaxSummaryDescription = (summary: TaxSummary): string => {
    if (summary.avgMonthlySales >= 20000) {
        return 'Consistencia de facturación alta con ventas sobre S/ 20,000/mes. Apto para líneas de crédito MYPE preferenciales.';
    } else if (summary.avgMonthlySales >= 5000) {
        return 'Registro continuo de comprobantes electrónicos con flujo comercial estable. Apto para capital de trabajo y factoring.';
    } else {
        return 'Historial tributario inicial. Registra más ventas y compras formales para aumentar la capacidad ofertada por bancos aliados.';
    }
};
