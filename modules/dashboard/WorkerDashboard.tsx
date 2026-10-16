import React, { useState, useEffect } from 'react';
import { 
    Barcode, 
    Plus, 
    Minus, 
    FileText, 
    Package, 
    ShoppingCart,
    Search,
    RefreshCw,
    X,
    Check,
    Camera,
    Sparkles,
    Trash2,
    AlertCircle,
    ArrowRight,
    QrCode,
    Download,
    Clock,
    Calendar,
    MapPin,
    AlertTriangle,
    BookOpen,
    UserCheck,
    Smile
} from 'lucide-react';
import { Product, DocumentType, InvoiceType, Task, Invoice } from '../../types';
import { getInventory, updateStock } from '../../services/inventoryService';
import { getNextCorrelative } from '../../core/services/accountingService';
import { motion, AnimatePresence } from 'motion/react';

const playBeep = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 high beep
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
        console.warn('Audio Context error:', e);
    }
};

const playOcrSuccess = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        
        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.25);
        osc2.stop(ctx.currentTime + 0.25);
    } catch (e) {}
};

interface WorkerDashboardProps {
    tasks?: Task[];
    onQuickSaleClick?: () => void;
    onAddInvoice?: (invoice: Omit<Invoice, 'id'>) => void;
    sales?: Invoice[];
}

