
import React from 'react';
import { 
  LayoutDashboard, 
  Calculator, 
  Receipt, 
  CreditCard, 
  TrendingUp, 
  ShieldCheck, 
  Trophy, 
  GraduationCap, 
  MessageSquare, 
  LogOut, 
  ShieldAlert,
  Building2,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  X,
  Bell,
  CheckCircle2,
  Settings,
  ArrowDownUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppRole, User } from '../types';
import ThemeToggle from './ThemeToggle';

export type View = 'dashboard' | 'chat' | 'accounting' | 'credit' | 'education' | 'admin' | 'expenses' | 'notifications' | 'profiling' | 'loyalty' | 'bank-api' | 'tasks' | 'exchange' | 'management';

interface NavItem {
  view: View;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

interface SidebarProps {
  currentUser: User;
  currentView: View;
  setCurrentView: (view: View) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onToggleProfile: () => void;
  logout: () => void;
  stats: {
    accountingCount: number;
    pendingAlerts: number;
    isCreditEligible: boolean;
    samiCoins: number;
    pendingTasksCount: number;
    overdueTasksCount: number;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser, 
  currentView, 
  setCurrentView, 
  isSidebarOpen, 
  setIsSidebarOpen, 
  isCollapsed, 
  setIsCollapsed,
  onToggleProfile,
  logout,
  stats
}) => {
  
  const navItems = React.useMemo(() => {
    const baseItems: NavItem[] = [
      { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { view: 'chat', label: 'SAMI AI', icon: <MessageSquare size={18} /> },
    ];

    if (currentUser.role === AppRole.MYPE_ADMIN) {
      return [
        ...baseItems,
        { 
          view: 'accounting', 
          label: 'Ventas', 
          icon: <Calculator size={18} />, 
          badge: stats.accountingCount > 0 ? stats.accountingCount : undefined, 
          badgeColor: 'bg-blue-100 text-blue-700' 
        },
        { 
          view: 'expenses', 
          label: 'Compras', 
          icon: <Receipt size={18} />, 
          badge: stats.pendingAlerts > 0 ? stats.pendingAlerts : undefined, 
          badgeColor: 'bg-red-100 text-red-600' 
        },
        { 
          view: 'exchange', 
          label: 'Cambiar $$', 
          icon: <ArrowDownUp size={18} />
        },
        { 
          view: 'credit', 
          label: 'Créditos', 
          icon: <CreditCard size={18} />, 
          badge: stats.isCreditEligible ? '●' : undefined, 
          badgeColor: 'bg-green-100 text-green-600' 
        },
        { view: 'profiling', label: 'Perfil de Riesgo', icon: <ShieldCheck size={18} /> },
        { 
          view: 'loyalty', 
          label: 'SAMI Rewards', 
          icon: <Trophy size={18} />, 
          badge: stats.samiCoins > 0 ? stats.samiCoins : undefined, 
          badgeColor: 'bg-amber-100 text-amber-700' 
        },
        { 
          view: 'tasks', 
          label: 'Tareas', 
          icon: <CheckCircle2 size={18} />,
          badge: stats.pendingTasksCount > 0 ? stats.pendingTasksCount : undefined,
          badgeColor: stats.overdueTasksCount > 0 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
        },
        { view: 'education', label: 'Academia', icon: <GraduationCap size={18} /> },
        { view: 'management', label: 'Gestión General', icon: <Settings size={18} /> },
      ];
    } else if (currentUser.role === AppRole.MYPE_WORKER) {
      return [
        { view: 'dashboard', label: 'Panel Operativo', icon: <LayoutDashboard size={18} /> },
        { 
          view: 'tasks', 
          label: 'Tareas', 
          icon: <CheckCircle2 size={18} />,
          badge: stats.pendingTasksCount > 0 ? stats.pendingTasksCount : undefined,
          badgeColor: stats.overdueTasksCount > 0 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
        },
        { view: 'accounting', label: 'Ventas Rápidas', icon: <Receipt size={18} /> },
        { view: 'chat', label: 'Ayuda AI', icon: <MessageSquare size={18} /> },
      ];
    } else if (currentUser.role.startsWith('BANK_')) {
      return [
        { view: 'bank-api', label: 'Portal Bancario', icon: <Building2 size={18} /> },
        { view: 'management', label: 'Gestión General', icon: <Settings size={18} /> },
        { view: 'chat', label: 'Soporte SAMI', icon: <MessageSquare size={18} /> },
      ];
    } else if (currentUser.role === AppRole.SAMI_ADMIN) {
      return [
        { view: 'admin', label: 'Admin', icon: <ShieldAlert size={18} /> },
        { view: 'management', label: 'Gestión General', icon: <Settings size={18} /> },
        { view: 'chat', label: 'SAMI AI', icon: <MessageSquare size={18} /> },
      ];
    } else if (currentUser.role === AppRole.SAMI_ANALYST) {
      return [
        { view: 'chat', label: 'SAMI AI', icon: <MessageSquare size={18} /> },
      ];
    }
    return baseItems;
  }, [currentUser.role, stats]);

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isCollapsed ? 88 : 288,
          x: (isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024)) ? 0 : -288
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`
          fixed inset-y-0 left-0 z-50 border-r flex flex-col h-screen transform transition-colors duration-300
          lg:relative lg:translate-x-0
          ${currentUser.role.startsWith('SAMI_') 
            ? 'bg-[#0A0A0B] text-white border-white/5' 
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white'}
        `}
      >
        {/* Toggle Collapse Button (Desktop Only) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`
            absolute -right-3 top-20 w-6 h-6 rounded-full border shadow-xl items-center justify-center hidden lg:flex z-50 transition-all
            ${currentUser.role.startsWith('SAMI_') 
              ? 'bg-[#1A1A1C] border-white/10 text-white hover:bg-white/10' 
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}
          `}
          aria-label={isCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Sidebar Header */}
        <div className={`p-6 flex items-center mb-6 ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <motion.div 
              layout
              className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center shadow-xl transition-all ${
                currentUser.role.startsWith('SAMI_') 
                ? 'bg-white text-black' 
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/20'
              }`}
            >
              <ShieldCheck size={26} />
            </motion.div>
            
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col whitespace-nowrap"
                >
                  <span className={`font-black text-2xl tracking-tighter ${currentUser.role.startsWith('SAMI_') ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    SAMI
                  </span>
                  {currentUser.role.startsWith('SAMI_') && (
                    <span className="text-[10px] font-black tracking-[0.2em] text-indigo-400 -mt-1 uppercase">
                      Core Platform
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isCollapsed && (
             <button 
              className={`lg:hidden p-2 rounded-xl transition-colors ${currentUser.role.startsWith('SAMI_') ? 'text-white/40 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`} 
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Cerrar barra lateral"
             >
               <X size={20} />
             </button>
          )}
        </div>

