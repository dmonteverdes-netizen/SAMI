# SIRE y verificación con SUNAT — investigación y diseño propuesto

Fecha: 2026-10-16. Estado: **propuesta, sin implementar**. Objetivo: que la "Salud Tributaria" de SAMI se calcule con datos registrados ante SUNAT y no solo con lo declarado por la MYPE.

## 1. Veredicto

| Pregunta | Respuesta |
|---|---|
| ¿SIRE sirve para leer las ventas reales de la MYPE? | **Sí, pero solo para RER, RMT y Régimen General.** El Nuevo RUS no lleva Registro de Ventas, así que no tiene SIRE ([SUNAT Emprender](https://emprender.sunat.gob.pe/comprobantes-libros/registros-libros-electronicos/sistema-integrado-registros-electronicos-sire), [ContabuzPro](https://contabuzpro.com/blog/sire-2026-obligados-regularizacion-compras-ventas)). Muchas bodegas están en Nuevo RUS. |
| ¿Qué credenciales pide? | Las **de la MYPE**: `client_id`/`client_secret` generados en SOL **más usuario y clave SOL** (`grant_type=password`). Es la parte delicada. |
| ¿Hay algo que SAMI pueda usar sin credenciales de la MYPE? | **Sí: la Consulta Integrada de Validez de Comprobantes.** SAMI usa **sus propias** credenciales (`client_credentials`) y verifica, comprobante por comprobante, si existe y está aceptado en SUNAT. Sirve también para Nuevo RUS (boletas). |
| Recomendación | **Fase 1: Consulta de validez** (bajo riesgo, días de trabajo). **Fase 2: SIRE** solo para MYPE en RER/RMT que den consentimiento y creen un usuario secundario SOL. |

## 2. Las dos APIs

### A. Consulta Integrada de Validez (recomendada primero)

Fuente: especificación OpenAPI publicada por Greenter ([consulta-cpe-openapi](https://github.com/thegreenter/consulta-cpe-openapi)) y su cliente PHP ([consulta-cpe](https://github.com/thegreenter/consulta-cpe)), basados en el manual oficial de SUNAT.

1. **Credenciales de SAMI** (una sola vez): en SOL de *SAMI TECH S.A.C.* → "Credenciales de API SUNAT" → `client_id` y `client_secret`.
2. **Token**: `POST https://api-seguridad.sunat.gob.pe/v1/clientesextranet/{client_id}/oauth2/token/` (form-urlencoded) con `grant_type=client_credentials`, `scope=https://api.sunat.gob.pe/v1/contribuyente/contribuyentes`, `client_id`, `client_secret`.
3. **Consulta**: `POST https://api.sunat.gob.pe/v1/contribuyente/contribuyentes/{RUC_DE_SAMI}/validarcomprobante` con JSON `{ numRuc, codComp, numeroSerie, numero, fechaEmision, monto }`.
4. **Respuesta**: `{ success, message, data: { estadoCp, estadoRuc, condDomiRuc, observaciones[] } }`. Estados del comprobante según Greenter: no existe, aceptado, anulado, autorizado, no autorizado.

Qué aporta: cada venta o compra registrada en SAMI puede marcarse como **"Verificada en SUNAT"**, **"No encontrada"** o **"Anulada"**. La Salud Tributaria muestra "% de ventas verificadas". Es la primera vez que SAMI podría decir "verificado por SUNAT" **con verdad** (AGENTS.md §3).

Limitaciones: es una consulta por comprobante (no lista ventas que la MYPE no registró en SAMI) y desconozco los límites de uso de SUNAT.

### B. SIRE (Registro de Ventas RVIE y de Compras RCE)

URLs extraídas del código de una integración existente ([SwodLore/API-SIRE](https://github.com/SwodLore/API-SIRE), MIT) y coherentes con los manuales de SUNAT ([SIRE Ventas](https://cpe.sunat.gob.pe/sites/default/files/inline-files/Manual%20de%20servicios%20Web%20Api%20Ventas%20v22_Parte%20I.pdf), [SIRE Compras](https://cpe.sunat.gob.pe/sites/default/files/inline-files/Manual%20de%20servicios%20Web%20Api%20-%20SIRE_Compras%20v22.pdf)):

1. **Token**: `POST https://api-seguridad.sunat.gob.pe/v1/clientessol/{client_id}/oauth2/token/` con `grant_type=password`, `scope=https://api-sire.sunat.gob.pe`, `client_id`, `client_secret`, `username={RUC}{USUARIO_SOL}`, `password={CLAVE_SOL}`.
2. **Periodos**: `GET https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros/rvierce/padron/web/omisos/140000/periodos` (140000 = RVIE).
3. **Pedir la propuesta de ventas** (asíncrono): `GET .../libros/rvie/propuesta/web/propuesta/{YYYYMM}/exportapropuesta?codTipoArchivo=...` → devuelve un **ticket**.
4. **Consultar el ticket**: `GET .../libros/rvierce/gestionprocesosmasivos/web/masivo/consultaestadotickets?perIni=&perFin=&page=&perPage=&numTicket=`.
5. **Descargar**: `GET .../libros/rvierce/gestionprocesosmasivos/web/masivo/archivoreporte?nomArchivoReporte=&codTipoArchivoReporte=` → ZIP con TXT.

Qué aporta: la **propuesta RVIE** es la lista de comprobantes electrónicos emitidos que SUNAT tiene para ese mes, incluso los que la MYPE nunca cargó en SAMI. Es la mejor evidencia de ventas para una entidad financiera.

## 3. Riesgos y cómo mitigarlos

| Riesgo | Mitigación propuesta |
|---|---|
| Custodiar la Clave SOL **principal** de miles de MYPE | **Nunca pedirla.** La MYPE crea en SOL un **usuario secundario** solo con el perfil SIRE y genera credenciales de API para SAMI. Puede revocarlo cuando quiera. *(Confirmar con SUNAT qué perfil mínimo permite SIRE vía API.)* |
| Fuga de credenciales | Cifrado en reposo con KMS (ver AUDIT_NOTES §1), nunca en el frontend (AGENTS.md §5), acceso solo desde el job de sincronización y registro de cada uso. |
| Ley 29733 | Nuevo propósito de consentimiento `LECTURA_SIRE`, separado del de transmisión a bancos. Revocable, con fecha y versión de política, como el resto de `ConsentGrant`. |
| Términos de uso de SUNAT para terceros | **Pendiente de revisión legal**: confirmar que un tercero puede usar credenciales de API delegadas por el contribuyente. |
| Cobertura (Nuevo RUS fuera) | La Consulta de Validez cubre a todos; SIRE suma solo para RER/RMT/RG. La UI debe decir de dónde sale cada dato. |
| Formato del TXT de la propuesta y límites de uso | **No verificados** (el portal técnico de SUNAT no era accesible desde el entorno de desarrollo). Validar con el manual vigente y una cuenta real antes de programar el lector. |

## 4. Diseño propuesto

### Fase 1 — Verificación de comprobantes (sin credenciales de la MYPE)

- `server/services/sunatValidationClient.ts`: token cacheado hasta `expires_in`, `validateComprobante(invoice, emitterRuc)`.
- Columnas en `invoices`: `sunatValidationStatus` (`VERIFICADO` | `NO_ENCONTRADO` | `ANULADO` | `NO_AUTORIZADO` | `PENDIENTE`) y `sunatValidatedAt`.
- Job diario: valida ventas y compras nuevas con reintentos y límite de ritmo configurable.
- Salud Tributaria: "% de ventas verificadas en SUNAT", con la fecha de verificación.
- Variables: `SUNAT_API_CLIENT_ID`, `SUNAT_API_CLIENT_SECRET`, `SUNAT_API_RUC` (el de SAMI).

### Fase 2 — SIRE (con consentimiento, solo RER/RMT/RG)

- Modelo `SireCredential` (ruc, clientId, clientSecret cifrado, usuarioSecundario, claveCifrada, estado, último uso) y `SireSyncRun` (periodo, ticket, estado, filas, errores).
- `server/services/sireClient.ts`: token → periodos → exportar propuesta → consultar ticket → descargar ZIP → leer TXT.
- Importación a `invoices` con `source = 'SIRE'`: deduplica contra lo registrado en SAMI (serie, correlativo, RUC) y marca diferencias, que también son una señal útil (ventas en SUNAT que no se registraron en SAMI, o al revés).
- Sincronización mensual desde el 2.º día del mes siguiente (cuando SUNAT publica la propuesta), más una manual.
- Pantalla de onboarding: guía paso a paso para crear el usuario secundario y las credenciales de API, con capturas.

### Fase 3 — Lo que habilita para el marketplace

El expediente que se transmite a las entidades (con consentimiento) pasa de "ventas declaradas por la MYPE" a **"ventas verificadas en SUNAT (X %)"** y **"ventas del RVIE de SUNAT de los últimos 12 meses"**. Ese es el diferencial frente a un formulario de crédito tradicional.

## 5. Próximos pasos

1. Generar las credenciales de API de SAMI en SOL (requiere el RUC de la empresa SAMI).
2. Implementar la Fase 1 y probarla con comprobantes reales.
3. Con una MYPE piloto en RMT: crear el usuario secundario, probar el flujo SIRE y documentar el formato real del TXT.
4. Revisión legal de los puntos marcados como pendientes antes de abrir la Fase 2 a usuarios.
