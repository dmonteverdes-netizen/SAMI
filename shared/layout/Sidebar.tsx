// ─── Librerías Externas ───
import React from 'react';
import { 
  ShieldCheck, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  User as UserIcon, 
  X, 
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Capa Core ───
import { AppRole, User, View } from '../../core/types/types';
import { MODULES, MODULE_GROUPS_META, ModuleGroup, ModuleConfig } from '../../core/config/modules';
import { moduloDisponible } from '../../core/config/phases';

// ─── Capa Shared ───
import ThemeToggle from './ThemeToggle';

// ─── Tipos e Interfaces ───
export type { View };

interface NavItem {
  view: View;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

interface NavGroup {
  id: ModuleGroup;
  label: string;
  items: NavItem[];
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

// ─── Componente Principal ───
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
  // ─── Derivaciones y Hooks ───
  // Derivación dinámica de grupos y elementos de navegación según registro centralizado (MODULES) y fase activa
  const navGroups = React.useMemo(() => {
    // Filtrar módulos permitidos por rol y fase activa (excluyendo vistas modales/sistema como 'notifications')
    const availableModules = Object.values(MODULES).filter((mod: ModuleConfig) => {
      if (mod.id === 'notifications') return false;
      return moduloDisponible(mod, currentUser.role);
    });

    // Agrupar módulos
    const groupsMap = new Map<ModuleGroup, NavItem[]>();

    availableModules.forEach(mod => {
      const IconComponent = mod.icon;
      const label = mod.labelPorRol?.[currentUser.role] || mod.label;
      
      // Determinar badges contextuales según la vista
      let badge: string | number | undefined;
      let badgeColor: string | undefined;

      if (mod.id === 'accounting' && stats.accountingCount > 0) {
        badge = stats.accountingCount;
        badgeColor = 'bg-blue-100 text-blue-700';
      } else if (mod.id === 'expenses' && stats.pendingAlerts > 0) {
        badge = stats.pendingAlerts;
        badgeColor = 'bg-red-100 text-red-600';
      } else if (mod.id === 'credit' && stats.isCreditEligible) {
        badge = '●';
        badgeColor = 'bg-green-100 text-green-600';
      } else if (mod.id === 'loyalty' && stats.samiCoins > 0) {
        badge = stats.samiCoins;
        badgeColor = 'bg-amber-100 text-amber-700';
      } else if (mod.id === 'tasks' && stats.pendingTasksCount > 0) {
        badge = stats.pendingTasksCount;
        badgeColor = stats.overdueTasksCount > 0 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700';
      }

      const item: NavItem = {
        view: mod.id,
        label,
        icon: <IconComponent size={18} />,
        badge,
        badgeColor
      };

      if (!groupsMap.has(mod.grupo)) {
        groupsMap.set(mod.grupo, []);
      }
      groupsMap.get(mod.grupo)!.push(item);
    });

    // Ordenar los grupos según el orden definido en MODULE_GROUPS_META
    const orderedGroups: NavGroup[] = [];
    const groupEntries = Array.from(groupsMap.entries()).sort(
      ([gA], [gB]) => (MODULE_GROUPS_META[gA]?.order || 99) - (MODULE_GROUPS_META[gB]?.order || 99)
    );

    for (const [groupKey, items] of groupEntries) {
      if (items.length > 0) {
        orderedGroups.push({
          id: groupKey,
          label: MODULE_GROUPS_META[groupKey]?.label || groupKey,
          items
        });
      }
    }

    return orderedGroups;
  }, [currentUser.role, stats]);

  // ─── Render / JSX ───
  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm print:hidden no-print"
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
          fixed inset-y-0 left-0 z-50 border-r flex flex-col h-screen transform transition-colors duration-300 print:hidden no-print
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
        <div className={`p-6 flex items-center mb-2 ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
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

        {/* Navigation Content with Dynamic Groups */}
        <nav aria-label="Navegación principal" className={`flex-grow overflow-y-auto px-4 custom-scrollbar pb-6 space-y-5 ${isCollapsed ? 'px-3' : 'px-4'}`}>
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {/* Group Section Header (rendered only when not collapsed and group has items) */}
              {!isCollapsed && (
                <div className="px-3 pt-2 pb-1">
                  <h3 className={`text-[10px] font-black uppercase tracking-[0.15em] ${
                    currentUser.role.startsWith('SAMI_')
                      ? 'text-white/40'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {group.label}
                  </h3>
                </div>
              )}

              {/* Group Items */}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button 
                    key={item.view}
                    onClick={() => {
                      setCurrentView(item.view);
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={`
                      group relative w-full flex items-center transition-all duration-200 rounded-2xl
                      ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-4'}
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
              </div>
            </div>
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
