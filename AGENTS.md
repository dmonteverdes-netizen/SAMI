# Project Guidelines & Rules (Reglas del Negocio y Ley Peruana)

## 1. Qué es y qué no es SAMI
- **Qué es:** SAMI es una plataforma B2B2C para MYPEs peruanas (bodegas y minimarkets) que ordena la información tributaria y de ventas de la MYPE, emite comprobantes electrónicos a través de un Proveedor de Servicios Electrónicos (PSE como Nubefact/Bizlinks) hacia SUNAT, y con consentimiento explícito del titular transmite ese expediente consolidado a entidades financieras aliadas (bancos, cajas, fintechs).
- **Qué NO es:** SAMI **NO** otorga créditos, **NO** procesa pagos, **NO** custodia fondos y **NO** realiza la evaluación final de riesgo. Es un facilitador tecnológico.
- **Flujo de Dinero y Cobranza:** Los pagos se cobran mediante QR interoperables (Yape, Plin, Niubiz, Culqi). El dinero nunca pasa por SAMI.

## 2. Prohibición Absoluta de "SAMI Score" y Calificaciones Tipo SBS
- **Prohibición Total:** Está terminantemente prohibido usar el término "SAMI Score" o "Score" en todo el proyecto: nombres de variables, tipos de TypeScript, componentes, endpoints de API, comentarios y textos de pantalla.
- **Nomenclatura Oficial:** Utilizar únicamente **"Salud Financiera"**, **"Salud Tributaria"** o **"Evaluación Tributaria"**, según el contexto.
- **Escalas Prohibidas:** No utilizar escalas tipo A+/A/B/C/D o rankings crediticios que imiten la clasificación oficial de deudores de la Superintendencia de Banca, Seguros y AFP (SBS).

## 3. Rotulado Obligatorio de Simulaciones y Demostraciones
- SAMI opera actualmente en fase de integración previa con SUNAT, RENIEC, SUNARP, centrales bancarias y pasarelas de pago.
- **Rotulado Inequívoco:** Toda simulación o dato generado en entorno de prueba debe estar explícitamente rotulado como "Simulado", "Entorno de Prueba", "Modo Demostración" o "Declarado por el usuario" tanto en el código como en la interfaz visible para el usuario.
- **Veracidad en la Interfaz:** Nunca presentar textos que afirmen que un dato fue "verificado por SUNAT", "certificado", "avalado" o "validado oficialmente" si la información fue ingresada o declarada por el propio usuario o proviene de un entorno simulado.

## 4. Idioma y Localización (es-PE)
- Todo el texto visible para el usuario final debe estar en **español de Perú (es-PE)**.
- Eliminar anglicismos innecesarios y verificar que no queden cadenas en inglés olvidadas. Moneda en Soles (S/).

## 5. Seguridad de Credenciales y Secretos
- Ningún secreto (claves de API, tokens privados, certificados digitales) debe vivir en el frontend ni en archivos descargados por el navegador. Todo consumo sensible se realiza en endpoints `/api/*` del backend.

## 6. Control de Acceso y Permisos en Backend
- La seguridad y autorización de roles (MYPE_ADMIN, EMPLOYEE, ACCOUNTANT, PARTNER_BANK) deben validarse en el servidor (`server.ts` y middlewares). Ocultar botones en React es meramente una conveniencia visual, no un control de acceso.

## 7. Accesibilidad y Rendimiento (WCAG 2.2 AA y Mobile 360px)
- Cumplimiento estricto con pautas WCAG 2.2 nivel AA (contraste de colores, etiquetas legibles, áreas de toque de al menos 44px).
- Diseño y fluidez optimizados para pantallas de **360 px de ancho** y dispositivos Android de gama de entrada (80% del tráfico MYPE).

## 8. Documentación de Pendientes y Contratos
- Cuando se deje una integración pendiente o simulada, incluir un comentario en español explicando qué funcionalidad falta y qué decisión de negocio o contrato comercial/legal (ej. convenio con PSE, contrato de interoperabilidad bancaria) es necesario para implementarla.

---

# Bloque 7 — Higiene: Convenciones de Código y Arquitectura

Para mantener la base de código ordenada, navegable y mantenible para el equipo y agentes de IA:

### 1. Registro Único de Módulos
- **Única Fuente de Verdad:** Un módulo nuevo se declara en `config/modules.ts` (o `core/config/modules.ts`) y en **ningún otro lugar**.
- **Regla de Oro:** Si alguien tiene que tocar `Sidebar.tsx` para agregar un módulo, el registro está mal hecho. `Sidebar.tsx` lee dinámicamente de `MODULES` y de las políticas de visibilidad por rol y fase (`phases.ts`).

### 2. Orden Uniforme de Importaciones
En cada archivo, las importaciones deben estructurarse estrictamente en este orden:
1. **Librerías externas:** `react`, `lucide-react`, `motion/react`, etc.
2. **Capa Core:** `core/types`, `core/services`, `core/config`, `core/context`, `core/hooks`.
3. **Capa Shared:** `shared/layout`, `shared/ui`, componentes compartidos.
4. **Módulo Local:** Componentes internos del propio módulo (`./LocalComponent`).
5. **Estilos o Assets:** Archivos CSS o assets estáticos.

### 3. Comentarios de Sección en Archivos > 200 Líneas
Todo archivo que supere las 200 líneas debe incluir delimitadores visuales de bloque estandarizados para facilitar la lectura y navegación rápida:
- `// ─── Tipos e Interfaces ───`
- `// ─── Constantes y Configuración ───`
- `// ─── Estado y Hooks ───`
- `// ─── Handlers y Lógica de Negocio ───`
- `// ─── Render / JSX ───`

### 4. Prohibición de `any` en Código Nuevo
- **Cero `any`:** Está prohibido el uso indiscriminado de `any`. Se deben definir interfaces y tipos explícitos en `types.ts` o en los tipos locales del módulo.
- **Excepción Justificada:** Si en un caso excepcional se requiere `any` (por ejemplo, interoperabilidad con payloads dinámicos de terceros en sandbox), debe incluir un comentario explicativo inmediato indicando la razón y la estructura esperada.

### 5. Rotulado Obligatorio de Datos Simulados
- **Nomenclatura Explícita:** Todo dato simulado o de prueba debe llevar un nombre de variable o constante claro con prefijo `DEMO_` o `SIMULADO_` (ej. `DEMO_SALES`, `SIMULADO_RUC_DATA`).
- **Comentario de Requisitos Reales:** Cada bloque de datos simulados debe contener un comentario en español explicando qué contrato, API o integración en producción (ej. API Nubefact, consulta RENIEC/SUNAT en vivo) es requerida para reemplazarlo por datos reales.

### 6. Umbral de Tamaño de Archivos (Máximo 400 Líneas)
- **Límite Estricto:** Ningún archivo nuevo debe pasar de 400 líneas sin una justificación técnica documentada en el encabezado del archivo.
- **Descomposición:** Si un componente o servicio se aproxima a las 400 líneas, debe modularizarse extrayendo subcomponentes a la carpeta del módulo, hooks personalizados o utilitarios independientes.


