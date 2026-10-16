# SAMI - Especificación de Modelo de Datos y Reglas de Negocio (Production Blueprint)

Documento técnico de especificación funcional y técnica para el desarrollo de producción de la plataforma **SAMI (Asistente Financiero e Inteligencia Tributaria para MYPES en Perú)**.

---

## 1. Roles de Usuario y Matriz de Permisos

La plataforma soporta tres categorías de organizaciones con sus respectivos roles:

| Categoría | Rol (`AppRole`) | Descripción y Alcance de Permisos |
| :--- | :--- | :--- |
| **MYPE** | `MYPE_ADMIN` | Dueño/Administrador de la MYPE. Acceso total a Ventas Rápidas, Compras/Gastos, Reportes Fiscales (IGV/Renta), Solicitud de Créditos, Muestreo de Impuestos, Chat Asistente AI y Gestión de Personal. |
| **MYPE** | `MYPE_WORKER` | Trabajador/Operativo. Acceso restringido únicamente a **Ventas Rápidas** (POS/Emisión) y consulta básica de stock/catálogo. No tiene acceso a márgenes, gastos, créditos ni estado financiero global. |
| **Entidad Financiera** | `BANK_ANALYST` | Analista de Crédito. Acceso a consulta de datos tributarios (RVIE/SUNAT) autorizados por MYPES para evaluación e ingreso en el sistema de scoring interno del banco. |
| **Entidad Financiera** | `BANK_SUPERVISOR` | Supervisor de Riesgos. Supervisión de consultas de cartera, configuración de parámetros y simulación de extracción masiva de comprobantes. |
| **Entidad Financiera** | `BANK_ADMIN` | Administrador de Entidad Financiera. Gestión de llaves API B2B, suscripción a webhooks de alertas y gobierno de datos. |
| **SAMI Core** | `SAMI_ADMIN` | Fundador/Equipo Técnico Interno. Acceso al Panel de Control Administrativo Global, métricas MRR, auditoría en tiempo real, gestión de partners y configuración de la plataforma (Requiere 2FA). |
| **SAMI Core** | `SAMI_ANALYST` | Analista Interno SAMI. Monitoreo de salud del sistema, soporte y validación de reglas de negocio. |

---

## 2. Regímenes Tributarios Soportados (SUNAT Perú)

SAMI adapta sus cálculos automáticos según el Régimen Tributario configurado en la MYPE:

1. **NRUS (Nuevo Régimen Único Simplificado):**
   - Límite de ventas/compras: Hasta S/ 8,000 mensuales (Categoría 2: S/ 50 cuota fija; Categoría 1: S/ 20 cuota fija hasta S/ 5,000).
   - Comprobantes emitidos: Solo Boletas de Venta y Tickets (No emite Facturas; no genera Crédito Fiscal de IGV).
2. **RER (Régimen Especial de Impuesto a la Renta):**
   - Impuesto a la Renta: 1.5% plano sobre Ingresos Netos Mensuales (pago definitivo).
   - IGV: 18% (Débito Fiscal - Crédito Fiscal).
   - Límite de ingresos anuales: S/ 525,000.
3. **RMT (Régimen MYPE Tributario - Recomendado por defecto):**
   - Pago a Cuenta Mensual de Impuesto a la Renta:
     - Hasta 300 UIT de ingresos acumulados anuales: **1.0%** sobre ingresos netos mensuales.
     - Más de 300 UIT y hasta 1,700 UIT: **1.5%** sobre ingresos netos mensuales (o coeficiente).
   - Impuesto a la Renta Anual: 10% por las primeras 15 UIT de utilidad neta; 29.5% por el exceso.
   - IGV: 18% (Débito Fiscal - Crédito Fiscal).
   - Aplica beneficio de **IGV Justo (Ley N° 30524)**: Prórroga del pago de IGV mensual hasta por 90 días naturales.
4. **Régimen General (RG):**
   - Pago a cuenta mensual de Renta: 1.5% o coeficiente del ejercicio anterior.
   - Regularización anual: 29.5% sobre utilidad neta.

---

## 3. Modelo de Datos Entidad-Relación (Campos Exactos)

### 3.1. Entidad: `User` (Usuarios)
```typescript
interface User {
  id: string;               // UUID único
  name: string;             // Nombre completo del usuario
  email: string;            // Correo electrónico principal (indexado)
  role: AppRole;            // Rol de acceso (enum)
  businessId: string;       // ID de la MYPE vinculada
  institutionId?: string;   // ID de la Entidad Financiera (si aplica)
  phoneNumber?: string;     // Teléfono de contacto
  twoFactorEnabled: boolean;// Estado de 2FA
  createdAt: string;        // ISO Date
}
```

