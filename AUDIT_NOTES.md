# Notas de Auditoría y Decisiones Arquitectónicas de Seguridad (SAMI MVP)

Este documento registra de forma transparente las decisiones técnicas y compensaciones (*trade-offs*) adoptadas conscientemente durante la fase MVP de SAMI, detallando la ruta técnica requerida para la transición a producción bancaria/empresarial.

---

## 1. Cifrado y Firma Digital (`encryptionService.ts` / Frontend Cifrado)
- **Estado Actual en MVP:** 
  - La lógica de cifrado simétrico en frontend/servicios utilitarios utiliza primitivas en memoria / Web Crypto API para validaciones y demostraciones de transporte seguro de datos.
  - No constituye una implementación de hardware de seguridad (HSM).
- **Razón Arquitectónica:**
  - En fase de integración y prueba de concepto B2B2C, los expedientes tributarios reales no se almacenan en clientes web sin autorización expresa y token firmado.
- **Ruta a Producción / Contrato Requerido:**
  - Sustituir el servicio utilitario por cifrado en reposo y en tránsito gestionado exclusivamente en backend a través de **AWS KMS**, **Google Cloud KMS** o **Azure Key Vault**.
  - Firma digital de comprobantes XML (UBL 2.1) delegada a un Proveedor de Servicios Electrónicos (PSE) autorizado por SUNAT mediante certificado digital tributario X.509 de persona jurídica.

---

## 2. Limitador de Tasa en Memoria (`server.ts` / Rate Limiter)
- **Estado Actual en MVP:**
  - El middleware de limitación de tasa (`express-rate-limit` con `MemoryStore`) protege los endpoints contra ráfagas de solicitudes y fuerza bruta en una única instancia de servidor.
  - El estado no se sincroniza entre múltiples réplicas o contenedores efímeros (Cloud Run / Kubernetes).
- **Razón Arquitectónica:**
  - Minimiza la complejidad y latencia de infraestructura externa en el entorno de desarrollo y pruebas.
- **Ruta a Producción / Contrato Requerido:**
  - Migrar el almacenamiento del rate limiter a un cluster de **Redis** o **Dragonfly** distribuido (`rate-limit-redis`).
  - Implementar políticas diferenciadas de cuota por API Key para entidades financieras aliadas y por IP/Sesión para usuarios MYPE.

---

## 3. Almacenamiento de Contraseñas y JWT
- **Estado Actual:**
  - Hashing criptográfico implementado con `bcryptjs` (salt rounds = 10).
  - Secretos JWT (`JWT_SECRET`) obligatorios en variables de entorno para producción, bloqueando el arranque si no están configurados.
- **Ruta a Producción:**
  - Rotación periódica de claves JWT mediante secretos asimétricos (RS256 / JWKS).
  - Soporte de OpenID Connect / SAML para entidades financieras bancarias.

---

## 4. Política Anti-Score y Cumplimiento Ley Peruana
- **Estado:**
  - Queda prohibida en todo el código y la interfaz la palabra "Score" o rankings crediticios tipo SBS.
  - Todo dato tributario y financiero se rotula como "Salud Tributaria", "Salud Financiera" o "Declarado por el usuario / Simulado".

---

## 5. Cálculo Dinámico de Indicadores de Salud Tributaria (`formalityRatio` y `complianceStatus`)
- **Estado Actual (Fase 2.5):**
  - Se eliminaron las constantes hardcodeadas (`formalityRatio: 100` y `complianceStatus: 'Al día'`).
  - Como SAMI no cuenta con integración SUNAT en tiempo real en este MVP, ambos indicadores se calculan determinísticamente a partir de los comprobantes de ventas registrados por la MYPE en SAMI.
