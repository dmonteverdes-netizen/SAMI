// ─── Servicios de Persistencia Aislada por Negocio (SAMI Gateway) ───
// Este servicio gestiona el almacenamiento estructurado y aislado por businessId/RUC
// para Ventas, Compras y Tareas, sirviendo como la fuente de verdad en servidor.

import fs from 'fs';
import path from 'path';
import { Invoice, Task } from '../../core/types/types';
import { SEED_SALES } from '../../data/seed/sales';
import { SEED_PURCHASES } from '../../data/seed/purchases';
import { SEED_TASKS } from '../../data/seed/tasks';
import { logger } from '../../core/services/logger';

// ─── Tipos e Interfaces ───

export interface BusinessStoreMap<T> {
  [businessId: string]: T[];
}

// ─── Constantes y Configuración ───

// SAMI_DATA_DIR permite aislar los almacenes JSON (p. ej. en tests) sin tocar data/ del repositorio.
const DATA_DIR = process.env.SAMI_DATA_DIR || path.join(process.cwd(), 'data');
const SALES_FILE = path.join(DATA_DIR, 'sales_db.json');
const PURCHASES_FILE = path.join(DATA_DIR, 'purchases_db.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks_db.json');

const DEFAULT_BUSINESS_ID = 'b1';

function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ─── Helpers Genéricos de Carga y Guardado ───

function loadStoreFile<T>(filePath: string, defaultSeedsForB1: T[]): BusinessStoreMap<T> {
  ensureDataDirectory();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      
      // Si el archivo anterior era un arreglo plano, migrarlo a la estructura particionada
      if (Array.isArray(parsed)) {
        const migrated: BusinessStoreMap<T> = {
          [DEFAULT_BUSINESS_ID]: parsed
        };
        saveStoreFile(filePath, migrated);
        return migrated;
      }
      
      if (typeof parsed === 'object' && parsed !== null) {
        // Asegurar que b1 tenga semillas si no existen
        if (!parsed[DEFAULT_BUSINESS_ID] || parsed[DEFAULT_BUSINESS_ID].length === 0) {
          parsed[DEFAULT_BUSINESS_ID] = defaultSeedsForB1;
          saveStoreFile(filePath, parsed);
        }
        return parsed;
      }
    } catch (err) {
      logger.error(`[BusinessStore] Error leyendo archivo ${filePath}:`, {}, err);
    }
  }

  const initialStore: BusinessStoreMap<T> = {
    [DEFAULT_BUSINESS_ID]: defaultSeedsForB1
  };
  saveStoreFile(filePath, initialStore);
  return initialStore;
}

function saveStoreFile<T>(filePath: string, store: BusinessStoreMap<T>): void {
  try {
    ensureDataDirectory();
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    logger.error(`[BusinessStore] Error guardando archivo ${filePath}:`, {}, err);
  }
}

// ─── Gestión de Ventas (Sales) ───

export function getSalesForBusiness(businessId: string): Invoice[] {
  const store = loadStoreFile<Invoice>(SALES_FILE, SEED_SALES);
  return store[businessId] ? [...store[businessId]] : [];
}

