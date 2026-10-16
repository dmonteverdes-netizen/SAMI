
import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import type { 
  Message, 
  Invoice, 
  UserProgress, 
  Course, 
  PaymentAlert, 
  UserNotificationSettings, 
  SamiCoinTransaction, 
  Referral, 
  LoyaltyReward,
  CreditApplication,
  Task,
  TaxSummary 
} from './types';
import { Sender, InvoiceType, NotificationType, DocumentType, TaskStatus } from './types';
import AccountingModule from './modules/ventas/AccountingModule';
import NotificationSettings from './modules/gestion/NotificationSettings';
import { 
  registerServiceWorker, 
  getNotificationPermissionStatus, 
  getPersistentPermissionPreference,
  showLocalPushNotification,
  startPeriodicSubscriptionCheck
} from './services/pushNotificationService';
import Dashboard from './modules/dashboard/Dashboard';
import TwoFactorAuthModal from './modules/cuenta/TwoFactorAuthModal';
import { sendMessageToGemini } from './services/geminiService';
import { calculateTaxes, validateInvoice, isDuplicateInvoice } from './services/accountingService';
import { getCourses, getUserProgress } from './services/educationService';
import { logAdminAction } from './services/auditService';
import { encryptData, decryptData } from './services/encryptionService';
import { detectUnusualExpense, sendCloudNotification, checkCreditEligibilityTrigger } from './services/notificationService';
import { getTaxFinancialSummary } from './services/creditService';
import { createTransaction, sendReferralInvitation, POINTS_CONFIG } from './services/loyaltyService';
import { api } from './core/services/api';
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
  Bell, 
  LogOut, 
  Settings,
  Menu,
  X,
  User as UserIcon,
  ShieldAlert,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Info,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ChatHistoryItem } from './services/geminiService';
import { useAuth } from './core/context/AuthContext';
import { useSecurity } from './core/context/SecurityContext';

import Sidebar, { View } from './shared/layout/Sidebar';
import { AppRole } from './types';

// Carga diferida (Code Splitting / React.lazy) de vistas por rol y fases para optimizar rendimiento móvil (360px)
const AdminDashboard = lazy(() => import('./modules/admin/AdminDashboard'));
const BankDashboard = lazy(() => import('./modules/creditos/BankDashboard'));
const WorkerDashboard = lazy(() => import('./modules/dashboard/WorkerDashboard'));
const OwnerDashboard = lazy(() => import('./modules/dashboard/OwnerDashboard'));
const ExpenseModule = lazy(() => import('./modules/compras/ExpenseModule'));
const ManagementModule = lazy(() => import('./modules/gestion/ManagementModule'));
const FinancialGlossary = lazy(() => import('./modules/glosario/FinancialGlossary'));

// Módulos diferidos de fases 2, 3 y 4 (su código no viaja al navegador mientras están apagados)
const CreditMarketplace = lazy(() => import('./modules/creditos/CreditMarketplace'));
const DeepProfilingModule = lazy(() => import('./modules/perfil-riesgo/DeepProfilingModule'));
const EducationModule = lazy(() => import('./modules/academia/EducationModule'));
const TaskModule = lazy(() => import('./modules/tareas/TaskModule'));
const LoyaltyModule = lazy(() => import('./modules/rewards/LoyaltyModule'));
const ChatWindow = lazy(() => import('./modules/asistente/ChatWindow'));
import PhaseEmptyState from './shared/ui/PhaseEmptyState';
import { moduloDisponible, modulosDisponiblesParaRol } from './core/config/phases';

import { MOCK_SALES, MOCK_PURCHASES, MOCK_TASKS, IS_DEMO_MODE } from './data/mockData';
import BottomNav from './shared/layout/BottomNav';
import QuickSaleModal from './modules/ventas/QuickSaleModal';
import FloatingActionButton from './shared/layout/FloatingActionButton';
import OnboardingWizard from './modules/cuenta/OnboardingWizard';

// Helper para persistencia
function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    if (!IS_DEMO_MODE) return initialValue;
    try {
      const stored = localStorage.getItem(`sami_demo_${key}`);
      if (!stored) return initialValue;
      
      // Strict Banking Audit: Decrypt encrypted fields on-the-fly
      if (stored.startsWith('sami_v1:')) {
        return decryptData<T>(stored);
      }
      return JSON.parse(stored);
    } catch { return initialValue; }
  });
  
  const setPersistentState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      if (IS_DEMO_MODE) {
        try { 
          // Encrypt data before persisting to physical storage to prevent leakage (PCI-DSS & SBS Alignment)
          const encrypted = encryptData(next);
          localStorage.setItem(`sami_demo_${key}`, encrypted); 
        } catch {}
      }
      return next;
    });
  }, [key]);
  
  return [state, setPersistentState] as const;
}

