import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
    ArrowDownUp, 
    RefreshCw, 
    Landmark, 
    ShieldCheck, 
    CheckCircle2, 
    ChevronRight, 
    HelpCircle, 
    TrendingUp, 
    Sparkles, 
    DollarSign, 
    ArrowRight, 
    Download, 
    FileText, 
    AlertCircle, 
    Clock, 
    Check, 
    Building2,
    Users,
    ChevronDown,
    Lock,
    Trophy,
    Coins
} from 'lucide-react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';
import { showLocalPushNotification } from '../services/pushNotificationService';

interface ExchangeModuleProps {
    samiCoins: number;
    earnCoins: (amount: number, description: string) => void;
    onDeductCoins?: (amount: number, description: string) => void;
    onAddPurchase?: (invoice: any) => void;
    onAddSale?: (invoice: any) => void;
}

interface FxOrder {
    id: string;
    timestamp: string;
    sendCurrency: 'USD' | 'PEN';
    receiveCurrency: 'USD' | 'PEN';
    sendAmount: number;
    receiveAmount: number;
    rate: number;
    status: 'completed' | 'pending_verification' | 'cancelled';
    bankFrom: string;
    bankTo: string;
    operationNumber: string;
}

const HISTORICAL_FX_DATA = [
    { day: '15 May', rate: 3.722 },
    { day: '17 May', rate: 3.731 },
    { day: '19 May', rate: 3.715 },
    { day: '21 May', rate: 3.744 },
    { day: '23 May', rate: 3.739 },
    { day: '25 May', rate: 3.742 },
    { day: '27 May', rate: 3.745 },
];

