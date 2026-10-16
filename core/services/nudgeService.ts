// ─── Tipos e Interfaces ───
import type { NotificationType, Task, Invoice, TaxSummary, UserProgress, Course } from '../types/types';
import { getCourses, getUserProgress } from './educationService';
import { detectUnusualExpense } from './notificationService';

export interface ContextualNudge {
  id: string;
  eventType: NotificationType;
  priority: number; // 1 = Máxima (SUNAT_DEADLINE), 5 = Oportunidad (CREDIT_ELIGIBILITY)
  courseId: string;
  courseTitle: string;
  courseCategory?: string;
  headline: string;
  description: string;
  ctaText: string;
  badgeLabel: string;
}

// ─── Constantes y Configuración de Reglas de Activación ───

const STORAGE_DISMISSED_KEY_PREFIX = 'sami_nudge_dismissed_';
const DISMISS_DURATION_MS = 48 * 60 * 60 * 1000; // 48 horas de cooldown

/**
 * Mapeo contextual para TASK_REMINDER según la categoría de la tarea
 */
export const getTaskNudgeConfig = (task?: Task): { courseId: string; headline: string; description: string; ctaText: string } => {
  const cat = (task?.category || '').toLowerCase();
  
  if (cat.includes('inventario') || cat.includes('stock') || cat.includes('reposici')) {
    return {
      courseId: 'C11',
      headline: 'Gestión de Stock y Reposición',
      description: 'Tienes una tarea de inventario próxima a vencer. Aprende a calcular tu punto de repedido, stock de seguridad y reducir mermas.',
      ctaText: 'Optimizar mi inventario'
    };
  }
  
  if (cat.includes('sunat') || cat.includes('tributar') || cat.includes('impuesto')) {
    return {
      courseId: 'C13',
      headline: 'Obligaciones Tributarias y Cronograma',
      description: 'Para cumplir a tiempo tu tarea tributaria, repasa las fechas del cronograma SUNAT por RUC y qué gastos deducir.',
      ctaText: 'Ver lección tributaria'
    };
  }
  
  if (cat.includes('pago') || cat.includes('proveedor') || cat.includes('compra')) {
    return {
      courseId: 'C12',
      headline: 'Negociación y Plazos Comerciales',
      description: 'Antes de realizar pagos a proveedores, aprende a negociar plazos a 30 o 45 días sin intereses para proteger tu liquidez.',
      ctaText: 'Aprender a negociar plazos'
    };
  }
  
  if (cat.includes('legal') || cat.includes('licencia') || cat.includes('formaliz') || cat.includes('municipal')) {
    return {
      courseId: 'C03',
      headline: 'Formalización y Protección Legal',
      description: 'Mantener tus trámites y licencias al día protege tu negocio. Conoce las ventajas legales y comerciales de la formalización (Ley 30056).',
      ctaText: 'Ver beneficios de formalidad'
    };
  }
  
  // Fallback general para tareas
  return {
    courseId: 'C09',
    headline: 'Planificación Estratégica y Metas',
    description: 'Cumple tus metas operativas a tiempo. Aprende a fijar objetivos SMART y organizar las prioridades clave de tu negocio.',
    ctaText: 'Aprender a planificar'
  };
};

// ─── Handlers y Lógica de Negocio ───

/**
 * Determina si una tarea se encuentra dentro de su ventana de recordatorio activa.
 * Requiere que la tarea no esté completada, que tenga reminderDaysBefore definido,
 * y que la diferencia en días entre la fecha de vencimiento y hoy cumpla:
 * 0 <= diffDays <= reminderDaysBefore.
 */
export const isTaskWithinReminderWindow = (task: Task, referenceDate: Date = new Date()): boolean => {
  if (task.status === 'completed') return false;
  if (task.reminderDaysBefore === undefined || task.reminderDaysBefore === null) return false;
  if (!task.dueDate) return false;

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  // Parsear dueDate (formato YYYY-MM-DD o ISO)
  const [year, month, day] = task.dueDate.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= task.reminderDaysBefore;
};

/**
 * Comprueba si un nudge específico fue descartado recientemente por el usuario
 */
