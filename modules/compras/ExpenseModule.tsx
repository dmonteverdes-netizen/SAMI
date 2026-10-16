
import React, { useState, useMemo } from 'react';
import { 
    Invoice, 
    Vendor, 
    PaymentAlert, 
    CostOptimizationReport,
    InvoiceType,
    DocumentType
} from '../../types';
import { identifyRecurringVendors, generateCostOptimizationReport, identifyRecurringVendorsSync, generateCostOptimizationReportSync } from '../../services/expenseService';
import { suggestPurchaseCategory, CategorySuggestion } from '../../services/aiCategoryService';
import { maskRUC, maskCurrency } from '../../services/maskingUtils';
import { Bell, TrendingDown, Users, Plus, AlertCircle, CheckCircle, Receipt, PieChart as ChartIcon, BarChart3 as BarIcon, Info, HelpCircle, Wallet, TrendingUp, Sparkles, Percent, Scale } from 'lucide-react';
import { 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell, 
    Tooltip, 
    Legend, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid 
} from 'recharts';

// --- Color Palettes & Categories Definitions for Recharts ---
const COLOR_PALETTES = {
    modern: {
        'Mercadería y Suministros': '#3b82f6', // blue-500
        'Servicios Públicos': '#10b981', // emerald-500
        'Tecnología y Software': '#6366f1', // indigo-500
        'Alquileres y Oficinas': '#f59e0b', // amber-500
        'Marketing y Ventas': '#ec4899', // pink-500
        'Logística y Transporte': '#8b5cf6', // violet-500
        'Otros Gastos': '#6b7280', // gray-500
    },
    vibrant: {
        'Mercadería y Suministros': '#ef4444', // red-500
        'Servicios Públicos': '#06b6d4', // cyan-500
        'Tecnología y Software': '#f43f5e', // rose-500
        'Alquileres y Oficinas': '#eab308', // yellow-500
        'Marketing y Ventas': '#d946ef', // magenta-500
        'Logística y Transporte': '#14b8a6', // teal-500
        'Otros Gastos': '#4b5563', // gray-600
    },
    emerald: {
        'Mercadería y Suministros': '#047857', // emerald-700
        'Servicios Públicos': '#059669', // emerald-600
        'Tecnología y Software': '#10b981', // emerald-500
        'Alquileres y Oficinas': '#34d399', // emerald-400
        'Marketing y Ventas': '#6ee7b7', // emerald-300
        'Logística y Transporte': '#a7f3d0', // emerald-200
        'Otros Gastos': '#d1fae5', // emerald-100
    }
};

type PaletteKey = 'modern' | 'vibrant' | 'emerald';

const CATEGORIES = [
    { id: 'Mercadería y Suministros', label: 'Mercadería y Suministros' },
    { id: 'Servicios Públicos', label: 'Servicios Públicos' },
    { id: 'Tecnología y Software', label: 'Tecnología y Software' },
    { id: 'Alquileres y Oficinas', label: 'Alquileres y Oficinas' },
    { id: 'Marketing y Ventas', label: 'Marketing y Ventas' },
    { id: 'Logística y Transporte', label: 'Logística y Transporte' },
    { id: 'Otros Gastos', label: 'Otros Gastos' },
];

const getPurchaseCategory = (p: Invoice): string => {
    if (p.category) return p.category;
    // Fallback classification based on RUC/details
    if (p.ruc === '20100070970') {
        return 'Servicios Públicos';
    }
    if (p.ruc === '20553467801') {
        return 'Mercadería y Suministros';
    }
    // Deterministic fallback for any other RUC or seed
    if (p.id === 'seed_p1' || p.id === 'seed_p2' || p.id === 'seed_p3') {
        return 'Servicios Públicos';
    }
    if (p.id === 'seed_p4' || p.id === 'seed_p5') {
        return 'Mercadería y Suministros';
    }
    return 'Otros Gastos';
};
import { useAuth } from '../../core/context/AuthContext';
import { logAdminAction } from '../../services/auditService';

interface ExpenseModuleProps {
    purchases: Invoice[];
    sales?: Invoice[];
    onAddPurchase: (invoice: Omit<Invoice, 'id'>) => void;
    onAddAlert: (alert: Omit<PaymentAlert, 'id'>) => void;
    onUpdateAlert: (alertId: string, status: 'pending' | 'paid' | 'overdue') => void;
    alerts: PaymentAlert[];
}

