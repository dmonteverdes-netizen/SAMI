
import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { getAdminDashboardData, getPartnerPerformanceData } from '../../services/adminService';
import { getAuditLogs, logAdminAction } from '../../services/auditService';
import { AdminDashboardData, PartnerPerformance, User, AuditLog, AppRole, PartnerFinancialInstitution } from '../../types';
import { useSecurity } from '../../core/context/SecurityContext';
import KpiCard from '../dashboard/KpiCard';
import { ShieldCheck, ShieldAlert, BarChart3, History, Rocket, ArrowRight, ExternalLink, Lock, MessageSquare, Handshake, Plus, Pencil, Trash2, X, Check, Globe, Terminal, Activity, Play, Copy, CheckCircle2, RefreshCw, Send, AlertTriangle, Search, Filter, Calendar, Coins, Star, Award } from 'lucide-react';
import { RucLookup } from '../gestion/RucLookup';
import { moduloDisponible } from '../../core/config/phases';

interface AdminDashboardProps {
    currentUser: User;
    onNavigate: (view: any) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onNavigate }) => {
    const { isAdminAuthenticated, open2faModal } = useSecurity();
    const [kpiData, setKpiData] = useState<AdminDashboardData | null>(null);
    const [partnerData, setPartnerData] = useState<PartnerPerformance[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'kpis' | 'logs' | 'strategy' | 'partners' | 'webhooks'>('kpis');
    const [partnersList, setPartnersList] = useState<PartnerFinancialInstitution[]>([]);
    
    // Filtering and Sorting State for Partners
    const [partnerSortBy, setPartnerSortBy] = useState<'credits' | 'conversion' | 'name'>('credits');
    const [partnerSortOrder, setPartnerSortOrder] = useState<'asc' | 'desc'>('desc');
    const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
    const [minConversionFilter, setMinConversionFilter] = useState<number>(0);
    const [partnerStartDate, setPartnerStartDate] = useState('');
    const [partnerEndDate, setPartnerEndDate] = useState('');

    // Audit Logs Filter States
    const [searchLogQuery, setSearchLogQuery] = useState('');
    const [filterLogUser, setFilterLogUser] = useState<string>('all');
    const [filterLogOperationType, setFilterLogOperationType] = useState<string>('all');
    const [filterLogDate, setFilterLogDate] = useState<string>('all'); // 'all', 'today', 'yesterday', 'this_week'
    
    // Partner Form State
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [isRucModalOpen, setIsRucModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<PartnerFinancialInstitution | null>(null);
    const [partnerForm, setPartnerForm] = useState({ name: '', logoUrl: '', contactEmail: '', contactPhone: '' });

    // Partner Webhooks State
    interface PartnerWebhook {
        id: string;
        name: string;
        url: string;
        events: string[];
        secret: string;
        isActive: boolean;
        createdAt: string;
    }

    interface WebhookLog {
        id: string;
        timestamp: string;
        event: string;
        webhookName: string;
        url: string;
        status: number;
        statusText: string;
        latency: number;
        payload: string;
        response: string;
    }

    const [founderWebhooks, setFounderWebhooks] = useState<PartnerWebhook[]>([
        {
            id: 'pwh_1',
            name: 'Caja Arequipa Core Integrator',
            url: 'https://api.cajaarequipa.pe/webhooks/sami-credits',
            events: ['credit.requested', 'credit.approved'],
            secret: 'whsec_aef6731e80ac28bd019e09d84',
            isActive: true,
            createdAt: '2026-05-12T10:15:30Z'
        },
        {
            id: 'pwh_2',
            name: 'MYPE Monitor Analytics',
            url: 'https://dispatcher.analytics-mype.io/events',
            events: ['credit.disbursed', 'credit.payment.received'],
            secret: 'whsec_90fedd12aef912be03810f2c4',
            isActive: true,
            createdAt: '2026-05-18T16:40:00Z'
        },
        {
            id: 'pwh_3',
            name: 'Interbank API Gateway',
            url: 'https://interbank.pe/api/webhooks/sami-v1',
            events: ['credit.approved', 'credit.disbursed'],
            secret: 'whsec_bca9283e10fc328901eefdeac',
            isActive: false,
            createdAt: '2026-05-21T08:00:00Z'
        }
    ]);

    // Webhook Form State
    const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<PartnerWebhook | null>(null);
    const [webhookForm, setWebhookForm] = useState({
        name: '',
        url: '',
        events: [] as string[],
        isActive: true
    });
    const [webhookFormError, setWebhookFormError] = useState<string | null>(null);
    const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);
    const [createdWebhookName, setCreatedWebhookName] = useState<string>('');

    // Webhook Testing / Simulation State
    const [selectedWebhookId, setSelectedWebhookId] = useState<string>('pwh_1');
    const [selectedEventType, setSelectedEventType] = useState<string>('credit.requested');
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
    const [isSimulatingTest, setIsSimulatingTest] = useState(false);
    const [simulatedLog, setSimulatedLog] = useState<{
        status: 'idle' | 'sending' | 'success' | 'failed';
        headers: Record<string, string>;
        requestPayload: any;
        responseStatus: number;
        responseBody: any;
        latency: number;
    } | null>(null);

    const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([
        {
            id: 'log_wh_1',
            timestamp: '2026-05-22T08:14:10Z',
            event: 'credit.requested',
            webhookName: 'Caja Arequipa Core Integrator',
            url: 'https://api.cajaarequipa.pe/webhooks/sami-credits',
            status: 200,
            statusText: 'OK',
            latency: 112,
            payload: JSON.stringify({ event: 'credit.requested', id: 'evt_rq_10349', data: { amount: 15000.00 } }, null, 2),
            response: JSON.stringify({ received: true, ack_id: 'ack_req_arequipa_892' }, null, 2)
        },
        {
            id: 'log_wh_2',
            timestamp: '2026-05-22T09:30:25Z',
            event: 'credit.payment.received',
            webhookName: 'MYPE Monitor Analytics',
            url: 'https://dispatcher.analytics-mype.io/events',
            status: 200,
            statusText: 'OK',
            latency: 85,
            payload: JSON.stringify({ event: 'credit.payment.received', id: 'evt_pay_58291', data: { amount_paid: 1380.50 } }, null, 2),
            response: JSON.stringify({ status: 'delivered_processed' }, null, 2)
        },
        {
            id: 'log_wh_3',
            timestamp: '2026-05-22T11:02:14Z',
            event: 'credit.approved',
            webhookName: 'Interbank API Gateway',
            url: 'https://interbank.pe/api/webhooks/sami-v1',
            status: 500,
            statusText: 'Internal Server Error',
            latency: 240,
            payload: JSON.stringify({ event: 'credit.approved', id: 'evt_ap_89301', data: { amount_approved: 15000.00 } }, null, 2),
            response: JSON.stringify({ error: 'Gateway Timeout connecting to internal service bank-credit-v2' }, null, 2)
        }
    ]);

    const [copiedSecId, setCopiedSecId] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSecId(id);
        setTimeout(() => setCopiedSecId(null), 2000);
    };

    const handleAddWebhook = () => {
        setEditingWebhook(null);
        setWebhookForm({ name: '', url: '', events: ['credit.requested'], isActive: true });
        setWebhookFormError(null);
        setCreatedWebhookSecret(null);
        setCreatedWebhookName('');
        setIsWebhookModalOpen(true);
    };

    const handleEditWebhook = (webhook: PartnerWebhook) => {
        setEditingWebhook(webhook);
        setWebhookForm({
            name: webhook.name,
            url: webhook.url,
            events: [...webhook.events],
            isActive: webhook.isActive
        });
        setWebhookFormError(null);
        setCreatedWebhookSecret(null);
        setCreatedWebhookName('');
        setIsWebhookModalOpen(true);
    };

    const handleDeleteWebhook = (id: string) => {
        setFounderWebhooks(prev => prev.filter(w => w.id !== id));
        logAdminAction(currentUser, `Eliminó Webhook Partner ID: ${id}`);
    };

    const handleToggleWebhook = (id: string) => {
        setFounderWebhooks(prev => prev.map(w => {
            if (w.id === id) {
                const updated = !w.isActive;
                logAdminAction(currentUser, `${updated ? 'Activó' : 'Desactivó'} Webhook ID: ${id}`);
                return { ...w, isActive: updated };
            }
            return w;
        }));
    };

    const handleSaveWebhook = (e: React.FormEvent) => {
        e.preventDefault();
        setWebhookFormError(null);

        if (!webhookForm.name.trim()) {
            setWebhookFormError('Por favor, ingresa un nombre para el webhook.');
            return;
        }
        
        // Simple URL Validation
        if (!webhookForm.url.startsWith('http://') && !webhookForm.url.startsWith('https://')) {
            setWebhookFormError('Por favor, ingresa una URL con protocolo http:// o https://');
            return;
        }

        if (webhookForm.events.length === 0) {
            setWebhookFormError('Por favor, selecciona al menos un evento para suscribir.');
            return;
        }

        if (editingWebhook) {
            setFounderWebhooks(prev => prev.map(w => 
                w.id === editingWebhook.id 
                ? { 
                    ...w, 
                    name: webhookForm.name, 
                    url: webhookForm.url, 
                    events: webhookForm.events,
                    isActive: webhookForm.isActive
                  }
                : w
            ));
            logAdminAction(currentUser, `Actualizó webhook partner: ${webhookForm.name}`);
            setIsWebhookModalOpen(false);
        } else {
            const generatedSecret = `whsec_${Math.random().toString(16).substr(2, 10)}${Math.random().toString(16).substr(2, 10)}`;
            const newWebhook: PartnerWebhook = {
                id: `pwh_${Math.random().toString(36).substr(2, 9)}`,
                name: webhookForm.name,
                url: webhookForm.url,
                events: webhookForm.events,
                secret: generatedSecret,
                isActive: webhookForm.isActive,
                createdAt: new Date().toISOString()
            };
            setFounderWebhooks(prev => [...prev, newWebhook]);
            logAdminAction(currentUser, `Creó webhook partner: ${webhookForm.name}`);
            
            // Set the created secret so we can show it to the user in a success sub-view inside the modal
            setCreatedWebhookSecret(generatedSecret);
            setCreatedWebhookName(webhookForm.name);
        }
    };

    const handleCloseWebhookSuccess = () => {
        setCreatedWebhookSecret(null);
        setCreatedWebhookName('');
        setIsWebhookModalOpen(false);
    };

    const toggleWebhookEvent = (event: string) => {
        setWebhookForm(prev => {
            if (prev.events.includes(event)) {
                return { ...prev, events: prev.events.filter(e => e !== event) };
            } else {
                return { ...prev, events: [...prev.events, event] };
            }
        });
    };

    const handleTriggerWebhookTest = () => {
        const targetWh = founderWebhooks.find(w => w.id === selectedWebhookId);
        if (!targetWh) {
            alert('Por favor, selecciona un webhook válido.');
            return;
        }

        setIsSimulatingTest(true);
        setSimulatedLog({
            status: 'sending',
            headers: {},
            requestPayload: null,
            responseStatus: 0,
            responseBody: null,
            latency: 0
        });

        // Generate dynamic payload based on selectedEventType
        const payloadId = `evt_${selectedEventType.replace(/\./g, '_')}_${Math.floor(10000 + Math.random() * 90000)}`;
        const timestamp = new Date().toISOString();
        
        const selectedPartner = partnersList.find(p => p.id === selectedPartnerId);
        const partnerInfo = selectedPartner ? {
            id: selectedPartner.id,
            name: selectedPartner.name,
            logoUrl: selectedPartner.logoUrl
        } : null;

        let customData = {};
        if (selectedEventType === 'credit.requested') {
            customData = {
                application_id: `app_REQ_${Math.floor(10000 + Math.random() * 90000)}`,
                amount: 15000.00,
                ...(partnerInfo ? { partner: partnerInfo } : {}),
                mype: {
                    ruc: "20123456789",
                    business_name: "Corporación Textil Gamarra S.A.C.",
                    avg_monthly_sales: 25000,
                    tax_compliance_status: "Al día"
                }
            };
        } else if (selectedEventType === 'credit.approved') {
            customData = {
                application_id: `app_REQ_${Math.floor(10000 + Math.random() * 90000)}`,
                amount_approved: 15000.00,
                term_months: 12,
                interest_rate_monthly: 2.5,
                ...(partnerInfo ? { partner: partnerInfo } : {}),
                mype: {
                    ruc: "20123456789",
                    business_name: "Corporación Textil Gamarra S.A.C.",
                    avg_monthly_sales: 25000,
                    tax_compliance_status: "Al día"
                }
            };
        } else if (selectedEventType === 'credit.disbursed') {
            customData = {
                application_id: `app_REQ_${Math.floor(10000 + Math.random() * 90000)}`,
                loan_id: `loan_SAMI_${Math.floor(10000 + Math.random() * 90000)}`,
                amount_disbursed: 15000.00,
                disbursement_cci: "00219100293029103920",
                ...(partnerInfo ? { partner: partnerInfo } : {}),
                mype: {
                    ruc: "20123456789",
                    business_name: "Corporación Textil Gamarra S.A.C.",
                    avg_monthly_sales: 25000,
                    tax_compliance_status: "Al día"
                }
            };
        } else {
            customData = {
                payment_id: `pay_SAMI_${Math.floor(10000 + Math.random() * 90000)}`,
                loan_id: `loan_SAMI_${Math.floor(10000 + Math.random() * 90000)}`,
                quota_number: 1,
                total_quotas: 12,
                amount_paid: 1380.50,
                ...(partnerInfo ? { partner: partnerInfo } : {}),
                mype: {
                    ruc: "20123456789",
                    business_name: "Corporación Textil Gamarra S.A.C.",
                    avg_monthly_sales: 25000,
                    tax_compliance_status: "Al día"
                }
            };
        }

        const requestPayload = {
            event: selectedEventType,
            id: payloadId,
            timestamp,
            data: customData
        };

        const signatureTime = Math.floor(Date.now() / 1000);
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'SAMI-Webhook-Dispatcher/2.0',
            'X-Sami-Signature': `t=${signatureTime},v1=${Math.random().toString(16).substr(2, 40)}`
        };

        // Simulate network call
        setTimeout(() => {
            const isSuccess = targetWh.isActive && (Math.random() > 0.15 || targetWh.url.includes('cajaarequipa') || targetWh.url.includes('dispatcher'));
            const responseStatus = isSuccess ? 200 : (targetWh.isActive ? 502 : 0);
            const responseStatusText = isSuccess ? 'OK' : (targetWh.isActive ? 'Bad Gateway' : 'Connection Timeout (Inactive Webhook)');
            const latency = Math.floor(60 + Math.random() * 120);

            const responseBody = isSuccess 
                ? { received: true, ack_id: `ack_${payloadId.slice(4)}`, processedAt: new Date().toISOString() }
                : (targetWh.isActive 
                    ? { error: "Failed to connect: Target server returned an invalid upstream response", code: "UPSTREAM_ERROR" }
                    : { error: "Destination endpoint cannot be triggered because the webhook is disabled in SAMI Console", code: "WEBHOOK_INACTIVE" }
                  );

            setSimulatedLog({
                status: isSuccess ? 'success' : 'failed',
                headers,
                requestPayload,
                responseStatus,
                responseBody,
                latency
            });

            // Add to logs history
            const newLog: WebhookLog = {
                id: `log_wh_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                event: selectedEventType,
                webhookName: targetWh.name,
                url: targetWh.url,
                status: responseStatus,
                statusText: responseStatusText,
                latency,
                payload: JSON.stringify(requestPayload, null, 2),
                response: JSON.stringify(responseBody, null, 2)
            };

            setWebhookLogs(prev => [newLog, ...prev]);
            setIsSimulatingTest(false);
            
            logAdminAction(currentUser, `Test de Webhook: Disparo de evento ${selectedEventType} a ${targetWh.name} -> Status ${responseStatus}`);
        }, 1200);
    };
    
    // Log mount for first time
    useEffect(() => {
        logAdminAction(currentUser, 'SAMI Internal: Acceso inicial a Panel Administrativo');
    }, []);

    // Handlers for Partner Management
    const handleAddPartner = () => {
        setEditingPartner(null);
        setPartnerForm({ name: '', logoUrl: '', contactEmail: '', contactPhone: '' });
        setIsPartnerModalOpen(true);
    };

    const handleEditPartner = (partner: PartnerFinancialInstitution) => {
        setEditingPartner(partner);
        setPartnerForm({ 
            name: partner.name, 
            logoUrl: partner.logoUrl, 
            contactEmail: partner.contactEmail || '',
            contactPhone: partner.contactPhone || ''
        });
        setIsPartnerModalOpen(true);
    };

    const handleDeletePartner = (id: string) => {
        setPartnersList(prev => prev.filter(p => p.id !== id));
        logAdminAction(currentUser, `Eliminó partner ID: ${id}`);
    };

    const handleSavePartner = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPartner) {
            setPartnersList(prev => prev.map(p => 
                p.id === editingPartner.id 
                ? { 
                    ...p, 
                    name: partnerForm.name, 
                    logoUrl: partnerForm.logoUrl, 
                    contactEmail: partnerForm.contactEmail,
                    contactPhone: partnerForm.contactPhone 
                  }
                : p
            ));
            logAdminAction(currentUser, `Actualizó partner: ${partnerForm.name}`);
        } else {
            const newPartner: PartnerFinancialInstitution = {
                id: `partner_${Math.random().toString(36).substr(2, 9)}`,
                name: partnerForm.name,
                logoUrl: partnerForm.logoUrl || 'https://placehold.co/100x40/6366f1/ffffff?text=Partner',
                contactEmail: partnerForm.contactEmail,
                contactPhone: partnerForm.contactPhone
            };
            setPartnersList(prev => [...prev, newPartner]);
            logAdminAction(currentUser, `Agregó partner: ${partnerForm.name}`);
        }
        setIsPartnerModalOpen(false);
    };

    const handlePartnerSort = (column: 'credits' | 'conversion' | 'name') => {
        if (partnerSortBy === column) {
            setPartnerSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setPartnerSortBy(column);
            setPartnerSortOrder('desc');
        }
    };
    
    const isSamiAdmin = currentUser.role === AppRole.SAMI_ADMIN;
    
    // Helper to categorize audit logs and return styling
    const getLogCategory = (action: string) => {
        const text = action.toLowerCase();
        if (text.includes('2fa') || text.includes('acceso') || text.includes('autentic') || text.includes('inicio') || text.includes('security') || text.includes('sección') || text.includes('rol')) {
            return {
                label: 'Seguridad',
                color: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
                actionType: 'security'
            };
        }
        if (text.includes('webhook') || text.includes('api key') || text.includes('endpoint') || text.includes('disparo')) {
            return {
                label: 'Red / Webhooks',
                color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
                actionType: 'network'
            };
        }
        if (text.includes('límite') || text.includes('crédito') || text.includes('recalculate') || text.includes('recalculación') || text.includes('limit')) {
            return {
                label: 'Límites de Crédito',
                color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
                actionType: 'credit'
            };
        }
        if (text.includes('ruc') || text.includes('sunat') || text.includes('score') || text.includes('scoring') || text.includes('partner') || text.includes('fusión')) {
            return {
                label: 'Consultas & Partners',
                color: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
                actionType: 'consult'
            };
        }
        return {
            label: 'Operación Core',
            color: 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
            actionType: 'core'
        };
    };

    // Memoized unique log users for the user filtration dropdown list
    const uniqueLogUsers = useMemo(() => {
        const usersMap = new Map<string, string>();
        auditLogs.forEach(log => {
            if (log.user?.id) {
                usersMap.set(log.user.id, log.user.name);
            }
        });
        return Array.from(usersMap.entries()).map(([id, name]) => ({ id, name }));
    }, [auditLogs]);

    // Check if timestamp is in matching date range
    const isWithinDateRange = (timestamp: string, range: string) => {
        if (range === 'all') return true;
        const logDateObj = new Date(timestamp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (range === 'today') {
            return logDateObj >= today;
        }
        if (range === 'yesterday') {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return logDateObj >= yesterday && logDateObj < today;
        }
        if (range === 'this_week') {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(startOfWeek.getDate() - today.getDay());
            return logDateObj >= startOfWeek;
        }
        return true;
    };

    // Memoized filtered audit logs
    const filteredAuditLogs = useMemo(() => {
        return auditLogs.filter(log => {
            // Search Query Filter
            const matchesSearch = 
                log.action.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
                log.user.name.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
                log.id.toLowerCase().includes(searchLogQuery.toLowerCase());
                
            // User Filter
            const matchesUser = filterLogUser === 'all' || log.user.id === filterLogUser;
            
            // Operation Type Filter
            let matchesCategory = true;
            if (filterLogOperationType !== 'all') {
                const cat = getLogCategory(log.action).label;
                matchesCategory = cat === filterLogOperationType;
            }
            
            // Date Filter
            const matchesDate = isWithinDateRange(log.timestamp, filterLogDate);
            
            return matchesSearch && matchesUser && matchesCategory && matchesDate;
        });
    }, [auditLogs, searchLogQuery, filterLogUser, filterLogOperationType, filterLogDate]);
    
    // Sensitive Data Access Logic
    // We strictly check for SAMI_ADMIN role AND 2FA authentication state for internal metrics,
    // or allow access if the thesis presentation "Viewer" (unmasked mode) is active.
    const isUnmaskedMode = typeof window !== 'undefined' && localStorage.getItem('sami_disable_masking') === 'true';
    const canAccessSecurityData = (isSamiAdmin && isAdminAuthenticated) || isUnmaskedMode;
    const canViewSensitiveMetrics = (isSamiAdmin && isAdminAuthenticated) || isUnmaskedMode;

    // Reset tab if permissions change while viewing restricted area
    useEffect(() => {
        if (activeTab === 'logs' && !canAccessSecurityData) {
            setActiveTab('kpis');
        }
    }, [canAccessSecurityData, activeTab]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [kpis, partners] = await Promise.all([
                    getAdminDashboardData(partnerStartDate, partnerEndDate),
                    getPartnerPerformanceData(partnerStartDate, partnerEndDate)
                ]);
                setKpiData(kpis);
                setPartnerData(partners);
                setPartnersList(partners.map(p => p.partner));
                
                // Only fetch logs if user has the right role and is authenticated
                if (canAccessSecurityData) {
                    const logs = await getAuditLogs();
                    setAuditLogs(logs);
                }
            } catch (error) {
                console.error("Error fetching admin data:", error);
            } finally {
                // Simulate slightly longer loading for aesthetic transition if needed, 
                // but here we just set it
                setIsLoading(false);
            }
        };
        fetchData();
    }, [canAccessSecurityData, partnerStartDate, partnerEndDate]);

    // Log access when component mounts or tab changes
    useEffect(() => {
        const descriptions = {
            kpis: 'Sección de Métricas Estratégicas',
            logs: 'Registro de Auditoría de Seguridad',
            strategy: 'Hoja de Roadmap Táctico',
            partners: 'Gestión de Alianzas Financieras',
            webhooks: 'Panel de Webhooks de Partners'
        };
        
        const actionMessage = `Cambio de pestaña: ${descriptions[activeTab]}`;
        logAdminAction(currentUser, `SAMI Internal: ${actionMessage}`);
    }, [activeTab, currentUser]);

    // --- Elaborate Skeleton Loader ---
    if (isLoading || !kpiData) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-7xl min-h-screen">
                {/* Header Skeleton */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-16">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full animate-pulse" />
                            <div className="h-3 w-48 bg-indigo-100 dark:bg-indigo-900/30 rounded-full animate-pulse" />
                        </div>
                        <div className="h-16 w-80 bg-gray-200 dark:bg-gray-800 rounded-[2rem] animate-pulse" />
                        <div className="h-5 w-[500px] bg-gray-100 dark:bg-gray-800/50 rounded-full animate-pulse" />
                        <div className="flex gap-4">
                            <div className="h-12 w-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                        </div>
                    </div>
                    {/* Nav Skeleton */}
                    <div className="h-20 w-full lg:w-[480px] bg-white/40 dark:bg-gray-800/40 rounded-[2.5rem] border border-gray-200/50 dark:border-white/5 animate-pulse" />
                </div>

                <div className="space-y-12">
                    {/* Hero Section Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 h-[480px] bg-white dark:bg-gray-900 rounded-[3.5rem] border border-gray-100 dark:border-gray-800 p-12 space-y-12 animate-pulse">
                            <div className="flex justify-between items-center">
                                <div className="space-y-5">
                                    <div className="h-3 w-40 bg-gray-100 dark:bg-gray-800 rounded-full" />
                                    <div className="h-10 w-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                                </div>
                                <div className="h-20 w-32 bg-gray-100 dark:bg-gray-800 rounded-[2rem]" />
                            </div>
                            <div className="h-8 w-full bg-gray-50 dark:bg-gray-800/50 rounded-full" />
                            <div className="grid grid-cols-3 gap-10">
                                <div className="space-y-3">
                                    <div className="h-2 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
                                    <div className="h-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl" />
                                </div>
                                <div className="space-y-3">
                                    <div className="h-2 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
                                    <div className="h-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl" />
                                </div>
                                <div className="space-y-3">
                                    <div className="h-2 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
                                    <div className="h-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl" />
                                </div>
                            </div>
                        </div>
                        <div className="h-[480px] bg-[#0A0A0B] rounded-[3.5rem] p-12 border border-white/5 relative overflow-hidden animate-pulse">
                            <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] mb-12" />
                            <div className="h-10 w-56 bg-white/5 rounded-2xl mb-6" />
                            <div className="h-24 w-full bg-white/5 rounded-2xl mb-12" />
                            <div className="h-14 w-64 bg-white/5 rounded-2xl" />
                        </div>
                    </div>

                    {/* Quick Stats Grid Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-44 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 animate-pulse relative p-8">
                                <div className="flex justify-between">
                                    <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded-full" />
                                    <div className="h-8 w-8 bg-gray-50 dark:bg-gray-800 rounded-lg" />
                                </div>
                                <div className="mt-8 h-12 w-32 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                                <div className="absolute bottom-6 left-8 right-8 h-1 bg-gray-50 dark:bg-gray-800 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Branded Loading Indicator */}
                <div role="status" aria-label="Cargando datos..." className="mt-20 flex flex-col items-center gap-6">
                    <span className="sr-only">Cargando...</span>
                    <div className="relative">
                        {/* SAMI Branding Pulsing Aura */}
                        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                        <div className="relative flex items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-full shadow-2xl ring-1 ring-black/[0.05]">
                            <div className="w-16 h-16 border-[5px] border-indigo-100 dark:border-indigo-900/30 rounded-full" />
                            <div className="absolute w-16 h-16 border-[5px] border-indigo-600 rounded-full border-t-transparent animate-spin" />
                            <ShieldCheck size={28} className="absolute text-indigo-600 animate-bounce" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-[0.4em]">SAMI Core Infrastructure</p>
                        <p className="text-gray-400 font-bold text-[9px] uppercase tracking-[0.2em] mt-2">Sincronizando Neural Platform • EU-WEST-1</p>
                    </div>
                </div>
            </div>
        );
    }

    const mrrChartData = kpiData.mrrHistory.map(h => ({
        mes: h.month,
        MRR: h.value
    }));

    // Calculate the average volume of credits (loansDisbursed) of the network
    const averageLoansDisbursed = useMemo(() => {
        if (!partnerData || partnerData.length === 0) return 0;
        const total = partnerData.reduce((sum, item) => sum + item.loansDisbursed, 0);
        return total / partnerData.length;
    }, [partnerData]);

    // Process Partner Data (Filter & Sort)
    const processedPartnerData = [...partnerData]
        .filter(p => {
            if ((p.conversionRate * 100) < minConversionFilter) return false;
            if (partnerSearchQuery.trim()) {
                const query = partnerSearchQuery.toLowerCase();
                return p.partner.name.toLowerCase().includes(query);
            }
            return true;
        })
        .sort((a, b) => {
            let val = 0;
            if (partnerSortBy === 'credits') {
                val = b.loansDisbursed - a.loansDisbursed;
            } else if (partnerSortBy === 'conversion') {
                val = b.conversionRate - a.conversionRate;
            } else if (partnerSortBy === 'name') {
                val = a.partner.name.localeCompare(b.partner.name);
            }
            return partnerSortOrder === 'desc' ? val : -val;
        });

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            {/* Upper Navigation & Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-[0.4em] mb-3">
                        <ShieldCheck size={14} className="animate-pulse" />
                        SAMI Internal Infrastructure
                    </div>
                    <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                        Core Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-3 text-lg">
                        Visualización táctica de la red y control de gobernanza.
                    </p>
                    {moduloDisponible('chat', currentUser.role) && (
                        <button 
                            onClick={() => onNavigate('chat')}
                            className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-indigo-600/10 hover:bg-indigo-600 dark:bg-indigo-600/20 dark:hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 border border-indigo-600/20 hover:border-indigo-600 group"
                        >
                            <MessageSquare size={16} className="group-hover:rotate-12 transition-transform" />
                            Consultar Asistente AI
                        </button>
                    )}
                </motion.div>

                {/* Glassmorphism Navigation */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center bg-white/40 dark:bg-gray-800/40 backdrop-blur-2xl p-1.5 rounded-[2.2rem] border border-gray-200/50 dark:border-white/5 shadow-xl shadow-indigo-500/5"
                >
                    {(['kpis', 'logs', 'strategy', 'partners', 'webhooks'] as const).map((tab) => {
                        // Restricted tab check
                        if (tab === 'logs' && !canAccessSecurityData) return null;
                        
                        const icons = {
                            kpis: <BarChart3 size={16} />,
                            logs: <History size={16} />,
                            strategy: <Rocket size={16} />,
                            partners: <Handshake size={16} />,
                            webhooks: <Globe size={16} />
                        };

                        return (
                            <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab)} 
                                className={`flex items-center gap-2.5 px-6 py-3.5 text-xs font-black uppercase tracking-widest rounded-[1.8rem] transition-all duration-500 relative overflow-hidden group ${
                                    activeTab === tab 
                                    ? 'bg-gray-950 text-white shadow-2xl shadow-indigo-500/20 ring-1 ring-white/10 scale-[1.02]' 
                                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-800/60'
                                }`}
                            >
                                <span className={`relative z-10 flex items-center gap-2.5 ${activeTab === tab ? 'animate-in fade-in slide-in-from-bottom-1' : ''}`}>
                                    {icons[tab]}
                                    <span>{tab === 'kpis' ? 'Métricas' : tab === 'logs' ? 'Auditoría' : tab === 'strategy' ? 'Estrategia' : tab === 'partners' ? 'Partners' : 'Webhooks'}</span>
                                </span>
                                {activeTab === tab && (
                                    <motion.div 
                                        layoutId="active-tab-glow"
                                        className="absolute inset-0 bg-gradient-to-tr from-indigo-900 via-indigo-950 to-gray-900 dark:from-indigo-600 dark:via-indigo-950 dark:to-gray-950 opacity-100"
                                    />
                                )}
                            </button>
                        );
                    })}
                    {moduloDisponible('chat', currentUser.role) && (
                        <>
                            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2" />
                            <button 
                                onClick={() => onNavigate('chat')}
                                className="flex items-center gap-2.5 px-6 py-3.5 text-xs font-black uppercase tracking-widest rounded-[1.8rem] transition-all duration-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 group"
                            >
                                <MessageSquare size={16} className="group-hover:rotate-12 transition-transform" />
                                <span>Chat AI</span>
                            </button>
                        </>
                    )}
                </motion.div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'kpis' && (
                    <motion.div 
                        key="kpis"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-10"
                    >
                        {/* Hero Stats: Pipeline */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-[3rem] p-12 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                                <div className="relative z-10">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-2">Formalización Proyectada</p>
                                            <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Ecosistema MYPE</h3>
                                        </div>
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 rounded-3xl border border-indigo-100 dark:border-indigo-800/30">
                                            <p className="text-3xl font-black text-indigo-600 tracking-tighter tabular-nums">
                                                {((kpiData.growthPipeline.activeCount / kpiData.growthPipeline.totalGoal) * 100).toFixed(0)}%
                                            </p>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1 text-center">Meta Lograda</p>
                                        </div>
                                    </div>

                                    <div className="space-y-12">
                                        <div className="relative pt-6">
                                            <div className="h-6 bg-gray-100 dark:bg-gray-800/50 rounded-full overflow-hidden p-1 border border-gray-100 dark:border-gray-800">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(kpiData.growthPipeline.activeCount / kpiData.growthPipeline.totalGoal) * 100}%` }}
                                                    transition={{ duration: 2, ease: "circOut" }}
                                                    className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-500 rounded-full shadow-[0_0_25px_rgba(79,70,229,0.3)]" 
                                                />
                                            </div>
                                            <div className="absolute top-0 right-0 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                Target: {kpiData.growthPipeline.totalGoal.toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-8">
                                            {[
                                                { label: 'En Espera', val: kpiData.growthPipeline.inQueueCount, sub: 'Validación' },
                                                { label: 'Onboarding', val: kpiData.growthPipeline.onboardingCount, sub: 'SAMI Pro', accent: 'text-indigo-600' },
                                                { label: 'Graduadas', val: kpiData.growthPipeline.graduatedCount, sub: 'Crédito Listo', accent: 'text-green-600' }
                                            ].map((item, i) => (
                                                <div key={i} className="hover:translate-y-[-4px] transition-transform duration-300">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                                                    <p className={`text-4xl font-black tracking-tighter ${item.accent || 'text-gray-900 dark:text-white'}`}>{item.val}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 mt-1">{item.sub}</p>
                                                </div>
                                            ))}

                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full" />
                            </div>

                            <div className="bg-[#0A0A0B] rounded-[3rem] p-12 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden border border-white/5 group">
                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center mb-10 transition-transform group-hover:rotate-12 duration-500">
                                        <ShieldAlert size={32} className="text-white" />
                                    </div>
                                    <h4 className="text-3xl font-black mb-4 tracking-tighter leading-tight">Estado Sistémico</h4>
                                    <p className="text-gray-400 text-base font-medium leading-relaxed mb-10">
                                        Servidores regionales y API bancaria operando en tiempo real (Cluster: EU-01).
                                    </p>
                                    
                                    <div className="inline-flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl">
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ring-4 ring-green-500/20" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-green-400">Status: 99.98% OK</span>
                                    </div>
                                </div>
                                <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full" />
                            </div>
                        </div>

                        {/* Professional KPI Grid */}
                        <motion.section 
                            initial="hidden"
                            animate="show"
                            variants={{
                                hidden: { opacity: 0 },
                                show: {
                                    opacity: 1,
                                    transition: {
                                        staggerChildren: 0.1
                                    }
                                }
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
                        >
                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                                <KpiCard
                                    title="MRR Consolidado"
                                    value={canViewSensitiveMetrics ? `S/ ${kpiData.mrr.value.toLocaleString('es-PE')}` : 'S/ ••••••'}
                                    trend={kpiData.mrr.trend}
                                    tooltip={canViewSensitiveMetrics ? "Ingresos Recurrentes Mensuales de suscripciones SAMI." : "Métrica restringida para el rol actual."}
                                />
                            </motion.div>
                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                                <KpiCard
                                    title="Conversión de Red"
                                    value={`${(kpiData.creditConversionRate.value * 100).toFixed(1)}%`}
                                    trend={kpiData.creditConversionRate.trend}
                                    tooltip="MYPES que activaron productos financieros tras validación."
                                />
                            </motion.div>
                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                                <KpiCard
                                    title="Churn Rate (MoM)"
                                    value={canViewSensitiveMetrics ? `${(kpiData.churnRate.value * 100).toFixed(1)}%` : '•••%'}
                                    trend={kpiData.churnRate.trend}
                                    isTrendPositive={kpiData.churnRate.trend <= 0}
                                    tooltip={canViewSensitiveMetrics ? "Tasa de abandono del ecosistema formalizado." : "Métrica restringida para el rol actual."}
                                />
                            </motion.div>
                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                                <KpiCard
                                    title="Riesgo Crediticio"
                                    value={`${(kpiData.portfolioRisk.value * 100).toFixed(1)}%`}
                                    trend={kpiData.portfolioRisk.trend}
                                    isTrendPositive={kpiData.portfolioRisk.trend <= 0}
                                    tooltip="Probabilidad ponderada de morosidad en la red."
                                />
                            </motion.div>
                        </motion.section>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Detailed Revenue Chart */}
                            <div className={`lg:col-span-2 bg-white dark:bg-gray-900 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-800 p-12 relative overflow-hidden`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                                    <div>
                                        <h3 className="font-black text-2xl text-gray-900 dark:text-white tracking-tight">Evolución de Ingresos</h3>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Growth Metrics — Histórico 6 Meses</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-[10px] font-black text-gray-500 border border-gray-200/50 dark:border-gray-700">PEN / SOL</span>
                                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </div>

                                {canViewSensitiveMetrics ? (
                                    <div className="h-[380px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={mrrChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} opacity={0.5} />
                                                <XAxis 
                                                    dataKey="mes" 
                                                    tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 800 }} 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    dy={15}
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 800 }} 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tickFormatter={(v) => `S/${(v/1000).toFixed(0)}k`} 
                                                />
                                                <Tooltip
                                                    contentStyle={{ 
                                                        borderRadius: '24px', 
                                                        border: 'none', 
                                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', 
                                                        background: '#0F172A', 
                                                        color: 'white',
                                                        padding: '16px 20px'
                                                    }}
                                                    itemStyle={{ color: 'white', fontWeight: 800, fontSize: '13px' }}
                                                    labelStyle={{ color: '#94A3B8', fontWeight: 900, marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                                />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="MRR" 
                                                    stroke="#6366F1" 
                                                    strokeWidth={5} 
                                                    dot={{ fill: '#6366F1', strokeWidth: 3, stroke: 'white', r: 6 }} 
                                                    activeDot={{ r: 10, strokeWidth: 0, fill: '#4F46E5' }} 
                                                    animationDuration={1500}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-[380px] w-full flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                                        <div className="w-20 h-20 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center text-gray-300 dark:text-gray-700 mb-8 ring-1 ring-black/[0.03] dark:ring-white/[0.03]">
                                            <Lock size={32} />
                                        </div>
                                        <p className="text-sm font-black text-gray-500 uppercase tracking-[0.2em]">Visualización Restringida</p>
                                        <p className="text-xs text-gray-400 font-medium mt-3 max-w-[200px] text-center leading-relaxed">
                                            Se requiere verificación de identidad 2FA para visualizar métricas financieras.
                                        </p>
                                        <button 
                                            onClick={open2faModal}
                                            className="mt-8 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                                        >
                                            Verificar Ahora
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Partner Performance Bento Box */}
                            <div className={`bg-white dark:bg-gray-900 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-800 p-12 ${!canViewSensitiveMetrics ? 'lg:col-span-3' : ''}`}>
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                                    <h3 className="font-black text-2xl text-gray-900 dark:text-white tracking-tight">Aliados Activos</h3>
                                    
                                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto lg:justify-end">
                                        {/* Search Box */}
                                        <div className="relative flex items-center bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 w-full sm:w-64">
                                            <Search size={14} className="ml-4 text-gray-500 absolute pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Buscar aliado..."
                                                value={partnerSearchQuery}
                                                onChange={(e) => setPartnerSearchQuery(e.target.value)}
                                                className="w-full bg-transparent border-none text-[10px] font-bold text-gray-700 dark:text-gray-300 pl-10 pr-10 py-2.5 focus:ring-0 outline-none placeholder:text-gray-400"
                                            />
                                            {partnerSearchQuery && (
                                                <button 
                                                    onClick={() => setPartnerSearchQuery('')}
                                                    className="absolute right-3 p-1 text-gray-550 hover:text-gray-900 dark:text-gray-400 cursor-pointer"
                                                    title="Limpiar búsqueda"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Sort Control */}
                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2 border border-gray-100 dark:border-gray-700">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ordenar:</span>
                                            <select 
                                                value={partnerSortBy}
                                                onChange={(e) => setPartnerSortBy(e.target.value as 'credits' | 'conversion' | 'name')}
                                                className="bg-transparent border-none text-[10px] font-bold text-gray-600 dark:text-gray-300 focus:ring-0 outline-none cursor-pointer"
                                            >
                                                <option value="credits">Créditos</option>
                                                <option value="conversion">Conversión</option>
                                                <option value="name">Socio</option>
                                            </select>
                                        </div>

                                        {/* Sort Direction Toggle */}
                                        <button 
                                            onClick={() => setPartnerSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                            className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2.5 border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-550 dark:text-gray-400 hover:text-indigo-600 transition-all font-bold text-[10px] uppercase tracking-widest gap-1"
                                            title={partnerSortOrder === 'desc' ? 'Orden descendente' : 'Orden ascendente'}
                                        >
                                             {partnerSortOrder === 'desc' ? 'Desc ↓' : 'Asc ↑'}
                                        </button>

                                        {/* Filter Control */}
                                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2 border border-gray-100 dark:border-gray-700">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conv. &gt; {minConversionFilter}%:</span>
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max="100" 
                                                value={minConversionFilter}
                                                onChange={(e) => setMinConversionFilter(parseInt(e.target.value))}
                                                className="w-24 accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        {/* Date Range Filter for Partners */}
                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-3 px-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Inicio</span>
                                                    <input 
                                                        type="date" 
                                                        value={partnerStartDate} 
                                                        onChange={e => setPartnerStartDate(e.target.value)}
                                                        className="bg-transparent border-none text-[10px] font-black focus:ring-0 p-0 text-gray-700 dark:text-gray-200 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Fin</span>
                                                    <input 
                                                        type="date" 
                                                        value={partnerEndDate} 
                                                        onChange={e => setPartnerEndDate(e.target.value)}
                                                        className="bg-transparent border-none text-[10px] font-black focus:ring-0 p-0 text-gray-700 dark:text-gray-200 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                            {(partnerStartDate || partnerEndDate) && (
                                                <button 
                                                    onClick={() => { setPartnerStartDate(''); setPartnerEndDate(''); }}
                                                    className="flex items-center justify-center p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-red-500 transition-all cursor-pointer mr-1"
                                                    title="Limpiar fechas"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-gray-800 select-none">
                                                <th 
                                                    onClick={() => handlePartnerSort('name')}
                                                    className="pb-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-indigo-650 transition-colors"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        Socio Estratégico
                                                        {partnerSortBy === 'name' && (
                                                            <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                                                                {partnerSortOrder === 'desc' ? '▼' : '▲'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </th>
                                                <th 
                                                    onClick={() => handlePartnerSort('credits')}
                                                    className="pb-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-indigo-650 transition-colors"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        Créditos
                                                        {partnerSortBy === 'credits' && (
                                                            <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                                                                {partnerSortOrder === 'desc' ? '▼' : '▲'}
                                                             </span>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="pb-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest select-none">
                                                    Tendencia (Últimos 3m)
                                                </th>
                                                <th className="pb-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest select-none">
                                                    Última Actividad
                                                </th>
                                                {canAccessSecurityData && (
                                                    <th 
                                                        onClick={() => handlePartnerSort('conversion')}
                                                        className="pb-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-indigo-650 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            Tasa de Conversión
                                                            {partnerSortBy === 'conversion' && (
                                                                <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                                                                    {partnerSortOrder === 'desc' ? '▼' : '▲'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                            {processedPartnerData.length > 0 ? (
                                                 processedPartnerData.map(p => { const isFeatured = p.loansDisbursed > averageLoansDisbursed; return (
                                                <tr 
                                                     key={p.partner.id} 
                                                     className={`group transition-all duration-300 ${
                                                         isFeatured 
                                                             ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-l-[4px] border-l-amber-500 hover:bg-amber-500/[0.08] dark:hover:bg-amber-500/[0.1]' 
                                                             : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30 border-l-[4px] border-l-transparent'
                                                     }`}
                                                 >
                                                    <td className="py-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-12 h-12 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 p-2 flex items-center justify-center transition-all group-hover:bg-white dark:group-hover:bg-gray-700 ring-1 ring-black/[0.03] dark:ring-white/[0.03]">
                                                                <img 
                                                                    src={p.partner.logoUrl} 
                                                                    alt={p.partner.name} 
                                                                    className="max-h-full max-w-full grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" 
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                 <div className="flex items-center gap-2">
                                                                     <p className="text-sm font-black text-gray-800 dark:text-white group-hover:text-amber-500 transition-colors">{p.partner.name}</p>
                                                                     {isFeatured && (
                                                                         <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-md border border-amber-500/20 shadow-sm animate-pulse">
                                                                             <Star size={8} className="fill-current" /> Featured
                                                                         </span>
                                                                     )}
                                                                 </div>
                                                                 {isFeatured && (
                                                                     <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 select-none opacity-90">
                                                                         Supera el promedio de la red ({averageLoansDisbursed.toFixed(1)})
                                                                     </span>
                                                                 )}
                                                             </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-6 whitespace-nowrap">
                                                        <p className="text-sm font-bold text-gray-600 dark:text-gray-400 tracking-tight">{p.loansDisbursed} Colocaciones</p>
                                                    </td>
                                                    <td className="py-6 whitespace-nowrap">
                                                        <div className="w-24 h-10">
                                                            {p.historicalCredits && p.historicalCredits.length > 0 ? (
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <LineChart data={p.historicalCredits} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                                                                        <Tooltip
                                                                            content={({ active, payload }) => {
                                                                                if (active && payload && payload.length) {
                                                                                    return (
                                                                                        <div className="bg-slate-900 dark:bg-slate-950 text-white px-2 py-1 rounded-lg text-[9px] font-black border border-slate-800/50 shadow-md">
                                                                                            <span className="font-semibold">{payload[0].payload.month}:</span> {payload[0].value}
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            }}
                                                                        />
                                                                        <Line 
                                                                            type="monotone" 
                                                                            dataKey="value" 
                                                                            stroke="#6366F1" 
                                                                            strokeWidth={2} 
                                                                            dot={{ r: 2.5, fill: '#6366F1', strokeWidth: 0 }} 
                                                                            activeDot={{ r: 4, strokeWidth: 0, fill: '#4F46E5' }}
                                                                        />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-400 dark:text-gray-550 font-bold">Sin datos</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="relative flex h-2 w-2">
                                                                {p.isOnline && (
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                )}
                                                                <span className={`relative inline-flex rounded-full h-2 w-2 ${p.isOnline ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'}`}></span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                                    {p.isOnline ? 'Disponible' : 'Inactivo'}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                                                    {p.lastActive || 'Hace unos instantes'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {canAccessSecurityData && (
                                                        <td className="py-6 text-right whitespace-nowrap">
                                                            <div className="inline-block px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl text-sm font-black tracking-tighter">
                                                                {(p.conversionRate * 100).toFixed(0)}%
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ); })
                                            ) : (
                                                <tr>
                                                    <td colSpan={canAccessSecurityData ? 5 : 4} className="py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-550 max-w-xs mx-auto animate-fade-in">
                                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-550 dark:text-indigo-400 mb-4 border border-indigo-100 dark:border-indigo-900/20">
                                                                <Search size={20} />
                                                            </div>
                                                            <p className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">Sin coincidencias</p>
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-550 mt-2 font-medium leading-relaxed">
                                                                No encontramos aliados financieros que coincidan con la búsqueda "{partnerSearchQuery}". Intenta ajustar tus filtros.
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <button className="w-full mt-10 py-5 bg-gray-50 dark:bg-gray-800/50 hover:bg-indigo-600 hover:text-white border-2 border-dashed border-gray-100 dark:border-gray-700 hover:border-indigo-600 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 group">
                                    Configurar Marketplace
                                    <ArrowRight size={14} className="inline ml-2 transition-transform group-hover:translate-x-2" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'logs' && canAccessSecurityData && (
                    <motion.div 
                        key="logs"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="bg-white dark:bg-gray-900 rounded-[3rem] border-2 border-indigo-100/50 dark:border-indigo-900/30 p-12 shadow-2xl overflow-hidden"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-10 mb-12">
                            <div>
                                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Control de Auditoría</h2>
                                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Seguridad Nivel 1 — Inmutable Data Sync</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right hidden md:block">
                                    <p className="text-xs font-black text-gray-900 dark:text-white">Live Monitoring</p>
                                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-0.5 animate-pulse">Sincronizado</p>
                                </div>
                                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40">
                                    <ShieldCheck size={28} />
                                </div>
                            </div>
                        </div>

                        {/* Filtros de Auditoría Avanzados */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50/80 dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-100/60 dark:border-white/5 mb-10 select-none">
                            {/* Búsqueda general */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-550">
                                    Buscar Acción o ID
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="Ej. Webhook, 2FA, Daniel..."
                                        value={searchLogQuery}
                                        onChange={(e) => setSearchLogQuery(e.target.value)}
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-2xl pl-11 pr-5 py-3.5 text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all dark:placeholder:text-gray-600"
                                    />
                                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>

                            {/* Filtrar por Usuario */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-550">
                                    Usuario de Auditoría
                                </label>
                                <select 
                                    value={filterLogUser}
                                    onChange={(e) => setFilterLogUser(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-2xl px-5 py-3.5 text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all cursor-pointer"
                                >
                                    <option value="all">Todos los usuarios</option>
                                    {uniqueLogUsers.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Filtrar por Tipo de Operación */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-550">
                                    Tipo de Operación
                                </label>
                                <select 
                                    value={filterLogOperationType}
                                    onChange={(e) => setFilterLogOperationType(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-2xl px-5 py-3.5 text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all cursor-pointer"
                                >
                                    <option value="all">Todas las operaciones</option>
                                    <option value="Seguridad">Seguridad y Acceso</option>
                                    <option value="Red / Webhooks">Red y Webhooks</option>
                                    <option value="Límites de Crédito">Límites de Crédito</option>
                                    <option value="Consultas & Partners">Consultas y Partners</option>
                                    <option value="Operación Core">Operaciones Core</option>
                                </select>
                            </div>

                            {/* Filtrar por Rango Temporal */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-550">
                                    Rango Temporal
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <select 
                                            value={filterLogDate}
                                            onChange={(e) => setFilterLogDate(e.target.value)}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-2xl pl-10 pr-4 py-3.5 text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all cursor-pointer"
                                        >
                                            <option value="all">Todo el tiempo</option>
                                            <option value="today">Hoy</option>
                                            <option value="yesterday">Ayer</option>
                                            <option value="this_week">Esta semana</option>
                                        </select>
                                        <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    
                                    {(searchLogQuery || filterLogUser !== 'all' || filterLogOperationType !== 'all' || filterLogDate !== 'all') && (
                                        <button 
                                            onClick={() => {
                                                setSearchLogQuery('');
                                                setFilterLogUser('all');
                                                setFilterLogOperationType('all');
                                                setFilterLogDate('all');
                                            }}
                                            className="px-4 bg-[#f8fafd] hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-2xl transition-colors shrink-0 flex items-center justify-center border border-gray-200 dark:border-gray-700/50 cursor-pointer"
                                            title="Restablecer filtros"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto -mx-12 px-12">
                            {filteredAuditLogs.length > 0 ? (
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-800">
                                            <th className="pb-8 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] w-[20%]">Horario Estampado</th>
                                            <th className="pb-8 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] w-[22%]">Identidad Interna</th>
                                            <th className="pb-8 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Evento Registrado</th>
                                            <th className="pb-8 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] w-[22%]">Tipo de Operación</th>
                                            <th className="pb-8 text-right text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] w-[14%]">Gobernanza</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                                        {filteredAuditLogs.map((log, index) => {
                                            const category = getLogCategory(log.action);
                                            return (
                                                <motion.tr 
                                                    key={log.id} 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: Math.min(index * 0.03, 0.4) }}
                                                    className="group hover:bg-slate-50/40 dark:hover:bg-gray-800/20 transition-all duration-300"
                                                >
                                                    <td className="py-7 whitespace-nowrap">
                                                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-extrabold font-mono tracking-tight tabular-nums">
                                                            {new Date(log.timestamp).toLocaleTimeString('es-PE')}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                                            {new Date(log.timestamp).toLocaleDateString('es-PE')}
                                                        </p>
                                                    </td>
                                                    <td className="py-7 whitespace-nowrap">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-2xl bg-indigo-50/80 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-800/40">
                                                                {log.user.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-gray-800 dark:text-gray-100 leading-tight">{log.user.name}</p>
                                                                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-tighter mt-1">ID: {log.user.id.toUpperCase()}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-7 text-sm text-gray-600 dark:text-gray-300 font-normal pr-5">
                                                        <div className="break-words max-w-md font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                                                            {log.action}
                                                        </div>
                                                        <p className="text-[9px] font-mono text-gray-400 mt-1.5 select-all opacity-85">UUID: {log.id}</p>
                                                    </td>
                                                    <td className="py-7 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border ${category.color}`}>
                                                            {category.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-7 text-right whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest ring-1 ring-emerald-100 dark:ring-emerald-400/20">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            Inmutable
                                                        </span>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-850/10 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                                    <ShieldAlert size={48} className="text-indigo-400/80 mb-6" />
                                    <p className="text-lg font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest">Sin resultados</p>
                                    <p className="text-sm text-gray-500 mt-2 text-center max-w-md px-6 leading-relaxed">
                                        No se encontraron registros de auditoría que coincidan con los filtros de usuario, rango temporal o tipo de operación seleccionados.
                                    </p>
                                    <button 
                                        onClick={() => {
                                            setSearchLogQuery('');
                                            setFilterLogUser('all');
                                            setFilterLogOperationType('all');
                                            setFilterLogDate('all');
                                        }}
                                        className="mt-6 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/10 cursor-pointer"
                                    >
                                        Restablecer Todos los Filtros
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'strategy' && (
                    <motion.div 
                        key="strategy"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-10"
                    >
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <h4 className="text-3xl font-black mb-8 tracking-tighter">Visión Táctica AI</h4>
                                <div className="space-y-8">
                                    {[
                                        { id: '01', text: 'Optimización de penetración en Retail mediante Formalización Express.' },
                                        { id: '02', text: 'Reducción de Riesgo Sistémico con el motor de Evaluación v2.4 (Beta).' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex gap-6 items-start group/item">
                                            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xs font-black flex-shrink-0 group-hover/item:bg-white group-hover/item:text-indigo-600 transition-all">
                                                {item.id}
                                            </div>
                                            <p className="text-base font-medium text-indigo-50 leading-relaxed pt-2">
                                                {item.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-white/10 blur-[100px] rounded-full" />
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-12 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-10 tracking-tight">Roadmap Q3-Q4</h4>
                            <div className="space-y-10">
                                {[
                                    { title: 'Full Banking Sync', status: 'In Progress', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                                    { title: 'Fraud Risk Engine', status: 'Q4 2026', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                                    { title: 'Plataforma Multi-Bank', status: 'Backlog', color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-2 rounded-full ${item.color.replace('text', 'bg')} transition-all group-hover:scale-150 shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                                            <span className="text-sm font-black text-gray-800 dark:text-gray-200">{item.title}</span>
                                        </div>
                                        <span className={`px-4 py-1.5 ${item.bg} ${item.color} rounded-xl text-[9px] font-black uppercase tracking-widest border border-current opacity-60`}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'partners' && (
                    <motion.div 
                        key="partners"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-10"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Gestión de Partners</h3>
                                <p className="text-sm font-medium text-gray-500 mt-2">Administra las entidades financieras conectadas al ecosistema SAMI.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 shrink-0">
                                <button 
                                    type="button"
                                    onClick={() => setIsRucModalOpen(true)}
                                    className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-750 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 cursor-pointer"
                                    title="Consultar datos de un RUC ante la SUNAT"
                                >
                                    <Search size={16} className="text-indigo-500" />
                                    <span>Consultar RUC</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleAddPartner}
                                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 cursor-pointer flex-shrink-0"
                                >
                                    <Plus size={18} />
                                    <span>Nuevo Partner</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {partnersList.map((partner) => (
                                <motion.div 
                                    layout
                                    key={partner.id}
                                    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 group hover:border-indigo-500/30 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-4 flex items-center justify-center border border-gray-100 dark:border-gray-800 group-hover:scale-110 transition-transform duration-500">
                                            <img 
                                                src={partner.logoUrl} 
                                                alt={partner.name} 
                                                className="max-h-full max-w-full object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                            />
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEditPartner(partner)}
                                                className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-indigo-600 rounded-xl transition-colors border border-gray-100 dark:border-gray-700"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeletePartner(partner.id)}
                                                className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100 dark:border-red-900/30"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <h4 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2">{partner.name}</h4>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contacto</p>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{partner.contactEmail || 'Sin email'}</p>
                                        <p className="text-xs text-gray-400">{partner.contactPhone || 'Sin teléfono'}</p>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Activo</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-300">ID: {partner.id.slice(-6).toUpperCase()}</span>
                                    </div>
                                    
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full translate-x-16 -translate-y-16" />
                                </motion.div>
                            ))}

                            {partnersList.length === 0 && (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/20 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                                    <Handshake size={48} className="text-gray-300 dark:text-gray-700 mb-6" />
                                    <p className="text-lg font-black text-gray-400 uppercase tracking-widest">No hay partners registrados</p>
                                    <button onClick={handleAddPartner} className="mt-4 text-indigo-600 font-bold hover:underline">Agregar el primero</button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'webhooks' && (
                    <motion.section 
                        key="webhooks"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="admin-dashboard-section space-y-10"
                    >
                        {/* Upper Section Title & Action button */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-800 shadow-sm animate-fade-up">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-3">
                                    <Globe className="text-indigo-600 dark:text-indigo-400" size={28} />
                                    Webhooks de Partners
                                </h3>
                                <p className="text-xs sm:text-sm font-medium text-gray-500 mt-2">
                                    Administra y prueba los webhooks en tiempo real que notifican eventos de crédito a los socios financieros.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 shrink-0">
                                <button 
                                    type="button"
                                    onClick={() => setIsRucModalOpen(true)}
                                    className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-750 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 cursor-pointer"
                                    title="Consultar datos de un RUC ante la SUNAT"
                                >
                                    <Search size={16} className="text-indigo-500" />
                                    <span>Consultar RUC</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleAddWebhook}
                                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 cursor-pointer flex-shrink-0"
                                >
                                    <Plus size={18} />
                                    <span>Nuevo Webhook</span>
                                </button>
                            </div>
                        </div>

                        {/* Two Columns Layout: Left = Webhooks configured, Right = Test bed */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Webhooks Configured Panel */}
                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[3rem] p-10 shadow-sm space-y-8 animate-fade-up">
                                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-6">
                                    <h4 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                                        <Activity size={18} className="text-indigo-500" />
                                        Endpoints Registrados
                                    </h4>
                                    <span className="px-3.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-full text-xs">
                                        {founderWebhooks.filter(w=>w.isActive).length} activo(s)
                                    </span>
                                </div>

                                <div className="space-y-6">
                                    {founderWebhooks.map((wh) => (
                                        <div 
                                            key={wh.id} 
                                            className={`p-6 rounded-[2rem] border transition-all duration-300 relative overflow-hidden ${
                                                wh.isActive 
                                                    ? 'border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/10 dark:bg-indigo-950/5' 
                                                    : 'border-gray-200 dark:border-gray-800 opacity-65 bg-gray-50/30'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start gap-4 mb-4">
                                                <div className="overflow-hidden">
                                                    <div className="flex items-center gap-2">
                                                        <h5 className="text-base font-black text-gray-900 dark:text-white truncate">
                                                            {wh.name}
                                                        </h5>
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                                            wh.isActive 
                                                                ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-500/10' 
                                                                : 'bg-rose-500/10 text-rose-650 dark:text-rose-400 border border-rose-500/10'
                                                        }`}>
                                                            <span className={`w-1 h-1 rounded-full ${wh.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                            {wh.isActive ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-mono text-gray-400 mt-0.5 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                                                        {wh.url}
                                                    </p>
                                                </div>

                                                {/* Edit & Delete & Toggle Button Actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button 
                                                        onClick={() => handleEditWebhook(wh)}
                                                        className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-indigo-600 rounded-xl transition-colors border border-gray-100 dark:border-gray-700 cursor-pointer"
                                                        title="Editar Webhook"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteWebhook(wh.id)}
                                                        className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100 dark:border-red-900/30 cursor-pointer"
                                                        title="Eliminar Webhook"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                    
                                                    {/* Beautiful Custom Toggle Switch */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleWebhook(wh.id)}
                                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ml-1 ${
                                                            wh.isActive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                wh.isActive ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Subscribed Events badge mapping */}
                                            <div className="flex flex-wrap gap-1.5 mb-4 font-mono">
                                                {wh.events.map(ev => (
                                                    <span 
                                                        key={ev} 
                                                        className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-lg uppercase tracking-tight"
                                                    >
                                                        {ev}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Signing Secret Box with easy clipboard copy */}
                                            <div className="pt-4 border-t border-gray-150 dark:border-gray-800/60 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider flex-shrink-0">Firma Secreta:</span>
                                                    <span className="text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded truncate max-w-[120px] sm:max-w-[200px]">
                                                        {wh.secret}
                                                    </span>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => copyToClipboard(wh.secret, wh.id)}
                                                    className="p-1 px-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer flex-shrink-0"
                                                >
                                                    {copiedSecId === wh.id ? (
                                                        <>
                                                            <CheckCircle2 size={12} className="text-green-500 animate-bounce" />
                                                            Copiado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={11} />
                                                            Copiar
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {founderWebhooks.length === 0 && (
                                        <div className="py-12 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/10 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800 text-center">
                                            <Globe size={40} className="text-gray-300 dark:text-gray-700 mb-4" />
                                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Sin Webhooks Configurados</p>
                                            <button 
                                                type="button"
                                                onClick={handleAddWebhook} 
                                                className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-black uppercase hover:underline cursor-pointer"
                                            >
                                                Crear el primero
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Testing Bed Simulation Panel */}
                            <div className="bg-[#0A0A0B] text-white rounded-[3rem] p-10 border border-white/5 shadow-2xl space-y-8 relative overflow-hidden flex flex-col justify-between animate-fade-up">
                                {/* Back Glass glow */}
                                <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

                                <div className="space-y-6 relative z-10">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                                        <h4 className="text-xl font-black tracking-tight flex items-center gap-2.5">
                                            <Terminal size={18} className="text-indigo-400" />
                                            Simulador de Eventos de Crédito
                                        </h4>
                                        <span className="px-3.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 font-black rounded-full text-[9px] uppercase tracking-wider animate-pulse font-mono">
                                            Test Sandbox
                                        </span>
                                    </div>

                                    {/* Test bed controls */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Webhook Selector */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Webhook Objetivo</label>
                                            <select 
                                                value={selectedWebhookId}
                                                onChange={(e) => setSelectedWebhookId(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                {founderWebhooks.filter(w=>w.isActive).map(w => (
                                                    <option key={w.id} value={w.id} className="bg-gray-950 text-white">{w.name}</option>
                                                ))}
                                                {founderWebhooks.filter(w=>!w.isActive).map(w => (
                                                    <option key={w.id} value={w.id} className="bg-gray-950 text-gray-500">{w.name} (Desactivado)</option>
                                                ))}
                                                {founderWebhooks.length === 0 && (
                                                    <option value="">Crea un webhook primero</option>
                                                )}
                                            </select>
                                        </div>

                                        {/* Partner Selector */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Socio Aludido (Partner)</label>
                                            <select 
                                                value={selectedPartnerId}
                                                onChange={(e) => setSelectedPartnerId(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="" className="bg-gray-950 text-gray-400">-- Ninguno (Global) --</option>
                                                {partnersList.map(p => (
                                                    <option key={p.id} value={p.id} className="bg-gray-950 text-white">{p.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Event Type Selector */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Evento de Crédito</label>
                                            <select 
                                                value={selectedEventType}
                                                onChange={(e) => setSelectedEventType(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="credit.requested" className="bg-gray-950 text-white">credit.requested (Solicitado)</option>
                                                <option value="credit.approved" className="bg-gray-950 text-white">credit.approved (Aprobado)</option>
                                                <option value="credit.disbursed" className="bg-gray-950 text-white">credit.disbursed (Desembolsado)</option>
                                                <option value="credit.payment.received" className="bg-gray-950 text-white">credit.payment.received (Pago Recibido)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Console output display representing the live webhook payload being dispatched */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                            <span>Consola de Entrega Directa</span>
                                            {simulatedLog && simulatedLog.status !== 'idle' && (
                                                <span className="text-gray-500 font-mono text-[9.5px]">Latency: {simulatedLog.latency ? `${simulatedLog.latency}ms` : '---'}</span>
                                            )}
                                        </div>

                                        <div className="bg-[#040405] p-5 rounded-2xl border border-white/5 font-mono text-[10.5px] min-h-[300px] flex flex-col justify-between overflow-auto relative custom-scrollbar">
                                            {isSimulatingTest ? (
                                                <div className="absolute inset-0 bg-gray-950/80 flex flex-col items-center justify-center gap-4 text-center p-6">
                                                    <RefreshCw className="text-indigo-400 animate-spin" size={32} />
                                                    <div>
                                                        <p className="text-xs font-bold text-white uppercase tracking-wider">Despachando Evento en red SAMI...</p>
                                                        <p className="text-[10px] text-gray-400 mt-1 max-w-xs">Calculando firmas criptográficas HMAC SHA256</p>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {simulatedLog && simulatedLog.status !== 'idle' ? (
                                                <div className="space-y-5">
                                                    {/* Request Output */}
                                                    <div className="space-y-2">
                                                        <div className="text-indigo-300 flex items-center justify-between border-b border-white/5 pb-1 font-semibold text-xs">
                                                            <span>HTTP TRANSIT REQUEST</span>
                                                            <span className="text-[9px] px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded font-bold uppercase">POST</span>
                                                        </div>
                                                        <div className="text-gray-300 space-y-1">
                                                            <p className="text-green-400 truncate font-semibold">POST {selectedWebhookId ? founderWebhooks.find(w => w.id === selectedWebhookId)?.url : 'https://api.bancario.pe/endpoint'}</p>
                                                            {Object.entries(simulatedLog.headers).map(([key, val]) => (
                                                                <p key={key} className="text-gray-500 text-[10px]"><span className="text-gray-400">{key}:</span> {val}</p>
                                                            ))}
                                                        </div>
                                                        <div className="text-gray-400 bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto max-h-[140px] custom-scrollbar text-[10px]">
                                                            <pre>{JSON.stringify(simulatedLog.requestPayload, null, 2)}</pre>
                                                        </div>
                                                    </div>

                                                    {/* Response Output */}
                                                    {simulatedLog.status !== 'sending' && (
                                                        <div className="space-y-2 pt-2 border-t border-white/5">
                                                            <div className="text-indigo-300 flex items-center justify-between border-b border-white/5 pb-1 font-semibold text-xs">
                                                                <span>HTTP RESPONSE STATUS</span>
                                                                <span className={`text-[10px] uppercase font-bold ${
                                                                    simulatedLog.responseStatus === 200 ? 'text-green-400' : 'text-red-400'
                                                                }`}>
                                                                    {simulatedLog.responseStatus === 200 ? '200 OK' : `${simulatedLog.responseStatus} Error`}
                                                                </span>
                                                            </div>
                                                            <div className="text-gray-400 bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto max-h-[140px] custom-scrollbar text-[10px]">
                                                                <pre>{JSON.stringify(simulatedLog.responseBody, null, 2)}</pre>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-500">
                                                    <Play size={24} className="text-gray-600 mb-3" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Sandbox Libre de Pruebas</p>
                                                    <p className="text-[10px] text-gray-500 font-medium mt-1 max-w-xs block">
                                                        Elige un endpoint y pulsa el botón inferior para disparar un evento de crédito simulado instantáneamente.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    type="button"
                                    onClick={handleTriggerWebhookTest}
                                    disabled={isSimulatingTest || founderWebhooks.length === 0}
                                    className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-850 disabled:text-gray-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
                                >
                                    <Send size={14} className={isSimulatingTest ? 'animate-pulse' : ''} />
                                    <span>Desencadenar Evento de Prueba</span>
                                </button>
                            </div>
                        </div>

                        {/* Recent Webhook Delivery History Logs */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[3rem] p-10 shadow-sm space-y-8 animate-fade-up">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
                                <div>
                                    <h4 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                                        <History size={18} className="text-indigo-500" />
                                        Registro de Envíos del Sistema (Live Logs)
                                    </h4>
                                    <p className="text-xs text-slate-400 font-bold mt-1">Los últimos despachos automáticos y de prueba emitidos por la plataforma.</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setWebhookLogs([])}
                                    className="text-xs text-red-500 hover:text-red-700 font-black uppercase tracking-wider transition-colors bg-red-50 dark:bg-red-950/20 px-4 py-2 rounded-xl border border-red-100 dark:border-red-900/30 cursor-pointer self-start sm:self-center"
                                    title="Limpiar logs"
                                >
                                    Limpiar Logs
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-gray-55 dark:border-gray-800 text-left">
                                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estampa de Tiempo</th>
                                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Evento</th>
                                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Destinos / Webhook</th>
                                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Código HTTP</th>
                                            <th className="pb-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Latencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/55">
                                        {webhookLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all font-mono text-xs">
                                                <td className="py-5 text-indigo-600 dark:text-indigo-400 font-bold">
                                                    {new Date(log.timestamp).toLocaleTimeString('es-PE')}
                                                </td>
                                                <td className="py-5 font-bold text-gray-850 dark:text-gray-100">
                                                    {log.event}
                                                </td>
                                                <td className="py-5 font-sans">
                                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{log.webhookName}</p>
                                                    <p className="text-[10px] text-gray-450 truncate max-w-xs">{log.url}</p>
                                                </td>
                                                <td className="py-5 font-sans">
                                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${
                                                        log.status === 200 
                                                            ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/25 font-semibold' 
                                                            : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/25 font-semibold'
                                                    }`}>
                                                        {log.status === 0 ? 'Timeout' : log.status} {log.statusText}
                                                    </span>
                                                </td>
                                                <td className="py-5 text-right text-gray-400">
                                                    {log.latency}ms
                                                </td>
                                            </tr>
                                            ))}

                                        {webhookLogs.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-gray-450 text-xs font-bold uppercase tracking-wider font-sans">
                                                    No hay logs registrados en esta sesión.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Partner Modal */}
            <AnimatePresence>
                {isPartnerModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPartnerModalOpen(false)}
                            className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/10"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                                        {editingPartner ? 'Editar Partner' : 'Nuevo Partner'}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium mt-1">Completa los datos de la institución financiera.</p>
                                </div>
                                <button 
                                    onClick={() => setIsPartnerModalOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-200"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {!editingPartner && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPartnerModalOpen(false);
                                        setIsRucModalOpen(true);
                                    }}
                                    className="w-full mb-6 py-3 px-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/20 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                                >
                                    <Search size={12} className="text-indigo-500" />
                                    <span>Buscar y Autocompletar con RUC SUNAT</span>
                                </button>
                            )}

                            <form onSubmit={handleSavePartner} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Nombre de la Institución</label>
                                    <input 
                                        required
                                        type="text" 
                                        value={partnerForm.name}
                                        onChange={(e) => setPartnerForm({...partnerForm, name: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Ej. Banco Continental"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">URL del Logo</label>
                                    <input 
                                        type="url" 
                                        value={partnerForm.logoUrl}
                                        onChange={(e) => setPartnerForm({...partnerForm, logoUrl: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="https://ejemplo.com/logo.png"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Email de Contacto</label>
                                        <input 
                                            required
                                            type="email" 
                                            value={partnerForm.contactEmail}
                                            onChange={(e) => setPartnerForm({...partnerForm, contactEmail: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="admin@banco.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Teléfono</label>
                                        <input 
                                            required
                                            type="tel" 
                                            value={partnerForm.contactPhone}
                                            onChange={(e) => setPartnerForm({...partnerForm, contactPhone: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="+51 987 654 321"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        type="button"
                                        onClick={() => setIsPartnerModalOpen(false)}
                                        className="flex-1 px-8 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Check size={16} />
                                        {editingPartner ? 'Actualizar' : 'Guardar Partner'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Webhook Modal */}
            <AnimatePresence>
                {isWebhookModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                if (createdWebhookSecret) {
                                    handleCloseWebhookSuccess();
                                } else {
                                    setIsWebhookModalOpen(false);
                                }
                            }}
                            className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/10 overflow-hidden"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                                        {createdWebhookSecret 
                                            ? '¡Webhook Registrado!' 
                                            : (editingWebhook ? 'Editar Webhook' : 'Nuevo Webhook de Partner')
                                        }
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium mt-1 font-sans">
                                        {createdWebhookSecret 
                                            ? 'Guarda tu firma secreta para validar las solicitudes.'
                                            : 'Completa los datos para el webhook de socios financieros.'
                                        }
                                    </p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        if (createdWebhookSecret) {
                                            handleCloseWebhookSuccess();
                                        } else {
                                            setIsWebhookModalOpen(false);
                                        }
                                    }}
                                    className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-200 cursor-pointer transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {createdWebhookSecret ? (
                                <div className="space-y-6">
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                                        <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                                                Webhook {createdWebhookName} creado exitosamente
                                            </p>
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium mt-0.5">
                                                Se generó una firma secreta única para firmar los payloads transmitidos en tiempo real.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 font-bold">Signing Secret (Firma Secreta)</label>
                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/80 p-4 rounded-2xl border border-gray-150 dark:border-gray-800">
                                            <span className="text-xs font-mono text-gray-700 dark:text-gray-300 select-all truncate flex-1">
                                                {createdWebhookSecret}
                                            </span>
                                            <button 
                                                type="button"
                                                onClick={() => copyToClipboard(createdWebhookSecret, 'created_sec')}
                                                className="p-2 hover:bg-white dark:hover:bg-gray-700 text-slate-600 dark:text-slate-350 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 text-xs font-bold"
                                            >
                                                {copiedSecId === 'created_sec' ? (
                                                    <>
                                                        <Check size={14} className="text-green-500" />
                                                        Copiado
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={13} />
                                                        Copiar
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-400">
                                        <AlertTriangle className="flex-shrink-0 mt-0.5 text-amber-500" size={18} />
                                        <p className="text-[10.5px] font-bold leading-normal">
                                            Por motivos de seguridad, ¡esta es la única vez que podrás visualizar este secreto en este dashboard! Asegúrate de guardarlo adecuadamente.
                                        </p>
                                    </div>

                                    <button 
                                        type="button"
                                        onClick={handleCloseWebhookSuccess}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        Listo, Copié el Secreto
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSaveWebhook} className="space-y-6">
                                    {webhookFormError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2.5 text-red-650 dark:text-red-400 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                                            <AlertTriangle size={15} className="flex-shrink-0 text-red-500" />
                                            <span>{webhookFormError}</span>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 font-bold">Nombre del Endpoint / Destino</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={webhookForm.name}
                                            onChange={(e) => setWebhookForm({...webhookForm, name: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                                            placeholder="Ej. Banco de Comercio Credits Core"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 font-bold">URL de Destino</label>
                                        <input 
                                            required
                                            type="url" 
                                            value={webhookForm.url}
                                            onChange={(e) => setWebhookForm({...webhookForm, url: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                                            placeholder="https://api.bancocomercio.pe/v1/webhook"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4 font-bold">Eventos Suscritos (Checkbox Group)</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {[
                                                { code: 'credit.requested', label: 'credit.requested', desc: 'Solicitud de Crédito' },
                                                { code: 'credit.approved', label: 'credit.approved', desc: 'Crédito Aprobado' },
                                                { code: 'credit.disbursed', label: 'credit.disbursed', desc: 'Crédito Desembolsado' },
                                                { code: 'credit.payment.received', label: 'credit.payment.received', desc: 'Pago Recibido' }
                                            ].map((ev) => {
                                                const isChecked = webhookForm.events.includes(ev.code);
                                                return (
                                                    <button
                                                        key={ev.code}
                                                        type="button"
                                                        onClick={() => toggleWebhookEvent(ev.code)}
                                                        className={`p-4 rounded-xl text-left border flex flex-col gap-2 transition-all cursor-pointer relative justify-between group ${
                                                            isChecked
                                                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-950 dark:text-white font-bold'
                                                                : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-750'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className="text-xs font-mono tracking-tight font-bold">{ev.label}</span>
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                                                isChecked
                                                                    ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500'
                                                                    : 'border-gray-350 dark:border-gray-600 bg-white dark:bg-gray-800'
                                                            }`}>
                                                                {isChecked && (
                                                                    <Check size={9} className="text-white font-black stroke-[4]" />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] text-gray-450 dark:text-gray-400 font-medium block mt-1">{ev.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            type="button"
                                            onClick={() => setIsWebhookModalOpen(false)}
                                            className="flex-1 px-8 py-4 bg-gray-100 dark:bg-gray-800 text-gray-650 dark:text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <Check size={16} />
                                            {editingWebhook ? 'Actualizar' : 'Guardar Webhook'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* RUC Lookup Modal */}
            <AnimatePresence>
                {isRucModalOpen && (
                    <RucLookup 
                        isOpen={isRucModalOpen} 
                        onClose={() => setIsRucModalOpen(false)} 
                        onSelectBusiness={(business) => {
                            setPartnerForm({
                                name: business.businessName,
                                logoUrl: `https://logo.clearbit.com/${business.email.split('@')[1] || 'generic.com'}`,
                                contactEmail: business.email,
                                contactPhone: business.phone
                            });
                            setIsPartnerModalOpen(true);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
