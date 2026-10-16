import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Bell, 
  User as UserIcon, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Trash2, 
  Calculator, 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  LogOut 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, AppRole, View, UserNotificationSettings } from '../../core/types/types';
import { moduloDisponible } from '../../core/config/phases';
import { IS_DEMO_MODE } from '../../data/mockData';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import FloatingActionButton from './FloatingActionButton';
import NotificationSettings from '../../modules/gestion/NotificationSettings';

export interface AppShellStats {
  accountingCount: number;
  pendingAlerts: number;
  isCreditEligible: boolean;
  samiCoins: number;
  pendingTasksCount: number;
  overdueTasksCount: number;
}

export interface InAppNotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  timestamp: string;
  read: boolean;
  action?: string;
}

export interface AppShellProps {
  currentUser: User;
  currentView: View;
  setCurrentView: (view: View) => void;
  logout: () => void;
  stats: AppShellStats;
  inAppNotifications: InAppNotificationItem[];
  setInAppNotifications: React.Dispatch<React.SetStateAction<InAppNotificationItem[]>>;
  notificationSettings: UserNotificationSettings;
  setNotificationSettings: (settings: UserNotificationSettings | ((prev: UserNotificationSettings) => UserNotificationSettings)) => void;
  activeTaskReminders?: { taskId: string; title: string; daysRemain: number }[];
  onDismissTaskReminder?: (taskId: string) => void;
  isDataMasked: boolean;
  onToggleMasking: () => void;
  toasts: { id: string; title: string; body: string }[];
  onDismissToast: (id: string) => void;
  showSessionWarning?: boolean;
  onQuickSaleClick?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentUser,
  currentView,
  setCurrentView,
  logout,
  stats,
  inAppNotifications,
  setInAppNotifications,
  notificationSettings,
  setNotificationSettings,
  activeTaskReminders = [],
  onDismissTaskReminder,
  isDataMasked,
  onToggleMasking,
  toasts,
  onDismissToast,
  showSessionWarning = false,
  onQuickSaleClick,
  children
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sami_sidebar_collapsed');
    return saved === 'true';
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profilePanelTab, setProfilePanelTab] = useState<'NOTIFICATIONS' | 'PROFILE'>('NOTIFICATIONS');
  const [isDemoBannerDismissed, setIsDemoBannerDismissed] = useState(false);
  const [isTaskBannerDismissed, setIsTaskBannerDismissed] = useState(false);

  useEffect(() => {
    localStorage.setItem('sami_sidebar_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  const hasUnreadNotifications = inAppNotifications.some(n => !n.read);
  const unreadCount = inAppNotifications.filter(n => !n.read).length;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 w-full min-h-screen flex overflow-hidden">
      {/* ── DEMO MODE FLOATING TOAST ── */}
      {IS_DEMO_MODE && !isDemoBannerDismissed && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-[#FFFBEB] dark:bg-amber-950/90 border border-amber-200/60 dark:border-amber-900/40 p-4 rounded-2xl shadow-2xl flex items-start gap-3 max-w-sm font-sans animate-fadeIn">
          <div className="w-8 h-8 rounded-xl bg-amber-150 text-amber-600 flex items-center justify-center font-bold text-base flex-shrink-0 select-none">
            ⚠️
          </div>
          <div className="flex-grow">
            <h5 className="font-extrabold text-[10px] text-amber-800 dark:text-amber-400 uppercase tracking-wider">Modo Demostración Activo</h5>
            <p className="text-[11px] text-gray-500 dark:text-gray-300 font-bold mt-0.5 leading-normal">
              Datos ficticios de <b className="text-gray-800 dark:text-gray-100 font-extrabold">"Bodega Don Carlos"</b>. Para conectar producción, deshabilita <code className="font-mono bg-amber-100/50 dark:bg-amber-900/20 px-1 py-0.5 rounded text-[10px]">IS_DEMO_MODE</code>.
            </p>
          </div>
          <button 
            onClick={() => setIsDemoBannerDismissed(true)}
            className="p-1 text-amber-650 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors cursor-pointer flex-shrink-0"
            title="Ocultar advertencia de demostración"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Skip to main content accessibility link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:font-bold"
      >
        Ir al contenido principal
      </a>

      {/* Main Structural Sidebar */}
      <Sidebar 
        currentUser={currentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onToggleProfile={() => setIsProfileOpen(!isProfileOpen)}
        logout={logout}
        stats={stats}
      />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0 h-screen relative">
        {/* Universal Header (Mobile & Desktop) */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              aria-label="Abrir menú de navegación"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <ShieldCheck size={20} className="text-blue-600" />
              <span className="font-black text-xl tracking-tighter text-gray-900 dark:text-white">SAMI</span>
              {IS_DEMO_MODE && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[8px] font-black uppercase tracking-wider rounded-md">
                  DEMO
                </span>
              )}
            </div>
            
            {/* Desktop context status identifier */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Terminal de Control</span>
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse" />
              </div>
              {IS_DEMO_MODE && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/35 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Modo Demostración</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dynamic Masking Eye Toggle (Modo Jurado) */}
            <button
              onClick={onToggleMasking}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 cursor-pointer ${
                isDataMasked 
                  ? 'bg-blue-50/50 hover:bg-blue-100/50 border-blue-100/80 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-300'
              }`}
              title={isDataMasked ? "Desactivar enmascaramiento para revelar todos los montos reales (Modo Jurado de Tesis)" : "Activar enmascaramiento para proteger datos sensibles"}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {isDataMasked ? (
                  <EyeOff size={14} className="text-blue-600 dark:text-blue-400" />
                ) : (
                  <Eye size={14} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline">
                {isDataMasked ? 'Modo Seguro' : 'Modo Jurado'}
              </span>
            </button>

            {/* Bell Notification Button */}
            <button 
              onClick={() => {
                setProfilePanelTab('NOTIFICATIONS');
                setIsProfileOpen(true);
              }}
              className="relative p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/85 hover:bg-gray-100 dark:hover:bg-gray-700/85 border border-gray-100/80 dark:border-gray-700/85 text-gray-700 dark:text-gray-200 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 group cursor-pointer"
              title="Centro de Alertas y Notificaciones"
            >
              <div className="w-5 h-5 flex items-center justify-center relative">
                <Bell size={15} className={`group-hover:rotate-12 transition-transform duration-200 ${hasUnreadNotifications ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                {hasUnreadNotifications && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center select-none animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
            </button>

            {/* High-Fidelity Profile Toggle Button */}
            <button 
              onClick={() => {
                setProfilePanelTab('PROFILE');
                setIsProfileOpen(!isProfileOpen);
              }}
              className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 border border-gray-100/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 group"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <UserIcon size={14} />
              </div>
              <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">
                {currentUser.name.split(' ')[0]}
              </span>
            </button>
          </div>
        </header>

        {/* Localized View Scroll Area */}
        <main id="main-content" role="main" className="flex-grow overflow-y-auto custom-scrollbar relative pb-24 lg:pb-0 pt-0">
          {/* Floating Task Reminders */}
          {currentUser && moduloDisponible('tasks', currentUser.role) && activeTaskReminders.length > 0 && (
            <div className="fixed top-20 right-6 z-50 flex flex-col gap-3 pointer-events-none">
              <AnimatePresence>
                {activeTaskReminders.map((reminder) => (
                  <motion.div
                    key={reminder.taskId}
                    initial={{ opacity: 0, x: 50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                    className="pointer-events-auto bg-white dark:bg-gray-800 border-l-4 border-amber-500 shadow-2xl rounded-2xl p-4 flex items-start gap-4 min-w-[320px] max-w-sm"
                  >
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-xl text-amber-600">
                      <Bell size={20} />
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Recordatorio de Tarea</h4>
                      <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mt-1">{reminder.title}</p>
                      <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-2 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-lg inline-block">
                        {reminder.daysRemain === 0 ? 'Vence Hoy' : reminder.daysRemain === 1 ? 'Vence Mañana' : `Vence en ${reminder.daysRemain} días`}
                      </p>
                    </div>
                    <button 
                      onClick={() => onDismissTaskReminder ? onDismissTaskReminder(reminder.taskId) : null}
                      className="text-gray-300 hover:text-gray-500 transition-colors"
                      aria-label="Cerrar recordatorio"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Global Task Notification Banner */}
          {currentUser && (currentUser.role === AppRole.MYPE_ADMIN || currentUser.role === AppRole.MYPE_WORKER) && moduloDisponible('tasks', currentUser.role) && (stats.pendingTasksCount > 0) && !isTaskBannerDismissed && (
            <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between relative z-25">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${stats.overdueTasksCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-500 text-white'}`}>
                  <Bell size={14} />
                </div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {stats.overdueTasksCount > 0 ? (
                    <span>Tienes <span className="text-red-600 dark:text-red-400 font-black">{stats.overdueTasksCount}</span> tareas vencidas. ¡Priorízalas ahora!</span>
                  ) : (
                    <span>Tienes <span className="text-indigo-600 dark:text-indigo-400 font-black">{stats.pendingTasksCount}</span> tareas pendientes para hoy.</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentView('tasks')}
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Ver Tareas
                </button>
                <button 
                  onClick={() => setIsTaskBannerDismissed(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  title="Ocultar alertas de tareas"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Render Active Module */}
          {children}
        </main>
      </div>

      {/* Right-hand Profile & Settings Panel */}
      <AnimatePresence>
        {isProfileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-xs z-40"
            />
            
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 z-50 flex flex-col shadow-2xl shadow-indigo-500/10"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                    {profilePanelTab === 'NOTIFICATIONS' ? <Bell size={18} /> : <UserIcon size={18} />}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                      {profilePanelTab === 'NOTIFICATIONS' ? 'Centro de Alertas' : 'Perfil de Usuario'}
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={() => setIsProfileOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 dark:text-gray-500 transition-all cursor-pointer"
                  aria-label="Cerrar panel"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Seamless Tab Navigation for Profile Right Panel */}
              <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20 p-1 m-4 rounded-xl">
                <button
                  type="button"
                  onClick={() => setProfilePanelTab('NOTIFICATIONS')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    profilePanelTab === 'NOTIFICATIONS' 
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span className="relative">
                    Bandeja
                    {hasUnreadNotifications && (
                      <span className="absolute -top-1 -right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfilePanelTab('PROFILE')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    profilePanelTab === 'PROFILE' 
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Perfil y Ajustes
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {profilePanelTab === 'NOTIFICATIONS' ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Mis Alertas ({inAppNotifications.length})
                      </span>
                      {hasUnreadNotifications && (
                        <button
                          type="button"
                          onClick={() => setInAppNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                          className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Marcar todo leído
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {inAppNotifications.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                          <Bell size={24} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Tu bandeja de SAMI está al día.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {inAppNotifications.map(notification => (
                            <div 
                              key={notification.id} 
                              className={`p-4 rounded-2xl border transition-all relative group flex flex-col gap-2 ${
                                notification.read
                                  ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800/80 text-gray-600 dark:text-gray-300'
                                  : 'bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-100/60 dark:border-indigo-900/30 text-gray-900 dark:text-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className={`p-2 rounded-xl mt-0.5 ${
                                    notification.type === 'SUNAT_DEADLINE' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600' :
                                    notification.type === 'SCORE_INCREASE' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600' :
                                    notification.type === 'UNUSUAL_EXPENSE' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600' :
                                    'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600'
                                  }`}>
                                    {notification.type === 'SUNAT_DEADLINE' ? <Calculator size={14} /> :
                                     notification.type === 'SCORE_INCREASE' ? <TrendingUp size={14} /> :
                                     notification.type === 'UNUSUAL_EXPENSE' ? <AlertTriangle size={14} /> :
                                     <Info size={14} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-xs font-black uppercase tracking-tight leading-none">
                                        {notification.title}
                                      </h4>
                                      {!notification.read && (
                                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                      )}
                                    </div>
                                    <p className="text-xs text-readable-muted font-bold mt-1.5 leading-relaxed">
                                      {notification.body}
                                    </p>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mt-2">
                                      {notification.timestamp}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setInAppNotifications(prev => prev.filter(n => n.id !== notification.id))}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-300 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Eliminar notificación"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              {notification.action && moduloDisponible(notification.action as any, currentUser.role) && (
                                <div className="mt-1 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInAppNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
                                      setCurrentView(notification.action as any);
                                      setIsProfileOpen(false);
                                    }}
                                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-100/50 dark:border-indigo-800/30 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all cursor-pointer"
                                  >
                                    {notification.action === 'accounting' ? '📄 Gestionar Declaración' :
                                     notification.action === 'credit' ? '💸 Ver Ofertas' :
                                     notification.action === 'expenses' ? '🔍 Auditar Gasto' :
                                     notification.action === 'profiling' ? '📊 Ver Mi Reporte' :
                                     'Ver Detalle'} →
                                  </button>
                                  {!notification.read && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInAppNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
                                      }}
                                      className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 text-readable-muted text-[10px] font-bold rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer"
                                    >
                                      Entendido
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-fade-in">
                    {/* User Info Section */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700">
                       <div className="flex flex-col items-center text-center">
                         <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-6 relative group overflow-hidden">
                            <UserIcon size={40} className="group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </div>
                         <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{currentUser.name}</h4>
                         <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mt-1 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                           {currentUser.role.replace('_', ' ')}
                         </p>
                         <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 w-full space-y-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Email Corporativo</span>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentUser.email}</span>
                            </div>
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Estado de Identidad</span>
                              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <ShieldCheck size={14} />
                                <span className="text-xs font-bold">Verificada con 2FA</span>
                              </div>
                            </div>
                         </div>
                       </div>
                    </div>

                    {/* Notification Settings Section */}
                    <div>
                       <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 ml-2">Canales de Notificación</h5>
                       <NotificationSettings 
                          settings={notificationSettings} 
                          onSave={setNotificationSettings} 
                        />
                    </div>
                  </div>
                )}

                {/* App Information / Credits */}
                <div className="pt-8 text-center text-gray-400 dark:text-gray-600">
                  <p className="text-[10px] font-bold uppercase tracking-widest">SAMI Artificial Intelligence • v1.4.2</p>
                  <p className="text-[9px] mt-2 font-medium">© 2026 Sami Fintech. Todos los derechos reservados.</p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <button 
                  onClick={() => logout()}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm cursor-pointer"
                >
                  <LogOut size={16} />
                  Cerrar Sesión Activa
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation — Mobile only, MYPE roles */}
      {(currentUser.role === AppRole.MYPE_ADMIN || currentUser.role === AppRole.MYPE_WORKER) && (
        <BottomNav
          currentView={currentView}
          setCurrentView={setCurrentView}
          userRole={currentUser.role}
          pendingAlerts={stats.pendingAlerts}
          isCreditEligible={Boolean(stats.isCreditEligible)}
        />
      )}

      {/* FAB — Venta rápida + Chat, Mobile MYPE_ADMIN */}
      {currentUser.role === AppRole.MYPE_ADMIN && (
        <FloatingActionButton
          onQuickSale={onQuickSaleClick}
          onOpenChat={moduloDisponible('chat', currentUser.role) ? () => setCurrentView('chat') : undefined}
        />
      )}

      {/* Session Timeout Warning */}
      {showSessionWarning && (
        <div className="fixed top-4 right-4 z-[200] bg-amber-500 text-white px-5 py-4 rounded-2xl shadow-2xl animate-slide-in flex items-center gap-3 max-w-sm">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="font-black text-sm">Tu sesión vence pronto</p>
            <p className="text-white/80 text-xs">Por seguridad, cierra sesión en 5 minutos si no estás usando SAMI.</p>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 max-w-sm pointer-events-none w-full px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-gray-900/95 dark:bg-white/95 text-white dark:text-gray-900 backdrop-blur-md p-4 rounded-2xl shadow-2xl flex items-start gap-3 pointer-events-auto border border-white/10 dark:border-gray-200"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-650/10 text-indigo-400 dark:text-indigo-600 flex items-center justify-center font-bold text-base flex-shrink-0 select-none">
                💡
              </div>
              <div className="flex-grow min-w-0 pr-2">
                <h5 className="font-extrabold text-[11px] text-indigo-400 dark:text-indigo-600 uppercase tracking-wider">{toast.title}</h5>
                <p className="text-[11px] text-gray-300 dark:text-gray-800 font-bold mt-0.5 leading-normal break-words">
                  {toast.body}
                </p>
              </div>
              <button
                onClick={() => onDismissToast(toast.id)}
                className="text-gray-400 hover:text-white dark:hover:text-black transition-colors cursor-pointer text-xs flex-shrink-0 w-4 h-4 flex items-center justify-center"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AppShell;
