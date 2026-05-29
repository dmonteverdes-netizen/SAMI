// components/PaymentMethodsBadges.tsx
import React from 'react';
import { QrCode, Building2, Banknote, ShieldCheck } from 'lucide-react';

interface PaymentMethod {
  name: string;
  color: string;
  type: 'Digital' | 'Banco' | 'Agente' | 'Efectivo';
}

const PAYMENT_METHODS: PaymentMethod[] = [
  // Billeteras Digitales
  { name: 'Yape', color: 'text-purple-600 dark:text-purple-400', type: 'Digital' },
  { name: 'Plin', color: 'text-blue-500 dark:text-blue-400', type: 'Digital' },
  
  // Bancos Homologados (Sorted professionally by presence)
  { name: 'Banco de Crédito (BCP)', color: 'text-sky-600 dark:text-sky-450', type: 'Banco' },
  { name: 'Interbank', color: 'text-emerald-600 dark:text-emerald-400', type: 'Banco' },
  { name: 'BBVA', color: 'text-blue-700 dark:text-blue-500', type: 'Banco' },
  { name: 'Scotiabank', color: 'text-rose-600 dark:text-rose-400', type: 'Banco' },
  { name: 'BanBif', color: 'text-teal-600 dark:text-teal-400', type: 'Banco' },
  { name: 'Banco de la Nación', color: 'text-red-600 dark:text-red-400', type: 'Banco' },
  
  // Canales Físicos
  { name: 'Agentes Autorizados', color: 'text-amber-600 dark:text-amber-500', type: 'Agente' },
  { name: 'PagoEfectivo', color: 'text-gray-700 dark:text-gray-300', type: 'Efectivo' }
];

const PaymentMethodsBadges: React.FC<{ title?: string }> = ({ title = 'Canales de Recaudación y Desembolso' }) => (
  <div className="my-4 text-left">
    <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 justify-center sm:justify-start">
      <ShieldCheck size={14} className="text-emerald-500" />
      {title}
    </p>
    
    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
      {PAYMENT_METHODS.map(m => {
        let IconComponent = Building2;
        if (m.type === 'Digital') IconComponent = QrCode;
        if (m.type === 'Efectivo' || m.type === 'Agente') IconComponent = Banknote;
        
        return (
          <div
            key={m.name}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 shadow-xs hover:border-blue-500/30 transition-all cursor-default group"
          >
            <IconComponent size={14} className={`${m.color} group-hover:scale-115 transition-transform duration-200`} />
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{m.name}</span>
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 bg-slate-100 dark:bg-gray-800 rounded">
              {m.type === 'Efectivo' ? 'Cash' : m.type}
            </span>
          </div>
        );
      })}
    </div>
    
    <p className="text-[10px] text-slate-400 mt-3 italic flex items-center gap-1.5 justify-center sm:justify-start">
      🔒 Las operaciones se concilian automáticamente y son custodiadas bajo fideicomiso regulado por la SBS.
    </p>
  </div>
);

export default PaymentMethodsBadges;
