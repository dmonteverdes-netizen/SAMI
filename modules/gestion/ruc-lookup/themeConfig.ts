import { ThemePaletteName } from './types';

export const containerVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
      type: 'spring' as const,
      stiffness: 100,
      damping: 18
    }
  }
};

export const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
  }
};

export const inputVariants = {
  idle: {
    scale: 1,
    x: 0,
    boxShadow: '0 0 0 0px rgba(16, 185, 129, 0)'
  },
  pulse: {
    scale: [1, 1.02, 1],
    boxShadow: [
      '0 0 0 0px rgba(16, 185, 129, 0)',
      '0 0 0 6px rgba(16, 185, 129, 0.4)',
      '0 0 0 0px rgba(16, 185, 129, 0)'
    ],
    transition: { duration: 0.5, ease: 'easeInOut' as const }
  },
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.4 }
  }
};

export function getThemeClass(paletteName: ThemePaletteName) {
  switch (paletteName) {
    case 'slate-dark':
      return {
        modalBg: 'bg-gray-900 border-white/10 text-gray-200 shadow-2xl',
        headerBg: 'bg-white/5 border-white/5',
        headerTitle: 'text-white',
        headerSubtitle: 'text-gray-400',
        bodyBg: 'bg-gray-900 text-gray-200',
        cardBg: 'bg-white/5 border-white/10',
        borderCol: 'border-white/10',
        textMuted: 'text-gray-400',
        textPrimary: 'text-gray-100',
        textContrast: 'text-white',
        inputBg: 'bg-slate-950/40',
        inputBorder: 'border-white/10',
        inputText: 'text-gray-200',
        btnPrimary: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white',
        labelAccent: 'text-indigo-400 font-extrabold'
      };
    case 'high-contrast':
      return {
        modalBg: 'bg-black border-2 border-white text-white font-semibold shadow-[0_0_20px_rgba(255,255,255,0.4)]',
        headerBg: 'bg-black border-b-2 border-white',
        headerTitle: 'text-yellow-400 font-extrabold tracking-wider',
        headerSubtitle: 'text-yellow-300 font-black',
        bodyBg: 'bg-black text-white',
        cardBg: 'bg-black border border-white',
        borderCol: 'border-white',
        textMuted: 'text-yellow-300 font-bold',
        textPrimary: 'text-white font-bold',
        textContrast: 'text-yellow-400 font-black',
        inputBg: 'bg-black',
        inputBorder: 'border-2 border-white',
        inputText: 'text-white font-bold',
        btnPrimary: 'bg-yellow-400 hover:bg-yellow-300 text-black font-black border-2 border-white',
        labelAccent: 'text-yellow-400 font-black'
      };
    case 'emerald':
      return {
        modalBg: 'bg-emerald-950/90 border-emerald-500/20 text-emerald-100 shadow-2xl backdrop-blur-xl',
        headerBg: 'bg-emerald-900/40 border-emerald-500/20',
        headerTitle: 'text-emerald-300 font-bold',
        headerSubtitle: 'text-emerald-400/80',
        bodyBg: 'bg-emerald-950/80 text-emerald-100',
        cardBg: 'bg-emerald-900/30 border-emerald-500/20',
        borderCol: 'border-emerald-500/20',
        textMuted: 'text-emerald-400/70',
        textPrimary: 'text-emerald-100',
        textContrast: 'text-emerald-200',
        inputBg: 'bg-emerald-950/60',
        inputBorder: 'border-emerald-500/30',
        inputText: 'text-emerald-100',
        btnPrimary: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold',
        labelAccent: 'text-emerald-400 font-bold'
      };
    case 'warm':
      return {
        modalBg: 'bg-amber-950/90 border-amber-500/20 text-amber-100 shadow-2xl backdrop-blur-xl',
        headerBg: 'bg-amber-900/40 border-amber-500/20',
        headerTitle: 'text-amber-300 font-bold',
        headerSubtitle: 'text-amber-400/80',
        bodyBg: 'bg-amber-950/80 text-amber-100',
        cardBg: 'bg-amber-900/30 border-amber-500/20',
        borderCol: 'border-amber-500/20',
        textMuted: 'text-amber-400/70',
        textPrimary: 'text-amber-100',
        textContrast: 'text-amber-200',
        inputBg: 'bg-amber-950/60',
        inputBorder: 'border-amber-500/30',
        inputText: 'text-amber-100',
        btnPrimary: 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold',
        labelAccent: 'text-amber-400 font-bold'
      };
    case 'slate-light':
    default:
      return {
        modalBg: 'bg-white border-gray-200 text-gray-800 shadow-2xl',
        headerBg: 'bg-gray-50 border-gray-100',
        headerTitle: 'text-gray-900',
        headerSubtitle: 'text-gray-500',
        bodyBg: 'bg-white text-gray-800',
        cardBg: 'bg-gray-50/50 border-gray-200',
        borderCol: 'border-gray-200',
        textMuted: 'text-gray-500',
        textPrimary: 'text-gray-800',
        textContrast: 'text-gray-950',
        inputBg: 'bg-white',
        inputBorder: 'border-gray-300',
        inputText: 'text-gray-900',
        btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white',
        labelAccent: 'text-indigo-600 font-bold'
      };
  }
}
