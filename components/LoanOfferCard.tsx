
import React from 'react';
import type { LoanOffer } from '../types';
import { Landmark, ArrowRight, Zap, Calendar, Check } from 'lucide-react';

interface LoanOfferCardProps {
  offer: LoanOffer;
  onApply: () => void;
  isLoading?: boolean;
  isSuccess?: boolean;
}

const LoanOfferCard: React.FC<LoanOfferCardProps> = ({ offer, onApply, isLoading, isSuccess }) => {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group flex flex-col justify-between h-full relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-2xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/20 transition-colors" />
      
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl shadow-inner">
            {offer.partner.logoUrl ? (
              <img 
                className="h-8 min-w-[32px] object-contain grayscale group-hover:grayscale-0 transition-all" 
                src={offer.partner.logoUrl} 
                alt={offer.partner.name} 
                referrerPolicy="no-referrer"
              />
            ) : (
              <Landmark className="text-gray-400" size={24} />
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full uppercase tracking-tighter flex items-center gap-1">
              <Zap size={10} className="fill-current" />
              Pre-Aprobado
            </span>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto Máximo</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              S/ {offer.maxAmount.toLocaleString('es-PE')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tasa Mensual</p>
              <p className="text-sm font-black text-gray-900 dark:text-white">
                {(offer.monthlyInterestRate * 100).toFixed(2)}%
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Calendar size={10} /> Plazo
              </p>
              <p className="text-sm font-black text-gray-900 dark:text-white">
                {offer.termInMonths} Meses
              </p>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={onApply}
        disabled={isLoading || isSuccess}
        className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-3 overflow-hidden relative ${
          isSuccess 
            ? 'bg-green-600 text-white shadow-green-500/20' 
            : isLoading 
              ? 'bg-gray-400 text-white cursor-not-allowed' 
              : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-black/10 hover:scale-[1.02] active:scale-95'
        }`}
      >
        {isSuccess ? (
          <>
            <span className="relative z-10">¡Solicitado!</span>
            <Check className="relative z-10" size={16} />
          </>
        ) : isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span className="relative z-10">Enviando...</span>
          </>
        ) : (
          <>
            <span className="relative z-10">Solicitar Crédito</span>
            <ArrowRight size={16} className="relative z-10" />
            <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </>
        )}
      </button>

      <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center mt-4 font-medium italic">
        Sujeto a validación final de "{offer.partner.name}"
      </p>
    </div>
  );
};

export default LoanOfferCard;
