
import React, { useState, useMemo } from 'react';
import { maskCurrency } from '../../services/maskingUtils';
import { validateRUC, ValidationResult, RucValidationData } from '../../services/validationService';
import { Calculator, ShieldCheck, Sparkles, Building2, Clock, RefreshCw, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LoanSimulator: React.FC = () => {
    const [amount, setAmount] = useState(5000);
    const [term, setTerm] = useState(12);
    const [simulationActive, setSimulationActive] = useState(false);
    
    // Lead capture states
    const [ruc, setRuc] = useState('');
    const [isRucValidating, setIsRucValidating] = useState(false);
    const [rucResult, setRucResult] = useState<ValidationResult<RucValidationData> | null>(null);
    const [isLeadCaptured, setIsLeadCaptured] = useState(false);

    const minAmount = 1000;
    const maxAmount = 50000;

    const monthlyPayment = useMemo(() => {
        // Simple fixed rate for simulation: 2.5% monthly
        // We lower it slightly if RUC is provided and valid (as a "bonus")
        const baseRate = 0.025;
        const rate = (rucResult?.isValid) ? baseRate * 0.85 : baseRate; 
        return (amount * (1 + rate * term)) / term;
    }, [amount, term, rucResult]);

    const handleSimulation = async () => {
        setSimulationActive(true);
        // Simulate a bit of processing
        await new Promise(resolve => setTimeout(resolve, 800));
        setSimulationActive(false);
    };

    const handleRucValidation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (ruc.length !== 11) return;

        setIsRucValidating(true);
        setRucResult(null);
        
        try {
            const result = await validateRUC(ruc);
            setRucResult(result);
            if (result.isValid) {
                // Pre-submit lead or just show success
                setTimeout(() => setIsLeadCaptured(true), 2000);
            }
        } catch (error) {
            setRucResult({ isValid: false, message: 'Fallo la conexión con SUNAT. Reintente.' });
        } finally {
            setIsRucValidating(false);
        }
    };

    return (
        <div id="loan-simulator-card" className="bg-white dark:bg-slate-900/50 rounded-3xl shadow-xl overflow-hidden border border-slate-150/70 dark:border-slate-800/80 max-w-4xl mx-auto scroll-mt-24">
            <div className="grid md:grid-cols-2">
                {/* Left side: Inputs */}
                <div className="p-6 md:p-8 space-y-6 bg-white dark:bg-slate-900/30">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-indigo-55/70 text-indigo-600 dark:bg-indigo-950/45 dark:text-indigo-300 text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest border border-indigo-100/40 dark:border-indigo-900/30">IA de Riesgo SAMI</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">Financia tu crecimiento</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-xs leading-relaxed">Calcula tu cuota ideal según tus ventas reales. Sin papeleo físico, 100% digital.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3.5">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">¿Cuánto necesitas?</label>
                                <span className="text-3xl font-black text-indigo-650">{maskCurrency(amount, `S/ ${amount.toLocaleString('es-PE')}`)}</span>
                            </div>
                            <div className="space-y-2">
                                <input
                                    type="range"
                                    min={minAmount}
                                    max={maxAmount}
                                    step={500}
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(Number(e.target.value));
                                        if (rucResult) setRucResult(null);
                                        if (isLeadCaptured) setIsLeadCaptured(false);
                                    }}
                                    className="w-full h-2 bg-slate-150 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 touch-manipulation"
                                />
                                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                    <span>Mín. S/ 1,000</span>
                                    <span>Máx. S/ 50,000</span>
                                </div>
                            </div>

                            {/* Quick Amount Chips for Mobile */}
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                                {[5000, 10000, 25000, 50000].map((quickAmt) => (
                                    <button
                                        key={quickAmt}
                                        type="button"
                                        onClick={() => {
                                            setAmount(quickAmt);
                                            if (rucResult) setRucResult(null);
                                            if (isLeadCaptured) setIsLeadCaptured(false);
                                        }}
                                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all border ${
                                            amount === quickAmt
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/80 dark:border-indigo-500 dark:text-indigo-300 shadow-sm'
                                            : 'bg-slate-50 border-slate-200/80 dark:bg-slate-800/60 dark:border-slate-700 text-slate-600 dark:text-slate-400 active:scale-95'
                                        }`}
                                    >
                                        S/ {quickAmt >= 1000 ? `${quickAmt / 1000}k` : quickAmt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plazo de Pago</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[6, 12, 18, 24].map((m) => (
                                    <button 
                                        key={m}
                                        onClick={() => {
                                            setTerm(m);
                                            if (rucResult) setRucResult(null);
                                            if (isLeadCaptured) setIsLeadCaptured(false);
                                        }}
                                        className={`py-2 rounded-xl text-[11px] font-black transition-all ${
                                            term === m 
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                                            : 'bg-slate-50 dark:bg-slate-900/40 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {m} Meses
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* RUC Lead Capture Area */}
                        <div className="pt-5 border-t border-slate-100 dark:border-slate-800/60">
                            {!isLeadCaptured ? (
                                <form onSubmit={handleRucValidation} className="space-y-3.5">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tu RUC para Oferta Real</label>
                                        <div className="relative group">
                                            <input 
                                                type="text" 
                                                maxLength={11}
                                                value={ruc}
                                                onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))}
                                                placeholder="Ingresa los 11 dígitos"
                                                className={`w-full bg-slate-50 dark:bg-slate-900 border ${rucResult?.isValid === false ? 'border-red-200' : 'border-slate-150/70 dark:border-slate-800'} rounded-2xl px-4.5 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all group-hover:border-indigo-200`}
                                            />
                                            {isRucValidating && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <RefreshCw size={14} className="animate-spin text-indigo-600" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <AnimatePresence mode="wait">
                                        {rucResult && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -10 }} 
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className={`p-3 rounded-xl flex items-start gap-2.5 ${rucResult.isValid ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100/50 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100/50 dark:border-red-900/30'}`}
                                            >
                                                {rucResult.isValid ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                                                <div className="text-[11px]">
                                                    <p className="font-black uppercase tracking-tight">{rucResult.isValid ? 'Empresa Encontrada' : 'Error de Validación'}</p>
                                                    <p className="font-medium opacity-85 mt-0.5">{rucResult.message || rucResult.data?.legalName}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button 
                                        type="submit"
                                        disabled={ruc.length !== 11 || isRucValidating}
                                        className="w-full bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 text-white py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 group shadow-md shadow-indigo-500/10 dark:shadow-none mt-1 cursor-pointer"
                                    >
                                        {isRucValidating ? 'Consultando SUNAT...' : rucResult?.isValid ? 'Confirmando Datos...' : 'Validar con SUNAT'}
                                        {!isRucValidating && <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />}
                                    </button>
                                </form>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-indigo-600 p-6 rounded-2xl text-white text-center shadow-lg shadow-indigo-550/15"
                                >
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <h4 className="font-black text-base tracking-tight">¡Evaluación Real OK!</h4>
                                    <p className="text-xs text-indigo-100 mt-1.5 font-medium">Hemos reservado una oferta especial para <span className="font-black text-white">{rucResult?.data?.legalName}</span>.</p>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 flex justify-between items-center text-xs">
                                            <span className="font-bold opacity-75 uppercase tracking-widest text-[9px]">Tasa Especial</span>
                                            <span className="font-black">1.95% Mensual</span>
                                        </div>
                                    </div>
                                    <p className="text-[9px] uppercase font-black tracking-[0.15em] mt-4 opacity-70">Regístrate para el desembolso</p>
                                </motion.div>
                             )}
                        </div>
                    </div>
                </div>

                {/* Right side: Results Highlight */}
                <div className="bg-slate-50 dark:bg-slate-900/20 p-6 md:p-8 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-150/70 dark:border-slate-800/85 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full" />

                    <div className="space-y-6 relative z-10">
                        <div className={`p-6 bg-white dark:bg-slate-900/60 rounded-2xl shadow-md border border-slate-150/50 dark:border-slate-800/80 transition-all duration-700 ${simulationActive ? 'scale-95 opacity-50 blur-sm' : 'scale-100 opacity-100'}`}>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 inline-flex items-center gap-2">
                                <Calculator size={12} className="text-indigo-500" /> Estimación Mensual
                            </p>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-4xl font-black text-slate-900 dark:text-white mt-0.5">
                                        {maskCurrency(monthlyPayment, `S/ ${Math.round(monthlyPayment).toLocaleString()}`)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Soles</span>
                                </div>
                                <p className="text-[11px] font-bold text-indigo-600 mt-1">I.G.V. Incluido</p>
                            </div>
                            
                            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-55/70 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center rounded-xl flex-shrink-0">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Análisis Inteligente</p>
                                    <p className="text-[9px] text-slate-400 font-medium leading-relaxed">Consideramos tu comportamiento SUNAT para reducir el riesgo y tu tasa.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/70 dark:bg-slate-900/40 p-3 rounded-xl flex flex-col gap-1.5 border border-slate-150/30 dark:border-slate-800/30">
                                <Building2 size={15} className="text-indigo-500" />
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Bancos Aliados</p>
                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Red SAMI (12+)</p>
                                </div>
                            </div>
                            <div className="bg-white/70 dark:bg-slate-900/40 p-3 rounded-xl flex flex-col gap-1.5 border border-slate-150/30 dark:border-slate-800/30">
                                <Clock size={15} className="text-indigo-500" />
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Desembolso</p>
                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">&lt; 2 Horas</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-55/70 dark:bg-indigo-950/25 p-4 rounded-xl flex items-start gap-3 border border-indigo-100/50 dark:border-indigo-900/20">
                            <div className="p-1.5 bg-white dark:bg-indigo-900/40 rounded-lg text-indigo-600 flex-shrink-0">
                                <Sparkles size={16} />
                            </div>
                            <p className="text-[9px] text-indigo-800 dark:text-indigo-300 font-bold leading-relaxed pr-1 align-middle">
                                ¿Sabías que las MYPEs con <span className="underline italic text-indigo-700 dark:text-indigo-200">Pre-Calificación SAMI</span> obtienen hasta 15% de reducción en comisiones?
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoanSimulator;
