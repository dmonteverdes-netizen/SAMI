# SAMI - Guía de Configuración y Despliegue Backend (Firebase / Supabase)

Esta guía permite implementar el backend de SAMI utilizando plataformas "Sin Código" / "Backend as a Service" (Firebase o Supabase) reduciendo semanas de trabajo de desarrollo inicial.

---

## Opción A: Despliegue con Firebase (Recomendado por SAMI)

### Paso 1: Crear Proyecto en Firebase Console
1. Ingresa a [https://console.firebase.google.com](https://console.firebase.google.com) e inicia sesión con tu cuenta de Google.
2. Haz clic en **"Agregar proyecto"** y nombra tu proyecto: `sami-app-prod`.
3. Desactiva o activa Google Analytics según tus preferencias y presiona **"Crear proyecto"**.

### Paso 2: Habilitar Autenticación (Firebase Auth)
1. En el menú lateral, selecciona **Build -> Authentication**.
2. Haz clic en **Get Started**.
3. En la pestaña **Sign-in method**, habilita:
   - **Correo electrónico/Contraseña** (Email/Password).
   - **Google** (opcional, para login rápido).

### Paso 3: Crear la Base de Datos Firestore
1. En el menú lateral, selecciona **Build -> Firestore Database**.
2. Haz clic en **Create Database**.
3. Selecciona la ubicación del servidor: `us-central` o `southamerica-east1` (São Paulo).
4. Elige **"Start in production mode"** (Modo producción).

### Paso 4: Cargar Reglas de Seguridad (`firestore.rules`)
Copia y pega el siguiente código en la pestaña **Rules** de tu consola de Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función auxiliar para verificar autenticación
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Verifica si el usuario pertenece a la misma MYPE
    function isSameBusiness(businessId) {
      return isAuthenticated() && request.auth.token.businessId == businessId;
    }

    // Colección de Usuarios
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }

    // Colección de Comprobantes (Facturas/Boletas)
    match /invoices/{invoiceId} {
      allow read: if isAuthenticated() && (
        resource.data.businessId == request.auth.token.businessId ||
        request.auth.token.role in ['BANK_ANALYST', 'BANK_SUPERVISOR', 'SAMI_ADMIN']
      );
      allow create, update: if isAuthenticated() && request.resource.data.businessId == request.auth.token.businessId;
      allow delete: if isAuthenticated() && request.auth.token.role == 'MYPE_ADMIN';
    }

    // Colección de Solicitudes de Crédito
    match /credit_applications/{appId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.token.role == 'MYPE_ADMIN';
      allow update: if isAuthenticated() && request.auth.token.role in ['BANK_ANALYST', 'BANK_SUPERVISOR', 'SAMI_ADMIN'];
    }

    // Logs de Auditoría (Solo lectura/creación)
    match /audit_logs/{logId} {
      allow read: if isAuthenticated() && request.auth.token.role in ['SAMI_ADMIN', 'SAMI_ANALYST'];
      allow create: if isAuthenticated();
    }
  }
}
```

---

## Opción B: Despliegue con Supabase (PostgreSQL Visual)

### Paso 1: Crear Proyecto en Supabase
1. Ingresa a [https://supabase.com](https://supabase.com) y crea un nuevo proyecto `sami-database`.
2. Establece una contraseña segura para tu base de datos PostgreSQL.

### Paso 2: Ejecutar Script de Tablas en el SQL Editor de Supabase

```sql
-- Crear Enum de Roles
CREATE TYPE app_role AS ENUM (
  'MYPE_ADMIN', 'MYPE_WORKER', 
  'BANK_ANALYST', 'BANK_SUPERVISOR', 'BANK_ADMIN', 
  'SAMI_ANALYST', 'SAMI_ADMIN'
);

-- Tabla de Empresas
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruc VARCHAR(11) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tax_regime TEXT NOT NULL DEFAULT 'RMT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Comprobantes de Pago
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('sale', 'purchase')),
  document_type TEXT NOT NULL,
  series VARCHAR(10) NOT NULL,
  correlative INT NOT NULL,
  issue_date DATE NOT NULL,
  ruc_client_supplier VARCHAR(11),
  client_supplier_name TEXT,
  total_amount NUMERIC(12,2) NOT NULL,
  taxable_amount NUMERIC(12,2) NOT NULL,
  igv_amount NUMERIC(12,2) NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
```
