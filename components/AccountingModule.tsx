
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Invoice, TaxSummary } from '../types';
import { InvoiceType, DocumentType } from '../types';
import { calculateTaxes } from '../services/accountingService';
import { maskRUC, maskCurrency } from '../services/maskingUtils';
import { isValidRUC } from '../services/riskService';
import { validateRucWithSunat } from '../services/pseService';
import { Calendar, Filter, X, Info, Download, Lightbulb } from 'lucide-react';
import TermTooltip from './TermTooltip';

interface AccountingModuleProps {
    sales: Invoice[];
    purchases: Invoice[];
    onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
}

const AccountingModule: React.FC<AccountingModuleProps> = ({ sales, purchases, onAddInvoice }) => {
    const [activeTab, setActiveTab] = useState<InvoiceType>(InvoiceType.SALE);
    const [error, setError] = useState<string | null>(null);

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
            return calculateTaxes(filteredSales, filteredPurchases);
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
            <table className="min-w-full bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo Doc.</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Serie-Correl.</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">RUC</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {invoices.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="text-center py-10 text-sm text-gray-500 font-medium bg-gray-50/30 dark:bg-gray-800/20">
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
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
    
    return (
        <div className="container mx-auto p-4 max-w-7xl h-full flex flex-col gap-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Módulo Contable</h1>
                <p className="text-gray-600 dark:text-gray-400">Registre sus comprobantes de venta y compra para un cálculo preliminar de sus impuestos.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 mb-6 flex gap-3">
                      <Lightbulb size={24} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-300">¿Cómo funciona esto?</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Cada vez que vendes o compras algo, anótalo aquí. SAMI suma todo y te dice cuánto le debes a <TermTooltip term="SUNAT">SUNAT</TermTooltip> al final del mes. Así no te sorprendes.
                        </p>
                      </div>
                    </div>
                    <form onSubmit={handleAddInvoiceSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                                        <span className="text-[10px] text-blue-500 font-medium">Validando con SUNAT...</span>
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
                            className={`inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white transition-all
                                ${isRucValidating || (documentType === DocumentType.FACTURA && !!rucSunatError)
                                    ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0'
                                }`}
                           >
                             {isRucValidating ? 'Validando RUC...' : '✓ Guardar'}
                           </button>
                        </div>
                    </form>

                    <div className="border-b border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button onClick={() => setActiveTab(InvoiceType.SALE)} className={`${activeTab === InvoiceType.SALE ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-black' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-600 font-medium'} whitespace-nowrap py-4 px-1 border-b-2 text-sm uppercase tracking-widest transition-all`}>
                                Lo que vendí
                            </button>
                            <button onClick={() => setActiveTab(InvoiceType.PURCHASE)} className={`${activeTab === InvoiceType.PURCHASE ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-black' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-600 font-medium'} whitespace-nowrap py-4 px-1 border-b-2 text-sm uppercase tracking-widest transition-all`}>
                                Lo que compré
                            </button>
                        </nav>
                        
                        <div className="flex items-center gap-4 py-2 lg:py-0">
                            <button 
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all active:scale-95"
                            >
                                <Download size={14} />
                                Exportar CSV
                            </button>
                            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                                <Filter size={14} className="text-gray-400" />
                                <span>Emisión:</span>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/30 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
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
                                        className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 text-[9px] font-black text-red-500 uppercase tracking-widest rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95"
                                        title="Limpiar filtros"
                                    >
                                        <X size={12} />
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

                <div className="lg:col-span-1">
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
        </div>
    );
};

export default AccountingModule;
