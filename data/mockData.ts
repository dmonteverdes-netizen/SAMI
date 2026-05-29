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

// data/mockData.ts
// Datos de demo de "Bodega Don Carlos" — Lima Norte
// 6 meses de operación realista de una bodega limeña
import { Invoice, InvoiceType, DocumentType, Task, TaskStatus } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

// Ventas mensuales realistas: Nov → Apr, crecimiento gradual
const salesRaw = [
  // Noviembre 2025
  { date: '2025-11-03', amount: 890, type: DocumentType.BOLETA },
  { date: '2025-11-08', amount: 1240, type: DocumentType.BOLETA },
  { date: '2025-11-14', amount: 680, type: DocumentType.FACTURA, ruc: '20601234567' },
  { date: '2025-11-20', amount: 2100, type: DocumentType.BOLETA },
  { date: '2025-11-27', amount: 1560, type: DocumentType.BOLETA },
  // Diciembre 2025 — temporada alta
  { date: '2025-12-03', amount: 2400, type: DocumentType.BOLETA },
  { date: '2025-12-10', amount: 1800, type: DocumentType.FACTURA, ruc: '20601234567' },
  { date: '2025-12-18', amount: 3200, type: DocumentType.BOLETA },
  { date: '2025-12-24', amount: 4100, type: DocumentType.BOLETA }, // Navidad
  { date: '2025-12-31', amount: 2900, type: DocumentType.BOLETA }, // Año Nuevo
  // Enero 2026
  { date: '2026-01-07', amount: 1650, type: DocumentType.BOLETA },
  { date: '2026-01-15', amount: 890, type: DocumentType.BOLETA },
  { date: '2026-01-22', amount: 1200, type: DocumentType.FACTURA, ruc: '20601234567' },
  { date: '2026-01-29', amount: 980, type: DocumentType.BOLETA },
  // Febrero 2026
  { date: '2026-02-05', amount: 1100, type: DocumentType.BOLETA },
  { date: '2026-02-12', amount: 1450, type: DocumentType.BOLETA },
  { date: '2026-02-19', amount: 2200, type: DocumentType.FACTURA, ruc: '20765432198' },
  { date: '2026-02-26', amount: 1680, type: DocumentType.BOLETA },
  // Marzo 2026
  { date: '2026-03-04', amount: 1900, type: DocumentType.BOLETA },
  { date: '2026-03-12', amount: 2100, type: DocumentType.BOLETA },
  { date: '2026-03-19', amount: 1500, type: DocumentType.FACTURA, ruc: '20601234567' },
  { date: '2026-03-26', amount: 2400, type: DocumentType.BOLETA },
  // Abril 2026 — más reciente
  { date: '2026-04-02', amount: 2200, type: DocumentType.BOLETA },
  { date: '2026-04-09', amount: 2650, type: DocumentType.BOLETA },
  { date: '2026-04-16', amount: 1980, type: DocumentType.FACTURA, ruc: '20765432198' },
  { date: '2026-04-23', amount: 3100, type: DocumentType.BOLETA },
];

export const MOCK_SALES: Invoice[] = salesRaw.map((s, i) => ({
  id: generateId(),
  type: InvoiceType.SALE,
  documentType: s.type,
  series: s.type === DocumentType.FACTURA ? 'F001' : 'B001',
  correlative: i + 1,
  issueDate: s.date,
  ruc: s.ruc || undefined,
  totalAmount: s.amount,
}));

export const MOCK_PURCHASES: Invoice[] = [
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 1, issueDate: '2025-11-15', ruc: '20100070970', totalAmount: 3200 },
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 2, issueDate: '2025-12-10', ruc: '20100070970', totalAmount: 5800 },
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 3, issueDate: '2026-01-14', ruc: '20100070970', totalAmount: 2900 },
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 4, issueDate: '2026-02-11', ruc: '20553467801', totalAmount: 1800 },
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 5, issueDate: '2026-03-08', ruc: '20100070970', totalAmount: 3500 },
  { id: generateId(), type: InvoiceType.PURCHASE, documentType: DocumentType.FACTURA, series: 'F001', correlative: 6, issueDate: '2026-04-07', ruc: '20553467801', totalAmount: 4200 },
];

export const MOCK_TASKS: Task[] = [
  { id: generateId(), title: 'Declaración mensual IGV', description: 'Presentar PDT 621 en SUNAT Virtual. Usar tu Clave SOL.', category: 'SUNAT', status: TaskStatus.PENDING, dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), priority: 'high', assignedTo: 'u2' },
  { id: generateId(), title: 'Pago a Alicorp (proveedor)', description: 'Pago de factura F001-00890 por S/ 3,500', category: 'Pagos', status: TaskStatus.PENDING, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), priority: 'medium', assignedTo: 'u2' },
  { id: generateId(), title: 'Actualizar stock bebidas', description: 'Revisar inventario de gaseosas y jugos. Hacer pedido si es necesario.', category: 'Inventario', status: TaskStatus.IN_PROGRESS, dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), priority: 'low', assignedTo: 'u3' },
  { id: generateId(), title: 'Renovar licencia de funcionamiento', description: 'Municipalidad de Los Olivos. Llevar: DNI, recibo de luz, formulario.', category: 'Legal', status: TaskStatus.COMPLETED, dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), priority: 'high', assignedTo: 'u2' },
];