- **Fórmulas de Cálculo:**
  - `formalityRatio` (0-100, redondeado a entero):
    $$formalityRatio = \left(\frac{\text{meses calendario con al menos 1 venta entre el primer y último comprobante}}{\text{meses calendario totales en ese mismo rango}}\right) \times 100$$
    *El rango va del primer al último comprobante registrado, no hasta hoy.*
  - `complianceStatus` (string categórico con parámetro determinista `referenceDate`):
    - `'Al día'`: Fecha del último comprobante de venta a 30 días o menos de la fecha de referencia.
    - `'Registro desactualizado'`: Fecha del último comprobante de venta entre 31 y 90 días de la fecha de referencia.
    - `'Sin actividad reciente'`: Fecha del último comprobante de venta a más de 90 días de la fecha de referencia (o sin comprobantes de venta).

---

## 6. Canal de Notificaciones por WhatsApp (`notificationService.ts` / `sendCloudNotification`)
- **Estado Actual en MVP (Fase 1):**
  - La función `sendCloudNotification()` en `core/services/notificationService.ts` es una simulación en memoria/consola con retardo artificial (`setTimeout 800ms`) y generación de identificadores simulados (`SIMULADO_msg_*`).
  - No existe integración activa con la API de Meta Business (WhatsApp Cloud API), Twilio ni proveedores de soluciones de negocio (BSPs como 360dialog o Wati).
  - El número de WhatsApp configurado en `NotificationSettings.tsx` se almacena temporalmente en el `localStorage` del navegador cliente y no se persiste en PostgreSQL ni en el perfil del usuario en el servidor.
  - La referencia a WhatsApp en el chatbot de soporte (`chat.ts`) corresponde a un canal operativo manual de atención humana, sin recepcionista automático ni webhooks entrantes en el backend.
- **Razón Arquitectónica:**
  - Priorización del flujo central de orden tributario, emisión de comprobantes con PSE y expediente de consentimiento financiero en la fase MVP sin incurrir en costos de verificación de negocio y tarifas de mensajería comercial.
- **Ruta a Producción / Requisitos Previos:**
  - Creación y verificación de cuenta corporativa en **Meta Business Manager** con razón social y RUC de SAMI TECH S.A.C.
  - Registro y aprobación de plantillas oficiales de mensaje (*Message Templates*) en categorías de Utilidad (*Utility*) para alertas tributarias y transaccionales.
  - Modelo de persistencia `NotificationPreference` en PostgreSQL con consentimiento explícito de comunicación (Ley N° 29733 de Protección de Datos Personales).
  - Servicio backend dedicado (`/api/v1/notifications`) con cola asíncrona de mensajes (BullMQ / Cloud Tasks) y webhooks autenticados mediante firma HMAC-SHA256.

---

## 7. Digitalizador de Compras OCR (`WorkerDashboard.tsx` / `server/routes/ocr.ts`)
- **Estado Actual en MVP:**
  - La sección de digitalización OCR en el panel de trabajador opera exclusivamente en modo demostración con dos comprobantes de compra de ejemplo precargados (`factura_telas` y `boleta_hilos`).
  - La zona de carga de archivos (PDF/XML) se encuentra deshabilitada con etiqueta de "Próximamente" y notificación informativa mientras se implementa el procesamiento real.
  - El endpoint backend actual (`POST /api/v1/ocr/analyze-trade-name`) está acotado a la extracción de nombres comerciales para el registro de la MYPE, sin un pipeline que procese y extraiga de forma estructurada los campos tributarios y de detalle de un comprobante de pago completo.
- **Razón Arquitectónica:**
  - El foco del MVP en esta fase es validar el flujo de experiencia de usuario para el ingreso de compras a inventario y la asignación automática de ítems, postergando la integración del pipeline de visión multimodal y validación UBL/XML.
