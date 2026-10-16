# SAMI - Guía de Obtención de Cuentas y Llaves API Gratuitas

Esta guía contiene los enlaces y formularios de registro paso a paso para obtener los accesos necesarios para operar SAMI en un entorno de producción o pruebas sin costos iniciales.

---

## 1. apis.net.pe - Consulta de RUC y DNI en Perú (Gratuito)

- **¿Para qué se usa?**: Permite consultar la razón social, condición (HABIDO) y estado (ACTIVO) de cualquier RUC de 11 dígitos o DNI de 8 dígitos en Perú directamente con SUNAT/RENIEC.
- **Costo**: Plan gratuito disponible con hasta 1,000 consultas mensuales.
- **Pasos para obtener la API Key**:
  1. Ingresa a [https://apis.net.pe/](https://apis.net.pe/)
  2. Haz clic en **"Registrarse / Iniciar Sesión"**.
  3. Completa el formulario de registro con tu correo y contraseña.
  4. Ve a la sección **"Tokens"** o **"Mi Panel"**.
  5. Copia tu Bearer Token (e.g., `apis-token-1234.abcdef...`).
  6. Colócalo en el archivo `.env`:
     ```env
     APIS_NET_PE_TOKEN=apis-token-tu-token-aqui
     ```

---

## 2. Gemini API - Google AI Studio (Gratuito)

- **¿Para qué se usa?**: Es el motor de Inteligencia Artificial que impulsa al Asistente SAMI para resolver dudas contables, analizar comprobantes y proyectar impuestos.
- **Costo**: Plan gratuito sin tarjeta de crédito (Free Tier de Google AI Studio con límites generosos de RPM).
- **Pasos para obtener la API Key**:
  1. Entra a [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
  2. Inicia sesión con tu cuenta de Google.
  3. Haz clic en **"Create API Key"** (Crear clave API).
  4. Selecciona un proyecto existente de Google Cloud o crea uno nuevo en 1 clic.
  5. Copia la clave generada (empieza por `AIzaSy...`).
  6. Agrégala en el archivo `.env`:
     ```env
     GEMINI_API_KEY=AIzaSy...
     ```

---

## 3. Resend - Envió de Correos Transaccionales (Gratuito)

- **¿Para qué se usa?**: Envío de alertas de vencimiento de impuestos, resúmenes semanales a dueños de MYPEs y códigos de verificación 2FA.
- **Costo**: Plan Free de hasta 3,000 correos al mes (100 correos/día).
- **Pasos para obtener la API Key**:
  1. Ingresa a [https://resend.com/](https://resend.com/)
  2. Regístrate con tu correo o cuenta de GitHub.
  3. En el panel principal, dirígete a **API Keys -> Create API Key**.
  4. Asigna un nombre como `SAMI-Production`.
  5. Copia la llave (empieza por `re_...`).
  6. Agrégala a tu `.env`:
     ```env
     RESEND_API_KEY=re_123456789...
     ```

---

## 4. Credenciales SOL de SUNAT (Para Pruebas MYPE Piloto)

- **¿Para qué se usa?**: Permite que el sistema consulte los comprobantes reales (Facturas y Boletas) directamente desde el buzón de la SUNAT vía Clave SOL secundario (Usuario Secundario con permiso de consulta RVIE/RSE).
- **Cómo obtener un usuario secundario en SOL**:
  1. El dueño de la MYPE ingresa a [https://www.sunat.gob.pe/](https://www.sunat.gob.pe/) con su RUC, Usuario y Clave SOL.
  2. Dirigirse a **Administración de Usuarios Secundarios -> Crear Usuario**.
  3. Asignar un nombre de usuario (ejemplo: `SAMISYNC`).
  4. Asignar exclusivamente el permiso: **Comprobantes de Pago -> Libros Electrónicos -> Consulta RVIE**.
  5. Guardar la clave asignada.
