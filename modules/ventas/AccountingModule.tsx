
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Invoice, TaxSummary } from '../../types';
import { InvoiceType, DocumentType } from '../../types';
import { calculateTaxes, calculateTaxesSync } from '../../services/accountingService';
import { maskRUC, maskCurrency } from '../../services/maskingUtils';
import { isValidRUC } from '../../services/riskService';
import { validateRucWithSunat } from '../../services/pseService';
import { Calendar, Filter, X, Info, Download, Lightbulb, Printer, Eye, FileText, CheckCircle2 } from 'lucide-react';
import TermTooltip from '../glosario/TermTooltip';

interface AccountingModuleProps {
    sales: Invoice[];
    purchases: Invoice[];
    onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
}

function numberToWordsPE(amount: number): string {
  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  const centsStr = cents < 10 ? `0${cents}` : `${cents}`;

  if (whole === 0) return `CERO CON ${centsStr}/100 SOLES`;
  if (whole === 100) return `CIEN CON ${centsStr}/100 SOLES`;

  function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    let res = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h > 0) res += hundreds[h] + ' ';

    if (rem >= 10 && rem < 20) {
      res += teens[rem - 10];
    } else if (rem >= 20 && rem < 30) {
      if (rem === 20) res += 'VEINTE';
      else res += 'VEINTI' + units[rem - 20];
    } else if (rem >= 30) {
      const t = Math.floor(rem / 10);
      const u = rem % 10;
      res += tens[t];
      if (u > 0) res += ' Y ' + units[u];
    } else if (rem > 0) {
      res += units[rem];
    }
    return res.trim();
  }

  let result = '';
  if (whole >= 1000) {
    const k = Math.floor(whole / 1000);
    const rest = whole % 1000;
    if (k === 1) result += 'MIL ';
    else result += convertGroup(k) + ' MIL ';
    if (rest > 0) result += convertGroup(rest);
  } else {
    result = convertGroup(whole);
  }

  return `SON: ${result.trim()} CON ${centsStr}/100 SOLES`;
}