const ExpenseModule: React.FC<ExpenseModuleProps> = ({ purchases, sales = [], onAddPurchase, onAddAlert, onUpdateAlert, alerts }) => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'purchases' | 'vendors' | 'alerts' | 'optimization'>('purchases');
    
    // Purchase form state
    const [showNewPurchaseForm, setShowNewPurchaseForm] = useState(false);
    const [pSeries, setPSeries] = useState('');
    const [pCorrelative, setPCorrelative] = useState('');
    const [pDate, setPDate] = useState(new Date().toISOString().split('T')[0]);
    const [pRuc, setPRuc] = useState('');
    const [pAmount, setPAmount] = useState('');
    const [pDocType, setPDocType] = useState<DocumentType>(DocumentType.FACTURA);
    const [pCategory, setPCategory] = useState<string>('Mercadería y Suministros');
    const [pDescription, setPDescription] = useState('');
    const [aiCategorySuggestion, setAiCategorySuggestion] = useState<CategorySuggestion | null>(null);
    const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
    const [purchaseFormError, setPurchaseFormError] = useState<string | null>(null);

    const handleDescriptionChange = async (text: string) => {
        setPDescription(text);
        if (!text || text.trim().length < 3) {
            setAiCategorySuggestion(null);
            return;
        }

        setIsAnalyzingAi(true);
        try {
            const suggestion = await suggestPurchaseCategory(text, {
                ruc: pRuc,
                totalAmount: pAmount ? parseFloat(pAmount) : undefined
            });
            setAiCategorySuggestion(suggestion);
            if (suggestion.category && suggestion.confidence > 0.6) {
                setPCategory(suggestion.category);
            }
        } catch (err) {
            console.error('[ExpenseModule] AI suggestion failed:', err);
        } finally {
            setIsAnalyzingAi(false);
        }
    };

    // Chart customization states for admin preferences
    const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
    const [colorPalette, setColorPalette] = useState<PaletteKey>('modern');
    const [minAmountFilter, setMinAmountFilter] = useState<number>(0);

    const availableMonths = useMemo(() => {
        const monthsSet = new Set<string>();
        // Default current month so there is always a valid month option in demo state
        monthsSet.add("2026-05");
        purchases.forEach(p => {
            if (p.issueDate && p.issueDate.length >= 7) {
                monthsSet.add(p.issueDate.substring(0, 7));
            }
        });
        return Array.from(monthsSet).sort().reverse();
    }, [purchases]);

    const [selectedMonth, setSelectedMonth] = useState<string>("2026-05");

    // Monthly budget state powered by local persistence
    const [monthlyBudgetInput, setMonthlyBudgetInput] = useState<string>(() => {
        const saved = localStorage.getItem('sami_monthly_budget');
        return saved ? saved : '15000';
    });

    const monthlyBudget = useMemo(() => {
        const parsed = parseFloat(monthlyBudgetInput);
        return isNaN(parsed) || parsed <= 0 ? 1 : parsed;
    }, [monthlyBudgetInput]);

    const handleBudgetChange = (value: string) => {
        setMonthlyBudgetInput(value);
        localStorage.setItem('sami_monthly_budget', value || '0');
    };

    // Category aggregation for charting
    const categoryData = useMemo(() => {
        const aggs: { [cat: string]: number } = {};
        
        purchases.forEach(p => {
            if (selectedMonth !== 'all' && (!p.issueDate || !p.issueDate.startsWith(selectedMonth))) {
                return;
            }
            const cat = getPurchaseCategory(p);
            aggs[cat] = (aggs[cat] || 0) + p.totalAmount;
        });

        return CATEGORIES.map(cat => {
            const rawValue = aggs[cat.id] || 0;
            return {
                name: cat.id,
                value: rawValue,
                color: COLOR_PALETTES[colorPalette][cat.id as keyof (typeof COLOR_PALETTES)['modern']] || '#6b7280'
            };
        })
        .filter(item => item.value >= minAmountFilter && item.value > 0);
    }, [purchases, colorPalette, minAmountFilter, selectedMonth]);

    const totalExpensesSum = useMemo(() => {
        return categoryData.reduce((acc, curr) => acc + curr.value, 0);
    }, [categoryData]);

    const selectedMonthLabel = useMemo(() => {
        if (selectedMonth === 'all') return 'Todos los Periodos';
        const [year, month] = selectedMonth.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 15);
        const label = date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    }, [selectedMonth]);

    const budgetRemaining = useMemo(() => {
        const diff = monthlyBudget - totalExpensesSum;
        return diff < 0 ? 0 : diff;
    }, [monthlyBudget, totalExpensesSum]);

    const rawBudgetProgressPct = useMemo(() => {
        if (monthlyBudget <= 0) return 0;
        return (totalExpensesSum / monthlyBudget) * 100;
    }, [totalExpensesSum, monthlyBudget]);

    const budgetProgressPct = useMemo(() => {
        return Math.min(100, rawBudgetProgressPct);
    }, [rawBudgetProgressPct]);

    const budgetChartData = useMemo(() => {
        const consumed = Math.min(totalExpensesSum, monthlyBudget);
        const remaining = Math.max(0, monthlyBudget - totalExpensesSum);
        const consumedColor = rawBudgetProgressPct > 100 
            ? '#ef4444' 
            : rawBudgetProgressPct >= 80 
                ? '#f59e0b' 
                : '#2563eb';
        
        return [
            { name: 'Consumido', value: consumed, color: consumedColor },
            { name: 'Restante', value: remaining, color: 'rgba(156, 163, 175, 0.15)' }
        ];
    }, [totalExpensesSum, monthlyBudget, rawBudgetProgressPct]);

    const highestExpenseCategory = useMemo(() => {
        if (categoryData.length === 0) return null;
        return categoryData.reduce((prev, curr) => (curr.value > prev.value) ? curr : prev, categoryData[0]);
    }, [categoryData]);

    // Adaptive Tax Calculation States for fiscal projections
    const [taxBracketRate, setTaxBracketRate] = useState<number>(0.10); // Default to 10% lower bracket of RMT

    // Advanced tax breakdown and fiscal shield calculation
    const taxProjections = useMemo(() => {
        // Filter purchases & sales for active month
        const filteredPurchases = purchases.filter(p => {
            if (selectedMonth === 'all') return true;
            return p.issueDate && p.issueDate.startsWith(selectedMonth);
        });

        const filteredSales = sales.filter(s => {
            if (selectedMonth === 'all') return true;
            return s.issueDate && s.issueDate.startsWith(selectedMonth);
        });

        // Calculate IGV Debit (Sales)
        let totalSalesAmount = 0;
        let igvDebit = 0;
        filteredSales.forEach(s => {
            totalSalesAmount += s.totalAmount;
            const base = s.totalAmount / 1.18;
            igvDebit += (s.totalAmount - base);
        });

        // Calculate IGV Credit (Purchases/registered expenses)
        let totalPurchasesAmount = 0;
        let igvCredit = 0;
        let deductiblePurchasesAmount = 0; 
        
        filteredPurchases.forEach(p => {
            totalPurchasesAmount += p.totalAmount;
            const base = p.totalAmount / 1.18;
            const itemIgv = p.totalAmount - base;

            if (p.documentType === DocumentType.FACTURA || (p.documentType as string) === 'FACTURA' || (p.documentType as string) === 'Factura') {
                igvCredit += itemIgv;
                deductiblePurchasesAmount += base;
            } else {
                deductiblePurchasesAmount += p.totalAmount; 
            }
        });

        // Impuesto a la Renta pre-payments (RMT monthly pago a cuenta is typically 1% of net sales)
        const netSales = totalSalesAmount / 1.18;
        const incomeTaxPrepayment = netSales * 0.01;

        // Income Tax deduction (fiscal shield): reduces taxable net income
        const rentaTaxShield = deductiblePurchasesAmount * taxBracketRate; 
        const igvTaxShield = igvCredit;
        const totalFiscalShield = rentaTaxShield + igvTaxShield;

        // Efficiency metric
        const expenseTaxEfficiency = totalPurchasesAmount > 0 
            ? (totalFiscalShield / totalPurchasesAmount) * 100 
            : 0;

        const netIgvPayable = Math.max(0, igvDebit - igvCredit);
        const igvFavorBalance = Math.max(0, igvCredit - igvDebit);

        // Chart data comparison
        const chartData = [
            { name: 'IGV Débito (Ventas)', monto: igvDebit, color: '#f43f5e' },
            { name: 'IGV Crédito (Gasto)', monto: igvCredit, color: '#10b981' },
            { name: 'Imp. Renta Pre-Pago', monto: incomeTaxPrepayment, color: '#3b82f6' },
            { name: 'Ahorro Fiscal Total', monto: totalFiscalShield, color: '#8b5cf6' }
        ];

        return {
            totalSalesAmount,
            netSales,
            igvDebit,
            totalPurchasesAmount,
            deductiblePurchasesAmount,
            igvCredit,
            netIgvPayable,
            igvFavorBalance,
            incomeTaxPrepayment,
            rentaTaxShield,
            igvTaxShield,
            totalFiscalShield,
            expenseTaxEfficiency,
            chartData
        };
    }, [purchases, sales, selectedMonth, taxBracketRate]);

    // Alert form state
    const [showNewAlertForm, setShowNewAlertForm] = useState(false);
    const [vendorId, setVendorId] = useState('');
    const [serviceName, setServiceName] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<'once' | 'monthly' | 'quarterly'>('monthly');

    const vendors = useMemo(() => identifyRecurringVendorsSync(purchases), [purchases]);
    const selectedVendor = useMemo(() => vendors.find(v => v.id === vendorId), [vendors, vendorId]);
    const optimizationReport = useMemo(() => generateCostOptimizationReportSync(purchases, 'healthy'), [purchases]);

    const handleAddPurchaseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPurchaseFormError(null);
        try {
            onAddPurchase({
                type: InvoiceType.PURCHASE,
                documentType: pDocType,
                series: pSeries.toUpperCase(),
                correlative: parseInt(pCorrelative, 10),
                issueDate: pDate,
                ruc: pRuc,
                totalAmount: parseFloat(pAmount),
                category: pCategory,
                description: pDescription,
                aiCategorizedReason: aiCategorySuggestion?.reason
            });
            setShowNewPurchaseForm(false);
            setPSeries('');
            setPCorrelative('');
            setPRuc('');
            setPAmount('');
            setPDescription('');
            setAiCategorySuggestion(null);
            setPCategory('Mercadería y Suministros');
        } catch (err: any) {
            setPurchaseFormError(err?.message || 'Error al registrar el comprobante de compra.');
        }
    };

    const handleAddAlertSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddAlert({
            vendorId,
            serviceName,
            dueDate,
            amount: parseFloat(amount),
            status: 'pending',
            frequency
        });
        setShowNewAlertForm(false);
        setVendorId('');
        setServiceName('');
        setDueDate('');
        setAmount('');
    };

    return (
        <div className="container mx-auto p-4 max-w-7xl h-full flex flex-col gap-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Gestión de Gastos y Proveedores</h1>
                    <p className="text-gray-600 dark:text-gray-400">Optimice sus costos y nunca pierda un pago.</p>
                </div>
                <button 
                    onClick={() => { 
                        if (activeTab === 'purchases') {
                            setPurchaseFormError(null);
                            setShowNewPurchaseForm(true);
                        } else { 
                            setActiveTab('alerts'); 
                            setShowNewAlertForm(true); 
                        }
                    }}
                    className="flex items-center justify-center gap-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-bold text-sm"
                >
                    <Plus size={18} />
                    <span>{activeTab === 'purchases' ? 'Registrar Compra' : 'Programar Alerta'}</span>
                </button>
            </header>

            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('purchases')}
                    className={`min-h-[44px] px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'purchases' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Receipt size={18} />
                    Facturas de Compra
                </button>
                <button 
                    onClick={() => setActiveTab('vendors')}
                    className={`min-h-[44px] px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'vendors' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Users size={18} />
                    Proveedores
                </button>
                <button 
                    onClick={() => setActiveTab('alerts')}
                    className={`min-h-[44px] px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'alerts' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Bell size={18} />
                    Alertas de Pago
                </button>
                <button 
                    onClick={() => setActiveTab('optimization')}
                    className={`min-h-[44px] px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'optimization' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <TrendingDown size={18} />
                    Optimización de Costos
                </button>
            </div>

            <main className="mt-4">
                {activeTab === 'purchases' && (
                    <div className="space-y-6">
                        {/* Panel de Presupuesto Mensual y Control de Consumo */}
                        <div id="monthly-budget-tracker-card" className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 mb-4 border-b border-gray-100 dark:border-gray-700">
                                <div className="space-y-1">
                                    <span id="budget-badge" className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-[0.15em] flex items-center gap-1.5">
                                        <Wallet size={12} /> Límite de Gasto Corporativo
                                    </span>
                                    <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        Monitoreo de Presupuesto Mensual
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Define tu meta global de egresos para el periodo contable <strong className="font-semibold text-gray-800 dark:text-white">{selectedMonthLabel}</strong>.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700 whitespace-nowrap">
                                    <label htmlFor="budget-input-field" className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                                        Presupuesto S/:
                                    </label>
                                    <input
                                        id="budget-input-field"
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={monthlyBudgetInput}
                                        onChange={(e) => handleBudgetChange(e.target.value)}
                                        placeholder="Establecer límite"
                                        className="w-32 px-3 py-1.5 text-xs font-black font-mono text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-705 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all outline-none"
                                    />
                                </div>
                            </div>
                                  {/* Main feedback content divided into layout grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                                <div className="lg:col-span-2 space-y-5">
                                    {/* Consumed details info metrics */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div id="budget-metric-spent" className="p-3 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100/30 dark:border-gray-700/30">
                                            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Gastado</span>
                                            <span className="text-sm font-black text-gray-800 dark:text-white font-mono mt-0.5 block">
                                                {maskCurrency(totalExpensesSum, `S/ ${totalExpensesSum.toFixed(2)}`)}
                                            </span>
                                        </div>
                                        <div id="budget-metric-total" className="p-3 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100/30 dark:border-gray-700/30">
                                            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Meta de Presupuesto</span>
                                            <span className="text-sm font-black text-gray-800 dark:text-white font-mono mt-0.5 block">
                                                S/ {monthlyBudget.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div id="budget-metric-remaining" className="p-3 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100/30 dark:border-gray-700/30">
                                            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Disponible / Cupo</span>
                                            <span className={`text-sm font-black font-mono mt-0.5 block ${rawBudgetProgressPct > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {rawBudgetProgressPct > 100 ? 'S/ 0.00' : `S/ ${budgetRemaining.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress bar container */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-400 font-semibold uppercase text-[9px] tracking-wider">Progreso de consumo</span>
                                            <span className={`font-black font-mono px-2 py-0.5 rounded-md text-[10px] ${
                                                rawBudgetProgressPct > 100 
                                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse'
                                                    : rawBudgetProgressPct >= 80
                                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                            }`}>
                                                {rawBudgetProgressPct.toFixed(1)}% Consumido
                                            </span>
                                        </div>

                                        <div className="w-full h-3.5 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-150 dark:border-gray-800">
                                            <div
                                                id="budget-consumption-progress-bar"
                                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                                    rawBudgetProgressPct > 100
                                                        ? 'bg-red-500 animate-pulse'
                                                        : rawBudgetProgressPct >= 80
                                                            ? 'bg-amber-500'
                                                            : 'bg-blue-600 dark:bg-indigo-500'
                                                }`}
                                                style={{ width: `${budgetProgressPct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Donut chart on the right */}
                                <div className="flex flex-col items-center justify-center p-4 bg-gray-50/40 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700/60 min-h-[170px] relative">
                                    <div className="w-full h-32 relative flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={budgetChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={36}
                                                    outerRadius={50}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    startAngle={90}
                                                    endAngle={-270}
                                                >
                                                    {budgetChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value: any, name: any) => [
                                                        `S/ ${parseFloat(value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 
                                                        name
                                                    ]}
                                                    contentStyle={{
                                                        background: 'rgba(0, 0, 0, 0.85)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        color: '#fff'
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        
                                        {/* Core absolute label inside hollow of donut */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-xs font-black text-gray-750 dark:text-gray-250">
                                                {rawBudgetProgressPct.toFixed(0)}%
                                            </span>
                                            <span className="text-[7px] font-black uppercase text-gray-405 tracking-wider">
                                                Consumo
                                            </span>
                                        </div>
                                    </div>

                                    {/* Brief labels for clarification */}
                                    <div className="flex items-center gap-4 mt-1 text-[9px] font-black uppercase tracking-wider">
                                        <div className="flex items-center gap-1">
                                            <span className={`w-2 h-2 rounded-full ${
                                                rawBudgetProgressPct > 100 
                                                    ? 'bg-red-500' 
                                                    : rawBudgetProgressPct >= 80 
                                                        ? 'bg-amber-500' 
                                                        : 'bg-blue-600'
                                            }`} />
                                            <span className="text-gray-600 dark:text-gray-300">Gastado</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" style={{ backgroundColor: 'rgba(156, 163, 175, 0.35)' }} />
                                            <span className="text-gray-400">Cupo Libre</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Intelligent financial assistance coaching tips below layout grid */}
                            <div className="pt-4 mt-2 border-t border-gray-100/50 dark:border-gray-700/30">
                                {rawBudgetProgressPct > 100 ? (
                                    <div id="budget-status-alert" className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100/40 dark:border-red-900/40">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <p className="leading-relaxed font-semibold">
                                            <strong>¡Alerta de Sobregasto!</strong> Has superado el presupuesto establecido en este periodo por <span className="font-mono font-black">S/ {(totalExpensesSum - monthlyBudget).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>. SAMI aconseja diferir compras no urgentes para el siguiente mes o auditar las facturas de Servicios Públicos.
                                        </p>
                                    </div>
                                ) : rawBudgetProgressPct >= 80 ? (
                                    <div id="budget-status-warning" className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100/40 dark:border-amber-900/40">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <p className="leading-relaxed font-semibold">
                                            <strong>Advertencia de Consumo:</strong> Te queda menos del 20% del presupuesto para este periodo (<span className="font-mono font-black">S/ {budgetRemaining.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>). Evita excesos y califica para la optimización de compras recurrentes.
                                        </p>
                                    </div>
                                ) : (
                                    <div id="budget-status-optimal" className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-100/40 dark:border-emerald-900/20">
                                        <CheckCircle size={16} className="shrink-0 mt-0.5" />
                                        <p className="leading-relaxed font-normal">
                                            <strong>Presupuesto Saludable:</strong> Tus gastos registrados operan con total normalidad para el mes de <span className="font-bold">{selectedMonthLabel}</span>. Tienes <span className="font-mono font-bold">S/ {budgetRemaining.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span> de cupo libre para inversiones y adquisiciones de tu negocio.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Componente de Desglose Visual Avanzado - IGV vs Renta y Proyecciones de Ahorro Fiscal */}
                        <div id="tax-fiscal-breakdown-card" className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-[0.15em] flex items-center gap-1.5">
                                        <Sparkles size={12} className="animate-pulse" /> Inteligencia Tributaria Avanzada
                                    </span>
                                    <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        Escudo Fiscal, IGV & Impuesto a la Renta
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Compara el IGV mensual acumulado y el Impuesto a la Renta del ejercicio para optimizar tu carga tributaria.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700 whitespace-nowrap">
                                    <label htmlFor="regime-select-field" className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                        <Scale size={11} /> Proyección Régimen:
                                    </label>
                                    <select
                                        id="regime-select-field"
                                        value={taxBracketRate}
                                        onChange={(e) => setTaxBracketRate(parseFloat(e.target.value))}
                                        className="px-3 py-1.5 text-xs font-black font-mono text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-750 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white transition-all outline-none"
                                    >
                                        <option value={0.10}>MYPE RMT (Tramo Inicial: 10%)</option>
                                        <option value={0.295}>Régimen General (Tasa Plena: 29.5%)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Main feedback content divided into layout grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-5">
                                    {/* Metrics section */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {/* IGV Status Metric */}
                                        <div className="p-4 bg-gray-50/50 dark:bg-gray-900/40 rounded-xl border border-gray-100/40 dark:border-gray-700/40 space-y-1">
                                            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">IGV del Periodo</span>
                                            {taxProjections.netIgvPayable > 0 ? (
                                                <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono block">
                                                    S/ {taxProjections.netIgvPayable.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                                                    S/ {taxProjections.igvFavorBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })} <span className="text-[9px] font-normal uppercase">Fav.</span>
                                                </span>
                                            )}
                                            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
                                                <span>Débito: S/ {taxProjections.igvDebit.toFixed(0)}</span>
                                                <span>Crédito: S/ {taxProjections.igvCredit.toFixed(0)}</span>
                                            </div>
                                        </div>

                                        {/* Income Tax Prepayment */}
                                        <div className="p-4 bg-gray-50/50 dark:bg-gray-900/40 rounded-xl border border-gray-100/40 dark:border-gray-700/40 space-y-1">
                                            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Pago Cta. Renta (Est.)</span>
                                            <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono block">
                                                S/ {taxProjections.incomeTaxPrepayment.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                            </span>
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
                                                <span>1% Ventas Netas: S/ {taxProjections.netSales.toFixed(0)}</span>
                                            </div>
                                        </div>

                                        {/* Tax Efficiency / Consolidate savings */}
                                        <div className="p-4 bg-purple-50/30 dark:bg-purple-950/10 rounded-xl border border-purple-100/40 dark:border-purple-900/30 space-y-1">
                                            <span className="block text-[9px] font-black text-purple-500 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1">
                                                <Percent size={10} /> Eficiencia de Compras
                                            </span>
                                            <span className="text-base font-black text-purple-750 dark:text-purple-300 font-mono block">
                                                {taxProjections.expenseTaxEfficiency.toFixed(1)}%
                                            </span>
                                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold pt-1 border-t border-purple-100/50 dark:border-purple-900/35">
                                                <span>Ahorro: S/ {taxProjections.totalFiscalShield.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed breakdown of fiscal shields */}
                                    <div className="p-4 bg-gray-50/30 dark:bg-gray-900/20 rounded-xl border border-gray-100/40 dark:border-gray-700/40 space-y-3">
                                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Desglose Consolidado de Escudo Fiscal (Ahorro Fiscal)</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="flex items-start gap-2 text-xs">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                                <div className="space-y-0.5">
                                                    <span className="text-gray-400 block font-medium">Ahorro Directo de IGV (Compras)</span>
                                                    <span className="font-bold text-gray-800 dark:text-white font-mono">S/ {taxProjections.igvTaxShield.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                                    <p className="text-[10px] text-gray-500">Impuesto rescatado directamente mediante facturas corporativas.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2 text-xs">
                                                <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                                                <div className="space-y-0.5">
                                                    <span className="text-gray-400 block font-medium">Escudo Impuesto a la Renta</span>
                                                    <span className="font-bold text-gray-800 dark:text-white font-mono">S/ {taxProjections.rentaTaxShield.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                                    <p className="text-[10px] text-gray-500">Monto deducible que reduce tu pago anual de Impuesto a la Renta ({taxBracketRate * 100}% tasa).</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recharts Visual Bar Chart mapping */}
                                <div className="p-4 bg-gray-50/40 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between min-h-[220px]">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 block text-center">Estructura Impositiva Estimada S/</span>
                                    <div className="w-full h-36">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={taxProjections.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:hidden" />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" className="hidden dark:block" />
                                                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#9ca3af" axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" axisLine={false} tickLine={false} />
                                                <Tooltip 
                                                    formatter={(value: any) => [`S/ ${parseFloat(value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 'monto']}
                                                    contentStyle={{
                                                        background: 'rgba(0,0,0,0.85)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        color: '#fff'
                                                    }}
                                                />
                                                <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
                                                    {taxProjections.chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] font-black text-purple-600 dark:text-purple-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <span className="uppercase tracking-wider">Ahorro Fiscal Total</span>
                                        <span className="font-mono text-xs">S/ {taxProjections.totalFiscalShield.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Intelligent financial advisor coaching tips from SAMI */}
                            <div className="pt-4 border-t border-gray-100/50 dark:border-gray-700/30">
                                <div className="flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-300 bg-purple-50/20 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-100/40 dark:border-purple-900/30">
                                    <Sparkles size={16} className="shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                                    <div className="space-y-1">
                                        <strong className="block text-purple-950 dark:text-purple-100 font-bold">Consejo de SAMI sobre Eficiencia Fiscal:</strong>
                                        <p className="leading-relaxed">
                                            Tu volumen de transacciones en compras de <strong className="font-semibold text-gray-800 dark:text-white">S/ {taxProjections.totalPurchasesAmount.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</strong> ha generado un escudo fiscal consolidado de <strong className="font-bold font-mono text-purple-800 dark:text-purple-300">S/ {taxProjections.totalFiscalShield.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong> (Eficiencia del {taxProjections.expenseTaxEfficiency.toFixed(1)}%). 
                                            {taxProjections.totalPurchasesAmount > 0 && (
                                                <span> SAMI te recomienda priorizar siempre el pedido de <strong className="font-semibold text-gray-800 dark:text-white">Facturas electrónicas</strong> en lugar de Boletas de Venta para asegurar la deducción tanto del crédito fiscal de IGV (18% de base) como el Impuesto a la Renta de tercera categoría.</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {showNewPurchaseForm && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-xl">
                                            <Receipt size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Registrar Factura o Comprobante de Compra</h3>
                                            <p className="text-xs text-gray-500">Ingrese el detalle para que la IA de SAMI recomiende la categoría de gasto en tiempo real.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowNewPurchaseForm(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                                        <Plus className="rotate-45" size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleAddPurchaseSubmit} className="space-y-4">
                                    {purchaseFormError && (
                                        <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-semibold">
                                            <AlertCircle size={16} className="shrink-0 text-red-500" />
                                            <span>{purchaseFormError}</span>
                                        </div>
                                    )}

                                    {/* AI Smart Text Parser Box */}
                                    <div className="bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-blue-50/80 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/30 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] font-black uppercase text-purple-950 dark:text-purple-300 tracking-wider flex items-center gap-1.5">
                                                <Sparkles size={14} className="text-purple-600 dark:text-purple-400 animate-pulse" />
                                                <span>Detalle o Contenido de la Compra (Categorización Automática con IA)</span>
                                            </label>
                                            {isAnalyzingAi && (
                                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold animate-pulse flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                                                    SAMI IA Analizando...
                                                </span>
                                            )}
                                        </div>
                                        <textarea 
                                            value={pDescription} 
                                            onChange={e => handleDescriptionChange(e.target.value)}
                                            placeholder="Ej: Compra de 50 sacos de harina de trigo para panadería, Recibo de pago de internet fibra óptica y líneas móviles, Flete y envío de encomiendas a provincias, Mantenimiento preventivo de máquina de coser..."
                                            rows={2}
                                            className="w-full p-2.5 rounded-xl border border-purple-200/80 dark:border-purple-800 dark:bg-gray-900 text-xs outline-none focus:ring-2 focus:ring-purple-500 transition-all font-sans text-gray-800 dark:text-gray-200"
                                        />

                                        {aiCategorySuggestion && (
                                            <div className="bg-white/95 dark:bg-gray-900/95 p-3 rounded-lg border border-purple-200/90 dark:border-purple-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-extrabold text-[11px]">
                                                            Sugerencia IA: {aiCategorySuggestion.category}
                                                        </span>
                                                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                            {Math.round(aiCategorySuggestion.confidence * 100)}% Confianza
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                                                        💡 {aiCategorySuggestion.reason}
                                                    </p>
                                                </div>
                                                {pCategory !== aiCategorySuggestion.category && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPCategory(aiCategorySuggestion.category)}
                                                        className="shrink-0 min-h-[44px] px-4 py-2 bg-purple-600 text-white font-black text-[11px] uppercase tracking-wider rounded-xl hover:bg-purple-700 transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center"
                                                    >
                                                        Usar Sugerencia IA
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Tipo Doc.</label>
                                            <select 
                                                value={pDocType} 
                                                onChange={e => setPDocType(e.target.value as DocumentType)}
                                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            >
                                                <option value={DocumentType.FACTURA}>Factura</option>
                                                <option value={DocumentType.BOLETA}>Boleta</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Serie</label>
                                                <input 
                                                    type="text" 
                                                    value={pSeries} 
                                                    onChange={e => setPSeries(e.target.value)}
                                                    placeholder="F001"
                                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Correlativo</label>
                                                <input 
                                                    type="number" 
                                                    value={pCorrelative} 
                                                    onChange={e => setPCorrelative(e.target.value)}
                                                    placeholder="102"
                                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">RUC Proveedor</label>
                                            <input 
                                                type="text" 
                                                value={pRuc} 
                                                onChange={e => setPRuc(e.target.value)}
                                                placeholder="20..."
                                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                required={pDocType === DocumentType.FACTURA}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Categoría Asignada</label>
                                            <select 
                                                value={pCategory} 
                                                onChange={e => setPCategory(e.target.value)}
                                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-800 dark:text-gray-100"
                                            >
                                                {CATEGORIES.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Monto Total</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={pAmount} 
                                                    onChange={e => setPAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                    required
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <button 
                                                    type="submit" 
                                                    className="w-full min-h-[44px] bg-blue-600 text-white p-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20 cursor-pointer flex items-center justify-center"
                                                >
                                                    Guardar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Visual Analytics Overview Card */}
                        <div id="category-expense-dashboard" className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <ChartIcon className="text-blue-600" size={20} />
                                        Análisis de Distribución de Egresos
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Visualice y filtre cómo se distribuyen los costos de su empresa en tiempo real.
                                    </p>
                                </div>
                                
                                {/* Preferences & Customization Controls */}
                                <div className="flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-905 bg-gray-100 dark:bg-gray-900/60 p-2 rounded-xl">
                                    {/* Chart Type Toggle */}
                                    <div className="flex bg-white dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <button 
                                            type="button"
                                            onClick={() => setChartType('pie')}
                                            className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${chartType === 'pie' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                                            title="Gráfico de Torta"
                                        >
                                            <ChartIcon size={13} />
                                            <span>Torta</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setChartType('bar')}
                                            className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${chartType === 'bar' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                                            title="Gráfico de Barras"
                                        >
                                            <BarIcon size={13} />
                                            <span>Barras</span>
                                        </button>
                                    </div>

                                    {/* Color Palettes Selection */}
                                    <div className="flex items-center gap-1.5">
                                        <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">Paleta:</label>
                                        <select 
                                            value={colorPalette}
                                            onChange={(e) => setColorPalette(e.target.value as PaletteKey)}
                                            className="p-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[11px] font-bold outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-gray-200"
                                        >
                                            <option value="modern">Moderna Índigo</option>
                                            <option value="vibrant">Contraste Vívido</option>
                                            <option value="emerald">Bosque Esmeralda</option>
                                        </select>
                                    </div>

                                    {/* Amount threshold Filter */}
                                    <div className="flex items-center gap-1.5 border-l border-gray-205 border-gray-300 dark:border-gray-700 pl-3">
                                        <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">Filtro:</label>
                                        <select 
                                            value={minAmountFilter}
                                            onChange={(e) => setMinAmountFilter(Number(e.target.value))}
                                            className="p-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[11px] font-bold outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-gray-200"
                                        >
                                            <option value={0}>Todos</option>
                                            <option value={500}>&ge; S/ 500</option>
                                            <option value={1000}>&ge; S/ 1000</option>
                                            <option value={3000}>&ge; S/ 3000</option>
                                        </select>
                                    </div>

                                    {/* Month Selector for Monthly Expenses Breakdown */}
                                    <div className="flex items-center gap-1.5 border-l border-gray-300 dark:border-gray-700 pl-3">
                                        <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">Periodo:</label>
                                        <select 
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(e.target.value)}
                                            className="p-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[11px] font-bold outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-gray-200 font-mono"
                                        >
                                            <option value="all">Ver Todos</option>
                                            {availableMonths.map(m => {
                                                const [year, month] = m.split('-');
                                                const d = new Date(parseInt(year), parseInt(month) - 1, 15);
                                                const label = d.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' });
                                                return (
                                                    <option key={m} value={m}>
                                                        {label.charAt(0).toUpperCase() + label.slice(1)}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Chart Dashboard Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                {/* Left column: The Recharts graphic container */}
                                <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100/50 dark:border-gray-700/50 min-h-[290px] relative">
                                    {categoryData.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400 dark:text-gray-500 space-y-2">
                                            <Info size={32} className="mx-auto text-gray-300" />
                                            <p className="text-xs font-bold leading-relaxed">No hay facturas que cumplan con los filtros activos.</p>
                                            <p className="text-[10px]">Ajuste el umbral de monto para visualizar datos.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-full h-[230px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    {chartType === 'pie' ? (
                                                        <PieChart>
                                                            <Pie
                                                                data={categoryData}
                                                                cx="50%"
                                                                cy="45%"
                                                                innerRadius={55}
                                                                outerRadius={80}
                                                                paddingAngle={3}
                                                                dataKey="value"
                                                            >
                                                                {categoryData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip 
                                                                formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Monto Total']}
                                                                contentStyle={{ 
                                                                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                                                    border: 'none', 
                                                                    borderRadius: '8px', 
                                                                    color: '#fff',
                                                                    fontSize: '11px',
                                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)' 
                                                                }}
                                                            />
                                                        </PieChart>
                                                    ) : (
                                                        <BarChart 
                                                            data={categoryData}
                                                            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="opacity-40" />
                                                            <XAxis 
                                                                dataKey="name" 
                                                                tick={{ fill: '#94a3b8', fontSize: 9 }} 
                                                                axisLine={false} 
                                                                tickLine={false}
                                                                tickFormatter={(name) => name.split(' ')[0]} // truncate category long names
                                                            />
                                                            <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                                                            <Tooltip 
                                                                formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Gastado']}
                                                                contentStyle={{ 
                                                                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                                                    border: 'none', 
                                                                    borderRadius: '8px', 
                                                                    color: '#fff',
                                                                    fontSize: '11px' 
                                                                }}
                                                            />
                                                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                                {categoryData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    )}
                                                </ResponsiveContainer>
                                            </div>
                                            
                                            {/* Centered Total Overlay inside the Pie hole */}
                                            {chartType === 'pie' && (
                                                <div className="absolute top-[37%] flex flex-col items-center justify-center text-center select-none pointer-events-none">
                                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-sans">Egresos</span>
                                                    <span className="text-base font-black text-gray-800 dark:text-white leading-tight">
                                                        S/ {totalExpensesSum >= 1000 ? `${(totalExpensesSum / 1000).toFixed(1)}k` : totalExpensesSum.toFixed(0)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-1 text-center font-sans">
                                                * El gráfico se alimenta en tiempo real de su registro contable y RUCs homologados.
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Right column: Category progress bars list & intelligent feedback */}
                                <div className="lg:col-span-7 space-y-4">
                                    <div className="bg-white dark:bg-gray-800 space-y-3.5 pr-2">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Breakdown por Categoría</h4>
                                        <div className="space-y-3 max-h-[190px] overflow-y-auto pr-2 custom-scrollbar">
                                            {categoryData.map((item, index) => {
                                                const pct = totalExpensesSum > 0 ? (item.value / totalExpensesSum) * 100 : 0;
                                                return (
                                                    <div key={index} className="space-y-1">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-200">
                                                                <span className="w-2.5 h-2.5 rounded-full block shrink-0" style={{ backgroundColor: item.color }} />
                                                                <span className="truncate max-w-[200px]">{item.name}</span>
                                                            </div>
                                                            <div className="text-right font-mono flex items-center gap-2">
                                                                <span className="font-extrabold text-gray-900 dark:text-white">{maskCurrency(item.value, `S/ ${item.value.toFixed(2)}`)}</span>
                                                                <span className="text-gray-400 font-medium text-[10.5px]">({pct.toFixed(1)}%)</span>
                                                            </div>
                                                        </div>
                                                        {/* Animated percentage progress rail */}
                                                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full rounded-full transition-all duration-500 ease-out" 
                                                                style={{ width: `${pct}%`, backgroundColor: item.color }} 
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Smart clinical business insight based on percentages */}
                                    {highestExpenseCategory && totalExpensesSum > 0 && (
                                        <div className="p-4 rounded-xl border border-blue-50 bg-blue-50/40 dark:border-blue-900/30 dark:bg-blue-950/20 flex gap-3 items-start select-none">
                                            <Info className="text-blue-600 shrink-0 mt-0.5" size={16} />
                                            <div className="space-y-1">
                                                <h5 className="text-[11px] font-black uppercase text-blue-800 dark:text-blue-400 tracking-wider">
                                                    Veredicto SAMI Shield: Alerta de Costos
                                                </h5>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                                    SAMI ha detectado que la categoría <strong className="text-gray-850 dark:text-white font-bold">"{highestExpenseCategory.name}"</strong> representa el <strong className="text-blue-600 dark:text-blue-400 font-extrabold font-mono">{((highestExpenseCategory.value / totalExpensesSum) * 100).toFixed(1)}%</strong> de sus egresos filtrados totales ({maskCurrency(highestExpenseCategory.value, `S/ ${highestExpenseCategory.value.toFixed(2)}`)}).
                                                </p>
                                                {/* Intelligent Coaching dynamic tips based on specific category */}
                                                <p className="text-[11px] text-blue-700/90 dark:text-blue-400/80 italic font-medium leading-tight pt-1">
                                                    {highestExpenseCategory.name === 'Servicios Públicos' && (
                                                        'Sugerencia Financiera: Al tener alta concentración en servicios públicos, le aconsejamos asociar las alertas de pago en el módulo adyacente para prever flujos de caja y ganar incentivos de pronto pago.'
                                                    )}
                                                    {highestExpenseCategory.name === 'Mercadería y Suministros' && (
                                                        'Sugerencia Financiera: Gran concentración en mercadería. Recomendamos ingresar al Reporte de Optimización para evaluar si califica a un descuento de tasa preferencial por compras recurrentes.'
                                                    )}
                                                    {highestExpenseCategory.name === 'Tecnología y Software' && (
                                                        'Sugerencia Financiera: La tecnología optimiza el trabajo, pero evalúe planes anuales en sus suscripciones SaaS principales para recortar hasta un 20% anual de egreso recurrente.'
                                                    )}
                                                    {highestExpenseCategory.name === 'Otros Gastos' && (
                                                        'Sugerencia Financiera: Al registrar gastos, intente clasificarlos con una categoría específica para que SAMI proporcione mejores sugerencias de optimización comercial.'
                                                    )}
                                                    {!['Servicios Públicos', 'Mercadería y Suministros', 'Tecnología y Software', 'Otros Gastos'].includes(highestExpenseCategory.name) && (
                                                        'Sugerencia Financiera: Mantenga al día sus facturas de esta categoría para mejorar de forma constante su salud tributaria global.'
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-500/5 border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-left border-collapse">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Documento</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">RUC Proveedor</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {purchases.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No hay facturas registradas.</td></tr>
                                        ) : (
                                            purchases.map(p => (
                                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-gray-800 dark:text-gray-200">{p.documentType}</span>
                                                            <span className="text-[10px] font-mono text-gray-400 uppercase leading-none">{p.series}-{p.correlative}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{p.issueDate}</td>
                                                    <td className="px-6 py-4 text-xs font-mono text-gray-600 dark:text-gray-400">{maskRUC(p.ruc)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[11px] px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full font-bold">
                                                            {getPurchaseCategory(p)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm font-black text-gray-900 dark:text-white">{maskCurrency(p.totalAmount, `S/ ${p.totalAmount.toFixed(2)}`)}</span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'vendors' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vendors.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                <Users className="mx-auto text-gray-400 mb-2" size={48} />
                                <p className="text-gray-500">No se han detectado proveedores recurrentes aún.</p>
                                <p className="text-sm text-gray-400">Registre más compras en el Módulo Contable.</p>
                            </div>
                        ) : (
                            vendors.map(vendor => (
                                <div key={vendor.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{vendor.name}</h3>
                                        {vendor.isKeyVendor && (
                                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">Clave</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">RUC: {maskRUC(vendor.ruc)}</p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => { setVendorId(vendor.id); setServiceName(`Pago a ${vendor.name}`); setActiveTab('alerts'); setShowNewAlertForm(true); }}
                                            className="min-h-[44px] px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Bell size={14} />
                                            Programar Alerta
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'alerts' && (
                    <div className="space-y-6">
                        {showNewAlertForm && (
                            <div className="bg-blue-50 dark:bg-gray-800 p-6 rounded-xl border border-blue-100 dark:border-blue-900 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300">Nueva Alerta de Pago</h3>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">Programe recordatorios para evitar moras y mejorar su perfil crediticio.</p>
                                    </div>
                                    <button onClick={() => setShowNewAlertForm(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer">
                                        <Plus className="rotate-45" size={22} />
                                    </button>
                                </div>
                                <form onSubmit={handleAddAlertSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="lg:col-span-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Proveedor Relacionado</label>
                                            <select 
                                                value={vendorId} 
                                                onChange={e => {
                                                    const v = vendors.find(vend => vend.id === e.target.value);
                                                    setVendorId(e.target.value);
                                                    if (v) setServiceName(`Pago a ${v.name}`);
                                                }}
                                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                required
                                            >
                                                <option value="">Seleccione un proveedor...</option>
                                                {vendors.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name} ({maskRUC(v.ruc)})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Nombre del Servicio</label>
                                            <input 
                                                type="text" 
                                                value={serviceName} 
                                                onChange={e => setServiceName(e.target.value)}
                                                placeholder="Ej: Luz, Internet, Local"
                                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Fecha de Vencimiento</label>
                                            <input 
                                                type="date" 
                                                value={dueDate} 
                                                onChange={e => setDueDate(e.target.value)}
                                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Monto Est.</label>
                                                <input 
                                                    type="number" 
                                                    value={amount} 
                                                    onChange={e => setAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider">Frecuencia</label>
                                                <select 
                                                    value={frequency} 
                                                    onChange={e => setFrequency(e.target.value as any)}
                                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                >
                                                    <option value="once">Una vez</option>
                                                    <option value="monthly">Mensual</option>
                                                    <option value="quarterly">Trimestral</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {selectedVendor && (
                                        <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/30">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600">
                                                <Users size={16} />
                                            </div>
                                            <div className="flex-grow">
                                                <p className="text-[10px] font-black uppercase text-blue-500">Proveedor Seleccionado</p>
                                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{selectedVendor.name} - RUC {maskRUC(selectedVendor.ruc)}</p>
                                            </div>
                                            {selectedVendor.isKeyVendor && (
                                                <span className="text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase">Proveedor Clave</span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button type="button" onClick={() => setShowNewAlertForm(false)} className="min-h-[44px] px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-widest cursor-pointer">Descartar</button>
                                        <button type="submit" className="min-h-[44px] bg-blue-600 shadow-lg shadow-blue-500/30 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 cursor-pointer">Programar Alerta</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-left border-collapse">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Servicio</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Vencimiento</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Monto</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Estado</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {alerts.length === 0 ? (
                                             <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No hay alertas programadas.</td></tr>
                                        ) : (
                                            alerts.map(alert => (
                                                <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{alert.serviceName}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{alert.dueDate}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-white">{maskCurrency(alert.amount, `S/ ${alert.amount.toFixed(2)}`)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                            alert.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                                            alert.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {alert.status === 'pending' ? 'Pendiente' : alert.status === 'paid' ? 'Pagado' : 'Vencido'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {alert.status === 'pending' && (
                                                            <button 
                                                                onClick={() => {
                                                                    onUpdateAlert(alert.id, 'paid');
                                                                    if (currentUser) {
                                                                        logAdminAction(currentUser, `Pago de alerta marcado como completado: ${alert.serviceName} por S/ ${alert.amount.toFixed(2)}`);
                                                                    }
                                                                }}
                                                                className="min-h-[44px] px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ml-auto cursor-pointer"
                                                            >
                                                                <CheckCircle size={15} />
                                                                Marcar como pagado
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'optimization' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-indigo-900/50 p-8 rounded-2xl text-white shadow-xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">Reporte de Optimización de Costos</h2>
                                    <p className="opacity-90">Hemos analizado sus gastos recurrentes para encontrar oportunidades de ahorro.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm opacity-80 uppercase font-bold tracking-wider">Ahorro Potencial Total</p>
                                    <p className="text-4xl font-black">{maskCurrency(optimizationReport.totalPotentialSavings, `S/ ${optimizationReport.totalPotentialSavings.toFixed(2)}`)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Oportunidades Detectadas</h3>
                                {optimizationReport.items.length === 0 ? (
                                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl text-center border border-gray-100 dark:border-gray-700">
                                        <p className="text-gray-500">No se han detectado oportunidades de ahorro significativas aún.</p>
                                    </div>
                                ) : (
                                    optimizationReport.items.map((item, idx) => (
                                        <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-l-green-500 border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-800 dark:text-white">{item.vendorName}</h4>
                                                <span className="text-green-600 font-bold text-sm">-{ (item.suggestedDiscount * 100).toFixed(0) }%</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{item.reason}</p>
                                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                                <div className="text-xs">
                                                    <p className="text-gray-500">Gasto Promedio {item.frequency}</p>
                                                    <p className="font-bold text-gray-800 dark:text-white">{maskCurrency(item.recurringAmount, `S/ ${item.recurringAmount.toFixed(2)}`)}</p>
                                                </div>
                                                <div className="text-right text-xs">
                                                    <p className="text-gray-500">Ahorro Estimado</p>
                                                    <p className="font-bold text-green-600">{maskCurrency(item.potentialSavings, `S/ ${item.potentialSavings.toFixed(2)}`)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <AlertCircle size={18} className="text-blue-500" />
                                        Estado de Flujo de Caja
                                    </h3>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex-grow h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-[85%]"></div>
                                        </div>
                                        <span className="text-sm font-bold text-green-600">Saludable</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Su flujo de caja permite aprovechar descuentos por pronto pago. Recomendamos negociar con sus proveedores clave.
                                    </p>
                                </div>

                                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2">Tip de SAMI</h3>
                                    <p className="text-sm text-indigo-800 dark:text-indigo-400">
                                        "Pagar 5 días antes a sus proveedores recurrentes puede abrir puertas a mejores líneas de crédito y descuentos de hasta el 3% anual."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ExpenseModule;
