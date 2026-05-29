import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice, InvoiceType, DocumentType } from '../types';
import { 
  Calculator, 
  Percent, 
  FileText, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Search, 
  Clock, 
  TrendingUp,
  AlertCircle,
  Check,
  FileSpreadsheet,
  Layers,
  Sparkles
} from 'lucide-react';
import TermTooltip from './TermTooltip';

interface MonthlyTaxDetailProps {
  sales: Invoice[];
  purchases: Invoice[];
  selectedMonth: string;
}

export const MonthlyTaxDetail: React.FC<MonthlyTaxDetailProps> = ({ sales, purchases, selectedMonth }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'sales' | 'purchases' | 'renta' | 'checklist'>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | 'FACTURA' | 'BOLETA'>('ALL');

  // Format month name
  const monthName = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 15);
    const label = date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [selectedMonth]);

  // Filter local invoices
  const monthlySales = useMemo(() => {
    return sales.filter(s => s.issueDate && s.issueDate.startsWith(selectedMonth));
  }, [sales, selectedMonth]);

  const monthlyPurchases = useMemo(() => {
    return purchases.filter(p => p.issueDate && p.issueDate.startsWith(selectedMonth));
  }, [purchases, selectedMonth]);

  // Tax calculations
  const stats = useMemo(() => {
    let totSales = 0;
    let netSalesBase = 0;
    let igvDebit = 0;
    let salesCount = monthlySales.length;

    monthlySales.forEach(inv => {
      totSales += inv.totalAmount;
      const base = inv.totalAmount / 1.18;
      netSalesBase += base;
      igvDebit += (inv.totalAmount - base);
    });

    let totPurchases = 0;
    let igvCredit = 0;
    let igvLostFromBoletas = 0;
    let purchasesCount = monthlyPurchases.length;
    let facturaPurchasesCount = 0;
    let boletaPurchasesCount = 0;

    monthlyPurchases.forEach(inv => {
      totPurchases += inv.totalAmount;
      const base = inv.totalAmount / 1.18;
      const igvAmount = inv.totalAmount - base;

      if (inv.documentType === DocumentType.FACTURA) {
        igvCredit += igvAmount;
        facturaPurchasesCount++;
      } else {
        igvLostFromBoletas += igvAmount;
        boletaPurchasesCount++;
      }
    });

    const igvPayable = igvDebit - igvCredit;
    const uitValue = 5150; // UIT 2024
    const rmtThreshold = uitValue * 300; // 300 UIT limit for 1% rate
    
    // For RMT we use simulated monthly proxy rate 1% under 300 UIT
    const appliedRmtRate = netSalesBase <= rmtThreshold ? 0.01 : 0.015;
    const incomeTaxAdvance = netSalesBase * appliedRmtRate;

    return {
      totalSales: totSales,
      netSalesBase: netSalesBase,
      igvDebit: igvDebit,
      salesCount,
      totalPurchases: totPurchases,
      igvCredit: igvCredit,
      igvLostFromBoletas: igvLostFromBoletas,
      purchasesCount,
      facturaPurchasesCount,
      boletaPurchasesCount,
      igvPayable: igvPayable,
      appliedRmtRate,
      incomeTaxAdvance,
      uitLimit: rmtThreshold
    };
  }, [monthlySales, monthlyPurchases]);

  // Filtered lists for rendering tables
  const filteredSalesList = useMemo(() => {
    return monthlySales.filter(inv => {
      const matchSearch = 
        inv.series.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.correlative.toString().includes(searchTerm) ||
        (inv.ruc && inv.ruc.includes(searchTerm)) ||
        (inv.category && inv.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType = 
        docTypeFilter === 'ALL' ||
        (docTypeFilter === 'FACTURA' && inv.documentType === DocumentType.FACTURA) ||
        (docTypeFilter === 'BOLETA' && inv.documentType === DocumentType.BOLETA);

      return matchSearch && matchType;
    });
  }, [monthlySales, searchTerm, docTypeFilter]);

  const filteredPurchasesList = useMemo(() => {
    return monthlyPurchases.filter(inv => {
      const matchSearch = 
        inv.series.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.correlative.toString().includes(searchTerm) ||
        (inv.ruc && inv.ruc.includes(searchTerm)) ||
        (inv.category && inv.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType = 
        docTypeFilter === 'ALL' ||
        (docTypeFilter === 'FACTURA' && inv.documentType === DocumentType.FACTURA) ||
        (docTypeFilter === 'BOLETA' && inv.documentType === DocumentType.BOLETA);

      return matchSearch && matchType;
    });
  }, [monthlyPurchases, searchTerm, docTypeFilter]);

  const formatSol = (val: number) => {
    return `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700/80 shadow-sm mt-6">
      {/* Visual Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-700/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-150/40 dark:border-indigo-900/30">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-indigo-550 dark:text-indigo-400 tracking-wider">Módulo Contable SAMI</span>
              <span className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/10 dark:font-bold">
                PRO
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
              Detalle Impuestos — {monthName}
            </h3>
          </div>
        </div>

        {/* Top Badges */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-150/40 dark:border-gray-750 px-4 py-2.5 rounded-2xl">
            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wide">IGV Neto Estimado</span>
            <span className={`text-xs font-bold font-mono ${stats.igvPayable > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {formatSol(stats.igvPayable)}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-150/40 dark:border-gray-750 px-4 py-2.5 rounded-2xl">
            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wide">Renta Pago Cuenta</span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {formatSol(stats.incomeTaxAdvance)}
            </span>
          </div>
          <div className="col-span-2 md:col-span-1 bg-yellow-500/5 dark:bg-yellow-950/10 border border-yellow-200/20 dark:border-yellow-900/10 px-4 py-2.5 rounded-2xl flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <div>
              <span className="block text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wide">Vencimiento SUNAT</span>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Día 15 del mes sig.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Tabs Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pb-1 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex gap-1 overflow-x-auto max-w-full pb-1 no-scrollbar">
          {[
            { id: 'summary', name: 'Resumen General', count: null },
            { id: 'sales', name: 'Ventas (Debito IGV)', count: stats.salesCount },
            { id: 'purchases', name: 'Compras (Credito IGV)', count: stats.purchasesCount },
            { id: 'renta', name: 'Impuesto Renta (RMT)', count: null },
            { id: 'checklist', name: 'Checklist SUNAT', count: null }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSearchTerm('');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {tab.name}
                {tab.count !== null && (
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${isActive ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Context Content */}
      <div className="mt-6 mini-tab-container min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <motion.div
              key="summary-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Bento Quick Report Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Sale Performance */}
                <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-850 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Actividad de Ventas</span>
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-500/10">+ {stats.salesCount} Directas</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-400">Total Ingresos Facturados</p>
                    <p className="text-xl font-bold font-mono tracking-tight text-gray-850 dark:text-white mt-1">{formatSol(stats.totalSales)}</p>
                    <div className="border-t border-dashed border-gray-200 dark:border-gray-700/60 my-3 pt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Base Imponible:</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-200 font-mono">{formatSol(stats.netSalesBase)}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10 flex items-center gap-1.5 mt-2">
                    <Check className="w-3.5 h-3.5" />
                    <span>IGV Débito fiscal generado de {formatSol(stats.igvDebit)}</span>
                  </div>
                </div>

                {/* Purchases Deductions */}
                <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-850 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Actividad de Compras</span>
                      <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-md border border-indigo-500/10">{stats.purchasesCount} Registradas</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-400">Compras deducidas con Factura</p>
                    <p className="text-xl font-bold font-mono tracking-tight text-gray-850 dark:text-white mt-1">{formatSol(stats.totalPurchases)}</p>
                    <div className="border-t border-dashed border-gray-200 dark:border-gray-700/60 my-3 pt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Crédito Fiscal Realizado:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">{formatSol(stats.igvCredit)}</span>
                    </div>
                  </div>
                  {stats.igvLostFromBoletas > 0 ? (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/5 p-2 rounded-xl border border-amber-500/10 flex items-center gap-1.5 mt-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Perdiste {formatSol(stats.igvLostFromBoletas)} de crédito por usar Boletas.</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10 flex items-center gap-1.5 mt-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>100% de tus compras registradas con Factura, maximizando crédito fiscal.</span>
                    </div>
                  )}
                </div>

                {/* Net Balance & Compensation */}
                <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-850 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Estado de Compensación</span>
                      <span className="text-[10px] font-bold text-gray-400">Mes de {monthName.split(' ')[0]}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Compensación de IGV:</span>
                        <span className="font-bold font-mono text-gray-850 dark:text-white">
                          {stats.igvDebit > 0 ? ((stats.igvCredit / stats.igvDebit) * 100).toFixed(0) : '0'}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${stats.igvDebit > 0 ? Math.min(100, (stats.igvCredit / stats.igvDebit) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="border-t border-dashed border-gray-200 dark:border-gray-700/60 my-3 pt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>RMT Impuesto Renta (1%):</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-200 font-mono">{formatSol(stats.incomeTaxAdvance)}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/5 p-2 rounded-xl border border-indigo-500/10 flex items-center gap-1.5 mt-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Impuestos totales para el mes: {formatSol(Math.max(0, stats.igvPayable) + stats.incomeTaxAdvance)}</span>
                  </div>
                </div>
              </div>

              {/* Informational Guidance from Accounting Module */}
              <div className="bg-indigo-500/5 border border-indigo-200/20 p-5 rounded-2.5xl flex items-start gap-3.5">
                <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-850 dark:text-white">Integración directa del Módulo Contable</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-450 leading-relaxed font-semibold">
                    Esta vista sincroniza tu facturación en tiempo real con la analítica contable de SAMI FinTech. El IGV de tus ventas representa un cobro que realizas a tus clientes por encargo del Estado; compensarlo mediante compras deducibles formales reduce tu carga tributaria y mejora tu historial crediticio con los socios financieros de SAMI.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'sales' && (
            <motion.div
              key="sales-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-gray-50 dark:bg-gray-900/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-750">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por serie, correlativo, RUC o categoría..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 font-bold"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Filtrar:</span>
                  <select
                    value={docTypeFilter}
                    onChange={e => setDocTypeFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                  >
                    <option value="ALL">Todos los documentos</option>
                    <option value="FACTURA">Solo Facturas</option>
                    <option value="BOLETA">Solo Boletas</option>
                  </select>
                </div>
              </div>

              {/* Sales Table */}
              <div className="overflow-x-auto rounded-2xl border border-gray-150/60 dark:border-gray-700/50">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/40">
                  <thead className="bg-gray-50/50 dark:bg-gray-900/30">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black tracking-wider text-gray-400 uppercase">Documento / Serie</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black tracking-wider text-gray-400 uppercase">Fecha Emisión</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black tracking-wider text-gray-400 uppercase">Cliente RUC</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black tracking-wider text-gray-400 uppercase">Categoría</th>
                      <th className="px-4 py-3.5 text-right text-[10px] font-black tracking-wider text-gray-400 uppercase">Base Imponible</th>
                      <th className="px-4 py-3.5 text-right text-[10px] font-black tracking-wider text-gray-400 uppercase">IGV Débito (18%)</th>
                      <th className="px-4 py-3.5 text-right text-[10px] font-black tracking-wider text-gray-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/30 text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {filteredSalesList.length > 0 ? (
                      filteredSalesList.map(item => {
                        const base = item.totalAmount / 1.18;
                        const igv = item.totalAmount - base;
                        return (
                          <tr key={item.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-750/10">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className={`text-[10px] font-black ${item.documentType === DocumentType.FACTURA ? 'text-indigo-600' : 'text-gray-500'}`}>
                                  {item.documentType === DocumentType.FACTURA ? 'FACTURA' : 'BOLETA'}
                                </span>
                                <span className="font-bold text-gray-800 dark:text-white font-mono mt-0.5">
                                  {item.series}-{String(item.correlative).padStart(6, '0')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">{item.issueDate}</td>
                            <td className="px-4 py-3 font-mono text-[11px]">
                              {item.ruc ? item.ruc : <span className="text-gray-450 italic">Sin especificar (Usuario final)</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="capitalize px-2 py-0.5 text-[10px] font-bold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {item.category || 'Venta general'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-500 dark:text-gray-400">{formatSol(base)}</td>
                            <td className="px-4 py-3 text-right font-mono text-indigo-550 dark:text-indigo-400">{formatSol(igv)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 dark:text-white">{formatSol(item.totalAmount)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center text-gray-400 font-bold">
                          No se encontraron ventas para este periodo con los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'purchases' && (
            <motion.div
              key="purchases-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-gray-50 dark:bg-gray-900/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-750">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por serie, correlativo, RUC o categoría..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 font-bold"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Filtrar:</span>
                  <select
                    value={docTypeFilter}
                    onChange={e => setDocTypeFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none"
                  >
                    <option value="ALL">Todos los documentos</option>
                    <option value="FACTURA">Solo Facturas (Con Crédito)</option>
                    <option value="BOLETA">Solo Boletas (Sin Crédito)</option>
                  </select>
                </div>
              </div>

              {/* Informative alert about credit loss */}
              {stats.igvLostFromBoletas > 0 && (
                <div className="bg-amber-500/10 border border-amber-300/20 p-3.5 rounded-xl flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="font-semibold leading-relaxed">
                    Tienes <b>{stats.boletaPurchasesCount} compras registradas con Boleta de Venta</b>. Estas compras acumulan un IGV de <b>{formatSol(stats.igvLostFromBoletas)}</b> que <b>no pudiste deducir</b>. Recuerda exigir siempre Factura.
                  </p>
                </div>
              )}

              {/* Purchases Table */}
              <div className="overflow-x-auto rounded-2xl border border-gray-150/60 dark:border-gray-700/50">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/40">
                  <thead className="bg-gray-50/50 dark:bg-gray-900/30">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black tracking-wider text-gray-400 uppercase">Documento / Serie</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black tracking-wider text-gray-400 uppercase">Fecha Emisión</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-black tracking-wider text-gray-400 uppercase">Proveedor RUC</th>
                      <th className="px-4 py-3.5 text-center text-[10px] font-black tracking-wider text-gray-400 uppercase">Crédito Fiscal</th>
                      <th className="px-4 py-3.5 text-right text-[10px] font-black tracking-wider text-gray-400 uppercase">Base Compra</th>
                      <th className="px-4 py-3.5 text-right text-[10px] font-black tracking-wider text-gray-400 uppercase">IGV Crédito (18%)</th>
                      <th className="px-4 py-3.5 text-right text-[10px] font-black tracking-wider text-gray-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/30 text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {filteredPurchasesList.length > 0 ? (
                      filteredPurchasesList.map(item => {
                        const base = item.totalAmount / 1.18;
                        const igv = item.totalAmount - base;
                        const hasCredit = item.documentType === DocumentType.FACTURA;
                        return (
                          <tr key={item.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-750/10">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className={`text-[10px] font-black ${hasCredit ? 'text-emerald-600' : 'text-amber-500'}`}>
                                  {item.documentType === DocumentType.FACTURA ? 'FACTURA' : 'BOLETA'}
                                </span>
                                <span className="font-bold text-gray-800 dark:text-white font-mono mt-0.5">
                                  {item.series}-{String(item.correlative).padStart(6, '0')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">{item.issueDate}</td>
                            <td className="px-4 py-3 font-mono text-[11px]">{item.ruc || 'No registrado'}</td>
                            <td className="px-4 py-3 text-center">
                              {hasCredit ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-black border border-emerald-500/10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg uppercase">
                                  ✓ Válido
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-black border border-amber-500/10 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg uppercase" title="Boletas no otorgan derecho a crédito fiscal de IGV. Evítalas comprando legalmente.">
                                  ✗ Sin Crédito
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-500 dark:text-gray-400">{formatSol(base)}</td>
                            <td className={`px-4 py-3 text-right font-mono ${hasCredit ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-400 line-through'}`}>
                              {formatSol(igv)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 dark:text-white">{formatSol(item.totalAmount)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center text-gray-400 font-bold">
                          No se encontraron compras para este periodo con los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'renta' && (
            <motion.div
              key="renta-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* RMT Tracker */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-150/40 dark:border-gray-800 p-6 rounded-2.5xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Régimen MYPE Tributario (RMT)
                    </span>
                    <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-lg border border-indigo-150/40 dark:border-indigo-900/25">
                      SUNAT
                    </span>
                  </div>

                  <p className="text-xs text-readable-muted dark:text-gray-400 leading-relaxed font-semibold">
                    Las micro y pequeñas empresas en el RMT pagan su impuesto a la renta a cuenta de forma mensual basándose en una escala de tasas progresivas determinada en base a sus ingresos netos (UIT acumulas anuales).
                  </p>

                  <div className="space-y-3.5 mt-5 border-t border-gray-100 dark:border-gray-700/60 pt-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex justify-between items-center text-xs">
                      <span>Límite de Escala Preferencial (300 UIT):</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300 font-mono">S/ 1,545,000</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span>Ventas Netas Acumuladas en {monthName.split(' ')[0]}:</span>
                      <span className="font-bold text-gray-850 dark:text-white font-mono">{formatSol(stats.netSalesBase)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span>Tasa Aplicada Actual para Pago a Cuenta:</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                        {(stats.appliedRmtRate * 100).toFixed(1)}% {stats.appliedRmtRate === 0.01 ? ' (Escala 1)' : ' (Escala 2)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-150/40 dark:border-gray-800 p-6 rounded-2.5xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Desglose de Pago Estimado</span>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-4 shadow-sm mt-3 animate-fade-in">
                      <p className="text-[10.5px] font-black text-gray-400 dark:text-gray-550 uppercase">Base para cálculo (Ventas Netas):</p>
                      <p className="text-xl font-bold font-mono text-gray-850 dark:text-white mt-1">{formatSol(stats.netSalesBase)}</p>
                      <p className="text-[10.5px] font-black text-gray-400 dark:text-gray-550 uppercase mt-3">Tasa Mensual:</p>
                      <p className="text-md font-bold text-gray-850 dark:text-white font-mono mt-0.5">{(stats.appliedRmtRate * 100).toFixed(1)}% de las Ventas Netas</p>
                    </div>
                  </div>

                  <div className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 text-xs font-bold font-mono flex items-center justify-between mt-3">
                    <span>Impuesto a la Renta por pagar:</span>
                    <span className="text-base font-black font-mono leading-none">{formatSol(stats.incomeTaxAdvance)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'checklist' && (
            <motion.div
              key="checklist-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-150/40 dark:border-gray-800 p-5 rounded-2.5xl">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  Estado de Preparación de la Declaración PDT 621
                </h4>
                <p className="text-xs text-readable-muted dark:text-gray-405 leading-relaxed font-semibold">
                  Lista de verificación y control contable para evaluar la exactitud fiscal antes de presentar tu formulario tributario PDT 621 en el portal "SOL SUNAT" para el periodo {monthName}.
                </p>

                <div className="space-y-3 mt-5">
                  {[
                    { label: 'Conciliación de Ventas e IGV Débito', ok: stats.salesCount > 0, detail: `${stats.salesCount} documentos de venta conciliados e identificados. Total IGV: ${formatSol(stats.igvDebit)}` },
                    { label: 'Verificación de Compras deducibles', ok: stats.purchasesCount > 0, detail: `${stats.facturaPurchasesCount} Facturas válidas procesadas para crédito de ${formatSol(stats.igvCredit)}.` },
                    { label: 'Auditoría de Compras con Boleta S/ Crédito', ok: stats.boletaPurchasesCount === 0, warning: stats.boletaPurchasesCount > 0, detail: stats.boletaPurchasesCount > 0 ? `Se identificaron ${stats.boletaPurchasesCount} Boletas (${formatSol(stats.igvLostFromBoletas)} de IGV no deducible). Se aconseja reemplazarlas por Facturas.` : '0 Boletas registradas. Máxima deducción posible completada con éxito.' },
                    { label: 'Carga de Certificado Digital PGD PSE', ok: true, detail: 'Certificación electrónica de SAMI activa. Impuestos calculados en bases legales.' },
                    { label: 'Suficiencia de Liquidez Tributaria', ok: stats.igvPayable <= 0, warning: stats.igvPayable > 0, detail: stats.igvPayable > 0 ? `Impuestos por liquidar: ${formatSol(stats.igvPayable)}. Recuerda aprovisionar este monto antes de la fecha de presentación.` : '¡Perfecto! Tienes saldo a favor o deudas controladas cubiertas.' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
                      {item.ok ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : item.warning ? (
                        <div className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-red-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-white leading-relaxed">{item.label}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed font-semibold">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
