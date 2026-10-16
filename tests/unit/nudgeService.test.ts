import { describe, it, expect } from 'vitest';
import { isTaskWithinReminderWindow } from '../../core/services/nudgeService';
import { TaskStatus, type Task } from '../../core/types/types';

describe('nudgeService - isTaskWithinReminderWindow', () => {
  const refDate = new Date(2026, 7, 20); // 20 de Agosto 2026

  it('debe retornar false si la tarea está completada', () => {
    const task: Task = {
      id: 't1',
      title: 'Declarar PDT',
      description: 'Declaración mensual',
      dueDate: '2026-08-21',
      status: TaskStatus.COMPLETED,
      priority: 'high',
      reminderDaysBefore: 3
    };
    expect(isTaskWithinReminderWindow(task, refDate)).toBe(false);
  });

  it('debe retornar false si la tarea no tiene reminderDaysBefore definido', () => {
    const task: Task = {
      id: 't2',
      title: 'Revisar inventario',
      description: 'Revisar stock de abarrotes',
      dueDate: '2026-08-21',
      status: TaskStatus.PENDING,
      priority: 'medium'
    };
    expect(isTaskWithinReminderWindow(task, refDate)).toBe(false);
  });

  it('debe retornar false si la fecha de vencimiento ya pasó (vencida)', () => {
    const task: Task = {
      id: 't3',
      title: 'Pagar proveedor',
      description: 'Factura distribuidora',
      dueDate: '2026-08-18', // 2 días atrás
      status: TaskStatus.PENDING,
      priority: 'high',
      reminderDaysBefore: 5
    };
    expect(isTaskWithinReminderWindow(task, refDate)).toBe(false);
  });

  it('debe retornar false si la fecha de vencimiento supera el margen de recordatorio', () => {
    const task: Task = {
      id: 't4',
      title: 'Renovar licencia municipal',
      description: 'Trámite municipal',
      dueDate: '2026-08-28', // Faltan 8 días
      status: TaskStatus.PENDING,
      priority: 'medium',
      reminderDaysBefore: 3 // Recordatorio configurado a 3 días
    };
    expect(isTaskWithinReminderWindow(task, refDate)).toBe(false);
  });

  it('debe retornar true si la tarea vence hoy y reminderDaysBefore >= 0', () => {
    const task: Task = {
      id: 't5',
      title: 'Cuadre de caja',
      description: 'Cuadre diario',
      dueDate: '2026-08-20', // Hoy
      status: TaskStatus.PENDING,
      priority: 'high',
      reminderDaysBefore: 0
    };
    expect(isTaskWithinReminderWindow(task, refDate)).toBe(true);
  });

  it('debe retornar true si la tarea vence dentro de la ventana de días configurada', () => {
    const task: Task = {
      id: 't6',
      title: 'Reposición de bebidas',
      description: 'Pedido semanal',
      dueDate: '2026-08-23', // Faltan 3 días
      status: TaskStatus.PENDING,
      priority: 'medium',
      reminderDaysBefore: 3 // Margen de 3 días
    };
    expect(isTaskWithinReminderWindow(task, refDate)).toBe(true);
  });
});