- **Ruta a Producción / Pipeline Requerido:**
  - **Endpoint dedicado (`POST /api/v1/ocr/extract-invoice`):** Recepción de imagen o PDF de la factura mediante carga multipart segura, con validación de tipo MIME y tamaño máximo.
  - **Motor de Extracción con Gemini Vision / Document AI:** Envío de la imagen con un esquema JSON estructurado (`zod` o `gemini` responseSchema) para extraer:
    - `supplierRuc` (RUC del proveedor emisor, validado mediante algoritmo módulo 11 `isValidRUC`)
    - `supplierName` (Razón social)
    - `series` y `correlative` (Serie y correlativo del comprobante)
    - `issueDate` (Fecha de emisión en formato YYYY-MM-DD)
    - `subtotal`, `igv`, `totalAmount` (Montos numéricos validados: $Subtotal + IGV = Total$)
    - `items`: Array de ítems con descripción, cantidad, unidad de medida y precio unitario.
  - **Validador de Comprobantes SUNAT:** Consulta en línea al servicio de consulta integrada de validez de comprobantes de pago de SUNAT o integración con PSE para certificar estado ACTIVO/HABIDO y validez del comprobante electrónico.
  - **Manejo de Errores y Confianza:** Puntuación de confianza en la extracción y fallback a corrección manual asistida por la MYPE antes de asentar en el registro de compras.

---

## 8. Recuperación de Contraseñas y Restablecimiento para MYPE (`auth.ts`)
- **Estado Actual en MVP:**
  - **Para Colaboradores (`MYPE_WORKER`, `MYPE_ACCOUNTANT`):** El Administrador MYPE (`MYPE_ADMIN`) puede restablecer la contraseña de cualquier colaborador de su propio negocio a través del endpoint protegido `POST /api/v1/auth/reset-collaborator-password`. El sistema genera una contraseña temporal segura que se entrega de manera directa y fuera de banda (*out-of-band*).
  - **Para el Administrador MYPE (`MYPE_ADMIN`):** Al no contar con integración activa de mensajería transaccional por correo (SMTP/SendGrid/SES) ni SMS (Twilio/AWS SNS), no existe un mecanismo de autoservicio para la recuperación de contraseña del administrador principal. La recuperación se canaliza mediante solicitud de soporte verificada (`soporte@sami.pe` o ticket presencial con validación de RUC y DNI del titular).
- **Razón Arquitectónica:**
  - Evitar implementar interfaces simuladas de "recuperación de contraseña por correo" que creen una falsa expectativa en el usuario sin contar con el transporte real de mensajes.
- **Ruta a Producción / Requisitos Previos:**
  - Integración de servicio SMTP o proveedor transaccional (ej. Amazon SES, SendGrid, Postmark) con registro de dominio SPF/DKIM/DMARC validado para `@sami.pe`.
  - Generación de tokens criptográficos de un solo uso (*magic links* / OTP con validez de 15 minutos) almacenados con hash en base de datos.
  - Opcional: Validación biométrica facial contra RENIEC para recuperación de cuentas MYPE críticas.

---

## 9. Desafiliación, Retención Tributaria y Solicitudes ARCO (Ley N° 29733 vs. SUNAT)
- **Estado Actual en MVP:**
  - **Desactivación de Cuenta (`POST /api/v1/auth/deactivate-account`):** Permite al titular MYPE suspender inmediatamente el acceso al sistema para su usuario y sus colaboradores vinculados (`isActive: false`), bloqueando nuevos inicios de sesión.
  - **Portabilidad de Datos (`GET /api/v1/auth/export-my-data`):** Permite descargar un expediente consolidado en formato JSON estructurado con la información de la empresa, ventas, compras, consentimientos y registros ARCO de conformidad con el Art. 18° de la Ley N° 29733.
  - **Conservación Tributaria:** La desactivación de la cuenta **no elimina** los comprobantes de pago ni los libros contables electrónicos. Conforme a los Artículos 62° y 87° del Código Tributario Peruano, los contribuyentes y plataformas deben conservar los registros contables y tributarios durante el plazo prescriptorio legal (mínimo 5 años).
  - **Derecho ARCO de Cancelación:** El borrado o cancelación definitiva de datos personales se canaliza mediante el registro formal de una solicitud ARCO (`ArcoRequest` con `rightType: 'CANCELACION'`), la cual ingresa al flujo de evaluación con plazo de ley (10 días hábiles) para que el Oficial de Privacidad determine los datos personales cancelables frente a los datos tributarios no eliminables por mandato imperativo de ley.
