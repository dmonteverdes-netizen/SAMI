
import { User, AuditLog, AppRole } from '../types';

// --- PRODUCTION REQUIREMENT ---
// In a real application, this MUST NOT be an in-memory array.
// This service must write to a secure, append-only, and immutable log store.
// Examples:
// - AWS QLDB (Quantum Ledger Database)
// - Google Cloud Logging with strict retention policies and access controls.
// - A dedicated logging service (e.g., Logstash) outputting to a WORM (Write-Once, Read-Many) storage.
// The goal is to make log tampering computationally infeasible.
const auditLogStore: AuditLog[] = [
    {
        id: 'aud-fc8e-4122-b9e3-23910cda91bc',
        timestamp: '2026-05-26T13:45:10Z',
        user: { id: 'admin-001', name: 'Daniel Monteverde' },
        action: 'SAMI Score Recalculation engine triggers RUC: 20762391024.'
    },
    {
        id: 'aud-1e9a-41df-a5a1-7788cb221a9a',
        timestamp: '2026-05-26T11:20:34Z',
        user: { id: 'admin-001', name: 'Daniel Monteverde' },
        action: 'Actualizo webhook partner: Caja Arequipa Core Integrator.'
    },
    {
        id: 'aud-a02b-4fa8-b28e-5b12da61bb82',
        timestamp: '2026-05-26T09:15:00Z',
        user: { id: 'partner-99', name: 'Banco de la Nación Sync' },
        action: 'Consulta de scoring para RUC: 20123456789'
    },
    {
        id: 'aud-73e4-4c4f-9a1b-cd88ee9d0c2e',
        timestamp: '2026-05-25T16:10:45Z',
        user: { id: 'admin-001', name: 'Daniel Monteverde' },
        action: 'User list accessed. Exported to CSV format.'
    },
    {
        id: 'aud-9fa1-4db8-bbd1-55ec3a24b10b',
        timestamp: '2026-05-25T10:40:02Z',
        user: { id: 'admin-001', name: 'Daniel Monteverde' },
        action: 'SAMI Internal: Acceso inicial a Panel Administrativo'
    },
    {
        id: 'aud-dd83-4a1b-8de2-bc10ffee210e',
        timestamp: '2026-05-24T14:35:19Z',
        user: { id: 'system', name: 'SAMI Platform' },
        action: 'Auto-scaling triggered: API gateway nodes increased to 4.'
    },
    {
        id: 'aud-ef3d-4cda-921a-e8dcbe1aef01',
        timestamp: '2026-05-23T11:05:00Z',
        user: { id: 'admin-001', name: 'Daniel Monteverde' },
        action: '2FA verification active. Code verified via SMS gateway.'
    },
    {
        id: 'aud-bc5d-4fcf-b6a2-cdefae212be6',
        timestamp: '2026-05-22T08:14:10Z',
        user: { id: 'system', name: 'SAMI Platform' },
        action: 'Test de Webhook: Disparo de evento credit.requested a Caja Arequipa Core Integrator -> Status 200'
    },
    {
        id: 'aud-83df-4613-bcd8-e2410fcdaee1',
        timestamp: '2026-05-22T07:30:00Z',
        user: { id: 'admin-001', name: 'Daniel Monteverde' },
        action: 'SAMI FinTech: Modificó límite de crédito autorizado para Corporación Textil Gamarra (S/. 65,000)'
    }
];

/**
 * Logs a sensitive action performed by a user.
 * @param user The user performing the action.
 * @param action A description of the action.
 */
export const logAdminAction = (user: User | { id: string; name: string; role: AppRole }, action: string): void => {
    let uuid = '';
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            uuid = crypto.randomUUID();
        } else {
            uuid = 'aud-' + Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 10);
        }
    } catch (e) {
        uuid = 'aud-' + Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 10);
    }

    const logEntry: AuditLog = {
        id: uuid,
        timestamp: new Date().toISOString(),
        user: {
            id: user.id,
            name: user.name,
        },
        action: action,
    };
    
    // In production, this would be an API call to the secure logging service.
    console.log(`[AUDIT LOG] User: ${user.name} (${user.id}), Action: ${action}`);
    auditLogStore.unshift(logEntry); // Prepend for easy viewing in this simulation.
};

/**
 * Retrieves the audit log. In a real system, this would be a protected
 * endpoint with pagination, accessible only to specific admin roles.
 * @returns A promise that resolves to an array of audit logs.
 */
export const getAuditLogs = async (): Promise<AuditLog[]> => {
    // Simulate network delay
    await new Promise(res => setTimeout(res, 200));
    return Promise.resolve([...auditLogStore]);
};

// Initial log to show the system started
logAdminAction({ id: 'system', name: 'SAMI Platform', role: AppRole.SAMI_ADMIN }, 'Sistema de auditoría iniciado.');