export function saveSaleForBusiness(businessId: string, sale: Invoice): Invoice {
  const store = loadStoreFile<Invoice>(SALES_FILE, SEED_SALES);
  if (!store[businessId]) {
    store[businessId] = [];
  }

  const newSale: Invoice = {
    ...sale,
    id: sale.id || `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  };

  store[businessId] = [newSale, ...store[businessId]];
  saveStoreFile(SALES_FILE, store);
  return newSale;
}

export function updateSaleForBusiness(businessId: string, id: string, updates: Partial<Invoice>): Invoice | null {
  const store = loadStoreFile<Invoice>(SALES_FILE, SEED_SALES);
  const list = store[businessId] || [];
  const index = list.findIndex(s => s.id === id);
  if (index === -1) return null;

  const updated: Invoice = { ...list[index], ...updates, id };
  list[index] = updated;
  store[businessId] = list;
  saveStoreFile(SALES_FILE, store);
  return updated;
}

export function deleteSaleForBusiness(businessId: string, id: string): boolean {
  const store = loadStoreFile<Invoice>(SALES_FILE, SEED_SALES);
  const list = store[businessId] || [];
  const initialLength = list.length;
  store[businessId] = list.filter(s => s.id !== id);
  
  if (store[businessId].length !== initialLength) {
    saveStoreFile(SALES_FILE, store);
    return true;
  }
  return false;
}

// ─── Gestión de Compras (Purchases) ───

export function getPurchasesForBusiness(businessId: string): Invoice[] {
  const store = loadStoreFile<Invoice>(PURCHASES_FILE, SEED_PURCHASES);
  return store[businessId] ? [...store[businessId]] : [];
}

export function savePurchaseForBusiness(businessId: string, purchase: Invoice): Invoice {
  const store = loadStoreFile<Invoice>(PURCHASES_FILE, SEED_PURCHASES);
  if (!store[businessId]) {
    store[businessId] = [];
  }

  const newPurchase: Invoice = {
    ...purchase,
    id: purchase.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  };

  store[businessId] = [newPurchase, ...store[businessId]];
  saveStoreFile(PURCHASES_FILE, store);
  return newPurchase;
}

export function updatePurchaseForBusiness(businessId: string, id: string, updates: Partial<Invoice>): Invoice | null {
  const store = loadStoreFile<Invoice>(PURCHASES_FILE, SEED_PURCHASES);
  const list = store[businessId] || [];
  const index = list.findIndex(p => p.id === id);
  if (index === -1) return null;

  const updated: Invoice = { ...list[index], ...updates, id };
  list[index] = updated;
  store[businessId] = list;
  saveStoreFile(PURCHASES_FILE, store);
  return updated;
}

export function deletePurchaseForBusiness(businessId: string, id: string): boolean {
  const store = loadStoreFile<Invoice>(PURCHASES_FILE, SEED_PURCHASES);
  const list = store[businessId] || [];
  const initialLength = list.length;
  store[businessId] = list.filter(p => p.id !== id);

  if (store[businessId].length !== initialLength) {
    saveStoreFile(PURCHASES_FILE, store);
    return true;
  }
  return false;
}

// ─── Gestión de Tareas (Tasks) ───

export function getTasksForBusiness(businessId: string): Task[] {
  const store = loadStoreFile<Task>(TASKS_FILE, SEED_TASKS);
  return store[businessId] ? [...store[businessId]] : [];
}

export function saveTaskForBusiness(businessId: string, task: Task): Task {
  const store = loadStoreFile<Task>(TASKS_FILE, SEED_TASKS);
  if (!store[businessId]) {
    store[businessId] = [];
  }

  const newTask: Task = {
    ...task,
    id: task.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  };

  store[businessId] = [newTask, ...store[businessId]];
  saveStoreFile(TASKS_FILE, store);
  return newTask;
}

export function updateTaskForBusiness(businessId: string, id: string, updates: Partial<Task>): Task | null {
  const store = loadStoreFile<Task>(TASKS_FILE, SEED_TASKS);
  const list = store[businessId] || [];
  const index = list.findIndex(t => t.id === id);
  if (index === -1) return null;

  const updated: Task = { ...list[index], ...updates, id };
  list[index] = updated;
  store[businessId] = list;
  saveStoreFile(TASKS_FILE, store);
  return updated;
}

export function deleteTaskForBusiness(businessId: string, id: string): boolean {
  const store = loadStoreFile<Task>(TASKS_FILE, SEED_TASKS);
  const list = store[businessId] || [];
  const initialLength = list.length;
  store[businessId] = list.filter(t => t.id !== id);

  if (store[businessId].length !== initialLength) {
    saveStoreFile(TASKS_FILE, store);
    return true;
  }
  return false;
}

// ─── Reinicio de Stores para Tests ───

export function resetBusinessStores(): void {
  try {
    if (fs.existsSync(SALES_FILE)) fs.unlinkSync(SALES_FILE);
    if (fs.existsSync(PURCHASES_FILE)) fs.unlinkSync(PURCHASES_FILE);
    if (fs.existsSync(TASKS_FILE)) fs.unlinkSync(TASKS_FILE);
  } catch (err) {
    logger.warn('[BusinessStore] Error eliminando stores durante reset:', err);
  }
}
