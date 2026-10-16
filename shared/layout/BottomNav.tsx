// components/BottomNav.tsx
import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Calculator, CreditCard, GraduationCap, MessageSquare, CheckCircle2 } from 'lucide-react';
import { AppRole, View } from '../../core/types/types';
import { moduloDisponible } from '../../core/config/phases';

interface BottomNavProps {
  currentView: View;
  setCurrentView: (v: View) => void;
  userRole: AppRole;
  pendingAlerts: number;
  isCreditEligible: boolean;
}

interface NavItem {
  view: View;
  label: string;
  icon: React.ReactNode;
  dot?: boolean;
  badge?: number;
}

/**
 * NOTA DE ARQUITECTURA / PRODUCTO:
 * La composición de destinos de la barra inferior (BottomNav) para la Fase 1 está
 * actualmente pendiente de definición final de producto.
 * 
 * En Fase 1 (MVP Contable), tras aplicar el filtrado estricto por fases (`moduloDisponible`),
 * la barra del dueño MYPE y del trabajador cuentan con 2 destinos activos (Inicio y Ventas).
 * Se utiliza una distribución centrada con separación uniforme (`justify-center gap-8 sm:gap-12`)
 * para que el diseño se vea intencional y ergonómico sin inventar destinos sustitutos.
 */
const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView, userRole, pendingAlerts, isCreditEligible }) => {
  const mypeItems: NavItem[] = [
    { view: 'dashboard' as View, label: 'Inicio', icon: <LayoutDashboard size={22} /> },
    { view: 'accounting' as View, label: 'Ventas', icon: <Calculator size={22} /> },
    { view: 'credit' as View,     label: 'Créditos', icon: <CreditCard size={22} />, dot: isCreditEligible },
    { view: 'tasks' as View,      label: 'Tareas', icon: <CheckCircle2 size={22} />, badge: pendingAlerts > 0 ? pendingAlerts : undefined },
    { view: 'education' as View,  label: 'Aprender', icon: <GraduationCap size={22} /> },
  ];

  const workerItems: NavItem[] = [
    { view: 'dashboard' as View,  label: 'Panel', icon: <LayoutDashboard size={22} /> },
    { view: 'tasks' as View,      label: 'Tareas', icon: <CheckCircle2 size={22} />, badge: pendingAlerts > 0 ? pendingAlerts : undefined },
    { view: 'accounting' as View, label: 'Ventas', icon: <Calculator size={22} /> },
    { view: 'chat' as View,       label: 'Ayuda', icon: <MessageSquare size={22} /> },
  ];

  const rawItems = userRole === AppRole.MYPE_WORKER ? workerItems : mypeItems;

  // Filtrar estrictamente por fase activa y rol del usuario sin rellenar con destinos ficticios
  const items = React.useMemo(() => {
    return rawItems.filter(item => moduloDisponible(item.view, userRole));
  }, [rawItems, userRole]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Navegación principal móvil" className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 bottom-nav-safe shadow-2xl shadow-slate-900/20 print:hidden no-print">
      {/* Distribución centrada con separación uniforme para que 2, 3 o 5 destinos se vean simétricos e intencionales */}
      <div className="flex items-center justify-center gap-6 sm:gap-12 px-4 pt-2 pb-1 max-w-md mx-auto">
        {items.map((item) => {
          const isActive = currentView === item.view;

          return (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className="relative flex flex-col items-center gap-1 px-4 py-2 min-w-[64px] min-h-[56px] justify-center rounded-2xl transition-all active:scale-95 select-none"
              aria-label={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-2xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <div className="relative z-10">
                <div className={`transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {item.icon}
                </div>

                {/* Dot for credit eligibility */}
                {item.dot && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                )}

                {/* Number badge */}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-1">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] font-bold relative z-10 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