const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ 
    tasks = [], 
    onQuickSaleClick,
    onAddInvoice,
    sales = []
}) => {
    const overdueTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < new Date()).length;
    const pendingTasks = tasks.filter(t => t.status !== 'completed').length;

    const [inventory, setInventory] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'Todos' | 'Telas' | 'Insumos'>('Todos');
    const [isUpdating, setIsUpdating] = useState(false);
    
    // POS Cart State
    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [posDocType, setPosDocType] = useState<DocumentType>(DocumentType.BOLETA);
    const [posClientRuc, setPosClientRuc] = useState('');
    const [posClientName, setPosClientName] = useState('');
    const [isSearchingClient, setIsSearchingClient] = useState(false);
    
    // Modals
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isOcrOpen, setIsOcrOpen] = useState(false);
    const [isScanningStatus, setIsScanningStatus] = useState(false);
    const [scannedProductAlert, setScannedProductAlert] = useState<string | null>(null);
    
    // OCR Simulation State
    const [selectedMockFile, setSelectedMockFile] = useState<string | null>(null);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrStep, setOcrStep] = useState('');
    const [dropNotice, setDropNotice] = useState<string | null>(null);
    const [extractedInvoice, setExtractedInvoice] = useState<{
        supplierName: string;
        supplierRuc: string;
        series: string;
        correlative: number;
        totalAmount: number;
        items: { name: string; qty: number; targetProductId: string }[];
    } | null>(null);
    
    // Receipt overlay target
    const [printedReceipt, setPrintedReceipt] = useState<Invoice & { clientName?: string; items: { name: string; qty: number; price: number }[] } | null>(null);

    // View Tab choice in left column
    const [activeTab, setActiveTab] = useState<'inventory' | 'attendance'>('inventory');

    // Attendance & Shift Log state
    const [currentTime, setCurrentTime] = useState('');
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
    const [shifts, setShifts] = useState<any[]>([
        { id: 's1', date: '28 de Mayo, 2026', checkIn: '08:30', checkOut: '17:45', hours: '9.2 hrs', status: 'Terminado', location: 'Cercado de Lima' },
        { id: 's2', date: '27 de Mayo, 2026', checkIn: '08:24', checkOut: '17:35', hours: '9.1 hrs', status: 'Terminado', location: 'Cercado de Lima' }
    ]);

    // Incidents Book state (Cuaderno de Novedades)
    const [incidents, setIncidents] = useState<any[]>([
        { id: 'i1', date: '29 de Mayo, 2026', time: '09:15 AM', text: 'Se recibió lote de hilos industriales blancos de proveedor Disprotextil.', category: 'Suministros' },
        { id: 'i2', date: '28 de Mayo, 2026', time: '02:30 PM', text: 'Se realizó limpieza preventiva de la mesa de costura Overlock #1.', category: 'Mantenimiento' }
    ]);
    const [newIncidentText, setNewIncidentText] = useState('');
    const [selectedIncidentCat, setSelectedIncidentCat] = useState('General');

    // Run dynamic digital clock timer
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateTime();
        const intervalId = setInterval(updateTime, 1000);
        return () => clearInterval(intervalId);
    }, []);

    const checkAndDispatchLowStockTask = (product: Product) => {
        if (product.stock < 15) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const formattedDate = tomorrow.toISOString().split('T')[0];
            
            // Dispatch dynamic alert to owner's task queue
            window.dispatchEvent(new CustomEvent('sami:add-task', {
                detail: {
                    title: `Reponer stock: ${product.name}`,
                    description: `El stock de "${product.name}" es crítico (${product.stock} unidades). Se requiere coordinar compra de insumos urgente. Generado automáticamente vía alerta de inventario.`,
                    dueDate: formattedDate,
                    priority: 'high',
                    category: 'Operaciones'
                }
            }));
        }
    };

    // Load initial inventory
    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        const data = await getInventory();
        setInventory(data);
    };

    const handleStockAdjustment = async (id: string, delta: number) => {
        setIsUpdating(true);
        try {
            const updatedProduct = await updateStock(id, delta, 'Ajuste manual de trabajador');
            if (delta < 0) {
                checkAndDispatchLowStockTask(updatedProduct);
            }
            await loadInventory();
        } finally {
            setIsUpdating(false);
        }
    };

    // Attendance Handlers
    const handleClockIn = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        const id = 's_' + Date.now();

        const newShift = {
            id,
            date: dateStr,
            checkIn: timeStr,
            status: 'En Turno',
            location: '-12.0463, -77.0428 (Lima Cercado)'
        };

        setShifts(prev => [newShift, ...prev]);
        setIsClockedIn(true);
        setActiveShiftId(id);
        playOcrSuccess();
    };

    const handleClockOut = () => {
        if (!activeShiftId) return;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

        setShifts(prev => prev.map(s => {
            if (s.id === activeShiftId) {
                return {
                    ...s,
                    checkOut: timeStr,
                    hours: 'Activo',
                    status: 'Terminado'
                };
            }
            return s;
        }));
        setIsClockedIn(false);
        setActiveShiftId(null);
        playBeep();
    };

    // Incident Handlers
    const handleAddIncident = () => {
        if (!newIncidentText.trim()) return;

        const now = new Date();
        const dateStr = now.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });

        const newLog = {
            id: 'i_' + Date.now(),
            date: dateStr,
            time: timeStr,
            text: newIncidentText,
            category: selectedIncidentCat
        };

        setIncidents(prev => [newLog, ...prev]);
        setNewIncidentText('');
        playOcrSuccess();
    };

    const handleAddtoCart = (product: Product) => {
        // Encontrar stock actual en inventario reactivo
        const currentInStock = inventory.find(p => p.id === product.id)?.stock ?? product.stock;
        if (currentInStock <= 0) {
            setScannedProductAlert(`¡${product.name} no cuenta con stock disponible!`);
            setTimeout(() => setScannedProductAlert(null), 3000);
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= currentInStock) {
                    setScannedProductAlert(`Stock máximo alcanzado para ${product.name} (${currentInStock} u.)`);
                    setTimeout(() => setScannedProductAlert(null), 3000);
                    return prev;
                }
                return prev.map(item => 
                    item.product.id === product.id 
                        ? { ...item, quantity: item.quantity + 1 } 
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
        playBeep();
    };

    const handleUpdateCartQty = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const currentProduct = inventory.find(p => p.id === productId) || item.product;
                const maxStock = currentProduct.stock;

                if (delta > 0 && item.quantity >= maxStock) {
                    setScannedProductAlert(`No puedes agregar más de ${maxStock} unidades (stock físico actual)`);
                    setTimeout(() => setScannedProductAlert(null), 3000);
                    return item;
                }

                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean) as typeof cart);
    };

    const handleRemoveFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const simulateClientSearch = () => {
        if (!posClientRuc) return;
        setIsSearchingClient(true);
        setTimeout(() => {
            if (posClientRuc.length === 11) {
                // RUC Peruano simulation
                if (posClientRuc.startsWith('20')) {
                    setPosClientName('CONFECCIONES ALIANZA S.A.C.');
                } else {
                    setPosClientName('BODEGA SOL & LUNA S.R.L.');
                }
            } else if (posClientRuc.length === 8) {
                setPosClientName('MIGUEL ANGEL FLORES SANCHEZ');
            } else {
                setPosClientName('CLIENTE CASUAL S.A.');
            }
            setIsSearchingClient(false);
            playOcrSuccess();
        }, 800);
    };

    const handleCompletePOSSale = async (payMethod: string) => {
        if (cart.length === 0) return;
        
        setIsUpdating(true);
        try {
            const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
            const series = posDocType === DocumentType.FACTURA ? 'F001' : 'B001';
            const correlative = getNextCorrelative(posDocType, sales);
            
            // Build purchase item data for tracking
            const recordInvoice: Omit<Invoice, 'id'> = {
                type: InvoiceType.SALE,
                documentType: posDocType,
                series,
                correlative,
                issueDate: new Date().toISOString().split('T')[0],
                totalAmount: Number(total.toFixed(2)),
                category: cart[0].product.category,
                ruc: posDocType === DocumentType.FACTURA ? (posClientRuc || '20536251489') : undefined
            };

            // Deduct real inventory stock
            for (const item of cart) {
                const updatedProduct = await updateStock(item.product.id, -item.quantity, `Venta Caja POS: ${series}-${correlative}`);
                checkAndDispatchLowStockTask(updatedProduct);
            }

            // Register invoice globally
            if (onAddInvoice) {
                onAddInvoice(recordInvoice);
            }

            // Set printed receipt overlay view
            setPrintedReceipt({
                id: `INV-${Date.now()}`,
                ...recordInvoice,
                clientName: posDocType === DocumentType.FACTURA ? (posClientName || 'CONFECCIONES ALIANZA S.A.C.') : 'CLIENTE BOLETA',
                items: cart.map(c => ({ name: c.product.name, qty: c.quantity, price: c.product.price }))
            });

            // Clean cart
            setCart([]);
            setPosClientRuc('');
            setPosClientName('');
            await loadInventory();
            playOcrSuccess();
        } finally {
            setIsUpdating(false);
        }
    };

    // Camera Scan simulation triggers
    const triggerSimulateScan = (product: Product) => {
        const currentInStock = inventory.find(p => p.id === product.id)?.stock ?? product.stock;
        if (currentInStock <= 0) {
            setScannedProductAlert(`¡${product.name} no cuenta con stock disponible para la venta!`);
            setTimeout(() => setScannedProductAlert(null), 3000);
            return;
        }

        setIsScanningStatus(true);
        setTimeout(() => {
            setIsScanningStatus(false);
            handleAddtoCart(product);
            setScannedProductAlert(product.name);
            setTimeout(() => setScannedProductAlert(null), 3000);
        }, 1200);
    };

    // OCR simulation process
    const runOcrSimulation = (fileId: 'factura_telas' | 'boleta_hilos') => {
        setSelectedMockFile(fileId);
        setOcrProgress(5);
        setOcrStep('Detectando archivo y firmas electrónicas...');
        
        const steps = [
            { prog: 25, step: 'Leyendo estructura XML UBL 2.1 (SUNAT)...' },
            { prog: 55, step: 'Verificando firma digital y validez del certificado...' },
            { prog: 80, step: 'Verificando estado de RUC del emisor ante SUNAT (ACTIVO/HABIDO)...' },
            { prog: 100, step: 'Extracción completada con éxito. Listo para verificar.' }
        ];

        steps.forEach((s, idx) => {
            setTimeout(() => {
                setOcrProgress(s.prog);
                setOcrStep(s.step);
                
                if (s.prog === 100) {
                    playOcrSuccess();
                    if (fileId === 'factura_telas') {
                        setExtractedInvoice({
                            supplierName: 'DISPROTEXTIL PERU S.A.C.',
                            supplierRuc: '20645892154',
                            series: 'F002',
                            correlative: 3412,
                            totalAmount: 1275.00,
                            items: [
                                { name: 'Tela Algodón Premium', qty: 50, targetProductId: '1' }
                            ]
                        });
                    } else {
                        setExtractedInvoice({
                            supplierName: 'INSUMOS INDUSTRIALES LIMA E.I.R.L.',
                            supplierRuc: '20154879263',
                            series: 'F005',
                            correlative: 1205,
                            totalAmount: 240.00,
                            items: [
                                { name: 'Hilo Industrial Blanco', qty: 20, targetProductId: '2' }
                            ]
                        });
                    }
                }
            }, (idx + 1) * 700);
        });
    };

    const handleApproveOcrPurchase = async () => {
        if (!extractedInvoice) return;
        
        setIsUpdating(true);
        try {
            // Register purchase globally
            const recordInvoice: Omit<Invoice, 'id'> = {
                type: InvoiceType.PURCHASE,
                documentType: DocumentType.FACTURA,
                series: extractedInvoice.series,
                correlative: extractedInvoice.correlative,
                issueDate: new Date().toISOString().split('T')[0],
                totalAmount: extractedInvoice.totalAmount,
                category: 'Insumos',
                ruc: extractedInvoice.supplierRuc
            };

            // Increment products in inventory
            for (const item of extractedInvoice.items) {
                await updateStock(item.targetProductId, item.qty, `Ingreso OCR Factura: ${extractedInvoice.series}-${extractedInvoice.correlative}`);
            }

            if (onAddInvoice) {
                onAddInvoice(recordInvoice);
            }

            // Clean and close
            setExtractedInvoice(null);
            setSelectedMockFile(null);
            setOcrProgress(0);
            setIsOcrOpen(false);
            await loadInventory();
            playOcrSuccess();
        } finally {
            setIsUpdating(false);
        }
    };

    // Filtered Products List
    const filteredProducts = inventory.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                              p.sku.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6 container mx-auto p-4 md:p-8 max-w-7xl">
            {/* Header / Operative Title with modern buttons */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
                <div>
                    <h2 className="text-2xl font-black text-gray-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <Package className="text-blue-600" size={24} />
                        Panel de Operaciones de Tienda
                    </h2>
                    <p className="text-xs text-gray-400 font-mono">ROLE: MYPE WORKER · REGISTRO Y GESTIÓN DE CAJA</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => setIsScannerOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                        <Camera size={14} /> Escáner de Barra
                    </button>
                    <button 
                        onClick={() => setIsOcrOpen(true)}
                        className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 text-white border border-slate-700/50 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 active:scale-95 transition-all"
                    >
                        <FileText size={14} /> Digitalizar Compra (OCR)
                    </button>
                </div>
            </header>

            {/* Task warnings banner */}
            {(pendingTasks > 0 || overdueTasks > 0) && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 p-4 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-2xl ${overdueTasks > 0 ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>
                            <AlertCircle size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Acciones y Tareas Pendientes</p>
                            <p className="text-[11px] text-slate-500">
                                Hay <span className="font-bold text-slate-900 dark:text-white">{pendingTasks} tareas</span> agendadas bajo tu responsabilidad. 
                                {overdueTasks > 0 && <span className="text-red-500 font-bold ml-1">{overdueTasks} ya vencieron hoy.</span>}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Interactive Screen Splitter */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Stock Table */}
                <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    {/* Tab controllers */}
                    <div className="flex border-b border-gray-100 dark:border-neutral-800 pb-4 mb-5 gap-4">
                        <button
                            id="tab-inventory"
                            onClick={() => setActiveTab('inventory')}
                            className={`flex items-center gap-2 pb-2 text-xs uppercase tracking-wider font-black border-b-2 transition-all ${
                                activeTab === 'inventory'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200'
                            }`}
                        >
                            <Package size={14} />
                            Inventario y Tienda
                        </button>
                        <button
                            id="tab-attendance"
                            onClick={() => setActiveTab('attendance')}
                            className={`flex items-center gap-2 pb-2 text-xs uppercase tracking-wider font-black border-b-2 transition-all ${
                                activeTab === 'attendance'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200'
                            }`}
                        >
                            <Clock size={14} />
                            Asistencia y Bitácora
                        </button>
                    </div>

                    {activeTab === 'inventory' && (
                        <div>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-base uppercase tracking-wider flex items-center gap-2">
                                        <Sparkles size={16} className="text-blue-500 animate-pulse" />
                                        Inventario Disponibilidad
                                    </h3>
                                    <p className="text-xs text-gray-400">Presiona + para sumar stock o el ícono de bolsa de compra para cargarlo al POS de venta rápida.</p>
                                </div>
                                
                                {/* Search box built like search layout */}
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input 
                                        type="text"
                                        placeholder="Buscar SKU o nombre..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-neutral-950 border border-gray-100 dark:border-neutral-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Category Tags */}
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                                {(['Todos', 'Telas', 'Insumos'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all ${
                                            selectedCategory === cat 
                                                ? 'bg-blue-600 text-white shadow-sm' 
                                                : 'bg-slate-50 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border border-slate-100 dark:border-neutral-700/50 hover:bg-slate-100'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Inventory Table Container */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-neutral-800/80">
                                        <tr>
                                            <th className="px-4 py-3 font-black">Producto</th>
                                            <th className="px-4 py-3 font-black">SKU</th>
                                            <th className="px-4 py-3 font-black">Precio Unit.</th>
                                            <th className="px-4 py-3 font-black">Stock</th>
                                            <th className="px-4 py-3 text-right font-black">Control</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-neutral-800/50">
                                        {filteredProducts.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-800/30 transition-all group">
                                                <td className="px-4 py-4">
                                                    <p className="text-sm font-black text-gray-800 dark:text-white leading-tight">{p.name}</p>
                                                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[9px] font-black tracking-wider text-blue-600 uppercase">
                                                        {p.category}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 font-mono text-xs text-gray-500">{p.sku}</td>
                                                <td className="px-4 py-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    S/ {p.price.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${p.stock < 10 ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'text-gray-800 dark:text-gray-200'}`}>
                                                        {p.stock} u.
                                                    </span>
                                                    {p.stock < 15 && (
                                                        <p className="text-[9px] text-red-500 font-bold mt-0.5 animate-pulse">¿Venta Crítica?</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            disabled={isUpdating || p.stock <= 0}
                                                            onClick={() => handleStockAdjustment(p.id, -1)}
                                                            title="Reducir Stock Físico"
                                                            aria-label={`Reducir stock de ${p.name}`}
                                                            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 rounded-xl hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <button 
                                                            disabled={isUpdating}
                                                            onClick={() => handleStockAdjustment(p.id, 1)}
                                                            title="Incrementar Stock Físico"
                                                            aria-label={`Incrementar stock de ${p.name}`}
                                                            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                        {p.stock <= 0 ? (
                                                            <button 
                                                                disabled
                                                                title="Sin stock disponible"
                                                                aria-label={`Sin stock de ${p.name}`}
                                                                className="min-h-[44px] px-3 bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center cursor-not-allowed select-none"
                                                            >
                                                                Sin stock
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                disabled={isUpdating}
                                                                onClick={() => handleAddtoCart(p)}
                                                                title="Agregar a la canasta de venta rápida"
                                                                aria-label={`Agregar ${p.name} al carrito`}
                                                                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                                                            >
                                                                <ShoppingCart size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredProducts.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="text-center py-12 text-xs text-gray-400">
                                                    No se encontraron productos coincidentes o el catálogo está vacío.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
                                {/* Clocking widget */}
                                <div className="bg-slate-50 dark:bg-neutral-950 p-5 rounded-2xl border border-slate-100 dark:border-neutral-800 flex flex-col justify-between">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-widest">Reloj Operativo Local</span>
                                            <span className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2 py-0.5 rounded uppercase">Zona GMT-5</span>
                                        </div>

                                        <div className="py-2 text-center">
                                            <span className="text-3xl font-black font-mono tracking-wider text-slate-900 dark:text-white bg-white dark:bg-black p-3.5 rounded-xl border border-slate-100 dark:border-neutral-900/60 inline-block shadow-inner">
                                                {currentTime || '12:00:00'}
                                            </span>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-2 uppercase">May 29, 2026</p>
                                        </div>

                                        <div className="border-t border-slate-200/50 dark:border-neutral-800 pt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                                            <p className="flex items-center gap-2"><MapPin size={12} className="text-blue-500" /> <span className="font-bold">Locación:</span> Taller Cercado, Lima</p>
                                            <p className="flex items-center gap-2"><UserCheck size={12} className="text-blue-500" /> <span className="font-bold">Operador:</span> Juan Pérez</p>
                                            <p className="flex items-center gap-2"><Clock size={12} className="text-blue-500" /> <span className="font-bold">Estado actual:</span> {isClockedIn ? 'EN TURNO ACTIVO' : 'FUERA DE TURNO'}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        {!isClockedIn ? (
                                            <button
                                                id="btn-clock-in"
                                                onClick={handleClockIn}
                                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow active:scale-98 flex items-center justify-center gap-2"
                                            >
                                                <UserCheck size={14} /> Registrar Entrada (Clock In)
                                            </button>
                                        ) : (
                                            <button
                                                id="btn-clock-out"
                                                onClick={handleClockOut}
                                                className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow active:scale-98 flex items-center justify-center gap-2"
                                            >
                                                <X size={14} /> Registrar Salida (Clock Out)
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Incidents form */}
                                <div className="bg-slate-50 dark:bg-neutral-950 p-5 rounded-2xl border border-slate-100 dark:border-neutral-800">
                                    <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-3 flex items-center gap-1.5">
                                        <AlertTriangle size={14} className="text-amber-500" />
                                        Agregar Evento o Incidencia
                                    </h4>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Categoría:</label>
                                            <select
                                                id="incident-category-select"
                                                value={selectedIncidentCat}
                                                onChange={(e) => setSelectedIncidentCat(e.target.value)}
                                                className="w-full bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 py-2 px-3 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
                                            >
                                                <option value="General">General / Operaciones</option>
                                                <option value="Suministros">Logística / Suministros</option>
                                                <option value="Mantenimiento">Infraestructura / Mantenimiento</option>
                                                <option value="Seguridad">Seguridad / Auditoría</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Descripción de Novedad:</label>
                                            <textarea
                                                id="incident-text-input"
                                                rows={2}
                                                placeholder="Ej. Máquina de coser 3 con fallas de aguja..."
                                                value={newIncidentText}
                                                onChange={(e) => setNewIncidentText(e.target.value)}
                                                className="w-full bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 py-1.5 px-3 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none resize-none"
                                            ></textarea>
                                        </div>

                                        <button
                                            id="btn-add-incident"
                                            onClick={() => handleAddIncident()}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all shadow duration-150"
                                        >
                                            Reportar Incidencia
                                        </button>
                                    </div>

                                    {/* Quick templates */}
                                    <div className="mt-3">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Plantillas rápidas:</span>
                                        <div className="flex gap-1 flex-wrap">
                                            {[
                                                { label: 'Falta cambio en caja', cat: 'General', text: 'Se requiere cambio sencillo (monedas de S/ 1 y S/ 2) para el Punto de Venta.' },
                                                { label: 'Inspección municipal', cat: 'Seguridad', text: 'Se presentó personal de inspección para validación de extintor y licencia.' },
                                                { label: 'Retraso de materia prima', cat: 'Suministros', text: 'Proveedor de telas notificó de retrasos en entrega.' }
                                            ].map((tpl, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        setNewIncidentText(tpl.text);
                                                        setSelectedIncidentCat(tpl.cat);
                                                    }}
                                                    className="bg-white dark:bg-neutral-900 border border-slate-250 dark:border-neutral-800/80 hover:bg-slate-100 dark:hover:bg-neutral-800 px-2 py-0.5 rounded text-[8px] text-slate-600 dark:text-slate-400 font-bold"
                                                >
                                                    {tpl.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dual layout lists: Shift history & Incident Log */}
                            <div className="grid md:grid-cols-2 gap-6 pt-2">
                                {/* Past Shifts */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                                        <Calendar size={14} className="text-blue-500" />
                                        Registro de Turnos Recientes
                                    </h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {shifts.map(s => (
                                            <div key={s.id} className="bg-slate-50 dark:bg-neutral-950/60 border border-slate-150 dark:border-neutral-800/80 p-3 rounded-xl flex justify-between items-center text-xs">
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-slate-100">{s.date}</p>
                                                    <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin size={10} /> {s.location}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold font-mono text-slate-700 dark:text-slate-300">{s.checkIn} - {s.checkOut || 'Activo'}</p>
                                                    <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded mt-0.5 ${
                                                        s.status === 'Terminado' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 animate-pulse'
                                                    }`}>
                                                        {s.status} {s.hours ? `(${s.hours})` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Incidents Log */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                                        <BookOpen size={14} className="text-blue-500" />
                                        Bitácora Reciente de la Tienda
                                    </h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {incidents.map(i => (
                                            <div key={i.id} className="bg-slate-50 dark:bg-neutral-950/60 border border-slate-150 dark:border-neutral-800/80 p-3 rounded-xl space-y-1 text-xs">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-[9px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                                                        {i.category}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 font-mono">{i.date} · {i.time}</span>
                                                </div>
                                                <p className="text-slate-700 dark:text-slate-300 leading-normal">{i.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-50 dark:border-neutral-800 flex justify-between items-center text-xs text-gray-400 font-mono">
                        <span>SAMI Core Inventory Management Hub v1.8</span>
                        <span>Ventas del Día Sincronizadas</span>
                    </div>
                </div>

                {/* Right Column: POS Terminal POS Cart / Drawer */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white flex flex-col h-[600px] justify-between">
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Title of Cart */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 flex-shrink-0">
                            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                <ShoppingCart size={16} className="text-blue-400" />
                                Punto de Venta (POS)
                            </h3>
                            <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                {cart.reduce((a, b) => a + b.quantity, 0)} ítems
                            </span>
                        </div>

                        {/* Cart Items List */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                            <AnimatePresence initial={false}>
                                {cart.map(item => {
                                    const maxStock = (inventory.find(p => p.id === item.product.id)?.stock ?? item.product.stock);
                                    const isMaxStock = item.quantity >= maxStock;
                                    return (
                                        <motion.div 
                                            key={item.product.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-100 truncate">{item.product.name}</p>
                                                <p className="font-mono text-[10px] text-slate-500">
                                                    S/ {item.product.price.toFixed(2)} c/u · <span className={isMaxStock ? 'text-amber-400 font-bold' : 'text-slate-400'}>Max: {maxStock} u.</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button 
                                                    onClick={() => handleUpdateCartQty(item.product.id, -1)}
                                                    aria-label={`Disminuir cantidad de ${item.product.name}`}
                                                    className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl cursor-pointer transition-all"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="font-black font-mono w-6 text-center text-slate-100 text-sm">{item.quantity}</span>
                                                <button 
                                                    onClick={() => handleUpdateCartQty(item.product.id, 1)}
                                                    disabled={isMaxStock}
                                                    title={isMaxStock ? 'Stock físico máximo alcanzado' : 'Aumentar cantidad'}
                                                    aria-label={`Aumentar cantidad de ${item.product.name}`}
                                                    className={`w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-all ${
                                                        isMaxStock 
                                                            ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed opacity-50' 
                                                            : 'bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 cursor-pointer'
                                                    }`}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleRemoveFromCart(item.product.id)}
                                                    aria-label={`Eliminar ${item.product.name} del carrito`}
                                                    className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center bg-red-950/40 hover:bg-red-900/60 active:scale-95 text-red-400 rounded-xl cursor-pointer ml-1 transition-all"
                                                    title="Quitar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {cart.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                    <Barcode size={48} className="text-slate-700 stroke-1 mb-3 animate-pulse" />
                                    <p className="font-bold text-xs text-slate-300">Caja de Entrega Rápida</p>
                                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">Escanear un producto con la cámara, o clic en el ícono de carrito de los productos para listarlos aquí.</p>
                                </div>
                            )}
                        </div>

                        {/* Customer Document Settings (Only if items in cart) */}
                        {cart.length > 0 && (
                            <div className="border-t border-slate-800 pt-4 mt-4 space-y-3 flex-shrink-0 bg-slate-900">
                                {/* Type selector */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setPosDocType(DocumentType.BOLETA)}
                                        className={`py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border ${
                                            posDocType === DocumentType.BOLETA 
                                                ? 'bg-slate-800 text-white border-blue-500/80 shadow-md' 
                                                : 'bg-transparent text-slate-400 border-slate-800 hover:bg-slate-800/40'
                                        }`}
                                    >
                                        Boleta Electrónica
                                    </button>
                                    <button
                                        onClick={() => setPosDocType(DocumentType.FACTURA)}
                                        className={`py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border ${
                                            posDocType === DocumentType.FACTURA 
                                                ? 'bg-slate-800 text-white border-blue-500/80 shadow-md' 
                                                : 'bg-transparent text-slate-400 border-slate-800 hover:bg-slate-800/40'
                                        }`}
                                    >
                                        Factura (RUC)
                                    </button>
                                </div>

                                {/* Custom customer form inputs */}
                                <div className="space-y-1.5">
                                    <div className="flex gap-1.5">
                                        <input
                                            type="text"
                                            maxLength={posDocType === DocumentType.FACTURA ? 11 : 8}
                                            placeholder={posDocType === DocumentType.FACTURA ? "Ingresar RUC (11 dígitos)..." : "Ingresar DNI (Opcional)..."}
                                            value={posClientRuc}
                                            onChange={(e) => setPosClientRuc(e.target.value.replace(/\D/g,''))}
                                            className="min-w-0 flex-1 bg-slate-950 border border-slate-800 py-1.5 px-3 rounded-xl text-xs font-mono outline-none focus:border-slate-600 text-slate-100"
                                        />
                                        <button
                                            onClick={simulateClientSearch}
                                            disabled={isSearchingClient || !posClientRuc}
                                            className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950 disabled:text-slate-600 text-slate-200 text-xs px-2.5 py-1.5 rounded-xl font-bold tracking-tight transition-colors flex-shrink-0"
                                        >
                                            {isSearchingClient ? '...' : 'SUNAT'}
                                        </button>
                                    </div>
                                    
                                    {posClientName && (
                                        <div className="bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 text-[10px] text-emerald-400 animate-slide-in">
                                            <Check size={10} />
                                            <span className="font-bold uppercase truncate">{posClientName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer cart operations / Totals */}
                    {cart.length > 0 && (
                        <div className="border-t border-slate-800 pt-3 mt-3 flex-shrink-0 space-y-3 bg-slate-900">
                            {/* Running cost overview */}
                            <div className="space-y-1.5 font-mono text-xs">
                                <div className="flex justify-between text-slate-400">
                                    <span>Subtotal</span>
                                    <span>S/ {(cart.reduce((a,b) => a + b.product.price*b.quantity, 0) / 1.18).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>IGV (18%)</span>
                                    <span>S/ {(cart.reduce((a,b) => a + b.product.price*b.quantity, 0) * 0.18 / 1.18).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-black text-white border-t border-slate-800/50 pt-1.5">
                                    <span className="uppercase tracking-wider">Monto Total</span>
                                    <span>S/ {cart.reduce((a,b) => a + b.product.price*b.quantity, 0).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Payout Buttons */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleCompletePOSSale('YAPE')}
                                    className="bg-[#6B2ED6] text-white py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#6124cb] transition-colors shadow-lg active:scale-95"
                                >
                                    Pagar con YAPE
                                </button>
                                <button
                                    onClick={() => handleCompletePOSSale('EFECTIVO')}
                                    className="bg-emerald-600 text-white py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-lg active:scale-95"
                                >
                                    Efectivo / POS
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* BARCODE SCANNER MODAL VIEW */}
            <AnimatePresence>
                {isScannerOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md p-6 overflow-hidden relative"
                        >
                            <button
                                onClick={() => setIsScannerOpen(false)}
                                className="absolute right-4 top-4 text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <div className="text-center mb-6">
                                <h3 className="font-black text-white text-base uppercase tracking-wider">Simulador Escáner SAMI Core</h3>
                                <p className="text-slate-500 text-xs mt-1">SAMI detecta códigos comerciales de barras mediante visión IA.</p>
                            </div>

                            {/* Viewfinder simulation viewport */}
                            <div className="relative aspect-video bg-neutral-900 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center">
                                {/* Lasers line scanning */}
                                <motion.div 
                                    animate={{ y: [-80, 80, -80] }}
                                    transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                                    className="absolute left-4 right-4 h-0.5 bg-red-600 shadow-[0_0_8px_1.5px_rgba(239,68,68,0.8)] z-20"
                                />

                                {/* Brackets */}
                                <div className="absolute top-6 left-6 border-t-2 border-l-2 border-red-500 w-6 h-6 rounded-tl-sm" />
                                <div className="absolute top-6 right-6 border-t-2 border-r-2 border-red-500 w-6 h-6 rounded-tr-sm" />
                                <div className="absolute bottom-6 left-6 border-b-2 border-l-2 border-red-500 w-6 h-6 rounded-bl-sm" />
                                <div className="absolute bottom-6 right-6 border-b-2 border-r-2 border-red-500 w-6 h-6 rounded-br-sm" />

                                {/* Mock Barcode Image representation */}
                                <div className="text-center select-none opacity-40 group hover:opacity-100 flex flex-col items-center">
                                    <Barcode className="text-white w-32 h-16 stroke-1" />
                                    <span className="text-[9px] text-white font-mono uppercase tracking-widest mt-1">SAMI-SCAN-ACTIVE</span>
                                </div>

                                {/* Scanning over overlay loader */}
                                {isScanningStatus && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-xs text-white">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-2" />
                                        <p className="font-black tracking-widest uppercase text-[10px]">Extrayendo Código de Barras...</p>
                                    </div>
                                )}
                            </div>

                            {/* Helper simulation controls list */}
                            <div className="mt-6 space-y-3">
                                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Simular escaneo de producto:</p>
                                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto pr-1">
                                    {inventory.map(prod => (
                                        <button
                                            key={prod.id}
                                            onClick={() => triggerSimulateScan(prod)}
                                            className="text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 py-2.5 px-3 rounded-xl transition-all flex items-center justify-between text-xs"
                                        >
                                            <div>
                                                <span className="font-bold text-slate-200">{prod.name}</span>
                                                <p className="font-mono text-[9px] text-slate-500">SKU: {prod.sku}</p>
                                            </div>
                                            <span className="text-blue-400 font-bold font-mono">S/ {prod.price.toFixed(2)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Smart OCR Receipt Reader Modal */}
            <AnimatePresence>
                {isOcrOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white border border-slate-100 dark:border-neutral-800 rounded-3xl w-full max-w-4xl p-6 md:p-8 overflow-hidden relative max-h-[90vh] flex flex-col"
                        >
                            <button
                                onClick={() => {
                                    setIsOcrOpen(false);
                                    setExtractedInvoice(null);
                                    setSelectedMockFile(null);
                                    setOcrProgress(0);
                                }}
                                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <div className="mb-6 flex-shrink-0">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-2">
                                        <Sparkles size={20} className="text-blue-600" />
                                        Digitalizador de Compras OCR
                                    </h3>
                                    <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-amber-300/50">
                                        Modo Demostración
                                    </span>
                                </div>
                                <p className="text-slate-500 text-xs mt-1">
                                    Prueba cómo funcionará la digitalización automática de tus compras con estas facturas de ejemplo. La carga de tus propios documentos estará disponible próximamente.
                                </p>
                            </div>

                            {/* Drop zone / Process screen */}
                            <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-6">
                                {!selectedMockFile ? (
                                    <div 
                                        onClick={() => {
                                            setDropNotice("La carga de documentos propios (PDF/XML) está en desarrollo — prueba con los comprobantes de ejemplo de abajo mientras tanto.");
                                            setTimeout(() => setDropNotice(null), 4000);
                                        }}
                                        onDragOver={(e) => { e.preventDefault(); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDropNotice("La carga de documentos propios (PDF/XML) está en desarrollo — prueba con los comprobantes de ejemplo de abajo mientras tanto.");
                                            setTimeout(() => setDropNotice(null), 4000);
                                        }}
                                        className="border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 dark:hover:border-blue-800/60 transition-colors relative"
                                    >
                                        <span className="absolute top-3 right-3 bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                            Próximamente
                                        </span>
                                        <FileText size={44} className="text-slate-400 stroke-1 mb-3" />
                                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">Selecciona o suelta tu documento</h4>
                                        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">Soporta PDFs emitidos por proveedores o archivos comprimidos directos de SUNAT (.XML).</p>
                                        
                                        {dropNotice && (
                                            <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs px-4 py-2 rounded-xl border border-amber-200/50 mb-4 animate-fade-in flex items-center gap-1.5 font-medium max-w-md">
                                                <AlertCircle size={14} className="flex-shrink-0" />
                                                <span>{dropNotice}</span>
                                            </div>
                                        )}

                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mb-3">Prueba con estos comprobantes de ejemplo:</p>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); runOcrSimulation('factura_telas'); }}
                                                className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 font-black text-xs py-2 px-4 rounded-xl border border-blue-200/50 flex items-center gap-2"
                                            >
                                                📄 Factura Disprotextil S/ 1,275.00
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); runOcrSimulation('boleta_hilos'); }}
                                                className="bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-black text-xs py-2 px-4 rounded-xl border border-indigo-200/50 flex items-center gap-2"
                                            >
                                                📄 Factura Insumos S/ 240.00
                                            </button>
                                        </div>
                                    </div>
                                ) : !extractedInvoice ? (
                                    /* Processing loader bar */
                                    <div className="py-12 text-center flex flex-col items-center justify-center space-y-4">
                                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
                                        <div className="w-full max-w-xs bg-slate-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                                className="bg-blue-600 h-1.5 transition-all duration-300" 
                                                style={{ width: `${ocrProgress}%` }}
                                            />
                                        </div>
                                        <p className="font-bold text-xs font-mono text-blue-600">{ocrProgress}%</p>
                                        <p className="text-xs text-slate-500 font-medium">{ocrStep}</p>
                                        <span className="text-[10px] text-slate-400 font-mono">Simulando extracción UBL 2.1 y validación de ejemplo...</span>
                                    </div>
                                ) : (
                                    /* Extracted Invoice verification screen (Split panel) */
                                    <div className="grid md:grid-cols-2 gap-6 animate-slide-in">
                                        {/* Simulated Invoice PDF Layout */}
                                        <div className="bg-slate-50 dark:bg-neutral-950 border border-slate-200/60 dark:border-neutral-800 p-6 rounded-2xl font-mono text-[11px] text-slate-600 dark:text-slate-400 shadow-inner relative overflow-hidden">
                                            {/* Watermark / Badge de Demostración */}
                                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2 mb-3">
                                                <span className="bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                                                    Vista Previa (Ejemplo)
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-sans">Entorno de Demostración</span>
                                            </div>
                                            <div className="border-b border-slate-200 dark:border-neutral-800 pb-3 mb-3 text-center">
                                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-xs">{extractedInvoice.supplierName}</h4>
                                                <p>RUC Emisor: {extractedInvoice.supplierRuc}</p>
                                                <p>AV. INDUSTRIAL 457, LIMA, PERÚ</p>
                                            </div>
                                            <div className="space-y-1 mb-4">
                                                <p><span className="font-bold">COMPROBANTE:</span> FACTURA ELECTRÓNICA</p>
                                                <p><span className="font-bold">SERIE-NRO:</span> {extractedInvoice.series}-{extractedInvoice.correlative}</p>
                                                <p><span className="font-bold">FECHA EMIS:</span> {new Date().toISOString().split('T')[0]}</p>
                                                <p><span className="font-bold">RUC RECEPTOR:</span> 20123456789 (Tu MYPE)</p>
                                            </div>
                                            <table className="w-full border-t border-b border-slate-200 dark:border-neutral-800 my-3 py-1.5">
                                                <thead>
                                                    <tr className="border-b border-slate-100 dark:border-neutral-800/50">
                                                        <th className="text-left font-bold">Cant</th>
                                                        <th className="text-left font-bold">Descripción</th>
                                                        <th className="text-right font-bold">Total (S/)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {extractedInvoice.items.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td>{item.qty} u.</td>
                                                            <td>{item.name}</td>
                                                            <td className="text-right">{(extractedInvoice.totalAmount / 1.18).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div className="space-y-1.5 text-right font-mono mt-4">
                                                <p>SUBTOTAL: S/ {(extractedInvoice.totalAmount / 1.18).toFixed(2)}</p>
                                                <p>IGV (18%): S/ {(extractedInvoice.totalAmount * 0.18 / 1.18).toFixed(2)}</p>
                                                <p className="font-black text-slate-800 dark:text-white border-t border-dashed border-slate-300 dark:border-neutral-800 pt-1.5 text-xs">
                                                    TOTAL IMPORTE: S/ {extractedInvoice.totalAmount.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Extracted JSON target mapping dashboard list */}
                                        <div className="space-y-4">
                                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/50 p-4 rounded-2xl">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-tight flex items-center gap-1.5">
                                                        <Check size={14} /> Simulación de Validación SUNAT
                                                    </h4>
                                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded">
                                                        Demostración
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                                                    En el flujo real, SAMI validará la firma digital UBL 2.1 y consultará el estado ACTIVO/HABIDO del RUC ante SUNAT en tiempo real.
                                                </p>
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Asignación de Stock</h4>
                                                {extractedInvoice.items.map((item, idx) => (
                                                    <div key={idx} className="bg-slate-50 dark:bg-neutral-800/80 border border-slate-100 dark:border-neutral-700/50 p-3 rounded-2xl space-y-2">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                                                            <span className="bg-blue-600/10 text-blue-600 dark:text-blue-400 font-black px-2 py-0.5 rounded text-[10px]">
                                                                +{item.qty} u.
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Emparejar con producto del Inventario:</label>
                                                            <select 
                                                                className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 py-1.5 px-3 rounded-xl text-xs outline-none text-slate-800 dark:text-slate-200"
                                                                value={item.targetProductId}
                                                                onChange={(e) => {
                                                                    const updatedItems = [...extractedInvoice.items];
                                                                    updatedItems[idx].targetProductId = e.target.value;
                                                                    setExtractedInvoice({ ...extractedInvoice, items: updatedItems });
                                                                }}
                                                            >
                                                                {inventory.map(prod => (
                                                                    <option key={prod.id} value={prod.id}>{prod.name} (ID: {prod.id} | SKU: {prod.sku})</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={handleApproveOcrPurchase}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl shadow-lg transition-transform active:scale-98 mt-4 flex items-center justify-center gap-2"
                                            >
                                                <Check size={14} /> Aprobar e Ingresar a Inventario (Demo)
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SCANNER DETECT ALERT FLOAT BANNER */}
            <AnimatePresence>
                {scannedProductAlert && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500 text-xs font-bold font-mono tracking-wide"
                    >
                        <Check size={16} />
                        <span>¡{scannedProductAlert.toUpperCase()} AGREGADO AL PUNTO DE VENTA!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ELECTRONIC RECEIPT OVERLAY VIEW (Aesthetic finalization) */}
            <AnimatePresence>
                {printedReceipt && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white text-slate-900 border border-slate-200 rounded-3xl w-full max-w-sm p-6 overflow-hidden relative shadow-2xl flex flex-col items-center"
                        >
                            <button
                                onClick={() => setPrintedReceipt(null)}
                                className="absolute right-4 top-4 text-slate-400 hover:text-slate-900"
                            >
                                <X size={20} />
                            </button>

                            {/* Success Icon */}
                            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full mb-3 shadow">
                                <Check size={24} className="stroke-2" />
                            </div>

                            <p className="font-black text-xs text-emerald-600 uppercase tracking-widest mb-1">¡Documento Autorizado SUNAT!</p>
                            <h4 className="font-bold text-slate-800 text-sm mb-4">Emisión de Comprobante Exitosa</h4>

                            {/* Receipt representation card */}
                            <div className="w-full bg-slate-50 border border-slate-200/80 p-4 rounded-2xl font-mono text-[10px] text-slate-500 space-y-3">
                                <div className="text-center border-b border-slate-200 pb-2">
                                    <h5 className="font-black text-slate-800 uppercase">SAMI PLATAFORMA MYPE</h5>
                                    <p>Asociado: Juan Pérez bodegero</p>
                                    <p>RUC Emisor: 20123456789</p>
                                </div>

                                <div className="space-y-1">
                                    <p><span className="font-bold">DOCUMENTO:</span> {printedReceipt.documentType === DocumentType.FACTURA ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'}</p>
                                    <p><span className="font-bold">SERIE-CORRE:</span> {printedReceipt.series}-{printedReceipt.correlative}</p>
                                    <p><span className="font-bold">FECHA EMISIÓN:</span> {printedReceipt.issueDate}</p>
                                    <p><span className="font-bold">CLIENTE:</span> {printedReceipt.clientName}</p>
                                    {printedReceipt.ruc && <p><span className="font-bold">RUC CLIENTE:</span> {printedReceipt.ruc}</p>}
                                </div>

                                <table className="w-full border-t border-b border-slate-200 py-2">
                                    <thead>
                                        <tr className="text-left font-bold border-b border-slate-150">
                                            <th>Cant</th>
                                            <th>Item</th>
                                            <th className="text-right">P.U (S/)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printedReceipt.items.map((it, idx) => (
                                            <tr key={idx}>
                                                <td>{it.qty}</td>
                                                <td>{it.name}</td>
                                                <td className="text-right">S/ {it.price.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="space-y-1 text-right font-black text-slate-800">
                                    <p>TOTAL COMPRAR: S/ {printedReceipt.totalAmount.toFixed(2)}</p>
                                </div>

                                <div className="flex flex-col items-center justify-center pt-2 border-t border-slate-200">
                                    <QrCode size={48} className="text-slate-800" />
                                    <span className="text-[7px] text-slate-400 mt-1 uppercase">Representación Impresa SUNAT</span>
                                </div>
                            </div>

                            {/* Download Action */}
                            <button
                                onClick={() => setPrintedReceipt(null)}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all shadow mt-4 flex items-center justify-center gap-2"
                            >
                                <Download size={12} /> Descargar Comprobante PDF
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WorkerDashboard;
