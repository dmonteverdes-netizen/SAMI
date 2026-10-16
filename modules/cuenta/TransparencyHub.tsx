import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Terminal, 
  Search, 
  FileText, 
  BookOpen, 
  Users, 
  Briefcase, 
  Cpu, 
  Compass, 
  Check, 
  ChevronRight, 
  ExternalLink,
  Send,
  Upload,
  Clock,
  Play,
  Activity,
  AlertTriangle,
  Loader2,
  ThumbsUp,
  RefreshCw,
  Share2,
  History,
  CheckCircle2,
  XCircle,
  Info,
  Calendar,
  Building2,
  Sliders,
  FileSearch,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TechnicalConsole from './TechnicalConsole';
import {
  fetchConsentStatus,
  grantConsent,
  revokeConsent,
  fetchConsentHistory,
  fetchTransmissionLogs,
  submitArcoRequest,
  fetchArcoRequestByCode,
  fetchArcoRequestsByRuc,
  ConsentGrant,
  ConsentEvent,
  DataTransmissionLog,
  ArcoRequest,
  ConsentPurpose,
  ArcoRightType,
  CONSENT_PURPOSES_META,
  ARCO_RIGHTS_META,
  ARCO_STATUS_LABELS
} from '../../services/consentService';

interface TransparencyHubProps {
  activeTab: string;
  onClose: () => void;
  isLoggedIn?: boolean;
  ruc?: string;
}

// ──────────────────────────────────────────────
// STATIC ARTICLE DATA FOR THE BLOG TAB
// ──────────────────────────────────────────────
interface Article {
  id: string;
  title: string;
  category: 'impuestos' | 'finanzas' | 'creditos' | 'esenciales';
  date: string;
  readTime: string;
  author: string;
  summary: string;
  content: string[];
}

const BLOG_ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: '¿Cómo fortalecer tu Salud Tributaria facturando todas tus ventas con boletas y facturas?',
    category: 'creditos',
    date: '24 May 2026',
    readTime: '5 min',
    author: 'Ing. Diego Monteverde',
    summary: 'El historial de ventas declaradas ante SUNAT es tu mejor carta de presentación para la banca aliada. Conoce cómo el algoritmo de SAMI premia tu orden comercial y te da acceso a capital de trabajo.',
    content: [
      'Para una Micro o Pequeña Empresa (MYPE) en el Perú, el acceso al crédito tradicional siempre ha sido una barrera de entrada casi imposible de superar. Los bancos comerciales suelen exigir dos años de estados financieros auditados, avales físicos y una cantidad inmensa de papeles comerciales. ¿La alternativa? Acudir al financiamiento informal, cuyas tasas usureras asfixian el crecimiento natural de cualquier negocio.',
      'En SAMI nacimos para cambiar esta realidad. Nuestro algoritmo estructura tu reporte de "Salud Tributaria", un expediente alternativo que traduce tu orden fiscal en confianza ante entidades financieras aliadas. Pero, ¿cómo se evalúa y de qué manera puedes optimizarlo?',
      'El factor fundamental es la consistencia y formalidad transaccional. Cada boleta o factura de venta que emites, y cada factura de compra que exiges a tus proveedores autorizados por SUNAT, se registran de manera segura en nuestra plataforma. El sistema analiza la regularidad de tus ingresos, la estacionalidad de tus compras y el comportamiento de pago de tus obligaciones fiscales.',
      'Si exiges facturas de compra y mantienes un flujo de ventas formalizado, el algoritmo de riesgo te asocia dentro del "Tier Excelente" (habitualmente por encima de los 700 puntos), lo que nos permite negociar por ti tasas de interés preferenciales (que fluctúan entre el 1.2% y 2.5% mensual) con cajas nacionales y cooperativas integradas.',
      'Nuestra recomendación clave para este trimestre: consolida tu facturación electrónica. Asegúrate de declarar a través de PSEs autorizados y evita las transacciones sin rastro bancario o fiscal, pues cada venta formalizada es cemento para tu próximo desembolso de capital de trabajo.'
    ]
  },
  {
    id: 'art-2',
    title: 'IGV Justo: Qué es, plazos de prórroga y cómo ayuda a tu MYPE a tener liquidez',
    category: 'impuestos',
    date: '10 Abr 2026',
    readTime: '4 min',
    author: 'Dra. Jimena Alarcón',
    summary: 'La SUNAT permite postergar el pago de la liquidación mensual de IGV hasta por tres meses. Te explicamos los requisitos vigentes y cómo usarlo estratégicamente para no detener tus compras de inventario.',
    content: [
      'Uno de los dolores de cabeza más recurrentes de los emprendedores peruanos es el descalce de flujo de caja. Vendes tus mercaderías a crédito a un plazo de 60 o 90 días, pero te ves obligado a pagar el Impuesto General a las Ventas (IGV) de esa transacción el mes siguiente. Esto genera que tengas que "prestarle" liquidez al Estado antes de haber cobrado físicamente por tu trabajo.',
      'Frente a esta situación existe una herramienta legal sumamente valiosa para las microempresas: el "IGV Justo" (Ley N° 30524). Esta norma permite a las MYPES con ventas anuales que no superen las 1,700 UIT posponer el pago del IGV hasta por un plazo adicional de 90 días naturales posteriores a su fecha de vencimiento original.',
      'Para acogerte, solo debes marcar la opción correspondiente en tu declaración mensual de SUNAT (Formulario Virtual 621) al momento de presentar tu tributo mensual. No necesitas solicitudes administrativas ni trámites engorrosos.',
      'Sin embargo, debes cumplir con ciertos criterios estrictos para que la prórroga sea procedente, como por ejemplo: no tener deudas tributarias exigibles coactivamente mayores a 1 UIT, no estar bajo procesos penales por defraudación fiscal, y que el representante legal no sea catalogado como omiso.',
      'En el panel de contabilidad predictiva de SAMI, automatizamos este monitoreo. Te alertamos si cumples con las condiciones tributarias óptimas del mes y te indicamos el impacto positivo real que representa postergar el pago del IGV para inyectar dicha liquidez en mercaderías de rápido retorno comercial, garantizando las cuotas ideales del negocio sin caer en intereses tributarios por moras. ¡El conocimiento es poder fiscal!'
    ]
  },
  {
    id: 'art-3',
    title: 'Regulación del Impuesto a la Renta 2026: ¿Régimen MYPE Tributario o Régimen General?',
    category: 'impuestos',
    date: '02 Mar 2026',
    readTime: '6 min',
    author: 'Dra. Jimena Alarcón',
    summary: 'Elegir el régimen fiscal adecuado en tu SUNAT define tu supervivencia financiera. Comparamos las tasas acumulativas de renta y los límites de ingresos netos anuales para que tomes la mejor decisión.',
    content: [
      'Al constituir una empresa o dar de alta tu RUC 10 con negocio en el Perú, SUNAT te obligará a seleccionar un régimen de impuesto a la renta. Esta decisión estructurará no solo cuántos tributos pagarás anualmente, sino también la complejidad de tus libros contables obligatorios y tu nivel de auditoría.',
      'Muchos emprendedores inician por default en el Régimen General pensando que es la única opción de crecimiento, sufriendo tasas impositivas planas del 29.5% sobre su utilidad neta anual. No obstante, para las pequeñas empresas el Régimen MYPE Tributario (RMT) representa un alivio financiero incomparable.',
      'Bajo el Régimen MYPE Tributario (RMT), aplicable para negocios cuyos ingresos netos no superen las 1,700 UIT al año, los pagos de renta son escalonados del siguiente modo: por la porción de utilidad neta anual de hasta 15 UIT, la tasa impositiva es de apenas el 10%. Solo la porción de utilidad neta que exceda las 15 UIT tributa bajo la tasa ordinaria del 29.5%.',
      'Esto significa que si tu MYPE obtiene una utilidad neta de S/ 70,000 en el año, pagarás S/ 7,000 de renta en el RMT, mientras que en el Régimen General pagarías S/ 20,650 por el mismo desempeño comercial. La diferencia de S/ 13,650 se queda en tu caja y la puedes usar de forma directa para contratar más equipo o ampliar tu local.',
      'En la plataforma inteligente de SAMI preparamos resúmenes analíticos semanales. Proyectamos de forma dinámica el cierre de tu ejercicio fiscal cruzando ventas y compras con nuestro algoritmo predictivo, advirtiéndote con tiempo si tus ingresos anuales se aproximan al límite de las 1,700 UIT para que el cambio de régimen tributario no te tome por sorpresa y tu rentabilidad neta quede completamente blindada.'
    ]
  }
];

// ──────────────────────────────────────────────
// STATIC PRESS RELEASES DATA
// ──────────────────────────────────────────────
interface PressRelease {
  id: string;
  title: string;
  date: string;
  subtitle: string;
  content: string;
  source: string;
}

