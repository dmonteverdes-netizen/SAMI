
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import type { Invoice, DashboardData, CreditApplication, Task } from '../types';
import { getDashboardData } from '../services/dashboardService';
import { checkSunatDeadline } from '../services/notificationService';
import SamiScoreGauge from './SamiScoreGauge';
import PaymentMethodsBadges from './PaymentMethodsBadges';
import { MonthlyTaxDetail } from './MonthlyTaxDetail';
import { MonthlyTaxSummaryTable } from './MonthlyTaxSummaryTable';
import { Bell, Info, AlertTriangle, Briefcase, Clock, CheckCircle2, TrendingDown, Wallet, TrendingUp, Calculator, Percent, FileText, Lightbulb, GraduationCap } from 'lucide-react';

interface DashboardProps {
  sales: Invoice[];
  purchases: Invoice[];
  creditApplications: CreditApplication[];
  tasks?: Task[];
  onNavigate?: (view: any) => void;
  onQuickSaleClick?: () => void;
  onAddTask?: (task: any) => void;
}

const StatCard: React.FC<{ title: string; tooltip?: string; children: React.ReactNode; className?: string }> = ({ title, tooltip, children, className }) => (
  <div className={`bg-white dark:bg-gray-800/80 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col hover:shadow-md transition-all duration-300 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[10px] font-black text-readable uppercase tracking-[0.2em]">{title}</h3>
      {tooltip && (
        <div className="group relative cursor-help">
          <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-readable-muted text-[10px] flex items-center justify-center font-bold select-none">?</span>
          <div className="absolute bottom-full right-0 mb-2 w-52 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-xl p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-20 leading-relaxed">
            {tooltip}
          </div>
        </div>
      )}
    </div>
    <div className="flex-grow flex items-center justify-center">{children}</div>
  </div>
);

const CATEGORY_COLORS: { [key: string]: string } = {
  'Alquiler': '#F59E0B',    // Amber / Orange
  'Servicios': '#3B82F6',   // Blue / Indigo
  'Mercadería': '#10B981',  // Emerald / Green
  'Planilla': '#8B5CF6'     // Purple / Violet
};

const Dashboard: React.FC<DashboardProps> = ({ sales, purchases, creditApplications, tasks = [], onNavigate, onQuickSaleClick, onAddTask }) => {
  const overdueTasks = useMemo(() => tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < new Date()).length, [tasks]);
  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'completed').length, [tasks]);

  const [dashboardState, setDashboardState] = useState<{
    data: DashboardData | null;
    isLoading: boolean;
  }>({
    data: null,
    isLoading: true
  });

  // --- Estados del Cronograma SUNAT Interactivo ---
  const [pdtState, setPdtState] = useState<{
    isDeclared: boolean;
    isDeclaring: boolean;
    declaringStep: string;
    isTaskAdded: boolean;
  }>(() => {
    const saved = localStorage.getItem('sami_pdt621_declared_v1');
    return {
      isDeclared: saved === 'true',
      isDeclaring: false,
      declaringStep: '',
      isTaskAdded: false
    };
  });

  const [plameState, setPlameState] = useState<{
    isTaskAdded: boolean;
  }>({
    isTaskAdded: false
  });

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add("2026-05");
    [...sales, ...purchases].forEach(inv => {
      if (inv.issueDate && inv.issueDate.length >= 7) {
        monthsSet.add(inv.issueDate.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [sales, purchases]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    return availableMonths.includes("2026-05") ? "2026-05" : (availableMonths[0] || "2026-05");
  });

  const handleSimulatePDT = () => {
    if (pdtState.isDeclared || pdtState.isDeclaring) return;
    
    setPdtState(prev => ({ ...prev, isDeclaring: true, declaringStep: '📊 Consolidando base de ventas e IGV...' }));
    
    setTimeout(() => {
      setPdtState(prev => ({ ...prev, declaringStep: '🔍 Evaluando crédito fiscal de compras...' }));
    }, 850);
    
    setTimeout(() => {
      setPdtState(prev => ({ ...prev, declaringStep: '🔑 Autenticando canal SOL (RUC 10456789012)...' }));
    }, 1700);
    
    setTimeout(() => {
      setPdtState(prev => ({ ...prev, declaringStep: '💸 Emitiendo declaración y orden de pago...' }));
    }, 2550);
    
    setTimeout(() => {
      setPdtState({
        isDeclared: true,
        isDeclaring: false,
        declaringStep: '',
        isTaskAdded: pdtState.isTaskAdded
      });
      localStorage.setItem('sami_pdt621_declared_v1', 'true');
      
      const totalTaxes = Math.max(0, monthlyTaxSummary.igvPayable) + monthlyTaxSummary.incomeTaxAdvance;
      const title = '📊 SUNAT: Declaración Exitosa';
      const body = `El PDT 621 de ${selectedMonth === '2026-05' ? 'Mayo' : selectedMonth} fue presentado exitosamente. Total cancelado: S/ ${totalTaxes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}.`;
      
      window.dispatchEvent(new CustomEvent('sami-toast', {
        detail: {
          title,
          body,
          data: { type: 'SUNAT_DEADLINE', action: 'accounting' }
        }
      }));
    }, 3400);
  };

  const handleAddTaskPDT = () => {
    if (pdtState.isTaskAdded) return;
    
    const combinedTaxes = Math.max(0, monthlyTaxSummary.igvPayable) + monthlyTaxSummary.incomeTaxAdvance;
    
    onAddTask?.({
      title: `Presentar PDT 621 - SUNAT`,
      description: `Declaración mensual del periodo ${selectedMonth}. Monto estimado: S/ ${combinedTaxes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}.`,
      category: 'SUNAT',
      status: 'pending',
      dueDate: '2026-06-17T23:59:00Z',
      priority: 'high',
      assignedTo: 'u2'
    });
    
    setPdtState(prev => ({ ...prev, isTaskAdded: true }));
    
    window.dispatchEvent(new CustomEvent('sami-toast', {
      detail: {
        title: '📅 Alerta SUNAT Agendada',
        body: 'La tarea "Presentar PDT 621 - SUNAT" se ha guardado en tu tablero de control.',
        data: { type: 'SYSTEM' }
      }
    }));
  };

  const handleAddTaskPlame = () => {
    if (plameState.isTaskAdded) return;
    
    onAddTask?.({
      title: `Declaración de Planilla PLAME`,
      description: `Revisar retenciones laborales y aportes previstos para ESSALUD del periodo ${selectedMonth}.`,
      category: 'SUNAT',
      status: 'pending',
      dueDate: '2026-06-20T23:59:00Z',
      priority: 'medium',
      assignedTo: 'u2'
    });
    
    setPlameState({ isTaskAdded: true });
    
    window.dispatchEvent(new CustomEvent('sami-toast', {
      detail: {
        title: '📅 PLAME Agendado',
        body: 'La tarea "Declarar Planilla PLAME" fue debidamente agendada en tu tablero de control.',
        data: { type: 'SYSTEM' }
      }
    }));
  };

  const monthlyTaxSummary = useMemo(() => {
    const mSales = sales.filter(s => s.issueDate && s.issueDate.startsWith(selectedMonth));
    const mPurchases = purchases.filter(p => p.issueDate && p.issueDate.startsWith(selectedMonth));
    
    let totalSales = 0;
    let netSales = 0;
    let igvDebit = 0;
    
    mSales.forEach(inv => {
      totalSales += inv.totalAmount;
      const baseAmount = inv.totalAmount / 1.18;
      netSales += baseAmount;
      igvDebit += inv.totalAmount - baseAmount;
    });
    
    let totalPurchases = 0;
    let igvCredit = 0;
    
    mPurchases.forEach(inv => {
      totalPurchases += inv.totalAmount;
      if (inv.documentType === 'FACTURA') {
        const baseAmount = inv.totalAmount / 1.18;
        igvCredit += inv.totalAmount - baseAmount;
      }
    });
    
    const igvPayable = igvDebit - igvCredit;
    const rmtThresholdAmount = 5150 * 300; // 300 UIT
    const appliedRmtRate = netSales <= rmtThresholdAmount ? 0.01 : 0.015;
    const incomeTaxAdvance = netSales * appliedRmtRate;
    
    return {
      salesCount: mSales.length,
      purchasesCount: mPurchases.length,
      totalSales: parseFloat(totalSales.toFixed(2)),
      netSales: parseFloat(netSales.toFixed(2)),
      totalPurchases: parseFloat(totalPurchases.toFixed(2)),
      igvDebit: parseFloat(igvDebit.toFixed(2)),
      igvCredit: parseFloat(igvCredit.toFixed(2)),
      igvPayable: parseFloat(igvPayable.toFixed(2)),
      incomeTaxAdvance: parseFloat(incomeTaxAdvance.toFixed(2)),
      appliedRmtRate
    };
  }, [sales, purchases, selectedMonth]);

  const chartData = useMemo(() => {
    const monthlyMap: { [key: string]: { mes: string; Ventas: number; Compras: number } } = {};
    
    [...sales, ...purchases].forEach(inv => {
      if (!inv.issueDate) return;
      const month = inv.issueDate.substring(0, 7);
      const label = new Date(month + '-02').toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
      if (!monthlyMap[month]) monthlyMap[month] = { mes: label, Ventas: 0, Compras: 0 };
      if (inv.type === 'sale') monthlyMap[month].Ventas += inv.totalAmount;
      else monthlyMap[month].Compras += inv.totalAmount;
    });
    
    const sortedKeys = Object.keys(monthlyMap).sort();
    return sortedKeys.slice(-6).map(key => ({
      ...monthlyMap[key]
    }));
  }, [sales, purchases]);

  const chartTotals = useMemo(() => {
    let totalSales = 0;
    let totalPurchases = 0;
    chartData.forEach(d => {
      totalSales += d.Ventas;
      totalPurchases += d.Compras;
    });
    return {
      totalSales,
      totalPurchases,
      net: totalSales - totalPurchases
    };
  }, [chartData]);

  const categoryData = useMemo(() => {
    const counts: { [key: string]: number } = {
      'Alquiler': 0,
      'Servicios': 0,
      'Mercadería': 0,
      'Planilla': 0
    };

    purchases.forEach(p => {
      let cat = 'Mercadería';
      if (p.category && ['Alquiler', 'Servicios', 'Mercadería', 'Planilla'].includes(p.category)) {
        cat = p.category;
      } else {
        if (p.correlative === 1) cat = 'Alquiler';
        else if (p.correlative === 2) cat = 'Mercadería';
        else if (p.correlative === 3) cat = 'Planilla';
        else if (p.correlative === 4) cat = 'Servicios';
        else if (p.correlative === 5) cat = 'Mercadería';
        else if (p.correlative === 6) cat = 'Servicios';
        else {
          const lastDigit = p.correlative % 4;
          if (lastDigit === 0) cat = 'Alquiler';
          else if (lastDigit === 1) cat = 'Servicios';
          else if (lastDigit === 2) cat = 'Mercadería';
          else cat = 'Planilla';
        }
      }
      counts[cat] += p.totalAmount;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    })).filter(item => item.value > 0);
  }, [purchases]);

  const totalPurchaseExpenses = useMemo(() => {
    return categoryData.reduce((acc, curr) => acc + curr.value, 0);
  }, [categoryData]);

  const sunatAlert = useMemo(() => {
    const ruc = sales.find(s => s.ruc)?.ruc || purchases.find(p => p.ruc)?.ruc || '';
    return checkSunatDeadline(ruc);
  }, [sales, purchases]);

  useEffect(() => {
    setDashboardState(prev => ({ ...prev, isLoading: true }));
    const data = getDashboardData(sales, purchases);
    setDashboardState({ data, isLoading: false });
  }, [sales, purchases]);

  if (dashboardState.isLoading || !dashboardState.data) {
    return (
      <div className="text-center p-8">
        <div role="status" aria-label="Cargando datos..." className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <span className="sr-only">Cargando...</span>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando Dashboard...</p>
        </div>
      </div>
    );
  }

  const { netCashFlow, taxStatus, nextDueDate, samiScore, maxLoanAmount, insights } = dashboardState.data;

  const handleDownloadCreditReport = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [49, 46, 129]; // Indigo dark
    const secondaryColor = [79, 70, 229]; // Indigo bright
    const lightBg = [249, 250, 251]; // gray 50
    const borderGray = [229, 231, 235]; // gray 200
    const textDark = [31, 41, 55]; // gray 800
    const textMuted = [107, 114, 128]; // gray 500

    doc.setFont("Helvetica", "bold");

    // HEADER colored banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 16, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("SAMI FINTECH • EXPEDIENTE DE SALUD COMERCIAL Y CREDITICIA MYPE", 15, 10.5);

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(18);
    doc.text("Reporte de Calificación Comercial y Fiscal", 15, 30);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 15, 35);
    doc.text(`Periodo analizado: ${selectedMonth}`, 15, 39);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("SAMI AI", 165, 30);
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("Asistente MYPE Autorizado", 153, 34);

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(15, 43, 195, 43);

    // 1. SAMI SCORE BOX
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(15, 48, 180, 48, "F");
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.rect(15, 48, 180, 48, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("1. RESULTADO SAMI SCORE (RÉGIMEN COMERCIAL EN LÍNEA)", 20, 55);

    doc.setFontSize(36);
    const scoreVal = samiScore?.score || 550;
    const tierVal = samiScore?.tier || "Regular";
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`${scoreVal}`, 25, 78);
    
    doc.setFontSize(9.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text("Puntos", 25, 83);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Nivel de Salud: ${tierVal}`, 70, 64);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Tasa Estimada de Préstamo: ${scoreVal >= 700 ? "1.2% - 1.8%" : scoreVal >= 550 ? "1.9% - 2.8%" : "2.9% - 3.5%"} mensual`, 70, 69);
    doc.text(`Capacidad Financiera Pre-Aprobada: S/ ${(maxLoanAmount || 3000).toLocaleString('es-PE')}`, 70, 73);
    doc.text(`Ingreso Mensual Promedio Fiscal: S/ ${(samiScore?.avgMonthlySales || 5000).toLocaleString('es-PE')}`, 70, 77);

    const stab = samiScore?.analysis?.stability || 60;
    const grow = samiScore?.analysis?.growth || 50;
    const form = samiScore?.analysis?.formality || 40;
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(`Estabilidad: ${stab}%`, 70, 85);
    doc.text(`Crecimiento: ${grow}%`, 112, 85);
    doc.text(`Formalidad: ${form}%`, 155, 85);

    // 2. DETALLE FISCAL Y TRIBUTARIO
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`2. RESUMEN DE COMPLIANCE TRIBUTARIO Y FLUJO DE CAJA (${selectedMonth})`, 15, 107);

    let currentY = 113;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, currentY, 180, 8, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.text("Concepto Analizado", 18, currentY + 5.5);
    doc.text("Monto en Soles (PEN)", 110, currentY + 5.5);
    doc.text("Porcentaje o Tasa", 160, currentY + 5.5);

    const rows = [
      { text: "Ingresos Brutos (Ventas Totales)", val: monthlyTaxSummary.totalSales, extra: `${monthlyTaxSummary.salesCount} Comprobantes` },
      { text: "Base Imponible de Ventas (Ingreso Neto)", val: monthlyTaxSummary.netSales, extra: "100%" },
      { text: "Gastos Declarados (Compras con Factura)", val: monthlyTaxSummary.totalPurchases, extra: `${monthlyTaxSummary.purchasesCount} Comprobantes` },
      { text: "IGV Débito Fiscal Cobrado", val: monthlyTaxSummary.igvDebit, extra: "18.0%" },
      { text: "IGV Crédito Fiscal Acumulado", val: monthlyTaxSummary.igvCredit, extra: "18.0%" },
      { text: "Impuesto General a las Ventas Neto Payable", val: monthlyTaxSummary.igvPayable, extra: monthlyTaxSummary.igvPayable > 0 ? "A pagar SUNAT" : "Crédito a favor" },
      { text: "Pago a Cuenta Impuesto a la Renta (MYPE)", val: monthlyTaxSummary.incomeTaxAdvance, extra: `${(monthlyTaxSummary.appliedRmtRate * 100).toFixed(1)}% de tasa aplicada` },
    ];

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont("Helvetica", "normal");
    rows.forEach((row, idx) => {
      currentY += 8;
      if (idx % 2 === 1) {
        doc.setFillColor(243, 244, 246);
        doc.rect(15, currentY, 180, 8, "F");
      }
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(15, currentY, 180, 8, "S");

      doc.setFont("Helvetica", "normal");
      if (row.text.includes("Payable") || row.text.includes("Impuesto a la Renta")) {
        doc.setFont("Helvetica", "bold");
      }
      doc.text(row.text, 18, currentY + 5.5);
      doc.text(`S/ ${row.val.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 110, currentY + 5.5);
      doc.text(row.extra, 160, currentY + 5.5);
    });

    // 3. REC INSIGHTS
    currentY += 16;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("3. ANALÍTICA DE INSIGHTS Y RECOMENDACIONES DE COMPRESIÓN", 15, currentY);

    currentY += 5;
    insights.slice(0, 3).forEach((insight, idx) => {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(15, currentY, 180, 10, "F");
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(15, currentY, 180, 10, "S");
      
      doc.setFontSize(7.5);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(insight.type === 'warning' ? 185 : insight.type === 'danger' ? 220 : 79, 70, 20);
      doc.text(`[RECOMENDACIÓN DE ASISTENTE ${idx + 1}]`, 18, currentY + 4);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFontSize(8);
      const wrappedText = doc.splitTextToSize(insight.text, 172);
      doc.text(wrappedText, 18, currentY + 7.5);
      currentY += 12;
    });

    if (insights.length === 0) {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(15, currentY, 180, 10, "F");
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(15, currentY, 180, 10, "S");
      doc.setFontSize(8.5);
      doc.text("No hay anomalías tributarias ni cuellos de botella detectados para este periodo.", 18, currentY + 6);
      currentY += 12;
    }

    currentY = 258;
    doc.setFontSize(6);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("ESTABLECIDO BAJO PROTOCOLO DE CONFORMIDAD REGULADA DE DATOS S.B.S Y REGLAS DE SEGURIDAD GENERAL SUNAT.", 15, currentY);
    doc.text("La veracidad de este comprobante digital puede validarse directamente escaneando el código de confirmación SAMI-ID:", 15, currentY + 3);
    
    doc.setFont("Helvetica", "bold");
    const uniqueHash = `SM-HASH-${Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase()}`;
    doc.text(`CÓDIGO ÚNICO SHA256 VALIDADOR: ${uniqueHash}`, 15, currentY + 6.5);

    doc.setLineWidth(0.5);
    doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.line(15, currentY + 8, 195, currentY + 8);

    doc.save(`Expediente_SAMI_Score_${selectedMonth}.pdf`);
  };

  const getTaxStatusPill = () => {
      let classes = "px-3 py-1 text-sm font-semibold rounded-full ";
      switch(taxStatus) {
          case 'Al día':
              classes += "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
              break;
          case 'Pendiente':
              classes += "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
              break;
          case 'Por Vencer':
              classes += "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
              break;
      }
      return <span className={classes}>{taxStatus}</span>;
  }
  
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Hola, Emprendedor 👋</h1>
          <button 
            onClick={handleDownloadCreditReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Descargar Carpeta de Calificación Crediticia MYPE en formato PDF"
          >
            <FileText size={14} /> Exportar Reporte de Salud MYPE
          </button>
        </div>
        
        {sunatAlert?.isNear && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-xl animate-pulse">
            <div className="p-2 bg-red-500 text-white rounded-lg">
              <Bell size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase">Alerta SUNAT</p>
              <p className="text-sm text-red-700 dark:text-red-400">Tu declaración vence el {sunatAlert.date}</p>
            </div>
          </div>
        )}

        {(pendingTasks > 0 || overdueTasks > 0) && (
          <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-3 rounded-xl">
            <div className={`p-2 ${overdueTasks > 0 ? 'bg-red-500' : 'bg-indigo-500'} text-white rounded-lg`}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-tight">Tareas Pendientes</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-400 font-bold">
                {pendingTasks === 1 ? '1 tarea pendiente' : `${pendingTasks} tareas pendientes`}
                {overdueTasks > 0 && <span className="text-red-600 block sm:inline sm:ml-1">({overdueTasks} vencidas)</span>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Acciones Rápidas — solo en mobile, máximo impacto */}
      <div className="lg:hidden grid grid-cols-2 gap-4 mb-6">
        {[
          { 
            icon: <Wallet size={24} className="text-white" />, 
            label: 'Registrar Venta', 
            sub: 'Anotar lo que vendí', 
            color: 'bg-emerald-500',
            onClick: () => { onQuickSaleClick?.(); }
          },
          { 
            icon: <TrendingUp size={24} className="text-white" />, 
            label: 'Mi SAMI Score', 
            sub: samiScore ? `${samiScore.score} pts — ${samiScore.tier}` : 'Sin datos aún',
            color: 'bg-indigo-600 dark:bg-indigo-700',
            onClick: () => { onNavigate?.('credit'); }
          },
          { 
            icon: <AlertTriangle size={24} className="text-white" />, 
            label: 'Alertas SUNAT', 
            sub: taxStatus === 'Al día' ? 'Estás al día' : 'Acción requerida',
            color: taxStatus === 'Al día' ? 'bg-slate-600' : 'bg-amber-500',
            onClick: () => { onNavigate?.('notifications'); }
          },
          { 
            icon: <GraduationCap size={24} className="text-white" />, 
            label: 'Aprender Finanzas', 
            sub: 'Sube tu score gratis',
            color: 'bg-purple-650',
            onClick: () => { onNavigate?.('education'); }
          },
        ].map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`${action.color} text-white p-5 rounded-3xl text-left active:scale-95 transition-transform shadow-md cursor-pointer flex flex-col justify-between`}
          >
            <div className="mb-2 opacity-95">{action.icon}</div>
            <div>
              <p className="font-extrabold text-sm leading-tight">{action.label}</p>
              <p className="text-white/80 text-[11px] mt-1 leading-tight">{action.sub}</p>
            </div>
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-8">
        
        <StatCard title="Lo que me quedó este mes" className="md:col-span-2" tooltip="Ingresos netos menos egresos netos de tu negocio en lo que va del mes.">
           <div className="w-full text-center px-2 py-4">
             <div className="flex flex-col sm:flex-row justify-around items-center gap-6 sm:gap-2">
                <div className="flex flex-col items-center sm:items-start px-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ingresos</p>
                    <p className="text-3xl font-black text-emerald-500 tracking-tighter">S/ {netCashFlow.income.toLocaleString('es-PE')}</p>
                </div>
                <div className="hidden sm:block text-gray-200 dark:text-gray-700 text-3xl font-light">−</div>
                 <div className="flex flex-col items-center sm:items-start px-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Egresos</p>
                    <p className="text-3xl font-black text-rose-500 tracking-tighter">S/ {netCashFlow.expenses.toLocaleString('es-PE')}</p>
                </div>
             </div>
             <div className="mt-8 h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-50 dark:border-gray-700">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${netCashFlow.income + netCashFlow.expenses > 0 ? (netCashFlow.income / (netCashFlow.income + netCashFlow.expenses)) * 100 : 0}%` }}
                    className="h-full bg-emerald-500 rounded-full shadow-sm" 
                ></motion.div>
             </div>
           </div>
        </StatCard>

         <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between hover:shadow-md transition-all duration-300">
           <div>
             <div className="flex items-center justify-between mb-4">
               <div>
                 <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">📅 Cronograma SUNAT (RUC 10...012)</h3>
                 <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Periodo Fiscal Seleccionado: {selectedMonth === '2026-05' ? 'Mayo' : selectedMonth}</p>
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Estado:</span>
                 {pdtState.isDeclared ? (
                   <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[9px] font-black uppercase rounded-md">Al día</span>
                 ) : (
                   <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[9px] font-black uppercase rounded-md">Pendiente</span>
                 )}
               </div>
             </div>

             <div className="space-y-4 my-2">
               {/* Duty 1: PDT 621 - IGV & Renta */}
               <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                 <div>
                   <div className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                     <p className="text-xs font-black uppercase text-gray-800 dark:text-gray-200">PDT 621 (IGV & Impuesto Renta)</p>
                     {pdtState.isDeclared ? (
                       <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider rounded">Presentado</span>
                     ) : (
                       <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[8px] font-black uppercase tracking-wider rounded">Por Declarar</span>
                     )}
                   </div>
                   <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1">
                     Vence el <strong className="text-gray-700 dark:text-gray-300">17 de Junio, 2026</strong> (Dígito 2)
                   </p>
                   <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                     Monto Estimado: S/ {(Math.max(0, monthlyTaxSummary.igvPayable) + monthlyTaxSummary.incomeTaxAdvance).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                   </p>
                 </div>

                 <div className="flex items-center gap-2 self-end sm:self-center">
                   {pdtState.isDeclared ? (
                     <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                       <CheckCircle2 size={12} /> Listo
                     </div>
                   ) : pdtState.isDeclaring ? (
                     <span className="text-[10px] font-black uppercase text-indigo-500 animate-pulse bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl">
                       Procesando...
                     </span>
                   ) : (
                     <>
                       <button
                         type="button"
                         onClick={handleSimulatePDT}
                         className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                       >
                         Declarar
                       </button>
                       <button
                         type="button"
                         onClick={handleAddTaskPDT}
                         disabled={pdtState.isTaskAdded}
                         className={`px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                           pdtState.isTaskAdded 
                             ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-750' 
                             : 'border-indigo-200 hover:bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:hover:bg-indigo-900/30 dark:text-indigo-400'
                         }`}
                       >
                         {pdtState.isTaskAdded ? 'Agendado ✓' : 'Agendar'}
                       </button>
                     </>
                   )}
                 </div>
               </div>

               {/* Duty 2: Planilla PLAME */}
               <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                 <div>
                   <div className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                     <p className="text-xs font-black uppercase text-gray-800 dark:text-gray-200">Planilla Mensual (PLAME)</p>
                     <span className="px-1.5 py-0.5 bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[8px] font-black uppercase tracking-wider rounded">No Requerido</span>
                   </div>
                   <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1">
                     Vence el <strong className="text-gray-700 dark:text-gray-300">20 de Junio, 2026</strong>
                   </p>
                 </div>

                 <div className="flex items-center gap-2 self-end sm:self-center">
                   <button
                     type="button"
                     onClick={handleAddTaskPlame}
                     disabled={plameState.isTaskAdded}
                     className={`px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                       plameState.isTaskAdded 
                         ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-750' 
                         : 'border-indigo-200 hover:bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:hover:bg-indigo-900/30 dark:text-indigo-400'
                     }`}
                   >
                     {plameState.isTaskAdded ? 'Agendado ✓' : 'Agendar'}
                   </button>
                 </div>
               </div>
             </div>
           </div>
           
           {/* Step feedback when declaring */}
           {pdtState.isDeclaring && pdtState.declaringStep && (
             <div className="mt-4 p-3 bg-indigo-950/90 text-white rounded-xl border border-indigo-500/30 font-mono text-[9px] space-y-1">
               <p className="text-indigo-400 flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                 SAMI Core — SUNAT Agent Connection
               </p>
               <p className="text-gray-300">➜ {pdtState.declaringStep}</p>
             </div>
           )}
         </div>

        {creditApplications.length > 0 && (
          <div className="md:col-span-2 xl:col-span-4 bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Briefcase size={14} className="text-indigo-500" />
                Mis Solicitudes Activas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {creditApplications.slice(0, 3).map(app => (
                  <div key={app.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between group hover:border-indigo-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center p-1.5 shadow-sm">
                        <img src={app.partner.logoUrl} alt={app.partner.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white">S/ {app.amount.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{app.type === 'loan' ? 'Préstamo' : 'Factoring'}</p>
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 ${
                      app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      app.status === 'reviewing' ? 'bg-indigo-100 text-indigo-700 animate-pulse' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {app.status === 'pending' ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                      {app.status === 'pending' ? 'Pendiente' : app.status === 'reviewing' ? 'Revisión' : 'Aprobado'}
                    </div>
                  </div>
                ))}
              </div>
          </div>
        )}
        
        <div className="md:col-span-2 xl:col-span-4 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-6">Mi puntaje bancario</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                <div className="lg:col-span-1">
                    {samiScore ? (
                        <div className="scale-110">
                          <SamiScoreGauge scoreResult={samiScore} />
                        </div>
                    ) : (
                        <div className="text-center p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Registra más ventas para calcular tu puntaje bancario y acceder a créditos.</p>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-2 text-center p-10 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-800/30">
                     <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-2">Puedo pedir hasta</p>
                     <p className="text-5xl md:text-6xl font-black text-indigo-600 dark:text-indigo-400 my-4 tracking-tighter">
                        S/ {maxLoanAmount.toLocaleString('es-PE')}
                     </p>
                     <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Basado en tu historial de ventas y SAMI Score real.</p>
                </div>
            </div>
        </div>
        
        <div className="md:col-span-2 xl:col-span-4 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Insights Proactivos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.length > 0 ? insights.map(insight => (
                    <div key={insight.id} className="flex items-start p-5 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-transparent hover:border-amber-200 dark:hover:border-amber-900/30 transition-all group">
                        <div className="flex-shrink-0 mr-4 mt-1 bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl group-hover:scale-110 transition-transform">
                           <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{insight.text}</p>
                    </div>
                )) : (
                    <div className="col-span-2 flex flex-col items-center justify-center py-10 opacity-40">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                        <Info size={20} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No hay nuevos insights por ahora</p>
                    </div>
                )}
            </div>
        </div>

        {chartData.length > 0 && (
          <div className="md:col-span-2 xl:col-span-4 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 mt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-500" />
                  Comparativa de Ventas vs. Compras
                </h3>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Flujo de Caja Últimos 6 Meses</h2>
                <p className="text-xs text-readable-muted dark:text-gray-400 mt-1">
                  Analiza el equilibrio mensual entre lo que ingresas por tus ventas y lo que egresas por tus compras registradas.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 px-3.5 py-2 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    S/ {chartTotals.totalSales.toLocaleString('es-PE', { maximumFractionDigits: 0 })} Ventas
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 px-3.5 py-2 rounded-2xl border border-rose-100/50 dark:border-rose-900/30">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 font-mono">
                    S/ {chartTotals.totalPurchases.toLocaleString('es-PE', { maximumFractionDigits: 0 })} Compras
                  </span>
                </div>
                <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border ${
                  chartTotals.net >= 0 
                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-900/30 text-blue-700 dark:text-blue-400' 
                    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-100/50 dark:border-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}>
                  <span className="text-[11px] font-bold font-mono">
                    Neto: S/ {chartTotals.net.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `S/${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
                      fontFamily: 'Inter, sans-serif',
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 500,
                      backdropFilter: 'blur(4px)'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                    formatter={(value: number, name: string) => [`S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '10px' }} 
                  />
                  <Bar name="Ventas" dataKey="Ventas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar name="Compras" dataKey="Compras" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {categoryData.length > 0 && (
          <div className="md:col-span-2 xl:col-span-4 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 mt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-505 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                  <TrendingDown size={14} className="text-rose-500" />
                  Estructura de Costos y Egresos
                </h3>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Análisis de Gastos por Categoría</h2>
                <p className="text-xs text-readable-muted dark:text-gray-400 mt-1">
                  Distribución porcentual de los egresos generados mediante tus facturas de compras registradas.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 px-4 py-2.5 rounded-2xl border border-rose-100/50 dark:border-rose-900/30">
                <Wallet className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 font-mono">
                  S/ {totalPurchaseExpenses.toLocaleString('es-PE')} Total
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Graphic Column */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
                <div className="w-full h-64 md:h-72 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={6}
                        dataKey="value"
                        nameKey="name"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CATEGORY_COLORS[entry.name] || '#8884d8'} 
                            stroke="rgba(0,0,0,0.05)"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', 
                          fontFamily: 'Inter, sans-serif',
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 500,
                          backdropFilter: 'blur(4px)'
                        }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => [`S/ ${value.toLocaleString('es-PE')}`, 'Monto']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Total overlay inside the radial chart */}
                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Total Compras</span>
                  <span className="text-xl md:text-2xl font-black text-gray-800 dark:text-white mt-1 font-mono tracking-tight">
                    S/ {totalPurchaseExpenses.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Data Breakdown Column */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 space-y-4">
                  {/* Category Details List */}
                  {['Alquiler', 'Servicios', 'Mercadería', 'Planilla'].map((cat) => {
                    const item = categoryData.find(d => d.name === cat);
                    const value = item ? item.value : 0;
                    const percentage = totalPurchaseExpenses > 0 ? (value / totalPurchaseExpenses) * 100 : 0;
                    const color = CATEGORY_COLORS[cat];
                    
                    return (
                      <div key={cat} className="group flex flex-col gap-1.5 p-1 rounded-xl transition-all duration-200">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="w-3.5 h-3.5 rounded-full block border border-white/20 shadow-sm" style={{ backgroundColor: color }}></span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{cat}</span>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <span className="font-mono text-gray-900 dark:text-white font-extrabold">S/ {value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-[10px] py-0.5 px-2 font-bold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono">{percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-[1px] border border-gray-100 dark:border-gray-850">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full transition-transform"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex items-start gap-3 text-[11px] text-gray-400 dark:text-gray-505 leading-relaxed px-2">
                  <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span>
                    El motor de clasificación financiera asigna automáticamente la categoría analizando el nombre de tu proveedor, el código de CIIU, correlación de facturas de compras registradas en SAMI FinTech.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Módulo Contable — Resumen Fiscal de IGV e Impuesto a la Renta */}
        <div className="md:col-span-2 xl:col-span-4 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 mt-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                <Calculator size={14} className="text-indigo-500" />
                Módulo Contable — Resumen Fiscal
              </h3>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Desglose de Impuestos Acumulados</h2>
              <p className="text-xs text-readable-muted dark:text-gray-400 mt-1">
                Visualiza el cálculo estimado de IGV y pago a cuenta de Impuesto a la Renta de tu negocio para el periodo seleccionado.
              </p>
            </div>

            {/* Selector de Mes */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock size={12} /> Periodo:
              </span>
              <select 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-4 py-2.5 text-xs font-bold bg-gray-50 dark:bg-gray-700/50 text-gray-750 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/30 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-700 font-mono"
              >
                {availableMonths.map(m => {
                  const [year, month] = m.split('-');
                  const d = new Date(parseInt(year), parseInt(month) - 1, 15);
                  const label = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
                  return (
                    <option key={m} value={m}>
                      {label.charAt(0).toUpperCase() + label.slice(1)} {m === "2026-05" ? "(Mes Actual)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* PANEL 1: IGV (Impuesto General a las Ventas) */}
            <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                    <Percent size={14} className="text-emerald-500" />
                    Impuesto General a las Ventas (IGV — 18%)
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-gray-400">Tasa: 18%</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl mb-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm animate-fade-in">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">IGV NETO DEL MES</p>
                    <p className={`text-2xl font-black font-mono tracking-tight ${monthlyTaxSummary.igvPayable > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      S/ {monthlyTaxSummary.igvPayable.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    {monthlyTaxSummary.igvPayable > 0 ? (
                      <span className="px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100/30 dark:border-amber-900/20 inline-flex items-center gap-1">
                        <AlertTriangle size={11} className="text-amber-505 shrink-0" /> Por pagar
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-950/20 inline-flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-emerald-500 shrink-0" /> Saldo a favor
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {/* IGV Débito */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      (+) IGV Débito (Ventas)
                      <div className="group relative cursor-help">
                        <Info size={12} className="text-gray-400" />
                        <div className="absolute bottom-full left-0 mb-1.5 w-48 bg-gray-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-white/10 leading-relaxed font-normal">
                          Resultante de tus ventas del mes. Corresponde a la fórmula: Ventas Totales - (Ventas Totales / 1.18).
                        </div>
                      </div>
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white font-mono">
                      S/ {monthlyTaxSummary.igvDebit.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* IGV Crédito */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      (−) IGV Crédito (Compras)
                      <div className="group relative cursor-help">
                        <Info size={12} className="text-gray-400" />
                        <div className="absolute bottom-full left-0 mb-1.5 w-48 bg-gray-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-white/10 leading-relaxed font-normal">
                          Resultante de tus compras del mes con Factura. Nota: Compras registradas con Boleta no otorgan derecho a crédito fiscal.
                        </div>
                      </div>
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white font-mono">
                      S/ {monthlyTaxSummary.igvCredit.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Offset Visual Progress Bar */}
              <div className="border-t border-gray-150/50 dark:border-gray-800 pt-4 mt-2">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase flex justify-between mb-1.5">
                  <span>Balance de Compensación</span>
                  <span>{monthlyTaxSummary.igvDebit > 0 ? ((monthlyTaxSummary.igvCredit / monthlyTaxSummary.igvDebit) * 100).toFixed(0) : '0'}% compensado</span>
                </span>
                <div className="h-2.5 w-full bg-gray-150 dark:bg-gray-800 rounded-full overflow-hidden p-[1px] border border-gray-200/50 dark:border-gray-700">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${monthlyTaxSummary.igvDebit > 0 ? Math.min(100, (monthlyTaxSummary.igvCredit / monthlyTaxSummary.igvDebit) * 100) : 0}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic leading-relaxed">
                  {monthlyTaxSummary.igvPayable > 0 
                    ? `Tienes S/ ${monthlyTaxSummary.igvPayable.toLocaleString('es-PE', { maximumFractionDigits: 2 })} de IGV restante. Compensa más comprando legalmente con facturas.` 
                    : `¡Excelente! Tus compras cubren el 100% de tu IGV cobrado, resultando en un saldo a favor en este mes.`}
                </p>
              </div>
            </div>

            {/* PANEL 2: Impuesto a la Renta (Pago a Cuenta RMT) */}
            <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                    <FileText size={14} className="text-indigo-500" />
                    Impuesto a la Renta — Pago a Cuenta (RMT)
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-gray-400">Escala: {(monthlyTaxSummary.appliedRmtRate * 100).toFixed(1)}%</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl mb-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">PAGO A CUENTA ESTIMADO</p>
                    <p className="text-2xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
                      S/ {monthlyTaxSummary.incomeTaxAdvance.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-blue-100/30 dark:border-blue-900/20">
                      🏢 MYPE Tributario
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Ventas Netas del Mes */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                      Ventas Netas (Base Imponible)
                    </span>
                    <span className="font-bold text-gray-950 dark:text-white font-mono">
                      S/ {monthlyTaxSummary.netSales.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Tasa Aplicada */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                      Tasa Mensual Aplicada
                    </span>
                    <span className="font-bold text-gray-950 dark:text-white font-mono">
                      {(monthlyTaxSummary.appliedRmtRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Informative Scale breakdown & UIT bounds */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-750">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  Mecánica de Cálculo RMT (SUNAT):
                </span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Bajo el <b>Régimen MYPE Tributario</b>, realizas pagos a cuenta de Impuesto a la Renta mensuales equivalentes al <b>1.0%</b> de tus ingresos netos (si tus ventas anuales acumuladas son menores a 300 UIT). Al sobrepasar este límite fiscal, la tasa es del <b>1.5%</b>.
                </p>
                <div className="mt-3 flex justify-between bg-indigo-550/10 dark:bg-indigo-950/25 p-2.5 rounded-xl text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  <span>Base Imponible: S/ {monthlyTaxSummary.netSales.toLocaleString('es-PE', { maximumFractionDigits: 0 })}</span>
                  <span>Límite RMT: {monthlyTaxSummary.appliedRmtRate === 0.01 ? '≤ 300 UIT (1%)' : '> 300 UIT (1.5%)'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Educational footnote */}
          <div className="mt-6 flex items-start gap-2.5 bg-yellow-500/10 dark:bg-yellow-950/10 border border-yellow-250/20 dark:border-yellow-905/10 p-4 rounded-2xl">
            <Lightbulb size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-500 dark:text-gray-450 leading-relaxed font-semibold">
              <b>Consejo SAMI:</b> El IGV no forma parte de las ganancias reales de tu empresa; es un impuesto al consumo transferido a SUNAT. Por cada compra formal que realices con factura, acumulas crédito fiscal que disminuye directamente el IGV por pagar de tus ventas. ¡Exige siempre Factura!
            </p>
          </div>
        </div>

        {/* Detalle Mensual de Impuestos desde el Módulo Contable */}
        <div className="md:col-span-2 xl:col-span-4 space-y-6">
          <MonthlyTaxSummaryTable 
            sales={sales}
            purchases={purchases}
            selectedMonth={selectedMonth}
            onMonthSelect={setSelectedMonth}
          />

          <MonthlyTaxDetail 
            sales={sales} 
            purchases={purchases} 
            selectedMonth={selectedMonth} 
          />
        </div>

        {/* Payment Methods Certifications */}
        <div className="md:col-span-2 xl:col-span-4 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
          <PaymentMethodsBadges title="Métodos de Pago y Desembolso Soportados" />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
