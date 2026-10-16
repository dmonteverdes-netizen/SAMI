import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, AppRole, View } from '../types/types';
import { moduloDisponible } from '../config/phases';
import { logAdminAction } from '../../services/auditService';

export interface UseNavegacionOptions {
  initialView?: View;
  onRequireAdmin2FA?: () => void;
  isAdminAuthenticated?: boolean;
}

export interface UseNavegacionReturn {
  currentView: View;
  activeView: View;
  setCurrentView: (view: View) => void;
  navigateTo: (view: View) => void;
  isViewAvailable: (view: View) => boolean;
}

const VIEW_DESCRIPTIONS: Record<View, string> = {
  dashboard: 'Panel Principal',
  tasks: 'Módulo de Tareas',
  chat: 'Asistente AI',
  accounting: 'Ventas',
  expenses: 'Compras',
  credit: 'Mercado de Créditos',
  profiling: 'Perfilamiento Profundo',
  loyalty: 'Programa de Lealtad',
  education: 'Academia SAMI',
  'bank-api': 'Terminal Bancaria',
  admin: 'Panel de Administración',
  management: 'Gestión y Supervisión',
  glossary: 'Glosario Financiero',
  notifications: 'Centro de Alertas'
};

export function useNavegacion(
  currentUser: User | null,
  options?: UseNavegacionOptions
): UseNavegacionReturn {
  const [currentViewState, setCurrentViewState] = useState<View>(() => {
    return options?.initialView || 'dashboard';
  });

  const isViewAvailable = useCallback(
    (view: View): boolean => {
      if (!currentUser) return false;
      return moduloDisponible(view, currentUser.role);
    },
    [currentUser]
  );

  const setCurrentView = useCallback(
    (view: View) => {
      if (currentUser && !moduloDisponible(view, currentUser.role)) {
        setCurrentViewState('dashboard');
      } else {
        // Validación especial para SAMI Admin con 2FA si corresponde
        if (view === 'admin' && currentUser?.role === AppRole.SAMI_ADMIN && !options?.isAdminAuthenticated) {
          if (options?.onRequireAdmin2FA) {
            options.onRequireAdmin2FA();
          }
        }
        setCurrentViewState(view);
      }
    },
    [currentUser, options]
  );

  // Reorientar si la vista actual no está disponible para el rol o fase activa
  useEffect(() => {
    if (currentUser && !moduloDisponible(currentViewState, currentUser.role)) {
      setCurrentViewState('dashboard');
    }
  }, [currentUser, currentViewState]);

  // Enrutamiento inicial automático según rol de usuario
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role.startsWith('SAMI_')) {
        setCurrentView('admin');
      } else if (currentUser.role.startsWith('BANK_')) {
        setCurrentView(moduloDisponible('bank-api', currentUser.role) ? 'bank-api' : 'dashboard');
      } else if (currentUser.role === AppRole.MYPE_WORKER) {
        setCurrentView(moduloDisponible('tasks', currentUser.role) ? 'tasks' : 'dashboard');
      } else {
        setCurrentView('dashboard');
      }
    }
  }, [currentUser?.id, currentUser?.role]);

  // Auditoría automática al cambiar de vista
  useEffect(() => {
    if (currentUser) {
      const desc = VIEW_DESCRIPTIONS[currentViewState] || currentViewState;
      logAdminAction(currentUser, `Cambio de pestaña: ${desc}`);
    }
  }, [currentViewState, currentUser]);

  // Vista efectiva validada
  const activeView: View = useMemo(() => {
    if (!currentUser) return 'dashboard';
    if (!moduloDisponible(currentViewState, currentUser.role)) return 'dashboard';
    return currentViewState;
  }, [currentViewState, currentUser]);

  return {
    currentView: currentViewState,
    activeView,
    setCurrentView,
    navigateTo: setCurrentView,
    isViewAvailable
  };
}

export type { View };
