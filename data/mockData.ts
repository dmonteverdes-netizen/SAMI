// ═══════════════════════════════════════════════════════════════
// ⚠️  DEMO DATA — PARA ELIMINAR AL PASAR A PRODUCCIÓN
// ═══════════════════════════════════════════════════════════════
// INSTRUCCIÓN DE PRODUCCIÓN:
// 1. Cambiar IS_DEMO_MODE = false
// 2. En App.tsx cambiar useState(MOCK_SALES) → useState([])
// 3. En App.tsx cambiar useState(MOCK_PURCHASES) → useState([])
// 4. En AuthContext.tsx eliminar el array mockUsers y conectar con el backend
// 5. En Login.tsx eliminar el objeto DEMO_USERS y el botón "Auto-completar Demo"
// ═══════════════════════════════════════════════════════════════

export const IS_DEMO_MODE = true;
export const DEMO_BUSINESS_NAME = 'Bodega Don Carlos';
export const DEMO_OWNER_RUC = '10456789012';

export { SEED_SALES as MOCK_SALES } from './seed/sales';
export { SEED_PURCHASES as MOCK_PURCHASES } from './seed/purchases';
export { SEED_TASKS as MOCK_TASKS } from './seed/tasks';
export { SEED_IN_APP_NOTIFICATIONS } from './seed/notifications';
export { SEED_PAYMENT_ALERTS, SEED_VENDORS } from './seed/payables';
export { SEED_CREDIT_APPLICATIONS } from './seed/creditApplications';
