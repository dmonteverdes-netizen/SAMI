import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import LoanSimulator from './modules/creditos/LoanSimulator';
import PaymentMethodsBadges from './shared/ui/PaymentMethodsBadges';
import ThemeToggle from './shared/layout/ThemeToggle';
import { InteractiveSandbox } from './modules/academia/InteractiveSandbox';
import { 
  ShieldCheck, 
  TrendingUp, 
  GraduationCap, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  Award, 
  Zap, 
  BookOpen, 
  Check, 
  Compass, 
  ChevronRight, 
  Plus, 
  Users, 
  PieChart,
  Sparkles,
  Send,
  X,
  MessageSquare,
  Phone,
  Smartphone,
  Mail,
  FileText,
  Lock,
  Building2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from './core/context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { showLocalPushNotification } from './services/pushNotificationService';

// Carga diferida de TransparencyHub (arrastra TechnicalConsole) para evitar transferirlo a visitantes anónimos
const TransparencyHub = lazy(() => import('./modules/cuenta/TransparencyHub'));

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onGoToApp?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onRegisterClick, onGoToApp }) => {
  const { currentUser } = useAuth();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeHubTab, setActiveHubTab] = useState<string | null>(null);

  // AI Chatbot States
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    { role: 'model', text: '¡Hola! Bienvenido a SAMI. Soy tu asesor inteligente de facturación, impuestos y crédito comercial. Cuéntame, ¿qué consultas tienes sobre tu MYPE hoy?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest chat messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatbotOpen]);

  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    // Append user message
    const updatedMessages = [...chatMessages, { role: 'user' as const, text: textToSend }];
    setChatMessages(updatedMessages);
    if (!presetText) setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          history: updatedMessages.slice(1, -1) // Excludes first model greet
        })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor');
      }

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'model' as const, text: data.text || 'Sin respuesta' }]);
    } catch (error: any) {
      console.error("[SAMI Chat Error]", error);
      setChatMessages(prev => [...prev, { role: 'model' as const, text: 'Disculpa, tuve un percance al procesar tu solicitud. Por favor intenta de nuevo.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Estado para el prompt de instalación PWA
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBanner(false);
  };

  const handleLoginAction = () => {
    if (currentUser && onGoToApp) {
      onGoToApp();
    } else {
      onLoginClick();
    }
  };

  const benefits = [
    {
      icon: <TrendingUp size={24} className="text-indigo-600 dark:text-indigo-400" />,
      tag: "INFORMACIÓN TRIBUTARIA",
      title: "Construye tu Perfil Tributario Verificado",
      desc: "Convertimos tu facturación contable y cumplimiento fiscal en un expediente estructurado que los bancos valoran. Sube tus boletas, mantén tu negocio formal y accede a mejores créditos con instituciones aliadas.",
      bgClass: "bg-white dark:bg-slate-900/40 border-slate-150/80 dark:border-slate-800/60"
    },
    {
      icon: <Zap size={24} className="text-emerald-600 dark:text-emerald-400" />,
      tag: "100% REGULADO",
      title: "Desembolso sin Trámites Físicos",
      desc: "Olvida las visitas a sucursales o las colas interminables. Todo el proceso, desde el cálculo inicial hasta la aprobación y el abono, se gestiona desde tu terminal en minutos.",
      bgClass: "bg-white dark:bg-slate-900/40 border-slate-150/80 dark:border-slate-800/60"
    },
    {
      icon: <Award size={24} className="text-purple-650 dark:text-purple-400" />,
      tag: "ALIANZAS MÚLTIPLES",
      title: "Ofertas Competitivas Reales",
      desc: "Conectamos tu negocio con más de 12 cajas y cooperativas aliadas del Perú. No te conformes con una sola opción; deja que nuestras entidades compitan para financiarte.",
      bgClass: "bg-white dark:bg-slate-900/40 border-slate-150/80 dark:border-slate-800/60"
    }
  ];

  const financialSolutions = [
    {
      title: "Automatización Contable MYPE",
      tag: "MÓDULO CONTABLE",
      desc: "Lleva el control exacto de tus boletas y facturas emitidas y recibidas. SAMI calcula tu IGV mensual y pago a cuenta del Impuesto a la Renta de forma automatizada para que evites sorpresas con SUNAT.",
      points: ["Cálculo dinámico de IGV y Renta", "Generación de plantillas mensuales listas", "Control de compras vs. ventas con un solo clic"],
      imageBg: "from-blue-600/90 to-indigo-700/95",
      imageSrc: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80"
    },
    {
      title: "El Hub de Selección de Crédito",
      tag: "MARKETPLACE FINANCIERO",
      desc: "Nuestra tecnología analiza la salud tributaria de tu MYPE para presentarte propuestas reales pre-aprobadas que se ajustan idealmente a los plazos que buscas.",
      points: ["Pre-aprobación con tasas preferenciales", "Plazos flexibles de hasta 24 meses", "Simulador respaldado por validación de RUC"],
      imageBg: "from-emerald-600/90 to-teal-700/95",
      imageSrc: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
    },
    {
      title: "Cumplimiento y Agenda Tributaria",
      tag: "MÓDULO DE TAREAS",
      desc: "Controla los plazos de vencimiento según el último dígito de tu RUC. Agrega recordatorios inteligentes para todo tu equipo para evitar multas de SUNAT o cobros fuera de fecha.",
      points: ["Recordatorios automáticos en tu correo", "Módulos de coordinación de equipo", "Alertas proactivas de plazos límite de tributos"],
      imageBg: "from-indigo-600/90 to-violet-700/95",
      imageSrc: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80"
    }
  ];

  const academyLessons = [
    {
      category: "FINANZAS",
      title: "Dominando el IGV: Guía de Sobrevivencia MYPE",
      duration: "4 Módulos · Práctico",
      level: "Inicial",
      scoreReward: "+15 Pts Salud Financiera",
      desc: "Aprende qué gastos puedes deducir, cómo utilizar correctamente el crédito fiscal y cómo planificar tu balance mensual sin estrés."
    },
    {
      category: "CREDITOS",
      title: "Cómo Preparar tu Negocio para tu Primer Préstamo",
      duration: "3 Módulos · Video",
      level: "Intermedio",
      scoreReward: "+20 Pts Salud Financiera",
      desc: "Descubre los factores clave que evalúan los bancos y cómo usar tu facturación real como garantía de solvencia."
    },
    {
      category: "CRECIMIENTO",
      title: "Estrategias de Ventas Digitales con Cero Presupuesto",
      duration: "5 Módulos · Casos",
      level: "Intermedio",
      scoreReward: "+15 Pts Salud Financiera",
      desc: "Usa herramientas de geolocalización, redes sociales y mensajería digital para atraer nuevos clientes y potenciar tus ingresos."
    }
  ];

  const FAQs = [
    {
      q: "¿Qué tasa de interés manejan los préstamos y cómo se determina?",
      a: "Las tasas de interés para microcréditos de capital de trabajo fluctúan entre el 1.2% y 2.5% mensual (TEA de 15% a 30%), dependiendo de la constancia de tus ventas declaradas ante SUNAT. Al compartir tu información tributaria verificada con las entidades aliadas, accedes a mejores condiciones."
    },
    {
      q: "¿Cómo funciona el factoring con facturas de mis proveedores?",
      a: "Al registrar facturas por pagar o cobrar vigentes con empresas aliadas, SAMI te ayuda a adelantar el cobro en un plazo menor a 2 horas sin necesidad de cargar deudas tradicionales en INFOCORP, liberando tu flujo de caja."
    },
    {
      q: "¿Tener deudas previas en INFOCORP me impide calificar a un crédito en SAMI?",
      a: "No es un impedimento insalvable. SAMI analiza tu historial transaccional real de compras y ventas formales de los últimos meses y tu cumplimiento tributario ante SUNAT. Si tu negocio vende formalmente y con tu consentimiento compartes tu expediente, calificas a financiamiento productivo."
    },
    {
      q: "¿SAMI es un sistema de facturación electrónica o está conectado a SUNAT?",
      a: "SAMI funciona como un integrador inteligente conectado a PSEs autorizados y consultas de padrón SUNAT para procesar tu información transaccional de manera ágil y segura. Esto nos permite estructurar expedientes tributarios y consolidar alertas automatizadas de vencimiento fiscal para evitar multas."
    },
    {
      q: "¿Qué seguridad legal y de privacidad ofrece la plataforma?",
      a: "Operamos bajo un entorno cifrado con SSL/TLS 1.3 de grado bancario. Cumplimos rigurosamente con la Ley N° 29733 de Protección de Datos Personales. Tu información tributaria solo se comparte con instituciones financieras aliadas previa autorización explícita de tu parte."
    }
  ];

  return (
    <div id="landing-page-root" className="bg-white dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 min-h-screen antialiased selection:bg-indigo-600 selection:text-white">
      {showInstallBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-indigo-600 text-white px-4 py-3.5 flex items-center justify-between animate-slide-in font-sans shadow-lg">
          <div className="flex items-center gap-3">
            <Smartphone size={22} className="text-indigo-100 flex-shrink-0 animate-pulse" />
            <div>
              <p className="font-black text-sm tracking-tight">Instala la App Oficial de SAMI</p>
              <p className="text-white/85 text-xs text-left">Acceso acelerado sin saldo de datos regulado por la SBS</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleInstall} className="bg-white text-indigo-600 font-extrabold text-xs px-4.5 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              Instalar PWA
            </button>
            <button onClick={() => setShowInstallBanner(false)} className="text-white/75 hover:text-white p-2 cursor-pointer transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER NAVIGATION ── */}
      <header id="landing-nav" className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-900 transition-colors">
        <nav aria-label="Navegación principal" className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex justify-between items-center gap-4">
          
          {/* Logo */}
          <a href="#landing-hero" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck size={20} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-tighter text-slate-900 dark:text-white">SAMI</span>
              <span className="text-[8px] font-black tracking-[0.2em] text-slate-400 uppercase">Fintech MYPE</span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] font-black uppercase tracking-wider">
            {[
              { label: 'Inicio', href: '#landing-hero' },
              { label: 'Productos', href: '#solutions-section' },
              { label: 'Créditos', href: '#loan-simulator-section' },
              { label: 'Academia', href: '#academy-section' },
              { label: 'Quiénes Somos', href: '#about-section' },
              { label: 'Preguntas', href: '#faq-section' },
            ].map(item => (
              <a
                key={item.label}
                href={item.href}
                onClick={e => {
                  e.preventDefault();
                  document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-[#F1F5F9]/60 dark:hover:bg-slate-900/40 transition-all"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Mobile Hamburger + CTA */}
          <div className="flex items-center gap-3">
            <ThemeToggle isCollapsed={true} />
            <button
              onClick={handleLoginAction}
              className="hidden sm:block text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-3 py-2"
            >
              {currentUser ? 'Ir al Panel' : 'Iniciar Sesión'}
            </button>
            <button
              onClick={onRegisterClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-lg shadow-indigo-500/15 hover:scale-[1.01] active:scale-[0.98] whitespace-nowrap cursor-pointer"
            >
              Comenzar Gratis
            </button>
          </div>
        </nav>
      </header>

      {/* ── HERO SECTION ── */}
      <section id="landing-hero" className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-950 grid-pattern-slate border-b border-slate-100/80 dark:border-slate-900/45">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-40 dark:opacity-30">
          <div className="absolute top-10 right-10 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-400/15 to-brand-500/10 dark:from-indigo-650/10 dark:to-brand-650/10 rounded-full blur-[130px] animate-pulse-glow" />
          <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-gradient-to-br from-emerald-450/15 to-teal-500/10 dark:from-emerald-650/10 dark:to-teal-650/10 rounded-full blur-[110px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          
          {/* Centered Badge with pulse dot */}
          <div className="inline-flex items-center gap-2.5 px-4.5 py-2 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-2xs font-extrabold uppercase tracking-[0.18em] rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping" />
            <span className="flex items-center gap-1.5"><Award size={13} /> SAMI: DE PERUANOS PARA PERUANOS</span>
          </div>
          
          {/* Majestic Majestic Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tighter leading-[1.07] max-w-5xl mx-auto mb-8 font-sans">
            Automatiza tu contabilidad y accede a <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-emerald-500 dark:from-brand-400 dark:via-indigo-400 dark:to-emerald-400">créditos reales</span> sin papeleos.
          </h1>
          
          {/* spacious focused paragraph */}
          <p className="text-sm md:text-base lg:text-lg text-slate-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
            La primera solución fintech peruana diseñada para transformar tus boletas y facturas emitidas en tu pasaporte de liquidez. Declara tus impuestos sin complicaciones de manera automatizada y pre-califica a ofertas reales en menos de 2 minutos.
          </p>

          {/* Centered Checklist of top fintech benefits */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 max-w-4xl mx-auto mb-12">
            {[
              'Cálculo automático de IGV y Renta',
              'Perfil Tributario Verificado ante SUNAT',
              'Plazos flexibles de hasta 24 meses',
              'Conexión segura oficial (Ley N° 29733)'
            ].map((item, id) => (
              <div key={id} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/40 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Center-aligned Primary buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
            <button 
              id="hero-primary-cta"
              onClick={onRegisterClick}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider px-10 py-5 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.015] active:scale-[0.98] cursor-pointer text-center"
            >
              Regístrate Gratis
            </button>
            <a 
              href="#loan-simulator-section"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-indigo-600 dark:hover:text-indigo-400 py-3.5 transition-colors group text-center"
            >
              Simular mi Línea MYPE <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          {/* Trusted cooperative partners seals */}
          <div className="pt-8 border-t border-slate-100 dark:border-slate-900/50 max-w-4xl mx-auto mb-16">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cooperativas y Entidades Afiliadas SBS</p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mt-4">
              {['Fintech Veloz', 'Caja Confianza', 'Cooperativa SAMI Link', 'Caja Solidez MYPE'].map((b) => (
                <span key={b} className="text-xs font-extrabold text-slate-450 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default">{b}</span>
              ))}
            </div>
          </div>

          {/* Symmetrical Quick Metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto pt-10 border-t border-slate-100 dark:border-slate-900/50">
            <div className="text-center py-2 px-1">
              <p className="text-3xl lg:text-4xl font-black text-slate-910 dark:text-white tracking-tight m-0">S/ 4.5M+</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1.5 font-black">Créditos Colocados</p>
            </div>
            <div className="text-center py-2 px-1">
              <p className="text-3xl lg:text-4xl font-black text-slate-910 dark:text-white tracking-tight m-0">12+</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1.5 font-black">Cajas y Entidades Socias</p>
            </div>
            <div className="text-center py-2 px-1">
              <p className="text-3xl lg:text-4xl font-black text-slate-910 dark:text-white tracking-tight m-0">100%</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1.5 font-black">Trámites Digitales</p>
            </div>
            <div className="text-center py-2 px-1">
              <p className="text-3xl lg:text-4xl font-black text-slate-910 dark:text-white tracking-tight m-0">1.8 Min</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1.5 font-black">Pre-aprobación con RUC</p>
            </div>
          </div>

          {/* Centered Payment Methods badging bar */}
          <div className="max-w-5xl mx-auto mt-14 bg-white/40 dark:bg-slate-900/40 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-850 shadow-xs backdrop-blur-xs">
            <PaymentMethodsBadges title="Métodos de pago y desembolso integrados v2026" />
          </div>

        </div>
      </section>

      {/* ── BENEFICIOS SECTION ── */}
      <section id="benefits-section" className="py-14 md:py-24 bg-white dark:bg-gray-950 border-y border-gray-100 dark:border-gray-900 grid-pattern">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 block mb-3 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full w-max mx-auto border border-indigo-100/50 dark:border-indigo-900/30">EL VALOR DE ESTAR EN SAMI</span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.12] mb-4">
              ¿Por qué las MYPEs confiables crecen mejor con nuestra plataforma?
            </h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
              SAMI brinda solidez, transparencia e integración inteligente con los mejores aliados financieros de Perú.
            </p>
          </div>
 
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((b, i) => (
              <div 
                key={i} 
                className={`flex flex-col justify-between p-8 md:p-10 rounded-[2.5rem] border transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(99,102,241,0.06)] dark:hover:shadow-[0_20px_50px_rgba(99,102,241,0.12)] hover:border-indigo-500/20 dark:hover:border-indigo-500/10 ${b.bgClass}`}
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center shadow-lg shadow-gray-200/20 dark:shadow-none mb-6 group-hover:scale-110 transition-transform duration-300">
                    {b.icon}
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-[#94A3B8] dark:text-slate-500 uppercase">{b.tag}</span>
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white mt-2.5 mb-3.5 tracking-tight leading-tight">{b.title}</h3>
                  <p className="text-[13px] md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">{b.desc}</p>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-2 text-2xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                    <CheckCircle2 size={15} className="text-emerald-500" /> Control Integral Activo
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUCIONES FINANCIERAS SECTION ── */}
      <section id="solutions-section" className="py-12 md:py-16 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-900/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 block mb-2 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full w-max mx-auto border border-emerald-100/50 dark:border-emerald-900/30 font-mono">DISEÑADO PARA TU REALIDAD</span>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
              Nuestras Soluciones Financieras
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed font-normal max-w-2xl mx-auto">
              SAMI te da tranquilidad con la SUNAT, platita al instante para tus mercaderías y cuentas claras de forma automática. Todo lo que tu negocio necesita para crecer, sin rodeos ni enredos.
            </p>
          </div>

          <div className="space-y-6">
            {financialSolutions.map((s, idx) => (
              <div 
                key={idx} 
                className={`grid lg:grid-cols-2 gap-6 md:gap-8 items-center p-5 md:p-6 bg-white dark:bg-slate-900/20 border border-slate-150/60 dark:border-slate-800 rounded-3xl transition-all duration-300 ${
                  idx % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Text Block */}
                <div className={`space-y-4 ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <span className="text-[8px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/35 px-2.5 py-1 rounded-md uppercase border border-emerald-100/30 dark:border-emerald-900/10 font-mono">
                    {s.tag}
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{s.title}</h3>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal pr-4">{s.desc}</p>
                  
                  <ul className="space-y-1.5 pt-1">
                    {s.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 text-2xs md:text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span className="w-4.5 h-4.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/40 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5">
                          <Check size={10} strokeWidth={3.5} />
                        </span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Graphic Box */}
                <div className={`h-48 md:h-56 rounded-2xl bg-gradient-to-br ${s.imageBg} p-6 flex flex-col justify-end text-white overflow-hidden relative shadow-lg shadow-indigo-50/10 dark:shadow-none group ${
                  idx % 2 === 1 ? 'lg:order-1' : ''
                }`}>
                  <img 
                    src={s.imageSrc} 
                    alt={s.title} 
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-35 pointer-events-none group-hover:scale-102 transition-transform duration-700"
                  />
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
                  <div className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 z-10">
                    {idx === 0 ? <PieChart size={20} /> : idx === 1 ? <CreditCard size={20} /> : <Users size={20} />}
                  </div>
                  <div className="relative z-10 space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-80 font-mono">SAMI Plataformas Inteligentes</p>
                    <p className="text-base md:text-lg font-black tracking-tight leading-tight">Optimizado para {s.title.split(' ')[2] || 'Crecer'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACADEMIA SAMI SECTION ── */}
      <section id="academy-section" className="py-16 md:py-24 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 block mb-3 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full w-max mx-auto border border-indigo-100/50 dark:border-indigo-900/30">EDUCACIÓN EN ACCIÓN</span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.12]">
              Academia SAMI: Aprende y Crece
            </h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-4 leading-relaxed font-normal max-w-2xl mx-auto">
              SAMI no solo te ofrece herramientas contables y financiamiento, también te enseña cómo administrarlos. Cada módulo completado fortalece la gestión tributaria y financiera de tu negocio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {academyLessons.map((l, i) => (
              <div 
                key={i} 
                className="bg-slate-50 dark:bg-slate-900/30 border border-slate-150/70 dark:border-slate-800/80 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between transition-all hover:scale-[1.01] hover:border-indigo-300 dark:hover:border-indigo-900/50 hover:shadow-[0_15px_40px_-5px_rgba(99,102,241,0.05)]"
              >
                <div>
                  <div className="flex justify-between items-center gap-4 mb-6">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md">
                      {l.category}
                    </span>
                    <span className="text-[9px] font-black tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-150/20">
                      {l.scoreReward}
                    </span>
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug mb-3 hover:text-indigo-600 transition-colors tracking-tight">
                    {l.title}
                  </h4>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal mb-4 pr-1">
                    {l.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-2xs font-extrabold uppercase tracking-widest text-slate-400">
                  <span>{l.duration}</span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    {l.level} <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALES ── */}
      <section className="py-16 bg-white dark:bg-slate-950 border-b border-gray-100/50 dark:border-gray-900">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-brand-600 mb-2">Lo que dicen nuestros usuarios</p>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white" style={{ letterSpacing: '-0.02em' }}>
              MYPEs que ya están creciendo
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Rosa M.',
                business: 'Bodega Los Pinos · Comas',
                quote: 'Antes me asustaba el tema de SUNAT. Ahora SAMI me dice exactamente cuánto debo y cuándo. Me salvó de una multa.',
                initials: 'RM',
                bg: 'bg-gradient-to-tr from-blue-500 to-indigo-600'
              },
              {
                name: 'Jorge V.',
                business: 'Pollería El Buen Sabor · SJL',
                quote: 'Pedí un préstamo de S/ 15,000 a través de un banco aliado de SAMI. Me lo aprobaron en 3 días, sin tanto papeleo.',
                initials: 'JV',
                bg: 'bg-gradient-to-tr from-emerald-500 to-teal-600'
              },
              {
                name: 'Carmen L.',
                business: 'Minimarket Santa Rosa · Villa El Salvador',
                quote: 'Los cursos de la Academia SAMI me enseñaron a separar las platas del negocio de las de mi casa. Eso cambió todo.',
                initials: 'CL',
                bg: 'bg-gradient-to-tr from-indigo-500 to-purple-600'
              }
            ].map((t, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${t.bg} flex items-center justify-center text-white text-xs font-black shadow-md tracking-wider`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-sm">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.business}</p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed italic">"{t.quote}"</p>
                <div className="flex mt-3">
                  {[1,2,3,4,5].map(s => <span key={s} className="text-amber-400 text-sm">★</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SIMULATOR INTERACTIVE CONTAINER SECTION ── */}
      <section id="loan-simulator-section" className="py-12 md:py-16 bg-white dark:bg-slate-950 border-b border-slate-100/60 dark:border-slate-900/60 relative overflow-hidden">
        {/* Abstract design elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 dark:bg-indigo-950/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-200/20 dark:bg-teal-950/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-600 block mb-2 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full w-max mx-auto border border-indigo-100/50 dark:border-indigo-900/30 font-mono">SIMULACIÓN PRE-APROBADA EN VIVO</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
              ¿Cuánto necesitas para hacer crecer tu MYPE hoy?
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed font-normal max-w-2xl mx-auto">
              Usa nuestra calculadora predictiva basada en riesgo MYPE. Simula tu cuota ideal, ingresa tu RUC y descubre tu tasa preferencial al instante.
            </p>
          </div>

          <div className="w-full">
            <LoanSimulator />
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section id="faq-section" className="py-16 md:py-24 bg-white dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 block mb-3 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full w-max mx-auto border border-indigo-100/50 dark:border-indigo-900/30">DUDAS COMUNES</span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.12]">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-4">
            {FAQs.map((faq, i) => (
              <div 
                key={i} 
                className="border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/30 overflow-hidden transition-all duration-300"
              >
                <button 
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full px-6 py-5 text-left flex justify-between items-center gap-4 text-xs md:text-sm font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-800/40"
                >
                  <span>{faq.q}</span>
                  <span className="text-blue-600 dark:text-blue-400 text-lg font-black shrink-0 transition-transform duration-200">
                    {activeFaq === i ? '−' : '+'}
                  </span>
                </button>
                
                {activeFaq === i && (
                  <div className="px-6 pb-6 text-2xs md:text-xs font-semibold text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUIÉNES SOMOS ── */}
      <section id="about-section" className="py-14 md:py-20 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 block bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full w-max border border-indigo-100/50 dark:border-indigo-900/30">QUIÉNES SOMOS</span>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.12]">
                Nacimos para darle poder financiero a la MYPE peruana
              </h2>
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                SAMI es una Fintech peruana fundada en 2024 con una misión clara: democratizar el acceso al crédito y los servicios financieros para los micro y pequeños empresarios del Perú y América Latina.
              </p>
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                Somos aliados estratégicos de las mejores cajas, cooperativas y entidades financieras nacionales. Operamos con total transparencia bajo la Ley N° 29733 de Protección de Datos Personales y los estándares de seguridad digital más exigentes del mercado.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-4">
                {[
                  { val: '2024', label: 'Año de fundación' },
                  { val: 'Lima', label: 'Sede principal' },
                  { val: 'Perú + LATAM', label: 'Cobertura' },
                ].map(s => (
                  <div key={s.label} className="text-center p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-150/70 dark:border-slate-800/85">
                    <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white font-mono">{s.val}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-black mt-1 leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xs font-black uppercase tracking-widest text-[#94A3B8] mb-6 flex items-center gap-1.5 leading-none">
                <Users size={14} className="text-indigo-600 animate-pulse" />
                Nuestro Equipo Fundador
              </h3>
              {[
                { 
                  name: 'Diego Monteverde', 
                  role: 'CEO & Co-Fundador', 
                  image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&h=150&q=85',
                  bio: 'Ex-consultor de banca corporativa BCP y experto en estructuración de riesgos MYPE.'
                },
                { 
                  name: 'Jean Paul Nedeff', 
                  role: 'CTO & Co-Fundador', 
                  image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=85',
                  bio: 'Ingeniero de Software especializado en integraciones contables seguras e infraestructura financiera.'
                },
                { 
                  name: 'Jose Rosado', 
                  role: 'CFO & Director Fintech', 
                  image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=85',
                  bio: 'Ex-analista de tesorería institucional y especialista en fondos de inversión pymes.'
                },
              ].map(m => (
                <div key={m.name} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900/35 rounded-3xl border border-slate-150/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-900/40 hover:shadow-[0_12px_24px_rgba(99,102,241,0.03)] transition-all group duration-300">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200/50 dark:border-slate-800/80 shadow-inner animate--fade-in">
                    <img 
                      src={m.image} 
                      alt={m.name} 
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover grayscale brightness-95 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                    />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight">{m.name}</p>
                      <span className="text-[8px] bg-indigo-55/70 dark:bg-slate-800 text-indigo-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-black uppercase">SAMI Co-op</span>
                    </div>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-black tracking-wide uppercase mt-0.5">{m.role}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal font-normal">{m.bio}</p>
                  </div>
                </div>
              ))}
              <a
                href="#"
                onClick={e => { e.preventDefault(); onRegisterClick(); }}
                className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-805 mt-5 hover:translate-x-1.5 transition-transform"
              >
                <Compass size={13} /> Ver vacantes actuales e integrarse →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── SAMI EN PERÚ Y LATAM ── */}
      <section id="latam-section" className="py-14 md:py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 block mb-3">COBERTURA</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tighter mb-10">
            SAMI en Perú y América Latina
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { code: 'PE', country: 'Perú', status: 'Operativo', desc: 'Lima, Arequipa, Trujillo, Cusco y 24 regiones', color: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900' },
              { code: 'CO', country: 'Colombia', status: 'Q3 2026', desc: 'Bogotá, Medellín, Cali — expansión planificada', color: 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900' },
              { code: 'AR', country: 'Argentina', status: 'Q4 2026', desc: 'Buenos Aires y Córdoba — en negociación', color: 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900' },
              { code: 'MX', country: 'México', status: '2027', desc: 'CDMX, Monterrey y Guadalajara — hoja de ruta planificada', color: 'border-gray-200 bg-gray-50 dark:bg-gray-800/40 dark:border-gray-800' },
            ].map(c => (
              <div key={c.country} className={`p-6 rounded-3xl border ${c.color} text-left transition-all hover:scale-[1.02]`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100">{c.country}</span>
                  <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-200/50 dark:bg-gray-800 px-1.5 py-0.5 rounded">{c.code}</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${c.status === 'Operativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {c.status}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACTO / POSTULA / APIs ── */}
      <section id="contact-section" className="py-14 md:py-20 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 block mb-3">SOPORTE Y COMPORTAMIENTO COMERCIAL</span>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tighter">¿Hablamos hoy?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Building2 className="text-blue-600" size={24} />,
                title: 'Para MYPEs',
                desc: 'Regístrate gratis de forma automatizada y comienza a fiscalizar tus compras hoy mismo.',
                action: 'Crear Cuenta',
                color: 'bg-blue-600 hover:bg-blue-750',
                onClick: onRegisterClick,
              },
              {
                icon: <Building2 className="text-indigo-600" size={24} />,
                title: 'Entidades Socias',
                desc: 'Valida reportes dinamizados de scoring MYPE y accede a expedientes digitales a través de nuestra API integrada.',
                action: 'Ver API Docs',
                color: 'bg-indigo-600 hover:bg-indigo-750',
                onClick: () => setActiveHubTab('api-docs'),
              },
              {
                icon: <Zap className="text-indigo-600" size={24} />,
                title: 'Trabaja con Nosotros',
                desc: 'Buscamos talentos comprometidos con el despegue comercial de la pequeña empresa peruana.',
                action: 'Ver Vacantes',
                color: 'bg-indigo-600 hover:bg-indigo-700',
                onClick: () => setActiveHubTab('trabajo'),
              },
              {
                icon: <Sparkles className="text-amber-500 animate-pulse" size={24} />,
                title: 'SAMI Bot IA de Ventas',
                desc: 'Consulta de inmediato nuestro bot inteligente. Simula crédito tributario y resuelve dudas SBS.',
                action: 'Iniciar Chatbot IA',
                color: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold',
                onClick: () => setChatbotOpen(true),
              },
            ].map(c => (
              <div key={c.title} className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 flex flex-col justify-between hover:shadow-lg transition-all group duration-300">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-xs mb-4 group-hover:scale-105 transition-transform duration-300">
                    {c.icon}
                  </div>
                  <h3 className="font-extrabold text-gray-900 dark:text-white text-sm mb-2">{c.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">{c.desc}</p>
                </div>
                <button
                  onClick={c.onClick}
                  className={`mt-6 w-full ${c.color} text-xs font-black uppercase tracking-wider py-3 px-4 rounded-2xl transition-all active:scale-[0.95]`}
                >
                  {c.action}
                </button>
              </div>
            ))}
          </div>
          
          {/* Información de Contacto Directo y Datos Fiscales */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Building2 size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Dirección Fiscal</p>
                <p className="text-xs font-black text-gray-800 dark:text-white leading-normal">Av. Canaval y Moreyra 380</p>
                <p className="text-[10px] text-gray-500 font-semibold leading-normal">San Isidro, Lima, Perú</p>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <Phone size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Teléfono Central</p>
                <p className="text-xs font-black text-gray-800 dark:text-white leading-normal">(01) 512-3200</p>
                <p className="text-[10px] text-gray-500 font-semibold leading-normal">Lunes a Viernes 9am - 6pm</p>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <MessageSquare size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">WhatsApp Ventas/Soporte</p>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 leading-normal">
                  <a href="https://wa.me/51987654321" target="_blank" rel="noopener noreferrer" className="hover:underline">+51 987 654 321</a>
                </p>
                <p className="text-[10px] text-gray-500 font-semibold leading-normal">Asistencia directa MYPE</p>
              </div>
            </div>
          </div>
          
          {/* API / Developer Section */}
          <div className="mt-10 p-6 bg-gray-900 dark:bg-black rounded-3xl border border-gray-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400 mb-1">API PARA DESARROLLADORES</p>
                <p className="text-white font-extrabold text-lg">Integra la API de Evaluación Tributaria MYPE</p>
                <p className="text-gray-400 text-sm mt-1">REST API · OAuth 2.0 · Documentación OpenAPI 3.0</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={onLoginClick} className="bg-indigo-600 text-white text-xs font-black uppercase tracking-wider px-5 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
                  Obtener API Key
                </button>
                <button onClick={onLoginClick} className="bg-white/10 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl hover:bg-white/20 transition-colors border border-white/20">
                  Ver Docs
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CALL TO ACTION ── */}
      <section id="landing-final-cta" className="py-14 md:py-20 bg-[#0F172A] text-white relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1E293B]/20 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 -translate-y-1/2 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center space-y-8">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-tight">
            Únete a más de 500 MYPEs que ya toman el timón de su futuro.
          </h2>
          <p className="text-sm md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Obtén tu diagnóstico de facturación inmediata, planifica tus obligaciones tributarias y califica para ofertas de desembolso rápido. Sin costos de mantenimiento ocultos.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button 
              onClick={onRegisterClick}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm uppercase tracking-wider px-10 py-5 rounded-2xl transition-all shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Crear mi Cuenta Gratis
            </button>
            <button 
              onClick={handleLoginAction}
              className="w-full sm:w-auto bg-transparent border border-white/20 hover:bg-white/5 text-white font-semibold text-xs uppercase tracking-widest px-8 py-5 rounded-2xl transition-colors"
            >
              Ingresar como Invitado
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="landing-footer" className="bg-[#090D16] border-t border-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Alianzas y Certificaciones Reales */}
          <div className="border-b border-gray-900 pb-10 mb-10 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-6 font-mono">REGULACIÓN, HOMOLOGACIÓN Y ENTIDADES COLABORADORAS</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 items-center">
              {[
                { name: 'SUNAT', role: 'Homologación de Compras', action: 'Consulta de Padrón Activa' },
                { name: 'SBS PERÚ', role: 'Fideicomisos Custodiados', action: 'Resoluciones de Fideicomiso SBS' },
                { name: 'FINTECH PERÚ', role: 'Asociación Fintech del Perú', action: 'Gremio de Innovación SBS' },
                { name: 'PRODUCE', role: 'Ministerio de la Producción', action: 'Programa Nacional de Pymes' }
              ].map(logo => (
                <div key={logo.name} className="flex flex-col p-4 rounded-2xl bg-[#111827]/40 border border-gray-900 hover:border-gray-850 text-left transition-colors font-sans cursor-default group">
                  <span className="text-sm font-black text-white tracking-wider font-mono flex items-center gap-1">
                    <Building2 size={14} className="text-blue-500 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                    {logo.name}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1 font-bold leading-tight">{logo.role}</span>
                  <span className="text-[8px] font-mono font-black text-gray-600 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                    <ShieldCheck size={10} className="text-emerald-500 animate-pulse" />
                    {logo.action}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center"><ShieldCheck size={16}/></div>
                <span className="font-extrabold text-white text-lg tracking-tight">SAMI</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed mb-5">Plataforma financiera autorizada para micro y pequeñas empresas del Perú y América Latina.</p>
              <div className="flex gap-2.5">
                {[
                  { icon: <ExternalLink size={15} />, href: 'https://linkedin.com/' },
                  { icon: <Smartphone size={15} />, href: 'https://play.google.com/' },
                  { icon: <Mail size={15} />, href: 'mailto:soporte@sami.pe' },
                  { icon: <MessageSquare size={15} />, href: 'https://wa.me/' }
                ].map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => window.open(s.href, '_blank')}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all active:scale-[0.95]"
                  >
                    {s.icon}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Links */}
            {[
              { title: 'Producto', links: ['Dashboard', 'Contabilidad', 'Salud Tributaria', 'Marketplace', 'Academia', 'Simulador'] },
              { title: 'Empresa', links: ['Quiénes Somos', 'Equipo', 'SAMI en LATAM', 'Prensa', 'Trabaja con Nosotros', 'Blog'] },
              { title: 'Legal & API', links: ['Términos de Uso', 'Privacidad', 'Ley 29733', 'API Docs', 'Estado del Sistema', 'Seguridad'] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <a 
                        href="#" 
                        onClick={e => {
                          e.preventDefault();
                          const sectionMap: Record<string, string> = {
                            'Contabilidad': '#solutions-section',
                            'Salud Tributaria': '#benefits-section',
                            'Marketplace': '#loan-simulator-section',
                            'Academia': '#academy-section',
                            'Simulador': '#loan-simulator-section',
                            'SAMI en LATAM': '#latam-section',
                          };
                          
                          const hubTabMap: Record<string, string> = {
                            'Quiénes Somos': 'equipo',
                            'Equipo': 'equipo',
                            'Prensa': 'prensa',
                            'Trabaja con Nosotros': 'trabajo',
                            'Blog': 'blog',
                            'Términos de Uso': 'terminos',
                            'Privacidad': 'privacidad',
                            'Ley 29733': 'ley-29733',
                            'API Docs': 'api-docs',
                            'Estado del Sistema': 'estado',
                            'Seguridad': 'seguridad'
                          };

                          const targetSection = sectionMap[link];
                          const targetHubTab = hubTabMap[link];

                          if (targetSection) {
                            document.querySelector(targetSection)?.scrollIntoView({ behavior: 'smooth' });
                          } else if (targetHubTab) {
                            setActiveHubTab(targetHubTab);
                          } else if (link === 'Dashboard') {
                            handleLoginAction();
                          }
                        }} 
                        className="text-gray-500 hover:text-white text-xs transition-colors font-medium flex items-center gap-1 group"
                      >
                        <ChevronRight size={10} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all font-black text-blue-500" />
                        {link}
                      </a >
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-900 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} SAMI S.A.C. · RUC 20612345678 · Todos los derechos reservados</p>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px]">🔒 TLS 1.3</span>
              <span className="font-mono text-[10px]">🛡️ AES-256</span>
              <span className="font-mono text-[10px]">PE Ley 29733</span>
              <span className="font-mono text-[10px]">⚡ 99.9% uptime</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── INTERACTIVE AI CHATBOT CONTAINER ── */}
      <AnimatePresence>
        {chatbotOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            id="ai-chatbot-window"
            className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2rem] border border-slate-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden font-sans"
          >
            {/* Chatbot Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Sparkles size={18} className="text-emerald-300 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">SAMI Bot IA</p>
                  <p className="text-[10px] text-white/80 font-bold flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    Asesor Financiero 24/7
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setChatbotOpen(false)}
                className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chatbot Messages List */}
            <div className="flex-1 max-h-[300px] overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/40 text-left">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-2xl max-w-[85%] text-xs font-semibold leading-relaxed shadow-xs ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 rounded-bl-none border border-slate-150 dark:border-gray-700'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-slate-150 dark:border-gray-750 p-4 rounded-2xl rounded-bl-none text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce inline-block" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s] inline-block" />
                    <span className="w-1.5 text-blue-500 animate-bounce [animation-delay:0.4s] inline-block">.</span>
                    Procesando consulta...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chatbot Quick Suggestions */}
            <div className="p-3 border-t border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
              {[
                '¿Cómo contratar el servicio de SAMI?',
                '¿Precio de los planes y tarifas?',
                '¿Cómo crear nuevos usuarios?',
                '¿Cómo dar de baja la cuenta?',
                '¿Cómo abrir un ticket de soporte?'
              ].map(suggest => (
                <button
                  key={suggest}
                  onClick={() => handleSendChatMessage(suggest)}
                  className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/45 px-2.5 py-1 rounded-full border border-blue-100/40 transition-colors text-left"
                >
                  {suggest}
                </button>
              ))}
            </div>

            {/* Chatbot Input Box */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }}
              className="p-3 border-t border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe tu consulta financiera o fiscal..."
                disabled={chatLoading}
                className="flex-1 bg-slate-50 dark:bg-gray-850 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatInput.trim()}
                className="bg-blue-600 text-white rounded-xl p-2.5 flex items-center justify-center hover:bg-blue-755 transition-colors disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TRANSPARENCY HUB OVERLAY PORTAL (Carga Diferida) ── */}
      <AnimatePresence>
        {activeHubTab && (
          <Suspense
            fallback={
              <div 
                role="status" 
                aria-live="polite" 
                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md p-6 text-center"
              >
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p className="text-sm font-bold text-white tracking-wide">Cargando Centro de Transparencia...</p>
                <span className="sr-only">Cargando información y documentación técnica del centro de transparencia</span>
              </div>
            }
          >
            <TransparencyHub 
              activeTab={activeHubTab} 
              onClose={() => setActiveHubTab(null)} 
              isLoggedIn={!!currentUser}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ── MOBILE STICKY BOTTOM ACTION BAR (Prestamyype & Solventa Style) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 p-3 sm:hidden shadow-2xl flex items-center gap-2">
        <button
          onClick={() => {
            const simEl = document.getElementById('loan-simulator-card');
            if (simEl) {
              simEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              handleLoginAction();
            }
          }}
          className="flex-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-black text-xs py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Zap size={15} className="fill-slate-950" />
          <span>Pre-evaluar mi RUC</span>
          <ArrowRight size={14} />
        </button>

        <button
          onClick={() => setChatbotOpen(true)}
          className="bg-slate-800 border border-slate-700 text-emerald-400 p-3 rounded-xl hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center shrink-0"
          aria-label="Asesor IA SAMI"
        >
          <Sparkles size={18} />
        </button>
      </div>

      {/* Floating launcher trigger for desktop/tablet */}
      {!chatbotOpen && (
        <motion.button
          onClick={() => setChatbotOpen(true)}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer border border-white/10 group"
        >
          <Sparkles size={20} className="text-white group-hover:rotate-15 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border border-white animate-pulse" />
        </motion.button>
      )}
    </div>
  );
};

export default LandingPage;
