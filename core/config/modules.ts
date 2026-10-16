import React from 'react';
import { 
  LayoutDashboard, 
  Calculator, 
  Receipt, 
  CreditCard, 
  ShieldCheck, 
  Trophy, 
  GraduationCap, 
  BookOpen,
  MessageSquare, 
  ShieldAlert,
  Building2,
  CheckCircle2,
  Settings,
  LucideIcon
} from 'lucide-react';
import { AppRole, View } from '../types/types';

export type ModulePhase = 1 | 2 | 3 | 4;
export type ModuleGroup = 'operacion' | 'financiamiento' | 'aprender' | 'productividad' | 'configuracion' | 'administracion' | 'sistema';

export const MODULE_GROUPS_META: Record<ModuleGroup, { label: string; order: number }> = {
  operacion: { label: 'Operación', order: 1 },
  financiamiento: { label: 'Financiamiento', order: 2 },
  aprender: { label: 'Aprender', order: 3 },
  productividad: { label: 'Productividad', order: 4 },
  configuracion: { label: 'Configuración', order: 5 },
  administracion: { label: 'Administración', order: 6 },
  sistema: { label: 'Sistema', order: 7 }
};

export interface ModuleConfig {
  id: View;
  label: string;
  labelPorRol?: Partial<Record<AppRole, string>>;
  icon: LucideIcon;
  phase: ModulePhase;
  roles: AppRole[];
  grupo: ModuleGroup;
  description?: string;
}

/**
 * Registro único y centralizado de módulos de la plataforma SAMI.
 * Define la única fuente de verdad para metadatos, fases, roles y agrupación visual.
 */
export const MODULES: Record<View, ModuleConfig> = {
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    labelPorRol: {
      [AppRole.MYPE_WORKER]: 'Panel Operativo',
    },
    icon: LayoutDashboard,
    phase: 1,
    roles: [AppRole.MYPE_ADMIN, AppRole.MYPE_WORKER],
    grupo: 'operacion',
    description: 'Panel general consolidado de métricas operativas y tributarias'
  },
  accounting: {
    id: 'accounting',
    label: 'Ventas',
    labelPorRol: {
      [AppRole.MYPE_WORKER]: 'Ventas Rápidas',
    },
    icon: Calculator,
    phase: 1,
    roles: [AppRole.MYPE_ADMIN, AppRole.MYPE_WORKER],
    grupo: 'operacion',
    description: 'Emisión de comprobantes y registro de ventas'
  },
  expenses: {
    id: 'expenses',
    label: 'Compras',
    icon: Receipt,
    phase: 1,
    roles: [AppRole.MYPE_ADMIN],
    grupo: 'operacion',
    description: 'Registro de gastos, facturas de compras y alertas de servicios'
  },
  management: {
    id: 'management',
    label: 'Gestión General',
    icon: Settings,
    phase: 1,
    roles: [
      AppRole.MYPE_ADMIN, 
      AppRole.SAMI_ADMIN
    ],
    grupo: 'configuracion',
    description: 'Configuración general de empresa, comprobantes y datos de negocio'
  },
  admin: {
    id: 'admin',
    label: 'Administración',
    icon: ShieldAlert,
    phase: 1,
    roles: [AppRole.SAMI_ADMIN, AppRole.SAMI_ANALYST],
    grupo: 'administracion',
    description: 'Consola de administración, visible solo al rol administrador'
  },
  credit: {
    id: 'credit',
    label: 'Créditos',
    icon: CreditCard,
    phase: 3,
    roles: [AppRole.MYPE_ADMIN],
    grupo: 'financiamiento',
    description: 'Marketplace de financiamiento y ofertas de bancos aliados'
  },
  profiling: {
    id: 'profiling',
    label: 'Perfil de Riesgo',
    icon: ShieldCheck,
    phase: 2,
    roles: [AppRole.MYPE_ADMIN],
    grupo: 'financiamiento',
    description: 'Perfilamiento profundo, validación de inventario y activos'
  },
  'bank-api': {
    id: 'bank-api',
    label: 'Entidad Financiera',
    icon: Building2,
    phase: 2,
    roles: [AppRole.BANK_ADMIN, AppRole.BANK_ANALYST, AppRole.BANK_SUPERVISOR],
    grupo: 'financiamiento',
    description: 'Consola de consulta y expediente tributario para bancos y cajas'
  },
  education: {
    id: 'education',
    label: 'Academia',
    icon: GraduationCap,
    phase: 3,
    roles: [AppRole.MYPE_ADMIN, AppRole.MYPE_WORKER],
    grupo: 'aprender',
    description: 'Cursos formativos y certificación de salud financiera'
  },
  glossary: {
    id: 'glossary',
    label: 'Glosario MYPE',
    icon: BookOpen,
    phase: 3,
    roles: [
      AppRole.MYPE_ADMIN, 
      AppRole.MYPE_WORKER, 
      AppRole.BANK_ADMIN, 
      AppRole.BANK_SUPERVISOR, 
      AppRole.BANK_ANALYST, 
      AppRole.SAMI_ADMIN, 
      AppRole.SAMI_ANALYST
    ],
    grupo: 'aprender',
    description: 'Diccionario de términos tributarios, financieros y bancarios'
  },
  tasks: {
    id: 'tasks',
    label: 'Tareas',
    icon: CheckCircle2,
    phase: 4,
    roles: [AppRole.MYPE_ADMIN, AppRole.MYPE_WORKER],
    grupo: 'productividad',
    description: 'Seguimiento de pendientes, vencimientos SUNAT y pagos'
  },
  loyalty: {
    id: 'loyalty',
    label: 'SAMI Rewards',
    icon: Trophy,
    phase: 4,
    roles: [AppRole.MYPE_ADMIN],
    grupo: 'productividad',
    description: 'Programa de fidelización y recompensas SAMI Coins'
  },
  chat: {
    id: 'chat',
    label: 'SAMI AI',
    labelPorRol: {
      [AppRole.MYPE_WORKER]: 'Ayuda AI',
      [AppRole.BANK_ADMIN]: 'Soporte SAMI',
      [AppRole.BANK_ANALYST]: 'Soporte SAMI',
      [AppRole.BANK_SUPERVISOR]: 'Soporte SAMI',
    },
    icon: MessageSquare,
    phase: 4,
    roles: [
      AppRole.MYPE_ADMIN, 
      AppRole.MYPE_WORKER, 
      AppRole.BANK_ADMIN, 
      AppRole.BANK_SUPERVISOR, 
      AppRole.BANK_ANALYST, 
      AppRole.SAMI_ADMIN, 
      AppRole.SAMI_ANALYST
    ],
    grupo: 'productividad',
    description: 'Asistente inteligente de consulta tributaria y contable'
  },
  // La vista 'notifications' no es un módulo de contenido sino un modal/perfil
  notifications: {
    id: 'notifications',
    label: 'Notificaciones',
    icon: Settings,
    phase: 1,
    roles: [
      AppRole.MYPE_ADMIN, 
      AppRole.MYPE_WORKER, 
      AppRole.BANK_ADMIN, 
      AppRole.BANK_SUPERVISOR, 
      AppRole.BANK_ANALYST, 
      AppRole.SAMI_ADMIN, 
      AppRole.SAMI_ANALYST
    ],
    grupo: 'sistema',
    description: 'Centro de notificaciones y alertas del sistema'
  }
};
