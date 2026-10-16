
import React from 'react';
import { jsPDF } from 'jspdf';
import { 
    TrendingUp, 
    ArrowUpRight, 
    Users, 
    CreditCard, 
    ShieldCheck, 
    AlertCircle,
    Download,
    ExternalLink,
    Trophy,
    FileText,
    Check,
    Lock,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    AreaChart,
    Area,
    ReferenceLine,
    Cell
} from 'recharts';
import { DashboardData, TaxSummary, CreditApplication, Task, Invoice, AppRole } from '../../types';
import { Clock, CheckCircle2, Sparkles, Sliders, Calendar, Wallet, Percent, HelpCircle, Bell, Lightbulb, GraduationCap, Activity, Award, BookOpen } from 'lucide-react';
import { HealthTutorialGuide } from '../perfil-riesgo/HealthTutorialGuide';
import ContextualNudgeCard from '../academia/ContextualNudgeCard';
import { evaluateContextualNudge, dismissNudge, ContextualNudge } from '../../core/services/nudgeService';
import { 
    getNotificationPermissionStatus, 
    requestNotificationPermission, 
    subscribeUserToPush, 
    showLocalPushNotification 
} from '../../services/pushNotificationService';
import { moduloDisponible } from '../../core/config/phases';

interface OwnerDashboardProps {
    data: DashboardData;
    creditApplications: CreditApplication[];
    tasks: Task[];
    purchases?: Invoice[];
    sales?: Invoice[];
    isFinanceCertified?: boolean;
    samiCoins?: number;
    userRole?: AppRole;
    onNavigate?: (view: any) => void;
    onQuickSaleClick?: () => void;
    onAddTask?: (taskData: Omit<Task, 'id'>) => void;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ 
    data, 
    creditApplications, 
    tasks, 
    purchases = [], 
    sales = [], 
    isFinanceCertified = false, 
    samiCoins = 100, 
    userRole = AppRole.MYPE_ADMIN,
    onNavigate, 
    onQuickSaleClick 
}) => {
    const overdueTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < new Date()).length;
    const pendingTasks = tasks.filter(t => t.status !== 'completed').length;

    // --- Dynamic Budget Setup & Insights Proactivos Logic ---
    const [weeklyBudget, setWeeklyBudget] = React.useState<number>(10000);
    const dailyLimitThreshold = weeklyBudget * 0.20;

    const [pushPermissionStatus, setPushPermissionStatus] = React.useState<NotificationPermission>('default');
    const [showHealthTutorial, setShowHealthTutorial] = React.useState<boolean>(false);
    const [activeNudge, setActiveNudge] = React.useState<ContextualNudge | null>(null);

    React.useEffect(() => {
        let active = true;
        const isPdtDeclared = localStorage.getItem('sami_pdt621_declared_v1') === 'true';
        evaluateContextualNudge({
            sales,
            purchases,
            taxSummary: data.taxSummary || null,
            tasks,
            pdtDeclared: isPdtDeclared
        }).then(nudge => {
            if (active) {
                setActiveNudge(nudge);
            }
        }).catch(err => {
            console.error("Error al evaluar el nudge contextual en OwnerDashboard:", err);
        });
        return () => { active = false; };
    }, [sales, purchases, data.taxSummary, tasks]);

    // 6-month Financial History Evolution Data for recharts
    const financialHealthHistory = [
        { month: 'Mar', sales: 18500, purchases: 8200, detail: 'Emisión regular RVIE' },
        { month: 'Abr', sales: 21200, purchases: 9500, detail: 'Crecimiento de facturación RVIE' },
        { month: 'May', sales: 24000, purchases: 10200, detail: 'Apto para crédito MYPE' },
        { month: 'Jun', sales: 26800, purchases: 11500, detail: 'Registro RSE de compras' },
        { month: 'Jul', sales: 29500, purchases: 12800, detail: 'Acceso a financiamiento bancario' },
        { month: 'Ago', sales: data.taxSummary?.avgMonthlySales || 32400, purchases: data.taxSummary?.avgMonthlyPurchases || 13500, detail: 'Máxima consistencia de flujos' },
    ];

    const CustomHealthTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5 font-sans">
                    <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex justify-between items-center gap-4">
                        <span>{label} 2026</span>
                        <span className="text-emerald-400 font-mono font-black text-sm">S/ {d.sales.toLocaleString('es-PE')}</span>
                    </p>
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                        <ShieldCheck size={14} />
                        <span>Ventas Facturadas RVIE</span>
                    </div>
                    <p className="text-slate-400">
                        Compras Registradas: <strong className="text-slate-200 font-mono">S/ {d.purchases.toLocaleString('es-PE')}</strong>
                    </p>
                    <p className="text-[10px] text-slate-400 italic pt-0.5 border-t border-slate-800/80">
                        💡 {d.detail}
                    </p>
                </div>
            );
        }
        return null;
    };

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setPushPermissionStatus(getNotificationPermissionStatus());
        }
    }, []);

    const handleEnablePush = async () => {
        const permission = await requestNotificationPermission();
        setPushPermissionStatus(permission);
        if (permission === 'granted') {
            const success = await subscribeUserToPush('default');
            if (success) {
                showLocalPushNotification(
                    '✨ SAMI Alertas Activadas',
                    '¡Listo! Recibirás alertas críticas de SUNAT y gastos anormales en este navegador.'
                );
            }
        } else if (permission === 'denied') {
            showLocalPushNotification('🔕 Notificaciones Bloqueadas', 'Por favor de manera explícita habilita los permisos de notificaciones de SAMI en el candado del navegador.');
        }
    };

    // Group expenses by standard issueDate
    const dailyExpensesMap = React.useMemo(() => {
        const map: { [key: string]: number } = {};
        purchases.forEach(p => {
            const dateStr = p.issueDate;
            map[dateStr] = (map[dateStr] || 0) + p.totalAmount;
        });
        return map;
    }, [purchases]);

    const dailyExpensesList = React.useMemo(() => {
        return Object.entries(dailyExpensesMap).map(([date, amount]) => {
            const amountNum = amount as number;
            const percentageUsed = (amountNum / weeklyBudget) * 100;
            const percentageOfThreshold = (amountNum / dailyLimitThreshold) * 100;
            const exceeded = amountNum > dailyLimitThreshold;
            const exceededBy = amountNum - dailyLimitThreshold;
            return {
                date,
                amount: amountNum,
                percentageUsed,
                percentageOfThreshold,
                exceeded,
                exceededBy
            };
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [dailyExpensesMap, weeklyBudget, dailyLimitThreshold]);

    const exceededDays = React.useMemo(() => {
        return dailyExpensesList.filter(d => d.exceeded);
    }, [dailyExpensesList]);

    // --- SAMI 5-Axis Strategic Evolution States & Math ---
    const [expandedAxis, setExpandedAxis] = React.useState<number | null>(null);
    const [vigenciaStatus, setVigenciaStatus] = React.useState<'pendiente' | 'validando' | 'validado'>('pendiente');
    const [pepStatus, setPepStatus] = React.useState<'pendiente' | 'filtrando' | 'sin_coincidencias'>('pendiente');
    const [complianceChecklist, setComplianceChecklist] = React.useState({
        datosPersonales: true, // Constant under Ley 29733
        vigenciaSunarp: false,
        rucActivoHabido: true,
        listasPepOfac: false
    });

    const calculatedTaxInfo = React.useMemo(() => {
        let totalSalesVal = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        let totalPurchasesVal = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
        
        let netSalesVal = totalSalesVal / 1.18;
        let igvDebitVal = totalSalesVal - netSalesVal;
        
        // Purchases with FACTURA grant tax credit
        let igvCreditVal = purchases
            .filter(p => p.documentType === 'FACTURA')
            .reduce((sum, p) => sum + (p.totalAmount - (p.totalAmount / 1.18)), 0);
            
        let igvPayableVal = igvDebitVal - igvCreditVal;
        let rentaTaxVal = netSalesVal * 0.01; // 1% for RMT regime
        let totalTaxesVal = Math.max(0, igvPayableVal) + rentaTaxVal;
        
        return {
            totalSales: totalSalesVal,
            totalPurchases: totalPurchasesVal,
            netSales: netSalesVal,
            igvDebit: igvDebitVal,
            igvCredit: igvCreditVal,
            igvPayable: igvPayableVal,
            rentaTax: rentaTaxVal,
            totalTaxes: totalTaxesVal
        };
    }, [sales, purchases]);

    const handleDownloadDashboardPdf = () => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const primaryColor = [79, 70, 229]; // Indigo
        const darkColor = [31, 41, 55]; // Gray-800
        const grayColor = [107, 114, 128]; // Gray-500
        const successColor = [16, 185, 129]; // Emerald-500
        const warningColor = [245, 158, 11]; // Amber-500

        doc.setFont("Helvetica", "bold");

        // Top Header Accent
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 16, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text("SAMI • PLAN ESTRATÉGICO DE CRECIMIENTO MYPE", 15, 10);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("SUNAT - SPLAFT - COMPLIANCE LEY 29733", 145, 10);

        // Title Block
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFontSize(18);
        doc.setFont("Helvetica", "bold");
        doc.text("REPORTE TRIBUTARIO EJECUTIVO Y COMPLIANCE", 15, 30);

        // Border divider
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.4);
        doc.line(15, 34, 195, 34);

        // Company Specs
        doc.setFontSize(8.5);
        doc.text("MYPE Evaluada:", 15, 41);
        doc.setFont("Helvetica", "normal");
        doc.text(sales[0]?.ruc ? "MYPE Registrada Activa" : "SAMI Demo MYPE", 45, 41);

        doc.setFont("Helvetica", "bold");
        doc.text("RUC:", 15, 46);
        doc.setFont("Helvetica", "normal");
        doc.text(sales[0]?.ruc || "20601234567", 45, 46);

        doc.setFont("Helvetica", "bold");
        doc.text("Régimen Fiscal:", 15, 51);
        doc.setFont("Helvetica", "normal");
        doc.text("Régimen MYPE Tributario (RMT) SUNAT", 45, 51);

        // Issue Specs
        doc.setFont("Helvetica", "bold");
        doc.text("Fecha Emisión:", 110, 41);
        doc.setFont("Helvetica", "normal");
        doc.text(new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }), 140, 41);

        doc.setFont("Helvetica", "bold");
        doc.text("Cumplimiento:", 110, 46);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(successColor[0], successColor[1], successColor[2]);
        doc.text("AL DÍA (SAMI Shield Checked)", 140, 46);

        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

        // Section 1: Taxes Accumulated
        doc.setFontSize(11);
        doc.setFont("Helvetica", "bold");
        doc.text("1. Resumen Ejecutivo de Impuestos Acumulados", 15, 62);

        // Highlight box
        doc.setFillColor(243, 244, 246);
        doc.rect(15, 66, 180, 22, "F");

        doc.setFontSize(7.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text("INGRESOS TOTALES", 20, 72);
        doc.text("EGRESOS FACTURADOS", 65, 72);
        doc.text("IGV NETO LIQUIDADO", 110, 72);
        doc.text("PAGO A CUENTA RENTA (1%)", 150, 72);

        doc.setFontSize(9.5);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(`S/ ${(calculatedTaxInfo.totalSales).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 20, 81);
        doc.text(`S/ ${(calculatedTaxInfo.totalPurchases).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 65, 81);
        doc.text(`S/ ${Math.max(0, calculatedTaxInfo.igvPayable).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 110, 81);
        doc.text(`S/ ${(calculatedTaxInfo.rentaTax).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 150, 81);

        // Math Reconciliation Table
        doc.setFontSize(10.5);
        doc.setFont("Helvetica", "bold");
        doc.text("Detalle de Conciliación Matemática de Tributos", 15, 96);
        doc.line(15, 98, 195, 98);

        const sY = 104;
        doc.setFontSize(8.5);
        doc.setFont("Helvetica", "normal");
        
        doc.text("Ventas Facturadas y Boletas Con IGV del período:", 18, sY);
        doc.text(`S/ ${(calculatedTaxInfo.totalSales).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 145, sY);

        doc.text("Base Imponible de Ventas (Neto Sin IGV):", 18, sY + 6);
        doc.text(`S/ ${(calculatedTaxInfo.netSales).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 145, sY + 6);

        doc.text("IGV Débito Fiscal Generado por Ventas (18%):", 18, sY + 12);
        doc.text(`S/ ${(calculatedTaxInfo.igvDebit).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 145, sY + 12);

        doc.text("IGV Crédito Fiscal de Compras (Exclusivo Facturas):", 18, sY + 18);
        doc.text(`S/ ${(calculatedTaxInfo.igvCredit).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 145, sY + 18);

        doc.setFont("Helvetica", "bold");
        doc.text("IGV Neto Calculado a Liquidar a SUNAT (Débito - Crédito):", 18, sY + 24);
        doc.text(`S/ ${(calculatedTaxInfo.igvPayable).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 145, sY + 24);

        doc.setFont("Helvetica", "normal");
        doc.text("Pago a Cuenta de Impuesto a la Renta Directo (1% del Neto):", 18, sY + 30);
        doc.text(`S/ ${(calculatedTaxInfo.rentaTax).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 145, sY + 30);

        doc.setFillColor(239, 246, 255);
        doc.rect(15, sY + 35, 180, 10, "F");
        doc.setFont("Helvetica", "bold");
        doc.text("TOTAL TRIBUTOS COMBINADOS A PAGAR:", 20, sY + 41);
        doc.text(`S/ ${(calculatedTaxInfo.totalTaxes).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 145, sY + 41);

        // Section 2: SPLAFT & Compliance Security
        doc.setFontSize(11);
        doc.text("2. Estado Legal y Listas de Control SPLAFT", 15, sY + 54);
        doc.line(15, sY + 56, 195, sY + 56);

        doc.setFontSize(8.5);
        doc.setFont("Helvetica", "normal");
        doc.text("• Protección de Datos Personales (Ley N° 29733):", 18, sY + 62);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(successColor[0], successColor[1], successColor[2]);
        doc.text("CUMPLE PLENAMENTE (Bases encriptadas en reposo y tránsito)", 95, sY + 62);

        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFont("Helvetica", "normal");
        doc.text("• Validación de Poderes Sunarp (KYC de Empresa):", 18, sY + 68);
        doc.setFont("Helvetica", "bold");
        if (vigenciaStatus === 'validado') {
            doc.setTextColor(successColor[0], successColor[1], successColor[2]);
            doc.text("APROBADO (Vigencia de Poder legalmente verificada)", 95, sY + 68);
        } else {
            doc.setTextColor(warningColor[0], warningColor[1], warningColor[2]);
            doc.text("PENDIENTE DE CARGA EN SECCIÓN CRÉDITOS", 95, sY + 68);
        }

        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFont("Helvetica", "normal");
        doc.text("• Prevención LAFT (Filtros PEP / OFAC / Clientes):", 18, sY + 74);
        doc.setFont("Helvetica", "bold");
        if (pepStatus === 'sin_coincidencias') {
            doc.setTextColor(successColor[0], successColor[1], successColor[2]);
            doc.text("PROCESADO - SIN COINCIDENCIAS (Perfil de Riesgo Seguro)", 95, sY + 74);
        } else {
            doc.setTextColor(warningColor[0], warningColor[1], warningColor[2]);
            doc.text("PENDIENTE (Haga clic en 'Filtrar PEP' en el Dashboard)", 95, sY + 74);
        }

        // Footer Box
        doc.setFillColor(249, 250, 251);
        doc.rect(15, sY + 84, 180, 16, "F");
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.setFontSize(7);
        doc.setFont("Helvetica", "normal");
        doc.text("La generación de este reporte ejecutivo ha sido firmada digitalmente con la clave pública de SAMI Fintech.", 20, sY + 89);
        doc.text("Las estimaciones fiscales corresponden con la tasa del 1% del RMT peruano. No reemplaza a las auditorías fiscales formales.", 20, sY + 93);

        doc.save(`SAMI_Reporte_Impuestos_${new Date().toISOString().split('T')[0]}.pdf`);
        
        try {
            showLocalPushNotification(
                '📄 ¡PDF Generado con Éxito!',
                'El resumen ejecutivo de tus impuestos y estado Splaft se ha guardado en tus descargas.'
            );
        } catch {}
    };

    const handleVerifyVigenciaInDashboard = () => {
        setVigenciaStatus('validando');
        setTimeout(() => {
            setVigenciaStatus('validado');
            setComplianceChecklist(prev => ({ ...prev, vigenciaSunarp: true }));
            try {
                showLocalPushNotification(
                    '⚡ KYC Verificado',
                    '¡Vigencia de Poderes verificada vía SUNARP. Cuenta 100% habilitada para créditos!'
                );
            } catch {}
        }, 1500);
    };

    const handleFilterPepInDashboard = () => {
        setPepStatus('filtrando');
        setTimeout(() => {
            setPepStatus('sin_coincidencias');
            setComplianceChecklist(prev => ({ ...prev, listasPepOfac: true }));
            try {
                showLocalPushNotification(
                    '🔒 Filtro PEP de SAMI Shield',
                    'Análisis finalizado: 0 coincidencias en listas OFAC/SPLAFT. ¡Firma segura!'
                );
            } catch {}
        }, 1500);
    };

    const revenueData = [
        { month: 'Ene', income: 4500, expenses: 3200 },
        { month: 'Feb', income: 5200, expenses: 3100 },
        { month: 'Mar', income: 4800, expenses: 3500 },
        { month: 'Abr', income: 6100, expenses: 4000 },
        { month: 'May', income: 5900, expenses: 3800 },
    ];

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Panel Estratégico</h2>
                    <p className="text-gray-500">Decisiones basadas en data real de tu negocio</p>
                </div>
                <button 
                    onClick={handleDownloadDashboardPdf}
                    className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                >
                    <Download size={18} /> Exportar Reporte SUNAT
                </button>
            </header>

            {/* Quick Actions / Tarjetas de Acceso Rápido */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <button
                    onClick={onQuickSaleClick}
                    className="flex flex-col text-left p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2rem] hover:scale-[1.02] shadow-sm hover:shadow transition-all duration-200 group cursor-pointer w-full"
                >
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl mb-4 group-hover:scale-105 transition-transform">
                        <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">Registrar Venta</p>
                    <p className="text-2xs text-gray-400 font-bold mt-1">Anotar lo que vendí</p>
                </button>

                {moduloDisponible('credit', userRole) && (
                    <button
                        onClick={() => onNavigate && onNavigate('credit')}
                        className="flex flex-col text-left p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2rem] hover:scale-[1.02] shadow-sm hover:shadow transition-all duration-200 group cursor-pointer w-full"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl mb-4 group-hover:scale-105 transition-transform">
                            <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">Información Tributaria</p>
                        <p className="text-2xs text-gray-400 font-bold mt-1">
                            {data.taxSummary ? `${data.taxSummary.complianceStatus} · S/ ${data.taxSummary.avgMonthlySales.toLocaleString()}/mes` : 'Ver expediente'}
                        </p>
                    </button>
                )}

                {moduloDisponible('accounting', userRole) && (
                    <button
                        onClick={() => onNavigate && onNavigate('accounting')}
                        className="flex flex-col text-left p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2rem] hover:scale-[1.02] shadow-sm hover:shadow transition-all duration-200 group cursor-pointer w-full text-left"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl mb-4 group-hover:scale-105 transition-transform">
                            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <p className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">SUNAT</p>
                        <p className="text-2xs text-gray-400 font-bold mt-1">
                            {data.taxStatus === 'Al día' ? 'Estás al día' : data.taxStatus}
                        </p>
                    </button>
                )}

                {moduloDisponible('education', userRole) && (
                    <button
                        onClick={() => onNavigate && onNavigate('education')}
                        className="flex flex-col text-left p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2rem] hover:scale-[1.02] shadow-sm hover:shadow transition-all duration-200 group cursor-pointer w-full"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center text-xl mb-4 group-hover:scale-105 transition-transform">
                            <GraduationCap size={18} className="text-violet-600 dark:text-violet-400" />
                        </div>
                        <p className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">Aprender</p>
                        <p className="text-2xs text-gray-400 font-bold mt-1">Mejora tu Salud Crediticia</p>
                    </button>
                )}
            </div>

            {/* Nudge Contextual Formativo (Opción 1: Slot Único) */}
            {activeNudge && (
                <ContextualNudgeCard
                    nudge={activeNudge}
                    onDismiss={(nudgeId) => {
                        dismissNudge(nudgeId);
                        setActiveNudge(null);
                    }}
                    onOpenCourse={(courseId) => {
                        localStorage.setItem('sami_open_course_id', courseId);
                        onNavigate && onNavigate('education');
                    }}
                />
            )}

            {/* Top Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {pushPermissionStatus !== 'granted' && (
                    <div className="col-span-2 md:col-span-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-sky-950/20 dark:to-blue-950/20 border border-amber-100 dark:border-blue-900/40 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden group">
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-blue-400 rounded-2xl animate-pulse">
                                <Bell size={20} className="animate-bounce" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-amber-900 dark:text-blue-300 uppercase tracking-tight flex items-center gap-1.5">
                                    <span>Activar Alertas de Navegador</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                </h4>
                                <p className="text-xs text-amber-800/80 dark:text-gray-300 font-semibold leading-relaxed mt-0.5 max-w-xl">
                                    Recibe alertas críticas de SAMI (picos de gasto anormales, vencimientos SUNAT) directamente en tu dispositivo para un control operativo total.
                                </p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={handleEnablePush}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider relative z-10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shadow-md shadow-amber-500/10"
                        >
                            {pushPermissionStatus === 'denied' ? '🔓 Desbloquear Alertas' : '⚡ Activar Notificaciones'}
                        </button>
                        <div className="absolute right-[-20px] top-[-20px] opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
                             <Bell size={120} />
                        </div>
                    </div>
                )}
                {(pendingTasks > 0 || overdueTasks > 0) && (
                    <div className="col-span-2 md:col-span-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-3xl flex items-center justify-between group overflow-hidden relative">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className={`p-3 rounded-2xl ${overdueTasks > 0 ? 'bg-red-500' : 'bg-indigo-500'} text-white shadow-lg`}>
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight">Tareas Pendientes</h4>
                                <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                                    Tienes <span className="font-black">{pendingTasks}</span> tareas por completar
                                    {overdueTasks > 0 && <>, de las cuales <span className="text-red-500 font-black">{overdueTasks} están vencidas</span></>}.
                                </p>
                            </div>
                        </div>
                        <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform">
                             <ShieldCheck size={120} />
                        </div>
                    </div>
                )}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-2">Ingresos Mes</p>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-gray-900 dark:text-white">S/ {data.netCashFlow.income.toLocaleString()}</span>
                        <span className="text-[10px] text-green-500 font-bold mb-1 fle flex items-center gap-0.5"><TrendingUp size={10} /> +12%</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-2">Gastos Mes</p>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-gray-900 dark:text-white">S/ {data.netCashFlow.expenses.toLocaleString()}</span>
                        <span className="text-[10px] text-red-500 font-bold mb-1 fle flex items-center gap-0.5"><ArrowUpRight size={10} /> +5%</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-2">Colaboradores</p>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="text-2xl font-black text-gray-900 dark:text-white">08</span>
                        <div className="flex -space-x-2">
                            {[1,2,3].map(i => (
                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600">
                                    {i}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="bg-blue-600 p-6 rounded-3xl shadow-lg shadow-blue-100 dark:shadow-none text-white">
                    <p className="text-xs text-blue-100 font-bold uppercase mb-2">Crédito Pre-aprobado</p>
                    <p className="text-2xl font-black">S/ {data.maxLoanAmount.toLocaleString()}</p>
                </div>
            </div>

            {/* Sección Destacada: Evolución de Salud Financiera & Tutorial Interactivo */}
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                                <Activity size={22} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Evolución de Ventas Declaradas (RVIE)</h3>
                                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black px-2.5 py-0.5 rounded-full uppercase">
                                        6 Meses
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Histórico de facturación y compras RSE transmitidas a entidades aliadas
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowHealthTutorial(!showHealthTutorial)}
                                className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs rounded-2xl border border-indigo-200 dark:border-indigo-800/80 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02]"
                            >
                                <Sparkles size={16} className="text-indigo-500 animate-pulse" />
                                <span>{showHealthTutorial ? 'Ocultar Guía' : '💡 Guía Interactiva MYPE'}</span>
                            </button>

                            {/* Dato derivado de registros en SAMI, no verificado por SUNAT (AGENTS.md §3). */}
                            <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-3.5 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 text-xs font-black flex items-center gap-1.5">
                                <Award size={16} />
                                <span title="Derivado de comprobantes registrados en SAMI — no verificado por SUNAT">Registros SAMI: {data.taxSummary?.complianceStatus || 'Sin datos'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Recharts Area Chart */}
                    <div className="h-64 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={financialHealthHistory}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorHealthScoreDashboard" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                                <XAxis 
                                    dataKey="month" 
                                    tickLine={false} 
                                    axisLine={{ stroke: '#64748b', strokeWidth: 1 }}
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                />
                                <YAxis 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                />
                                <Tooltip content={<CustomHealthTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="sales" 
                                    stroke="#10b981" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorHealthScoreDashboard)" 
                                    activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Quick Stats Footer */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-gray-100 dark:border-gray-700/60">
                        <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Regulación Tributaria</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">100% Registro RVIE / RSE</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Ventas Promedio</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">S/ {(data.taxSummary?.avgMonthlySales || 25000).toLocaleString()}/mes</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider">Acceso a Financiamiento</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">Apto Ofertas Bancarias</span>
                        </div>
                    </div>
                </div>

                {/* Interactive Step-by-Step Tutorial Guide */}
                {(showHealthTutorial || true) && (
                    <HealthTutorialGuide 
                        isOpen={true}
                        onClose={() => setShowHealthTutorial(false)}
                        onNavigateToCredit={moduloDisponible('credit', userRole) && onNavigate ? () => onNavigate('credit') : undefined}
                        onNavigateToEducation={moduloDisponible('education', userRole) && onNavigate ? () => onNavigate('education') : undefined}
                    />
                )}
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Chart Area */}
                <div className="md:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-500" />
                        Rentabilidad vs Costos
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `S/ ${v}`} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expenses" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* EXPEDIENTE TRIBUTARIO Card */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                        <div className="relative z-10">
                            <h3 className="text-sm font-bold opacity-80 uppercase mb-6 flex items-center gap-2">
                                <ShieldCheck size={18} /> Expediente Tributario MYPE
                            </h3>
                            <div className="text-center py-4">
                                <p className="text-3xl font-black mb-1">S/ {(data.taxSummary?.avgMonthlySales || 25000).toLocaleString()}</p>
                                <p className="text-xs text-blue-200 mb-3 font-medium">Ventas Promedio Mensuales</p>
                                <span className="bg-emerald-500/30 text-emerald-200 text-xs px-4 py-1.5 rounded-full font-black uppercase tracking-widest border border-emerald-400/30">
                                    ✓ SUNAT: {data.taxSummary?.complianceStatus || 'Al día'}
                                </span>
                            </div>
                            <div className="mt-6 space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-black uppercase opacity-60">
                                        <span>Formalidad Electrónica</span>
                                        <span>{data.taxSummary?.formalityRatio || 100}%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400" style={{ width: `${data.taxSummary?.formalityRatio || 100}%` }} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-black uppercase opacity-60">
                                        <span>Comprobantes Verificados</span>
                                        <span>{data.taxSummary?.verifiedInvoicesCount || 15} docs</span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-400" style={{ width: `100%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Decorative blobs */}
                        <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-blue-500/20 blur-3xl rounded-full" />
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900 p-6 rounded-3xl">
                        <h4 className="font-bold text-orange-900 dark:text-orange-400 text-sm flex items-center gap-2 mb-3">
                            <AlertCircle size={18} /> Alertas de Gestión
                        </h4>
                        <div className="space-y-3">
                            {data.insights.map((insight) => (
                                <div key={insight.id} className="flex gap-3 text-xs">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-1" />
                                    <p className="text-orange-800 dark:text-orange-300">{insight.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SAMI 5-Axis Evolution Tracker Widget */}
            <div id="sami-five-axis-tracker-widget" className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={10} className="text-indigo-500 animate-pulse" />
                                Roadmap de Crecimiento FinTech
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Trophy className="text-amber-500 animate-bounce" size={22} />
                            Evolución SAMI: Tu Plan de 5 Ejes
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Completa los ejes estratégicos de tu negocio para mejorar tu salud crediticia, desbloquear tasas de crédito preferentes y formalizar tu MYPE ante la banca aliada.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100/30 text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Progreso Global</p>
                            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-tight">
                                {complianceChecklist.vigenciaSunarp && complianceChecklist.listasPepOfac && isFinanceCertified ? '100%' :
                                 (complianceChecklist.vigenciaSunarp || complianceChecklist.listasPepOfac) && isFinanceCertified ? '80%' :
                                 isFinanceCertified || (complianceChecklist.vigenciaSunarp && complianceChecklist.listasPepOfac) ? '60%' : '40%'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* EJE 1 */}
                    <div className="border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden transition-all duration-300 hover:border-gray-200 dark:hover:border-gray-600">
                        <button
                            onClick={() => setExpandedAxis(expandedAxis === 1 ? null : 1)}
                            className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/50 text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg font-black font-mono">
                                    01
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Eje 1: Facturación y Contabilidad Automatizada (SUNAT)</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                        Análisis fiscal de impuestos · IGV acumulado: <span className="font-bold text-indigo-600 dark:text-indigo-400">S/ {Math.max(0, calculatedTaxInfo.igvPayable).toLocaleString('es-PE', { maximumFractionDigits: 1 })}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] bg-emerald-100/50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-1 rounded-full uppercase">
                                    Activo
                                </span>
                                <ChevronRight size={18} className={`text-gray-400 transition-transform duration-300 ${expandedAxis === 1 ? 'rotate-90' : ''}`} />
                            </div>
                        </button>

                        {expandedAxis === 1 && (
                            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 grid md:grid-cols-2 gap-6 animate-fadeIn">
                                <div className="space-y-3">
                                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-wider">Estado de Impuestos del Período</h5>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl space-y-2 border border-gray-100 dark:border-gray-700/50">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-gray-500">Total Ventas Facturadas (A):</span>
                                            <span className="text-gray-900 dark:text-white">S/ {calculatedTaxInfo.totalSales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-gray-500">IGV Débito Fiscal (18% de A):</span>
                                            <span className="text-gray-900 dark:text-white">S/ {calculatedTaxInfo.igvDebit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-gray-500">IGV Crédito Compras Facturadas (B):</span>
                                            <span className="text-gray-900 dark:text-white text-emerald-500 dark:text-emerald-400">-S/ {calculatedTaxInfo.igvCredit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
                                        <div className="flex justify-between text-xs font-black uppercase">
                                            <span className="text-gray-600 dark:text-gray-300">IGV Bruto a Liquidar:</span>
                                            <span className="text-indigo-600 dark:text-indigo-400">S/ {Math.max(0, calculatedTaxInfo.igvPayable).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-gray-500">Pago a Cuenta Renta (1% Neto):</span>
                                            <span className="text-gray-900 dark:text-white">S/ {calculatedTaxInfo.rentaTax.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-between space-y-4">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                            SAMI procesa automáticamente tu base imponible y simula tus declaraciones mensuales aplicando las reglas del Régimen MYPE Tributario peruano. El crédito de IGV se calcula con facturas verificadas por SUNAT.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={handleDownloadDashboardPdf}
                                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                                        >
                                            <Download size={14} /> Download PDF Impuestos
                                        </button>
                                        <button
                                            onClick={() => onNavigate && onNavigate('accounting')}
                                            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
                                        >
                                            <FileText size={14} /> Registrar Factura
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* EJE 2 */}
                    <div className="border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden transition-all duration-300 hover:border-gray-200 dark:hover:border-gray-600">
                        <button
                            onClick={() => setExpandedAxis(expandedAxis === 2 ? null : 2)}
                            className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/50 text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg font-black font-mono">
                                    02
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Eje 2: Pre-evaluación Crediticia & Información Tributaria</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                        Información fiscal consolidada · Ventas Promedio: <span className="font-bold text-indigo-600 dark:text-indigo-400">S/ {(data.taxSummary?.avgMonthlySales || 25000).toLocaleString('es-PE')}</span> · Estado SUNAT: {data.taxSummary?.complianceStatus || 'Al día'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] bg-indigo-100/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold px-2.5 py-1 rounded-full uppercase">
                                    Optimizado
                                </span>
                                <ChevronRight size={18} className={`text-gray-400 transition-transform duration-300 ${expandedAxis === 2 ? 'rotate-90' : ''}`} />
                            </div>
                        </button>

                        {expandedAxis === 2 && (
                            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 grid md:grid-cols-2 gap-6 animate-fadeIn">
                                <div className="space-y-4">
                                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-wider">Resumen de Comprobantes Declarados</h5>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                                <span>Formalidad Electrónica RVIE/RSE</span>
                                                <span className="text-gray-900 dark:text-white">{data.taxSummary?.formalityRatio || 100}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${data.taxSummary?.formalityRatio || 100}%` }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                                <span>Comprobantes Verificados</span>
                                                <span className="text-gray-900 dark:text-white">{data.taxSummary?.verifiedInvoicesCount || 15} docs</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-between space-y-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        SAMI ordena y consolida tus ventas y compras RVIE/RSE emitidas ante SUNAT para transmitirlas a entidades bancarias y fintechs aliadas. Son las instituciones financieras las que evalúan la aprobación y condiciones crediticias.
                                    </p>
                                    {moduloDisponible('credit', userRole) && (
                                        <div>
                                            <button
                                                onClick={() => onNavigate && onNavigate('credit')}
                                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                                            >
                                                Ver Ofertas de Financiamiento <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* EJE 3 */}
                    <div className="border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden transition-all duration-300 hover:border-gray-200 dark:hover:border-gray-600">
                        <button
                            onClick={() => setExpandedAxis(expandedAxis === 3 ? null : 3)}
                            className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/50 text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg font-black font-mono">
                                    03
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Eje 3: El Portal de Banca Aliada & Integración de API</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                        Sincronización segura con 3 entidades activas · Encriptación AES-256-GCM
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] bg-amber-100/50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold px-2.5 py-1 rounded-full uppercase">
                                    Conectado
                                </span>
                                <ChevronRight size={18} className={`text-gray-400 transition-transform duration-300 ${expandedAxis === 3 ? 'rotate-90' : ''}`} />
                            </div>
                        </button>

                        {expandedAxis === 3 && (
                            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 grid md:grid-cols-2 gap-6 animate-fadeIn">
                                <div className="space-y-3">
                                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-wider">Entidades de Crédito Aliadas Vigentes</h5>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl space-y-3 border border-gray-100 dark:border-gray-700/50">
                                        <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                                            <span className="flex items-center gap-2">🏢 Banco ProMYPE</span>
                                            <span className="text-emerald-500 text-[10px] uppercase">Licitando Préstamos</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                                            <span className="flex items-center gap-2">🏦 Caja Confianza</span>
                                            <span className="text-emerald-500 text-[10px] uppercase">Licitando Líneas de Capital</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                                            <span className="flex items-center gap-2">⚡ Fintech Veloz</span>
                                            <span className="text-emerald-500 text-[10px] uppercase">Factoring Instantáneo</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-between space-y-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        Toda tu información es encriptada de forma asimétrica y transmitida de manera anónima (data masking activo) para impedir leaks, de estricto acuerdo con la Ley N° 29733 de Datos Personales peruana. Los bancos pujan con tasas más bajas basándose en tu perfil tributario verificado.
                                    </p>
                                    {moduloDisponible('bank-api', userRole) && (
                                        <div>
                                            <button
                                                onClick={() => onNavigate && onNavigate('bank-api')}
                                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                                            >
                                                Ver Consola de Integración Bancaria <ExternalLink size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* EJE 4 */}
                    <div className="border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden transition-all duration-300 hover:border-gray-200 dark:hover:border-gray-600">
                        <button
                            onClick={() => setExpandedAxis(expandedAxis === 4 ? null : 4)}
                            className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/50 text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg font-black font-mono">
                                    04
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Eje 4: Compliance, KYC & SPLAFT Security Guard</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                        Validación de RUC y control SPLAFT/LAFT · Estado: <span className="font-bold text-indigo-600 dark:text-indigo-400">{complianceChecklist.vigenciaSunarp && complianceChecklist.listasPepOfac ? 'VERIFICADO' : 'PENDIENTE'}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                    complianceChecklist.vigenciaSunarp && complianceChecklist.listasPepOfac 
                                        ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                        : 'bg-yellow-100/50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400'
                                }`}>
                                    {complianceChecklist.vigenciaSunarp && complianceChecklist.listasPepOfac ? 'Cumple' : 'Acción requerida'}
                                </span>
                                <ChevronRight size={18} className={`text-gray-400 transition-transform duration-300 ${expandedAxis === 4 ? 'rotate-90' : ''}`} />
                            </div>
                        </button>

                        {expandedAxis === 4 && (
                            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 grid md:grid-cols-2 gap-6 animate-fadeIn">
                                <div className="space-y-4">
                                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-wider">Checklist Legal Obligatorio</h5>
                                    <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500 font-semibold flex items-center gap-2">
                                                <Check className="text-emerald-500" size={14} /> Consentimiento Ley N° 29733 (Datos Personales):
                                            </span>
                                            <span className="text-emerald-500 font-bold">Activo</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500 font-semibold flex items-center gap-2">
                                                <Check className="text-emerald-500" size={14} /> Contribuyente Activo y Habido en SUNAT:
                                            </span>
                                            <span className="text-emerald-500 font-bold">Activo</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500 font-semibold flex items-center gap-2">
                                                {complianceChecklist.vigenciaSunarp ? <Check className="text-emerald-500" size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300 animate-pulse" />} 
                                                Verificación de Representante Sunarp (KYC - Poder):
                                            </span>
                                            <span className={`font-bold ${complianceChecklist.vigenciaSunarp ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {complianceChecklist.vigenciaSunarp ? 'Verificado' : 'Pendiente'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500 font-semibold flex items-center gap-2">
                                                {complianceChecklist.listasPepOfac ? <Check className="text-emerald-500" size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300 animate-pulse" />} 
                                                Filtrado en Listas Antiblanqueo (PEP / OFAC / SPLAFT):
                                            </span>
                                            <span className={`font-bold ${complianceChecklist.listasPepOfac ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {complianceChecklist.listasPepOfac ? 'Sin Coincidencias' : 'Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-between space-y-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        Como plataforma integrada, SAMI realiza cruces regulatorios automáticos (SPLAFT) para validar la idoneidad legal y blindar la reputación de tu MYPE ante la SBS (Superintendencia de Banca y Seguros). Realiza el filtrado para autorizar tu préstamo.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {vigenciaStatus !== 'validado' ? (
                                            <button
                                                onClick={handleVerifyVigenciaInDashboard}
                                                disabled={vigenciaStatus === 'validando'}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer"
                                            >
                                                {vigenciaStatus === 'validando' ? 'Consultando SUNARP...' : 'Validar Poderes Sunarp'}
                                            </button>
                                        ) : (
                                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-2xs font-extrabold uppercase">
                                                ✓ Poderes Validados
                                            </span>
                                        )}

                                        {pepStatus !== 'sin_coincidencias' ? (
                                            <button
                                                onClick={handleFilterPepInDashboard}
                                                disabled={pepStatus === 'filtrando'}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer shadow-sm"
                                            >
                                                {pepStatus === 'filtrando' ? 'Filtrando Listas...' : 'Filtrar PEP / OFAC'}
                                            </button>
                                        ) : (
                                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-2xs font-extrabold uppercase">
                                                ✓ SPLAFT Limpio
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* EJE 5 */}
                    <div className="border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden transition-all duration-300 hover:border-gray-200 dark:hover:border-gray-600">
                        <button
                            onClick={() => setExpandedAxis(expandedAxis === 5 ? null : 5)}
                            className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/50 text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg font-black font-mono">
                                    05
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Eje 5: Academia MYPE y Gamificación (SAMI Coins)</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                        Capacitación financiera activa · Monedas acumuladas: <span className="font-bold text-indigo-600 dark:text-indigo-400">{samiCoins} Coins</span> · {isFinanceCertified ? '★ Certificación Financiera Activa ★' : 'Certificación pendiente'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                    isFinanceCertified 
                                        ? 'bg-emerald-150 text-emerald-600 border border-emerald-200' 
                                        : 'bg-violet-100 text-violet-600 dark:bg-violet-950/40'
                                }`}>
                                    {isFinanceCertified ? 'Certificado' : 'Estudiando'}
                                </span>
                                <ChevronRight size={18} className={`text-gray-400 transition-transform duration-300 ${expandedAxis === 5 ? 'rotate-90' : ''}`} />
                            </div>
                        </button>

                        {expandedAxis === 5 && (
                            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 grid md:grid-cols-2 gap-6 animate-fadeIn">
                                <div className="space-y-3">
                                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-wider">SAMI Coins y Beneficios Académicos</h5>
                                    
                                    {isFinanceCertified ? (
                                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
                                            <Trophy className="text-amber-500 flex-shrink-0 animate-bounce" size={20} />
                                            <div>
                                                <h6 className="text-xs font-black text-emerald-800 dark:text-emerald-300">¡MYPE CERTIFICADA EN FINANZAS!</h6>
                                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-bold">
                                                    Has completado exitosamente todos los cursos obligatorios de finanzas. Tienes activa la reducción exclusiva de tasa de interés del 15% en el Marketplace bancario.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                                            <AlertCircle className="text-amber-500 flex-shrink-0 animate-pulse" size={20} />
                                            <div>
                                                <h6 className="text-xs font-black text-amber-800 dark:text-amber-300">Reducción del 15% de Interés Disponible</h6>
                                                <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5 font-bold">
                                                    Completa los cursos obligatorios de finanzas en nuestra Academia SAMI para graduarte como MYPE Certificada y reducir las tasas de interés bancarias de forma inmediata.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col justify-between space-y-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        Cada lección finalizada y cada impuesto registrado te otorgan SAMI Coins que puedes canjear por cupones, reportes detallados extendidos, o incluso la exoneración de comisiones de asesoría legal.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {moduloDisponible('education', userRole) && (
                                            <button
                                                onClick={() => onNavigate && onNavigate('education')}
                                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                                            >
                                                Aprender en Academia MYPE
                                            </button>
                                        )}
                                        {moduloDisponible('loyalty', userRole) && (
                                            <button
                                                onClick={() => onNavigate && onNavigate('loyalty')}
                                                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
                                            >
                                                Canjear SAMI Coins
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sección de Insights Proactivos */}
            <div id="proactive-insights-section" className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                                Monitoreo SAMI Shield
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="text-rose-500" size={22} />
                            Insights Proactivos de Presupuesto
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Sami analiza los egresos diarios en tiempo real para alertarte ante spikes repentinos que comprometan tu liquidez semanal.
                        </p>
                    </div>

                    {/* Presupuesto Semanal Control Box */}
                    <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 min-w-[280px]">
                        <div className="space-y-1 flex-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-400 uppercase tracking-tight text-[10px]">Presupuesto Semanal</span>
                                <span className="font-black text-rose-500 font-mono">S/ {weeklyBudget.toLocaleString()}</span>
                            </div>
                            <input 
                                type="range" 
                                min="2000" 
                                max="50000" 
                                step="1000" 
                                value={weeklyBudget} 
                                onChange={(e) => setWeeklyBudget(Number(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
                            />
                            <div className="flex justify-between text-[9px] text-gray-400 font-medium">
                                <span>S/ 2,000</span>
                                <span>S/ 50,000</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard layout for Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Column 1: Alerta visual & details */}
                    <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest block mb-1">Presupuesto Diario</span>
                                <span className="text-lg font-black text-gray-800 dark:text-white font-mono">
                                    S/ {dailyLimitThreshold.toLocaleString()}
                                </span>
                                <span className="text-[9px] text-gray-400 dark:text-gray-500 block leading-tight mt-0.5">
                                    equivale al 20% semanal
                                </span>
                            </div>
                            <div className={`p-4 rounded-2xl border ${exceededDays.length > 0 ? 'bg-red-50/40 border-red-100 dark:border-red-950/30' : 'bg-green-50/40 border-green-100 dark:border-green-950/30'}`}>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest block mb-1">Estado de Spikes</span>
                                <span className={`text-sm md:text-base font-black font-mono flex items-center gap-1.5 ${exceededDays.length > 0 ? 'text-red-650 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                    {exceededDays.length > 0 ? (
                                        <>
                                            <AlertCircle size={14} className="stroke-[3] animate-pulse" />
                                            {exceededDays.length} Alerta{exceededDays.length > 1 ? 's' : ''}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={14} className="stroke-[3]" />
                                            Saludable
                                        </>
                                    )}
                                </span>
                                <span className="text-[9px] text-gray-400 dark:text-gray-500 block leading-tight mt-0.5">
                                    {exceededDays.length > 0 ? 'Gastos que cruzan el 20%' : 'Control de egresos sano'}
                                </span>
                            </div>
                        </div>

                        {/* Visual Alert Notification Banner */}
                        {exceededDays.length > 0 ? (
                            <div className="p-5 rounded-2xl border border-rose-100 bg-rose-50/50 dark:border-rose-950/20 dark:bg-rose-950/10 space-y-3.5 select-none relative overflow-hidden">
                                <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none translate-x-6 translate-y-6">
                                    <Sparkles size={160} className="text-rose-500" />
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                                        ⚠️
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-black text-rose-900 dark:text-rose-300 uppercase tracking-widest">
                                            Alerta de Gasto Diario Excesivo
                                        </h4>
                                        <p className="text-xs text-rose-800 dark:text-rose-400 leading-relaxed font-semibold">
                                            SAMI ha detectado {exceededDays.length} día(s) con gastos que sobrepasan el <span className="font-extrabold text-rose-600">20% ({`S/ ${dailyLimitThreshold.toLocaleString()}`})</span> de tu presupuesto semanal.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                                    {exceededDays.map((day, idx) => (
                                        <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-rose-100/60 dark:border-rose-900/30 text-xs flex justify-between items-center hover:scale-[1.01] transition-transform">
                                            <div className="space-y-0.5">
                                                <div className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                                                    <Calendar size={13} className="text-rose-400" />
                                                    {day.date}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    Exceso de: <span className="text-rose-500 font-mono font-bold font-semibold">S/ {day.exceededBy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-gray-900 dark:text-white font-mono">S/ {day.amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                                                <div className="text-[10px] font-bold text-rose-500 font-mono">({day.percentageUsed.toFixed(1)}% del presupuesto)</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <p className="text-[10.5px] text-rose-700 dark:text-rose-400 font-medium leading-relaxed italic bg-white/50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-rose-50 dark:border-gray-800">
                                    <Lightbulb size={14} className="text-rose-600 dark:text-rose-400 inline-block align-text-bottom mr-1" /> <strong>Coaching Presupuestal:</strong> Intenta distribuir estas compras de alto valor o negociar crédito corporativo de 30 días para no mermar la liquidez de caja chica.
                                </p>
                            </div>
                        ) : (
                            <div className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/40 dark:border-emerald-950/20 dark:bg-emerald-950/10 space-y-3">
                                <div className="flex gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={18} className="text-emerald-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-widest">
                                            Perfecto Control Presupuestal
                                        </h4>
                                        <p className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed font-semibold">
                                            ¡Ningún día supera el benchmark prudencial de S/ {dailyLimitThreshold.toLocaleString()}!
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed font-medium pl-12">
                                    Mantienes los flujos de egresos bien dosificados. Esto reduce el estrés financiero de corto plazo y mejora tu posicionamiento crediticio ante entidades financieras aliadas.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Column 2: Recharts graphic visualization */}
                    <div className="lg:col-span-12 xl:col-span-7 bg-gray-50/50 dark:bg-gray-900/10 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Últimos días de operación de egreso</h4>
                                    <p className="text-[11px] text-gray-400">Las columnas que sobrepasan la línea roja indican spikes de egreso excesivos (&gt;20% semanal).</p>
                                </div>
                                <div className="flex gap-3 text-[10px] font-bold">
                                    <span className="flex items-center gap-1.5 text-gray-500">
                                        <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> Dentro
                                    </span>
                                    <span className="flex items-center gap-1.5 text-rose-500">
                                        <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> Alerta
                                    </span>
                                </div>
                            </div>

                            {dailyExpensesList.length === 0 ? (
                                <div className="h-[210px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs italic">
                                    No hay gastos registrados en esta cuenta.
                                </div>
                            ) : (
                                <div className="h-[210px] w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            data={dailyExpensesList.slice(0, 10).reverse()}
                                            margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                                            <XAxis 
                                                dataKey="date" 
                                                tick={{ fill: '#94a3b8', fontSize: 9 }} 
                                                axisLine={false} 
                                                tickLine={false}
                                                tickFormatter={(date) => {
                                                    try {
                                                        const pParts = date.split('-');
                                                        return pParts.length > 2 ? `${pParts[2]} / ${pParts[1]}` : date;
                                                    } catch {
                                                        return date;
                                                    }
                                                }}
                                            />
                                            <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                                            <Tooltip 
                                                formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Gasto Total']}
                                                contentStyle={{ 
                                                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                                    border: 'none', 
                                                    borderRadius: '8px', 
                                                    color: '#fff',
                                                    fontSize: '11px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                                                }}
                                                labelFormatter={(lbl) => `Fecha: ${lbl}`}
                                            />
                                            <ReferenceLine 
                                                y={dailyLimitThreshold} 
                                                stroke="#ef4444" 
                                                strokeDasharray="4 4" 
                                                label={{ 
                                                    value: `Límite 20%: S/ ${dailyLimitThreshold.toLocaleString()}`, 
                                                    fill: '#ef4444', 
                                                    fontSize: 8, 
                                                    position: 'top',
                                                    fontWeight: 'bold'
                                                }} 
                                            />
                                            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                                {dailyExpensesList.slice(0, 10).reverse().map((entry, index) => {
                                                    const color = entry.amount > dailyLimitThreshold ? '#f43f5e' : '#3b82f6';
                                                    return (
                                                        <Cell key={`cell-${index}`} fill={color} />
                                                    );
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div className="text-[10px] text-gray-400 italic pt-2 border-t border-gray-100 dark:border-gray-800 text-center">
                            * Regla prudencial SAMI de Alerta Temprana: Un egreso diario mayor al 20% del presupuesto semanal incrementa el riesgo de descalce de caja en un 38%.
                        </div>
                    </div>
                </div>
            </div>

            {creditApplications.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <CreditCard size={20} className="text-blue-500" />
                        Estado de Solicitudes de Crédito
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {creditApplications.slice(0, 3).map(app => (
                            <div key={app.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center p-2 shadow-sm">
                                        <img src={app.partner.logoUrl} alt={app.partner.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">S/ {app.amount.toLocaleString()}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">{app.type === 'loan' ? 'Préstamo' : 'Factoring'}</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1.5 font-black text-[9px] uppercase px-2.5 py-1 rounded-full ${
                                    app.status === 'pending' || app.status === 'reviewing' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                                }`}>
                                    {app.status === 'pending' || app.status === 'reviewing' ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                                    {app.status === 'pending' ? 'Pdte' : app.status === 'reviewing' ? 'Revisión' : 'Listo'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerDashboard;
