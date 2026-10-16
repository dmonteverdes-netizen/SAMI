/**
 * Matriz Central de Roles y Permisos (Single Source of Truth)
 * Cumplimiento con Ley N° 29733 y Reglas del Negocio SAMI
 */

export type Role =
  | 'MYPE_ADMIN'
  | 'MYPE_WORKER'
  | 'MYPE_ACCOUNTANT'
  | 'BANK_ANALYST'
  | 'BANK_SUPERVISOR'
  | 'BANK_ADMIN'
  | 'SAMI_ADMIN'
  | 'SAMI_ANALYST';

export type Permission =
  // Ventas y Compras MYPE
  | 'SALES_READ'
  | 'SALES_WRITE'
  | 'PURCHASES_READ'
  | 'PURCHASES_WRITE'
  | 'EXPENSES_MONITORING_READ'
  | 'EXPENSES_SIMULATE'
  // Inventario y Operaciones MYPE
  | 'INVENTORY_READ'
  | 'INVENTORY_WRITE'
  | 'TASKS_MANAGE'
  // Crédito y Salud Tributaria
  | 'FINANCIAL_HEALTH_READ'
  | 'CREDIT_APPLY'
  | 'LOYALTY_MANAGE'
  // Consentimiento y Privacidad (Ley N° 29733)
  | 'CONSENT_READ'
  | 'CONSENT_WRITE'
  | 'ARCO_SUBMIT'
  | 'ARCO_MANAGE'
  | 'TRANSMISSIONS_READ'
  // Entidades Financieras (Bancos, Cajas)
  | 'BANK_TRANSMISSION_READ'
  | 'BANK_SCORING_READ'
  | 'BANK_ACCOUNTS_VALIDATE'
  | 'BANK_WEBHOOKS_MANAGE'
  | 'BANK_AUDIT_READ'
  // Administración y Plataforma SAMI
  | 'ADMIN_KPIS_READ'
  | 'ADMIN_AUDIT_READ'
  | 'ADMIN_PARTNERS_MANAGE'
  | 'ADMIN_WEBHOOKS_MANAGE'
  | 'ADMIN_SYSTEM_DIAGNOSTICS'
  | 'NOTIFICATIONS_SUBSCRIBE'
  | 'NOTIFICATIONS_DISPATCH'
  | 'AI_OCR_PROCESS';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  MYPE_ADMIN: [
    'SALES_READ',
    'SALES_WRITE',
    'PURCHASES_READ',
    'PURCHASES_WRITE',
    'EXPENSES_MONITORING_READ',
    'EXPENSES_SIMULATE',
    'INVENTORY_READ',
    'INVENTORY_WRITE',
    'TASKS_MANAGE',
    'FINANCIAL_HEALTH_READ',
    'CREDIT_APPLY',
    'LOYALTY_MANAGE',
    'CONSENT_READ',
    'CONSENT_WRITE',
    'ARCO_SUBMIT',
    'TRANSMISSIONS_READ',
    'NOTIFICATIONS_SUBSCRIBE',
    'AI_OCR_PROCESS'
  ],
  MYPE_WORKER: [
    'SALES_READ',
    'SALES_WRITE',
    'INVENTORY_READ',
    'INVENTORY_WRITE',
    'TASKS_MANAGE',
    'NOTIFICATIONS_SUBSCRIBE',
    'AI_OCR_PROCESS'
  ],
  MYPE_ACCOUNTANT: [
    'SALES_READ',
    'PURCHASES_READ',
    'FINANCIAL_HEALTH_READ',
    'CONSENT_READ',
    'TRANSMISSIONS_READ',
    'EXPENSES_MONITORING_READ',
    'NOTIFICATIONS_SUBSCRIBE'
  ],
  BANK_ANALYST: [
    'BANK_TRANSMISSION_READ',
    'BANK_SCORING_READ',
    'BANK_ACCOUNTS_VALIDATE',
    'BANK_AUDIT_READ',
    'NOTIFICATIONS_SUBSCRIBE'
  ],
  BANK_SUPERVISOR: [
    'BANK_TRANSMISSION_READ',
    'BANK_SCORING_READ',
    'BANK_ACCOUNTS_VALIDATE',
    'BANK_AUDIT_READ',
    'BANK_WEBHOOKS_MANAGE',
    'NOTIFICATIONS_SUBSCRIBE'
  ],
  BANK_ADMIN: [
    'BANK_TRANSMISSION_READ',
    'BANK_SCORING_READ',
    'BANK_ACCOUNTS_VALIDATE',
    'BANK_AUDIT_READ',
    'BANK_WEBHOOKS_MANAGE',
    'NOTIFICATIONS_SUBSCRIBE'
  ],
  SAMI_ANALYST: [
    'ADMIN_KPIS_READ',
    'ADMIN_AUDIT_READ',
    'NOTIFICATIONS_SUBSCRIBE'
  ],
  SAMI_ADMIN: [
    'SALES_READ',
    'SALES_WRITE',
    'PURCHASES_READ',
    'PURCHASES_WRITE',
    'EXPENSES_MONITORING_READ',
    'EXPENSES_SIMULATE',
    'INVENTORY_READ',
    'INVENTORY_WRITE',
    'TASKS_MANAGE',
    'FINANCIAL_HEALTH_READ',
    'CREDIT_APPLY',
    'LOYALTY_MANAGE',
    'CONSENT_READ',
    'CONSENT_WRITE',
    'ARCO_SUBMIT',
    'ARCO_MANAGE',
    'TRANSMISSIONS_READ',
    'BANK_TRANSMISSION_READ',
    'BANK_SCORING_READ',
    'BANK_ACCOUNTS_VALIDATE',
    'BANK_WEBHOOKS_MANAGE',
    'BANK_AUDIT_READ',
    'ADMIN_KPIS_READ',
    'ADMIN_AUDIT_READ',
    'ADMIN_PARTNERS_MANAGE',
    'ADMIN_WEBHOOKS_MANAGE',
    'ADMIN_SYSTEM_DIAGNOSTICS',
    'NOTIFICATIONS_SUBSCRIBE',
    'NOTIFICATIONS_DISPATCH',
    'AI_OCR_PROCESS'
  ]
};

export const ROLES_REQUIRING_2FA: ReadonlySet<Role> = new Set<Role>([
  'SAMI_ADMIN',
  'BANK_ANALYST',
  'BANK_SUPERVISOR',
  'BANK_ADMIN'
]);

export function roleHasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return !!permissions && permissions.includes(permission);
}

export function requiresTwoFactor(role: Role): boolean {
  return ROLES_REQUIRING_2FA.has(role);
}

export function isMypeRole(role: Role): boolean {
  return role === 'MYPE_ADMIN' || role === 'MYPE_WORKER' || role === 'MYPE_ACCOUNTANT';
}

export function isBankRole(role: Role): boolean {
  return role === 'BANK_ANALYST' || role === 'BANK_SUPERVISOR' || role === 'BANK_ADMIN';
}

export function isAdminRole(role: Role): boolean {
  return role === 'SAMI_ADMIN' || role === 'SAMI_ANALYST';
}
