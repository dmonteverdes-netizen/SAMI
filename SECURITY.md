
# Plan de Blindaje Técnico de SAMI (SAMI Technical Shielding Plan)

Este documento describe la política de seguridad y los protocolos técnicos implementados para proteger la plataforma SAMI, sus datos y sus usuarios. Como CISO, mi directiva es que la seguridad sea un pilar fundamental en cada etapa del ciclo de vida del desarrollo.

## 1. Cifrado de Datos (Data Encryption)

Proteger los datos de nuestros clientes es nuestra máxima prioridad. Se implementa una estrategia de cifrado en múltiples capas.

### 1.1. Datos en Tránsito (Data in Transit)
Toda la comunicación entre los clientes (navegadores, aplicaciones móviles) y los servidores de SAMI **debe** realizarse exclusivamente a través de **TLS 1.3 o superior**. Las versiones anteriores de TLS y SSL están prohibidas. La configuración del servidor debe forzar HTTPS y utilizar HSTS (HTTP Strict Transport Security) para prevenir ataques de downgrade.

### 1.2. Datos en Reposo (Data at Rest)
Toda la información sensible del cliente almacenada en nuestras bases de datos (ej. PostgreSQL) **debe** estar cifrada a nivel de campo utilizando el algoritmo **AES-256**. Esto incluye, pero no se limita a:
-   Datos personales (Nombres, RUC, DNI).
-   Registros financieros (montos de facturas, detalles de créditos).
-   Credenciales de usuario y tokens de sesión.

La gestión de las claves de cifrado se realizará a través de un servicio dedicado como AWS KMS o Google Cloud KMS para garantizar que las claves no estén expuestas en el código o en las variables de entorno de la aplicación.

## 2. Gestión de Identidades y Acceso (IAM)

El acceso a la plataforma se rige por el principio de mínimo privilegio.

### 2.1. Protocolo de Autenticación
La autenticación de usuarios se implementará utilizando el estándar **OAuth 2.0 / OpenID Connect**. Esto nos permite delegar la autenticación a proveedores de identidad robustos y probados, reduciendo nuestra superficie de ataque.

### 2.2. Autenticación de Dos Factores (2FA)
La 2FA es **obligatoria** para todos los usuarios, sin excepción:
-   **Usuarios MYPE (Clientes):** Deben configurar 2FA (vía app de autenticación como Google Authenticator, o SMS) durante el proceso de onboarding.
-   **Personal Interno (Administradores, Asistentes):** El acceso a cualquier panel de administración o herramienta interna requiere 2FA. No habrá acceso sin este segundo factor verificado en cada inicio de sesión.

## 3. Enmascaramiento de Datos (Data Masking)

Para proteger los datos de los clientes del acceso interno indebido, se establece una política estricta de enmascaramiento de datos.

### 3.1. Política
Los entornos de desarrollo, pruebas y staging **nunca** deben contener datos de producción reales. Todos los datos en estos entornos deben ser sintéticos o, si se derivan de producción, deben ser anonimizados y enmascarados de forma irreversible.

### 3.2. Implementación
Se proporcionará un conjunto de scripts y servicios (`dataMaskingService`) para que los desarrolladores generen o transformen datos de manera segura. Por ejemplo:
-   **RUCs/DNI:** Se deben mantener los primeros y últimos dígitos, enmascarando los caracteres intermedios (ej. `2060*****123`).
-   **Montos Financieros:** Se deben reemplazar por valores aleatorios dentro de un rango plausible pero inexacto.
-   **Nombres/Razones Sociales:** Se deben reemplazar por nombres generados por librerías (ej. Faker.js).

## 4. Logging y Auditoría

Cada acción sensible dentro de la plataforma debe ser registrada para garantizar la trazabilidad y la rendición de cuentas.

### 4.1. Inmutabilidad de los Registros
Todos los registros de auditoría se enviarán a un sistema de logging centralizado y **append-only (solo adición)**, como AWS QLDB, Google Cloud Logging con políticas de retención estrictas, o una base de datos de series temporales configurada para ser inmutable. Esto previene la manipulación o eliminación de registros de auditoría.

### 4.2. Eventos a Registrar
Se debe registrar, como mínimo, lo siguiente:
-   Intentos de inicio de sesión (exitosos y fallidos).
-   Verificaciones de 2FA.
-   Acceso a cualquier vista que contenga datos financieros de clientes (ej. un admin viendo el dashboard de un usuario).
-   Visualización de dashboards de KPIs de negocio.
-   Cambios en roles o permisos de usuario.
-   Operaciones CRUD sobre entidades financieras (facturas, créditos, etc.).

Cada registro debe contener: timestamp, ID del actor (usuario), dirección IP de origen, la acción realizada y la entidad afectada.