const AccountingModule: React.FC<AccountingModuleProps> = ({ sales, purchases, onAddInvoice }) => {
    const [activeTab, setActiveTab] = useState<InvoiceType>(InvoiceType.SALE);
    const [error, setError] = useState<string | null>(null);
    const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);

    // Filter state
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const handleExportCSV = () => {
        const dataToExport = activeTab === InvoiceType.SALE ? filteredSales : filteredPurchases;
        if (dataToExport.length === 0) {
            setError(`No hay ${activeTab === InvoiceType.SALE ? 'ventas' : 'compras'} para exportar en el rango seleccionado.`);
            return;
        }

        const headers = ["Tipo Doc.", "Serie", "Correlativo", "Fecha", "RUC", "Monto Total"];
        const rows = dataToExport.map(inv => [
            inv.documentType === DocumentType.FACTURA ? 'Factura' : 'Boleta',
            inv.series,
            inv.correlative,
            inv.issueDate,
            inv.ruc || 'N/A',
            inv.totalAmount.toFixed(2)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const fileName = `SAMI_Export_${activeTab === InvoiceType.SALE ? 'Ventas' : 'Compras'}_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Form state
    const [documentType, setDocumentType] = useState<DocumentType>(DocumentType.FACTURA);
    const [series, setSeries] = useState('');
    const [correlative, setCorrelative] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [ruc, setRuc] = useState('');
    const [totalAmount, setTotalAmount] = useState('');

    const [isRucValidating, setIsRucValidating] = useState(false);
    const [rucSunatError, setRucSunatError] = useState<string | null>(null);
    const [rucValidationNote, setRucValidationNote] = useState<string | null>(null);

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Validate RUC with SUNAT when it changes to 11 digits
    useEffect(() => {
        const validateRuc = async () => {
            if (documentType === DocumentType.FACTURA && ruc.length === 11) {
                if (isValidRUC(ruc)) {
                    setIsRucValidating(true);
                    setRucSunatError(null);
                    try {
                        const result = await validateRucWithSunat(ruc);
                        setRucValidationNote(result.isSimulated ? `Validación de RUC simulada: ${result.sourceLabel}` : `Validado contra ${result.sourceLabel}`);
                        if (!result.active) {
                            setRucSunatError('El RUC no está ACTIVO en SUNAT.');
                        } else if (result.condition !== 'HABIDO') {
                            setRucSunatError(`El RUC tiene condición de ${result.condition} (No HABIDO).`);
                        }
                    } catch (err) {
                        setRucSunatError('Error al conectar con SUNAT para validar el RUC.');
                    } finally {
                        setIsRucValidating(false);
                    }
                } else {
                    setRucSunatError('Dígito de control de RUC inválido.');
                }
            } else {
                setRucSunatError(null);
                setRucValidationNote(null);
            }
        };

        const timer = setTimeout(validateRuc, 500); // Debounce
        return () => clearTimeout(timer);
    }, [ruc, documentType]);

    const filteredSales = useMemo(() => {
        return sales.filter(inv => {
            if (filterStartDate && inv.issueDate < filterStartDate) return false;
            if (filterEndDate && inv.issueDate > filterEndDate) return false;
            return true;
        });
    }, [sales, filterStartDate, filterEndDate]);

    const filteredPurchases = useMemo(() => {
        return purchases.filter(inv => {
            if (filterStartDate && inv.issueDate < filterStartDate) return false;
            if (filterEndDate && inv.issueDate > filterEndDate) return false;
            return true;
        });
    }, [purchases, filterStartDate, filterEndDate]);

    const taxSummary: TaxSummary | null = useMemo(() => {
        if (filteredSales.length === 0 && filteredPurchases.length === 0) return null;
        try {
            return calculateTaxesSync(filteredSales, filteredPurchases);
        } catch (e: any) {
            console.error("Tax calculation error:", e.message);
            return null;
        }
    }, [filteredSales, filteredPurchases]);

    const resetForm = () => {
        setDocumentType(DocumentType.FACTURA);
        setSeries('');
        setCorrelative('');
        setIssueDate(new Date().toISOString().split('T')[0]);
        setRuc('');
        setTotalAmount('');
        setRucSunatError(null);
        setError(null);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        
        // Series validation
        if (!series) {
            errors.series = 'La serie es obligatoria.';
        } else if (!/^[FB][A-Z0-9]{3}$/.test(series.toUpperCase())) {
            errors.series = 'La serie debe tener 4 caracteres (ej: F001, B001).';
        } else if (documentType === DocumentType.FACTURA && !series.toUpperCase().startsWith('F')) {
            errors.series = 'Las facturas deben empezar con "F".';
        } else if (documentType === DocumentType.BOLETA && !series.toUpperCase().startsWith('B')) {
            errors.series = 'Las boletas deben empezar con "B".';
        }

        // Correlative validation
        if (!correlative) {
            errors.correlative = 'El correlativo es obligatorio.';
        } else if (parseInt(correlative, 10) <= 0) {
            errors.correlative = 'El correlativo debe ser un número positivo.';
        }

        // RUC validation
        if (documentType === DocumentType.FACTURA) {
            if (!ruc) {
                errors.ruc = 'El RUC es obligatorio para facturas.';
            } else if (!/^\d{11}$/.test(ruc)) {
                errors.ruc = 'El RUC debe tener exactamente 11 dígitos numéricos.';
            } else if (!isValidRUC(ruc)) {
                errors.ruc = 'RUC inválido (error de dígito de control). Verifique el número.';
            } else if (rucSunatError) {
                errors.ruc = rucSunatError;
            }
        }

        // Amount validation
        if (!totalAmount) {
            errors.totalAmount = 'El monto total es obligatorio.';
        } else if (parseFloat(totalAmount) <= 0) {
            errors.totalAmount = 'El monto debe ser mayor a cero.';
        }

        // Date validation
        if (!issueDate) {
            errors.issueDate = 'La fecha es obligatoria.';
        } else {
            const selectedDate = new Date(issueDate);
            const today = new Date();
            if (selectedDate > today) {
                errors.issueDate = 'La fecha no puede ser en el futuro.';
            }
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddInvoiceSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});

        if (isRucValidating) {
            setError('Esperando validación de RUC con SUNAT...');
            return;
        }

        if (!validateForm()) {
            setError('Por favor, corrija los errores en el formulario.');
            return;
        }

        const newInvoiceData = {
            type: activeTab,
            documentType,
            series: series.toUpperCase(),
            correlative: parseInt(correlative, 10),
            issueDate,
            ruc: documentType === DocumentType.FACTURA ? ruc : undefined,
            totalAmount: parseFloat(totalAmount),
        };

        try {
            onAddInvoice(newInvoiceData);
            resetForm();
            setFieldErrors({});
        } catch (err: any) {
            setError(err.message);
        }
    };

    const renderInvoiceList = (invoices: Invoice[]) => (
        <div className="overflow-x-auto">
            {/* Printable Report Header for full register print */}
            <div className="hidden print:block mb-4 p-4 border-b border-gray-300">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase">MI EMPRESA MYPE S.A.C.</h2>
                        <p className="text-xs text-gray-600">RUC: 20601234567 | Registro Oficial de Comprobantes SUNAT</p>
                    </div>
                    <div className="text-right text-xs">
                        <p className="font-bold">Módulo Contable SAMI</p>
                        <p className="text-gray-500">Tipo: {activeTab === InvoiceType.SALE ? 'REGISTRO DE VENTAS' : 'REGISTRO DE COMPRAS'}</p>
                        <p className="text-gray-500">Emisión: {new Date().toLocaleDateString('es-PE')}</p>
                    </div>
                </div>
            </div>

            <table className="w-full min-w-[640px] bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo Doc.</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Serie-Correl.</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">RUC</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto Total</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print print:hidden">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {invoices.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-10 text-sm text-gray-500 font-medium bg-gray-50/30 dark:bg-gray-800/20">
                                No hay comprobantes registrados en este rango.
                            </td>
                        </tr>
                    ) : (
                        invoices.map(inv => (
                            <tr 
                                key={inv.id}
                                className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group"
                            >
                                <td className="px-4 py-4 whitespace-nowrap text-xs font-black text-gray-500 uppercase tracking-widest">{inv.documentType === 'FACTURA' ? 'Factura' : 'Boleta'}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-indigo-600 dark:text-indigo-400 font-black">{inv.series}-{inv.correlative}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-600 dark:text-gray-400">{inv.issueDate}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{maskRUC(inv.ruc) || 'N/A'}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-black text-gray-900 dark:text-white">{maskCurrency(inv.totalAmount, `S/ ${inv.totalAmount.toFixed(2)}`)}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-center no-print print:hidden">
                                    <button 
                                        onClick={() => setSelectedInvoiceForPrint(inv)}
                                        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                                        title="Ver e imprimir comprobante electrónico SUNAT"
                                        aria-label={`Imprimir comprobante ${inv.series}-${inv.correlative}`}
                                    >
                                        <Printer size={16} />
                                        <span>Imprimir</span>
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
    
    return (
        <div className="container mx-auto p-4 max-w-7xl h-full flex flex-col gap-6">
            <header className="no-print print:hidden">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Módulo Contable</h1>
                <p className="text-gray-600 dark:text-gray-400">Registre sus comprobantes de venta y compra para un cálculo preliminar de sus impuestos.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 mb-6 flex gap-3 no-print print:hidden">
                      <Lightbulb size={24} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-300">¿Cómo funciona esto?</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Cada vez que vendes o compras algo, anótalo aquí. SAMI suma todo y te dice cuánto le debes a <TermTooltip term="SUNAT">SUNAT</TermTooltip> al final del mes. Así no te sorprendes.
                        </p>
                      </div>
                    </div>
                    <form onSubmit={handleAddInvoiceSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 no-print print:hidden">
                        <h3 className="md:col-span-2 text-lg font-semibold text-gray-700 dark:text-gray-200">
                            {activeTab === InvoiceType.SALE ? '¿Cuánto vendiste hoy?' : '¿Cuánto compraste?'}
                        </h3>
                        <div>
                            <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">¿Qué tipo de documento emitiste?</label>
                            <select id="documentType" value={documentType} onChange={e => setDocumentType(e.target.value as DocumentType)} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                <option value={DocumentType.FACTURA}>Factura</option>
                                <option value={DocumentType.BOLETA}>Boleta de Venta</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Emisión</label>
                            <input 
                                type="date" 
                                id="issueDate" 
                                value={issueDate} 
                                onChange={e => setIssueDate(e.target.value)} 
                                className={`mt-1 input-field focus:border-brand-500 focus:ring-4 focus:ring-brand-100 ${fieldErrors.issueDate ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}`}
                                aria-describedby={fieldErrors.issueDate ? "issueDate-error" : undefined}
                            />
                            {fieldErrors.issueDate && <p id="issueDate-error" role="alert" className="mt-1 text-xs text-red-500">{fieldErrors.issueDate}</p>}
                        </div>
                        <div>
                            <label htmlFor="series" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serie del comprobante (ej: F001)</label>
                            <input 
                                type="text" 
                                id="series" 
                                value={series} 
                                onChange={e => setSeries(e.target.value)} 
                                placeholder={documentType === DocumentType.FACTURA ? 'F001' : 'B001'} 
                                className={`mt-1 input-field focus:border-brand-500 focus:ring-4 focus:ring-brand-100 ${fieldErrors.series ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}`}
                                aria-describedby={fieldErrors.series ? "series-error" : undefined}
                            />
                            {fieldErrors.series && <p id="series-error" role="alert" className="mt-1 text-xs text-red-500">{fieldErrors.series}</p>}
                        </div>
                        <div>
                            <label htmlFor="correlative" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número del comprobante (ej: 00123)</label>
                            <input 
                                type="number" 
                                id="correlative" 
                                value={correlative} 
                                onChange={e => setCorrelative(e.target.value)} 
                                placeholder="12345" 
                                className={`mt-1 input-field focus:border-brand-500 focus:ring-4 focus:ring-brand-100 ${fieldErrors.correlative ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}`}
                                aria-describedby={fieldErrors.correlative ? "correlative-error" : undefined}
                            />
                            {fieldErrors.correlative && <p id="correlative-error" role="alert" className="mt-1 text-xs text-red-500">{fieldErrors.correlative}</p>}
                        </div>
                        {documentType === DocumentType.FACTURA && (
                           <div className="md:col-span-2">
                                <label htmlFor="ruc" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <TermTooltip term="RUC">RUC</TermTooltip> de quien te compró (solo <TermTooltip term="Factura">facturas</TermTooltip>)
                                </label>
                                <input 
                                    type="text" 
                                    id="ruc" 
                                    value={ruc} 
                                    onChange={e => setRuc(e.target.value)} 
                                    placeholder="10..." 
                                    maxLength={11} 
                                    className={`mt-1 input-field focus:ring-4 ${
                                        ruc 
                                            ? (/^\d{11}$/.test(ruc) 
                                                ? '!border-emerald-500 focus:!border-emerald-500 focus:!ring-emerald-100 dark:focus:!ring-emerald-900/30' 
                                                : '!border-rose-500 focus:!border-rose-500 focus:!ring-rose-100 dark:focus:!ring-rose-900/30')
                                            : (fieldErrors.ruc || rucSunatError
                                                ? '!border-red-500 focus:!border-red-500 focus:!ring-red-100 dark:focus:!ring-red-900/30'
                                                : '')
                                    }`}
                                    aria-describedby={fieldErrors.ruc || rucSunatError ? "ruc-error" : undefined}
                                />
                                {isRucValidating && (
                                    <div className="mt-1 flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-[10px] text-blue-500 font-medium">Validando RUC...</span>
                                    </div>
                                )}
                                {(fieldErrors.ruc || rucSunatError) && (
                                    <p id="ruc-error" role="alert" className="mt-1 text-xs text-red-500 font-medium flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {fieldErrors.ruc || rucSunatError}
                                    </p>
                                )}
                                {rucValidationNote && !isRucValidating && !(fieldErrors.ruc || rucSunatError) && (
                                    <p role="status" className="mt-1 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                                        {rucValidationNote}
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="md:col-span-2">
                             <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto total en soles (S/)</label>
                             <input 
                                type="number" 
                                id="totalAmount" 
                                value={totalAmount} 
                                onChange={e => setTotalAmount(e.target.value)} 
                                placeholder="118.00" 
                                step="0.01" 
                                className={`mt-1 input-field focus:border-brand-500 focus:ring-4 focus:ring-brand-100 ${fieldErrors.totalAmount ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}`}
                                aria-describedby={fieldErrors.totalAmount ? "totalAmount-error" : undefined}
                             />
                             {fieldErrors.totalAmount && <p id="totalAmount-error" role="alert" className="mt-1 text-xs text-red-500">{fieldErrors.totalAmount}</p>}
                        </div>

                        {error && <p className="md:col-span-2 text-sm text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-200 p-2 rounded-md">{error}</p>}

                        <div className="md:col-span-2 text-right">
                           <button 
                            type="submit" 
                            disabled={isRucValidating || (documentType === DocumentType.FACTURA && !!rucSunatError)}
                            className={`inline-flex items-center justify-center min-h-[44px] py-2.5 px-6 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white transition-all cursor-pointer
                                ${isRucValidating || (documentType === DocumentType.FACTURA && !!rucSunatError)
                                    ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0'
                                }`}
                           >
                             {isRucValidating ? 'Validando RUC...' : '✓ Guardar'}
                           </button>
                        </div>
                    </form>

                    <div className="border-b border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print print:hidden">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button onClick={() => setActiveTab(InvoiceType.SALE)} className={`${activeTab === InvoiceType.SALE ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-black' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-600 font-medium'} min-h-[44px] whitespace-nowrap py-3 px-2 border-b-2 text-sm uppercase tracking-widest transition-all cursor-pointer`}>
                                Lo que vendí
                            </button>
                            <button onClick={() => setActiveTab(InvoiceType.PURCHASE)} className={`${activeTab === InvoiceType.PURCHASE ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-black' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-600 font-medium'} min-h-[44px] whitespace-nowrap py-3 px-2 border-b-2 text-sm uppercase tracking-widest transition-all cursor-pointer`}>
                                Lo que compré
                            </button>
                        </nav>
                        
                        <div className="flex items-center gap-3 py-2 lg:py-0 flex-wrap">
                            <button 
                                onClick={() => window.print()}
                                className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all active:scale-95 cursor-pointer no-print print:hidden"
                                title="Imprimir lista filtrada de comprobantes"
                            >
                                <Printer size={15} />
                                Imprimir Registro
                            </button>

                            <button 
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all active:scale-95 cursor-pointer no-print print:hidden"
                            >
                                <Download size={15} />
                                Exportar CSV
                            </button>

                            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em] no-print print:hidden">
                                <Filter size={14} className="text-gray-400" />
                                <span>Emisión:</span>
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/30 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner no-print print:hidden">
                                <div className="flex items-center gap-3 px-3">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-gray-400 uppercase">Inicio</span>
                                        <input 
                                            type="date" 
                                            value={filterStartDate} 
                                            onChange={e => setFilterStartDate(e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-black focus:ring-0 p-0 text-gray-700 dark:text-gray-200"
                                        />
                                    </div>
                                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-gray-400 uppercase">Fin</span>
                                        <input 
                                            type="date" 
                                            value={filterEndDate} 
                                            onChange={e => setFilterEndDate(e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-black focus:ring-0 p-0 text-gray-700 dark:text-gray-200"
                                        />
                                    </div>
                                </div>
                                {(filterStartDate || filterEndDate) && (
                                    <button 
                                        onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                                        className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 bg-white dark:bg-gray-800 text-[9px] font-black text-red-500 uppercase tracking-widest rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95 cursor-pointer"
                                        title="Limpiar filtros"
                                    >
                                        <X size={14} />
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        {activeTab === InvoiceType.SALE ? renderInvoiceList(filteredSales) : renderInvoiceList(filteredPurchases)}
                    </div>

                </div>

                <div className="lg:col-span-1 no-print print:hidden">
                    <div className="bg-blue-50 dark:bg-gray-800 p-6 rounded-lg shadow-md sticky top-6">
                        <h2 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-4">¿Cuánto debo a <TermTooltip term="SUNAT">SUNAT</TermTooltip> este mes?</h2>
                        {taxSummary ? (
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Total Ventas:</span>
                                    <span className="font-semibold text-gray-800 dark:text-white">{maskCurrency(taxSummary.totalSales, `S/ ${taxSummary.totalSales.toFixed(2)}`)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Total Compras:</span>
                                    <span className="font-semibold text-gray-800 dark:text-white">{maskCurrency(taxSummary.totalPurchases, `S/ ${taxSummary.totalPurchases.toFixed(2)}`)}</span>
                                </div>
                                <hr className="my-2 border-gray-200 dark:border-gray-600"/>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400"><TermTooltip term="IGV">IGV</TermTooltip> cobrado en mis ventas:</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">{taxSummary.igvDebit > 0 ? '+' : ''} {maskCurrency(taxSummary.igvDebit, `S/ ${taxSummary.igvDebit.toFixed(2)}`)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400"><TermTooltip term="IGV">IGV</TermTooltip> pagado en mis compras:</span>
                                    <span className="font-semibold text-red-600 dark:text-red-400">{taxSummary.igvCredit > 0 ? '-' : ''} {maskCurrency(taxSummary.igvCredit, `S/ ${taxSummary.igvCredit.toFixed(2)}`)}</span>
                                </div>
                                <div className="flex justify-between text-base mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <span className="font-bold text-gray-800 dark:text-white"><TermTooltip term="IGV">IGV</TermTooltip> que debo pagar a <TermTooltip term="SUNAT">SUNAT</TermTooltip>:</span>
                                    <span className="font-bold text-blue-700 dark:text-blue-400">{maskCurrency(taxSummary.igvPayable, `S/ ${taxSummary.igvPayable.toFixed(2)}`)}</span>
                                </div>
                                <hr className="my-2 border-gray-200 dark:border-gray-600"/>
                                 <div className="flex justify-between items-start text-base mt-2">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                                            Pago a cuenta del Impuesto a la Renta
                                            <div className="group relative">
                                                <Info size={12} className="text-blue-400 cursor-help" />
                                                <div className="absolute left-0 bottom-full mb-2 w-48 bg-gray-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-white/10 leading-relaxed font-normal">
                                                    <p className="font-bold mb-1">Régimen MYPE Tributario:</p>
                                                    <ul className="list-disc pl-3 space-y-1">
                                                        <li>Ventas ≤ 300 UIT: <span className="text-indigo-300 font-bold">1.0%</span></li>
                                                        <li>Ventas &gt; 300 UIT: <span className="text-indigo-300 font-bold">1.5%</span></li>
                                                    </ul>
                                                    <p className="mt-1 border-t border-white/10 pt-1 italic opacity-70">UIT 2024: S/ 5,150</p>
                                                </div>
                                            </div>
                                        </span>
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                            Escala: {(taxSummary.appliedRmtRate * 100).toFixed(1)}% 
                                            {taxSummary.appliedRmtRate > 0.01 ? ' (Excede 300 UIT)' : ' (Dentro del límite)'}
                                        </span>
                                    </div>
                                    <span className="font-bold text-blue-700 dark:text-blue-400">{maskCurrency(taxSummary.incomeTaxAdvance, `S/ ${taxSummary.incomeTaxAdvance.toFixed(2)}`)}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Agregue comprobantes para ver el resumen de impuestos.</p>
                        )}
                         <p className="text-xs text-gray-500 dark:text-gray-500 mt-6 italic">* Este es un cálculo referencial y no reemplaza la determinación de un contador profesional.</p>
                    </div>
                </div>
            </div>

            {/* Printable Electronic Voucher Modal */}
            <AnimatePresence>
                {selectedInvoiceForPrint && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 printable-voucher relative"
                        >
                            {/* Header Controls (hidden on print) */}
                            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800 no-print print:hidden">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                    <FileText size={18} />
                                    <span>Comprobante de Pago Electrónico SUNAT</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => window.print()}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer"
                                    >
                                        <Printer size={15} />
                                        Imprimir / Guardar PDF
                                    </button>
                                    <button
                                        onClick={() => setSelectedInvoiceForPrint(null)}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                        aria-label="Cerrar vista de impresión"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Printable Voucher Body */}
                            <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6 text-xs font-sans print:border-slate-300 print:p-0">
                                
                                {/* Company Header & Official SUNAT Voucher Box */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-200">
                                    <div className="sm:col-span-7 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">S</div>
                                            <h2 className="text-lg font-black tracking-tight text-slate-900">MI EMPRESA MYPE S.A.C.</h2>
                                        </div>
                                        <p className="font-bold text-slate-700">RUC: 20601234567</p>
                                        <p className="text-slate-500">Av. Javier Prado Este Nro. 456, Int. 301, San Isidro, Lima - Perú</p>
                                        <p className="text-slate-500">Teléf: (01) 456-7890 | Email: facturacion@mype.pe</p>
                                    </div>

                                    <div className="sm:col-span-5 bg-slate-50 rounded-2xl p-4 border-2 border-slate-800 text-center space-y-2">
                                        <p className="font-bold text-slate-800">R.U.C. N° 20601234567</p>
                                        <div className="py-1 px-2 bg-slate-900 text-white font-black uppercase text-xs tracking-wider rounded-lg">
                                            {selectedInvoiceForPrint.documentType === DocumentType.FACTURA ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'}
                                        </div>
                                        <p className="font-mono font-black text-base text-indigo-700">
                                            N° {selectedInvoiceForPrint.series}-{String(selectedInvoiceForPrint.correlative).padStart(8, '0')}
                                        </p>
                                    </div>
                                </div>

                                {/* Customer & Issue Date Metadata */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 text-xs">
                                    <div>
                                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Señor(es) / Adquiriente:</p>
                                        <p className="font-bold text-slate-800">
                                            {selectedInvoiceForPrint.ruc ? `CLIENTE RUC ${selectedInvoiceForPrint.ruc}` : 'CLIENTES VARIOS / PÚBLICO GENERAL'}
                                        </p>
                                        {selectedInvoiceForPrint.ruc && (
                                            <p className="font-mono text-slate-600 mt-0.5">RUC: {selectedInvoiceForPrint.ruc}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-bold uppercase text-[9px]">Fecha de Emisión:</span>
                                            <span className="font-mono font-bold text-slate-800">{selectedInvoiceForPrint.issueDate}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-bold uppercase text-[9px]">Moneda:</span>
                                            <span className="font-bold text-slate-800">SOLES (PEN)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 font-bold uppercase text-[9px]">Forma de Pago:</span>
                                            <span className="font-bold text-emerald-600">Contado</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Itemized Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[640px] text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-y border-slate-200">
                                                <th className="p-2 w-12 text-center">Cant.</th>
                                                <th className="p-2 w-20 text-center">Unidad</th>
                                                <th className="p-2">Descripción / Concepto</th>
                                                <th className="p-2 text-right">V. Unit.</th>
                                                <th className="p-2 text-right">IGV (18%)</th>
                                                <th className="p-2 text-right">Importe Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 text-xs font-mono">
                                            <tr>
                                                <td className="p-2 text-center font-bold">1.00</td>
                                                <td className="p-2 text-center text-slate-500">ZZ (Serv/BI)</td>
                                                <td className="p-2 font-sans font-medium text-slate-800">
                                                    {selectedInvoiceForPrint.documentType === DocumentType.FACTURA
                                                        ? 'VENTA COMERCIAL DE BIENES / SERVICIOS CONTABLES MYPE'
                                                        : 'VENTA DE PRODUCTOS AL CONTADO / COMPROBANTE DE VENTA'
                                                    }
                                                </td>
                                                <td className="p-2 text-right text-slate-600">
                                                    S/ {(selectedInvoiceForPrint.totalAmount / 1.18).toFixed(2)}
                                                </td>
                                                <td className="p-2 text-right text-slate-600">
                                                    S/ {(selectedInvoiceForPrint.totalAmount - selectedInvoiceForPrint.totalAmount / 1.18).toFixed(2)}
                                                </td>
                                                <td className="p-2 text-right font-black text-slate-900">
                                                    S/ {selectedInvoiceForPrint.totalAmount.toFixed(2)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Breakdown & Words */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-4 border-t border-slate-200 items-end">
                                    <div className="sm:col-span-7 space-y-3">
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Monto en letras:</p>
                                            <p className="font-bold text-slate-900 uppercase mt-0.5">
                                                {numberToWordsPE(selectedInvoiceForPrint.totalAmount)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-16 bg-slate-900 rounded-lg p-1.5 flex items-center justify-center shrink-0">
                                                <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm8-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm13-2h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-3h3v3h-3v-3zm0 5h3v3h-3v-3z" />
                                                </svg>
                                            </div>
                                            <div className="text-[10px] text-slate-500 space-y-1">
                                                <p className="font-mono font-bold">Código Hash SUNAT: <span className="text-slate-800">A8x9+KzL7w12=mN90q</span></p>
                                                <p>Representación impresa de la {selectedInvoiceForPrint.documentType === DocumentType.FACTURA ? 'Factura' : 'Boleta de Venta'} Electrónica. Autorizado mediante Resolución Intendencia SUNAT.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="sm:col-span-5 space-y-2 font-mono text-xs text-right">
                                        <div className="flex justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-500 font-sans">Op. Gravada:</span>
                                            <span className="font-bold">S/ {(selectedInvoiceForPrint.totalAmount / 1.18).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-500 font-sans">IGV (18%):</span>
                                            <span className="font-bold">S/ {(selectedInvoiceForPrint.totalAmount - selectedInvoiceForPrint.totalAmount / 1.18).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm">
                                            <span className="font-sans font-black uppercase">TOTAL A PAGAR:</span>
                                            <span className="font-black text-indigo-700">S/ {selectedInvoiceForPrint.totalAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer note */}
                                <div className="text-center pt-4 border-t border-slate-100 text-[10px] text-slate-400">
                                    <p>Consulte la validez de este comprobante en www.sunat.gob.pe — SAMI AI Fintech Platform</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AccountingModule;
