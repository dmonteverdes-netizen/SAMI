// components/QuickSaleModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Receipt } from 'lucide-react';
import { Invoice, InvoiceType, DocumentType } from '../types';

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  existingSalesCount: number;
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

const QuickSaleModal: React.FC<QuickSaleModalProps> = ({ isOpen, onClose, onAddInvoice, existingSalesCount }) => {
  const [amount, setAmount] = useState('');
  const [docType, setDocType] = useState<DocumentType>(DocumentType.BOLETA);
  const [success, setSuccess] = useState(false);
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setAmount('');
      setSuccess(false);
      setSaleDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;

    onAddInvoice({
      type: InvoiceType.SALE,
      documentType: docType,
      series: docType === DocumentType.BOLETA ? 'B001' : 'F001',
      correlative: existingSalesCount + 1,
      issueDate: saleDate,
      totalAmount: num,
    });

    setSuccess(true);
    setTimeout(() => {
      setAmount('');
      setSuccess(false);
    }, 1200);
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
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-[2rem] p-6 pb-10 shadow-2xl animate-slide-in"
          >
            {/* Handle */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
                  <Zap size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Registrar Venta</h2>
                  <p className="text-xs text-slate-400">¿Cuánto vendiste ahora?</p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                <X size={18} />
              </button>
            </div>

            {/* Tipo de comprobante */}
            <div className="flex gap-3 mb-5">
              {[
                { type: DocumentType.BOLETA, label: '🧾 Boleta', sub: 'Persona natural' },
                { type: DocumentType.FACTURA, label: '📄 Factura', sub: 'Con RUC empresa' },
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => setDocType(opt.type)}
                  className={`flex-1 py-3 px-4 rounded-2xl border-2 text-left transition-all ${
                    docType === opt.type
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{opt.label}</div>
                  <div className="text-[10px] text-slate-400">{opt.sub}</div>
                </button>
              ))}
            </div>

            {/* Input de monto */}
            <div className="relative mb-4">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">S/</span>
              <input
                ref={inputRef}
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-14 pr-5 py-5 text-3xl font-black bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                inputMode="decimal"
              />
            </div>

            {/* Desglose de impuestos en tiempo real */}
            {amount && parseFloat(amount) > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4 space-y-2 border border-slate-100 dark:border-slate-800/80"
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
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80 px-1">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Fecha de Registro</span>
              <input 
                type="date"
                value={saleDate}
                onChange={e => setSaleDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="bg-slate-50 dark:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-700 px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-755 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none"
              />
            </div>

            {/* Montos rápidos */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {QUICK_AMOUNTS.map(q => (
                <button
                  key={q}
                  onClick={() => setAmount(q.toString())}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 transition-all active:scale-95"
                >
                  S/ {q.toLocaleString('es-PE')}
                </button>
              ))}
            </div>

            {/* Botón guardar */}
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full py-4 bg-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-white font-black text-base"
                >
                  ✓ Venta guardada
                </motion.div>
              ) : (
                <motion.button
                  key="save"
                  onClick={handleSubmit}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full py-4 bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl flex items-center justify-center gap-2 text-white font-black text-base transition-all active:scale-98 shadow-lg shadow-brand-500/20"
                >
                  <Receipt size={20} />
                  Guardar Venta
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickSaleModal;
