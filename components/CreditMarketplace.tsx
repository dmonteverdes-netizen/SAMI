
import React, { useState, useMemo } from 'react';
import type { Invoice, SamiScoreResult, LoanOffer, FactoringOffer, CreditApplication } from '../types';
import { calculateSamiScore, generateLoanOffers } from '../services/creditService';
import { generateFactoringOffers } from '../services/expenseService';
import SamiScoreGauge from './SamiScoreGauge';
import LoanOfferCard from './LoanOfferCard';
import PaymentMethodsBadges from './PaymentMethodsBadges';
import { Wallet, Briefcase, ArrowRight, History, CheckCircle2, Clock, AlertCircle, FileText, Upload, ShieldCheck, Trophy, PartyPopper, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TermTooltip from './TermTooltip';
import { showLocalPushNotification } from '../services/pushNotificationService';

interface CreditMarketplaceProps {
  salesHistory: Invoice[];
  isFinanceCertified: boolean;
  applications: CreditApplication[];
  onApply: (application: Omit<CreditApplication, 'id' | 'timestamp' | 'status'>) => void;
}

const CreditMarketplace: React.FC<CreditMarketplaceProps> = ({ salesHistory, isFinanceCertified, applications, onApply }) => {
  const [activeTab, setActiveTab] = useState<'evaluation' | 'loans_offers' | 'factoring' | 'history'>('evaluation');
  const [scoreResult, setScoreResult] = useState<SamiScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVigenciaVerified, setIsVigenciaVerified] = useState(false);
  const [showVigenciaModal, setShowVigenciaModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingApplication, setPendingApplication] = useState<Omit<CreditApplication, 'id' | 'timestamp' | 'status'> | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<LoanOffer | null>(null);
  const [applicationSent, setApplicationSent] = useState<string | null>(null);

  const factoringOffers = useMemo(() => generateFactoringOffers(salesHistory), [salesHistory]);
  const suggestedLoanOffers = useMemo(() => {
    const result = calculateSamiScore(salesHistory);
    if (!result) return [];
    
    // generateLoanOffers already sorts, but we ensure it here as requested
    return [...generateLoanOffers(result, isFinanceCertified)].sort((a, b) => b.maxAmount - a.maxAmount);
  }, [salesHistory, isFinanceCertified]);

  const handleEvaluateCredit = () => {
    setIsLoading(true);
    setError(null);
    setScoreResult(null);

    // Simulate async operation
    setTimeout(() => {
      try {
        const result = calculateSamiScore(salesHistory);
        if (result) {
          setScoreResult(result);
        } else {
          setError("No hay suficientes datos para una evaluación. Se recomienda registrar ventas de al menos 3 meses distintos.");
        }
      } catch (err: any) {
        setError("Ocurrió un error inesperado al calcular el score.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  };

  const handleApply = (offer: LoanOffer) => {
    const application = {
      type: 'loan' as const,
      amount: offer.maxAmount,
      partner: offer.partner,
      userId: 'current-user',
      details: 'Préstamo Pre-Aprobado de Capital de Trabajo'
    };

    if (!isVigenciaVerified) {
      setPendingApplication(application);
      setSelectedOffer(offer);
      setShowVigenciaModal(true);
    } else {
      setSelectedOffer(offer);
      setTimeout(() => {
        setApplicationSent(offer.partner.name);
        setSelectedOffer(null);
        onApply(application);
        showLocalPushNotification(
          "💸 Solicitud de Préstamo",
          `Tu solicitud de S/ ${application.amount.toLocaleString('es-PE')} con ${offer.partner.name} ha sido transmitida de manera segura.`
        );
      }, 1500);
    }
  };

  const handleApplyClick = (application: Omit<CreditApplication, 'id' | 'timestamp' | 'status'>) => {
    if (!isVigenciaVerified) {
      setPendingApplication(application);
      setShowVigenciaModal(true);
    } else {
      onApply(application);
      showLocalPushNotification(
        "💸 Solicitud de Factoring",
        `Se ha enviado con éxito tu solicitud de adelanto a ${application.partner.name} por S/ ${application.amount.toLocaleString('es-PE')}.`
      );
    }
  };

  const handleVerifyVigencia = () => {
    setIsVerifying(true);
    // Simulate SUNARP connection
    setTimeout(() => {
      setIsVigenciaVerified(true);
      setIsVerifying(false);
      setShowVigenciaModal(false);
      
      showLocalPushNotification(
        "🏛️ SUNARP Verificado",
        "La Vigencia de Poder de tu SRL/SAC fue consultada y confirmada al 100% en los Registros Públicos."
      );

      if (selectedOffer) {
        setTimeout(() => {
          setApplicationSent(selectedOffer.partner.name);
          if (pendingApplication) {
            onApply(pendingApplication);
            showLocalPushNotification(
              "💸 Solicitud de Préstamo",
              `Tu solicitud por S/ ${pendingApplication.amount.toLocaleString('es-PE')} fue aprobada y enviada a ${selectedOffer.partner.name}.`
            );
          }
          setSelectedOffer(null);
          setPendingApplication(null);
        }, 1500);
      } else if (pendingApplication) {
        onApply(pendingApplication);
        showLocalPushNotification(
          "💸 Solicitud Procesada",
          `Tu solicitud con ${pendingApplication.partner.name} por S/ ${pendingApplication.amount.toLocaleString('es-PE')} fue procesada correctamente.`
        );
        setPendingApplication(null);
      }
    }, 2500);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl h-full flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Marketplace de Créditos</h1>
        <p className="text-gray-600 dark:text-gray-400">Pre-evalúa tu negocio para acceder a ofertas de crédito de nuestros aliados.</p>
        <PaymentMethodsBadges title="Entidades y canales autorizados" />
      </header>

      <AnimatePresence>
        {isFinanceCertified && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-green-500/20 mb-2 relative overflow-hidden"
              role="alert"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-3xl" />
                
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
                        <Trophy size={32} className="text-white" />
                    </div>
                    <div className="text-center md:text-left flex-grow">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                          <h3 className="text-xl font-black tracking-tight uppercase">¡Certificación Financiera Obtenida!</h3>
                          <PartyPopper size={20} className="hidden sm:block" />
                        </div>
                        <p className="text-green-50 font-medium leading-relaxed max-w-2xl">
                          Nuestros aliados ya saben que eres un experto en finanzas MYPE. 
                          <span className="font-bold"> Tu perfil de riesgo ha sido actualizado</span>, lo que desbloquea mejores tasas y mayores líneas de crédito.
                        </p>
                    </div>
                    <div className="shrink-0">
                      <div className="px-5 py-3 bg-white text-green-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">
                        BENEFICIO ACTIVO
                      </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('evaluation')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'evaluation' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Briefcase size={18} />
          Evaluación de Score
        </button>
        <button 
          onClick={() => setActiveTab('loans_offers')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'loans_offers' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Zap size={18} className={activeTab === 'loans_offers' ? 'fill-current' : ''} />
          Préstamos
        </button>
        <button 
          onClick={() => setActiveTab('factoring')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'factoring' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Wallet size={18} />
          Factoring
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <History size={18} />
          Historial de Solicitudes
        </button>
      </div>

      {activeTab === 'evaluation' ? (
        <>
          {isVigenciaVerified && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-center gap-4 mb-6">
               <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 flex items-center justify-center rounded-full text-blue-600 dark:text-blue-400">
                  <ShieldCheck size={24} />
               </div>
               <div>
                 <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Vigencia de Poder Validada</p>
                 <p className="text-xs text-blue-600 dark:text-blue-400">Tus facultades legales han sido verificadas ante SUNARP (Nivel 2 Compliance).</p>
               </div>
            </div>
          )}

          {/* Banner explicativo del proceso */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-3xl p-5 border border-indigo-100 dark:border-indigo-800 mb-6 text-left">
            <h3 className="font-black text-slate-900 dark:text-white mb-3 text-base">🏦 ¿Cómo funciona el crédito en SAMI?</h3>
            <div className="space-y-2">
              {[
                { step: '1', child: <>Calculamos tu <TermTooltip term="SAMI Score">SAMI Score</TermTooltip> con tu historial de ventas</> },
                { step: '2', child: <>Los bancos aliados ven tu puntaje (sin que tú hagas nada)</> },
                { step: '3', child: <>Te mostramos las ofertas reales que calificas</> },
                { step: '4', child: <>Tú decides si aceptas. Sin compromisos.</> },
              ].map(s => (
                <div key={s.step} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{s.step}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">{s.child}</div>
                </div>
              ))}
            </div>
          </div>

          <PaymentMethodsBadges title="Métodos de pago sugeridos para el abono del crédito" />

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
            <h2 className="text-xl font-semibold mb-4">¿Listo para crecer?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Usa tu historial de ventas registrado en SAMI para obtener un score crediticio y ver ofertas simuladas de capital de trabajo.
              Mientras más ventas registres, ¡mejores serán tus oportunidades!
            </p>
            <button
              onClick={handleEvaluateCredit}
              disabled={isLoading}
              className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 disabled:bg-blue-400 transition-transform transform hover:scale-105 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Evaluando...' : '¡Pre-evaluar mi Crédito Ahora!'}
            </button>
          </div>

          {isLoading && (
            <div className="text-center p-8">
              <div role="status" aria-label="Cargando datos..." className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <span className="sr-only">Cargando...</span>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Analizando tu historial de ventas...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                <p className="font-bold">Error de Evaluación</p>
                <p>{error}</p>
            </div>
          )}

          {scoreResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1">
                    <SamiScoreGauge scoreResult={scoreResult} />
                </div>
                <div className="lg:col-span-2">
                    <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Análisis de Perfil</h3>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Tu score es de <span className="font-bold text-blue-600">{scoreResult.score}</span> puntos. 
                        Esto te ubica en el nivel <span className="font-bold">{scoreResult.tier}</span>.
                      </p>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 uppercase tracking-wider font-bold">Estabilidad</span>
                          <span className="font-bold">{scoreResult.analysis.stability}/100</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${scoreResult.analysis.stability}%` }}></div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 uppercase tracking-wider font-bold">Crecimiento</span>
                          <span className="font-bold">{scoreResult.analysis.growth}/100</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: `${scoreResult.analysis.growth}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 uppercase tracking-wider font-bold">Formalidad</span>
                          <span className="font-bold">{scoreResult.analysis.formality}/100</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${scoreResult.analysis.formality}%` }}></div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('loans_offers')}
                        className="mt-8 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                      >
                        Ir a Ver Mis Ofertas <ArrowRight size={20} />
                      </button>
                    </div>
                </div>
            </div>
          )}
        </>
      ) : activeTab === 'loans_offers' ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Ofertas de Capital para tu Negocio</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Basado en tu historial transaccional, estas son las opciones de financiamiento disponibles hoy.
                  </p>
                </div>
                {scoreResult ? (
                   <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-5 py-3 rounded-2xl">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1"><TermTooltip term="SAMI Score">SAMI Score</TermTooltip></p>
                        <p className="text-xl font-black text-blue-600 leading-none">{scoreResult.score}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Nivel</p>
                        <p className="text-sm font-black text-gray-800 dark:text-white leading-none uppercase">{scoreResult.tier}</p>
                      </div>
                   </div>
                ) : (
                  <button 
                    onClick={() => setActiveTab('evaluation')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    Evaluar mi Score <Zap size={14} className="fill-current" />
                  </button>
                )}
             </div>

             {suggestedLoanOffers.length === 0 ? (
               <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                  <div className="w-20 h-20 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 shadow-sm">
                    <Briefcase size={40} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Aún no hay ofertas de préstamos</h3>
                  <p className="text-gray-500 max-w-md mx-auto px-4">
                    Estamos analizando tu información. Recuerda que necesitas al menos 3 meses de ventas registradas para que nuestros aliados puedan ofrecerte capital.
                  </p>
                  <button 
                    onClick={() => setActiveTab('evaluation')}
                    className="mt-8 text-blue-600 font-bold hover:underline"
                  >
                    Ir a pre-evaluación
                  </button>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {suggestedLoanOffers.map((offer, index) => (
                    <LoanOfferCard 
                      key={index}
                      offer={offer}
                      onApply={() => handleApply(offer)}
                      isLoading={selectedOffer === offer}
                      isSuccess={applicationSent === offer.partner.name}
                    />
                  ))}
               </div>
             )}
          </div>
          
          {suggestedLoanOffers.length > 0 && (
            <div className="bg-indigo-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-indigo-500/20">
               <div>
                 <h3 className="text-2xl font-black tracking-tight mb-2">¿Necesitas una mejor tasa?</h3>
                 <p className="opacity-90 max-w-xl">
                   Completa los cursos de la Academia SAMI para obtener tu Certificación de Salud Financiera. 
                   Los negocios certificados acceden a reducciones de tasa de hasta un 2% anual.
                 </p>
               </div>
               <button className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center gap-3">
                 Ir a Academia <ArrowRight size={18} />
               </button>
            </div>
          )}
        </div>
      ) : activeTab === 'factoring' ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Adelanta el cobro de tus facturas</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              El <TermTooltip term="Factoring">Factoring</TermTooltip> te permite obtener liquidez inmediata vendiendo tus facturas por cobrar (Facturas negociables) a entidades financieras. 
              Ideal para cuando tus clientes pagan a 30, 60 o 90 días.
            </p>
            
            {factoringOffers.length === 0 ? (
              <div className="bg-blue-50 dark:bg-gray-700/50 p-6 rounded-lg text-center border border-blue-100 dark:border-blue-800">
                <p className="text-blue-800 dark:text-blue-300">No hemos detectado facturas por cobrar elegibles para factoring.</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">Asegúrate de registrar ventas con "Factura" y montos mayores a S/ 500 en el Módulo Contable.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {factoringOffers.map((offer) => {
                  const invoice = salesHistory.find(s => s.id === offer.invoiceId);
                  return (
                    <div key={offer.id} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-4">
                        <img src={offer.partner.logoUrl} alt={offer.partner.name} className="h-8 object-contain" referrerPolicy="no-referrer" />
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">Oferta de Factoring</span>
                      </div>
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Factura:</span>
                          <span className="font-mono font-bold">{invoice?.series}-{invoice?.correlative}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Monto Original:</span>
                          <span className="font-bold">S/ {invoice?.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Adelanto ({ (offer.advancePercentage * 100).toFixed(0) }%):</span>
                          <span className="text-green-600 font-bold">S/ { (invoice!.totalAmount * offer.advancePercentage).toFixed(2) }</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                          <span className="font-bold text-gray-800 dark:text-white">Recibes Hoy:</span>
                          <span className="font-bold text-blue-600 text-lg">S/ {offer.netAmount.toFixed(2)}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleApplyClick({
                          type: 'factoring',
                          amount: offer.netAmount,
                          partner: offer.partner,
                          userId: 'current-user',
                          details: `Factura ${invoice?.series}-${invoice?.correlative}`
                        })}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        Solicitar Adelanto <ArrowRight size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <History className="text-blue-600" />
              Historial de Solicitudes
            </h2>

            {applications.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-50 dark:bg-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <Briefcase size={32} />
                </div>
                <p className="text-gray-500">Aún no has realizado ninguna solicitud de crédito.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Entidad Aliada</th>
                      <th className="px-6 py-4">Monto</th>
                      <th className="px-6 py-4">Detalle</th>
                      <th className="px-6 py-4 border-r-0 md:border-r">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium">{new Date(app.timestamp).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${app.type === 'loan' ? 'bg-purple-100/50 text-purple-600' : 'bg-blue-100/50 text-blue-600'}`}>
                            {app.type === 'loan' ? 'Préstamo' : 'Factoring'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-1 border border-gray-100 dark:border-gray-800">
                               <img src={app.partner.logoUrl} alt={app.partner.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                             </div>
                             <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{app.partner.name}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 font-black text-sm text-gray-900 dark:text-white">S/ {app.amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={app.details}>
                            {app.details || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {app.status === 'pending' && <Clock size={14} className="text-yellow-500" />}
                            {app.status === 'reviewing' && <Clock size={14} className="text-blue-500 animate-pulse" />}
                            {app.status === 'approved' && <CheckCircle2 size={14} className="text-green-500" />}
                            {app.status === 'rejected' && <AlertCircle size={14} className="text-red-500" />}
                            {app.status === 'disbursed' && <CheckCircle2 size={14} className="text-green-600" />}
                            <span className={`text-xs font-bold uppercase ${
                              app.status === 'pending' ? 'text-yellow-600' :
                              app.status === 'reviewing' ? 'text-blue-600' :
                              app.status === 'approved' ? 'text-green-600' :
                              app.status === 'rejected' ? 'text-red-600' :
                              'text-green-800'
                            }`}>
                              {app.status === 'pending' ? 'Pendiente' :
                               app.status === 'reviewing' ? 'En Revisión' :
                               app.status === 'approved' ? 'Aprobado' :
                               app.status === 'rejected' ? 'Rechazado' :
                               'Desembolsado'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Vigencia de Poder Modal */}
      {showVigenciaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-800">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                    <FileText size={32} />
                  </div>
                  <button 
                    onClick={() => setShowVigenciaModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <AlertCircle size={24} />
                  </button>
                </div>

                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-4">Validación Compliance: Nivel 2</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                  Para proceder con la solicitud de capital, debemos verificar tu <span className="font-bold">Vigencia de Poder</span> (SUNARP). Esto asegura que tienes las facultades legales para contratar financiamiento.
                </p>

                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-3">
                    <Upload size={24} className="text-gray-400" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Arrastra aquí tu Copia Literal o clica para subir</p>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <CheckCircle2 size={20} className="text-blue-600" />
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Consulta SUNARP en tiempo real integrada</p>
                  </div>
                </div>

                <button 
                  onClick={handleVerifyVigencia}
                  disabled={isVerifying}
                  className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3"
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Verificando con SUNARP...
                    </>
                  ) : (
                    <>Validar y Continuar <ArrowRight size={20} /></>
                  )}
                </button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-950 p-6 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest leading-normal">
                  SAMI cumple con la Ley N° 29733 de Protección de Datos Personales y normativas SBS.
                </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CreditMarketplace;