const PRESS_RELEASES: PressRelease[] = [
  {
    id: 'press-1',
    title: 'SAMI clasifica como la Fintech MYPE más segura del año 2026',
    date: '18 Mayo 2026',
    subtitle: 'La Asociación Peruana de Empresas Fintech destaca el aporte tecnológico de SAMI en el scoring alternativo y blindaje de datos transaccionales, integrando protocolos TLS 1.3 y cifrado AES-255.',
    content: 'La Asociación de Fintechs de América Latina (FintechLATAM) ha calificado el modelo de pre-evaluación crediticia de SAMI MYPE como un referente internacional de innovación inclusiva. El uso de microdatos transaccionales cruzados con padrones de cumplimiento formales permite evaluar a comercios informales en proceso de formalización sin exigir garantías colaterales, democratizando el capital de trabajo de forma masiva en el Perú.',
    source: 'Diario Gestión'
  },
  {
    id: 'press-2',
    title: 'Alianza Estratégica con Cajas Municipales coloca más de S/ 4.5 Millones a tasas dinámicas',
    date: '12 Febrero 2026',
    subtitle: 'SAMI integra su pasarela de scoring predictivo con las principales entidades supervisadas del país para canalizar microcréditos digitales listos en menos de 2 horas.',
    content: 'Con el objetivo de inyectar liquidez de rápida acción a las MYPES en campaña escolar y de fiestas nacionales, SAMI anunció la suscripción de acuerdos de integración de servicios tecnológicos SBS con un consorcio de 6 cajas municipales peruanas. Los usuarios de SAMI podrán cotizar y activar ofertas crediticias pre-evaluadas utilizando únicamente su historial tributario, eliminando el papeleo presencial y centralizando la oferta bancaria.',
    source: 'Diario El Comercio'
  },
  {
    id: 'press-3',
    title: 'SAMI asegura ronda semilla de inversión por US$ 1.2M para expandir operaciones',
    date: '04 Noviembre 2025',
    subtitle: 'Capitalistas de riesgo regionales apuestan por la plataforma que unifica contabilidad tributaria simplificada y microcréditos inteligentes para el emprendedor sub-bancarizado de LATAM.',
    content: 'SAMI S.A.C., la startup de origen peruano que asiste a los emprendedores en su ordenamiento comercial y precalificación financiera, cerró con éxito su primera ronda de financiamiento liderada por fondos de venture capital de México e inversores ángeles del sector bancario peruano. El capital será destinado íntegramente a perfeccionar los algoritmos de IA de riesgo tributario, optimizar el visor de OCR electrónico y robustecer los sistemas de blindaje de datos.',
    source: 'TechCrunch LATAM'
  }
];

// ──────────────────────────────────────────────
// CORE SYSTEM STATUS PARAMS (REAL SERVICE DEMO)
// ──────────────────────────────────────────────
interface SystemService {
  name: string;
  status: 'operational' | 'degraded' | 'offline';
  latency: string;
  uptime: string;
}