const ExchangeModule: React.FC<ExchangeModuleProps> = ({ 
    samiCoins, 
    earnCoins, 
    onDeductCoins,
    onAddPurchase,
    onAddSale
}) => {
    // Basic conversion state
    const [sendAmount, setSendAmount] = useState<string>('1000');
    const [sendCurrency, setSendCurrency] = useState<'USD' | 'PEN'>('USD');
    const [receiveCurrency, setReceiveCurrency] = useState<'USD' | 'PEN'>('PEN');
    
    // SUNAT & SAMI FX Rates
    const baseSunatBuy = 3.731;
    const baseSunatSell = 3.749;
    const baseSamiBuy = 3.736;
    const baseSamiSell = 3.743;

    // Has improved rate button been clicked (gamification coupon active)?
    const [isRateImproved, setIsRateImproved] = useState<boolean>(false);
    
    // Computed rates based on toggle selection and coupon
    const currentRates = useMemo(() => {
        let buy = baseSamiBuy;
        let sell = baseSamiSell;
        if (isRateImproved) {
            buy += 0.005; // Better rate for selling USD (receiving PEN)
            sell -= 0.005; // Better rate for buying USD (spending PEN)
        }
        return { buy, sell };
    }, [isRateImproved]);

    const activeRate = useMemo(() => {
        return sendCurrency === 'USD' ? currentRates.buy : (1 / currentRates.sell);
    }, [sendCurrency, currentRates]);

    const activeDisplayRate = useMemo(() => {
        return sendCurrency === 'USD' ? currentRates.buy : currentRates.sell;
    }, [sendCurrency, currentRates]);

    const receiveAmount = useMemo(() => {
        const amt = parseFloat(sendAmount) || 0;
        if (sendCurrency === 'USD') {
            return parseFloat((amt * currentRates.buy).toFixed(2));
        } else {
            return parseFloat((amt / currentRates.sell).toFixed(2));
        }
    }, [sendAmount, sendCurrency, currentRates]);

    const estimatedSavings = useMemo(() => {
        const amt = parseFloat(sendAmount) || 0;
        if (sendCurrency === 'USD') {
            const defaultBankBuy = 3.690; // Typical retail bank rate is worse
            const bankRec = amt * defaultBankBuy;
            const samiRec = amt * currentRates.buy;
            return Math.max(0, parseFloat((samiRec - bankRec).toFixed(2)));
        } else {
            const defaultBankSell = 3.795; // Retail bank sell rate is worse
            const bankSpend = amt / defaultBankSell;
            const samiSpend = amt / currentRates.sell;
            // Diff in PEN savings
            return Math.max(0, parseFloat(((bankSpend - samiSpend) * currentRates.sell).toFixed(2)));
        }
    }, [sendAmount, sendCurrency, currentRates]);

    // Transaction/Order Form Flow State
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [bankFrom, setBankFrom] = useState<string>('BCP');
    const [bankTo, setBankTo] = useState<string>('BCP');
    const [operationNumber, setOperationNumber] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [voucherUploaded, setVoucherUploaded] = useState<boolean>(false);
    const [voucherLoading, setVoucherLoading] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // List of existing simulated transactions
    const [orders, setOrders] = useState<FxOrder[]>([
        {
            id: 'FX-0891',
            timestamp: '2026-05-25T14:20:00Z',
            sendCurrency: 'USD',
            receiveCurrency: 'PEN',
            sendAmount: 1500,
            receiveAmount: 5604,
            rate: 3.736,
            status: 'completed',
            bankFrom: 'BCP',
            bankTo: 'Interbank',
            operationNumber: 'OP-82910'
        },
        {
            id: 'FX-0872',
            timestamp: '2026-05-20T10:15:00Z',
            sendCurrency: 'PEN',
            receiveCurrency: 'USD',
            sendAmount: 3743,
            receiveAmount: 1000,
            rate: 3.743,
            status: 'completed',
            bankFrom: 'BBVA',
            bankTo: 'BBVA',
            operationNumber: 'OP-91024'
        }
    ]);

    const handleSwapCurrencies = () => {
        setSendCurrency(prev => {
            const next = prev === 'USD' ? 'PEN' : 'USD';
            setReceiveCurrency(prev);
            return next;
        });
    };

    const handleImproveRate = () => {
        if (samiCoins < 15) {
            showLocalPushNotification('🟡 Coins Insuficientes', 'Necesitas al menos 15 SAMI Coins para desbloquear esta tarifa preferente.');
            return;
        }

        if (onDeductCoins) {
            onDeductCoins(15, 'Cupón de Cambio de Divisas Preferente (+0.005 / -0.005)');
            setIsRateImproved(true);
            try {
                showLocalPushNotification(
                    '🎉 ¡SAMI Coins Canjeados!',
                    'Has activado el cupón de tipo de cambio preferente para esta operación.'
                );
            } catch {}
        }
    };

    const handleMockVoucherUpload = () => {
        setVoucherLoading(true);
        setTimeout(() => {
            setVoucherUploaded(true);
            setVoucherLoading(false);
            try {
                showLocalPushNotification(
                    '📎 Comprobante Cargado',
                    'El comprobante de transferencia bancaria fue escaneado con éxito'
                );
            } catch {}
        }, 1200);
    };

    const handleSubmitOrder = () => {
        if (!operationNumber.trim()) {
            showLocalPushNotification('⚠️ Entrada Faltante', 'Por favor ingresa el número de operación bancaria.');
            return;
        }

        setIsSubmitting(true);
        
        setTimeout(() => {
            const newOrder: FxOrder = {
                id: `FX-${Math.floor(1000 + Math.random() * 9000)}`,
                timestamp: new Date().toISOString(),
                sendCurrency,
                receiveCurrency,
                sendAmount: parseFloat(sendAmount),
                receiveAmount,
                rate: activeDisplayRate,
                status: 'pending_verification',
                bankFrom,
                bankTo,
                operationNumber
            };

            setOrders(prev => [newOrder, ...prev]);
            setIsSubmitting(false);
            setStep(3); // Go to success page

            // Earn SAMI Coins for completing FX operations (encouraging growth of gamified economy)
            earnCoins(25, `Operación cambiaria exitosa en SAMI FX: ${newOrder.id}`);

            // Integrate into accounting - since we exchanged money, register is created automatically
            if (onAddPurchase && sendCurrency === 'PEN') {
                // Bought dollars (PEN expense)
                onAddPurchase({
                    ruc: '20601234567',
                    entityName: 'SAMI FX SAC',
                    documentType: 'FACTURA',
                    invoiceNumber: `F001-${Math.floor(100000 + Math.random() * 900000)}`,
                    issueDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date().toISOString().split('T')[0],
                    totalAmount: parseFloat(sendAmount),
                    category: 'Financiero',
                    isPaid: true
                });
            } else if (onAddSale && sendCurrency === 'USD') {
                // Sold dollars (PEN sales revenue received)
                onAddSale({
                    ruc: '20601234567',
                    entityName: 'SAMI FX SAC',
                    documentType: 'FACTURA',
                    invoiceNumber: `F001-${Math.floor(100000 + Math.random() * 900000)}`,
                    issueDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date().toISOString().split('T')[0],
                    totalAmount: receiveAmount,
                    category: 'Financiero',
                    isPaid: true
                });
            }

            try {
                showLocalPushNotification(
                    '⚡ SAMI FX Operación en Curso',
                    `Su orden de cambio de divisa ${newOrder.id} está siendo procesada de forma segura.`
                );
            } catch {}
        }, 1500);
    };

    const handleDownloadFxPdf = (order: FxOrder) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a5'
        });

        const primaryColor = [79, 70, 229]; // Indigo
        const darkColor = [31, 41, 55]; // Gray-800
        const successColor = [16, 185, 129]; // Emerald-500

        doc.setFont("Helvetica", "bold");

        // Top Header Accent
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 148, 12, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("SAMI FX • COMPROBANTE DE OPERACIÓN CAMBIARIA", 10, 8);

        // Content
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFontSize(14);
        doc.text("Resumen de Operación", 10, 24);
        doc.line(10, 26, 138, 26);

        doc.setFontSize(8.5);
        doc.text("Código de Transacción:", 10, 32);
        doc.setFont("Helvetica", "normal");
        doc.text(order.id, 45, 32);

        doc.setFont("Helvetica", "bold");
        doc.text("Fecha y Hora:", 10, 38);
        doc.setFont("Helvetica", "normal");
        doc.text(new Date(order.timestamp).toLocaleString('es-PE'), 45, 38);

        doc.setFont("Helvetica", "bold");
        doc.text("Estado de Orden:", 10, 44);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(successColor[0], successColor[1], successColor[2]);
        doc.text(order.status === 'completed' ? "LIQUIDADO" : "EN VERIFICACIÓN", 45, 44);

        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFont("Helvetica", "bold");
        doc.text("Banco de Envío:", 10, 50);
        doc.setFont("Helvetica", "normal");
        doc.text(order.bankFrom, 45, 50);

        doc.setFont("Helvetica", "bold");
        doc.text("Banco de Destino:", 10, 56);
        doc.setFont("Helvetica", "normal");
        doc.text(order.bankTo, 45, 56);

        doc.setFont("Helvetica", "bold");
        doc.text("Nro. Operación:", 10, 62);
        doc.setFont("Helvetica", "normal");
        doc.text(order.operationNumber, 45, 62);

        // Transaction Box
        doc.setFillColor(243, 244, 246);
        doc.rect(10, 70, 128, 24, "F");

        doc.setFontSize(8);
        doc.setFont("Helvetica", "bold");
        doc.text("DETALLE CAMBIARIO", 14, 76);

        doc.text("MYPE ENVÍA", 14, 82);
        doc.text("MYPE RECIBE", 60, 82);
        doc.text("TIPO DE CAMBIO", 100, 82);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`${order.sendCurrency === 'USD' ? 'US$' : 'S/'} ${order.sendAmount.toLocaleString()}`, 14, 88);
        doc.text(`${order.receiveCurrency === 'USD' ? 'US$' : 'S/'} ${order.receiveAmount.toLocaleString()}`, 60, 88);
        doc.text(order.rate.toFixed(3), 100, 88);

        // Footer Security Notice
        doc.setFontSize(6.5);
        doc.setTextColor(107, 114, 128); // Gray 500
        doc.text("Esta transacción se rige según el Convenio de Licencia Cambiaria SAMI-SBS Ley N° 29733.", 10, 105);
        doc.text("La conformidad del abono definitivo en su cuenta de destino queda sujeta a la compensación del CCI.", 10, 109);

        doc.save(`Comprobante_SAMI_FX_${order.id}.pdf`);
    };

    return (
        <div id="exchange-module-root" className="container mx-auto p-6 md:p-10 max-w-7xl space-y-10 animate-fade-up">
            {/* Header section mimicking premium Peruvian Fintech (clean, high contrast) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={10} className="text-indigo-500 animate-pulse" />
                            SAMI FX PLATFORM
                        </span>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        <ArrowDownUp className="text-indigo-600 dark:text-indigo-400" size={28} />
                        Módulo Cambiario Inteligente
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl font-medium">
                        Cambia tus soles y dólares con el mejor tipo de cambio del mercado peruano, conecta tus cuentas SUNAT y optimiza flujos de caja reduciendo la brecha cambiaria.
                    </p>
                </div>
                
                {/* Sami Coins Balance Indicator */}
                <div className="flex items-center gap-3 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/40 dark:to-amber-900/20 p-4 rounded-3xl border border-amber-200/50">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <Coins size={20} className="text-amber-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-amber-800/80 dark:text-amber-400 uppercase tracking-widest leading-none">Tus SAMI Coins</p>
                        <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1 leading-none">{samiCoins} Coins</p>
                    </div>
                </div>
            </div>

            {/* Split Grid for Converter and Charts */}
            <div className="grid lg:grid-cols-12 gap-8 items-start">
                
                {/* FX Currency Converter Interactive Form (8 Columns) */}
                <div className="lg:col-span-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-4xl shadow-sm space-y-6">
                    
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                            <span className="text-xs font-bold text-gray-400 uppercase">Cotización en Tiempo Real</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                            <span>S/ Compra: <strong className="text-gray-900 dark:text-white">{currentRates.buy.toFixed(3)}</strong></span>
                            <span>S/ Venta: <strong className="text-gray-900 dark:text-white">{currentRates.sell.toFixed(3)}</strong></span>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step-1"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-6"
                            >
                                {/* Input/Output Converter */}
                                <div className="space-y-4 relative">
                                    {/* Send Currency Card */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-3xl border border-gray-100 dark:border-gray-850 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tú Envías</label>
                                            <input 
                                                type="number" 
                                                value={sendAmount} 
                                                onChange={(e) => setSendAmount(e.target.value)}
                                                className="bg-transparent border-none text-2xl font-black focus:outline-none text-gray-900 dark:text-white h-10 w-full"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-2 rounded-2xl flex items-center gap-2 min-w-[102px]">
                                            <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-slate-900 border border-indigo-150 dark:border-slate-800 flex items-center justify-center select-none shrink-0">
                                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                                    {sendCurrency === 'USD' ? '$' : 'S/'}
                                                </span>
                                            </div>
                                            <span className="font-extrabold text-sm">{sendCurrency}</span>
                                        </div>
                                    </div>

                                    {/* Swap Floating Button */}
                                    <div className="absolute left-1/2 -translate-x-1/2 top-[44%] -translate-y-1/2 z-10">
                                        <button 
                                            onClick={handleSwapCurrencies}
                                            className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-900 cursor-pointer transition-transform duration-300 hover:rotate-180"
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                    </div>

                                    {/* Receive Currency Card */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-3xl border border-gray-100 dark:border-gray-850 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tú Recibes</label>
                                            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 h-10 flex items-center">
                                                {receiveAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-2 rounded-2xl flex items-center gap-2 min-w-[102px]">
                                            <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-slate-900 border border-emerald-150 dark:border-slate-800 flex items-center justify-center select-none shrink-0">
                                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                                    {receiveCurrency === 'USD' ? '$' : 'S/'}
                                                </span>
                                            </div>
                                            <span className="font-extrabold text-sm">{receiveCurrency}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* SUNAT Comparative Widget */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/30 p-4 rounded-3xl space-y-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                            <Sparkles size={11} /> Tipo de Cambio SAMI FX
                                        </div>
                                        <p className="text-2xl font-black text-indigo-950 dark:text-indigo-50">{activeDisplayRate.toFixed(3)}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">Frente a SUNAT ({sendCurrency === 'USD' ? baseSunatBuy : baseSunatSell})</p>
                                    </div>
                                    
                                    <div className="bg-emerald-50/50 dark:bg-emerald-950/25 border border-emerald-100/35 p-4 rounded-3xl space-y-1 flex flex-col justify-center">
                                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Ahorro Estimado vs Bancos</div>
                                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                                            S/ {estimatedSavings.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-semibold">¡Ahorras más con SAMI FX!</p>
                                    </div>
                                </div>

                                {/* Loyaty Gamification Coupon Box */}
                                {!isRateImproved ? (
                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/50 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase flex items-center gap-1.5">
                                                <Trophy size={14} className="text-amber-500 animate-bounce" />
                                                ¿Quieres un tipo de cambio ultra preferencial?
                                            </p>
                                            <p className="text-xs text-amber-700/80 dark:text-amber-500 font-medium">
                                                Canjea <strong>15 SAMI Coins</strong> para sumar <strong className="text-amber-800 dark:text-amber-400 font-bold">+S/ 0.005</strong> de beneficio inmediato.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleImproveRate}
                                            disabled={samiCoins < 15}
                                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-amber-300 disabled:to-amber-400 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/10 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                                        >
                                            Canjear Cupón (15 Coins)
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 p-4 rounded-3xl flex items-center gap-3">
                                        <CheckCircle2 className="text-emerald-500 flex-shrink-0 animate-pulse" size={22} />
                                        <div>
                                            <p className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase">Tarifa Preferencial Canjeada</p>
                                            <p className="text-2xs text-emerald-700 dark:text-emerald-500 font-medium mt-0.5">
                                                Tu tipo de cambio ha sido mejorado en S/ 0.005 de forma exclusiva. ¡Aprovecha la tasa!
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Proceed button to step 2 selection */}
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={parseFloat(sendAmount) <= 0 || !sendAmount}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-3 w-full text-white rounded-3xl text-sm font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-indigo-600/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Iniciar Cambio de Divisa <ArrowRight size={16} />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step-2"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 uppercase">
                                        <Landmark size={14} /> Paso 2: Datos del Abono Bancario
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Transfiere de forma segura el monto a nuestras cuentas corrientes indicadas y registra el número de operación para liquidar tus dólares o soles.
                                    </p>
                                </div>

                                {/* Bank choice selectors */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Banco Origen (Tú envías)</label>
                                        <select 
                                            value={bankFrom}
                                            onChange={(e) => setBankFrom(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl text-xs font-bold focus:outline-none text-gray-900 dark:text-white"
                                        >
                                            <option value="BCP">BCP (Transferencia Inmediata)</option>
                                            <option value="BBVA">BBVA (Transferencia Inmediata)</option>
                                            <option value="Interbank">Interbank (Transferencia Inmediata)</option>
                                            <option value="Banco de la Nación">Banco de la Nación (Interbancario - 12h)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Banco Destino (Recibes en)</label>
                                        <select 
                                            value={bankTo}
                                            onChange={(e) => setBankTo(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl text-xs font-bold focus:outline-none text-gray-900 dark:text-white"
                                        >
                                            <option value="BCP">BCP Corriente Soles/Dólares</option>
                                            <option value="BBVA">BBVA Corriente Soles/Dólares</option>
                                            <option value="Interbank">Interbank Corriente Soles/Dólares</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Transfer Instructions Box */}
                                <div className="bg-gray-50 dark:bg-gray-850 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3">
                                    <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Instrucciones de Transferencia</h5>
                                    
                                    <div className="space-y-2 text-xs font-medium">
                                        <p className="text-gray-600 dark:text-gray-300">
                                            1. Desde tu banca móvil, realiza una transferencia por <strong className="text-gray-900 dark:text-white">{sendCurrency === 'USD' ? 'US$' : 'S/'} {parseFloat(sendAmount).toLocaleString()}</strong> a la cuenta indicada a nombre de <strong>SAMI S.A.C.</strong>:
                                        </p>
                                        <div className="bg-white dark:bg-gray-900 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1.5 font-mono">
                                            <div className="flex justify-between text-2xs text-gray-400">
                                                <span>Banco:</span>
                                                <strong className="text-gray-800 dark:text-gray-200">{bankFrom}</strong>
                                            </div>
                                            <div className="flex justify-between text-2xs text-gray-400">
                                                <span>Cuenta Corriente {sendCurrency}:</span>
                                                <strong className="text-gray-800 dark:text-gray-200">191-28394859-0-82</strong>
                                            </div>
                                            <div className="flex justify-between text-2xs text-gray-400">
                                                <span>CCI Interbancario:</span>
                                                <strong className="text-indigo-600 dark:text-indigo-400 select-all">002-191-0028394859082-51</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Upload Voucher and Operation Input Block */}
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Nro. de Operación o Transferencia Bancaria</label>
                                        <input 
                                            type="text"
                                            value={operationNumber}
                                            onChange={(e) => setOperationNumber(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                                            placeholder="Ej. OP-9018481 / 182942"
                                        />
                                    </div>

                                    {/* Simulated Certificate/Voucher File uploader */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Adjuntar Voucher de Operación (Opcional)</label>
                                        <div 
                                            onClick={handleMockVoucherUpload}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleMockVoucherUpload(); }}
                                            className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${isDragging ? 'border-indigo-600 bg-indigo-50/20 dark:border-indigo-400 dark:bg-indigo-950/10 scale-[1.01]' : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/10 hover:border-indigo-500'}`}
                                        >
                                            {voucherLoading ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <RefreshCw className="animate-spin text-indigo-600" size={24} />
                                                    <span className="text-2xs font-extrabold text-gray-400 uppercase">Escaneando firma digital y OCR...</span>
                                                </div>
                                            ) : voucherUploaded ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <CheckCircle2 className="text-emerald-500" size={24} />
                                                    <span className="text-2xs font-black text-emerald-600 uppercase">Voucher de Pago Cargado Exitosamente</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <FileText className="text-gray-400" size={24} />
                                                    <p className="text-[11px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-tight">Selecciona o suelta tu comprobante de pago</p>
                                                    <p className="text-[9px] text-gray-400">PDF, JPG o PNG hasta 10MB • Escaneo de OCR automático</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Form actions */}
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-white rounded-2xl text-xs font-extrabold uppercase transition-all text-center cursor-pointer"
                                    >
                                        Regresar
                                    </button>
                                    <button
                                        onClick={handleSubmitOrder}
                                        disabled={isSubmitting || !operationNumber.trim()}
                                        className="py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold uppercase disabled:bg-indigo-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={14} />
                                                Registrando...
                                            </>
                                        ) : (
                                            'Validar y Registrar'
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step-3"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center p-8 space-y-6"
                            >
                                <div className="w-16 h-16 rounded-full bg-emerald-550/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-450 dark:border-emerald-900/50 animate-pulse shadow-lg shadow-emerald-500/5">
                                    <Check className="stroke-[3]" size={36} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-2xl font-black text-gray-900 dark:text-white">¡Operación Registrada con Éxito!</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                                        Nuestros asesores financieros están validando tu transferencia bancaria. Recibirás tu abono de <strong className="text-indigo-600 dark:text-indigo-400">{receiveCurrency === 'USD' ? 'US$' : 'S/'} {receiveAmount.toLocaleString()}</strong> en un plazo máximo de 15 minutos.
                                    </p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl max-w-sm mx-auto border border-gray-100 dark:border-gray-700 space-y-2 text-left">
                                    <div className="flex justify-between text-2xs text-gray-500">
                                        <span>ID Operación:</span>
                                        <span className="font-extrabold text-gray-900 dark:text-white">FX-{Math.floor(5000 + Math.random() * 4999)}</span>
                                    </div>
                                    <div className="flex justify-between text-2xs text-gray-500">
                                        <span>Tipo de Cambio:</span>
                                        <span className="font-extrabold text-gray-900 dark:text-white">{activeDisplayRate.toFixed(3)}</span>
                                    </div>
                                    <div className="flex justify-between text-2xs text-gray-500">
                                        <span>Compensación:</span>
                                        <span className="font-extrabold text-gray-900 dark:text-white">Abono directo en {bankTo}</span>
                                    </div>
                                </div>

                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={() => {
                                            setStep(1);
                                            setOperationNumber('');
                                            setVoucherUploaded(false);
                                            setIsRateImproved(false);
                                        }}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold uppercase transition-all tracking-wider shadow-md shadow-indigo-600/10 cursor-pointer"
                                    >
                                        Nueva Operación
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Side Panel: Historical Line Chart + Active Guard SPLAFT Checks (5 Columns) */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* Recharts FX Trend Chart */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-4xl shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                                    <TrendingUp className="text-indigo-600" size={16} />
                                    Gráfico de Tendencia USD/PEN
                                </h3>
                                <p className="text-[10px] text-gray-400">Fluctuación última semana SUNAT</p>
                            </div>
                            <span className="text-[10px] bg-red-50 dark:bg-red-950/20 text-red-650 border border-red-200/50 px-2 py-0.5 rounded-full font-bold uppercase">
                                Al alza +0.2%
                            </span>
                        </div>

                        <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={HISTORICAL_FX_DATA}>
                                    <defs>
                                        <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} />
                                    <YAxis domain={['dataMin - 0.01', 'dataMax + 0.01']} stroke="#94a3b8" fontSize={9} tickLine={false} />
                                    <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '12px' }} />
                                    <Area type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRate)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Rextie / Kambista Comparative Pitch Info Card */}
                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-6 rounded-4xl space-y-4 shadow-xl border border-indigo-950 uppercase relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10">
                            <Landmark size={200} />
                        </div>
                        <div className="space-y-1 relative z-10">
                            <p className="text-[9px] font-black text-indigo-400 tracking-widest uppercase">Protección Financiera</p>
                            <h4 className="text-base font-black text-white leading-tight">Garantía SBS en todo el Perú</h4>
                        </div>
                        <p className="text-[11px] text-indigo-200 leading-relaxed font-semibold normal-case">
                            SAMI FX está formalmente registrado ante la Unidad de Inteligencia Financiera (UIF) de la SBS. Tu dinero está blindado mediante fideicomisos bancarios segregados de acuerdo con la regulación mercantil peruana.
                        </p>
                        
                        <div className="h-px bg-indigo-800/85 my-2" />

                        <div className="flex items-center gap-4 text-xs font-bold relative z-10">
                            <div className="flex items-center gap-1">
                                <Lock size={12} className="text-emerald-400" /> AES-256 bits
                            </div>
                            <div className="flex items-center gap-1">
                                <ShieldCheck size={12} className="text-emerald-400" /> UIF Directo
                            </div>
                        </div>
                    </div>

                    {/* Historical Exchange Operations Table */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-4xl shadow-sm space-y-4">
                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                            <Clock size={16} className="text-gray-400" />
                            Historial de Operaciones Cambiarias
                        </h4>
                        
                        <div className="space-y-3">
                            {orders.map((o) => (
                                <div key={o.id} className="bg-gray-50 dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-gray-900 dark:text-white">{o.id}</span>
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                o.status === 'completed' 
                                                    ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-450' 
                                                    : 'bg-amber-100/50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-450'
                                            }`}>
                                                {o.status === 'completed' ? 'Liquidado' : 'Espera'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-semibold">{new Date(o.timestamp).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} • T.C. {o.rate.toFixed(3)}</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-xs font-black text-gray-800 dark:text-gray-100">
                                            {o.sendCurrency === 'USD' ? 'US$' : 'S/'} {o.sendAmount.toLocaleString()} →
                                        </p>
                                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                            {o.receiveCurrency === 'USD' ? 'US$' : 'S/'} {o.receiveAmount.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-white dark:bg-gray-950/30 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <button 
                                            onClick={() => handleDownloadFxPdf(o)}
                                            className="text-gray-400 hover:text-indigo-600 p-1 rounded transition-colors cursor-pointer"
                                            title="Descargar Comprobante PDF"
                                        >
                                            <Download size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default ExchangeModule;
