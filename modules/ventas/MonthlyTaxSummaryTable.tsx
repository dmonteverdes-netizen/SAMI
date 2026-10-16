import React, { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { motion } from 'motion/react';
import { Invoice, DocumentType } from '../../types';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Calendar, 
  ChevronRight, 
  FileSpreadsheet, 
  Download,
  Percent,
  Calculator,
  ArrowRight,
  Bell,
  Check,
  Clock,
  Sparkles
} from 'lucide-react';

interface MonthlyTaxSummaryTableProps {
  sales: Invoice[];
  purchases: Invoice[];
  onMonthSelect?: (month: string) => void;
  selectedMonth?: string;
}

export const MonthlyTaxSummaryTable: React.FC<MonthlyTaxSummaryTableProps> = ({ 
  sales, 
  purchases, 
  onMonthSelect,
  selectedMonth 
}) => {
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Local state for payment status of each month, persisted in localStorage
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, 'pendiente' | 'pagado'>>(() => {
    try {
      const stored = localStorage.getItem('sami_tax_payment_statuses');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Track scheduled tasks to avoid duplicate schedules for the same month
  const [scheduledMonths, setScheduledMonths] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('sami_tax_scheduled_months');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Local alert notification message
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Trigger inline success notifications
  const triggerNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => {
      setNotificationMsg(null);
    }, 4500);
  };

  const handleToggleStatus = (month: string, hasTaxes: boolean) => {
    if (!hasTaxes) return;

    setPaymentStatuses(prev => {
      const current = prev[month] || 'pendiente';
      const next: 'pendiente' | 'pagado' = current === 'pendiente' ? 'pagado' : 'pendiente';
      const updated: Record<string, 'pendiente' | 'pagado'> = { ...prev, [month]: next };
      try {
        localStorage.setItem('sami_tax_payment_statuses', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const calculateNextMonthDeadline = (monthStr: string): string => {
    try {
      const [year, month] = monthStr.split('-').map(Number);
      let nextMonth = month + 1;
      let nextYear = year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      return `${nextYear}-${String(nextMonth).padStart(2, '0')}-15`;
    } catch {
      return '2026-06-15';
    }
  };

  const handleScheduleReminder = (month: string, igvPayable: number, incomeTaxAdvance: number, totalTaxes: number) => {
    // Dispatch custom event to add task in App.tsx
    const event = new CustomEvent('sami:add-task', {
      detail: {
        title: `Pagar tributos - ${formatMonthLabel(month)}`,
        description: `Declaración y pago mensual de tributos SUNAT correspondientes al periodo contable ${month}.\n\n• IGV Neto: S/ ${Math.max(0, igvPayable).toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n• Impuesto a la Renta Estimado: S/ ${incomeTaxAdvance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n• Total Tributos: S/ ${totalTaxes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}.\n\nPor favor, realizar la declaración virtual mediante el portal de SUNAT y efectuar el pago de la Guía de Pago Fácil.`,
        dueDate: calculateNextMonthDeadline(month),
        priority: 'high',
        category: 'Impuestos'
      }
    });
    window.dispatchEvent(event);

    // Save scheduled state
    setScheduledMonths(prev => {
      const updated = { ...prev, [month]: true };
      try {
        localStorage.setItem('sami_tax_scheduled_months', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    triggerNotification(`📅 ¡Excelente! Se programó el recordatorio para el período de ${formatMonthLabel(month)} en tu Módulo de Tareas.`);
  };

  const handleExportPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors & Styling
      const brandPrimary = [79, 70, 229]; // Indigo
      const bgGray = [245, 247, 250];
      const textDark = [33, 37, 41];
      const textMuted = [108, 117, 125];
      const accentGreen = [16, 185, 129];
      const accentAmber = [245, 158, 11];

      // Setup page
      doc.setFont("Helvetica", "normal");

      // Draw Top Accent Band
      doc.setFillColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
      doc.rect(0, 0, 210, 15, "F");

      // Header Brand
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.text("SAMI Plataforma FinTech • Modulo Contable", 15, 10);
      
      doc.setFontSize(8);
      doc.setFont("Helvetica", "normal");
      doc.text("Declaracion Mensual Simplificada SUNAT", 150, 10);

      // Main title & Metadata
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFontSize(18);
      doc.setFont("Helvetica", "bold");
      doc.text("REPORTE TRIBUTARIO EJECUTIVO", 15, 30);

      // Divider line
      doc.setDrawColor(220, 224, 230);
      doc.setLineWidth(0.5);
      doc.line(15, 33, 195, 33);

      // Metadata block
      doc.setFontSize(9);
      doc.setFont("Helvetica", "bold");
      doc.text("Empresa / MYPE:", 15, 40);
      doc.setFont("Helvetica", "normal");
      doc.text(sales[0]?.ruc ? "MYPE Registrada" : "Demo MYPE", 45, 40);

      doc.setFont("Helvetica", "bold");
      doc.text("RUC de Trabajo:", 15, 45);
      doc.setFont("Helvetica", "normal");
      doc.text(sales[0]?.ruc || "20123456789", 45, 45);

      doc.setFont("Helvetica", "bold");
      doc.text("Regimen Fiscal:", 15, 50);
      doc.setFont("Helvetica", "normal");
      doc.text("Regimen MYPE Tributario (RMT) SUNAT", 45, 50);

      doc.setFont("Helvetica", "bold");
      doc.text("Fecha Emision:", 115, 40);
      doc.setFont("Helvetica", "normal");
      doc.text(new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }), 142, 40);

      doc.setFont("Helvetica", "bold");
      doc.text("Rango Reporte:", 115, 45);
      doc.setFont("Helvetica", "normal");
      doc.text(selectedMonth ? `Mes Filtro: ${formatMonthLabel(selectedMonth)}` : "Todos los periodos acumulados", 142, 45);

      doc.setFont("Helvetica", "bold");
      doc.text("Estado Global:", 115, 50);
      doc.setFont("Helvetica", "normal");
      doc.text("Provisional (Registro interno)", 142, 50);

      // Gray KPI cards block
      doc.setFillColor(bgGray[0], bgGray[1], bgGray[2]);
      doc.rect(15, 57, 180, 22, "F");

      // KPI content
      doc.setFontSize(8);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text("VENTAS NETAS TOTALES", 20, 63);
      doc.text("COMPRAS DECLARADAS", 65, 63);
      doc.text("IGV NETO LIQUIDADO", 110, 63);
      doc.text("RENTA PAGO A CUENTA", 155, 63);

      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(formatSol(aggregatedTotals.salesTotal), 20, 71);
      doc.text(formatSol(aggregatedTotals.purchasesTotal), 65, 71);
      
      if (aggregatedTotals.igvPayableTotal > 0) {
        doc.setTextColor(accentAmber[0], accentAmber[1], accentAmber[2]);
      } else {
        doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
      }
      doc.text(formatSol(aggregatedTotals.igvPayableTotal), 110, 71);

      doc.setTextColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
      doc.text(formatSol(aggregatedTotals.rentaTotal), 155, 71);

      // Reset text color
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);

      // Detailed Table section
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text(selectedMonth ? "Detalle Exclusivo del Periodo Filtrado" : "Detalle Consolidado de Periodos Historicos", 15, 88);

      // Table Header
      let y = 93;
      doc.setFillColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
      doc.rect(15, y, 180, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont("Helvetica", "bold");
      doc.text("Periodo", 17, y + 5);
      doc.text("Ventas Netas", 43, y + 5);
      doc.text("IGV Debito", 68, y + 5);
      doc.text("IGV Credito", 93, y + 5);
      doc.text("IGV Neto", 118, y + 5);
      doc.text("Imp. Renta", 143, y + 5);
      doc.text("Total Pagar", 165, y + 5);
      doc.text("Estado", 182, y + 5);

      // Row values
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont("Helvetica", "normal");

      const rowsToRender = monthlyCalculations.filter(row => !selectedMonth || row.month === selectedMonth);

      rowsToRender.forEach((row, idx) => {
        y += 8;
        // Alternating row background
        if (idx % 2 === 1) {
          doc.setFillColor(bgGray[0], bgGray[1], bgGray[2]);
          doc.rect(15, y, 180, 8, "F");
        }

        const combinedTaxesPayable = Math.max(0, row.igvPayable) + row.incomeTaxAdvance;
        const statusStr = (paymentStatuses[row.month] || 'pendiente') === 'pagado' ? 'PAGADO' : 'PENDIENTE';

        doc.setFontSize(7);
        doc.setFont("Helvetica", "bold");
        doc.text(formatMonthLabel(row.month), 17, y + 5);

        doc.setFont("Helvetica", "normal");
        doc.text(formatSol(row.netSales), 43, y + 5);
        doc.text(formatSol(row.igvDebit), 68, y + 5);
        doc.text(formatSol(row.igvCredit), 93, y + 5);
        doc.text(formatSol(row.igvPayable), 118, y + 5);
        doc.text(formatSol(row.incomeTaxAdvance), 143, y + 5);
        doc.setFont("Helvetica", "bold");
        doc.text(formatSol(combinedTaxesPayable), 165, y + 5);
        
        // Status print with badge colors
        if (statusStr === 'PAGADO') {
          doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
        } else if (combinedTaxesPayable === 0) {
          doc.setTextColor(120, 120, 120);
        } else {
          doc.setTextColor(accentAmber[0], accentAmber[1], accentAmber[2]);
        }
        
        doc.text(combinedTaxesPayable === 0 ? "EXENTO" : statusStr, 182, y + 5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]); // Reset
      });

      // Add a line explaining the calculation below the table
      y += 15;
      doc.setFillColor(240, 244, 255);
      doc.setDrawColor(200, 210, 230);
      doc.rect(15, y, 180, 18, "FD");

      doc.setFontSize(7.5);
      doc.setTextColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
      doc.setFont("Helvetica", "bold");
      doc.text("NOTAS RELEVANTES DE COMPLIANCE FISCAL Y MEJORA CONTABLE S.A.M.I.", 18, y + 5);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("- El IGV Credito proviene de facturas con RUC. Las boletas minoran base imponible pero no otorgan credito fiscal.", 18, y + 9);
      doc.text("- Calculo preliminar simplificado para el Regimen MYPE Tributario de acuerdo a Ley de Tributacion SUNAT.", 18, y + 13);

      // Certification Section / Sealed sign
      y += 25;
      doc.setFillColor(250, 250, 250);
      doc.rect(15, y, 180, 20, "F");
      doc.setDrawColor(220, 220, 220);
      doc.line(15, y, 195, y);
      doc.line(15, y + 20, 195, y + 20);

      doc.setFontSize(8);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFont("Helvetica", "bold");
      doc.text("RESUMEN DE LIQUIDACIÓN TRIBUTARIA MYPE", 20, y + 6);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Este reporte representa el cálculo provisional elaborado a partir de los comprobantes ingresados.", 20, y + 11);
      doc.text("Para presentar la declaración jurada mensual oficial, acceda a SUNAT Operaciones en Línea (PDT 621 / Declara Fácil).", 20, y + 15);

      // QR Box representation
      doc.setDrawColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
      doc.setLineWidth(0.4);
      doc.rect(165, y + 2, 20, 16);
      doc.setFontSize(6);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
      doc.text("RESUMEN", 168, y + 7);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(5);
      doc.text("SAMI MYPE", 168, y + 12);

      // Save PDF
      const filename = selectedMonth 
        ? `Reporte_Tributario_SAMI_${selectedMonth}.pdf`
        : `Reporte_Tributario_SAMI_Acumulado.pdf`;
      doc.save(filename);
      triggerNotification("📄 Reporte Tributario PDF descargado exitosamente.");
    } catch (e) {
      console.error(e);
      triggerNotification("⚠️ Ocurrió un error al compilar el PDF.");
    }
  };

  // Group all available months from sales and purchases or fallback to current
  const allMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Add current month in case there is no data
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonthStr);
    
    [...sales, ...purchases].forEach(inv => {
      if (inv.issueDate && inv.issueDate.length >= 7) {
        monthsSet.add(inv.issueDate.substring(0, 7));
      }
    });

    return Array.from(monthsSet).sort().reverse(); // Show newest first
  }, [sales, purchases]);

  // Compute stats per month
  const monthlyCalculations = useMemo(() => {
    return allMonths.map(month => {
      const mSales = sales.filter(s => s.issueDate && s.issueDate.startsWith(month));
      const mPurchases = purchases.filter(p => p.issueDate && p.issueDate.startsWith(month));

      let grossSales = 0;
      let netSales = 0;
      let igvDebit = 0;

      mSales.forEach(inv => {
        grossSales += inv.totalAmount;
        const base = inv.totalAmount / 1.18;
        netSales += base;
        igvDebit += (inv.totalAmount - base);
      });

      let grossPurchases = 0;
      let igvCredit = 0;

      mPurchases.forEach(inv => {
        grossPurchases += inv.totalAmount;
        if ((inv.documentType as string) === 'FACTURA' || (inv.documentType as string) === 'Factura' || inv.documentType === DocumentType.FACTURA) {
          const base = inv.totalAmount / 1.18;
          igvCredit += (inv.totalAmount - base);
        }
      });

      const igvPayable = igvDebit - igvCredit;
      
      // Régimen MYPE Tributario (RMT)
      const uitValue = 5150; // UIT 2024 indicator
      const rmtThreshold = uitValue * 300;
      const appliedRmtRate = netSales <= rmtThreshold ? 0.01 : 0.015;
      const incomeTaxAdvance = netSales * appliedRmtRate;

      const totalDisbursement = Math.max(0, igvPayable) + incomeTaxAdvance;

      return {
        month,
        grossSales,
        netSales,
        igvDebit,
        grossPurchases,
        igvCredit,
        igvPayable,
        appliedRmtRate,
        incomeTaxAdvance,
        totalDisbursement
      };
    });
  }, [allMonths, sales, purchases]);

  // Format month label
  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 15);
    const label = date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const formatSol = (val: number) => {
    return `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Aggregated totals
  const aggregatedTotals = useMemo(() => {
    let salesTotal = 0;
    let purchasesTotal = 0;
    let igvPayableTotal = 0;
    let rentaTotal = 0;

    monthlyCalculations.forEach(m => {
      salesTotal += m.grossSales;
      purchasesTotal += m.grossPurchases;
      igvPayableTotal += m.igvPayable;
      rentaTotal += m.incomeTaxAdvance;
    });

    return {
      salesTotal,
      purchasesTotal,
      igvPayableTotal,
      rentaTotal,
      taxCombined: Math.max(0, igvPayableTotal) + rentaTotal
    };
  }, [monthlyCalculations]);

  return (
    <div id="monthly-tax-summary-ledger-card" className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] border border-gray-150 dark:border-gray-700/80 shadow-sm mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700/40">
        <div>
          <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-1.5 mb-1">
            <Calculator size={14} /> Libro Tributario Dinámico
          </span>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Ficha Histórica Contable</h3>
          <p className="text-xs text-readable-muted dark:text-gray-400 mt-1">
            Resumen consolidado mes a mes de tus obligaciones tributarias líquidas (IGV y pago a cuenta I. Renta).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="download-tax-summary-pdf-btn"
            onClick={handleExportPdf}
            className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download size={14} />
            Descargar Resumen PDF
          </button>
          <button
            id="toggle-tax-rules-explanation-btn"
            onClick={() => setShowExplanation(!showExplanation)}
            className="px-4 py-2 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle size={14} />
            {showExplanation ? 'Ocultar reglas' : 'Ver reglas de cálculo'}
          </button>
        </div>
      </div>

      {notificationMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 animate-fadeIn">
          <Sparkles size={16} className="text-emerald-500 animate-pulse shrink-0" />
          <span className="font-semibold">{notificationMsg}</span>
        </div>
      )}

      {showExplanation && (
        <div id="tax-rules-explanation-box" className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 mb-6 space-y-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          <p className="font-bold text-gray-850 dark:text-white flex items-center gap-1.5">
            <Percent size={14} className="text-indigo-500 animate-pulse" /> Reglas de Liquidación del Módulo Contable SUNAT
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <span className="font-semibold text-gray-800 dark:text-gray-100">IGV Débito (Sello de Venta):</span> Se calcula del 18% del valor neto facturado en tus ventas (Monto Total / 1.18).
            </li>
            <li>
              <span className="font-semibold text-gray-800 dark:text-gray-100">IGV Crédito (Sello de Compra):</span> Proveniente únicamente de facturas de compras (con opción a crédito fiscal). Las boletas registradas se contabilizan como gastos deducibles de renta pero no aminoran tu IGV comercial.
            </li>
            <li>
              <span className="font-semibold text-gray-800 dark:text-gray-100">Impuesto a la Renta (Regimen RMT):</span> Pago a cuenta mensual del 1% sobre los ingresos netos. Si acumulas ingresos mayores a 300 UIT en el año fiscal, se aplica la tasa de 1.5%.
            </li>
          </ul>
        </div>
      )}

      {/* Grid of aggregated indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
          id="metric-ledger-sales" 
          className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-850/80"
        >
          <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">Total Facturado (Ventas)</span>
          <span className="text-sm font-black text-gray-800 dark:text-white font-mono block mt-1">
            {formatSol(aggregatedTotals.salesTotal)}
          </span>
          <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-1">
            <TrendingUp size={10} /> Ingresos totales
          </span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          id="metric-ledger-compras" 
          className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-850/80"
        >
          <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">Compras con Factura</span>
          <span className="text-sm font-black text-gray-800 dark:text-white font-mono block mt-1">
            {formatSol(aggregatedTotals.purchasesTotal)}
          </span>
          <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1 mt-1">
            <TrendingDown size={10} /> Escudo fiscal
          </span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          id="metric-ledger-igv" 
          className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-850/80"
        >
          <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">IGV Neto Acumulado</span>
          <span className={`text-sm font-black font-mono block mt-1 ${aggregatedTotals.igvPayableTotal > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {formatSol(aggregatedTotals.igvPayableTotal)}
          </span>
          <span className="text-[10px] text-readable-muted dark:text-gray-400 font-medium block mt-1">
            {aggregatedTotals.igvPayableTotal > 0 ? 'Liquidación neta por abonar' : 'Saldo global recuperable'}
          </span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          id="metric-ledger-renta" 
          className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-850/80"
        >
          <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider">Renta Pago a Cuenta</span>
          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono block mt-1">
            {formatSol(aggregatedTotals.rentaTotal)}
          </span>
          <span className="text-[10px] text-gray-400 font-normal block mt-1">
            Régimen MYPE tributario
          </span>
        </motion.div>
      </div>

      {/* Main Ledger Table */}
      <div id="monthly-tax-ledger-table-container" className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-inner">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60">
              <th className="py-4 px-5 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400">Periodo Contable</th>
              <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400 text-right">Ventas Gravadas</th>
              <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400 text-right">IGV Débito (Ventas)</th>
              <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400 text-right">IGV Crédito (Compras)</th>
              <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400 text-right">IGV Neto Mensual</th>
              <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400 text-right">Impuesto Renta</th>
              <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400 text-right">Total Tributos</th>
              <th className="py-4 px-4 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400 text-center">Estado de Pago</th>
              <th className="py-4 px-5 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400 text-center">Acción / Selección</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {monthlyCalculations.map((row) => {
              const isSelected = selectedMonth === row.month;
              const hasIgvPayable = row.igvPayable > 0;
              const combinedTaxesPayable = Math.max(0, row.igvPayable) + row.incomeTaxAdvance;

              return (
                <tr 
                  id={`tax-row-${row.month}`}
                  key={row.month} 
                  className={`group transition-all duration-350 hover:bg-gray-50/60 dark:hover:bg-gray-700/20 ${
                    isSelected ? 'bg-indigo-500/[0.04] dark:bg-indigo-950/20 border-l-[4px] border-l-indigo-500' : 'border-l-[4px] border-l-transparent'
                  }`}
                >
                  <td className="py-4 px-5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${
                        isSelected 
                          ? 'bg-indigo-500/10 text-indigo-500 border-indigo-200' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-150/50 dark:border-gray-700'
                      }`}>
                        <Calendar size={13} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-gray-850 dark:text-white block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {formatMonthLabel(row.month)}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">{row.month}</span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4 text-right whitespace-nowrap text-xs font-semibold text-gray-800 dark:text-gray-200 font-mono">
                    {formatSol(row.netSales)}
                  </td>

                  <td className="py-4 px-4 text-right whitespace-nowrap text-xs font-bold text-gray-900 dark:text-white font-mono">
                    {formatSol(row.igvDebit)}
                  </td>

                  <td className="py-4 px-4 text-right whitespace-nowrap text-xs font-bold text-gray-750 dark:text-gray-300 font-mono text-emerald-500 dark:text-emerald-400">
                    {formatSol(row.igvCredit)}
                  </td>

                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span className={`text-xs font-black font-mono ${hasIgvPayable ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {formatSol(row.igvPayable)}
                      </span>
                      <span className={`text-[8px] font-black uppercase rounded-md px-1.5 py-0.5 mt-1 select-none inline-flex items-center gap-0.5 ${
                        hasIgvPayable 
                          ? 'bg-amber-500/10 text-amber-600' 
                          : 'bg-emerald-500/10 text-emerald-600'
                      }`}>
                        {hasIgvPayable ? (
                          <>
                            <AlertTriangle size={8} />
                            Por Pagar
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={8} />
                            Saldo Favor
                          </>
                        )}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-right whitespace-nowrap text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {formatSol(row.incomeTaxAdvance)}
                  </td>

                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-gray-850 dark:text-white font-mono">
                        {formatSol(combinedTaxesPayable)}
                      </span>
                      <span className="text-[8px] text-gray-400 uppercase block font-medium">Liquidado</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    {combinedTaxesPayable === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-450 border border-emerald-250/30 select-none">
                        <CheckCircle2 size={10} className="text-emerald-550" /> Sin Tributos
                      </span>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        {/* Toggle Status Clickable Badge */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(row.month, combinedTaxesPayable > 0)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                            (paymentStatuses[row.month] || 'pendiente') === 'pagado'
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-100'
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 hover:bg-amber-100'
                          }`}
                          title="Haz clic para cambiar el estado de pago"
                        >
                          {(paymentStatuses[row.month] || 'pendiente') === 'pagado' ? (
                            <>
                              <Check size={10} className="stroke-[3px]" />
                              Pagado
                            </>
                          ) : (
                            <>
                              <Clock size={10} className="stroke-[3px] animate-pulse" />
                              Pendiente
                            </>
                          )}
                        </button>

                        {/* One-click Schedule Reminder button */}
                        {(paymentStatuses[row.month] || 'pendiente') === 'pendiente' && (
                          <button
                            type="button"
                            onClick={() => handleScheduleReminder(row.month, row.igvPayable, row.incomeTaxAdvance, combinedTaxesPayable)}
                            disabled={!!scheduledMonths[row.month]}
                            className={`p-1.5 rounded-xl transition-all inline-flex items-center justify-center gap-1 border cursor-pointer select-none ${
                              scheduledMonths[row.month]
                                ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed'
                                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/40 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 hover:border-indigo-600'
                            }`}
                            title={scheduledMonths[row.month] ? "Recordatorio programado" : "Programar recordatorio en Módulo de Tareas con 1 clic"}
                          >
                            <Bell size={11} className={scheduledMonths[row.month] ? "" : "animate-bounce"} />
                            <span className="text-[8px] font-black uppercase tracking-wider px-0.5">
                              {scheduledMonths[row.month] ? 'Agendado' : 'Recordar'}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-4 px-5 text-center whitespace-nowrap text-xs">
                    {onMonthSelect ? (
                      <button
                        id={`select-month-btn-${row.month}`}
                        type="button"
                        onClick={() => onMonthSelect(row.month)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-sm font-black' 
                            : 'bg-gray-100 hover:bg-gray-150 dark:bg-gray-700/60 dark:hover:bg-gray-700 font-bold text-gray-650 dark:text-gray-300'
                        }`}
                      >
                        {isSelected ? 'Activo' : 'Ver Detalle'}
                        <ArrowRight size={10} />
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-gray-400">Sincronizado</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visual footer tips */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-950/20 border border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-550 leading-relaxed font-semibold">
        <span>Sincronizado al instante con tu base de facturas autorizadas del Módulo Contable. Estilo PDT 621 SUNAT.</span>
        <span className="text-indigo-500 font-black">SAMI FinTech • Control Fiscal Seguro</span>
      </div>
    </div>
  );
};