export const TransparencyHub: React.FC<TransparencyHubProps> = ({ activeTab, onClose, isLoggedIn = false, ruc: propRuc }) => {
  const [currentTab, setCurrentTab] = useState<string>(activeTab || 'terminos');
  const [searchQuery, setSearchQuery] = useState('');

  // ── RUC & CONSENT MANAGEMENT STATE (LEY N° 29733) ──
  const [activeRuc, setActiveRuc] = useState<string>(() => {
    if (propRuc && propRuc.length === 11) return propRuc;
    try {
      const stored = localStorage.getItem('sami_current_mype_ruc') || localStorage.getItem('sami_active_ruc');
      if (stored && stored.length === 11) return stored;
    } catch {
      // Ignore
    }
    return '20601234567';
  });

  const [privacySubTab, setPrivacySubTab] = useState<'consentimientos' | 'historial' | 'transmisiones' | 'arco'>('consentimientos');
  const [consentGrants, setConsentGrants] = useState<ConsentGrant[]>([]);
  const [consentHistory, setConsentHistory] = useState<ConsentEvent[]>([]);
  const [transmissionLogs, setTransmissionLogs] = useState<DataTransmissionLog[]>([]);
  const [isConsentLoading, setIsConsentLoading] = useState(false);
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});
  const [consentBannerMessage, setConsentBannerMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // States for ARCO
  const [arcoForm, setArcoForm] = useState<{
    ruc: string;
    fullName: string;
    email: string;
    rightType: ArcoRightType;
    details: string;
  }>({
    ruc: activeRuc,
    fullName: '',
    email: '',
    rightType: 'ACCESO',
    details: ''
  });
  const [arcoSubmittedCase, setArcoSubmittedCase] = useState<ArcoRequest | null>(null);
  const [arcoLoading, setArcoLoading] = useState(false);
  const [arcoFormError, setArcoFormError] = useState<string | null>(null);

  // States for ARCO Lookup
  const [arcoSearchCode, setArcoSearchCode] = useState('');
  const [arcoSearchResult, setArcoSearchResult] = useState<ArcoRequest | null>(null);
  const [arcoSearchLoading, setArcoSearchLoading] = useState(false);
  const [arcoSearchError, setArcoSearchError] = useState<string | null>(null);
  const [rucArcoList, setRucArcoList] = useState<ArcoRequest[]>([]);

  // Load consent data on tab or RUC change
  useEffect(() => {
    if (currentTab === 'ley-29733') {
      loadAllConsentData(activeRuc);
    }
  }, [currentTab, activeRuc, privacySubTab]);

  const loadAllConsentData = async (targetRuc: string) => {
    if (!targetRuc || targetRuc.length !== 11) return;
    setIsConsentLoading(true);
    try {
      if (privacySubTab === 'consentimientos') {
        const grants = await fetchConsentStatus(targetRuc);
        setConsentGrants(grants);
      } else if (privacySubTab === 'historial') {
        const history = await fetchConsentHistory(targetRuc);
        setConsentHistory(history);
      } else if (privacySubTab === 'transmisiones') {
        const logs = await fetchTransmissionLogs(targetRuc);
        setTransmissionLogs(logs);
      } else if (privacySubTab === 'arco') {
        const list = await fetchArcoRequestsByRuc(targetRuc);
        setRucArcoList(list);
      }
    } catch (err: any) {
      console.warn('[TransparencyHub] Error loading consent records:', err);
    } finally {
      setIsConsentLoading(false);
    }
  };

  const handleToggleConsent = async (purpose: ConsentPurpose, currentStatus: string) => {
    setActionLoadingMap(prev => ({ ...prev, [purpose]: true }));
    setConsentBannerMessage(null);
    try {
      if (currentStatus === 'ACTIVE') {
        await revokeConsent(activeRuc, purpose);
        setConsentBannerMessage({
          text: `Consentimiento para "${CONSENT_PURPOSES_META[purpose].shortLabel}" revocado de forma inmediata sin intermediarios.`,
          type: 'success'
        });
      } else {
        await grantConsent(activeRuc, purpose);
        setConsentBannerMessage({
          text: `Consentimiento para "${CONSENT_PURPOSES_META[purpose].shortLabel}" otorgado de forma válida y demostrable.`,
          type: 'success'
        });
      }
      // Refresh grants and history
      const updatedGrants = await fetchConsentStatus(activeRuc);
      setConsentGrants(updatedGrants);
    } catch (err: any) {
      setConsentBannerMessage({
        text: `No se pudo actualizar el consentimiento: ${err.message || 'Error de conexión'}`,
        type: 'error'
      });
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [purpose]: false }));
    }
  };

  // Handle ARCO Form submission (Real API connected!)
  const handleArcoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arcoForm.ruc || !arcoForm.fullName || !arcoForm.email || !arcoForm.details) {
      setArcoFormError('Por favor complete todos los campos obligatorios.');
      return;
    }
    setArcoLoading(true);
    setArcoFormError(null);
    try {
      const created = await submitArcoRequest({
        ruc: arcoForm.ruc,
        fullName: arcoForm.fullName,
        email: arcoForm.email,
        rightType: arcoForm.rightType,
        details: arcoForm.details
      });
      setArcoSubmittedCase(created);
      // Also update RUC list
      setRucArcoList(prev => [created, ...prev]);
    } catch (err: any) {
      setArcoFormError(err.response?.data?.message || err.message || 'Error al registrar la solicitud ARCO.');
    } finally {
      setArcoLoading(false);
    }
  };

  // Handle ARCO Code Search
  const handleSearchArcoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arcoSearchCode.trim()) return;
    setArcoSearchLoading(true);
    setArcoSearchError(null);
    setArcoSearchResult(null);
    try {
      const result = await fetchArcoRequestByCode(arcoSearchCode.trim().toUpperCase());
      setArcoSearchResult(result);
    } catch (err: any) {
      setArcoSearchError(err.response?.data?.message || 'No se encontró ningún trámite con ese código de expediente.');
    } finally {
      setArcoSearchLoading(false);
    }
  };

  const resetArcoForm = () => {
    setArcoForm({
      ruc: activeRuc,
      fullName: '',
      email: '',
      rightType: 'ACCESO',
      details: ''
    });
    setArcoSubmittedCase(null);
    setArcoFormError(null);
  };

  // States for API Simulator
  const [apiRucInput, setApiRucInput] = useState('20601234567');
  const [apiScope, setApiScope] = useState('read:tax_health');
  const [isClientTokenGenerating, setIsClientTokenGenerating] = useState(false);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [isApiExecuting, setIsApiExecuting] = useState(false);
  const [apiResponseJson, setApiResponseJson] = useState<any>(null);

  // States for Blog Search & Read
  const [blogSearch, setBlogSearch] = useState('');
  const [selectedBlogCat, setSelectedBlogCat] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // States for Careers Form
  const [careersForm, setCareersForm] = useState({
    fullName: '',
    email: '',
    position: 'Fullstack Engineer',
    linkedin: '',
    filename: ''
  });
  const [careersLoading, setCareersLoading] = useState(false);
  const [careersSubmitted, setCareersSubmitted] = useState(false);

  // States for live system monitoring (real fetch!)
  const [liveUptimeMetric, setLiveUptimeMetric] = useState('99.98%');
  const [activeServices, setActiveServices] = useState<SystemService[]>([
    { name: 'SAMI Core Engine', status: 'operational', latency: '24ms', uptime: '99.99%' },
    { name: 'SUNAT Sync Padrones API', status: 'operational', latency: '40ms', uptime: '99.94%' },
    { name: 'SAMI AI Risk OCR Gateway', status: 'operational', latency: '110ms', uptime: '99.85%' },
    { name: 'SBS Bank Cooperative Port', status: 'operational', latency: '35ms', uptime: '100%' },
    { name: 'Database Cluster & Keys', status: 'operational', tracking: 'AES-256', latency: '8ms', uptime: '99.99%' } as any
  ]);
  const [livePingResult, setLivePingResult] = useState<string | null>(null);
  const [livePingLoading, setLivePingLoading] = useState(false);

  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  // Handle API Token Generation
  const handleGenerateApiToken = () => {
    setIsClientTokenGenerating(true);
    setTimeout(() => {
      setIsClientTokenGenerating(false);
      setApiToken(`sami_oauth2_t_dev_68efb.${Math.random().toString(36).substring(2, 15)}`);
      setApiResponseJson(null);
    }, 1000);
  };

  // Handle API live endpoint simulation execution
  const handleExecuteApiCall = async () => {
    if (!apiToken) return;
    setIsApiExecuting(true);
    
    // Attempt local API fetch if possible (simulate real sunat validation endpoint call)
    try {
      const isRucValid = apiRucInput.length === 11 && /^\d+$/.test(apiRucInput);
      
      // Artificial delay for visual impact of live calculation
      await new Promise(resolve => setTimeout(resolve, 1400));
      
      if (!isRucValid) {
        setApiResponseJson({
          error: "Bad Request",
          message: "RUC inválido. Debe poseer estrictamente 11 dígitos numéricos peruanos.",
          code: 400,
          timestamp: new Date().toISOString()
        });
      } else {
        const factorArray = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        let sum = 0;
        for (let i = 0; i < 10; i++) {
          sum += parseInt(apiRucInput[i]) * factorArray[i];
        }
        const remainder = sum % 11;
        let digit = 11 - remainder;
        if (digit === 10) digit = 0;
        if (digit === 11) digit = 1;
        const lastDigit = parseInt(apiRucInput[10]);
        const isValidModulus = digit === lastDigit;

        const calculatedCompliance = isValidModulus ? 95 : 65;
        const calculatedTier = calculatedCompliance >= 80 ? "Formal / Al Día" : "En Proceso de Regularización";
        const complianceStatus = calculatedCompliance >= 80 ? "Al día" : "Pendiente";

        if (apiScope === 'read:tax_health') {
          setApiResponseJson({
            businessRuc: apiRucInput,
            legalName: apiRucInput.startsWith('10') ? "EMPRENDEDOR INDIVIDUAL S.A." : "SAMI TECH S.A.C.",
            authorizedScopes: ["read:tax_health"],
            securityStandard: "Ley 29733 Compliant",
            compliancePercentage: calculatedCompliance,
            tier: calculatedTier,
            complianceStatus: complianceStatus,
            lastCalculated: new Date().toISOString(),
            status: "HABIDO",
            activityState: "ACTIVO"
          });
        } else {
          setApiResponseJson({
            businessRuc: apiRucInput,
            legalName: apiRucInput.startsWith('10') ? "EMPRENDEDOR INDIVIDUAL S.A." : "SAMI TECH S.A.C.",
            authorizedScopes: ["read:tax_health", "read:financials"],
            compliancePercentage: calculatedCompliance,
            avgMonthlySales: isValidModulus ? 12500.50 : 3800.00,
            avgMonthlyPurchases: isValidModulus ? 7800.20 : 2500.00,
            taxCompliance: "CORRECT",
            sunatState: "BUEN_CONTRIBUYENTE",
            taxHealthTrend: "Upward",
            currencyISO: "PEN",
            historicalMonthsTracked: 6
          });
        }
      }
    } catch (e: any) {
      setApiResponseJson({
        error: "Internal Server Error",
        message: e.message || "Falla al conectar con el gateway de expedientes tributarios de SAMI.",
        code: 500
      });
    } finally {
      setIsApiExecuting(false);
    }
  };

  // Careers CV Drag & drop trigger
  const handleCvSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCareersForm(prev => ({ ...prev, filename: e.target.files![0].name }));
    }
  };

  const handleCareersSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!careersForm.fullName || !careersForm.email || !careersForm.filename) return;
    setCareersLoading(true);
    setTimeout(() => {
      setCareersLoading(false);
      setCareersSubmitted(true);
    }, 1200);
  };

  // Live Ping check against real backend `/api/health`!
  const handleLiveConnectionPing = async () => {
    setLivePingLoading(true);
    setLivePingResult(null);
    const startTime = Date.now();
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      const latency = Date.now() - startTime;
      setLivePingResult(`✅ Conexión establecida de forma exitosa. Status Code: 200 OK. Latencia real: ${latency}ms. Respuesta del host: ${JSON.stringify(data)}`);
    } catch (err: any) {
      setLivePingResult(`⚠️ No se pudo concretar el comando de ping real hacia el servidor: ${err.message || err}`);
    } finally {
      setLivePingLoading(false);
    }
  };

  // Filter Blog posts
  const filteredArticles = BLOG_ARTICLES.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(blogSearch.toLowerCase()) || 
                          art.summary.toLowerCase().includes(blogSearch.toLowerCase());
    const matchesCat = selectedBlogCat === 'all' || art.category === selectedBlogCat;
    return matchesSearch && matchesCat;
  });

  // Sidebar Menu list
  const MENU_ITEMS = [
    { id: 'terminos', label: 'Términos de Uso', icon: <FileText size={16} /> },
    { id: 'privacidad', label: 'Política de Privacidad', icon: <Lock size={16} /> },
    { id: 'ley-29733', label: 'Datos Personales (PE)', icon: <ShieldCheck size={16} /> },
    { id: 'transferencia-tecnica', label: 'Handover & Backend Docs', icon: <Terminal size={16} /> },
    { id: 'api-docs', label: 'API Partner Docs', icon: <Terminal size={16} /> },
    { id: 'blog', label: 'Blog MYPE', icon: <BookOpen size={16} /> },
    { id: 'prensa', label: 'Prensa y Medios', icon: <Compass size={16} /> },
    { id: 'equipo', label: 'Nuestro Equipo', icon: <Users size={16} /> },
    { id: 'trabajo', label: 'Trabaja con Nosotros', icon: <Briefcase size={16} /> },
    ...(isLoggedIn ? [
      { id: 'estado', label: 'Salud del Sistema', icon: <Activity size={16} /> },
      { id: 'seguridad', label: 'Blindaje Técnico', icon: <Cpu size={16} /> },
      { id: 'consola-tecnica', label: 'Consola del Service Worker', icon: <Terminal size={16} /> },
    ] : [])
  ];

  return (
    <div id="transparency-hub-portal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 md:p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="w-full h-full max-w-6xl md:h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
      >
        {/* TOP HUB HEADER */}
        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              S
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black tracking-tight flex items-center gap-2">
                Centro de Transparencia y Recursos
                <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/45 text-indigo-650 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-md border border-indigo-100/30 font-mono select-none">
                  Ley N° 29733 Compliant
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Información fehaciente, contratos comerciales legales, recursos de desarrollo e integraciones bancarias certificadas.</p>
            </div>
          </div>
          <button 
            id="close-hub-btn"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-slate-800/40 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors active:scale-[0.95] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* HUB BODY SPLIT */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-950">
          
          {/* SIDEBAR NAVIGATION */}
          <div className="w-full md:w-64 bg-slate-50/50 dark:bg-slate-900/10 border-b md:border-b-0 md:border-r border-slate-150 dark:border-slate-800 p-4 overflow-x-auto md:overflow-y-auto flex md:flex-col gap-1 shrink-0 no-scrollbar">
            {MENU_ITEMS.map((item) => (
              <button
                id={`hub-tab-btn-${item.id}`}
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setSelectedArticle(null); // Reset reading panel on tab click
                }}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-black tracking-wide shrink-0 transition-all cursor-pointer ${
                  currentTab === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* RIGHT SIDE DETAIL VIEWPORT */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white dark:bg-slate-900/15" id="hub-details-view">
            
            {/* TAB: TERMINOS DE USO */}
            {currentTab === 'terminos' && (
              <div className="space-y-6 max-w-3xl animate--fade-in max-w-4xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500 font-mono">CONTRATO COMERCIAL DIGITAL</p>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Términos y Condiciones Generales de Uso</h2>
                <p className="text-xs text-slate-400 font-mono">Última actualización: 28 de Mayo de 2026</p>
                
                <div className="space-y-5 text-xs md:text-sm text-slate-500 dark:text-slate-300 leading-relaxed font-normal">
                  <p>
                    Bienvenido a SAMI Plataforma Inteligente. El presente acuerdo regula el acceso y uso de los servicios digitales puestos a disposición por 
                    <strong> SAMI S.A.C. (RUC 20612345678)</strong>, con domicilio fiscal en Av. Canaval y Moreyra 380, San Isidro, provincia y departamento de Lima, Perú.
                  </p>
                  
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight pt-2 border-t border-slate-100 dark:border-slate-800">1. Aceptación del Consentimiento</h3>
                  <p>
                    Al registrarse en la plataforma, validar su RUC 10 o 20, y asociar voluntariamente claves SOL o cargar reportes complementarios, el titular de la MYPE manifiesta de forma libre, expresa e informada su aceptación de estos términos. La negativa a aceptarlos impedirá culminar el alta de la cuenta y el perfilamiento crediticio respectivo.
                  </p>

                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight pt-2 border-t border-slate-100 dark:border-slate-800">2. Naturaleza del Servicio y Consulta Gubernamental</h3>
                  <p>
                    SAMI procesa electrónicamente comprobantes de compraventa mediante pasarelas automatizadas autorizadas para formular estimaciones de liquidación tributaria preliminarias. Asimismo, realiza consultas dinámicas a fuentes públicas, específicamente los padrones SUNAT y de deudores de la SBS, para generar la evaluación de <strong>Salud Tributaria</strong>.
                  </p>
                  <p className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 text-indigo-900 dark:text-indigo-300 text-xs font-semibold leading-relaxed">
                    🛑 <strong>Aviso Importante:</strong> SAMI no es una entidad financiera directa, banco autorizado para captar depósitos públicos, ni emisor de dinero electrónico. Los microcréditos y servicios de descuento de facturas (factoring) mostrados en el Simulador son provistos única y exclusivamente por entidades financieras aliadas supervisadas por la SBS que cooperan dentro de nuestro Marketplace.
                  </p>

                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight pt-2 border-t border-slate-100 dark:border-slate-800">3. Precisión de las Declaraciones y de la Data</h3>
                  <p>
                    El usuario se compromete de forma juramentada a velar por la autenticidad y coincidencia fiscal de cada archivo XML o PDF de compras que ingrese en el portal. La presentación de documentos alterados, anulados intencionalmente ante SUNAT post-evaluación, o referidos a transacciones inexistentes faculta a SAMI S.A.C. a revocar su acceso y reportar la alerta a las centrales de riesgo socias.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: PRIVACIDAD */}
            {currentTab === 'privacidad' && (
              <div className="space-y-6 max-w-3xl animate--fade-in max-w-4xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] uppercase font-black tracking-widest text-emerald-500 font-mono">CONFIDENCIALIDAD DE GRADO BANCARIO</p>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Política de Privacidad y Tratamiento Opt-In</h2>
                <p className="text-xs text-slate-400 font-mono">Última actualización: 28 de Mayo de 2026</p>

                <div className="space-y-5 text-xs md:text-sm text-slate-500 dark:text-slate-300 leading-relaxed font-normal">
                  <p>
                    En SAMI S.A.C. salvaguardamos tu información comercial. Su tratamiento se rige estrictamente por normas éticas avanzadas de banca digital y seguridad criptográfica.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 text-indigo-600 mb-2 font-black text-xs uppercase font-mono tracking-tight">
                        <Lock size={15} /> Seguridad Criptográfica
                      </div>
                      <p className="text-2xs text-slate-500 dark:text-slate-400 leading-normal">
                        Ciframos tus datos personales y fiscales en reposo mediante el estándar <strong>AES-256</strong>. La transmisión de datos por internet procesa exclusivamente a través del puerto seguro de ingreso HTTPS bajo TLS 1.3.
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 text-emerald-600 mb-2 font-black text-xs uppercase font-mono tracking-tight">
                        <ShieldCheck size={15} /> Cero Venta de Información
                      </div>
                      <p className="text-2xs text-slate-500 dark:text-slate-400 leading-normal">
                        SAMI nunca vende, arrienda ni cede las bases transaccionales de compras o ventas de tu MYPE a terceros con fines publicitarios. Tu información contable es estrictamente privada.
                      </p>
                    </div>
                  </div>

                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight pt-2 border-t border-slate-100 dark:border-slate-800">1. Qué Datos Recopilamos</h3>
                  <p>
                    Recopilamos: Dirección de correo, teléfono móvil de contacto, número de RUC de la empresa, nombre o Razón Social, nombre del representante legal asociado a SUNAT, importes globales registrados en facturas de compras, y parámetros de scoring autocalculados.
                  </p>

                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight pt-2 border-t border-slate-100 dark:border-slate-800">2. Flujo de Consentimiento MYPE</h3>
                  <p>
                    Tus datos son compartidos con los bancos aliados integrados en nuestro Marketplace **solo si** tú decides cotizar un crédito y autorizas explícitamente el envío del scoring preliminar al banco seleccionado. Dicho consentimiento es granular y revocable en cualquier momento desde el perfil de usuario.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: LEY 29733 (PROTECCION DE DATOS PERSONALES, CONSENTIMIENTO Y ARCO) */}
            {currentTab === 'ley-29733' && (
              <div className="space-y-6 animate--fade-in max-w-4xl">
                {/* Header Title */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">
                        LEY N° 29733 • PROTECCIÓN DE DATOS PERSONALES (PERÚ)
                      </p>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      Centro de Consentimiento y Privacidad MYPE
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Gestión previa, libre, expresa, inequívoca e informada de tus datos fiscales y personales.
                    </p>
                  </div>

                  {/* RUC Badge & Switcher */}
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Building2 size={14} className="text-slate-500" />
                    <div className="text-left">
                      <p className="text-[9px] uppercase font-bold text-slate-400 font-mono">RUC del Titular</p>
                      <input
                        type="text"
                        maxLength={11}
                        value={activeRuc}
                        onChange={(e) => setActiveRuc(e.target.value.replace(/\D/g, ''))}
                        className="bg-transparent text-xs font-black text-slate-800 dark:text-slate-100 font-mono outline-none w-28"
                        title="Modifique el RUC para consultar o gestionar consentimientos de otra razón social"
                      />
                    </div>
                    <button
                      onClick={() => loadAllConsentData(activeRuc)}
                      title="Refrescar datos del RUC"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                    >
                      <RefreshCw size={13} className={isConsentLoading ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <button
                    onClick={() => setPrivacySubTab('consentimientos')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      privacySubTab === 'consentimientos'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sliders size={14} />
                    <span>Consentimiento Granular</span>
                  </button>

                  <button
                    onClick={() => setPrivacySubTab('historial')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      privacySubTab === 'historial'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <History size={14} />
                    <span>Historial de Auditoría</span>
                  </button>

                  <button
                    onClick={() => setPrivacySubTab('transmisiones')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      privacySubTab === 'transmisiones'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Share2 size={14} />
                    <span>Transmisión a Terceros</span>
                  </button>

                  <button
                    onClick={() => setPrivacySubTab('arco')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      privacySubTab === 'arco'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileSearch size={14} />
                    <span>Trámites ARCO</span>
                  </button>
                </div>

                {/* Banner message if any */}
                {consentBannerMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
                    consentBannerMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}>
                    <span>{consentBannerMessage.text}</span>
                    <button onClick={() => setConsentBannerMessage(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* ── SUB-VIEW 1: CONSENTIMIENTO GRANULAR ── */}
                {privacySubTab === 'consentimientos' && (
                  <div className="space-y-4">
                    <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-2.5">
                      <Info size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                        <strong>Principio de Consentimiento Granular:</strong> Cada finalidad de tratamiento es independiente. Revocar la autorización para compartir datos con bancos <strong>no afecta</strong> tu facturación electrónica ni el uso básico del sistema. La revocación es inmediata y no requiere intervención humana.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {Object.values(CONSENT_PURPOSES_META).map((purposeMeta) => {
                        const grant = consentGrants.find(g => g.purpose === purposeMeta.id);
                        const isActive = grant ? grant.status === 'ACTIVE' : true; // Default opt-in
                        const isLoading = !!actionLoadingMap[purposeMeta.id];

                        return (
                          <div
                            key={purposeMeta.id}
                            className={`p-4 md:p-5 rounded-2xl border transition-all ${
                              isActive
                                ? 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-sm'
                                : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-850 opacity-90'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-1.5 max-w-xl">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {purposeMeta.shortLabel}
                                  </span>
                                  {isActive ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                      <CheckCircle2 size={10} /> Consentimiento Vigente
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                      <XCircle size={10} /> Revocado / Inactivo
                                    </span>
                                  )}
                                </div>

                                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                  {purposeMeta.title}
                                </h3>

                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {purposeMeta.description}
                                </p>

                                <p className="text-[11px] text-slate-400 font-mono">
                                  <strong>Base legal:</strong> {purposeMeta.legalBasis}
                                </p>

                                {!isActive && (
                                  <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                                    ⚠️ <strong>Efecto de la revocación:</strong> {purposeMeta.impactWhenRevoked}
                                  </div>
                                )}
                              </div>

                              <div className="shrink-0 pt-1">
                                {isActive ? (
                                  <button
                                    onClick={() => handleToggleConsent(purposeMeta.id, 'ACTIVE')}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                                  >
                                    {isLoading ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                                    <span>Revocar Inmediatamente</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleConsent(purposeMeta.id, 'REVOKED')}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                                  >
                                    {isLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                    <span>Otorgar Consentimiento</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── SUB-VIEW 2: HISTORIAL INMUTABLE DE AUDITORÍA ── */}
                {privacySubTab === 'historial' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                      <History size={16} className="text-slate-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong>Trazabilidad demostrable (Art. 13 Ley 29733):</strong> Todo otorgamiento o revocación queda asentado de manera inmutable con estampa de tiempo, dirección IP de origen y versión de la política de privacidad aplicable.
                      </p>
                    </div>

                    {isConsentLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Loader2 size={24} className="animate-spin text-indigo-600" />
                        <span className="text-xs font-bold">Cargando bitácora de auditoría...</span>
                      </div>
                    ) : consentHistory.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <p className="text-xs text-slate-500 font-bold">No se registran eventos de consentimiento en el historial para este RUC.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-3">Fecha y Hora</th>
                              <th className="p-3">Finalidad</th>
                              <th className="p-3">Acción</th>
                              <th className="p-3">Versión Política</th>
                              <th className="p-3">Origen IP / Agente</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {consentHistory.map((ev) => (
                              <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                                <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                                  {new Date(ev.createdAt).toLocaleString('es-PE')}
                                </td>
                                <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                                  {CONSENT_PURPOSES_META[ev.purpose]?.shortLabel || ev.purpose}
                                </td>
                                <td className="p-3">
                                  {ev.action === 'GRANTED' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      Otorgado
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                      Revocado
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-mono text-slate-500">v{ev.privacyPolicyVersion}</td>
                                <td className="p-3 font-mono text-[11px] text-slate-400 truncate max-w-[150px]" title={ev.userAgent || ''}>
                                  {ev.ipAddress || '127.0.0.1'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── SUB-VIEW 3: TRANSMISIÓN A TERCEROS ("¿A quién le dieron mis datos?") ── */}
                {privacySubTab === 'transmisiones' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                      <Share2 size={16} className="text-slate-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong>Transparencia B2B de Transmisión:</strong> Cada vez que tu expediente tributario o información de facturación es compartida de forma cifrada con una entidad financiera aliada para cotizar financiamiento, queda registrada aquí para tu control absoluto.
                      </p>
                    </div>

                    {isConsentLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Loader2 size={24} className="animate-spin text-indigo-600" />
                        <span className="text-xs font-bold">Consultando registros de transmisión...</span>
                      </div>
                    ) : transmissionLogs.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <ShieldCheck size={28} className="mx-auto text-emerald-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Cero Transmisiones No Autorizadas
                        </h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          No se registra ninguna transferencia de datos a entidades financieras ni terceros para el RUC <strong>{activeRuc}</strong>.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {transmissionLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                  {log.recipientEntity}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  {log.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {log.payloadSummary || 'Expediente tributario y de comprobantes de pago'}
                              </p>
                              <p className="text-[11px] font-mono text-slate-400">
                                Finalidad: {CONSENT_PURPOSES_META[log.purpose]?.shortLabel || log.purpose}
                              </p>
                            </div>

                            <div className="text-left sm:text-right shrink-0">
                              <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                                {new Date(log.transmittedAt).toLocaleString('es-PE')}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">Transferencia TLS 1.3 Cifrada</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── SUB-VIEW 4: TRÁMITES Y EXPEDIENTES ARCO ── */}
                {privacySubTab === 'arco' && (
                  <div className="space-y-6">
                    {/* Search ARCO by Case Code */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <Search size={15} className="text-indigo-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                          Consultar Estado de Expediente ARCO
                        </h4>
                      </div>
                      <form onSubmit={handleSearchArcoCode} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ej. ARCO-2026-1049"
                          value={arcoSearchCode}
                          onChange={(e) => setArcoSearchCode(e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                        <button
                          type="submit"
                          disabled={arcoSearchLoading}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {arcoSearchLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                          <span>Buscar</span>
                        </button>
                      </form>

                      {arcoSearchError && (
                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{arcoSearchError}</p>
                      )}

                      {arcoSearchResult && (
                        <div className="mt-3 p-4 bg-white dark:bg-slate-950 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                              #{arcoSearchResult.caseCode}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                              ARCO_STATUS_LABELS[arcoSearchResult.status]?.bg || 'bg-slate-100'
                            } ${ARCO_STATUS_LABELS[arcoSearchResult.status]?.text || 'text-slate-800'} ${
                              ARCO_STATUS_LABELS[arcoSearchResult.status]?.border || 'border-slate-300'
                            }`}>
                              {ARCO_STATUS_LABELS[arcoSearchResult.status]?.label || arcoSearchResult.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            <strong>Derecho:</strong> {ARCO_RIGHTS_META[arcoSearchResult.rightType]?.title || arcoSearchResult.rightType}
                          </p>
                          <p className="text-xs text-slate-500">
                            <strong>Fecha de Presentación:</strong> {new Date(arcoSearchResult.submittedAt).toLocaleDateString('es-PE')}
                          </p>
                          <p className="text-xs text-slate-500">
                            <strong>Fecha Límite Legal de Respuesta:</strong> {new Date(arcoSearchResult.deadlineAt).toLocaleDateString('es-PE')}
                          </p>
                          {arcoSearchResult.responseNotes && (
                            <p className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <strong>Dictamen / Notas del Oficial de Privacidad:</strong> {arcoSearchResult.responseNotes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* New ARCO Request Form */}
                    <div className="p-5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-indigo-600" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                          Presentar Nueva Solicitud de Derechos ARCO
                        </h3>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Conforme a la Ley N° 29733, puedes solicitar formalmente el acceso, rectificación, cancelación u oposición de los datos de tu MYPE o persona natural.
                      </p>

                      {arcoSubmittedCase ? (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 rounded-xl space-y-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <h4 className="font-black text-xs uppercase font-mono">EXPEDIENTE GENERADO EXITOSAMENTE</h4>
                          </div>
                          <p className="text-xs leading-relaxed">
                            Se ha registrado formalmente tu solicitud bajo el código único{' '}
                            <strong className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">
                              #{arcoSubmittedCase.caseCode}
                            </strong>.
                          </p>
                          <p className="text-xs text-emerald-800 dark:text-emerald-400">
                            <strong>Plazo legal de respuesta:</strong>{' '}
                            {ARCO_RIGHTS_META[arcoSubmittedCase.rightType]?.legalDeadline || '10 a 20 días hábiles'}{' '}
                            (Fecha límite: {new Date(arcoSubmittedCase.deadlineAt).toLocaleDateString('es-PE')}).
                          </p>
                          <button
                            onClick={resetArcoForm}
                            className="text-xs uppercase font-black underline hover:no-underline cursor-pointer"
                          >
                            Presentar otra solicitud ARCO
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleArcoSubmit} className="space-y-3.5">
                          {arcoFormError && (
                            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-700 dark:text-rose-400">
                              {arcoFormError}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] uppercase font-black text-slate-500">RUC de la MYPE (11 dígitos)</label>
                              <input
                                type="text"
                                maxLength={11}
                                required
                                value={arcoForm.ruc}
                                onChange={(e) => setArcoForm({ ...arcoForm, ruc: e.target.value.replace(/\D/g, '') })}
                                placeholder="Ej. 20601234567"
                                className="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-black text-slate-500">Nombre / Razón Social del Titular</label>
                              <input
                                type="text"
                                required
                                value={arcoForm.fullName}
                                onChange={(e) => setArcoForm({ ...arcoForm, fullName: e.target.value })}
                                placeholder="Ej. Comercial Los Olivos S.A.C."
                                className="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] uppercase font-black text-slate-500">Correo Electrónico de Notificación</label>
                              <input
                                type="email"
                                required
                                value={arcoForm.email}
                                onChange={(e) => setArcoForm({ ...arcoForm, email: e.target.value })}
                                placeholder="Ej. contacto@mype.pe"
                                className="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-black text-slate-500">Derecho a Ejercer</label>
                              <select
                                value={arcoForm.rightType}
                                onChange={(e) => setArcoForm({ ...arcoForm, rightType: e.target.value as ArcoRightType })}
                                className="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                              >
                                <option value="ACCESO">Acceso (Ver qué datos personales almacena SAMI)</option>
                                <option value="RECTIFICACION">Rectificación (Corregir datos inexactos o incompletos)</option>
                                <option value="CANCELACION">Cancelación (Suprimir datos que no correspondan)</option>
                                <option value="OPOSICION">Oposición (Oponerse a tratamiento para fines bancarios/comerciales)</option>
                              </select>
                            </div>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                            <strong>Alcance del derecho:</strong> {ARCO_RIGHTS_META[arcoForm.rightType]?.description}
                            <br />
                            <strong>Plazo legal de respuesta:</strong> {ARCO_RIGHTS_META[arcoForm.rightType]?.legalDeadline}
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-black text-slate-500">
                              Detalle y Fundamentos de la Solicitud
                            </label>
                            <textarea
                              rows={3}
                              required
                              value={arcoForm.details}
                              onChange={(e) => setArcoForm({ ...arcoForm, details: e.target.value })}
                              placeholder="Describa con claridad los datos sobre los cuales ejerce el derecho y el motivo..."
                              className="mt-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={arcoLoading}
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
                          >
                            {arcoLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            <span>{arcoLoading ? 'Registrando en Expediente Oficial...' : 'Presentar Solicitud ARCO'}</span>
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Historical list for current RUC */}
                    {rucArcoList.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 font-mono">
                          Trámites Registrados para el RUC {activeRuc} ({rucArcoList.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-2.5">
                          {rucArcoList.map((req) => (
                            <div
                              key={req.id}
                              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 mr-2">
                                  #{req.caseCode}
                                </span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {ARCO_RIGHTS_META[req.rightType]?.title || req.rightType}
                                </span>
                                <p className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">{req.details}</p>
                              </div>
                              <span className={`self-start sm:self-center text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                ARCO_STATUS_LABELS[req.status]?.bg || 'bg-slate-100'
                              } ${ARCO_STATUS_LABELS[req.status]?.text || 'text-slate-800'} ${
                                ARCO_STATUS_LABELS[req.status]?.border || 'border-slate-300'
                              }`}>
                                {ARCO_STATUS_LABELS[req.status]?.label || req.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: API PARTNER DOCS */}
            {currentTab === 'api-docs' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate--fade-in max-w-5xl">
                
                {/* Left Side: Developer Specs */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500 font-mono">B2B BANK INTEGRATION</p>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">SAMI Partner API (OAuth 2.0)</h2>
                  
                  <div className="space-y-4 text-xs md:text-sm text-slate-500 dark:text-slate-300 leading-relaxed font-normal">
                    <p>
                      SAMI expone un gateway seguro (RESTful) para que las cajas municipales, cooperativas calificadas y bancos del marketplace de la SBS puedan auditar en milisegundos expedientes tributarios y estados de ventas de clientes peruanos autorizados.
                    </p>

                    <div className="space-y-2">
                      <p className="font-extrabold uppercase tracking-widest text-[9px] text-slate-400 font-mono">CREDENTIALS AUTH FLOW:</p>
                      <p className="text-2xs bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-slate-600 dark:text-slate-400 leading-normal font-medium">
                        <strong>Endpoint de Token:</strong> <code>POST https://api.sami.pe/oauth/token</code><br />
                        <strong>Grant Type:</strong> <code>client_credentials</code><br />
                        <strong>Granular Scopes:</strong> <code>read:tax_health</code> (básico), <code>read:financials</code> (avanzado)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-extrabold uppercase tracking-widest text-[9px] text-slate-400 font-mono">MAIN TAX HEALTH GETTER ENDPOINT:</p>
                      <p className="text-2xs bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-slate-600 dark:text-slate-400 leading-normal font-medium">
                        <strong>Endpoint:</strong> <code className="bg-orange-100 text-orange-850 dark:bg-orange-950/40 p-0.5 rounded">GET /api/v1/bank/tax-health/:ruc</code><br />
                        <strong>Header obligatorio:</strong> <code>Authorization: Bearer &lt;access_token&gt;</code>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Side: LIVE PLAYGROUND ENVIRONMENT */}
                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1.5 flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sandbox API Playground
                    </h3>
                    <p className="text-[10px] text-slate-400 mb-4 leading-normal">Prueba llamadas en vivo conectadas simulando ser una caja SBS. Sigue los dos pasos del flujo:</p>

                    {/* STEP 1: GENERATE TOKEN */}
                    <div className="space-y-2 mb-4">
                      <p className="text-[9px] uppercase font-black text-slate-400">1. Generar OAuth2 Bearer Token</p>
                      <button 
                        onClick={handleGenerateApiToken}
                        disabled={isClientTokenGenerating}
                        className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wide rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
                      >
                        {isClientTokenGenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        {apiToken ? 'Token Regenerado' : 'Generar Access Token'}
                      </button>
                      {apiToken && (
                        <div className="p-1.5 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-lg text-[9px] font-mono font-bold leading-none break-all select-all flex items-center justify-between text-indigo-600">
                          <code>Token: {apiToken.substring(0, 32)}...</code>
                        </div>
                      )}
                    </div>

                    {/* STEP 2: DO API REQUEST */}
                    <div className="space-y-2.5">
                      <p className="text-[9px] uppercase font-black text-slate-400">2. Ejecutar GET Scoring</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] uppercase font-bold text-slate-400">RUC de MYPE</label>
                          <input 
                            type="text" 
                            maxLength={11} 
                            value={apiRucInput}
                            onChange={(e) => setApiRucInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 text-2xs font-extrabold rounded"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] uppercase font-bold text-slate-400">Scope de Consulta</label>
                          <select 
                            value={apiScope}
                            onChange={(e) => setApiScope(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 text-2xs font-extrabold rounded"
                          >
                            <option value="read:tax_health">read:tax_health</option>
                            <option value="read:financials">read:financials</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        onClick={handleExecuteApiCall}
                        disabled={!apiToken || isApiExecuting}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white text-xs font-black uppercase tracking-wide rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        {isApiExecuting ? <Loader2 size={12} className="animate-spin" /> : <Play size={11} />}
                        {isApiExecuting ? 'Consultando expediente...' : 'Ejecutar Consumo API RAW'}
                      </button>
                    </div>
                  </div>

                  {/* RESPONSE RENDERER */}
                  {apiResponseJson && (
                    <div className="mt-4 border-t border-slate-150 dark:border-slate-800 pt-3">
                      <p className="text-[8px] uppercase font-black text-slate-400 mb-1 font-mono">Response: 200 OK (JSON)</p>
                      <pre className="p-3 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-lg text-[9px] font-mono leading-relaxed text-emerald-600 max-h-[140px] overflow-y-auto overflow-x-auto">
                        <code>{JSON.stringify(apiResponseJson, null, 2)}</code>
                      </pre>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB: BLOG MYPE */}
            {currentTab === 'blog' && (
              <div className="space-y-6 max-w-5xl animate--fade-in">
                {!selectedArticle ? (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <p className="text-[10px] uppercase font-black tracking-widest text-amber-500 font-mono">ACADEMIA Y CONSEJOS SAMI</p>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Blog Educativo y Finanzas MYPE</h2>
                      </div>

                      {/* Search Bar */}
                      <div className="relative group w-full sm:w-64">
                        <input 
                          type="text" 
                          placeholder="Buscar artículos..." 
                          value={blogSearch}
                          onChange={(e) => setBlogSearch(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    {/* Filter categories */}
                    <div className="flex gap-2 pb-1 border-b border-slate-100 dark:border-slate-805/50 overflow-x-auto no-scrollbar">
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'impuestos', label: 'Impuestos SUNAT' },
                        { id: 'finanzas', label: 'Finanzas MYPE' },
                        { id: 'creditos', label: 'Créditos y Financiamiento' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedBlogCat(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all shrink-0 cursor-pointer ${
                            selectedBlogCat === cat.id 
                              ? 'bg-amber-500 text-slate-950 font-bold' 
                              : 'bg-slate-50 dark:bg-slate-900/60 text-slate-400 hover:text-slate-800 dark:hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* ARTICLES GRID */}
                    {filteredArticles.length > 0 ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredArticles.map(art => (
                          <div 
                            key={art.id} 
                            onClick={() => setSelectedArticle(art)}
                            className="bg-white dark:bg-slate-900/40 border border-slate-150/70 dark:border-slate-800/80 rounded-2xl p-5 hover:border-amber-550 dark:hover:border-amber-500/40 hover:shadow-lg transition-all group duration-300 flex flex-col justify-between cursor-pointer"
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase font-mono">
                                <span>{art.category === 'impuestos' ? 'Impuestos' : art.category === 'finanzas' ? 'Finanzas' : 'Crédito MYPE'}</span>
                                <span className="flex items-center gap-1"><Clock size={9} /> {art.readTime}</span>
                              </div>
                              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 tracking-tight leading-snug line-clamp-2">
                                {art.title}
                              </h3>
                              <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold line-clamp-3">
                                {art.summary}
                              </p>
                            </div>
                            <button className="mt-4 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1 flex-row text-left hover:underline">
                              Leer Artículo <ChevronRight size={13} className="pt-0.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs font-medium">
                        No se encontraron artículos con esos términos de búsqueda.
                      </div>
                    )}
                  </>
                ) : (
                  // IMMERSIVE READING MODE
                  <div className="max-w-2xl mx-auto space-y-6">
                    <button 
                      onClick={() => setSelectedArticle(null)}
                      className="text-2xs uppercase font-black tracking-widest text-slate-400 hover:text-indigo-650 flex items-center gap-1.5 cursor-pointer"
                    >
                      ← Regresar al Listado de Artículos
                    </button>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-2xs text-slate-400 uppercase font-mono font-black">
                        <span>Autor: {selectedArticle.author}</span>
                        <span>•</span>
                        <span>{selectedArticle.date}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock size={9} /> {selectedArticle.readTime} lectura</span>
                      </div>
                      <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        {selectedArticle.title}
                      </h2>
                    </div>

                    <div className="space-y-4 text-xs md:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                      {selectedArticle.content.map((p, pIdx) => (
                        <p key={pIdx} className="first-line:font-semibold first-letter:text-2xl first-letter:-ml-1 first-letter:float-left first-letter:mr-2 first-letter:text-indigo-600 dark:first-letter:text-indigo-400 first-letter:font-black" style={pIdx > 0 ? { float: 'none', margin: 'inherit' } as any : undefined}>
                          {pIdx > 0 ? p : p.substring(0)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: PRENSA */}
            {currentTab === 'prensa' && (
              <div className="space-y-6 max-w-4xl animate--fade-in">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500 font-mono">ESTADÍSTICAS Y COMUNICADOS</p>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Sala de Prensa y Comunicados Oficiales</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {PRESS_RELEASES.map(press => (
                    <div 
                      key={press.id}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[9px] font-black text-indigo-500 font-mono">
                          <span>{press.date}</span>
                          <span className="bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-400">{press.source}</span>
                        </div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight tracking-tight">
                          {press.title}
                        </h3>
                        <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {press.subtitle}
                        </p>
                      </div>
                      <p className="text-2xs text-slate-400 italic mt-4 leading-normal bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-150 dark:border-slate-850">
                        "{press.content.substring(0, 110)}..."
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: EQUIPO */}
            {currentTab === 'equipo' && (
              <div className="space-y-6 max-w-4xl animate--fade-in">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  <p className="text-[10px] uppercase font-black tracking-widest text-violet-500 font-mono">SAMI CO-FOUNDERS</p>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Nuestro Equipo Directivo</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  {[
                    {
                      name: "Ing. Diego Monteverde",
                      role: "CEO & Co-fundador",
                      bio: "Graduado en Ingeniería de Software. Experto en desarrollo de plataformas fintech, microdatos y scoring crediticio para mercados emergentes del país.",
                      linkedin: "profiles.sami.pe/diego"
                    },
                    {
                      name: "Dra. Jimena Alarcón",
                      role: "CISO & Legal Compliance Manager",
                      bio: "Abogada en Regulación Digital de la Universidad Católica. Responsable de garantizar el blindaje según la APDP peruana y el estricto cumplimiento de la Ley N° 29733.",
                      linkedin: "profiles.sami.pe/jimena"
                    },
                    {
                      name: "Sandro Quispe",
                      role: "Head of Banking Integrations",
                      bio: "Ex-arquitecto senior de canales B2B en interbancas nacionales. Especializado en APIs transaccionales, OAuth 2.0 y automatización fiscal SUNAT.",
                      linkedin: "profiles.sami.pe/sandro"
                    }
                  ].map((member, i) => (
                    <div 
                      key={i}
                      className="bg-white dark:bg-slate-900/40 border border-slate-150/70 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 hover:border-violet-400 dark:hover:border-violet-900/45 transition-colors group flex flex-col justify-between"
                    >
                      <div className="space-y-3 flex flex-col items-center">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-black shadow-lg">
                          {member.name.split(' ')[1]?.substring(0, 2) || "S"}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{member.name}</h3>
                          <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest font-mono mt-0.5">{member.role}</p>
                        </div>
                        <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                          {member.bio}
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => window.open(`https://linkedin.com/`, '_blank')}
                        className="text-2xs font-bold text-slate-400 hover:text-indigo-500 inline-flex items-center gap-1 justify-center underline cursor-pointer"
                      >
                        LinkedIn <ExternalLink size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: TRABAJA CON NOSOTROS */}
            {currentTab === 'trabajo' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate--fade-in max-w-5xl">
                
                {/* Left Side: Recruitment Positions */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500 font-mono">OPORTUNIDAD PROFESIONAL</p>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Oportunidades de Empleo en SAMI</h2>
                  <p className="text-2xs text-slate-400 font-medium">Buscamos perfiles apasionados por transformar la realidad comercial de las pequeñas empresas.</p>
                  
                  <div className="space-y-4">
                    {[
                      {
                        title: "Software Engineer (Fullstack)",
                        dept: "Tecnología e Inteligencia MYPE",
                        loc: "San Isidro, Lima (Presencial/Híbrido)",
                        skills: "React · TypeScript · CJS / Node.js · APIs"
                      },
                      {
                        title: "Analista de Riesgo Crediticio",
                        dept: "Riesgo & Scoring Alternativo",
                        loc: "San Isidro, Lima (Presencial)",
                        skills: "Fintech · Algoritmos SBS · SUNAT data"
                      }
                    ].map((job, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-55/60 dark:bg-slate-900/40 p-4 border border-slate-100 dark:border-slate-805/50 rounded-2xl space-y-2"
                      >
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{job.title}</h4>
                        <div className="flex flex-wrap gap-2 text-2xs text-slate-400 leading-none">
                          <span>📂 {job.dept}</span>
                          <span>•</span>
                          <span>📍 {job.loc}</span>
                        </div>
                        <p className="text-[10px] uppercase font-black text-slate-400 font-mono mt-1">Requisitos: <code className="text-indigo-600 dark:text-indigo-400">{job.skills}</code></p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: Apply Form */}
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4 font-mono">
                    Postula en Línea
                  </h3>

                  {!careersSubmitted ? (
                    <form onSubmit={handleCareersSubmit} className="space-y-3.5">
                      <div>
                        <label className="text-[9px] uppercase font-black text-slate-400">Nombre Completo</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Sofía Valdivia" 
                          required
                          value={careersForm.fullName}
                          onChange={(e) => setCareersForm({...careersForm, fullName: e.target.value})}
                          className="mt-1 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2 text-xs font-bold outline-none rounded-lg"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[9px] uppercase font-black text-slate-400">Correo de Contacto</label>
                        <input 
                          type="email" 
                          placeholder="Ej. sofia@gmail.com" 
                          required
                          value={careersForm.email}
                          onChange={(e) => setCareersForm({...careersForm, email: e.target.value})}
                          className="mt-1 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2 text-xs font-bold outline-none rounded-lg"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] uppercase font-black text-slate-400">Puesto que postulas</label>
                          <select 
                            value={careersForm.position}
                            onChange={(e) => setCareersForm({...careersForm, position: e.target.value})}
                            className="mt-1 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2 text-xs font-bold outline-none rounded-lg"
                          >
                            <option value="Fullstack Engineer">Software Engineer</option>
                            <option value="Analista de Riesgo">Analista de Riesgo</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-black text-slate-400">Linkedin URL</label>
                          <input 
                            type="text" 
                            placeholder="Ej. linkedin.com/in/sofia" 
                            value={careersForm.linkedin}
                            onChange={(e) => setCareersForm({...careersForm, linkedin: e.target.value})}
                            className="mt-1 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2 text-xs font-bold outline-none rounded-lg"
                          />
                        </div>
                      </div>

                      {/* File select drag-drop simulator */}
                      <div className="pt-1.5">
                        <label className="text-[9px] uppercase font-black text-slate-400">Sube tu Curriculum Vitae (PDF o DOCX)</label>
                        <div className="mt-1 bg-white dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-800 rounded-xl p-4 text-center cursor-pointer relative group transition-colors">
                          <input 
                            type="file" 
                            accept=".pdf, .docx, .doc" 
                            required
                            onChange={handleCvSelection}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          />
                          <Upload className="mx-auto text-slate-400 mb-2" size={20} />
                          <p className="text-2xs font-extrabold text-slate-500 mb-1">
                            {careersForm.filename ? careersForm.filename : 'Arrastra aquí tu CV o haz clic para buscar'}
                          </p>
                          <p className="text-[8px] text-slate-400">Máximo 10MB (PDF/DOCX)</p>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={careersLoading}
                        className="w-full bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
                      >
                        {careersLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
                        {careersLoading ? 'Enviando Expendiente...' : 'Confirmar Postulación'}
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-xl space-y-3 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mx-auto mb-1 text-emerald-600">
                        <Check size={22} className="stroke-[3.5]" />
                      </div>
                      <h4 className="font-black text-xs uppercase font-mono">POSTULACIÓN REGISTRADA</h4>
                      <p className="text-2xs font-medium leading-relaxed">
                        Muchas gracias, de parte del equipo administrativo de SAMI S.A.C. Hemos indexado tu CV ({careersForm.filename}) para el puesto de <strong>{careersForm.position}</strong> de manera exitosa.
                        Nuestro equipo evaluará tu perfil académico y laboral y se comunicará contigo vía {careersForm.email} en un plazo no mayor a 5 días hábiles.
                      </p>
                      <button 
                        onClick={() => {
                          setCareersSubmitted(false);
                          setCareersForm({ fullName: '', email: '', position: 'Fullstack Engineer', linkedin: '', filename: '' });
                        }}
                        className="text-[10px] uppercase font-black underline hover:no-underline cursor-pointer"
                      >
                        Postular a otra vacante
                      </button>
                    </div>
                  )}

                </div>

              </div>
            )}

            {/* TAB: ESTADO DEL SISTEMA (LIVE PING SIMULATOR CONTROLLER) */}
            {currentTab === 'estado' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate--fade-in max-w-5xl">
                
                {/* Left: Active Monitored Channels */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <p className="text-[10px] uppercase font-black tracking-widest text-emerald-600 font-mono">REAL-TIME SERVICE HEURISTICS</p>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Estado Operativo e Integraciones de Red</h2>
                  
                  <div className="space-y-3.5">
                    {activeServices.map((srv, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-150/70 dark:border-slate-800 rounded-2xl flex justify-between items-center"
                      >
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-none">{srv.name}</h4>
                          <p className="text-[9px] text-slate-400 font-mono">Uptime: <span className="font-black text-slate-500 dark:text-slate-350">{srv.uptime}</span> · Latencia: {srv.latency}</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wide px-3 py-1 rounded-full">
                          Operativo
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Actual Health Live Diagnostic Action */}
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-650 dark:text-indigo-400 mb-1.5 flex items-center gap-1.5 font-mono">
                      <Clock size={14} className="text-indigo-500" /> Ping de Conexión del Servidor
                    </h3>
                    <p className="text-[10px] text-slate-400 mb-4 leading-normal">
                      Ejecuta un diagnóstico ping de red directo hacia nuestro backend alojado en contenedores de Cloud Run para medir y comprobar la latencia física de respuesta de tu enlace de internet.
                    </p>

                    <button
                      onClick={handleLiveConnectionPing}
                      disabled={livePingLoading}
                      className="w-full bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
                    >
                      {livePingLoading ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />}
                      {livePingLoading ? 'Disparando Comando Ping...' : 'Disparar Ping de Latencia Real'}
                    </button>
                  </div>

                  {livePingResult && (
                    <div className="mt-5 border-t border-slate-150 dark:border-slate-800 pt-4">
                      <p className="text-[9px] uppercase font-black text-slate-400 mb-1 font-mono">Ping Result metrics:</p>
                      <div className="p-4 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl">
                        <p className="text-[11px] font-mono leading-relaxed text-indigo-600 dark:text-emerald-400 break-words font-black">
                          {livePingResult}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="text-[9px] text-slate-400 font-medium leading-relaxed mt-4 bg-slate-100 dark:bg-slate-950 p-3 rounded-lg border border-slate-200/50 dark:border-slate-850">
                    ℹ️ <strong>Nota metodológica:</strong> SAMI corre en una infraestructura con balanceadores y filtros anti-DDoS integrados. El ping simula peticiones cifradas para impedir ciberataques.
                  </div>
                </div>

              </div>
            )}

            {/* TAB: SEGURIDAD (Derived from SECURITY.md) */}
            {currentTab === 'seguridad' && (
              <div className="space-y-6 max-w-3xl animate--fade-in max-w-4xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500 font-mono">SAMI TECHNICAL SHIELDING</p>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Manual y Plan de Blindaje Técnico</h2>
                <p className="text-xs text-slate-400 font-mono">Clasificación: Confidencialidad Externa</p>

                <div className="space-y-5 text-xs md:text-sm text-slate-500 dark:text-slate-300 leading-relaxed font-normal">
                  <p>
                    Siguiendo las mejores prácticas bajo la norma ISO 27001 para la protección de secretos bancarios y fiscales MYPE, operamos un plan activo de blindaje técnico que salvaguarda la base transaccional frente a incursiones.
                  </p>

                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight pt-2 border-t border-slate-100 dark:border-slate-800">1. Cifrado por capas en Reposo (AES-256)</h3>
                  <p>
                    Toda consulta de comprobantes fiscales electrónicos alojada en bases de datos relacionales en la nube posee cifrado granular a nivel de campo con claves maestras rotativas gestionadas criptográficamente a través de Cloud KMS, garantizando que el personal interno no acceda a identidades.
                  </p>

                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight pt-2 border-t border-slate-100 dark:border-slate-800">2. Habilitación de 2FA Obligatorio</h3>
                  <p>
                    Para cuentas comerciales y acceso de asesores SBS socias, el sistema exige la confirmación del segundo factor (2FA) temporal a través de un autenticador criptográfico para cada sesión. No se permiten accesos desprotegidos.
                  </p>

                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight pt-2 border-t border-slate-100 dark:border-slate-800">3. Auditorías e inmutabilidad de Registros</h3>
                  <p>
                    Cada bitácora de actividad administrativa (logs del sistema) es indexado automáticamente bajo un repositorio inmutable de única adición (append-only), impidiendo que auditores o programadores eliminen historiales de deudas o de desembolsos.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: CONSOLA TECNICA (For IT, Bank, Client Technical operations) */}
            {currentTab === 'consola-tecnica' && (
              <TechnicalConsole />
            )}

            {/* TAB: TRANSFERENCIA TECNICA & HANDOVER DOCS */}
            {currentTab === 'transferencia-tecnica' && (
              <div className="space-y-6 max-w-4xl animate--fade-in">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">KIT DE PASO A PRODUCCIÓN Y HANDOVER DESARROLLADOR</p>
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Documentación Técnica, Esquemas y Guías Operativas</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Documentos listos para entregar a tu desarrollador o freelancer, reduciendo semanas de análisis y garantizando que la arquitectura se mantenga fiel al prototipo.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Document 1: Data Model */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase font-mono">
                      <FileText size={16} /> Modelo de Datos y Reglas de Negocio
                    </div>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Especificación de campos exactos de ventas/compras, regímenes tributarios (NRUS, RER, RMT, RG), roles de usuario y fórmulas matemáticas de IGV y Renta.
                    </p>
                    <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      📄 Archivo: <strong>DATA_MODEL_AND_BUSINESS_RULES.md</strong>
                    </div>
                  </div>

                  {/* Document 2: Backend Guide (PostgreSQL + Prisma) */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase font-mono">
                      <Cpu size={16} /> Backend: PostgreSQL + Prisma
                    </div>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Cómo levantar PostgreSQL, aplicar las migraciones Prisma, cargar el padrón reducido de SUNAT y configurar el PSE (Nubefact).
                    </p>
                    <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      📄 Archivo: <strong>BACKEND_GUIDE.md</strong>
                    </div>
                  </div>

                  {/* Document 3: API Keys Guide */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase font-mono">
                      <Lock size={16} /> Guía de Cuentas y API Keys Gratuitas
                    </div>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Instrucciones formulario por formulario para conseguir las API Keys de apis.net.pe (consulta RUC), Google AI Studio (Gemini), Resend (Emails) y SOL SUNAT.
                    </p>
                    <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      📄 Archivo: <strong>API_KEYS_AND_ACCOUNTS_GUIDE.md</strong>
                    </div>
                  </div>

                  {/* Document 4: Legal Terms */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs uppercase font-mono">
                      <ShieldCheck size={16} /> Términos Legales y Protección de Datos (PE)
                    </div>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Textos legales redactados acorde a la Ley N° 29733 (Protección de Datos Personales de Perú), aclaración de exención de scoring y cláusula de consentimiento.
                    </p>
                    <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      📄 Archivo: <strong>LEGAL_TERMS_PERU.md</strong>
                    </div>
                  </div>

                </div>

                {/* Pilot Data Card */}
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 p-5 rounded-2xl space-y-2">
                  <h3 className="text-xs font-black uppercase text-indigo-900 dark:text-indigo-300 font-mono tracking-wider flex items-center gap-2">
                    <Terminal size={16} /> Plantilla de Datos Reales de MYPE Piloto (`PILOT_MYPE_DATA_TEMPLATE.json`)
                  </h3>
                  <p className="text-2xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
                    Incluye información realista de la empresa piloto "Bodega San Martín E.I.R.L." (RUC 20123456789), con boletas de venta, facturas de proveedor con IGV, detracciones y liquidación de impuestos bajo el Régimen MYPE Tributario (RMT) lista para pruebas verdaderas.
                  </p>
                </div>

              </div>
            )}

          </div>

        </div>

      </motion.div>
    </div>
  );
};

export default TransparencyHub;