const App: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { 
    isAdminAuthenticated, 
    authenticateAdmin, 
    is2faModalOpen, 
    open2faModal, 
    close2faModal 
  } = useSecurity();
  const [currentView, setCurrentViewState] = useState<View>(() => {
    return 'dashboard';
  });

  const setCurrentView = useCallback((view: View) => {
    if (currentUser && !moduloDisponible(view, currentUser.role)) {
      setCurrentViewState('dashboard');
    } else {
      setCurrentViewState(view);
    }
  }, [currentUser]);

  // Si la vista actual no está permitida para el rol o fase activa, reorientar al dashboard
  useEffect(() => {
    if (currentUser && !moduloDisponible(currentView, currentUser.role)) {
      setCurrentViewState('dashboard');
    }
  }, [currentUser, currentView]);

  // Vista efectiva validada contra registro de módulos y fase activa
  const activeView: View = useMemo(() => {
    if (!currentUser) return 'dashboard';
    if (!moduloDisponible(currentView, currentUser.role)) return 'dashboard';
    return currentView;
  }, [currentView, currentUser]);

  // Theme & Profile panels are defined here
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sami_sidebar_collapsed');
    return saved === 'true';
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => 
    localStorage.getItem('sami_onboarding_done') === 'true'
  );

  // Masking state for Thesis Presentation mode
  const [isDataMasked, setIsDataMasked] = useState(() => {
    const saved = localStorage.getItem('sami_disable_masking');
    return saved !== 'true'; // True = mask data; False = show real data
  });

  const handleToggleMasking = () => {
    setIsDataMasked(prev => {
      const nextVal = !prev;
      localStorage.setItem('sami_disable_masking', (!nextVal).toString());
      return nextVal;
    });
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('sami_onboarding_done', 'true');
    setHasSeenOnboarding(true);
  };

  const [isTaskBannerDismissed, setIsTaskBannerDismissed] = useState(false);
  const [isDemoBannerDismissed, setIsDemoBannerDismissed] = useState(false);

  const [toasts, setToasts] = useState<{ id: string; title: string; body: string }[]>([]);

  const [profilePanelTab, setProfilePanelTab] = useState<'NOTIFICATIONS' | 'PROFILE'>('NOTIFICATIONS');
  const [inAppNotifications, setInAppNotifications] = usePersistentState<{
    id: string;
    title: string;
    body: string;
    type: string;
    timestamp: string;
    read: boolean;
    action?: string;
  }[]>('in_app_notification_logs_v1', [
    {
      id: 'n-init-1',
      title: 'Declaración Tributaria',
      body: 'SAMI te recuerda: Mantén al día tus comprobantes de venta y compra para emitir tus registros RVIE/RSE ante SUNAT.',
      type: 'SUNAT_DEADLINE',
      timestamp: 'Hace 1 hora',
      read: false,
      action: 'accounting'
    },
    {
      id: 'n-init-3',
      title: 'Alerta: Compra Registrada',
      body: 'Se ha registrado una compra de mercadería en el módulo de Compras. Revisa el balance operativo.',
      type: 'UNUSUAL_EXPENSE',
      timestamp: 'Hace 3 días',
      read: true,
      action: 'expenses'
    }
  ]);

  useEffect(() => {
    const handleSamiToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; body: string; data?: any }>;
      if (customEvent.detail) {
        const { title, body, data } = customEvent.detail;
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, title, body }]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4500);

        setInAppNotifications((prev) => {
          const type = data?.type || 'SYSTEM';
          const action = data?.action || (
            title.toLowerCase().includes('crédito') || title.toLowerCase().includes('préstamo') ? 'credit' : 
            title.toLowerCase().includes('comprobante') || title.toLowerCase().includes('factura') || title.toLowerCase().includes('venta') ? 'accounting' : 
            title.toLowerCase().includes('gasto') ? 'expenses' : undefined
          );
          return [
            {
              id: `n-${Date.now()}`,
              title,
              body,
              type,
              timestamp: 'Ahora mismo',
              read: false,
              action
            },
            ...prev
          ];
        });
      }
    };
    window.addEventListener('sami-toast', handleSamiToast);
    return () => window.removeEventListener('sami-toast', handleSamiToast);
  }, [setInAppNotifications]);

  // Session timeout — 30 minutos de inactividad
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const resetTimer = () => {
      setLastActivity(Date.now());
      setShowSessionWarning(false);
    };
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    
    const interval = setInterval(() => {
      const inactiveMins = (Date.now() - lastActivity) / 60000;
      if (inactiveMins >= 25 && inactiveMins < 30) setShowSessionWarning(true);
      if (inactiveMins >= 30) logout();
    }, 60000);
    
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearInterval(interval);
    };
  }, [lastActivity, logout]);
  
  // Update storage when collapsed state changes
  useEffect(() => {
    localStorage.setItem('sami_sidebar_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);
  
  // Chatbot State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatHistoryRef = useRef<ChatHistoryItem[]>([]);

  // Accounting & Credit State
  const [sales, setSales] = usePersistentState<Invoice[]>('sales', MOCK_SALES);
  const [purchases, setPurchases] = usePersistentState<Invoice[]>('purchases', MOCK_PURCHASES);
  const [alerts, setAlerts] = useState<PaymentAlert[]>([
    { id: 'a1', vendorId: 'v1', serviceName: 'Alquiler Local', dueDate: '2026-05-20', amount: 3500.00, status: 'pending', frequency: 'monthly' },
    { id: 'a2', vendorId: 'v2', serviceName: 'Servicio Internet Fibra', dueDate: '2026-05-18', amount: 189.90, status: 'pending', frequency: 'monthly' }
  ]);
  const [creditApplications, setCreditApplications] = useState<CreditApplication[]>([
    {
      id: 'app-991',
      userId: currentUser?.id || 'default',
      type: 'loan',
      amount: 5000,
      partner: { id: 'fintech_a', name: 'Fintech Veloz', logoUrl: 'https://placehold.co/100x40/007bff/ffffff?text=Veloz' },
      status: 'approved',
      timestamp: '2026-03-15T10:00:00Z',
      details: 'Capital de trabajo para campaña escolar'
    },
    {
      id: 'app-992',
      userId: currentUser?.id || 'default',
      type: 'factoring',
      amount: 1250.50,
      partner: { id: 'caja_b', name: 'Caja Confianza', logoUrl: 'https://placehold.co/100x40/28a745/ffffff?text=Confianza' },
      status: 'disbursed',
      timestamp: '2026-04-02T15:30:00Z',
      details: 'Adelanto Factura F001-442'
    },
    {
      id: 'app-993',
      userId: currentUser?.id || 'default',
      type: 'loan',
      amount: 15000,
      partner: { id: 'banco_c', name: 'Banco ProMYPE', logoUrl: 'https://placehold.co/100x40/ffc107/000000?text=ProMYPE' },
      status: 'pending',
      timestamp: '2026-05-12T09:15:00Z',
      details: 'Expansión de inventario de telas'
    }
  ]);
  
  // Notification State
  const [notificationSettings, setNotificationSettings] = usePersistentState<UserNotificationSettings>('notification_settings', {
    userId: currentUser?.id || 'default',
    channels: { push: true, whatsapp: false, email: true },
    phoneNumber: '+51 900 000 000'
  });
  const [activeTaskReminders, setActiveTaskReminders] = useState<{taskId: string, title: string, daysRemain: number}[]>([]);

  // Register Service Worker and sync notification configuration on mount
  useEffect(() => {
    let stopCheck: (() => void) | undefined;
    const initNotifications = async () => {
      await registerServiceWorker();
      const status = getNotificationPermissionStatus();
      const preference = getPersistentPermissionPreference();
      
      if (status === 'denied' || preference === 'denied') {
        setNotificationSettings(prev => {
          if (prev.channels.push) {
            return {
              ...prev,
              channels: { ...prev.channels, push: false }
            };
          }
          return prev;
        });
      } else if (status === 'granted' && preference === 'granted') {
        setNotificationSettings(prev => {
          if (!prev.channels.push) {
            return {
              ...prev,
              channels: { ...prev.channels, push: true }
            };
          }
          return prev;
        });

        // Start checking periodically if permission is granted and push is enabled
        stopCheck = startPeriodicSubscriptionCheck(currentUser?.id || 'default', 60000);
      }
    };
    initNotifications();

    return () => {
      if (stopCheck) {
        stopCheck();
      }
    };
  }, [setNotificationSettings, currentUser?.id]);

  // Loyalty & Growth State
  const [samiCoins, setSamiCoins] = useState<number>(100); // Initial welcome bonus
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<SamiCoinTransaction[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  // Task State
  const [tasks, setTasks] = usePersistentState<Task[]>('tasks', MOCK_TASKS);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [isDataSyncing, setIsDataSyncing] = useState(false);

  // ─── Sincronización con Servidor Central (Fuente de Verdad) ───
  const syncServerData = useCallback(async () => {
    if (!currentUser) return;
    setIsDataSyncing(true);
    let hadError = false;

    // 1. Sincronizar Ventas
    try {
      const res = await api.get('/accounting/sales');
      if (res.data?.sales && Array.isArray(res.data.sales)) {
        setSales(res.data.sales);
        localStorage.setItem('sami_backup_sales', JSON.stringify(res.data.sales));
      }
    } catch (err) {
      console.warn('[SAMI DataSync] No se pudieron sincronizar ventas con el servidor, usando respaldo local:', err);
      hadError = true;
    }

    // 2. Sincronizar Compras (solo para roles con permiso)
    if (currentUser.role === AppRole.MYPE_ADMIN || currentUser.role === AppRole.SAMI_ADMIN) {
      try {
        const res = await api.get('/expenses/purchases');
        if (res.data?.purchases && Array.isArray(res.data.purchases)) {
          setPurchases(res.data.purchases);
          localStorage.setItem('sami_backup_purchases', JSON.stringify(res.data.purchases));
        }
      } catch (err) {
        console.warn('[SAMI DataSync] No se pudieron sincronizar compras con el servidor, usando respaldo local:', err);
        hadError = true;
      }
    }

    // 3. Sincronizar Tareas
    if (currentUser.role === AppRole.MYPE_ADMIN || currentUser.role === AppRole.MYPE_WORKER || currentUser.role === AppRole.SAMI_ADMIN) {
      try {
        const res = await api.get('/tasks');
        if (res.data?.tasks && Array.isArray(res.data.tasks)) {
          setTasks(res.data.tasks);
          localStorage.setItem('sami_backup_tasks', JSON.stringify(res.data.tasks));
        }
      } catch (err) {
        console.warn('[SAMI DataSync] No se pudieron sincronizar tareas con el servidor, usando respaldo local:', err);
        hadError = true;
      }
    }

    setIsOfflineFallback(hadError);
    setIsDataSyncing(false);
  }, [currentUser, setSales, setPurchases, setTasks]);

  useEffect(() => {
    syncServerData();
  }, [syncServerData]);

  const handleAddTask = async (taskData: Omit<Task, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newTask: Task = { ...taskData, id: tempId };
    setTasks(prev => [newTask, ...prev]);

    try {
      const res = await api.post('/tasks', taskData);
      if (res.data?.task?.id) {
        setTasks(prev => prev.map(t => t.id === tempId ? res.data.task : t));
      }
    } catch (err) {
      console.error('[SAMI] Error guardando tarea en servidor. Revirtiendo estado:', err);
      setTasks(prev => prev.filter(t => t.id !== tempId));
      alert('No se pudo guardar la tarea en el servidor. El cambio local fue revertido.');
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    try {
      await api.put(`/tasks/${taskId}`, updates);
    } catch (err) {
      console.error('[SAMI] Error actualizando tarea en servidor. Revirtiendo estado:', err);
      setTasks(previousTasks);
      alert('No se pudo actualizar la tarea en el servidor. El cambio local fue revertido.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const previousTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      await api.delete(`/tasks/${taskId}`);
    } catch (err) {
      console.error('[SAMI] Error eliminando tarea en servidor. Revirtiendo estado:', err);
      setTasks(previousTasks);
      alert('No se pudo eliminar la tarea en el servidor. El cambio local fue revertido.');
    }
  };

  // Listen for tasks scheduled from other components (like monthly tax tables)
  useEffect(() => {
    const handleSamiAddTask = (e: Event) => {
      const customEvent = e as CustomEvent<{
        title: string;
        description: string;
        dueDate: string;
        priority: 'low' | 'medium' | 'high';
        category?: string;
      }>;
      
      if (customEvent.detail) {
        const { title, description, dueDate, priority, category } = customEvent.detail;
        handleAddTask({
          title,
          description,
          dueDate,
          status: TaskStatus.PENDING,
          priority: priority || 'high',
          category: category || 'General',
          reminderDaysBefore: 3
        });
      }
    };

    window.addEventListener('sami:add-task', handleSamiAddTask);
    return () => {
      window.removeEventListener('sami:add-task', handleSamiAddTask);
    };
  }, []);

  // Task Reminder Logic
  useEffect(() => {
    if (!currentUser || tasks.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reminders = tasks.filter(task => {
        if (task.status === 'completed' || task.reminderDaysBefore === undefined) return false;
        
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0,0,0,0);
        
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Trigger if we are exactly on the reminder day or after (but before completion)
        return diffDays <= task.reminderDaysBefore && diffDays >= 0;
    }).map(task => {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0,0,0,0);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { taskId: task.id, title: task.title, daysRemain: diffDays };
    });

    setActiveTaskReminders(reminders);
  }, [tasks, currentUser]);

  const earnCoins = (amount: number, description: string) => {
    const tx = createTransaction(amount, 'earn', description);
    setSamiCoins(prev => prev + amount);
    setLoyaltyTransactions(prev => [tx, ...prev]);
  };

  const redeemCoins = (reward: LoyaltyReward) => {
    if (samiCoins >= reward.cost) {
      const tx = createTransaction(reward.cost, 'redeem', `Canje: ${reward.name}`);
      setSamiCoins(prev => prev - reward.cost);
      setLoyaltyTransactions(prev => [tx, ...prev]);
      alert(`¡Felicidades! Has canjeado: ${reward.name}. Se aplicará automáticamente.`);
    }
  };

  const handleInvite = async (email: string) => {
    const newRef = await sendReferralInvitation(email);
    setReferrals(prev => [newRef, ...prev]);
  };

  // Monitor Sales for Credit Eligibility Alerts
  const lastSalesAvgRef = useRef<number>(0);
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [isTaxSummaryLoading, setIsTaxSummaryLoading] = useState<boolean>(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTaxSummaryAsync = async () => {
      setIsTaxSummaryLoading(true);
      setScoreError(null);
      try {
        const result = await getTaxFinancialSummary(sales, purchases);
        if (isMounted) {
          setTaxSummary(result);
        }
      } catch (err: any) {
        if (isMounted) {
          setScoreError(err.message || 'Error al obtener resumen tributario');
        }
      } finally {
        if (isMounted) {
          setIsTaxSummaryLoading(false);
        }
      }
    };
    fetchTaxSummaryAsync();
    return () => {
      isMounted = false;
    };
  }, [sales, purchases]);

  useEffect(() => {
    if (taxSummary) {
      const oldSales = lastSalesAvgRef.current;
      const newSales = taxSummary.avgMonthlySales;
      
      const isEligibleTrigger = checkCreditEligibilityTrigger(oldSales, newSales);
      if (isEligibleTrigger) {
        if (notificationSettings.channels.whatsapp) {
          sendCloudNotification({
            to: notificationSettings.phoneNumber || '',
            channel: 'whatsapp',
            templateId: 'tmpl_credit_eligibility',
            placeholders: {
              name: currentUser?.name || 'Usuario',
              amount: newSales.toString(),
              link: 'https://sami.pe/creditos'
            }
          });
        }
        if (notificationSettings.channels.push) {
          showLocalPushNotification(
            '📊 Pre-evaluación Crediticia Disponible',
            `Con tus ventas de S/ ${newSales.toLocaleString()}, calificas a opciones de crédito MYPE de entidades aliadas.`
          );
        }
      }
      lastSalesAvgRef.current = newSales;
    }
  }, [taxSummary, notificationSettings, currentUser]);

  // Education State
  const [courses, setCourses] = useState<Course[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>({});
  
  const handleAdminAccess = useCallback(() => {
    if (currentUser?.role === AppRole.SAMI_ADMIN && !isAdminAuthenticated) {
      open2faModal();
    } else if (currentUser?.role?.startsWith('SAMI_')) {
      setCurrentView('admin');
    }
  }, [currentUser, isAdminAuthenticated, open2faModal]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role.startsWith('SAMI_')) {
        setCurrentView('admin');
        if (currentUser.role === AppRole.SAMI_ADMIN && !isAdminAuthenticated) {
          open2faModal();
        }
      } else if (currentUser.role.startsWith('BANK_')) {
        setCurrentView(moduloDisponible('bank-api', currentUser.role) ? 'bank-api' : 'dashboard');
      } else if (currentUser.role === AppRole.MYPE_WORKER) {
        setCurrentView(moduloDisponible('tasks', currentUser.role) ? 'tasks' : 'dashboard');
      } else {
        setCurrentView('dashboard');
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const viewDescriptions: Record<string, string> = {
        'dashboard': 'Panel Principal',
        'tasks': 'Módulo de Tareas',
        'chat': 'Asistente AI',
        'accounting': 'Ventas',
        'expenses': 'Compras',
        'credit': 'Mercado de Créditos',
        'profiling': 'Perfilamiento Profundo',
        'loyalty': 'Programa de Lealtad',
        'education': 'Academia SAMI',
        'bank-api': 'Terminal Bancaria',
        'admin': 'Panel de Administración'
      };
      const desc = viewDescriptions[currentView as string] || currentView;
      logAdminAction(currentUser, `Cambio de pestaña: ${desc}`);
    }
  }, [currentView, currentUser]);

  useEffect(() => {
    // Fetch initial education data
    const fetchEducationData = async () => {
        const [allCourses, progress] = await Promise.all([getCourses(), getUserProgress()]);
        setCourses(allCourses);
        setUserProgress(progress);
    };
    fetchEducationData();
  }, []);
  
  const isFinanceCertified = useMemo(() => {
    const financeCourses = courses.filter(c => c.category === 'finance');
    if (financeCourses.length === 0) return false;

    return financeCourses.every(course => {
        const completedLessons = course.lessons.filter(lesson => userProgress[lesson.id]).length;
        return completedLessons === course.lessons.length;
    });
  }, [courses, userProgress]);

  const handleLessonComplete = (lessonId: string) => {
    setUserProgress(prev => ({ ...prev, [lessonId]: true }));
    earnCoins(POINTS_CONFIG.COURSE_COMPLETED, `Lección completada: ${lessonId}`);
  };

  const handleAddInvoice = async (invoice: Omit<Invoice, 'id'>) => {
      const isPurchase = invoice.type === InvoiceType.PURCHASE;
      const relevantList = isPurchase ? purchases : sales;

      // Verificación de duplicidad de serie + correlativo en el registro contable
      if (isDuplicateInvoice(invoice, relevantList)) {
          const formattedNumber = `${invoice.series.toUpperCase()}-${String(invoice.correlative).padStart(8, '0')}`;
          throw new Error(`Ya existe un comprobante con la serie y correlativo ${formattedNumber}. Verifica antes de registrar.`);
      }

      validateInvoice(invoice); 

      const tempId = crypto.randomUUID();
      const newInvoice: Invoice = { ...invoice, id: tempId };
      
      // Cloud Architect: Logic for Unusual Expense Alert
      if (invoice.type === InvoiceType.PURCHASE) {
          const isUnusual = detectUnusualExpense(newInvoice, purchases);
          if (isUnusual) {
              if (notificationSettings.channels.whatsapp) {
                  sendCloudNotification({
                      to: notificationSettings.phoneNumber || '',
                      channel: 'whatsapp',
                      templateId: 'tmpl_unusual_expense',
                      placeholders: {
                          name: currentUser?.name || 'Usuario',
                          amount: newInvoice.totalAmount.toString(),
                          category: 'Compras'
                      }
                  });
              }
              if (notificationSettings.channels.push) {
                  showLocalPushNotification(
                      '🚨 Alerta: Gasto Inusual Detectado',
                      `Se ha registrado un gasto anormal de S/ ${newInvoice.totalAmount} en compras que supera tu promedio usual.`
                  );
              }
          }
      }

      if (invoice.type === InvoiceType.SALE) {
          // Optimistic update
          setSales(prev => [...prev, newInvoice].sort((a,b) => Date.parse(b.issueDate) - Date.parse(a.issueDate)));
          earnCoins(POINTS_CONFIG.INVOICE_UPLOAD, `Venta cargada: ${newInvoice.series}-${newInvoice.correlative}`);
          
          try {
              const res = await api.post('/accounting/sales', invoice);
              if (res.data?.sale?.id) {
                  setSales(prev => prev.map(s => s.id === tempId ? res.data.sale : s));
              }
          } catch (err) {
              console.error('[SAMI] Error guardando venta en servidor. Revirtiendo estado:', err);
              setSales(prev => prev.filter(s => s.id !== tempId));
              alert('No se pudo sincronizar la venta con el servidor. El cambio local fue revertido.');
              return;
          }

          if (notificationSettings.channels.push) {
              showLocalPushNotification(
                  '💰 ¡Venta Registrada Exitosamente!',
                  `Se cargó la boleta/factura por S/ ${newInvoice.totalAmount}. ¡Ganaste +${POINTS_CONFIG.INVOICE_UPLOAD} SAMI Coins!`
              );
          }
      } else {
          // Optimistic update
          setPurchases(prev => [...prev, newInvoice].sort((a,b) => Date.parse(b.issueDate) - Date.parse(a.issueDate)));
          earnCoins(POINTS_CONFIG.INVOICE_UPLOAD, `Compra cargada: ${newInvoice.series}-${newInvoice.correlative}`);
          
          try {
              const res = await api.post('/expenses/purchases', invoice);
              if (res.data?.purchase?.id) {
                  setPurchases(prev => prev.map(p => p.id === tempId ? res.data.purchase : p));
              }
          } catch (err) {
              console.error('[SAMI] Error guardando compra en servidor. Revirtiendo estado:', err);
              setPurchases(prev => prev.filter(p => p.id !== tempId));
              alert('No se pudo sincronizar la compra con el servidor. El cambio local fue revertido.');
              return;
          }

          if (notificationSettings.channels.push) {
              showLocalPushNotification(
                  '🧾 ¡Compra Registrada Exitosamente!',
                  `Se cargó la boleta/factura por S/ ${newInvoice.totalAmount}. ¡Ganaste +${POINTS_CONFIG.INVOICE_UPLOAD} SAMI Coins!`
              );
          }
      }
  };

  useEffect(() => {
    setMessages([
      {
        id: 'initial',
        text: '¡Hola! Soy SAMI, tu asistente de IA. Estoy aquí para ayudarte con tus consultas sobre contabilidad, microcréditos y educación empresarial para MYPES en Perú. ¿En qué puedo ayudarte hoy?',
        sender: Sender.BOT,
      },
    ]);
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), text, sender: Sender.USER };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsChatLoading(true);
    setChatError(null);
    try {
      const { chat, response } = await sendMessageToGemini(text, chatHistoryRef.current);
      chatHistoryRef.current = chat;
      const botMessage: Message = { id: Date.now().toString() + '-bot', text: response, sender: Sender.BOT };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (err: any) {
      const errorMessage = err?.message || 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.';
      setChatError(errorMessage);
      const errorBotMessage: Message = { id: Date.now().toString() + '-error', text: errorMessage, sender: Sender.BOT };
      setMessages((prevMessages) => [...prevMessages, errorBotMessage]);
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  }, []);
  

  const handle2faSuccess = () => {
    if(!currentUser) return;
    logAdminAction(currentUser, 'Inicio de sesión de administrador exitoso (2FA verificado)');
    authenticateAdmin();
    close2faModal();
    setCurrentView('admin');
  };

  /**
   * RBAC Component to wrap views with role/auth requirements
   */
  const ProtectedView: React.FC<{
    allowedRoles: AppRole[];
    requireAdminAuth?: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }> = ({ allowedRoles, requireAdminAuth, children, fallback }) => {
    if (!currentUser) return null;
    
    const isAuthorized = allowedRoles.includes(currentUser.role);
    const isAuthVerified = requireAdminAuth ? isAdminAuthenticated : true;

    if (!isAuthorized || !isAuthVerified) {
      const isAdminRole = currentUser.role.includes('ADMIN');
      
      return fallback || (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none">
            <div className="w-24 h-24 bg-red-50 dark:bg-red-900/10 border-4 border-red-100 dark:border-red-900/30 rounded-full flex items-center justify-center mb-8 shadow-inner">
                <ShieldAlert size={48} className="text-red-500" />
            </div>
            <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 uppercase">Acceso Restringido</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md font-medium leading-relaxed mb-8">
                {isAdminRole && !isAdminAuthenticated 
                  ? "Esta terminal requiere una verificación de identidad adicional de nivel administrativo para su desbloqueo."
                  : "Tu perfil actual no cuenta con los privilegios necesarios para acceder a este módulo."}
            </p>
            
            {isAdminRole && !isAdminAuthenticated ? (
               <button 
                onClick={open2faModal}
                className="group flex items-center gap-3 px-10 py-5 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/20 active:scale-95"
               >
                 <ShieldCheck size={20} className="group-hover:rotate-12 transition-transform" />
                 Verificar Identidad
               </button>
            ) : (
                <div className="px-8 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    No tienes permisos
                </div>
            )}
        </div>
      );
    }

    return <>{children}</>;
  };

  const navButtonClasses = (view: View) => 
    `flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-xl transition-all whitespace-nowrap overflow-hidden ${
      currentView === view 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
    }`;

  const adminButtonClasses = () => 
    `flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-xl transition-all ${
      currentView === 'admin'
      ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200 dark:shadow-none'
      : 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40'
    }`;
    
  if (!currentUser) {
    return null; // Should be redirected by router
  }

  // Si el rol autenticado no tiene ningún módulo disponible en la fase activa, mostrar estado vacío institucional
  const availableModulesForRole = modulosDisponiblesParaRol(currentUser.role);
  if (availableModulesForRole.length === 0) {
    return (
      <PhaseEmptyState 
        currentUser={currentUser} 
        onLogout={logout} 
      />
    );
  }

  const pendingAlerts = alerts.filter(a => a.status === 'pending').length;
  const isCreditEligible = taxSummary && taxSummary.avgMonthlySales >= 3000;
  
  const today = new Date().toISOString().split('T')[0];
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const overdueTasks = pendingTasks.filter(t => t.dueDate < today);
  const pendingTasksCount = pendingTasks.length;
  const overdueTasksCount = overdueTasks.length;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 w-full min-h-screen flex overflow-hidden">
      {/* ── OFFLINE FALLBACK BANNER ── */}
      {isOfflineFallback && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-3 shadow-md">
          <span>⚠️ Modo sin conexión / Respaldo local: No se pudo conectar con el servidor central. Mostrando datos de la última copia guardada localmente.</span>
          <button 
            onClick={() => syncServerData()}
            className="px-2 py-0.5 bg-white text-amber-900 rounded font-black hover:bg-amber-100 transition-colors cursor-pointer text-[11px]"
          >
            {isDataSyncing ? 'Sincronizando...' : 'Reintentar sincronización'}
          </button>
        </div>
      )}

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

      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:bg-brand-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:font-bold">
        Ir al contenido principal
      </a>
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
        stats={{
          accountingCount: sales.length,
          pendingAlerts,
          isCreditEligible: !!isCreditEligible,
          samiCoins,
          pendingTasksCount,
          overdueTasksCount
        }}
      />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0 h-screen relative">
        {/* Universal Header (Sleek navigation across desktop & mobile) */}
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
              onClick={handleToggleMasking}
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
                <Bell size={15} className={`group-hover:rotate-12 transition-transform duration-200 ${inAppNotifications.some(n => !n.read) ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                {inAppNotifications.some(n => !n.read) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center select-none animate-pulse">
                    {inAppNotifications.filter(n => !n.read).length}
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
          {currentUser && moduloDisponible('tasks', currentUser.role) && (
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
                              onClick={() => setActiveTaskReminders(prev => prev.filter(r => r.taskId !== reminder.taskId))}
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
          {currentUser && (currentUser.role === AppRole.MYPE_ADMIN || currentUser.role === AppRole.MYPE_WORKER) && moduloDisponible('tasks', currentUser.role) && (pendingTasksCount > 0) && !isTaskBannerDismissed && (
            <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between relative z-25">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${overdueTasksCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-500 text-white'}`}>
                  <Bell size={14} />
                </div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {overdueTasksCount > 0 ? (
                    <span>Tienes <span className="text-red-600 dark:text-red-400 font-black">{overdueTasksCount}</span> tareas vencidas. ¡Priorízalas ahora!</span>
                  ) : (
                    <span>Tienes <span className="text-indigo-600 dark:text-indigo-400 font-black">{pendingTasksCount}</span> tareas pendientes para hoy.</span>
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

          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              <Suspense
                fallback={
                  <div 
                    role="status" 
                    aria-live="polite" 
                    className="flex flex-col items-center justify-center min-h-[50vh] w-full p-8 text-center"
                  >
                    <div className="w-10 h-10 border-3 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Cargando módulo...</p>
                    <span className="sr-only">Cargando contenido de la vista seleccionada</span>
                  </div>
                }
              >
                {activeView === 'dashboard' && (
                  <ProtectedView allowedRoles={[AppRole.MYPE_ADMIN, AppRole.MYPE_WORKER]}>
                    {currentUser.role === AppRole.MYPE_WORKER && (
                      <WorkerDashboard 
                        tasks={tasks} 
                        sales={sales}
                        onQuickSaleClick={() => setIsQuickSaleOpen(true)}
                        onAddInvoice={handleAddInvoice}
                      />
                    )}
                    {currentUser.role === AppRole.MYPE_ADMIN && (
                      <div className="container mx-auto p-6 md:p-10 max-w-7xl">
                        <OwnerDashboard data={{
                            netCashFlow: { 
                              income: sales.reduce((a, b) => a + b.totalAmount, 0), 
                              expenses: purchases.reduce((a, b) => a + b.totalAmount, 0) 
                            },
                            taxStatus: 'Al día',
                            nextDueDate: { date: '2026-05-15', description: 'Declaración Mensual SUNAT' },
                            taxSummary: taxSummary,
                            maxLoanAmount: 15000,
                            insights: [
                              { id: '1', text: 'Excelente nivel de emisión de comprobantes RVIE/RSE.', type: 'success' },
                              { id: '2', text: 'Vencimiento de IGV según cronograma SUNAT. Tienes liquidez suficiente.', type: 'info' }
                            ]
                        }} 
                        creditApplications={creditApplications}
                        tasks={tasks}
                        purchases={purchases}
                        sales={sales}
                        isFinanceCertified={isFinanceCertified}
                        samiCoins={samiCoins}
                        userRole={currentUser.role}
                        onNavigate={(view) => {
                          if (view === 'notifications') {
                            setIsProfileOpen(true);
                          } else if (moduloDisponible(view, currentUser.role)) {
                            setCurrentView(view);
                          }
                        }}
                        onQuickSaleClick={() => setIsQuickSaleOpen(true)}
                        onAddTask={handleAddTask}
                        /> 
                      </div>
                    )}
                  </ProtectedView>
                )}

                {activeView === 'tasks' && (
                   <ProtectedView allowedRoles={[AppRole.MYPE_ADMIN, AppRole.MYPE_WORKER]}>
                      <TaskModule 
                        tasks={tasks}
                        onAddTask={handleAddTask}
                        onUpdateTask={handleUpdateTask}
                        onDeleteTask={handleDeleteTask}
                      />
                   </ProtectedView>
                )}

                {activeView === 'bank-api' && ( 
                  <ProtectedView allowedRoles={[AppRole.BANK_ADMIN, AppRole.BANK_ANALYST, AppRole.BANK_SUPERVISOR]}>
                    <BankDashboard /> 
                  </ProtectedView>
                )}
                
                {activeView === 'chat' && (
                   <div className="w-full h-full flex items-center justify-center p-4 md:p-8">
                      <ChatWindow 
                        messages={messages} 
                        isLoading={isChatLoading} 
                        onSendMessage={handleSendMessage} 
                        onViewChange={(view) => setCurrentView(view)}
                        error={chatError} 
                      />
                   </div>
                )}

                {activeView === 'accounting' && ( 
                  <ProtectedView allowedRoles={[AppRole.MYPE_ADMIN, AppRole.MYPE_WORKER]}>
                    <AccountingModule sales={sales} purchases={purchases} onAddInvoice={handleAddInvoice} /> 
                  </ProtectedView>
                )}

                {activeView === 'expenses' && ( 
                  <ProtectedView allowedRoles={[AppRole.MYPE_ADMIN]}>
                    <ExpenseModule 
                      purchases={purchases} 
                      sales={sales}
                      alerts={alerts} 
                      onAddPurchase={handleAddInvoice}
                      onAddAlert={(alert) => setAlerts(prev => [...prev, { ...alert, id: crypto.randomUUID() }])} 
                      onUpdateAlert={(alertId, status) => setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a))}
                    /> 
                  </ProtectedView>
                )}

                {activeView === 'credit' && ( 
                  <ProtectedView allowedRoles={[AppRole.MYPE_ADMIN]}>
                    <CreditMarketplace 
                      salesHistory={sales} 
                      isFinanceCertified={isFinanceCertified} 
                      applications={creditApplications}
                      onApply={(newApp) => {
                        const app: CreditApplication = {
                          ...newApp,
                          id: crypto.randomUUID(),
                          status: 'pending',
                          timestamp: new Date().toISOString()
                        };
                        setCreditApplications(prev => [app, ...prev]);
                        if (currentUser) {
                          logAdminAction(currentUser, `Nueva solicitud de ${app.type === 'loan' ? 'Préstamo' : 'Factoring'} por S/ ${app.amount} con ${app.partner.name}`);
                        }
                      }}
                    /> 
                  </ProtectedView>
                )}

                {activeView === 'profiling' && ( 
                  <ProtectedView allowedRoles={[AppRole.MYPE_ADMIN]}>
                    <DeepProfilingModule 
                      taxSummary={taxSummary} 
                      businessName={currentUser.name} 
                      ruc={sales[0]?.ruc || "20123456789"} 
                    /> 
                  </ProtectedView>
                )}

                {activeView === 'loyalty' && (
                  <ProtectedView allowedRoles={[AppRole.MYPE_ADMIN]}>
                    <LoyaltyModule 
                      balance={samiCoins}
                      transactions={loyaltyTransactions}
                      referrals={referrals}
                      onRedeem={redeemCoins}
                      onInvite={handleInvite}
                    />
                  </ProtectedView>
                )}

                {activeView === 'education' && (
                    <ProtectedView allowedRoles={[AppRole.MYPE_ADMIN, AppRole.MYPE_WORKER]}>
                      <EducationModule 
                        salesHistory={sales} 
                        courses={courses} 
                        userProgress={userProgress}
                        onLessonComplete={handleLessonComplete}
                        isFinanceCertified={isFinanceCertified}
                        taxSummary={taxSummary}
                      />
                    </ProtectedView>
                )}

                {activeView === 'glossary' && (
                    <ProtectedView allowedRoles={[AppRole.MYPE_ADMIN, AppRole.MYPE_WORKER, AppRole.BANK_ADMIN, AppRole.BANK_SUPERVISOR, AppRole.BANK_ANALYST, AppRole.SAMI_ADMIN, AppRole.SAMI_ANALYST]}>
                      <FinancialGlossary />
                    </ProtectedView>
                )}

                {activeView === 'admin' && (
                  <ProtectedView allowedRoles={[AppRole.SAMI_ADMIN, AppRole.SAMI_ANALYST]} requireAdminAuth={currentUser.role === AppRole.SAMI_ADMIN}>
                    <AdminDashboard currentUser={currentUser} onNavigate={setCurrentView} />
                  </ProtectedView>
                )}

                {activeView === 'management' && (
                  <ProtectedView allowedRoles={[AppRole.MYPE_ADMIN, AppRole.BANK_ADMIN, AppRole.BANK_SUPERVISOR, AppRole.BANK_ANALYST, AppRole.SAMI_ADMIN]}>
                    <ManagementModule currentUser={currentUser} onNavigate={setCurrentView} />
                  </ProtectedView>
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Right-hand Profile & Settings Panel */}
      <AnimatePresence>
        {isProfileOpen && (
          <>
            {/* Backdrop for both mobile and desktop to support easy cancellation */}
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
                    {inAppNotifications.some(n => !n.read) && (
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
                      {inAppNotifications.some(n => !n.read) && (
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
                                  {/* Multi-colored Category Badges */}
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

                              {/* Interactive Action Shortcuts */}
                              {notification.action && moduloDisponible(notification.action as any, currentUser.role) && (
                                <div className="mt-1 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Mark read automatically
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
      
      <AnimatePresence>
        {is2faModalOpen && (
          <TwoFactorAuthModal 
              onClose={() => close2faModal()}
              onSuccess={handle2faSuccess}
              userName={currentUser?.name}
          />
        )}
      </AnimatePresence>

      {/* Onboarding para nuevos usuarios MYPE */}
      {!hasSeenOnboarding && currentUser?.role === AppRole.MYPE_ADMIN && (
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      )}

      {/* Bottom Navigation — solo mobile, solo roles MYPE */}
      {(currentUser?.role === AppRole.MYPE_ADMIN || currentUser?.role === AppRole.MYPE_WORKER) && (
        <BottomNav
          currentView={currentView}
          setCurrentView={setCurrentView}
          userRole={currentUser.role}
          pendingAlerts={alerts.filter(a => a.status === 'pending').length}
          isCreditEligible={Boolean(isCreditEligible)}
        />
      )}

      {/* FAB — Venta rápida + Chat, solo mobile MYPE_ADMIN */}
      {currentUser?.role === AppRole.MYPE_ADMIN && (
        <FloatingActionButton
          onQuickSale={() => setIsQuickSaleOpen(true)}
          onOpenChat={moduloDisponible('chat', currentUser.role) ? () => setCurrentView('chat') : undefined}
        />
      )}

      {/* Modal Venta Rápida */}
      <QuickSaleModal
        isOpen={isQuickSaleOpen}
        onClose={() => setIsQuickSaleOpen(false)}
        onAddInvoice={handleAddInvoice}
        sales={sales}
      />

      {/* Toast de advertencia de sesión */}
      {showSessionWarning && (
        <div className="fixed top-4 right-4 z-[200] bg-amber-500 text-white px-5 py-4 rounded-2xl shadow-2xl animate-slide-in flex items-center gap-3 max-w-sm">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="font-black text-sm">Tu sesión vence pronto</p>
            <p className="text-white/80 text-xs">Por seguridad, cierra sesión en 5 minutos si no estás usando SAMI.</p>
          </div>
        </div>
      )}

      {/* Sistema de Toasts Interactivos SAMI */}
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
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
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

export default App;