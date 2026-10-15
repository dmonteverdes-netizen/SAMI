# Investigación: código open source y plataformas de referencia para SAMI

Fecha: 2026-10-15. Objetivo: decidir qué piezas de SAMI conviene **reutilizar** (open source con licencia compatible), cuáles **estudiar como benchmark** (productos cerrados) y cuáles **construir**.

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
