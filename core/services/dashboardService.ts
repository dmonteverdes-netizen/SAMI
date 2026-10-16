import type { Invoice, DashboardData, ProactiveInsight } from '../types/types';
import { getTaxFinancialSummary, generateLoanOffers } from './creditService';
import { DocumentType } from '../types/types';

function getMonthName(monthNumber: number) {
  const date = new Date();
  date.setMonth(monthNumber - 1);
  return date.toLocaleString('es-ES', { month: 'long' });
}

export const getDashboardData = async (sales: Invoice[], purchases: Invoice[]): Promise<DashboardData> => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  // 1. Calculate Net Cash Flow for the current month
  const monthlyIncome = sales
    .filter(s => {
      const saleDate = new Date(s.issueDate);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    })
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const monthlyExpenses = purchases
    .filter(p => {
      const purchaseDate = new Date(p.issueDate);
      return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + p.totalAmount, 0);

  // 2. Tax Status - Remit to SUNAT schedule
  const taxStatus: DashboardData['taxStatus'] = 'Al día';

  // 3. Next Due Date (remit to official SUNAT calendar based on RUC)
  const nextDueDate = { 
      date: 'Ver cronograma SUNAT según RUC', 
      description: 'Consulta el vencimiento mensual según el último dígito de tu RUC en la web de SUNAT'
  };

  // 4. Calculate Credit Capacity via Consolidated Tax Summary
  const taxSummary = await getTaxFinancialSummary(sales, purchases);
  const loanOffers = taxSummary ? await generateLoanOffers(taxSummary) : [];
  const maxLoanAmount = loanOffers.reduce((max, offer) => Math.max(max, offer.maxAmount), 0);

  // 5. Generate Proactive Insights
  const insights: ProactiveInsight[] = [];
  
  // Insight: Compare current month's expenses to last month's
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const yearForLastMonth = lastMonth === 11 ? now.getFullYear() - 1 : now.getFullYear();
  const expensesLastMonth = purchases
    .filter(p => {
        const d = new Date(p.issueDate);
        return d.getMonth() === lastMonth && d.getFullYear() === yearForLastMonth;
    })
    .reduce((sum, p) => sum + p.totalAmount, 0);

  if (monthlyExpenses > 0 && expensesLastMonth > 0) {
      const pctChange = ((monthlyExpenses - expensesLastMonth) / expensesLastMonth) * 100;
      if (pctChange > 15) {
          insights.push({
              id: 'expense_increase',
              text: `Tus gastos en proveedores subieron un ${pctChange.toFixed(0)}% este mes comparado con ${getMonthName(lastMonth+1)}. ¡Revisa tus márgenes!`,
              type: 'warning'
          });
      }
  }

  // Insight: Formality of sales
  const facturasCount = sales.filter(s => s.documentType === DocumentType.FACTURA).length;
  const boletasCount = sales.filter(s => s.documentType === DocumentType.BOLETA).length;
  if (sales.length > 5 && boletasCount > facturasCount * 2) {
       insights.push({
          id: 'formality_check',
          text: 'La mayoría de tus ventas son con boleta. Emitir más facturas a empresas podría abrirte a clientes más grandes y mejorar las ofertas de las entidades bancarias aliadas.',
          type: 'info'
      });
  }

  return {
    netCashFlow: {
      income: monthlyIncome,
      expenses: monthlyExpenses,
    },
    taxStatus,
    nextDueDate,
    taxSummary,
    maxLoanAmount,
    insights
  };
};