- **Ruta a Producción:**
  - Automatización del flujo de disociación y anonimización de datos personales una vez cumplidos los plazos prescriptorios de la SUNAT.
  - Firma digital del expediente de portabilidad con sello de tiempo (*Time Stamping Authority*).

---

## 10. Limitación de Tasa y Protección contra Fuerza Bruta (`authRateLimiter.ts` y Sesiones 2FA)
- **Estado Actual en MVP:**
  - **Primer Factor (`POST /auth/login`):** Implementación de un limitador de tasa estricto (`authRateLimiter.ts`) con ventana deslizante de 15 minutos y un máximo de 5 intentos fallidos por identificador (correo/teléfono/DNI) y dirección IP. Al exceder el umbral, se bloquea con HTTP 429 (`TOO_MANY_FAILED_ATTEMPTS`) e informa los segundos restantes (`retryAfterSeconds`). Las autenticaciones exitosas limpian el historial de intentos.
  - **Segundo Factor (`POST /auth/2fa/verify`):** Cuenta con su propio mecanismo independiente de protección a nivel de sesión temporal (`pending2faSessions`). Permite un máximo estricto de 3 intentos de código numérico; al superarse, la sesión temporal de 10 minutos queda destruida de inmediato (HTTP 403 `TOO_MANY_ATTEMPTS`), obligando a reiniciar el flujo de autenticación desde el primer factor.
- **Ruta a Producción:**
  - Migración del almacén en memoria hacia Redis Cluster para protección coordinada entre instancias de microservicios.
  - Integración con soluciones de CAPTCHA invisible (Cloudflare Turnstile o reCAPTCHA v3) tras 3 intentos fallidos antes del bloqueo total.

---

## 11. Honestidad en Validaciones Externas de Onboarding, Depuración de Endpoints y Protección de Registro (Fase A - Semana 2)
- **Estado Actual en MVP:**
  - **Validación Canónica de RUC (`validationService.ts` / `isValidRUC`):** Se eliminaron las heurísticas simples de frontend (`starts with 20/10`). La validación de RUC ejecuta formalmente el algoritmo oficial de SUNAT Módulo 11 con verificación de prefijos legales (10, 15, 17, 20). Los datos de razón social complementarios se devuelven con indicación transparente de entorno demo (`isSimulated: true`, `simulatedEnvironment: 'Modo Demostración'`).
  - **Vigencia de Poder y Representatividad Legal (`validateLegalRepresentation`):** El procesamiento documental opera como prototipo demostrativo. Se eliminaron mensajes que afirmaban "cotejo oficial ante RR.PP." y se etiquetó explícitamente en la interfaz (`Register.tsx`) con distintivo ámbar de "Modo Demostración", indicando que la integración en vivo con SUNARP está en desarrollo.
  - **Validación de Cuentas Bancarias / CCI (`validateBankAccount`):** Se eliminó el identificador engañoso `verifiedBy: 'SBS-GATEWAY-V2'`. Se sustituyó por rotulado honesto de simulación (`SIMULADOR-BANCARIO-DEMO`) y etiquetas visibles de "Modo Demostración" en el portal bancario (`BankDashboard.tsx`).
  - **Depuración de Endpoints Huérfanos (`server/routes/auth.ts`):** Se eliminaron definitivamente las rutas no consumidas `POST /auth/validate-ruc` (reemplazada por la validación canónica en frontend/backend) y `GET /auth/permissions-matrix` (cuyos permisos ya viajan encapsulados en el payload de login y token JWT).
  - **Protección contra Abuso en Registro (`POST /auth/register`):** Se incorporó control de tasa específico (`checkRegisterRateLimit` en `authRateLimiter.ts`) limitando la creación masiva de cuentas a un máximo de 5 intentos por IP en una ventana de 15 minutos (HTTP 429 `TOO_MANY_REGISTRATION_ATTEMPTS`).
