// ─── Enrutador de Tareas y Agenda SUNAT (SAMI Gateway) ───
import express from 'express';
import { z } from 'zod';
import { createAuthenticateToken, requirePermission } from '../middleware/auth';
import { logger } from '../../core/services/logger';
import {
  getTasksForBusiness,
  saveTaskForBusiness,
  updateTaskForBusiness,
  deleteTaskForBusiness
} from '../services/businessStore';
import { Task, TaskStatus } from '../../core/types/types';

const router = express.Router();

function resolveBusinessId(req: express.Request): string {
  return req.user?.businessId || req.user?.ruc || req.user?.id || 'b1';
}

// ─── Esquemas de Validación Zod ───

const TaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().default(''),
  dueDate: z.string().min(1, 'La fecha de vencimiento es requerida'),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.PENDING),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  category: z.string().optional(),
  reminderDaysBefore: z.number().optional(),
  assignedTo: z.string().optional()
});

const UpdateTaskSchema = TaskSchema.partial();

// ─── 1. GET /api/v1/tasks ───
// Obtiene la lista de tareas del negocio autenticado
router.get(
  '/',
  createAuthenticateToken(),
  requirePermission('TASKS_MANAGE'),
  (req, res) => {
    try {
      const businessId = resolveBusinessId(req);
      const tasks = getTasksForBusiness(businessId);
      res.json({
        success: true,
        count: tasks.length,
        tasks
      });
    } catch (err: any) {
      logger.error('[Tasks Router] Error al obtener tareas:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 2. POST /api/v1/tasks ───
// Crea una nueva tarea bajo el businessId del token autenticado
router.post(
  '/',
  createAuthenticateToken(),
  requirePermission('TASKS_MANAGE'),
  (req, res) => {
    try {
      const parsed = TaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
      }

      const businessId = resolveBusinessId(req);
      const taskData = parsed.data as Task;
      const newTask = saveTaskForBusiness(businessId, taskData);

      logger.info(`[Tasks Router] Tarea creada para negocio ${businessId}: ${newTask.id}`);
      res.status(201).json({
        success: true,
        message: 'Tarea creada exitosamente',
        task: newTask
      });
    } catch (err: any) {
      logger.error('[Tasks Router] Error al crear tarea:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 3. PUT /api/v1/tasks/:id ───
// Actualiza una tarea existente dentro del negocio autenticado
router.put(
  '/:id',
  createAuthenticateToken(),
  requirePermission('TASKS_MANAGE'),
  (req, res) => {
    try {
      const parsed = UpdateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() });
      }

      const businessId = resolveBusinessId(req);
      const taskId = String(req.params.id);
      const updated = updateTaskForBusiness(businessId, taskId, parsed.data as Partial<Task>);

      if (!updated) {
        return res.status(404).json({ error: 'not_found', message: 'Tarea no encontrada' });
      }

      res.json({
        success: true,
        message: 'Tarea actualizada exitosamente',
        task: updated
      });
    } catch (err: any) {
      logger.error('[Tasks Router] Error al actualizar tarea:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

// ─── 4. DELETE /api/v1/tasks/:id ───
// Elimina una tarea dentro del negocio autenticado
router.delete(
  '/:id',
  createAuthenticateToken(),
  requirePermission('TASKS_MANAGE'),
  (req, res) => {
    try {
      const businessId = resolveBusinessId(req);
      const taskId = String(req.params.id);
      const deleted = deleteTaskForBusiness(businessId, taskId);

      if (!deleted) {
        return res.status(404).json({ error: 'not_found', message: 'Tarea no encontrada' });
      }

      res.json({
        success: true,
        message: 'Tarea eliminada exitosamente'
      });
    } catch (err: any) {
      logger.error('[Tasks Router] Error al eliminar tarea:', {}, err);
      res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
);

export default router;