        {/* Navigation Content */}
        <nav aria-label="Navegación principal" className={`flex-grow space-y-1 overflow-y-auto px-4 custom-scrollbar pb-6 ${isCollapsed ? 'px-3' : 'px-4'}`}>
          {navItems.map((item) => (
            <button 
              key={item.view}
              onClick={() => {
                setCurrentView(item.view);
                if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={`
                group relative w-full flex items-center transition-all duration-200 rounded-2xl
                ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3.5 gap-4'}
                ${currentView === item.view 
                  ? (currentUser.role.startsWith('SAMI_') 
                      ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20' 
                      : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20')
                  : (currentUser.role.startsWith('SAMI_') 
                      ? 'text-white/40 hover:text-white hover:bg-white/5' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:text-blue-600 dark:hover:text-blue-400')}
              `}
            >
              <div className={`flex-shrink-0 relative ${currentView === item.view ? 'text-white' : 'group-hover:scale-110 transition-transform'}`}>
                {item.icon}
                {isCollapsed && item.badge !== undefined && (
                  <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center text-[8px] font-black border-2 border-white dark:border-gray-900 rounded-full ${item.badgeColor}`}>
                    {typeof item.badge === 'string' && item.badge === '●' ? '' : '!'}
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <span className="font-bold text-sm flex-grow text-left truncate tracking-tight">
                  {item.label}
                </span>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}

              {/* Badge for expanded state */}
              {!isCollapsed && item.badge !== undefined && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className={`p-4 mt-auto border-t transition-colors ${currentUser.role === AppRole.SAMI_ADMIN ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 dark:border-gray-800'}`}>
          {/* Theme Toggle Switch */}
          <div className="mb-6">
            <ThemeToggle isCollapsed={isCollapsed} />
          </div>

          <div className="space-y-3">
            <button 
              onClick={onToggleProfile}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-all shadow-sm w-full text-left group ${
              isCollapsed ? 'justify-center border-none shadow-none' : 'bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/30'
            }`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ring-2 ring-offset-2 overflow-hidden transition-all group-hover:scale-105 ${
                currentUser.role === AppRole.SAMI_ADMIN 
                  ? 'bg-gradient-to-br from-gray-700 to-gray-900 text-white ring-white/5 ring-offset-black' 
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 ring-transparent'
              }`}>
                <motion.div
                  key={currentUser.role}
                  initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <UserIcon size={20} />
                </motion.div>
              </div>
              
              {!isCollapsed && (
                <div className="flex-grow min-w-0">
                  <p className={`text-xs font-black truncate uppercase tracking-tight ${currentUser.role === AppRole.SAMI_ADMIN ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {currentUser.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${currentUser.role === AppRole.SAMI_ADMIN ? 'bg-indigo-400' : 'bg-green-500'}`} />
                    <p className={`text-[9px] font-black uppercase tracking-[0.1em] ${currentUser.role === AppRole.SAMI_ADMIN ? 'text-indigo-400' : 'text-gray-400'}`}>
                      {currentUser.role.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              )}
            </button>

            {!isCollapsed && (
              <button 
                onClick={logout} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  currentUser.role === AppRole.SAMI_ADMIN 
                    ? 'hover:bg-white/10 text-white/40 hover:text-red-400' 
                    : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600'
                }`}
              >
                <LogOut size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Cerrar Sesión</span>
              </button>
            )}
          </div>
          
          {isCollapsed && (
             <button 
                onClick={logout} 
                className="w-full mt-2 p-3 text-gray-400 hover:text-red-500 flex justify-center transition-colors"
                title="Cerrar Sesión"
                aria-label="Cerrar Sesión"
             >
               <LogOut size={18} />
             </button>
          )}
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
