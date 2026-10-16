import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import accountingRouter from '../../server/routes/accounting';
import expensesRouter from '../../server/routes/expenses';
import tasksRouter from '../../server/routes/tasks';
import { generateToken, AuthUserPayload } from '../../server/middleware/auth';
import { requirePhase } from '../../server/middleware/phaseGuard';
import { resetBusinessStores } from '../../server/services/businessStore';
import { TaskStatus } from '../../core/types/types';

// App de prueba con rutas montadas
const app = express();
app.use(express.json());
app.use('/api/v1/accounting', requirePhase(1), accountingRouter);
app.use('/api/v1/expenses', requirePhase(1), expensesRouter);
app.use('/api/v1/tasks', requirePhase(1), tasksRouter);

describe('Integration Tests: Multi-Session Shared Server Persistence (Sales, Purchases, Tasks)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetBusinessStores();
  });

  const createToken = (payloadOverrides: Partial<AuthUserPayload> = {}) => {
    const basePayload: Omit<AuthUserPayload, 'iat' | 'exp'> = {
      id: 'user-admin-1',
      email: 'dueno@negocio-a.pe',
      name: 'Carlos Dueño',
      role: 'MYPE_ADMIN',
      ruc: '20111111111',
      businessId: 'business_alpha',
      mfaVerified: true,
      ...payloadOverrides
    };
    return generateToken(basePayload);
  };

  // ─── 1. Ventas (Sales CRUD y Aislamiento) ───

  describe('1. Accounting & Sales Persistence', () => {
    it('Debe rechazar peticiones sin token JWT con 401', async () => {
      await request(app)
        .get('/api/v1/accounting/sales')
        .expect(401);
    });

    it('Debe registrar una venta y persistirla para el negocio autenticado', async () => {
      const token = createToken({ businessId: 'business_alpha' });
      const salePayload = {
        type: 'sale',
        documentType: 'BOLETA',
        series: 'B001',
        correlative: 101,
        issueDate: '2026-05-10',
        totalAmount: 150.50,
        category: 'Abarrotes'
      };

      const resPost = await request(app)
        .post('/api/v1/accounting/sales')
        .set('Authorization', `Bearer ${token}`)
        .send(salePayload)
        .expect(201);

      expect(resPost.body.success).toBe(true);
      expect(resPost.body.sale).toBeDefined();
      expect(resPost.body.sale.id).toBeDefined();
      expect(resPost.body.sale.totalAmount).toBe(150.50);

      // Consultar lista
      const resGet = await request(app)
        .get('/api/v1/accounting/sales')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resGet.body.success).toBe(true);
      const found = resGet.body.sales.find((s: any) => s.id === resPost.body.sale.id);
      expect(found).toBeDefined();
      expect(found.totalAmount).toBe(150.50);
    });

    it('Debe aislar estrictamente las ventas entre dos negocios distintos', async () => {
      const tokenA = createToken({ id: 'uA', businessId: 'business_alpha' });
      const tokenB = createToken({ id: 'uB', businessId: 'business_beta' });

      // Negocio A crea venta
      await request(app)
        .post('/api/v1/accounting/sales')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'sale',
          documentType: 'BOLETA',
          series: 'B001',
          correlative: 1,
          issueDate: '2026-05-10',
          totalAmount: 500
        })
        .expect(201);

      // Negocio B no debe ver la venta de Negocio A
      const resB = await request(app)
        .get('/api/v1/accounting/sales')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(resB.body.sales.length).toBe(0);
    });

    it('Debe actualizar y eliminar ventas existentes del negocio', async () => {
      const token = createToken({ businessId: 'business_alpha' });

      const resPost = await request(app)
        .post('/api/v1/accounting/sales')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'sale',
          documentType: 'FACTURA',
          series: 'F001',
          correlative: 55,
          issueDate: '2026-05-11',
          totalAmount: 1200
        })
        .expect(201);

      const saleId = resPost.body.sale.id;

      // Actualizar
      const resPut = await request(app)
        .put(`/api/v1/accounting/sales/${saleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ totalAmount: 1400 })
        .expect(200);

      expect(resPut.body.sale.totalAmount).toBe(1400);

      // Eliminar
      await request(app)
        .delete(`/api/v1/accounting/sales/${saleId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verificar que ya no existe
      const resGet = await request(app)
        .get('/api/v1/accounting/sales')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resGet.body.sales.some((s: any) => s.id === saleId)).toBe(false);
    });
  });

  // ─── 2. Compras (Purchases CRUD y Permisos) ───

  describe('2. Expenses & Purchases Persistence', () => {
    it('Debe permitir al MYPE_ADMIN registrar y consultar compras', async () => {
      const token = createToken({ businessId: 'business_alpha', role: 'MYPE_ADMIN' });
      const purchasePayload = {
        type: 'purchase',
        documentType: 'FACTURA',
        series: 'F001',
        correlative: 88,
        issueDate: '2026-05-01',
        ruc: '20555555555',
        totalAmount: 3200,
        category: 'Mercadería y Suministros'
      };

      const resPost = await request(app)
        .post('/api/v1/expenses/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(purchasePayload)
        .expect(201);

      expect(resPost.body.success).toBe(true);
      expect(resPost.body.purchase.totalAmount).toBe(3200);

      const resGet = await request(app)
        .get('/api/v1/expenses/purchases')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resGet.body.purchases.length).toBeGreaterThanOrEqual(1);
    });

    it('Debe rechazar con 403 a un empleado (MYPE_WORKER) intentando ver compras', async () => {
      const workerToken = createToken({ businessId: 'business_alpha', role: 'MYPE_WORKER' });

      await request(app)
        .get('/api/v1/expenses/purchases')
        .set('Authorization', `Bearer ${workerToken}`)
        .expect(403);
    });
  });

  // ─── 3. Tareas (Tasks CRUD y Sincronización) ───

  describe('3. Tasks Persistence and Sync', () => {
    it('Debe crear, actualizar y listar tareas del negocio', async () => {
      const token = createToken({ businessId: 'business_alpha' });
      const taskPayload = {
        title: 'Declarar DJ Mensual SUNAT Mayo 2026',
        description: 'Verificar comprobantes electrónicos antes del día 15',
        dueDate: '2026-05-15',
        status: TaskStatus.PENDING,
        priority: 'high',
        category: 'Tributaria',
        reminderDaysBefore: 3
      };

      const resPost = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskPayload)
        .expect(201);

      expect(resPost.body.success).toBe(true);
      const taskId = resPost.body.task.id;

      // Actualizar estado a completada
      const resPut = await request(app)
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: TaskStatus.COMPLETED })
        .expect(200);

      expect(resPut.body.task.status).toBe(TaskStatus.COMPLETED);

      // Listar
      const resGet = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const found = resGet.body.tasks.find((t: any) => t.id === taskId);
      expect(found).toBeDefined();
      expect(found.status).toBe(TaskStatus.COMPLETED);
    });
  });

  // ─── 4. Consistencia Multisesión (Dueño y Empleado del mismo negocio) ───

  describe('4. Multi-session Consistency (Owner & Worker in same Business)', () => {
    it('Dueño y Empleado del mismo businessId ven y operan sobre los mismos datos compartidos', async () => {
      const ownerToken = createToken({ id: 'user_owner', role: 'MYPE_ADMIN', businessId: 'bodega_don_carlos' });
      const workerToken = createToken({ id: 'user_worker', role: 'MYPE_WORKER', businessId: 'bodega_don_carlos' });

      // 1. Empleado registra una venta rápida
      const resSale = await request(app)
        .post('/api/v1/accounting/sales')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          type: 'sale',
          documentType: 'BOLETA',
          series: 'B001',
          correlative: 301,
          issueDate: '2026-05-12',
          totalAmount: 45.00,
          category: 'Bebidas y Snacks'
        })
        .expect(201);

      const saleId = resSale.body.sale.id;

      // 2. Dueño consulta ventas y ve la venta registrada por el empleado inmediatamente
      const resOwnerSales = await request(app)
        .get('/api/v1/accounting/sales')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const saleFoundByOwner = resOwnerSales.body.sales.find((s: any) => s.id === saleId);
      expect(saleFoundByOwner).toBeDefined();
      expect(saleFoundByOwner.totalAmount).toBe(45.00);

      // 3. Dueño crea una tarea para el negocio
      const resTask = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Recepción de mercadería Distribuidora Lima',
          dueDate: '2026-05-13',
          status: TaskStatus.PENDING,
          priority: 'medium'
        })
        .expect(201);

      const taskId = resTask.body.task.id;

      // 4. Empleado consulta tareas y ve la tarea asignada por el dueño
      const resWorkerTasks = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${workerToken}`)
        .expect(200);

      const taskFoundByWorker = resWorkerTasks.body.tasks.find((t: any) => t.id === taskId);
      expect(taskFoundByWorker).toBeDefined();
      expect(taskFoundByWorker.title).toBe('Recepción de mercadería Distribuidora Lima');
    });
  });
});
