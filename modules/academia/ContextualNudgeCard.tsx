// ─── Tipos e Interfaces ───
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  X, 
  ArrowRight, 
  Calendar, 
  TrendingDown, 
  Building2, 
  CheckCircle2, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import type { ContextualNudge } from '../../core/services/nudgeService';

interface ContextualNudgeCardProps {
  nudge: ContextualNudge | null;
  onDismiss: (nudgeId: string) => void;
  onOpenCourse: (courseId: string) => void;
}

// ─── Constantes y Configuración Visual ───

const EVENT_THEMES: Record<string, {
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  iconBg: string;
  iconColor: string;
  btnBg: string;
  icon: React.ReactNode;
}> = {
  SUNAT_DEADLINE: {
    badgeBg: 'bg-amber-100 dark:bg-amber-950/70',
    badgeText: 'text-amber-800 dark:text-amber-300',
    cardBorder: 'border-amber-200 dark:border-amber-800/60',
    iconBg: 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    iconColor: 'text-amber-600 dark:text-amber-400',
    btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    icon: <Calendar size={20} aria-hidden="true" />
  },
  UNUSUAL_EXPENSE: {
    badgeBg: 'bg-rose-100 dark:bg-rose-950/70',
    badgeText: 'text-rose-800 dark:text-rose-300',
    cardBorder: 'border-rose-200 dark:border-rose-800/60',
    iconBg: 'bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
    iconColor: 'text-rose-600 dark:text-rose-400',
    btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    icon: <TrendingDown size={20} aria-hidden="true" />
  },
  PAYMENT_REMINDER: {
    badgeBg: 'bg-blue-100 dark:bg-blue-950/70',
    badgeText: 'text-blue-800 dark:text-blue-300',
    cardBorder: 'border-blue-200 dark:border-blue-800/60',
    iconBg: 'bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    iconColor: 'text-blue-600 dark:text-blue-400',
    btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: <Building2 size={20} aria-hidden="true" />
  },
  TASK_REMINDER: {
    badgeBg: 'bg-purple-100 dark:bg-purple-950/70',
    badgeText: 'text-purple-800 dark:text-purple-300',
    cardBorder: 'border-purple-200 dark:border-purple-800/60',
    iconBg: 'bg-purple-500/15 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
    iconColor: 'text-purple-600 dark:text-purple-400',
    btnBg: 'bg-purple-600 hover:bg-purple-700 text-white',
    icon: <CheckCircle2 size={20} aria-hidden="true" />
  },
  CREDIT_ELIGIBILITY: {
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/70',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    cardBorder: 'border-emerald-200 dark:border-emerald-800/60',
    iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    icon: <Sparkles size={20} aria-hidden="true" />
  }
};

const DEFAULT_THEME = {
  badgeBg: 'bg-indigo-100 dark:bg-indigo-950/70',
  badgeText: 'text-indigo-800 dark:text-indigo-300',
  cardBorder: 'border-indigo-200 dark:border-indigo-800/60',
  iconBg: 'bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  iconColor: 'text-indigo-600 dark:text-indigo-400',
  btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  icon: <GraduationCap size={20} aria-hidden="true" />
};

// ─── Componente Principal ───

export const ContextualNudgeCard: React.FC<ContextualNudgeCardProps> = ({
  nudge,
  onDismiss,
  onOpenCourse
}) => {
  if (!nudge) return null;

  const theme = EVENT_THEMES[nudge.eventType] || DEFAULT_THEME;

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={nudge.id}
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        id={`contextual-nudge-${nudge.id}`}
        aria-label="Recomendación formativa contextual"
        className={`relative mb-6 w-full rounded-2xl bg-white dark:bg-gray-800/95 border ${theme.cardBorder} p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden`}
      >
        {/* Subtle decorative background indicator */}
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-current opacity-80" style={{ color: 'inherit' }} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left section: Icon + Content */}
          <div className="flex items-start gap-3.5 pr-8 md:pr-0">
            <div className={`p-2.5 rounded-xl shrink-0 ${theme.iconBg} flex items-center justify-center`}>
              {theme.icon}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText}`}>
                  {nudge.badgeLabel}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400 dark:text-gray-500">
                  <BookOpen size={12} aria-hidden="true" />
                  Academia SAMI
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-snug">
                {nudge.headline}
              </h4>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
                {nudge.description}
              </p>
            </div>
          </div>

          {/* Right section: CTA Button & Dismiss */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full sm:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-700/60">
            <button
              id={`nudge-cta-${nudge.courseId}`}
              onClick={() => onOpenCourse(nudge.courseId)}
              className={`w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${theme.btnBg}`}
            >
              <span>{nudge.ctaText}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Botón de Descarte con memoria (esquina superior derecha, accesible 44x44px) */}
        <button
          id={`nudge-dismiss-btn-${nudge.id}`}
          onClick={() => onDismiss(nudge.id)}
          aria-label="Cerrar sugerencia educativa"
          title="Descartar esta sugerencia por 48 horas"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </motion.aside>
    </AnimatePresence>
  );
};
export default ContextualNudgeCard;
