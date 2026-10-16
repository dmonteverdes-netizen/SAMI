# Investigación: código open source y plataformas de referencia para SAMI

Fecha: 2026-10-15. Objetivo: decidir qué piezas de SAMI conviene **reutilizar** (open source con licencia compatible), cuáles **estudiar como benchmark** (productos cerrados) y cuáles **construir**.

## 0. Actualización (2026-10-16): contraste con la versión nueva (`sami-ai-fintech_35.zip`)

Las secciones 1–4 se escribieron sobre el código de `main` (versión antigua). La versión 35 cambia varias conclusiones:

| Recomendación previa | Versión 35 | Nuevo veredicto |
|---|---|---|
| Greenter + Lycet para emitir a SUNAT | Decisión: emitir vía PSE (Nubefact/Bizlinks), ver `AGENTS.md` §1 | **Mantener la decisión PSE.** El PSE firma, envía y devuelve PDF/XML/CDR sin certificado ni homologación propios. Lycet queda como plan B si el costo por comprobante del PSE no cierra |
| scorecardpy para "SAMI Score" | `AGENTS.md` §2 prohíbe "Score" y escalas tipo SBS; SAMI no evalúa riesgo | **Descartado.** Se calcula "Salud Tributaria" con reglas transparentes; el riesgo lo evalúa la entidad |
| medici (MongoDB) como libro contable | Prisma + PostgreSQL | **Descartado** (stack distinto) |
| Invoify para PDF de comprobante | El PDF oficial lo devuelve el PSE | **Solo para cotizaciones/proformas** |
| `UIT_VALUE = 5150` desactualizado | `UIT_2026_VALUE = 5500` + límite RMT 1,700 UIT | **Corregido** |
| Padrón reducido SUNAT para RUC | Sigue simulado | **Sigue vigente** (ver abajo) |

### Estado de los hallazgos (actualizado 2026-10-16)

Los 7 hallazgos de abajo se corrigieron en la rama `sami-codigo-a-octubre-2026-exploraciones-github` (ver `AUDIT_NOTES.md` §13 y `BACKEND_GUIDE.md`), salvo el punto 6 en lo referido a las carpetas de reexportación (`services/`, `config/`, etc.), que se mantienen por compatibilidad. Además se encontró y corrigió que **las migraciones Prisma no corrían en una base vacía**.

### Hallazgos nuevos en la versión 35

Verificado: `npm install --legacy-peer-deps` + `vitest run` = **132/132 tests OK**; `tsc --noEmit` = **0 errores**.

1. **`core/services/pseService.ts` → `fetchRucDetails` inventa empresas al azar** (nombre, dirección, régimen, teléfono, email) para cualquier RUC de 11 dígitos, con el comentario *"so they look incredibly professional & functional"*, y **sin** `isSimulated`. Contradice `AGENTS.md` §3 y lo que `AUDIT_NOTES.md` §11 declara como ya resuelto.
2. **`submitInvoiceToPse` (mock) devuelve `sunat_message: 'La Factura ha sido aceptada'`** con `sunat_code: '0'` sin rótulo de simulación. Mismo incumplimiento de `AGENTS.md` §3.
3. **`package-lock.json` roto:** `npm ci` falla (`Cannot read properties of null (reading 'edgesOut')`). Solo instala con `npm install --legacy-peer-deps` sin lockfile. Cualquier CI o despliegue que use `npm ci` fallará. Regenerar el lockfile.
4. **Persistencia partida en tres:** Prisma/PostgreSQL (`prisma/schema.prisma`, usado en auth/bank/consent), JSON en disco (`server/services/businessStore.ts`, `data/*.json`) y `localStorage` (ventas, compras, tareas según `AUDIT_NOTES.md` §12). Para la demo de tesis, unificar ventas/compras en el modelo `Invoice` de Prisma.
5. **Backend indeciso en la documentación:** `FIREBASE_BACKEND_GUIDE.md` recomienda Firebase/Supabase, pero el código no usa Firebase (usa Express + JWT + Prisma). Elegir uno y borrar la otra guía.
6. **Basura en el proyecto:** `sami-applet-complete.zip` (2 MB) dentro del repo y **corrupto**; carpetas raíz `services/`, `config/`, `context/`, `hooks/`, `types.ts` son reexportaciones de una línea hacia `core/` (deuda de migración, 10 módulos aún importan la ruta antigua). Ya no hay `Dockerfile`.
7. Marketplace (`server/routes/credit.ts`): ofertas y factoring generados con socios mock y fórmulas fijas; correcto para demo, pero la UI debe rotularlo como simulado.

