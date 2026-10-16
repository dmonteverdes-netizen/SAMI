# SAMI — Guía del Backend (PostgreSQL + Prisma)

SAMI usa **un solo backend**: Express + JWT + PostgreSQL vía Prisma. (La guía anterior de Firebase/Supabase se retiró porque el código nunca usó Firebase.)

## 1. Requisitos

- Node.js 20 o 22 y npm 10+
- PostgreSQL 14+ (local, Docker o un servicio gestionado como Neon, Supabase-Postgres o Cloud SQL)

```bash
# PostgreSQL local con Docker (opcional)
docker run -d --name sami-db -e POSTGRES_PASSWORD=sami -p 5432:5432 postgres:16
```

## 2. Instalación

```bash
npm ci                     # usa package-lock.json (regenerado en oct-2026)
cp .env.example .env       # completar DATABASE_URL, JWT_SECRET, etc.
npm run db:migrate-deploy  # crea todas las tablas (migración inicial 20261016000000_init)
npm run db:generate
npm run dev                # http://localhost:3000
```

Verificación: `GET /api/health` debe responder `"database":"connected"`.

**Sin `DATABASE_URL`**, la app funciona igual en modo desarrollo: ventas, compras y tareas se guardan en archivos JSON locales (`data/*_db.json`, o la carpeta de `SAMI_DATA_DIR`). Esos archivos no se versionan.

## 3. Dónde se guarda cada cosa

| Dato | Con PostgreSQL | Sin PostgreSQL |
|---|---|---|
| Ventas y compras | Tabla `invoices` (por RUC de la MYPE, `smeId`) | `data/sales_db.json`, `data/purchases_db.json` |
| Usuarios, consentimientos, ARCO | Tablas `users`, `consent_grants`, `consent_events`, `arco_requests` | Memoria / `data/consent_store.json` |
| Padrón RUC SUNAT | Tabla `ruc_padron` + `padron_imports` | No disponible → fichas en Modo Demostración |
| Resultado de emisión electrónica | Columnas `emission*`, `sunatAccepted`, `pdfUrl`… en `invoices` | Campo `emission` en el JSON |

PostgreSQL se usa para comprobantes cuando hay `DATABASE_URL` **y** el usuario autenticado tiene RUC (la MYPE debe existir en `smes`, lo que ocurre al registrarse).

## 4. Padrón reducido del RUC (SUNAT)

SUNAT publica gratis el padrón reducido (más de 14 millones de RUC): <https://www.sunat.gob.pe/descargaPRR/mrc137_padron_reducido.html>.

```bash
npm run padron:import -- --download                        # descarga e importa (varios minutos)
npm run padron:import -- ./padron_reducido_ruc.zip         # ZIP ya descargado
npm run padron:import -- ./padron_reducido_ruc.txt --limit=50000 --only-active   # versión liviana para demos
```

- Cada importación **reemplaza** el contenido de `ruc_padron` y registra la fecha en `padron_imports`.
- Para el ZIP se usa `unzip` (Linux/macOS) o `tar` (Windows 10+). Si ninguno está disponible, descomprime el ZIP a mano y pasa el `.txt`.
- La consulta es `GET /api/v1/ruc/:ruc` (requiere sesión). La ficha muestra **"Fuente: Padrón reducido SUNAT (cargado el AAAA-MM-DD)"**. Teléfono, email, régimen y CIIU no vienen en el padrón y se muestran como "No disponible".
- Sin padrón cargado, la ficha se genera en **Modo Demostración**: nombre con sufijo "(DEMO)" e insignia ámbar.
- Recomendación: actualizar el padrón cada semana (SUNAT lo actualiza a diario).

## 5. Emisión electrónica con Nubefact (PSE)

1. Crear una cuenta en <https://www.nubefact.com/> (hay modo demo/pruebas).
2. En el panel de Nubefact: **API (Integración)** → copiar la **RUTA** y el **TOKEN**.
3. Ponerlos en `.env`:
   ```
   NUBEFACT_API_URL=<ruta de tu cuenta>
   NUBEFACT_API_TOKEN=<token de tu cuenta>
   ```
