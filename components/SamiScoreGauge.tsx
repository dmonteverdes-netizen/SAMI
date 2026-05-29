import React, { useEffect, useState } from 'react';
import type { SamiScoreResult } from '../types';
import { motion } from 'motion/react';

interface SamiScoreGaugeProps {
  scoreResult: SamiScoreResult;
}

const SamiScoreGauge: React.FC<SamiScoreGaugeProps> = ({ scoreResult }) => {
  const { score, tier, analysis, avgMonthlySales } = scoreResult;
  const [animatedScore, setAnimatedScore] = useState(300);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  // SVG Arc calculation
  const SIZE = 220;
  const STROKE = 16;
  const R = (SIZE - STROKE) / 2;
  const CX = SIZE / 2;
  const CY = 120;
  const MIN_SCORE = 300;
  const MAX_SCORE = 850;
  
  // Arc goes from 180° to 360° (180° of sweep, top semi-circle)
  const START_ANGLE = 180;
  const SWEEP = 180;
  
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const getArcPath = (startAngle: number, sweepAngle: number) => {
    const endAngle = startAngle + sweepAngle;
    const x1 = CX + R * Math.cos(toRad(startAngle));
    const y1 = CY + R * Math.sin(toRad(startAngle));
    const x2 = CX + R * Math.cos(toRad(endAngle));
    const y2 = CY + R * Math.sin(toRad(endAngle));
    const largeArc = sweepAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`;
  };
  
  const circumference = 2 * Math.PI * R;
  const arcLength = (SWEEP / 360) * circumference;
  const scorePercent = (animatedScore - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
  const filledLength = scorePercent * arcLength;

  const getTierConfig = () => {
    switch (tier) {
      case 'Excelente': return { color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200' };
      case 'Bueno': return { color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200' };
      case 'Regular': return { color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200' };
      default: return { color: '#EF4444', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200' };
    }
  };
  
  const tierConfig = getTierConfig();
  const gradientId = `scoreGradient-${score}`;

  const getBarColor = (value: number) => {
    if (value > 75) return '#10B981';
    if (value > 50) return '#3B82F6';
    if (value > 25) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-750 text-center sticky top-6"
    >
      <motion.h3
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4"
      >
        Tu SAMI Score
      </motion.h3>
      
      {/* SVG Gauge */}
      <div className="relative mx-auto flex items-center justify-center mb-4" style={{ width: SIZE, height: 130 }}>
        <svg width={SIZE} height={130} viewBox={`0 0 ${SIZE} 130`} className="overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="40%" stopColor="#F59E0B" />
              <stop offset="70%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          
          {/* Background track */}
          <path
            d={getArcPath(START_ANGLE, SWEEP)}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className="text-gray-100 dark:text-gray-700/60"
          />
          
          {/* Score fill */}
          <path
            d={getArcPath(START_ANGLE, SWEEP)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${arcLength}`}
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />
          
          {/* Score text in center */}
          <motion.text
            x={CX}
            y={CY}
            textAnchor="middle"
            className="font-mono"
            fill={tierConfig.color}
            fontSize="44"
            fontWeight="900"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8, type: "spring", stiffness: 80, damping: 12 }}
          >
            {animatedScore}
          </motion.text>
        </svg>
      </div>

      {/* Tier Badge */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 100 }}
        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${tierConfig.bg} ${tierConfig.border} mt-1 mb-2`}
      >
        <span className={`text-sm font-bold ${tierConfig.text}`}>{tier}</span>
      </motion.div>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="text-xs text-gray-400 dark:text-gray-550 font-mono mb-5"
      >
        Venta mensual prom.: <span className="font-semibold text-gray-600 dark:text-gray-300">S/ {avgMonthlySales.toLocaleString('es-PE')}</span>
      </motion.p>

      {/* Analysis breakdown */}
      <div className="text-left space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="text-xs font-bold text-gray-400 uppercase tracking-wider"
        >
          Análisis Detallado
        </motion.p>
        {[
          { label: 'Estabilidad de Ingresos', value: analysis.stability },
          { label: 'Crecimiento de Ingresos', value: analysis.growth },
          { label: 'Formalidad Tributaria', value: analysis.formality },
        ].map(({ label, value }, idx) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + idx * 0.1, duration: 0.4, ease: "easeOut" }}
          >
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
              <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-200">{value}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-1000"
                style={{ width: `${value}%`, backgroundColor: getBarColor(value) }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Compartir por WhatsApp */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        onClick={() => {
          const msg = encodeURIComponent(`🛡️ Mi SAMI Score es ${score} (${tier})\n\nConstruí mi reputación financiera con SAMI. ¿Quieres mejorar el crédito de tu negocio?\n👉 https://sami.pe`);
          window.open(`https://wa.me/?text=${msg}`, '_blank');
        }}
        className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
        Compartir mi Score por WhatsApp
      </motion.button>
    </motion.div>
  );
};

export default SamiScoreGauge;