- **Ruta a Producción / Contratos Requeridos:**
  - **SUNAT / RENIEC (PIDE):** Convenio de acceso institucional a la Plataforma de Interoperabilidad del Estado (PIDE) de la Secretaría de Gobierno y Transformación Digital (PCM) o integración con API de consulta masiva RUC de un PSE homologado por SUNAT.
  - **SUNARP (Vigencia de Poderes):** Integración con el Servicio de Publicidad Registral en Línea (SPRL) de la SUNARP o consulta automatizada del Registro de Personas Jurídicas para validar facultades de representación en el asiento registral.
  - **Validación de Cuentas Interbancarias:** Convenio directo de conectividad API con bancos aliados o adhesión a la Cámara de Compensación Electrónica (CCE / ACH Perú) para validación de titularidad de cuentas y estado activo.

---

## 12. Persistencia de Tareas en Cliente (Fase C - Semana 6)
- **Estado Actual en MVP:**
  - Las tareas operativas (`tasks`) en `App.tsx` ahora persisten en el `localStorage` del navegador mediante `usePersistentState` (`sami_demo_tasks`), sobreviviendo a recargas de página del mismo modo que las ventas (`sales`) y compras (`purchases`).
  - Al igual que en ventas y compras, las tareas **no se sincronizan con ningún backend real** ni base de datos persistente en servidor; el archivo `server/routes/tasks.ts` permanece como un stub en desarrollo.
- **Razón Arquitectónica:**
  - Solución rápida para evitar la pérdida inmediata de tareas creadas o completadas por el usuario durante la sesión en el cliente, manteniendo consistencia con el patrón de persistencia local existente para datos transaccionales de demostración.
- **Ruta a Producción:**
  - Mismo pendiente de arquitectura de datos unificada identificado para comprobantes de venta y compra: implementar persistencia real en base de datos relacional (PostgreSQL / Prisma) vinculada a la cuenta de la MYPE con sincronización API REST autenticada (`/api/v1/tasks`).

---

## 13. Correcciones de octubre 2026 (rama `sami-codigo-a-octubre-2026-exploraciones-github`)
- **Corrección a §11:** `core/services/pseService.ts` (`fetchRucDetails`) seguía generando empresas al azar sin rótulo, y la emisión simulada respondía "La Factura ha sido aceptada". Ahora:
  - La consulta de RUC usa el **padrón reducido SUNAT** (`GET /api/v1/ruc/:ruc`, tabla `ruc_padron`). Sin padrón cargado devuelve una ficha demo **determinista**, con `isSimulated: true`, sufijo "(DEMO)" e insignia visible "Modo Demostración".
  - La emisión se hace en el backend (`POST /api/v1/einvoice/emit`) con **Nubefact** si hay credenciales; si no, responde `isSimulated: true` y nunca afirma aceptación de SUNAT.
  - Se retiraron textos "verificado por SUNAT", "SAMI Scoring Engine" y "sube tu Score", y valores por defecto inventados en `TaxSummaryCard`.
- **Persistencia:** ventas y compras se guardan en PostgreSQL (`server/services/invoiceRepository.ts`) cuando hay `DATABASE_URL` y RUC en el token; el almacén JSON queda solo para desarrollo. Las escrituras filtran por `smeId` (anti-IDOR) y los duplicados responden 409.
- **Migraciones:** las dos migraciones anteriores no corrían en una base vacía (alteraban `smes` sin crearla; faltaba `migration_lock.toml`). Se reemplazaron por una migración inicial única (`20261016000000_init`). Si existiera una base creada con `prisma db push`, marcarla con `npx prisma migrate resolve --applied 20261016000000_init` tras comparar el esquema.
- **Backend único:** PostgreSQL + Prisma. Se eliminaron `FIREBASE_BACKEND_GUIDE.md` y `firebase-applet-config.json` (sin uso en el código). Ver `BACKEND_GUIDE.md`.
- **Higiene:** `package-lock.json` regenerado (`npm ci` fallaba); tests aislados en un directorio temporal (`SAMI_DATA_DIR`); almacenes JSON de ejecución fuera del control de versiones.
- **Pendiente:** confirmar con el manual oficial de Nubefact los nombres de campos de respuesta; ampliar la emisión a detalle por ítem; las tareas (§12) siguen en `localStorage` + JSON.
