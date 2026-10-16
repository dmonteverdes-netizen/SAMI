
import { 
    NotificationType, 
    NotificationChannel, 
    NotificationTemplate, 
    Invoice, 
    TaxSummary,
    UserNotificationSettings
} from '../types/types';

/**
 * WhatsApp Templates (Meta Business API / Twilio compliant)
 */
export const WHATSAPP_TEMPLATES: NotificationTemplate[] = [
    {
        id: 'tmpl_unusual_expense',
        type: NotificationType.UNUSUAL_EXPENSE,
        channel: 'whatsapp',
        title: 'Alerta de Gasto Inusual',
        body: 'Hola {{name}}, SAMI detectó un gasto inusual de S/ {{amount}} en {{category}}. ¿Reconoces esta transacción? Responde SI para confirmar o NO para hablar con un asesor.'
    },
    {
        id: 'tmpl_sunat_deadline',
        type: NotificationType.SUNAT_DEADLINE,
        channel: 'whatsapp',
        title: 'Vencimiento SUNAT',
        body: 'SAMI te recuerda: Tu declaración de IGV/Renta vence pronto ({{date}}). Mantén tu información al día para compartir tu expediente con entidades aliadas.'
    },
    {
        id: 'tmpl_credit_eligibility',
        type: NotificationType.CREDIT_ELIGIBILITY,
        channel: 'whatsapp',
        title: 'Pre-evaluación Crediticia Disponible',
        body: '¡Buenas noticias {{name}}! Con tus ventas registradas de S/ {{amount}}, calificas a ofertas de crédito de capital de trabajo con entidades bancarias aliadas. Revisa tus opciones aquí: {{link}}'
    },
    {
        id: 'tmpl_task_reminder',
        type: NotificationType.TASK_REMINDER,
        channel: 'whatsapp',
        title: 'Recordatorio de Tarea',
        body: 'Hola {{name}}, SAMI te recuerda tu tarea: "{{title}}", la cual vence en {{days}} días ({{date}}). ¡No lo dejes para el último momento!'
    }
];

/**
 * Cloud API Structure for Messaging Service Integration
 */
export interface MessagingAPIRequest {
    to: string;
    channel: NotificationChannel;
    templateId: string;
    placeholders: { [key: string]: string };
}

/**
 * Logic to detect unusual expenses (Anomaly Detection)
 */
export const detectUnusualExpense = (newInvoice: Invoice, history: Invoice[]): boolean => {
    if (history.length < 5) return false;
    
    const categoryPurchases = history.filter(p => p.type === newInvoice.type);
    if (categoryPurchases.length === 0) return false;

    const avg = categoryPurchases.reduce((acc, p) => acc + p.totalAmount, 0) / categoryPurchases.length;
    // Threshold: 3x the average is considered unusual for this MYPE context
    return newInvoice.totalAmount > avg * 3;
};

/**
 * Logic to check SUNAT deadlines (remit to official SUNAT calendar based on RUC)
 */
export const checkSunatDeadline = (ruc: string): { isNear: boolean, date: string, message: string } | null => {
    if (!ruc || ruc.length < 11) return null;
    
    return {
        isNear: false,
        date: 'Consultar cronograma SUNAT',
        message: 'Consulta el cronograma oficial de vencimientos según el último dígito de tu RUC en el portal de SUNAT (Resolución de Superintendencia anual).'
    };
};

/**
 * Logic to check if sales volume qualifies for credit options
 */
export const checkCreditEligibilityTrigger = (oldSales: number, newSales: number): boolean => {
    const thresholds = [3000, 10000, 25000, 50000];
    return thresholds.some(t => oldSales < t && newSales >= t);
};

/**
 * NOTA DE AUDITORÍA Y SIMULACIÓN (Fase 1 - MVP):
 * Esta función es una SIMULACIÓN EN MEMORIA / CONSOLA para propósitos de demostración.
 * No realiza conexiones salientes a la API de Meta Business (WhatsApp Cloud API), Twilio ni ningún BSP.
 * 
 * Requisitos para implementación en Producción:
 * 1. Cuenta de Meta Business Manager verificada con razón social peruana y número oficial registrado.
 * 2. Plantillas de mensaje (Message Templates) aprobadas por Meta para alertas de utilidad (UTILITY).
 * 3. Servicio backend seguro (/api/v1/notifications) con cola de mensajería (BullMQ / SQS) y credenciales en variables de entorno.
 * 4. Persistencia del número celular y consentimiento explícito en PostgreSQL (Ley N° 29733).
 */
export const sendCloudNotification = async (request: MessagingAPIRequest): Promise<{ success: boolean, messageId: string }> => {
    const maskedTo = request.to.length > 4 ? `***${request.to.slice(-4)}` : '***';
    console.log(`[Notification Service - SIMULACIÓN] Enviando notificación ${request.channel} a ${maskedTo} [plantilla: ${request.templateId}]`);
    
    // Simulación de latencia de red del proveedor de mensajería
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
        success: true,
        messageId: `SIMULADO_msg_${Math.random().toString(36).substring(7)}`
    };
};
