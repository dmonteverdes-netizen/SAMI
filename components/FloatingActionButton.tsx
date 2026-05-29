// components/FloatingActionButton.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Zap, MessageSquare } from 'lucide-react';

interface FABProps {
  onQuickSale: () => void;
  onOpenChat: () => void;
}

const FloatingActionButton: React.FC<FABProps> = ({ onQuickSale, onOpenChat }) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: <Zap size={20} />, label: 'Venta rápida', color: 'bg-emerald-500', onClick: () => { onQuickSale(); setIsOpen(false); } },
    { icon: <MessageSquare size={20} />, label: 'Preguntarle a SAMI', color: 'bg-indigo-500', onClick: () => { onOpenChat(); setIsOpen(false); } },
  ];

  return (
    <div className="lg:hidden fixed right-4 z-40" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <AnimatePresence>
        {isOpen && (
          <div className="absolute bottom-16 right-0 space-y-3 mb-2">
            {actions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                onClick={action.onClick}
                className={`flex items-center gap-3 ${action.color} text-white rounded-2xl px-4 py-3 shadow-xl whitespace-nowrap`}
              >
                {action.icon}
                <span className="text-sm font-bold">{action.label}</span>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-brand-500/40 active:scale-95 transition-transform"
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </motion.button>
    </div>
  );
};

export default FloatingActionButton;