## 1. Mapa: módulo de SAMI → qué reutilizar

| Módulo SAMI (archivo actual) | Estado hoy | Recomendación | Repo / fuente | Licencia | Veredicto |
|---|---|---|---|---|---|
| Facturación SUNAT (`services/pseService.ts`, `accountingService.ts`) | Simulado | Levantar **Lycet** (API REST sobre Greenter) como microservicio Docker y llamarlo desde `server.ts` | [thegreenter/greenter](https://github.com/thegreenter/greenter), [giansalex/lycet](https://github.com/giansalex/lycet) | MIT | **Usar**. No existe equivalente serio en Node/TS; no reescribir firma XML-DSig/UBL 2.1 |
| Contabilidad (doble partida, reportes) | Cálculo de IGV/RMT básico | Estudiar el modelo de datos (plan de cuentas, asientos, reportes) y reimplementar en TS | [bigcapitalhq/bigcapital](https://github.com/bigcapitalhq/bigcapital) (Node/TS) | AGPL-3.0 | **Solo como referencia**. Copiar código obliga a liberar SAMI bajo AGPL si se ofrece como servicio web |
| Contabilidad (alternativa) | — | Ídem | [akaunting/akaunting](https://github.com/akaunting/akaunting) (Laravel/Vue) | BSL | **No copiar**. BSL no es open source: restringe uso comercial en producción |
| Contabilidad offline / POS | — | Referencia de UX simple para no-contadores | [frappe/books](https://github.com/frappe/books) (Vue/Electron/TS) | AGPL-3.0 | Archivado (oct-2026). Solo referencia |
| Facturas/cotizaciones UI | — | Referencia de UX | [InvoiceShelf](https://github.com/InvoiceShelf/InvoiceShelf), [Invoice Ninja](https://github.com/invoiceninja/invoiceninja) | AGPL-3.0 / AAL | Referencia |
| SAMI Score (`creditService.ts`, `riskService.ts`) | Reglas heurísticas | Construir scorecard con binning WoE/IV | [optbinning](https://github.com/guillermo-navas-palencia/optbinning), [scorecardpy](https://github.com/ShichenXie/scorecardpy) | Apache-2.0 / MIT | **Usar** (servicio Python aparte) cuando haya datos reales |
| Marketplace de créditos (`CreditMarketplace.tsx`) | Mock de 3 entidades | Construir (es lógica de matching + consentimiento, no core bancario) | — | — | **Construir**. No hay un repo reutilizable que valga la pena |
| Core de préstamos (desembolso, cronograma, cobranza) | — | Solo si SAMI llegara a prestar con capital propio | [apache/fineract](https://github.com/apache/fineract) (Java) | Apache-2.0 | **No ahora**. Es sobredimensionado para un marketplace que solo deriva |
| Validación RUC (`server.ts` `/api/v1/auth/validate-ruc`) | Módulo 11 + datos inventados | Cargar el **Padrón Reducido de SUNAT** (descarga pública gratuita) en BD local | [SUNAT padrón reducido](https://www.sunat.gob.pe/descargaPRR/mrc137_padron_reducido.html) | Dato público | **Usar** |

## 1b. Solo licencia MIT (copiable sin obligaciones salvo mantener el aviso de copyright)

| Módulo SAMI | Repo MIT | Stack | Estado | Cómo usarlo |
|---|---|---|---|---|
| Facturación SUNAT | [thegreenter/greenter](https://github.com/thegreenter/greenter) + [giansalex/lycet](https://github.com/giansalex/lycet) | PHP, Docker | Activo | Microservicio REST llamado desde `server.ts` |
| Comprobante PDF / UI de factura | [al1abb/invoify](https://github.com/al1abb/invoify) (6.4k ★) | Next.js, TS, Tailwind, shadcn | Activo | Copiar plantillas, formulario (react-hook-form + zod) y PDF a `QuickSaleModal.tsx` |
| Libro contable doble partida | [flash-oss/medici](https://github.com/flash-oss/medici) | Node, TS, MongoDB | Activo | Motor de asientos (requiere MongoDB) o como referencia para portarlo a Postgres |
| Consulta RUC/DNI | [giansalex/peru-consult](https://github.com/giansalex/peru-consult) | PHP | Archivado (ago-2025) | Solo referencia; usar padrón reducido SUNAT |
| Scorecard de crédito | [ShichenXie/scorecardpy](https://github.com/ShichenXie/scorecardpy) | Python | — | Servicio de scoring cuando haya datos |
| Marketplace de créditos | Ninguno MIT útil (revisado [topic p2p-lending](https://github.com/topics/p2p-lending): blockchain, prototipos sin licencia) | — | — | Construir |

Regla: un repo sin archivo LICENSE **no es libre de copiar** (todos los derechos reservados por defecto).

## 2. Benchmark de productos (estudiar, no clonar)

| Producto | Qué estudiar | Link |
|---|---|---|
| SUNAT SEE-SOL / Facturador SFS | El "competidor gratis" real de cualquier facturador MYPE | [cpe.sunat.gob.pe](https://cpe.sunat.gob.pe/sistema_emision/facturador_sunat) |
| Alegra (Perú) | Onboarding contable para no-contadores, freemium | [alegra.com/peru](https://www.alegra.com/peru/) |
| Lendio (EE.UU.) | Un formulario → múltiples prestamistas; preguntas de calificación previas al match | [lendio.com](https://www.lendio.com/) |
| Konfío (México) | Crédito PYME usando facturas electrónicas del SAT como dato de scoring (análogo directo a SAMI) | [konfio.mx](https://konfio.mx/) |
| Prestamype (Perú) | Préstamos con garantía + factoring, regulación SBS | [prestamype.com](https://www.prestamype.com/) |
| Comparabien (Perú) | Comparador de productos financieros, modelo de lead-gen | [comparabien.com.pe](https://comparabien.com.pe/) |

Método permitido: *teardown* de UX (flujos públicos, capturas, textos, APIs documentadas). No permitido: descompilar apps, extraer código o APIs privadas (derechos de autor, D.Leg. 822, y términos de uso).

## 3. Arquitectura propuesta

```
React (Vite)  ──>  server.ts (Express)
                     ├── Lycet (Docker, PHP)        → SUNAT beta/producción
                     ├── scoring-svc (Python, optbinning) → SAMI Score
                     ├── Postgres (padrón RUC, comprobantes, consentimientos)
                     └── Gemini (chat)
```

## 4. Hallazgos en el código actual

- `services/accountingService.ts`: `UIT_VALUE = 5150` es la UIT 2024. Debe ser configurable por año (verificar UIT vigente 2026 en el MEF/SUNAT).
- `server.ts` validación RUC: devuelve razón social inventada; en una demo de tesis esto se nota. Reemplazar por padrón reducido.
- Marketplace: las entidades y ofertas son mock; para la tesis basta con documentar el contrato de API con entidades (ya existe `API_DOCS.md`) y simular, pero dejarlo explícito.
