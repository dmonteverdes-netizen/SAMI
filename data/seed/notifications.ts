// ═══════════════════════════════════════════════════════════════
// ⚠️  DATOS DE DEMOSTRACIÓN — DOMINIO: NOTIFICACIONES IN-APP
// ═══════════════════════════════════════════════════════════════
// ADVERTENCIA DE SEGURIDAD Y CUMPLIMIENTO REGULATORIO:
// Estos datos son exclusivamente para entorno de desarrollo, pruebas y demostración.
// NO DEBEN USARSE EN PRODUCCIÓN. En entorno productivo, las notificaciones y alertas
// deben obtenerse directamente desde los endpoints autenticados (/api/v1/notifications).
// ═══════════════════════════════════════════════════════════════

export interface SeedInAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'SUNAT_DEADLINE' | 'UNUSUAL_EXPENSE' | 'SCORE_INCREASE' | 'SYSTEM';
  timestamp: string;
  read: boolean;
  action?: 'accounting' | 'expenses' | 'credit' | 'profiling' | 'tasks' | 'dashboard';
}

export const SEED_IN_APP_NOTIFICATIONS: SeedInAppNotification[] = [
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
];
