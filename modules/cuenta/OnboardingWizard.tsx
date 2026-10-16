// components/OnboardingWizard.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Calculator, CreditCard, GraduationCap, ChevronRight, X } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: <ShieldCheck size={48} className="text-brand-600" />,
    bg: 'bg-brand-50 dark:bg-brand-900/20',
    title: 'Bienvenido a SAMI 👋',
    subtitle: 'Tu herramienta para crecer',
    body: 'SAMI es una plataforma creada para negocios como el tuyo. Te ayudamos a llevar tus cuentas, conseguir préstamos y aprender finanzas — todo desde tu celular.',
    cta: 'Empezar',
  },
  {
    icon: <Calculator size={48} className="text-emerald-600" />,
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    title: '📊 Registra tus ventas',
    subtitle: 'Sin hojas de cálculo',
    body: 'Anota cuánto vendiste cada semana. Solo necesitas el monto. SAMI calcula tus impuestos automáticamente para que no te lleves sorpresas de SUNAT.',
    cta: 'Entendido',
  },
  {
    icon: <CreditCard size={48} className="text-indigo-600" />,
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    title: '📊 Tu Salud Tributaria',
    subtitle: 'Tu perfil fiscal para bancos',
    body: 'Mientras más ventas registres con factura, más sólida es tu salud tributaria. Con un buen perfil tributario, los bancos aliados te ofrecen préstamos con mejores tasas.',
    cta: 'Qué bueno',
  },
  {
    icon: <GraduationCap size={48} className="text-amber-600" />,
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    title: '🎓 Aprende gratis',
    subtitle: 'Academia SAMI',
    body: 'Cursos cortos de 10 minutos sobre finanzas, impuestos y cómo crecer tu negocio. Completarlos fortalece tu salud tributaria.',
    cta: '¡Empezar ahora!',
  },
];

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 z-[100] flex flex-col items-center justify-between p-8 pb-12">
      {/* Skip */}
      <button onClick={onComplete} className="self-end text-slate-400 flex items-center gap-1 text-sm font-semibold">
        Saltar <X size={16} />
      </button>

      {/* Progress dots */}
      <div className="flex gap-2 mt-4">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step ? 'w-8 h-2.5 bg-brand-600' : i < step ? 'w-2.5 h-2.5 bg-brand-200' : 'w-2.5 h-2.5 bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex flex-col items-center text-center max-w-sm w-full"
        >
          <div className={`w-28 h-28 rounded-[2rem] ${current.bg} flex items-center justify-center mb-8 shadow-lg`}>
            {current.icon}
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-brand-500 mb-2">{current.subtitle}</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 leading-tight">{current.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">{current.body}</p>
        </motion.div>
      </AnimatePresence>

      {/* CTA */}
      <button
        onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
        className="w-full max-w-sm btn-primary text-lg py-5 rounded-3xl shadow-xl shadow-brand-500/25"
      >
        {current.cta}
        {!isLast && <ChevronRight size={22} />}
      </button>
    </div>
  );
};

export default OnboardingWizard;