export const isNudgeDismissed = (nudgeId: string): boolean => {
  try {
    const raw = localStorage.getItem(`${STORAGE_DISMISSED_KEY_PREFIX}${nudgeId}`);
    if (!raw) return false;
    const timestamp = parseInt(raw, 10);
    if (isNaN(timestamp)) return false;
    return Date.now() - timestamp < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
};

/**
 * Guarda el descarte de un nudge con timestamp en localStorage
 */
export const dismissNudge = (nudgeId: string): void => {
  try {
    localStorage.setItem(`${STORAGE_DISMISSED_KEY_PREFIX}${nudgeId}`, Date.now().toString());
  } catch {
    // Silencioso en caso de restricciones de storage
  }
};

/**
 * Verifica si todas las lecciones del curso ya fueron completadas
 */
const isCourseCompleted = (course: Course, userProgress: UserProgress): boolean => {
  if (!course.lessons || course.lessons.length === 0) return false;
  return course.lessons.every(lesson => !!userProgress[lesson.id]);
};

/**
 * Motor Principal: Evalúa todos los eventos contextuales y devuelve el ÚNICO nudge activo de mayor prioridad.
 */
export const evaluateContextualNudge = async (params: {
  sales: Invoice[];
  purchases: Invoice[];
  taxSummary: TaxSummary | null;
  tasks?: Task[];
  pdtDeclared?: boolean;
}): Promise<ContextualNudge | null> => {
  const { sales, purchases, taxSummary, tasks = [], pdtDeclared = false } = params;

  const [courses, progress] = await Promise.all([
    getCourses(),
    getUserProgress()
  ]);

  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));
  const candidates: ContextualNudge[] = [];

  // ── Prioridad 1: SUNAT_DEADLINE ──
  // Se dispara cuando el vencimiento SUNAT está próximo (<= 7 días) o el estado tributario está pendiente/desactualizado, siempre que no haya sido declarado aún
  const hasUpcomingSunatDeadline = (taxSummary?.proximoVencimiento?.diasRestantes !== undefined && taxSummary.proximoVencimiento.diasRestantes <= 7) ||
    taxSummary?.complianceStatus === 'Pendiente' ||
    taxSummary?.complianceStatus === 'Registro desactualizado';

  const isSunatPending = !pdtDeclared && hasUpcomingSunatDeadline;
  const sunatCourse = courseMap.get('C13');
  if (isSunatPending && sunatCourse && !isCourseCompleted(sunatCourse, progress)) {
    const daysLeftText = taxSummary?.proximoVencimiento?.diasRestantes !== undefined
      ? ` (Vence en ${taxSummary.proximoVencimiento.diasRestantes} días)`
      : '';
    candidates.push({
      id: 'sunat_deadline_c13',
      eventType: 'SUNAT_DEADLINE' as NotificationType,
      priority: 1,
      courseId: 'C13',
      courseTitle: sunatCourse.title,
      courseCategory: 'accounting',
      badgeLabel: 'Vencimiento Tributario',
      headline: `¿Listo para tu declaración mensual?${daysLeftText}`,
      description: 'Se acerca la fecha de presentación ante SUNAT. Repasa el cronograma por dígito de RUC y qué gastos deducir para no pagar de más.',
      ctaText: 'Ver lección de vencimientos'
    });
  }

  // ── Prioridad 2: UNUSUAL_EXPENSE ──
  // Detección de compras o gastos anormales (3x media de compras)
  const lastPurchase = purchases[purchases.length - 1];
  const hasUnusualExpense = lastPurchase ? detectUnusualExpense(lastPurchase, purchases) : false;
  const expenseCourse = courseMap.get('C01');
  if (hasUnusualExpense && expenseCourse && !isCourseCompleted(expenseCourse, progress)) {
    candidates.push({
      id: 'unusual_expense_c01',
      eventType: 'UNUSUAL_EXPENSE' as NotificationType,
      priority: 2,
      courseId: 'C01',
      courseTitle: expenseCourse.title,
      courseCategory: 'finance',
      badgeLabel: 'Alerta de Liquidez',
      headline: 'Variación inusual en tus egresos',
      description: 'Detectamos compras por encima de tu promedio habitual. Aprende a sincronizar tu flujo de caja operativo y fijar un saldo de reserva.',
      ctaText: 'Aprender a controlar mi caja'
    });
  }

  // ── Prioridad 3: PAYMENT_REMINDER ──
  // APROXIMACIÓN TEMPORAL (Opción B):
  // Actualmente la entidad Invoice no cuenta con un campo nativo de estado de pago (ej. paymentStatus: 'paid' | 'pending'
  // o paymentCondition: 'CONTADO' | 'CREDITO'). Por ende, esta regla evalúa de forma conservadora la existencia de
  // facturas comerciales emitidas por proveedores con montos significativos (> S/ 1,000) para sugerir técnicas de
  // negociación y gestión de plazos comerciales (C07), sin asumir ni verificar si la factura ya fue cancelada.
  // PENDIENTE: Reemplazar por integración formal con módulo de cuentas por pagar / conciliación bancaria en Fase posterior.
  const paymentCourse = courseMap.get('C07');
  const hasPendingPayments = purchases.some(p => p.documentType === 'FACTURA' && p.totalAmount > 1000);
  if (hasPendingPayments && paymentCourse && !isCourseCompleted(paymentCourse, progress)) {
    candidates.push({
      id: 'payment_reminder_c07',
      eventType: 'PAYMENT_REMINDER' as NotificationType,
      priority: 3,
      courseId: 'C07',
      courseTitle: paymentCourse.title,
      courseCategory: 'operations',
      badgeLabel: 'Gestión de Proveedores',
      headline: 'Optimiza tus plazos de pago comercial',
      description: 'Tienes facturas de proveedores registradas. Descubre cómo negociar plazos a 30 o 45 días sin intereses para no asfixiar tu capital de trabajo.',
      ctaText: 'Ver técnicas de negociación'
    });
  }

  // ── Prioridad 4: TASK_REMINDER ──
  // Tareas pendientes que se encuentren estrictamente dentro de su ventana de recordatorio activa (0 <= diffDays <= reminderDaysBefore)
  const reminderTasks = tasks.filter(t => isTaskWithinReminderWindow(t));
  if (reminderTasks.length > 0) {
    const upcomingTask = reminderTasks[0];
    const taskConfig = getTaskNudgeConfig(upcomingTask);
    const targetCourse = courseMap.get(taskConfig.courseId);
    if (targetCourse && !isCourseCompleted(targetCourse, progress)) {
      candidates.push({
        id: `task_reminder_${taskConfig.courseId}_${upcomingTask.id || 'general'}`,
        eventType: 'TASK_REMINDER' as NotificationType,
        priority: 4,
        courseId: taskConfig.courseId,
        courseTitle: targetCourse.title,
        courseCategory: targetCourse.category,
        badgeLabel: `Tarea: ${upcomingTask.category || 'Operativa'}`,
        headline: taskConfig.headline,
        description: taskConfig.description,
        ctaText: taskConfig.ctaText
      });
    }
  }

  // ── Prioridad 5: CREDIT_ELIGIBILITY (Oportunidad) ──
  // Si tiene ventas promedio >= S/ 5,000 pero aún no ha revisado cómo evalúan los bancos
  const creditCourse = courseMap.get('C08');
  const hasGoodSales = (taxSummary?.avgMonthlySales || 0) >= 5000 || sales.length >= 5;
  if (hasGoodSales && creditCourse && !isCourseCompleted(creditCourse, progress)) {
    candidates.push({
      id: 'credit_eligibility_c08',
      eventType: 'CREDIT_ELIGIBILITY' as NotificationType,
      priority: 5,
      courseId: 'C08',
      courseTitle: creditCourse.title,
      courseCategory: 'finance',
      badgeLabel: 'Oportunidad de Crédito',
      headline: 'Tus ventas te posicionan ante bancos aliados',
      description: 'Tu constancia de facturación es atractiva para el sistema financiero. Conoce las 5 "C" que evalúan los analistas de riesgo de las entidades aliadas.',
      ctaText: 'Ver cómo evalúan los bancos'
    });
  }

  // Filtrar descartados por localStorage
  const activeCandidates = candidates.filter(n => !isNudgeDismissed(n.id));

  if (activeCandidates.length === 0) return null;

  // Ordenar determinísticamente por prioridad (menor número = mayor urgencia)
  activeCandidates.sort((a, b) => a.priority - b.priority);

  // Retornar estrictamente el ganador único
  return activeCandidates[0];
};
