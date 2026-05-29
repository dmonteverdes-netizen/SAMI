
import { 
    NotificationType, 
    NotificationChannel, 
    NotificationTemplate, 
    Invoice, 
    SamiScoreResult,
    UserNotificationSettings
} from '../types';

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
        body: 'SAMI te recuerda: Tu declaración de IGV/Renta vence en 2 días ({{date}}). Evita multas y mantén tu score alto. ¿Deseas que genere tu reporte tributario ahora?'
    },
    {
        id: 'tmpl_score_increase',
        type: NotificationType.SCORE_INCREASE,
        channel: 'whatsapp',
        title: '¡Tu SAMI Score subió!',
        body: '¡Buenas noticias {{name}}! Tu SAMI Score ha subido a {{score}} puntos. Ahora calificas para una línea de crédito de hasta S/ {{amount}} con tasas preferenciales. Mira tus ofertas aquí: {{link}}'
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
 * Logic to check SUNAT deadlines (based on RUC last digit)
 */
export const checkSunatDeadline = (ruc: string): { isNear: boolean, date: string } | null => {
    if (!ruc || ruc.length < 11) return null;
    const lastDigit = ruc.charAt(10);
    
    // Mock logic: SUNAT deadlines usually fall around the 15th-22nd of the month
    const today = new Date();
    const deadlineDay = 15 + parseInt(lastDigit);
    const deadlineDate = new Date(today.getFullYear(), today.getMonth(), deadlineDay);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
        isNear: diffDays > 0 && diffDays <= 3,
        date: deadlineDate.toISOString().split('T')[0]
    };
};

/**
 * Logic to check if score increase triggers new credit
 */
export const checkCreditEligibilityTrigger = (oldScore: number, newScore: number): boolean => {
    const thresholds = [550, 620, 700, 750];
    return thresholds.some(t => oldScore < t && newScore >= t);
};

/**
 * Mock function to simulate sending a notification via Cloud API
 */
export const sendCloudNotification = async (request: MessagingAPIRequest): Promise<{ success: boolean, messageId: string }> => {
    console.log(`[Cloud Architect] Sending ${request.channel} notification to ${request.to} using template ${request.templateId}`);
    console.log(`[Payload]`, request.placeholders);
    
    // Simulate API Latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
        success: true,
        messageId: `msg_${Math.random().toString(36).substring(7)}`
    };
};