4. Reiniciar el servidor. En el Módulo Contable, cada venta tiene el botón **Emitir**.

Notas:
- El token vive **solo en el backend** (`server/services/nubefactClient.ts`); el navegador llama a `POST /api/v1/einvoice/emit`.
- La emisión es de **una línea gravada** con IGV 18 % (SAMI registra el total con IGV). Si se necesita detalle por producto, hay que ampliar el modelo de venta.
- Si una factura no trae razón social, se toma del padrón SUNAT; si no hay padrón, la pantalla la pide.
- **Pendiente de verificar** con el manual de Nubefact que recibas al crear la cuenta: los nombres de campos de respuesta (`aceptada_por_sunat`, `sunat_description`, `enlace_del_pdf`, `enlace_del_xml`, `enlace_del_cdr`). El código los lee de forma tolerante.
- Sin credenciales, la emisión responde **"Modo Demostración — comprobante NO enviado a SUNAT"** y así queda registrado.

## 6. Envío directo a SUNAT sin PSE (Lycet)

Alternativa gratuita a Nubefact: SAMI arma el comprobante, [Lycet](https://github.com/giansalex/lycet) (MIT, sobre Greenter) lo firma con el certificado de la MYPE y lo envía al web service de SUNAT. Probado: el Lycet real acepta y firma las facturas, boletas y notas de crédito que genera SAMI.

### Probar contra el entorno beta de SUNAT (gratis, sin homologación)

```bash
git clone https://github.com/giansalex/lycet && cd lycet
COMPOSER_ALLOW_SUPERUSER=1 composer install      # requiere PHP 8.x con soap, openssl, zip, dom
# Certificado de prueba (en beta SUNAT no valida la entidad emisora del certificado):
openssl req -x509 -newkey rsa:2048 -nodes -keyout k.pem -out c.pem -days 365 -subj "/CN=PRUEBAS" && cat k.pem c.pem > data/cert.pem
php -S 127.0.0.1:8000 -t public                   # o: docker build -t lycet . && docker run -p 8000:8000 -v $PWD/data:/var/www/html/data lycet
```

El `.env` de Lycet ya apunta a beta (`FE_URL=https://e-beta.sunat.gob.pe/...`, usuario `MODDATOS`, `CLIENT_TOKEN=123456`). En SAMI:

```
LYCET_API_URL=http://127.0.0.1:8000
LYCET_API_TOKEN=123456
LYCET_SUNAT_ENV=beta
```

Requisitos de datos en SAMI: la MYPE debe existir en `smes` y su RUC debe estar en el **padrón SUNAT cargado** (de ahí salen dirección y ubigeo del emisor). Si el RUC de la MYPE no es el del usuario de beta, registra la empresa en Lycet:

```bash
curl -X PUT "http://127.0.0.1:8000/api/v1/configuration/company/<RUC>?token=123456" \
  -H "Content-Type: application/json" \
  -d '{"SOL_USER":"<RUC>MODDATOS","SOL_PASS":"moddatos","certificate":"<cert.pem en base64>"}'
```

Qué guarda SAMI: resultado de SUNAT, hash de la firma, **XML firmado y CDR** (el emisor debe conservarlos). XML y CDR se quedan en el servidor; no se envían al navegador.

### Antes de producción (pendiente, no técnico)

- Afiliar a cada MYPE al **SEE – Del Contribuyente**. Según fuentes de la industria exige homologación por contribuyente: confirmarlo con SUNAT.
- Certificado por MYPE: SUNAT entrega el [Certificado Digital Tributario gratis a MYPE](https://cpe.sunat.gob.pe/certificado-digital-tributario) hasta el 31-12-2027.
- Custodia: SAMI guardaría el certificado y un usuario secundario SOL de cada MYPE (nunca la Clave SOL principal). Requiere cifrado, consentimiento explícito y revisión legal.

## 7. Tests

```bash
npm test                                   # unitarios + integración (sin base de datos)
TEST_DATABASE_URL=postgresql://... npm test  # además corre los tests contra PostgreSQL real
```

Los tests escriben sus archivos JSON en un directorio temporal y no modifican `data/`.
