import React from 'react';
import type { TaxSummary } from '../../types';
import { ShieldCheck, FileCheck, TrendingUp, Building2, Receipt, Info } from 'lucide-react';

interface TaxSummaryCardProps {
  summary?: TaxSummary | null;
  scoreResult?: TaxSummary | null; // Backwards compatibility
}

export const TaxSummaryCard: React.FC<TaxSummaryCardProps> = ({ summary, scoreResult }) => {
  const data = summary || scoreResult;

  // Sin valores inventados: si no hay datos se muestra 0 / "Sin datos".
  const avgSales = data?.avgMonthlySales ?? 0;
  const avgPurchases = data?.avgMonthlyPurchases ?? 0;
  const verifiedCount = data?.verifiedInvoicesCount ?? 0;
  const formality = data?.formalityRatio ?? 0;
  // Dato derivado de registros en SAMI, no verificado por SUNAT (AGENTS.md §3).
  const status = data?.complianceStatus || 'Sin datos';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Información Tributaria Consolidada
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Derivado de comprobantes registrados en SAMI — no verificado por SUNAT
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 rounded-full text-xs font-extrabold">
          Registros SAMI: {status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
            Ventas Declaradas / Mes
          </span>
          <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
            S/ {avgSales.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
            Compras Registradas / Mes
          </span>
          <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
            S/ {avgPurchases.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
            Comprobantes Verificados
          </span>
          <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
            {verifiedCount} docs
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
            Formalidad Electrónica
          </span>
          <span className="font-mono font-black text-lg text-blue-600 dark:text-blue-400">
            {formality}% RVIE/RSE
          </span>
        </div>
      </div>

      <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 p-3.5 rounded-2xl flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
        <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          <strong>Transmisión Neutral:</strong> SAMI consolida tus comprobantes electrónicos y los transmite de forma segura a entidades financieras aliadas. Las instituciones financieras evalúan directamente la aprobación de crédito según sus políticas internas.
        </p>
      </div>
    </div>
  );
};

export const TaxHealthGauge = TaxSummaryCard;
export default TaxSummaryCard;
