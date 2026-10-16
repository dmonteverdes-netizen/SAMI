import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  TrendingUp, 
  CheckSquare, 
  X, 
  Award,
  Info,
  Building2
} from 'lucide-react';

interface HealthTutorialGuideProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigateToCredit?: () => void;
  onNavigateToEducation?: () => void;
}

export const HealthTutorialGuide: React.FC<HealthTutorialGuideProps> = ({
  isOpen = true,
  onClose,
  onNavigateToCredit,
  onNavigateToEducation
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [selectedBilling, setSelectedBilling] = useState<number>(25000);

  const [completedActions, setCompletedActions] = useState<{ [key: string]: boolean }>({
    rvie: true,
    rse: true,
    punctual: false,
    academy: false
  });

  const toggleAction = (key: string) => {
    setCompletedActions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const steps = [
    {
      id: 'step-1',
      title: '1. Expediente Tributario MYPE',
      subtitle: 'Consolidación de ventas y compras RVIE/RSE',
      icon: ShieldCheck,
      color: 'from-blue-600 to-indigo-700'
    },
    {
      id: 'step-2',
      title: '2. Interpretación de Métricas',
      subtitle: 'Consistencia de flujos de caja y formalidad',
      icon: TrendingUp,
      color: 'from-emerald-600 to-teal-700'
    },
    {
      id: 'step-3',
      title: '3. Buenas Prácticas Contables',
      subtitle: 'Pautas para un expediente sólido',
      icon: CheckSquare,
      color: 'from-amber-600 to-orange-700'
    },
    {
      id: 'step-4',
      title: '4. Conexión con Entidades Aliadas',
      subtitle: 'Solicitud de créditos con bancos y fintechs',
      icon: Award,
      color: 'from-purple-600 to-indigo-800'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-indigo-150 dark:border-slate-700 shadow-xl overflow-hidden transition-all">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/20">
                Guía Interactiva SAMI
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                Tutorial de Consolidación Tributaria MYPE
              </h3>
            </div>
          </div>

          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Cerrar Guía"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6 pt-4 border-t border-slate-800/80 relative z-10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === idx;
            const isCompleted = activeStep > idx;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-2 p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400' 
                    : isCompleted
                    ? 'bg-slate-800/90 text-emerald-400 hover:bg-slate-800'
                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className={`p-1.5 rounded-xl text-xs font-bold ${
                  isActive ? 'bg-white/20 text-white' : isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/50 text-slate-400'
                }`}>
                  {isCompleted ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold truncate leading-tight">Paso {idx + 1}</p>
                  <p className="text-[9px] opacity-80 truncate hidden sm:block">{step.title.split('.')[1]}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* STEP 1 */}
        {activeStep === 0 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  ¿Qué es el Expediente de Información Tributaria?
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Es la consolidación limpia y verificada de tus comprobantes de venta (RVIE) y compra (RSE) emitidos ante SUNAT. Permite demostrar a las entidades bancarias el volumen real de tus operaciones comerciales.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-4 rounded-2xl flex items-start gap-3">
              <Info className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
              <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                <strong className="font-bold block text-amber-950 dark:text-amber-100 mb-0.5">
                  Aviso de Neutralidad Tecnológica:
                </strong>
                SAMI NO es una agencia de calificación de riesgo ni calcula puntajes/scores. SAMI actúa como canal tecnológico de ordenamiento y transmisión de comprobantes RVIE/RSE. Las entidades financieras aliadas (bancos, cajas, fintechs) son quienes evalúan la solicitud y aprueban las condiciones de crédito.
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Simulador de Ventas Declaradas
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-sm">
                  S/ {selectedBilling.toLocaleString()} / mes
                </span>
              </div>

              <input 
                type="range"
                min="5000"
                max="80000"
                step="2500"
                value={selectedBilling}
                onChange={(e) => setSelectedBilling(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-150 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Estado Tributario</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    Al día (RVIE/RSE)
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-150 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Acceso Bancario</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedBilling >= 25000 ? 'Apto para Múltiples Ofertas' : 'Apto para Capital MYPE'}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-150 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Capacidad Referencial</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                    Hasta S/ {(selectedBilling * 1.2).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {activeStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                <TrendingUp size={28} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  ¿Cómo interpretar las Gráficas de Ventas y Compras?
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Las visualizaciones muestran la tendencia real de tus ingresos y egresos declarados mes a mes:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-xs uppercase tracking-wider">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  Ventas Netas (RVIE)
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Representa el total facturado a clientes. Las entidades financieras revisan la regularidad y crecimiento constante.
                </p>
              </div>

              <div className="bg-amber-50/50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/50 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-black text-xs uppercase tracking-wider">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  Compras Deducibles (RSE)
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Muestra las facturas de tus proveedores. Ayuda a calcular tu margen operativo real y crédito fiscal disponible.
                </p>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-black text-xs uppercase tracking-wider">
                  <Sparkles size={14} />
                  Formalidad Electrónica
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Porcentaje de operaciones sustentadas con facturas y boletas electrónicas validada por SUNAT.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {activeStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
                <CheckSquare size={28} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  4 Pautas para Fortalecer tu Expediente Tributario
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Acciones clave para mantener una carpeta contable transparente frente a los bancos:
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div 
                onClick={() => toggleAction('rvie')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  completedActions.rvie 
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`mt-0.5 p-1 rounded-lg ${completedActions.rvie ? 'bg-emerald-500 text-white' : 'border border-slate-300 text-transparent'}`}>
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex-1 text-xs">
                  <strong className="font-bold text-slate-900 dark:text-white text-sm">1. Emitir comprobantes RVIE de forma periódica</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Evita periodos prolongados sin registrar ventas. Demuestra un flujo comercial continuo.
                  </p>
                </div>
              </div>

              <div 
                onClick={() => toggleAction('rse')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  completedActions.rse 
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`mt-0.5 p-1 rounded-lg ${completedActions.rse ? 'bg-emerald-500 text-white' : 'border border-slate-300 text-transparent'}`}>
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex-1 text-xs">
                  <strong className="font-bold text-slate-900 dark:text-white text-sm">2. Registrar facturas de compras (RSE)</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Exige factura a tus proveedores para reducir la base imponible del IGV y sustentar tus gastos operacionales.
                  </p>
                </div>
              </div>

              <div 
                onClick={() => toggleAction('punctual')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  completedActions.punctual 
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`mt-0.5 p-1 rounded-lg ${completedActions.punctual ? 'bg-emerald-500 text-white' : 'border border-slate-300 text-transparent'}`}>
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex-1 text-xs">
                  <strong className="font-bold text-slate-900 dark:text-white text-sm">3. Declarar impuestos según cronograma SUNAT</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Presentar tus declaraciones mensuales a tiempo evita multas y mantiene tu estado en regla.
                  </p>
                </div>
              </div>

              <div 
                onClick={() => toggleAction('academy')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  completedActions.academy 
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`mt-0.5 p-1 rounded-lg ${completedActions.academy ? 'bg-emerald-500 text-white' : 'border border-slate-300 text-transparent'}`}>
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex-1 text-xs">
                  <strong className="font-bold text-slate-900 dark:text-white text-sm">4. Capacitarse en la Academia MYPE</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Completa los cursos sobre salud financiera e impuestos para mejorar la gestión de tu empresa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {activeStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl shrink-0">
                <Award size={28} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  Conexión con el Marketplace de Créditos
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Las entidades financieras aliadas (bancos, cajas y fintechs) reciben tu expediente consolidado con tu autorización previa:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-xl font-bold text-center">
                  Cero Papeleo
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Transmite digitalmente tus registros RVIE/RSE sin necesidad de imprimir carpetas físicas.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl font-bold text-center">
                  Evaluación Directa
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Los analistas del banco aplican sus propios modelos de riesgo sobre tu historial verificado.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded-xl font-bold text-center">
                  Trato Transparente
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Compara tasas, montos y plazos ofrecidos por distintas entidades en un solo lugar.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-6 rounded-2xl text-white flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h5 className="font-bold text-base">¿Deseas consultar las opciones disponibles?</h5>
                <p className="text-xs text-indigo-200 mt-1">Revisa los productos financieros ajustados a tus ventas declaradas.</p>
              </div>
              <div className="flex gap-2">
                {onNavigateToCredit && (
                  <button
                    onClick={onNavigateToCredit}
                    className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <span>Ir a Créditos</span>
                    <ArrowRight size={16} />
                  </button>
                )}
                {onNavigateToEducation && (
                  <button
                    onClick={onNavigateToEducation}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    Academia MYPE
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-150 dark:border-slate-700/80 text-xs font-bold">
          <button
            onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all ${
              activeStep === 0 
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'
            }`}
          >
            <ArrowLeft size={16} />
            <span>Anterior</span>
          </button>

          <span className="text-slate-400 font-mono">
            Paso {activeStep + 1} de {steps.length}
          </span>

          {activeStep < steps.length - 1 ? (
            <button
              onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span>Siguiente</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => {
                if (onClose) onClose();
                if (onNavigateToCredit) onNavigateToCredit();
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span>Finalizar</span>
              <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