### 3.2. Entidad: `Business` (MYPE / Empresa)
```typescript
interface Business {
  id: string;               // UUID
  ruc: string;              // RUC de 11 dígitos (e.g., "20123456789")
  name: string;             // Razón Social
  tradeName?: string;       // Nombre Comercial
  taxRegime: 'NRUS' | 'RER' | 'RMT' | 'RG'; // Régimen SUNAT
  address: string;          // Dirección fiscal
  economicActivity: string; // CIIU / Rubro principal
  taxStatus: 'HABIDO' | 'NO_HABIDO' | 'NO_HALLADO';
  taxState: 'ACTIVO' | 'BAJA_PROVISIONAL' | 'BAJA_DEFINITIVA';
  isIgvJustoEligible: boolean; // Cumple requisitos para prórroga de IGV
}
```

### 3.3. Entidad: `Invoice` (Comprobantes de Pago - Ventas y Compras)
```typescript
interface Invoice {
  id: string;               // UUID del comprobante
  businessId: string;       // MYPE propietaria
  type: 'sale' | 'purchase';// Venta o Compra
  documentType: 'FACTURA' | 'BOLETA_DE_VENTA' | 'NOTA_DE_CREDITO' | 'NOTA_DE_DEBITO';
  series: string;           // Serie (e.g., "F001", "B001")
  correlative: number;      // Número correlativo (e.g., 1045)
  issueDate: string;        // Fecha de emisión YYYY-MM-DD
  ruc?: string;             // RUC/DNI del Cliente o Proveedor
  clientOrSupplierName?: string; // Nombre/Razón Social del Cliente o Proveedor
  totalAmount: number;      // Monto total inc. IGV en PEN (S/)
  taxableAmount: number;    // Base imponible = totalAmount / 1.18
  igvAmount: number;        // IGV = totalAmount - taxableAmount
  category?: string;        // Categoría comercial (Mercadería, Servicios, Imprenta, etc.)
  paymentStatus: 'paid' | 'pending' | 'overdue';
  hasDetraction?: boolean;  // Indica si aplica detracción SPOT
  detractionAmount?: number;// Monto depositado en Banco de la Nación
}
```

### 3.4. Entidad: `CreditApplication` (Solicitud de Financiamiento)
```typescript
interface CreditApplication {
  id: string;               // UUID de la solicitud
  userId: string;           // Usuario MYPE solicitante
  businessRuc: string;      // RUC de la MYPE
  type: 'loan' | 'factoring';
  amount: number;           // Monto solicitado en S/
  partnerId: string;        // Entidad Financiera seleccionada
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'disbursed';
  timestamp: string;        // Fecha y hora
}
```

### 3.5. Entidad: `AuditLog` (Trazabilidad y Seguridad)
```typescript
interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: AppRole;
  action: string;           // Descripción formal de la acción realizada
  ipAddress?: string;
}
```

---

## 4. Reglas de Cálculo Tributario (Fórmulas Matemáticas)

1. **Base Imponible y Débito/Crédito de IGV (18%):**
   $$\text{Base Imponible} = \frac{\text{Monto Total}}{1.18}$$
   $$\text{IGV (18\%)} = \text{Monto Total} - \text{Base Imponible}$$

2. **Liquidación Mensual de IGV:**
   $$\text{Débito Fiscal IGV} = \sum \text{IGV de Facturas y Boletas de Ventas}$$
   $$\text{Crédito Fiscal IGV} = \sum \text{IGV de Facturas de Compras Deducibles}$$
   $$\text{IGV a Pagar} = \max(0, \text{Débito Fiscal IGV} - \text{Crédito Fiscal IGV})$$
   *(Las boletas de compra NO generan crédito fiscal de IGV).*

3. **Pago a Cuenta de Impuesto a la Renta (RMT):**
   $$\text{Ingreso Neto Mensual} = \sum \text{Base Imponible de Ventas del Mes}$$
   $$\text{Pago a Cuenta Renta} = \text{Ingreso Neto Mensual} \times 0.01 \quad (\text{para RMT} \le 300 \text{ UIT})$$

---

## 5. Garantía Absoluta sobre Scoring Crediticio

**REGLA FUNDAMENTAL SAMI:**
SAMI **NO** realiza calificación crediticia, ni evaluación de riesgo, ni otorga puntajes vinculantes para créditos. SAMI actúa de forma neutral compartiendo la información tributaria y de facturación electrónica autorizada por la MYPE. Las Entidades Financieras extraen dicha data e integran sus propios modelos de Scoring e investigación de centrales de riesgo en sus sistemas internos.
