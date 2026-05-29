import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, 
    Lock, 
    Key, 
    Database, 
    ChevronRight,
    Search,
    Copy,
    CheckCircle2,
    Code2,
    FileJson,
    Network,
    Building2,
    X,
    Globe,
    Activity,
    Plus,
    Trash2,
    Play,
    SlidersHorizontal,
    Check,
    AlertCircle,
    Terminal,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppRole } from '../types';
import { logAdminAction } from '../services/auditService';
import { validateBankAccount } from '../services/validationService';
import { showLocalPushNotification } from '../services/pushNotificationService';

interface Webhook {
    id: string;
    name: string;
    url: string;
    events: string[];
    secret: string;
    isActive: boolean;
    createdAt: string;
}

const BankDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const [activeSection, setActiveSection] = useState<'scoring' | 'webhooks' | 'open-finance'>('scoring');

    // General bank portal states
    const [token, setToken] = useState('valid-bank-token-mvp');
    const [rucSearch, setRucSearch] = useState('20123456789');
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCopySuccess, setShowCopySuccess] = useState(false);
    const [rotateSuccess, setRotateSuccess] = useState(false);

    const handleRotateCredentials = () => {
        const randomHex = Array.from({length: 24}, () => Math.floor(Math.random()*16).toString(16)).join('');
        setToken(`sk_live_${randomHex}`);
        setRotateSuccess(true);
        setTimeout(() => setRotateSuccess(false), 4000);
    };

    // Validation state
    const [isAccountVerified, setIsAccountVerified] = useState(false);
    const [accountNumber, setAccountNumber] = useState('');
    const [isValidatingAccount, setIsValidatingAccount] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // --- Open Finance States ---
    const [selectedClient, setSelectedClient] = useState('Don Carlos S.A.C.');
    const [consentGranted, setConsentGranted] = useState(false);
    const [isSynchronizingOpenFinance, setIsSynchronizingOpenFinance] = useState(false);
    const [openFinanceTransactions, setOpenFinanceTransactions] = useState<{id: string, date: string, desc: string, amount: number, type: 'IN' | 'OUT', status: string}[]>([]);

    const handleOpenFinanceSync = () => {
        setIsSynchronizingOpenFinance(true);
        setTimeout(() => {
            setIsSynchronizingOpenFinance(false);
            setOpenFinanceTransactions([
                { id: 'TXN-901', date: '2026-05-27', desc: 'Transferencia Interbancaria Recibida - Cobro Factura #9832', amount: 8450.00, type: 'IN', status: 'Liquidador' },
                { id: 'TXN-902', date: '2026-05-26', desc: 'Pago a Proveedor - Distribuidora Alimentos S.A.', amount: 4300.00, type: 'OUT', status: 'Liquidador' },
                { id: 'TXN-903', date: '2026-05-25', desc: 'Pago Arbitrios Municipales de Local Comercial', amount: 350.00, type: 'OUT', status: 'Liquidador' },
                { id: 'TXN-904', date: '2026-05-24', desc: 'Depósito en Efectivo por Ventas de Caja Chica', amount: 1200.00, type: 'IN', status: 'Liquidador' },
                { id: 'TXN-905', date: '2026-05-22', desc: 'Interés Acreedor Cuenta Corriente Banco Alianza', amount: 45.50, type: 'IN', status: 'Liquidador' }
            ]);
            if (currentUser) {
                logAdminAction(currentUser, `Sincronización de transacciones exitosa de Open Finance para el cliente ${selectedClient}`);
            } else {
                logAdminAction(
                    { id: 'banco-alianza', name: 'Banco Alianza Analista', role: AppRole.BANK_ANALYST },
                    `Sincronización de transacciones exitosa de Open Finance para el cliente ${selectedClient}`
                );
            }
        }, 1200);
    };

    // --- Webhooks State ---
    const [webhooks, setWebhooks] = useState<Webhook[]>([
        {
            id: 'wh_1',
            name: 'Notificador Core de Pagos (Alianza)',
            url: 'https://api.bancoalianza.pe/webhooks/sami-payments',
            events: ['credit.payment.received'],
            secret: 'whsec_8fda89a0c2017df893b821a',
            isActive: true,
            createdAt: '2026-05-10T14:30:00Z'
        },
        {
            id: 'wh_2',
            name: 'CRM Sync Integrador',
            url: 'https://api.bancoalianza.pe/crm/integration',
            events: ['credit.payment.received', 'credit.approved'],
            secret: 'whsec_90fe21b38f821900de2316e',
            isActive: false,
            createdAt: '2026-05-15T09:12:00Z'
        }
    ]);

    // Form state
    const [isAddingWebhook, setIsAddingWebhook] = useState(false);
    const [newWhName, setNewWhName] = useState('');
    const [newWhUrl, setNewWhUrl] = useState('');
    const [newWhEvents, setNewWhEvents] = useState<string[]>(['credit.payment.received']);
    const [newWhSecret, setNewWhSecret] = useState('');
    const [urlError, setUrlError] = useState('');

    // Simulation state
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulatedWebhookId, setSimulatedWebhookId] = useState<string>('wh_1');
    const [simulationLog, setSimulationLog] = useState<{
        timestamp: string;
        requestHeaders: any;
        requestBody: any;
        responseStatus: number;
        responseBody: any;
    } | null>(null);

    // Delivery log history
    const [deliveryLogs, setDeliveryLogs] = useState([
        {
            id: 'evt_pay_90248',
            timestamp: 'Hace 5 min',
            event: 'credit.payment.received',
            url: 'https://api.bancoalianza.pe/webhooks/sami-payments',
            status: 200,
            latency: '124ms'
        },
        {
            id: 'evt_pay_89123',
            timestamp: 'Hace 1 hora',
            event: 'credit.payment.received',
            url: 'https://api.bancoalianza.pe/webhooks/sami-payments',
            status: 200,
            latency: '89ms'
        },
        {
            id: 'evt_pay_88301',
            timestamp: 'Hace 4 horas',
            event: 'credit.payment.received',
            url: 'https://api.bancoalianza.pe/webhooks/sami-payments',
            status: 200,
            latency: '110ms'
        }
    ]);

    const generateSecret = () => {
        const chars = 'abcdef0123456789';
        let result = 'whsec_';
        for (let i = 0; i < 24; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    };

    useEffect(() => {
        if (isAddingWebhook) {
            setNewWhSecret(generateSecret());
        }
    }, [isAddingWebhook]);

    const handleVerifyAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsValidatingAccount(true);
        setValidationError(null);

        try {
            const result = await validateBankAccount(accountNumber, currentUser?.institutionId || 'banco_c');
            if (result.isValid) {
                setIsAccountVerified(true);
                if (currentUser) {
                    logAdminAction(currentUser, `Validación de cuenta SBS exitosa: ${accountNumber.replace(/(\d{4})\d+(\d{4})/, '$1****$2')}`);
                }
            } else {
                setValidationError(result.message || 'Error de validación desconocido.');
            }
        } catch (error) {
            setValidationError('Error de conexión con el servicio SBS. Intente nuevamente.');
        } finally {
            setIsValidatingAccount(false);
        }
    };

    const isAnalyst = currentUser?.role === AppRole.BANK_ANALYST;
    const isSupervisor = currentUser?.role === AppRole.BANK_SUPERVISOR;
    const isAdmin = currentUser?.role === AppRole.BANK_ADMIN;

    const callSamiApi = async () => {
        setIsLoading(true);
        if (currentUser) {
            logAdminAction(currentUser, `Consulta de scoring para RUC: ${rucSearch}`);
        }
        try {
            const res = await fetch(`/api/v1/bank/scoring/${rucSearch}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            setApiResponse(data);
        } catch (error) {
            setApiResponse({ error: 'Failed to fetch data. Check token and RUC.' });
        } finally {
            setIsLoading(false);
        }
    };

    // --- Webhook Operations ---
    const handleAddWebhook = (e: React.FormEvent) => {
        e.preventDefault();
        setUrlError('');

        if (!newWhUrl.trim()) {
            setUrlError('La URL del webhook es requerida');
            return;
        }

        if (!newWhUrl.startsWith('http://') && !newWhUrl.startsWith('https://')) {
            setUrlError('La URL debe comenzar con http:// o https://');
            return;
        }

        const newWh: Webhook = {
            id: 'wh_' + Date.now(),
            name: newWhName || 'SAMI Webhook',
            url: newWhUrl,
            events: [...newWhEvents],
            secret: newWhSecret,
            isActive: true,
            createdAt: new Date().toISOString()
        };

        setWebhooks([...webhooks, newWh]);
        
        if (currentUser) {
            logAdminAction(currentUser, `Webhook registrado: ${newWh.name} dispuesto en ${newWh.url}`);
        }

        // Reset
        setNewWhName('');
        setNewWhUrl('');
        setNewWhEvents(['credit.payment.received']);
        setIsAddingWebhook(false);
    };

    const handleDeleteWebhook = (id: string, name: string) => {
        setWebhooks(webhooks.filter(w => w.id !== id));
        if (currentUser) {
            logAdminAction(currentUser, `Webhook eliminado: ${name}`);
        }
    };

    const handleToggleWebhook = (id: string) => {
        setWebhooks(webhooks.map(w => {
            if (w.id === id) {
                const nextState = !w.isActive;
                if (currentUser) {
                    logAdminAction(currentUser, `Webhook "${w.name}" cambiado a ${nextState ? 'activo' : 'inactivo'}`);
                }
                return { ...w, isActive: nextState };
            }
            return w;
        }));
    };

    const handleToggleEvent = (event: string) => {
        if (newWhEvents.includes(event)) {
            setNewWhEvents(newWhEvents.filter(e => e !== event));
        } else {
            setNewWhEvents([...newWhEvents, event]);
        }
    };

    const handleSimulationTrigger = () => {
        setIsSimulating(true);
        const targetWh = webhooks.find(w => w.id === simulatedWebhookId);
        
        setTimeout(() => {
            const randomId = Math.floor(Math.random() * 90000) + 10000;
            const mockPayload = {
                id: `evt_pay_${randomId}`,
                type: "credit.payment.received",
                created_at: new Date().toISOString(),
                data: {
                    payment_id: `pay_${Math.random().toString(36).substring(2, 7).toUpperCase()}-${randomId}`,
                    credit_id: `cre_loan_aef39-wh01`,
                    mype: {
                        ruc: rucSearch || "20762391024",
                        business_name: "Metales & Estructuras del Sur E.I.R.L.",
                        sami_score: 745
                    },
                    payment: {
                        amount_soles: 2450.00,
                        quota_number: 3,
                        total_quotas: 18,
                        payment_method: "SAMI_PAY_CCI",
                        timestamp: new Date().toISOString()
                    }
                }
            };

            const simulationResult = {
                timestamp: new Date().toLocaleTimeString(),
                requestHeaders: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Sami-Webhook-Gateway/1.4',
                    'X-Sami-Signature': `t=${Math.floor(Date.now() / 1000)},v1=${Math.random().toString(36).substring(2, 15)}`
                },
                requestBody: mockPayload,
                responseStatus: 200,
                responseBody: {
                    success: true,
                    message: "Webhook processed successfully",
                    received_at: new Date().toISOString()
                }
            };

            setSimulationLog(simulationResult);
            
            // Add dispatch log to historical array
            setDeliveryLogs(prev => [
                {
                    id: `evt_pay_${randomId}`,
                    timestamp: 'Justo ahora',
                    event: 'credit.payment.received',
                    url: targetWh ? targetWh.url : 'https://api.bancoalianza.pe/webhooks/sami-payments',
                    status: 200,
                    latency: `${Math.floor(Math.random() * 60) + 40}ms`
                },
                ...prev
            ]);

            if (currentUser && targetWh) {
                logAdminAction(currentUser, `Simulación de Webhook realizada exitosamente sobre ${targetWh.name}`);
            }

            setIsSimulating(false);
        }, 1200);
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-8">
            {/* Header section with real-time API state and allied bank identity */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-150 dark:shadow-none">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Portal Banco Aliado</h2>
                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500">
                            {isAnalyst && '🔍 Módulo de Análisis de Riesgos'}
                            {isSupervisor && '⚖️ Gestión y Supervisión de Cartera'}
                            {isAdmin && '⚙️ Configuración y Gobierno de Datos'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-100 dark:border-green-800">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">API Gateway Online</span>
                    </div>
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">Institución: Banco Alianza MYPE</p>
                </div>
            </header>

            {/* Premium Tab switcher */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 gap-6">
                <button
                    onClick={() => setActiveSection('scoring')}
                    className={`pb-3 text-xs font-black uppercase tracking-[0.1em] border-b-2 transition-all flex items-center gap-2 ${
                        activeSection === 'scoring'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <SlidersHorizontal size={14} />
                    Consulta & Scoring de Riesgo
                </button>
                <button
                    onClick={() => setActiveSection('webhooks')}
                    className={`pb-3 text-xs font-black uppercase tracking-[0.1em] border-b-2 transition-all flex items-center gap-2 ${
                        activeSection === 'webhooks'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <Globe size={14} />
                    Webhooks en Tiempo Real
                </button>
                <button
                    onClick={() => setActiveSection('open-finance')}
                    className={`pb-3 text-xs font-black uppercase tracking-[0.1em] border-b-2 transition-all flex items-center gap-2 ${
                        activeSection === 'open-finance'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <Network size={14} />
                    Open Finance LATAM
                </button>
            </div>

            {/* TAB SECTION: SCORING (Standard Scoring and Risk Evaluate View) */}
            {activeSection === 'scoring' && (
                <div className="space-y-8 animate-fadeIn">
                    {/* Supervisor View / Aggregate Metrics */}
                    {(isSupervisor || isAdmin) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">MYPEs Evaluadas (Mes)</p>
                                <p className="text-3xl font-black text-gray-900 dark:text-white">1,245</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Volumen Desembolsado</p>
                                <p className="text-3xl font-black text-gray-900 dark:text-white">S/ 4.2M</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Tasa Mora Cartera SAMI</p>
                                <p className="text-3xl font-black text-green-600">0.8%</p>
                            </div>
                        </div>
                    )}

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left: Configuration & Request */}
                        <div className="space-y-6">
                            {/* SBS Institutional Account Verification */}
                            <form onSubmit={handleVerifyAccount} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-indigo-500" />
                                    Verificación Cuenta SBS {isAccountVerified && (
                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                            <ShieldCheck size={11} className="stroke-[3]" />
                                        </span>
                                    )}
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                    {isAccountVerified 
                                        ? 'Identidad y cuenta institucional validadas exitosamente ante la SBS.' 
                                        : 'Registre su firma digital de analista y valide su CCI institucional para auditoría SBS.'
                                    }
                                </p>
                                {!isAccountVerified && (
                                    <>
                                        <div className="text-left space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">N° de Cuenta Institucional (CCI)</label>
                                            <input 
                                                required
                                                type="text"
                                                value={accountNumber}
                                                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                                placeholder="0011-0172-020054321..."
                                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                            />
                                        </div>

                                        {validationError && (
                                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-2xl flex items-start gap-2 text-left">
                                                <div className="bg-red-505 p-0.5 rounded-full text-white mt-0.5 bg-red-500">
                                                    <X size={10} strokeWidth={4} />
                                                </div>
                                                <p className="text-[11px] font-bold text-red-600 dark:text-red-400 leading-tight">
                                                    {validationError}
                                                </p>
                                            </div>
                                        )}

                                        <button 
                                            disabled={isValidatingAccount || accountNumber.length < 10}
                                            className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                                        >
                                            {isValidatingAccount ? (
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <ShieldCheck size={16} />
                                            )}
                                            {isValidatingAccount ? 'Validando...' : 'Validar Identidad'}
                                        </button>
                                    </>
                                )}
                                {isAccountVerified && (
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4 rounded-xl flex items-start gap-2 text-left">
                                        <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-green-700 dark:text-green-300 leading-tight">Canal Digital SBS Activo</p>
                                            <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-mono">CCI: {accountNumber.replace(/(\d{4})\d+(\d{4})/, '$1****$2') || 'Bco SBS-01'}</p>
                                        </div>
                                    </div>
                                )}
                            </form>

                            {(isAnalyst || isAdmin || isSupervisor) && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                        <Search size={18} className="text-indigo-500" />
                                        {isAdmin ? 'Simulador de Consulta' : 'Consulta de Scoring MYPE'}
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">RUC de la MYPE</label>
                                            <input 
                                                type="text" 
                                                value={rucSearch}
                                                onChange={(e) => setRucSearch(e.target.value)}
                                                maxLength={11}
                                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Ej: 20123456789"
                                            />
                                        </div>
                                        <button 
                                            onClick={callSamiApi}
                                            disabled={isLoading}
                                            className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none cursor-pointer"
                                        >
                                            {isLoading ? 'Analizando...' : 'Obtener Reporte SAMI'}
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isAdmin && (
                                <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-xl">
                                    <h3 className="font-bold mb-6 flex items-center gap-2">
                                        <Lock size={18} className="text-indigo-400" />
                                        Gestión de Credenciales
                                        <span className="bg-indigo-500 text-[8px] px-2 py-0.5 rounded-full uppercase ml-auto">Admin Only</span>
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-indigo-300 uppercase mb-1 block">API Key de Producción</label>
                                            <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
                                                <Key size={14} className="text-indigo-400" />
                                                <input 
                                                    type="password" 
                                                    value={token}
                                                    onChange={(e) => setToken(e.target.value)}
                                                    className="flex-grow bg-transparent text-xs font-mono outline-none"
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleRotateCredentials}
                                            className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 transition-all cursor-pointer rounded-xl text-xs font-black uppercase"
                                        >
                                            Rotar Credenciales
                                        </button>
                                        {rotateSuccess && (
                                            <div className="text-[10px] text-emerald-500 dark:text-emerald-400 font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                                                <CheckCircle2 size={13} className="text-emerald-500 animate-bounce" />
                                                ¡API Key de Producción Rotada!
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!isAdmin && (
                                <div className="p-6 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl text-white">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                                        <Database size={20} />
                                    </div>
                                    <h4 className="font-black mb-2 uppercase tracking-tight">SAMI Scoring Engine</h4>
                                    <p className="text-xs text-indigo-100 leading-relaxed font-semibold">
                                        Motor de riesgos basado en data transaccional SUNAT en tiempo real. 
                                        Predictor de cumplimiento de IGV y liquidez proyectada.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Right: API Response & Docs */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-gray-900 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-500/20 text-green-400 p-1.5 rounded-lg">
                                            <Code2 size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-white uppercase tracking-widest">Respuesta de Servidor (Inmutabilidad Certificada)</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(JSON.stringify(apiResponse, null, 4));
                                                setShowCopySuccess(true);
                                                setTimeout(() => setShowCopySuccess(false), 2000);
                                            }}
                                            className="p-2 text-white/40 hover:text-white transition-colors bg-white/5 rounded-lg"
                                            title="Copiar JSON"
                                        >
                                            {showCopySuccess ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="font-mono text-[11px] text-blue-300 h-[350px] overflow-y-auto custom-scrollbar p-2">
                                    {apiResponse ? (
                                        <pre>{JSON.stringify(apiResponse, null, 4)}</pre>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-white/20">
                                            <FileJson size={48} className="mb-4 opacity-10" />
                                            <p className="italic font-bold tracking-widest text-[10px] uppercase">// Esperando consulta transaccional...</p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Status bar */}
                                <div className="absolute bottom-4 right-6 flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">HTTP STATUS:</span>
                                    <span className={`text-[10px] font-black ${apiResponse?.error ? 'text-red-400' : 'text-green-400'}`}>
                                        {apiResponse ? (apiResponse.error ? '403 FORBIDDEN' : '200 OK') : '-'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
                                <div className="relative z-10">
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white mb-2 uppercase tracking-widest">Soporte Técnico de API</h4>
                                    <p className="text-xs text-gray-500 mb-6 font-medium">¿Necesitas ayuda con la integración o formatos de respuesta?</p>
                                    <div className="flex flex-wrap gap-3">
                                        <button className="px-4 py-2 bg-gray-50 dark:bg-gray-900 text-[10px] font-black uppercase tracking-tight rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-300 transition-colors">Documentación Swagger</button>
                                        <button className="px-4 py-2 bg-gray-50 dark:bg-gray-900 text-[10px] font-black uppercase tracking-tight rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-300 transition-colors">Soporte Slack SAMI</button>
                                        <button className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-tight rounded-xl hover:bg-indigo-700 transition-colors">Contactar Account Manager</button>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Network size={128} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB SECTION: WEBHOOKS (Newly created module for creating, managing, & testing paymen-realtime Webhooks) */}
            {activeSection === 'webhooks' && (
                <div className="grid lg:grid-cols-12 gap-8 animate-fadeIn">
                    {/* Left: Webhook Configurations & Add Form (Col: 7) */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50 dark:border-gray-700">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                        <Globe size={20} className="text-indigo-500" />
                                        Protocolos Webhook Registrados
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">Configure endpoints HTTPS para recibir avisos de pagos de créditos MYPE en tiempo real.</p>
                                </div>
                                <button
                                    onClick={() => setIsAddingWebhook(!isAddingWebhook)}
                                    className="p-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
                                >
                                    {isAddingWebhook ? <X size={14} /> : <Plus size={14} />}
                                    {isAddingWebhook ? 'Cancelar' : 'Nuevo Webhook'}
                                </button>
                            </div>

                            {/* Add Webhook Form Section */}
                            {isAddingWebhook && (
                                <form onSubmit={handleAddWebhook} className="mb-8 p-6 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 animate-fadeIn">
                                    <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                        <SlidersHorizontal size={14} />
                                        Registrar Endpoint de Escucha
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase block mb-1">Nombre Descriptivo</label>
                                            <input
                                                type="text"
                                                value={newWhName}
                                                onChange={(e) => setNewWhName(e.target.value)}
                                                placeholder="Ej: Servidor de Notificaciones de Cobranza CRM"
                                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-white placeholder:text-gray-400"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase block mb-1">Webhook URL Endpoint (HTTPS recomendado)</label>
                                            <input
                                                type="text"
                                                value={newWhUrl}
                                                onChange={(e) => {
                                                    setNewWhUrl(e.target.value);
                                                    if(urlError) setUrlError('');
                                                }}
                                                placeholder="https://api.tuempresa.com/v1/sami-payment-receiver"
                                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-600 dark:text-cyan-400 placeholder:text-gray-400"
                                                required
                                            />
                                            {urlError && <p className="text-[10px] text-red-500 font-bold mt-1 inline-flex items-center gap-1"><AlertCircle size={10} /> {urlError}</p>}
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase block mb-2">Eventos de Notificación Suscritos</label>
                                            <div className="space-y-2 bg-white dark:bg-gray-800/80 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                                <label className="flex items-start gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={newWhEvents.includes('credit.payment.received')}
                                                        onChange={() => handleToggleEvent('credit.payment.received')}
                                                        className="mt-1 accent-indigo-600"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">credit.payment.received</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Notificación al instante cuando un cliente MYPE paga su cuota de crédito.</p>
                                                    </div>
                                                </label>
                                                <label className="flex items-start gap-2 cursor-pointer select-none border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={newWhEvents.includes('credit.approved')}
                                                        onChange={() => handleToggleEvent('credit.approved')}
                                                        className="mt-1 accent-indigo-600"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">credit.approved</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Notificación al aprobar una solicitud de crédito.</p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase block mb-1">Clave Secreta de Firma (Signing Secret)</label>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={newWhSecret}
                                                    readOnly
                                                    className="flex-grow bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-500 dark:text-gray-400 outline-none select-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(newWhSecret);
                                                        showLocalPushNotification('📋 Copiado', 'Firma de webhook copiada al portapapeles con éxito.');
                                                    }}
                                                    className="p-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                                                    title="Copiar firma"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-gray-400 mt-1">Utilice esta clave secreta para verificar que las solicitudes provienen directamente de SAMI.</p>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl shadow-lg transition-transform active:scale-98 cursor-pointer"
                                    >
                                        ✓ Guardar Webhook
                                    </button>
                                </form>
                            )}

                            {/* List of active Webhooks */}
                            <div className="space-y-4">
                                {webhooks.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-55 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50">
                                        <Globe size={48} className="mx-auto text-gray-300 mb-3" />
                                        <p className="text-xs font-bold text-gray-400">Sin webhooks configurados. ¡Agrega tu primer canal de notificaciones!</p>
                                    </div>
                                ) : (
                                    webhooks.map((wh) => (
                                        <div 
                                            key={wh.id} 
                                            className={`p-5 rounded-2xl border transition-all relative group ${
                                                wh.isActive 
                                                    ? 'border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/10 dark:bg-indigo-950/5' 
                                                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/20 opacity-70'
                                            }`}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="space-y-1 text-left">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-black text-gray-900 dark:text-white text-sm tracking-tight">{wh.name}</h4>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                            wh.isActive 
                                                                ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' 
                                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                                        }`}>
                                                            {wh.isActive ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all select-all">{wh.url}</p>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {wh.events.map((evt, i) => (
                                                            <span key={i} className="text-[10px] font-black tracking-tight font-mono bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                                                                {evt}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 self-start md:self-center">
                                                    <button
                                                        onClick={() => {
                                                            setSimulatedWebhookId(wh.id);
                                                            handleSimulationTrigger();
                                                        }}
                                                        disabled={isSimulating}
                                                        className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer"
                                                        title="Lanzar un payload de prueba"
                                                    >
                                                        <Play size={10} />
                                                        Probar
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleWebhook(wh.id)}
                                                        className={`p-2 rounded-xl border text-xs transition-colors active:scale-95 cursor-pointer ${
                                                            wh.isActive 
                                                                ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 text-green-600' 
                                                                : 'border-gray-200 dark:border-gray-700 text-gray-400'
                                                        }`}
                                                        title={wh.isActive ? 'Pausar Webhook' : 'Activar Webhook'}
                                                    >
                                                        {wh.isActive ? 'ON' : 'OFF'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteWebhook(wh.id, wh.name)}
                                                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all active:scale-95 cursor-pointer"
                                                        title="Eliminar Webhook"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Recent Webhook Delivery log (Events Historial) */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm text-left">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-gray-500" />
                                Historial Reciente de Entregas (Logs)
                            </h3>
                            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-wider text-gray-400">
                                        <tr>
                                            <th className="p-3">Evento ID</th>
                                            <th className="p-3">Destino URL</th>
                                            <th className="p-3">Estado</th>
                                            <th className="p-3 text-right">Latencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-150 dark:divide-gray-800 font-medium text-gray-600 dark:text-gray-300">
                                        {deliveryLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="p-3 font-mono">
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white">{log.id}</p>
                                                        <p className="text-[10px] text-gray-400">{log.timestamp}</p>
                                                    </div>
                                                </td>
                                                <td className="p-3 font-mono text-[10px] truncate max-w-[200px]" title={log.url}>{log.url}</td>
                                                <td className="p-3">
                                                    <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 font-black text-[10px] rounded-lg border border-green-100 dark:border-green-900/40 font-mono">
                                                        {log.status} OK
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-mono text-gray-400">{log.latency}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right: Simulation Console (Col: 5) */}
                    <div className="lg:col-span-12 xl:col-span-5 lg:order-last space-y-6">
                        {/* Interactive Webhook Client payment simulator */}
                        <div className="bg-indigo-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden group text-left">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/10 p-2 rounded-xl text-indigo-300">
                                        <Terminal size={18} />
                                    </div>
                                    <div>
                                        <span className="text-xs font-black uppercase tracking-widest text-white block">Simulador de Eventos</span>
                                        <span className="text-[10px] text-indigo-200">Pruebe el payload de pago de crédito MYPE</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-indigo-200 uppercase mb-1 block">Seleccionar Webhook Destino</label>
                                    <select
                                        value={simulatedWebhookId}
                                        onChange={(e) => setSimulatedWebhookId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white uppercase font-bold outline-none cursor-pointer focus:border-indigo-400"
                                    >
                                        {webhooks.map((w) => (
                                            <option key={w.id} value={w.id} className="bg-gray-900 text-white">
                                                {w.name} ({w.isActive ? 'Activo' : 'Inactivo'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={handleSimulationTrigger}
                                    disabled={isSimulating}
                                    className="w-full py-3.5 bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-50 text-gray-900 font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isSimulating ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-950 rounded-full animate-spin" />
                                            Creando Pago y Despachando...
                                        </>
                                    ) : (
                                        <>
                                            <Play size={14} className="fill-current" />
                                            Simular Pago de Crédito MYPE
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Simulated response log screen */}
                            <div className="mt-6 bg-black/40 rounded-2xl p-4 border border-white/5 font-mono text-[10px] leading-relaxed relative min-h-[300px]">
                                <span className="absolute top-2 right-4 text-[8px] font-black text-white/20 uppercase tracking-wider">EVENT CONSOLE</span>
                                
                                {isSimulating ? (
                                    <div className="flex flex-col items-center justify-center h-[280px] text-white/30 animate-pulse">
                                        <RefreshCw size={24} className="animate-spin mb-2" />
                                        <p className="italic">// Procesando pago transaccional S/ 2,450.00...</p>
                                        <p className="text-[9px] mt-1 text-white/20">// Generando firma HMAC SHA256...</p>
                                    </div>
                                ) : simulationLog ? (
                                    <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar p-1">
                                        <div>
                                            <p className="text-green-400 font-bold mb-1">&gt; POST {webhooks.find(w => w.id === simulatedWebhookId)?.url || 'https://api.bancoalianza.pe'}</p>
                                            <p className="text-gray-400">Time: {simulationLog.timestamp}</p>
                                            <p className="text-gray-400">Response Status: <span className="text-green-400 font-bold">{simulationLog.responseStatus} OK</span></p>
                                        </div>

                                        <div className="border-t border-white/5 pt-2">
                                            <p className="text-indigo-300 font-bold mb-1">// HTTP Request Headers</p>
                                            <pre className="text-gray-300 text-[9px]">{JSON.stringify(simulationLog.requestHeaders, null, 2)}</pre>
                                        </div>

                                        <div className="border-t border-white/5 pt-2">
                                            <p className="text-indigo-300 font-bold mb-1">// Event Payload: credit.payment.received</p>
                                            <pre className="text-gray-350 text-[9px] whitespace-pre-wrap text-teal-300">{JSON.stringify(simulationLog.requestBody, null, 2)}</pre>
                                        </div>

                                        <div className="border-t border-white/5 pt-2">
                                            <p className="text-indigo-300 font-bold mb-1">// Webhook Endpoint Response</p>
                                            <pre className="text-green-300 text-[9px]">{JSON.stringify(simulationLog.responseBody, null, 2)}</pre>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[280px] text-white/20">
                                        <Terminal size={32} className="mb-3 opacity-20" />
                                        <p className="italic text-center font-bold tracking-widest text-[9px] uppercase">// Sin simulación activa.</p>
                                        <p className="text-[9px] text-white/10 text-center max-w-[200px] mt-1">Haz clic en "Simular Pago de Crédito MYPE" para generar y despachar un evento de pago en tiempo real.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Informative Help Guide Card */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm text-left">
                            <h4 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider mb-2">Manual de Firma Webhook</h4>
                            <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
                                Para evitar ataques de suplantación, cada petición webhook incluye una firma en la cabecera <code className="bg-gray-100 dark:bg-gray-900 p-1 rounded font-mono text-[10px]">X-Sami-Signature</code>. 
                                La firma se genera concatenando el timestamp y el payload JSON utilizando HMAC-SHA256 con su Signing Secret.
                            </p>
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800 text-[10px] font-mono text-gray-400">
                                signature = hmac_sha256(timestamp + "." + payload, secret)
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB SECTION: OPEN FINANCE (LATAM Open Finance Sandbox) */}
            {activeSection === 'open-finance' && (
                <div className="space-y-8 animate-fadeIn text-left">
                    {/* Header explanatory box */}
                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-widest">
                                Estándares Regulatorios LATAM (Open Finance)
                            </span>
                            <h3 className="text-xl md:text-2xl font-black tracking-tight">Consola Sandbox de Open Finance</h3>
                            <p className="text-xs text-slate-350 max-w-2xl font-semibold leading-relaxed font-sans">
                                Alineado con el modelo de consentimiento seguro de la <b className="text-white">SBS de Perú</b>, <b className="text-white">CNBV de México</b>, <b className="text-white">SFC de Colombia</b>, y el <b className="text-white">Banco Central de Brasil</b>. Autoriza e integra flujos de cuentas transaccionales con consentimiento 100% explícito del cliente final.
                            </p>
                        </div>
                        <div className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-mono text-indigo-300">
                            Status: <span className="text-green-400 font-bold">Standard Spec Active</span>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Column 1 & 2: Main interactive board */}
                        <div className="lg:col-span-2 space-y-6 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                                    <div>
                                        <h4 className="font-extrabold text-gray-900 dark:text-white text-sm">Flujo de Consentimiento y Transferencia de Cuentas</h4>
                                        <p className="text-[11px] text-gray-400 font-semibold">Simule el ciclo de vida del Token de Consentimiento e identifique los metadatos transaccionales.</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl border border-gray-150 dark:border-gray-800 self-start">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-1">Cliente:</span>
                                        <select 
                                            value={selectedClient} 
                                            onChange={(e) => { setSelectedClient(e.target.value); setConsentGranted(false); setOpenFinanceTransactions([]); }}
                                            className="bg-transparent text-xs font-black text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer"
                                        >
                                            <option value="Don Carlos S.A.C.">Don Carlos S.A.C.</option>
                                            <option value="Inversiones del Centro E.I.R.L.">Inversiones del Centro E.I.R.L.</option>
                                            <option value="Artesanías Andinas">Artesanías Andinas</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="p-4 bg-slate-50 dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-750 font-sans space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs font-sans">1</div>
                                            <h5 className="font-bold text-xs text-gray-800 dark:text-white uppercase tracking-wider">Otorgar Consentimiento</h5>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-normal font-medium">El cliente final aprueba explícitamente abrir su cuenta de ahorros/corriente Banco Alianza hacia SAMI bajo tokens OAuth2 regulados.</p>
                                        
                                        {!consentGranted ? (
                                            <button 
                                                onClick={() => setConsentGranted(true)}
                                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                                            >
                                                Autorizar Consentimiento
                                            </button>
                                        ) : (
                                            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl p-2 text-green-600 dark:text-green-400 font-sans">
                                                <div className="flex items-center gap-1 text-[10px] font-black uppercase">
                                                    <CheckCircle2 size={12} className="stroke-[3]" />
                                                    <span>Autorizado (Vence en 90 días)</span>
                                                </div>
                                                <button onClick={() => { setConsentGranted(false); setOpenFinanceTransactions([]); }} className="text-[10px] underline font-bold cursor-pointer hover:text-red-500">Revocar</button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-slate-50 dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-750 font-sans space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs font-sans">2</div>
                                            <h5 className="font-bold text-xs text-gray-800 dark:text-white uppercase tracking-wider">Sincronizar Ledger de Cuentas</h5>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-normal font-medium">SAMI ejecuta la petición GET a los endpoints bancarios de Open Banking del Banco Alianza usando la credencial autorizada.</p>
                                        
                                        <button 
                                            disabled={!consentGranted || isSynchronizingOpenFinance}
                                            onClick={handleOpenFinanceSync}
                                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isSynchronizingOpenFinance ? (
                                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <RefreshCw size={11} />
                                            )}
                                            {isSynchronizingOpenFinance ? 'Sincronizando...' : 'Sincronizar Transacciones'}
                                        </button>
                                    </div>
                                </div>

                                {/* Transactions output table */}
                                {openFinanceTransactions.length > 0 && (
                                    <div className="border border-gray-150 dark:border-gray-800 rounded-2xl overflow-hidden font-sans space-y-3 p-4 animate-fadeIn">
                                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-850 pb-2">
                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                                                <SlidersHorizontal size={12} />
                                                <span>Transacciones de {selectedClient}</span>
                                            </div>
                                            <span className="text-[9px] font-mono font-bold text-gray-400">Secure AES-GCM Encrypted</span>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-[11px] text-left">
                                                <thead>
                                                    <tr className="text-gray-400 font-extrabold uppercase border-b border-gray-100 dark:border-gray-800 text-[9px]">
                                                        <th className="py-2.5 px-2">ID</th>
                                                        <th className="py-2.5 px-2">Fecha</th>
                                                        <th className="py-2.5 px-2">Descripción</th>
                                                        <th className="py-2.5 px-2 text-right">Monto</th>
                                                        <th className="py-2.5 px-2 text-center">Tipo</th>
                                                        <th className="py-2.5 px-2 text-right">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-850 font-semibold text-gray-600 dark:text-gray-300">
                                                    {openFinanceTransactions.map((txn) => (
                                                        <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-gray-900/50">
                                                            <td className="py-2.5 px-2 font-mono text-[10px] text-gray-400">{txn.id}</td>
                                                            <td className="py-2.5 px-2 font-mono text-[10px]">{txn.date}</td>
                                                            <td className="py-2.5 px-2 text-gray-800 dark:text-white max-w-[200px] truncate animate-fadeIn" title={txn.desc}>{txn.desc}</td>
                                                            <td className={`py-2.5 px-2 text-right font-black font-mono ${txn.type === 'IN' ? 'text-green-600' : 'text-red-500'}`}>
                                                                {txn.type === 'IN' ? '+' : '-'} S/ {txn.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="py-2.5 px-2 text-center">
                                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${txn.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-150 text-red-800'}`}>
                                                                    {txn.type === 'IN' ? 'Ingreso' : 'Egreso'}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-2 text-right text-[9px] font-bold text-gray-400">{txn.status}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Column 3: LATAM Framework comparison guide */}
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                <h4 className="font-extrabold text-[12px] text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-850 pb-3 flex items-center gap-2">
                                    <Activity size={15} className="text-indigo-500" />
                                    Regulación Open Finance LATAM
                                </h4>
                                
                                <div className="space-y-4 text-xs font-semibold">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-950 dark:text-white font-extrabold font-sans">Brasil (Banco Central)</span>
                                            <span className="px-1.5 py-0.5 text-[8px] bg-indigo-550 bg-indigo-600 text-white rounded font-black tracking-widest font-mono">PINÁCULO</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-300 leading-normal font-sans">Obligatorio por fases desde 2020. Pix integrado con APIs transaccionales. Los bancos deben compartir datos de cuentas y créditos al instante de recibir consentimiento.</p>
                                    </div>

                                    <div className="space-y-1 border-t border-gray-100 dark:border-gray-850 pt-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-950 dark:text-white font-extrabold font-sans">México (Ley Fintech / CNBV)</span>
                                            <span className="px-1.5 py-0.5 text-[8px] bg-emerald-500/10 text-emerald-600 rounded font-black tracking-widest font-mono">ESTÁNDAR</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-300 leading-normal font-sans">Pionero con la Ley Fintech del 2018. Requiere que entidades reguladas tengan APIs abiertas para datos agregados, financieros y transaccionales.</p>
                                    </div>

                                    <div className="space-y-1 border-t border-gray-100 dark:border-gray-850 pt-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-950 dark:text-white font-extrabold font-sans">Colombia (SFC / Decreto 1297)</span>
                                            <span className="px-1.5 py-0.5 text-[8px] bg-indigo-500/10 text-indigo-600 rounded font-black tracking-widest font-mono">ESTÁNDAR</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-300 leading-normal font-sans">Aprobada en 2022. Fomenta el ecosistema voluntario de finanzas abiertas y portabilidad financiera segura mediante APIs unificadas.</p>
                                    </div>

                                    <div className="space-y-1 border-t border-gray-100 dark:border-gray-850 pt-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-950 dark:text-white font-extrabold font-sans">Perú (SBS / BCRP)</span>
                                            <span className="px-1.5 py-0.5 text-[8px] bg-amber-500/10 text-amber-600 rounded font-black tracking-widest font-mono">EMERGENTE</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-300 leading-normal font-sans">Interoperabilidad obligatoria de billeteras móviles. Las APIs abiertas de consulta transaccional y SUNAT son claves para la inclusión financiera de las MYPEs.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankDashboard;
