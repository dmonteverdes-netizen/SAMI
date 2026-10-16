
import React, { useState, useMemo, useEffect } from 'react';
import type { Invoice, TaxSummary, LoanOffer, FactoringOffer, CreditApplication, ActiveLoan, LoanInstallment } from '../../types';
import { calculateTaxHealth, generateLoanOffers } from '../../services/creditService';
import { generateFactoringOffers } from '../../services/expenseService';
import TaxHealthGauge from '../perfil-riesgo/TaxHealthGauge';
import LoanOfferCard from './LoanOfferCard';
import PaymentMethodsBadges from '../../shared/ui/PaymentMethodsBadges';
import { Wallet, Briefcase, ArrowRight, History, CheckCircle2, Clock, AlertCircle, FileText, Upload, ShieldCheck, Trophy, PartyPopper, Zap, Calendar, DollarSign, Download, Check, Filter, CreditCard, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TermTooltip from '../glosario/TermTooltip';
import { showLocalPushNotification } from '../../services/pushNotificationService';

const INITIAL_ACTIVE_LOANS: ActiveLoan[] = [
  {
    id: 'loan-001',
    partner: {
      id: 'mibanco',
      name: 'Mibanco',
      logoUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80',
    },
    loanType: 'Capital de Trabajo',
    originalAmount: 25000,
    remainingAmount: 16310,
    monthlyInterestRate: 0.018,
    termMonths: 12,
    disbursedDate: '2026-03-15',
    nextDueDate: '2026-08-15',
    nextDueAmount: 2330.00,
    installmentsPaidCount: 4,
    totalInstallmentsCount: 12,
    status: 'active',
    installments: [
      { id: 'inst-101', loanId: 'loan-001', installmentNumber: 1, totalInstallments: 12, dueDate: '2026-04-15', principalAmount: 1955, interestAmount: 375, totalAmount: 2330, status: 'paid', paidDate: '2026-04-14', receiptNumber: 'REC-88219' },
      { id: 'inst-102', loanId: 'loan-001', installmentNumber: 2, totalInstallments: 12, dueDate: '2026-05-15', principalAmount: 1984, interestAmount: 346, totalAmount: 2330, status: 'paid', paidDate: '2026-05-15', receiptNumber: 'REC-89104' },
      { id: 'inst-103', loanId: 'loan-001', installmentNumber: 3, totalInstallments: 12, dueDate: '2026-06-15', principalAmount: 2013, interestAmount: 317, totalAmount: 2330, status: 'paid', paidDate: '2026-06-12', receiptNumber: 'REC-90412' },
      { id: 'inst-104', loanId: 'loan-001', installmentNumber: 4, totalInstallments: 12, dueDate: '2026-07-15', principalAmount: 2042, interestAmount: 288, totalAmount: 2330, status: 'paid', paidDate: '2026-07-15', receiptNumber: 'REC-91850' },
      { id: 'inst-105', loanId: 'loan-001', installmentNumber: 5, totalInstallments: 12, dueDate: '2026-08-15', principalAmount: 2072, interestAmount: 258, totalAmount: 2330, status: 'pending' },
      { id: 'inst-106', loanId: 'loan-001', installmentNumber: 6, totalInstallments: 12, dueDate: '2026-09-15', principalAmount: 2102, interestAmount: 228, totalAmount: 2330, status: 'pending' },
      { id: 'inst-107', loanId: 'loan-001', installmentNumber: 7, totalInstallments: 12, dueDate: '2026-10-15', principalAmount: 2133, interestAmount: 197, totalAmount: 2330, status: 'pending' },
      { id: 'inst-108', loanId: 'loan-001', installmentNumber: 8, totalInstallments: 12, dueDate: '2026-11-15', principalAmount: 2165, interestAmount: 165, totalAmount: 2330, status: 'pending' },
      { id: 'inst-109', loanId: 'loan-001', installmentNumber: 9, totalInstallments: 12, dueDate: '2026-12-15', principalAmount: 2197, interestAmount: 133, totalAmount: 2330, status: 'pending' },
      { id: 'inst-110', loanId: 'loan-001', installmentNumber: 10, totalInstallments: 12, dueDate: '2027-01-15', principalAmount: 2230, interestAmount: 100, totalAmount: 2330, status: 'pending' },
      { id: 'inst-111', loanId: 'loan-001', installmentNumber: 11, totalInstallments: 12, dueDate: '2027-02-15', principalAmount: 2263, interestAmount: 67, totalAmount: 2330, status: 'pending' },
      { id: 'inst-112', loanId: 'loan-001', installmentNumber: 12, totalInstallments: 12, dueDate: '2027-03-15', principalAmount: 2296, interestAmount: 34, totalAmount: 2330, status: 'pending' },
    ]
  },
  {
    id: 'loan-002',
    partner: {
      id: 'bcp',
      name: 'BCP',
      logoUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=100&auto=format&fit=crop&q=80',
    },
    loanType: 'Factoring',
    originalAmount: 10000,
    remainingAmount: 0,
    monthlyInterestRate: 0.015,
    termMonths: 3,
    disbursedDate: '2026-02-01',
    nextDueDate: 'Finalizado',
    nextDueAmount: 0,
    installmentsPaidCount: 3,
    totalInstallmentsCount: 3,
    status: 'completed',
    installments: [
      { id: 'inst-201', loanId: 'loan-002', installmentNumber: 1, totalInstallments: 3, dueDate: '2026-03-01', principalAmount: 3283, interestAmount: 150, totalAmount: 3433, status: 'paid', paidDate: '2026-03-01', receiptNumber: 'REC-77312' },
      { id: 'inst-202', loanId: 'loan-002', installmentNumber: 2, totalInstallments: 3, dueDate: '2026-04-01', principalAmount: 3332, interestAmount: 101, totalAmount: 3433, status: 'paid', paidDate: '2026-03-31', receiptNumber: 'REC-78210' },
      { id: 'inst-203', loanId: 'loan-002', installmentNumber: 3, totalInstallments: 3, dueDate: '2026-05-01', principalAmount: 3385, interestAmount: 48, totalAmount: 3433, status: 'paid', paidDate: '2026-05-01', receiptNumber: 'REC-79883' },
    ]
  }
];

interface CreditMarketplaceProps {
  salesHistory: Invoice[];
  isFinanceCertified: boolean;
  applications: CreditApplication[];
  onApply: (application: Omit<CreditApplication, 'id' | 'timestamp' | 'status'>) => void;
}

const CreditMarketplace: React.FC<CreditMarketplaceProps> = ({ salesHistory, isFinanceCertified, applications, onApply }) => {
  const [activeTab, setActiveTab] = useState<'evaluation' | 'loans_offers' | 'factoring' | 'installments' | 'history'>('evaluation');
  const [scoreResult, setScoreResult] = useState<TaxSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVigenciaVerified, setIsVigenciaVerified] = useState(false);
  const [showVigenciaModal, setShowVigenciaModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingApplication, setPendingApplication] = useState<Omit<CreditApplication, 'id' | 'timestamp' | 'status'> | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<LoanOffer | null>(null);
  const [applicationSent, setApplicationSent] = useState<string | null>(null);

  const [factoringOffers, setFactoringOffers] = useState<FactoringOffer[]>([]);
  const [suggestedLoanOffers, setSuggestedLoanOffers] = useState<LoanOffer[]>([]);

  // Active Loans & Installments state
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>(INITIAL_ACTIVE_LOANS);
  const [installmentFilter, setInstallmentFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedLoanIdFilter, setSelectedLoanIdFilter] = useState<string>('all');
  const [selectedInstallmentToPay, setSelectedInstallmentToPay] = useState<LoanInstallment | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<{ installment: LoanInstallment; loan: ActiveLoan } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'bcp' | 'bbva' | 'yape'>('bcp');

  useEffect(() => {
    let isMounted = true;
    const fetchOffersAsync = async () => {
      try {
        const facOffers = await generateFactoringOffers(salesHistory);
        if (isMounted) {
          setFactoringOffers(facOffers);
        }
        
        const score = await calculateTaxHealth(salesHistory);
        if (score) {
          const loanOffers = await generateLoanOffers(score, isFinanceCertified);
          if (isMounted) {
            setSuggestedLoanOffers([...loanOffers].sort((a, b) => b.maxAmount - a.maxAmount));
          }
        } else {
          if (isMounted) {
            setSuggestedLoanOffers([]);
          }
        }
      } catch (err) {
        console.error('[CreditMarketplace Async Error]', err);
      }
    };
    fetchOffersAsync();
    return () => {
      isMounted = false;
    };
  }, [salesHistory, isFinanceCertified]);

  // Active loans statistics
  const activeLoansStats = useMemo(() => {
    let totalOutstandingDebt = 0;
    let totalPaidCount = 0;
    let totalPendingCount = 0;
    let totalInstallmentsCount = 0;
    let nextPayment: { amount: number; dueDate: string; partnerName: string } | null = null;

    activeLoans.forEach(loan => {
      totalOutstandingDebt += loan.remainingAmount;
      loan.installments.forEach(inst => {
        totalInstallmentsCount++;
        if (inst.status === 'paid') {
          totalPaidCount++;
        } else if (inst.status === 'pending') {
          totalPendingCount++;
          if (!nextPayment || inst.dueDate < nextPayment.dueDate) {
            nextPayment = {
              amount: inst.totalAmount,
              dueDate: inst.dueDate,
              partnerName: loan.partner.name
            };
          }
        }
      });
    });

    return {
      totalOutstandingDebt,
      totalPaidCount,
      totalPendingCount,
      totalInstallmentsCount,
      nextPayment
    };
  }, [activeLoans]);

  // Flattened installments list filtered by loan and status
  const filteredInstallments = useMemo(() => {
    const list: { installment: LoanInstallment; loan: ActiveLoan }[] = [];
    activeLoans.forEach(loan => {
      if (selectedLoanIdFilter !== 'all' && loan.id !== selectedLoanIdFilter) return;

      loan.installments.forEach(inst => {
        if (installmentFilter === 'paid' && inst.status !== 'paid') return;
        if (installmentFilter === 'pending' && inst.status !== 'pending') return;
        list.push({ installment: inst, loan });
      });
    });

    return list.sort((a, b) => a.installment.dueDate.localeCompare(b.installment.dueDate));
  }, [activeLoans, selectedLoanIdFilter, installmentFilter]);

  const handleConfirmPayment = () => {
    if (!selectedInstallmentToPay) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const generatedReceipt = `REC-${Math.floor(10000 + Math.random() * 90000)}`;

      setActiveLoans(prevLoans =>
        prevLoans.map(loan => {
          if (loan.id !== selectedInstallmentToPay.loanId) return loan;

          const updatedInstallments = loan.installments.map(inst => {
            if (inst.id === selectedInstallmentToPay.id) {
              return {
                ...inst,
                status: 'paid' as const,
                paidDate: todayStr,
                receiptNumber: generatedReceipt
              };
            }
            return inst;
          });

          const newPaidCount = updatedInstallments.filter(i => i.status === 'paid').length;
          const newRemaining = Math.max(0, loan.remainingAmount - selectedInstallmentToPay.principalAmount);
          const isFullyPaid = newPaidCount === loan.totalInstallmentsCount;

          return {
            ...loan,
            remainingAmount: newRemaining,
            installmentsPaidCount: newPaidCount,
            status: isFullyPaid ? 'completed' : loan.status,
            installments: updatedInstallments
          };
        })
      );

      setIsProcessingPayment(false);
      showLocalPushNotification(
        "✅ Cuota Pagada Exitosamente",
        `Cuota ${selectedInstallmentToPay.installmentNumber}/${selectedInstallmentToPay.totalInstallments} de S/ ${selectedInstallmentToPay.totalAmount.toFixed(2)} pagada con éxito. Constancia: ${generatedReceipt}`
      );
      setSelectedInstallmentToPay(null);
    }, 1000);
  };

  const handleEvaluateCredit = async () => {
    setIsLoading(true);
    setError(null);
    setScoreResult(null);

    try {
      const result = await calculateTaxHealth(salesHistory);
      if (result) {
        setScoreResult(result);
      } else {
        setError("No hay suficientes datos para una evaluación. Se recomienda registrar ventas de al menos 3 meses distintos.");
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado al calcular el score.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
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
          Evaluación Tributaria
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
          onClick={() => setActiveTab('installments')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'installments' ? 'border-emerald-500 text-emerald-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Calendar size={18} />
          Cuotas y Préstamos Activos
          <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
            {activeLoansStats.totalPendingCount} Pendientes
          </span>
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
                { step: '1', child: <>Evaluamos tu salud tributaria con tu historial de facturación SUNAT</> },
                { step: '2', child: <>Los bancos aliados ven tu expediente previa autorización tuya</> },
                { step: '3', child: <>Te mostramos las ofertas reales a las que calificas</> },
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
              Usa tu historial de ventas registrado en SAMI para evaluar tu salud tributaria y ver ofertas simuladas de capital de trabajo.
              Mientras más ventas registres, ¡mejores serán tus oportunidades!
            </p>
            <button
              onClick={handleEvaluateCredit}
              disabled={isLoading}
              className="bg-indigo-600 text-white font-bold py-3.5 px-8 rounded-2xl hover:bg-indigo-700 disabled:bg-indigo-400 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:cursor-not-allowed"
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
                    <TaxHealthGauge scoreResult={scoreResult} />
                </div>
                <div className="lg:col-span-2">
                    <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Resumen de Comprobantes</h3>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Tus ventas promedio declaradas son de <span className="font-bold text-blue-600">S/ {scoreResult.avgMonthlySales.toLocaleString()}</span> al mes, con un estado ante SUNAT <span className="font-bold text-emerald-600">{scoreResult.complianceStatus}</span>.
                      </p>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 uppercase tracking-wider font-bold">Formalidad Electrónica</span>
                          <span className="font-bold">{scoreResult.formalityRatio}% RVIE/RSE</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${scoreResult.formalityRatio}%` }}></div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 uppercase tracking-wider font-bold">Comprobantes Verificados</span>
                          <span className="font-bold">{scoreResult.verifiedInvoicesCount} documentos</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('loans_offers')}
                        className="mt-8 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Ventas Promedio</p>
                        <p className="text-xl font-black text-blue-600 leading-none">S/ {scoreResult.avgMonthlySales.toLocaleString()}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Estado SUNAT</p>
                        <p className="text-sm font-black text-emerald-600 leading-none uppercase">{scoreResult.complianceStatus}</p>
                      </div>
                   </div>
                ) : (
                  <button 
                    onClick={() => setActiveTab('evaluation')}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    Evaluar mi Salud Tributaria <Zap size={14} className="fill-current" />
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
      ) : activeTab === 'installments' ? (
        <div className="space-y-8 animate-fade-up">
          {/* Top KPI Cards for Active Loans */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1: Deuda Total Vigente */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Deuda Total Vigente</span>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <DollarSign size={20} />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                S/ {activeLoansStats.totalOutstandingDebt.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 font-medium">
                <Briefcase size={14} className="text-blue-500" />
                {activeLoans.filter(l => l.status === 'active').length} Préstamo(s) Activo(s)
              </p>
            </div>

            {/* KPI 2: Progreso de Cuotas */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cuotas Pagadas</span>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {activeLoansStats.totalPaidCount} / {activeLoansStats.totalInstallmentsCount}
              </p>
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(activeLoansStats.totalPaidCount / activeLoansStats.totalInstallmentsCount) * 100}%` }}
                />
              </div>
            </div>

            {/* KPI 3: Próximo Vencimiento */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Próximo Pago</span>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <Clock size={20} />
                </div>
              </div>
              {activeLoansStats.nextPayment ? (
                <>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                    S/ {activeLoansStats.nextPayment.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 font-bold">
                    Vence: {new Date(activeLoansStats.nextPayment.dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })} ({activeLoansStats.nextPayment.partnerName})
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-emerald-600 mt-2">¡Sin pagos pendientes!</p>
              )}
            </div>

            {/* KPI 4: Salud Crediticia */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-2xl text-white shadow-lg shadow-emerald-600/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-200">Salud Crediticia</span>
                <ShieldCheck size={22} className="text-emerald-300" />
              </div>
              <p className="text-xl font-black text-white mt-1">100% Puntual en Pagos</p>
              <p className="text-[11px] text-emerald-100 mt-2 leading-relaxed opacity-90">
                Mantener tus cuotas al día mejora tu perfil de Salud Tributaria ante la red SBS.
              </p>
            </div>
          </div>

          {/* Active Loans Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="text-blue-600" size={20} />
              Préstamos Contratados
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeLoans.map(loan => (
                <div key={loan.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-150 dark:border-gray-700 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-xl p-2 border border-gray-100 dark:border-gray-800 flex items-center justify-center">
                        <img src={loan.partner.logoUrl} alt={loan.partner.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base">{loan.partner.name}</h4>
                        <span className="text-xs text-gray-500">{loan.loanType}</span>
                      </div>
                    </div>

                    <span className={`text-xs px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                      loan.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {loan.status === 'active' ? 'Activo' : 'Completado'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-100 dark:border-gray-700 text-xs mb-4">
                    <div>
                      <span className="text-gray-400 block font-medium">Monto Original</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">S/ {loan.originalAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Saldo Restante</span>
                      <span className="font-bold text-blue-600 font-mono">S/ {loan.remainingAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Tasa Mensual</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{(loan.monthlyInterestRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">
                      Avance de cuotas: <strong className="text-gray-900 dark:text-white">{loan.installmentsPaidCount}/{loan.totalInstallmentsCount}</strong>
                    </span>
                    <button
                      onClick={() => setSelectedLoanIdFilter(selectedLoanIdFilter === loan.id ? 'all' : loan.id)}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                    >
                      {selectedLoanIdFilter === loan.id ? 'Ver todas las cuotas' : 'Filtrar este préstamo'}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Installments Summary Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="text-emerald-600" size={20} />
                  Tabla Resumen de Cuotas Pagadas y Pendientes
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Historial consolidado de vencimientos y estado de tus créditos activos.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-900 p-1 text-xs font-bold">
                  <button
                    onClick={() => setInstallmentFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      installmentFilter === 'all' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    Todas ({activeLoansStats.totalInstallmentsCount})
                  </button>
                  <button
                    onClick={() => setInstallmentFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      installmentFilter === 'pending' ? 'bg-white dark:bg-gray-800 text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    Pendientes ({activeLoansStats.totalPendingCount})
                  </button>
                  <button
                    onClick={() => setInstallmentFilter('paid')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      installmentFilter === 'paid' ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    Pagadas ({activeLoansStats.totalPaidCount})
                  </button>
                </div>

                <select
                  value={selectedLoanIdFilter}
                  onChange={(e) => setSelectedLoanIdFilter(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los préstamos</option>
                  {activeLoans.map(l => (
                    <option key={l.id} value={l.id}>{l.partner.name} - {l.loanType}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            {filteredInstallments.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No hay cuotas que coincidan con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                      <th className="px-4 py-3">N° Cuota</th>
                      <th className="px-4 py-3">Entidad Aliada</th>
                      <th className="px-4 py-3">Fecha Vencimiento</th>
                      <th className="px-4 py-3">Desglose (Cap / Int)</th>
                      <th className="px-4 py-3">Monto Cuota</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs sm:text-sm">
                    {filteredInstallments.map(({ installment, loan }) => {
                      const isPaid = installment.status === 'paid';
                      return (
                        <tr key={installment.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                          <td className="px-4 py-4 font-mono font-bold text-gray-900 dark:text-white">
                            Cuota {installment.installmentNumber}/{installment.totalInstallments}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <img src={loan.partner.logoUrl} alt={loan.partner.name} className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                              <span className="font-bold text-gray-800 dark:text-gray-200">{loan.partner.name}</span>
                              <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                {loan.loanType}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-medium text-gray-600 dark:text-gray-300">
                            {new Date(installment.dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-4 text-xs text-gray-500">
                            Cap: S/ {installment.principalAmount.toLocaleString()} | Int: S/ {installment.interestAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 font-black font-mono text-gray-900 dark:text-white text-base">
                            S/ {installment.totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 px-2.5 py-1 rounded-full">
                                <CheckCircle2 size={13} />
                                Pagada ({installment.paidDate})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 px-2.5 py-1 rounded-full">
                                <Clock size={13} />
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {isPaid ? (
                              <button
                                onClick={() => setSelectedReceipt({ installment, loan })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg transition-all"
                              >
                                <Download size={13} />
                                Constancia
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedInstallmentToPay(installment)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95"
                              >
                                <DollarSign size={13} />
                                Pagar Cuota
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

      {/* Modal de Confirmación de Pago de Cuota */}
      {selectedInstallmentToPay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Pagar Cuota {selectedInstallmentToPay.installmentNumber}/{selectedInstallmentToPay.totalInstallments}</h3>
                  <p className="text-xs text-gray-500">Vencimiento: {selectedInstallmentToPay.dueDate}</p>
                </div>
              </div>
              <button onClick={() => setSelectedInstallmentToPay(null)} className="p-2 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Detail Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Monto Capital:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">S/ {selectedInstallmentToPay.principalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Interés Compensatorio:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">S/ {selectedInstallmentToPay.interestAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                <span>Total a Pagar:</span>
                <span className="text-emerald-600 font-mono text-base">S/ {selectedInstallmentToPay.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Selecciona Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedPaymentMethod('bcp')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                    selectedPaymentMethod === 'bcp' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600'
                  }`}
                >
                  BCP Banca
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('bbva')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                    selectedPaymentMethod === 'bbva' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600'
                  }`}
                >
                  BBVA Net
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('yape')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                    selectedPaymentMethod === 'yape' ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300' : 'border-gray-200 dark:border-gray-700 text-gray-600'
                  }`}
                >
                  Yape MYPE
                </button>
              </div>
            </div>

            <button
              onClick={handleConfirmPayment}
              disabled={isProcessingPayment}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {isProcessingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Procesando pago...
                </>
              ) : (
                <>
                  Confirmar Pago de S/ {selectedInstallmentToPay.totalAmount.toFixed(2)}
                  <Check size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Constancia de Pago */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800 p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-black text-gray-900 dark:text-white text-lg">Constancia Oficial de Pago</h3>
              <p className="text-xs text-gray-400">Comprobante electrónico de abono de cuota</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">N° Constancia:</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.installment.receiptNumber || 'REC-88219'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Entidad:</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.loan.partner.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cuota:</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.installment.installmentNumber}/{selectedReceipt.installment.totalInstallments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha Pago:</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.installment.paidDate}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-sm font-black">
                <span className="text-gray-700 dark:text-gray-300">Monto Abonado:</span>
                <span className="text-emerald-600">S/ {selectedReceipt.installment.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  alert(`Descargando comprobante ${selectedReceipt.installment.receiptNumber || 'REC-88219'}.pdf`);
                  setSelectedReceipt(null);
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                Descargar PDF
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditMarketplace;
