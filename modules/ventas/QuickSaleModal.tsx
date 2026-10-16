// components/QuickSaleModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Receipt, AlertCircle } from 'lucide-react';
import { Invoice, InvoiceType, DocumentType } from '../../types';
import { getNextCorrelative } from '../../core/services/accountingService';

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  sales?: Invoice[];
  existingSalesCount?: number;
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

const QuickSaleModal: React.FC<QuickSaleModalProps> = ({ isOpen, onClose, onAddInvoice, sales = [], existingSalesCount }) => {
  const [amount, setAmount] = useState('');
  const [docType, setDocType] = useState<DocumentType>(DocumentType.BOLETA);
  const [ruc, setRuc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setAmount('');
      setRuc('');
      setError(null);
      setSuccess(false);
      setSaleDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    setError(null);
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError('Por favor ingrese un monto válido mayor a 0.');
      return;
    }

    if (docType === DocumentType.FACTURA) {
      if (!ruc) {
        setError('El RUC es obligatorio para emitir Factura.');
        return;
      }
      if (!/^\d{11}$/.test(ruc)) {
        setError('El RUC debe tener exactamente 11 dígitos numéricos.');
        return;
      }
    }

    try {
      const correlative = getNextCorrelative(docType, sales);
      onAddInvoice({
        type: InvoiceType.SALE,
        documentType: docType,
        series: docType === DocumentType.BOLETA ? 'B001' : 'F001',
        correlative,
        issueDate: saleDate,
        ruc: docType === DocumentType.FACTURA ? ruc : undefined,
        totalAmount: num,
      });

      setSuccess(true);
      setTimeout(() => {
        setAmount('');
        setRuc('');
        setError(null);
        setSuccess(false);
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Error al procesar la venta. Verifique los datos ingresados.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-sale-title"
            aria-describedby="quick-sale-desc"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-[2rem] p-5 sm:p-6 pb-6 shadow-2xl animate-slide-in max-h-[92dvh] flex flex-col"
          >
            {/* Handle */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 shrink-0" aria-hidden="true" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center" aria-hidden="true">
                  <Zap size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 id="quick-sale-title" className="text-xl font-black text-slate-900 dark:text-white">Registrar Venta</h2>
                  <p id="quick-sale-desc" className="text-xs text-slate-400">¿Cuánto vendiste ahora?</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                aria-label="Cerrar modal de venta rápida"
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 space-y-4">
              {/* Mensaje de Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-2.5 text-rose-700 dark:text-rose-400 text-xs font-bold"
                >
                  <AlertCircle size={18} className="shrink-0 text-rose-500" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Tipo de comprobante */}
              <fieldset>
                <legend className="sr-only">Tipo de comprobante de pago</legend>
                <div className="flex gap-3" role="radiogroup" aria-label="Tipo de comprobante">
                  {[
                    { type: DocumentType.BOLETA, label: '🧾 Boleta', sub: 'Persona natural' },
                    { type: DocumentType.FACTURA, label: '📄 Factura', sub: 'Con RUC empresa' },
                  ].map(opt => (
                    <button
                      key={opt.type}
                      type="button"
                      role="radio"
                      aria-checked={docType === opt.type}
                      onClick={() => {
                        setDocType(opt.type);
                        setError(null);
                      }}
                      className={`flex-1 py-3 px-4 rounded-2xl border-2 text-left transition-all min-h-[44px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                        docType === opt.type
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Campo Condicional de RUC para Factura */}
              {docType === DocumentType.FACTURA && (
                <div>
                  <label htmlFor="quick-sale-ruc-input" className="block text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5">
                    RUC del Cliente (11 dígitos)
                  </label>
                  <input
                    id="quick-sale-ruc-input"
                    type="text"
                    maxLength={11}
                    value={ruc}
                    onChange={e => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setRuc(clean);
                      if (error) setError(null);
                    }}
                    placeholder="Ej. 20601234567"
                    aria-label="RUC del cliente para la factura"
                    aria-required="true"
                    className="w-full px-4 py-3.5 text-base font-mono font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                    inputMode="numeric"
                  />
                </div>
              )}

              {/* Input de monto */}
              <div className="relative">
                <label htmlFor="quick-sale-amount-input" className="sr-only">
                  Monto de la venta en soles (S/)
                </label>
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400" aria-hidden="true">S/</span>
                <input
                  id="quick-sale-amount-input"
                  ref={inputRef}
                  type="number"
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="0.00"
                  aria-label="Monto de la venta en soles"
                  aria-required="true"
                  className="w-full pl-14 pr-5 py-4 sm:py-5 text-3xl font-black bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  inputMode="decimal"
                />
              </div>

              {/* Desglose de impuestos en tiempo real */}
              {amount && parseFloat(amount) > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  aria-live="polite"
                  aria-atomic="true"
                  className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800/80"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">Base Imponible:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">
                      S/ {(parseFloat(amount) / 1.18).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">IGV Proyectado (18%):</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">
                      S/ {(parseFloat(amount) - (parseFloat(amount) / 1.18)).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {docType === DocumentType.FACTURA && (
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/40 dark:border-slate-700/40">
                      <span className="text-brand-600 dark:text-brand-400 font-black uppercase text-[8px] tracking-widest">
                        Pre-pago Renta (1%):
                      </span>
                      <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">
                        S/ {((parseFloat(amount) / 1.18) * 0.01).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Fecha de Emisión Personalizada */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 px-1">
                <label htmlFor="quick-sale-date-input" className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                  Fecha de Registro
                </label>
                <input 
                  id="quick-sale-date-input"
                  type="date"
                  value={saleDate}
                  onChange={e => setSaleDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  aria-label="Fecha de registro de la venta"
                  className="bg-slate-50 dark:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-700 px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-755 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Montos rápidos */}
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Selección rápida de monto">
                {QUICK_AMOUNTS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setAmount(q.toString());
                      if (error) setError(null);
                    }}
                    aria-label={`Establecer monto rápido en S/ ${q}`}
                    className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer flex items-center justify-center"
                  >
                    S/ {q.toLocaleString('es-PE')}
                  </button>
                ))}
              </div>
            </div>

            {/* Fixed Docked Footer with Action Button */}
            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    role="status"
                    aria-live="assertive"
                    className="w-full min-h-[48px] py-3.5 bg-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-white font-black text-base shadow-lg shadow-emerald-500/20"
                  >
                    ✓ Venta guardada
                  </motion.div>
                ) : (
                  <motion.button
                    key="save"
                    type="button"
                    onClick={handleSubmit}
                    disabled={!amount || parseFloat(amount) <= 0}
                    aria-label="Guardar venta registrada"
                    className="w-full min-h-[48px] py-3.5 bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl flex items-center justify-center gap-2 text-white font-black text-base transition-all active:scale-98 shadow-lg shadow-brand-500/20 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    <Receipt size={20} aria-hidden="true" />
                    Guardar Venta
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickSaleModal;
