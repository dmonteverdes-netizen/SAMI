import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  Calculator, 
  CheckCircle,
  Clock,
  Coins,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { RER_INCOME_TAX_RATE, IGV_RATE } from '../../core/services/accountingService';

export const InteractiveSandbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tax_health' | 'tax' | 'offers'>('tax_health');
  
  // Tab 1: Salud Tributaria checklist states
  const [declarationsOnTime, setDeclarationsOnTime] = useState(true);
  const [formalizedSuppliers, setFormalizedSuppliers] = useState(false);
  const [openFinanceLinked, setOpenFinanceLinked] = useState(false);

  // Tab 2: Tax calculator states
  const [salesAmount, setSalesAmount] = useState<number>(18000);
  const [purchasesAmount, setPurchasesAmount] = useState<number>(8500);

  // Conteo de buenas prácticas activas (sin fórmula de scoring ni porcentajes inventados)
  const activePracticesCount = useMemo(() => {
    let count = 0;
    if (declarationsOnTime) count += 1;
    if (formalizedSuppliers) count += 1;
    if (openFinanceLinked) count += 1;
    return count;
  }, [declarationsOnTime, formalizedSuppliers, openFinanceLinked]);

  // Tax calculations using official constants
  const igvSales = useMemo(() => salesAmount * IGV_RATE, [salesAmount]);
  const igvPurchases = useMemo(() => purchasesAmount * IGV_RATE, [purchasesAmount]);
  const netIgvToPay = useMemo(() => Math.max(0, igvSales - igvPurchases), [igvSales, igvPurchases]);
  const estimatedIncomeTax = useMemo(() => salesAmount * RER_INCOME_TAX_RATE, [salesAmount]);

  return (
    <div className="w-full bg-white dark:bg-slate-900/90 rounded-[2.2rem] border border-slate-200/60 dark:border-slate-800/80 shadow-[0_25px_60px_-15px_rgba(99,102,241,0.12)] overflow-hidden transition-all duration-300">
      
      {/* Dynamic macOS Window Header */}
      <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-900/50">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-3 font-mono">
            SAMI FINTECH CORE ENGINE v2.0
          </span>
        </div>
        <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
          <Sparkles size={10} className="animate-spin-slow" /> Sandbox Interactivo
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-900/50 p-1.5 gap-1">
        {[
          { id: 'tax_health', label: 'Salud Tributaria', icon: <TrendingUp size={13} /> },
          { id: 'tax', label: 'Contabilidad', icon: <Calculator size={13} /> },
          { id: 'offers', label: 'Ofertas Aliadas', icon: <Coins size={13} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/20'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Sandbox Interactive Body */}
      <div className="p-6 md:p-8 min-h-[300px] flex flex-col justify-between">
        
        {/* TAB 1: SALUD TRIBUTARIA SIMULATOR */}
        {activeTab === 'tax_health' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-2xs font-extrabold uppercase tracking-widest text-[#94A3B8]">DEMOSTRACIÓN INTERACTIVA</p>
                <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">Orden de Información y Expediente MYPE</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Simula las buenas prácticas contables que facilitan la evaluación de tu negocio ante entidades financieras aliadas.
                </p>
              </div>

              {/* Progress Counter Bubble */}
              <div className="text-center bg-indigo-50/40 dark:bg-indigo-950/20 px-4 py-3 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 shrink-0">
                <p className="text-2xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">PRÁCTICAS CLAVE</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{activePracticesCount} / 3</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">EXPEDIENTE DIGITAL</p>
              </div>
            </div>

            {/* Checklist of Best Practices */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <label className="flex items-center justify-between gap-3 p-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-xl cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={declarationsOnTime} 
                    onChange={(e) => setDeclarationsOnTime(e.target.checked)}
                    className="w-4.5 h-4.5 text-indigo-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">Declaraciones y PDT al día</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Cumplimiento puntual en el cronograma mensual de SUNAT</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-sm ${declarationsOnTime ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-200/50 dark:bg-slate-800'}`}>
                  {declarationsOnTime ? 'Al día' : 'Pendiente'}
                </span>
              </label>

              <label className="flex items-center justify-between gap-3 p-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-xl cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={formalizedSuppliers} 
                    onChange={(e) => setFormalizedSuppliers(e.target.checked)}
                    className="w-4.5 h-4.5 text-indigo-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">Compras con Factura Electrónica</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Sustenta tus compras con comprobantes válidos para crédito fiscal</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-sm ${formalizedSuppliers ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-200/50 dark:bg-slate-800'}`}>
                  {formalizedSuppliers ? 'Sustentado' : 'Sin compras formales'}
                </span>
              </label>

              <label className="flex items-center justify-between gap-3 p-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-xl cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={openFinanceLinked} 
                    onChange={(e) => setOpenFinanceLinked(e.target.checked)}
                    className="w-4.5 h-4.5 text-indigo-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">Conexión de Flujo Bancario (Open Finance)</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Aporta trazabilidad adicional de tus cobros y pagos comerciales</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-sm ${openFinanceLinked ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/30' : 'text-slate-400 bg-slate-200/50 dark:bg-slate-800'}`}>
                  {openFinanceLinked ? 'Conectado' : 'Opcional'}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE TAX CALCULATOR */}
        {activeTab === 'tax' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-left">
              <p className="text-2xs font-extrabold uppercase tracking-widest text-[#94A3B8]">CÁLCULO AUTOMÁTICO SUNAT</p>
              <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">Previsualización de Impuestos MYPE</h4>
            </div>

            {/* Config Sliders */}
            <div className="space-y-4">
              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Ventas Mensuales Emitidas</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">S/ {salesAmount.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min={5000} 
                  max={50000} 
                  step={500} 
                  value={salesAmount}
                  onChange={(e) => setSalesAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Compras del Negocio con Factura (Crédito Fiscal)</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">S/ {purchasesAmount.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min={1000} 
                  max={Math.min(30000, salesAmount)} 
                  step={500} 
                  value={purchasesAmount}
                  onChange={(e) => setPurchasesAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>

            {/* Results Board */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">IGV Ventas (18%)</p>
                <p className="text-xs md:text-sm font-mono font-black text-slate-700 dark:text-slate-300 mt-1">S/ {Math.round(igvSales).toLocaleString()}</p>
              </div>
              <div className="border-x border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">IGV Compras</p>
                <p className="text-xs md:text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">S/ {Math.round(igvPurchases).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Renta RER (1.5%)</p>
                <p className="text-xs md:text-sm font-mono font-black text-slate-750 dark:text-slate-200 mt-1">S/ {Math.round(estimatedIncomeTax).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PARTNER LOAN RANGES OVERVIEW */}
        {activeTab === 'offers' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div>
              <p className="text-2xs font-extrabold uppercase tracking-widest text-[#94A3B8]">EVALUACIÓN DIRECTA POR ENTIDADES ALIADAS</p>
              <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">Líneas de Financiamiento para Capital de Trabajo</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Bancos, cajas y fintechs aliadas evalúan tu expediente tributario consolidado bajo sus propias políticas de crédito.
              </p>
            </div>

            {/* Illustrative Partner Ranges Card */}
            <div className="bg-gradient-to-tr from-slate-50 to-indigo-50/20 dark:from-slate-900/80 dark:to-indigo-950/20 p-5 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/30 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                    Rangos Referenciales de Aliados
                  </span>
                  <p className="text-xs text-slate-400 font-semibold mt-2">Montos de Financiamiento MYPE</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">S/ 8,000 – S/ 75,000</p>
                  <p className="text-[10px] text-slate-500">Según nivel de ventas y formalidad del negocio</p>
                </div>
                
                <div className="space-y-1 sm:text-right">
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none">CONDICIONES REFERENCIALES</p>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">Desde 1.15% mes</p>
                  <p className="text-[9px] text-[#A1A1AA] uppercase font-bold mt-0.5">(Tasas fijadas por cada entidad evaluadora)</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] font-semibold text-slate-400">
                <span className="flex items-center gap-1"><Clock size={12} /> Evaluación y desembolso directo por la entidad financiera</span>
                <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={10} /> SAMI no otorga créditos ni cobra comisiones</span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Sandbox footer that scales beautifully */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'tax_health' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : activeTab === 'tax' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'}`}>
              {activeTab === 'tax_health' ? <TrendingUp size={16} /> : activeTab === 'tax' ? <Calculator size={16} /> : <Coins size={16} />}
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Estado del Sandbox</p>
              <p className="text-[11px] font-bold text-slate-800 dark:text-white leading-tight">
                {activeTab === 'tax_health' 
                  ? `${activePracticesCount} de 3 prácticas clave aplicadas` 
                  : activeTab === 'tax' 
                  ? `IGV Neto estimado: S/ ${Math.max(0, Math.round(netIgvToPay)).toLocaleString()}` 
                  : 'Ofertas y condiciones sujetas a evaluación por entidad financiera'}
              </p>
            </div>
          </div>

          <a
            href="#loan-simulator-section"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#loan-simulator-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto text-center inline-flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-[11px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
          >
            Probar Simulador Completo <ArrowRight size={12} />
          </a>
        </div>

      </div>
    </div>
  );
};

