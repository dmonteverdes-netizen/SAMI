
# Plan de Compliance Regulatorio para SAMI

**Ámbito:** Regulación Digital y Fintech en Perú.
**Especialista a Cargo:** [Nombre del Abogado/Firma Legal]
**Fecha de Emisión:** [Fecha Actual]

Este documento establece las bases del plan de cumplimiento normativo para la plataforma SAMI, en conformidad con la legislación peruana vigente, principalmente la Ley N° 29733 (Ley de Protección de Datos Personales) y las normativas emitidas por la Superintendencia de Banca, Seguros y AFP (SBS) aplicables a proveedores de servicios tecnológicos para el sistema financiero.

---

## 1. Protección de Datos Personales (Ley N° 29733)

La confianza del usuario es nuestro activo más importante. El tratamiento de sus datos personales se regirá por los principios de legalidad, consentimiento, finalidad, proporcionalidad, calidad, seguridad, y nivel de protección adecuado.

### 1.1. Puntos Clave para Términos y Condiciones y Política de Privacidad

La aceptación de los siguientes puntos será un prerrequisito indispensable para el uso de la plataforma SAMI. El consentimiento debe ser **libre, previo, expreso, informado e inequívoco**.

#### a. Consentimiento para Tratamiento de Datos Contables y Financieros:
El usuario debe consentir explícitamente que SAMI recopilará, almacenará, organizará y utilizará la información de sus comprobantes de venta y compra, así como otros datos financieros que registre en la plataforma.

#### b. Finalidad del Tratamiento:
Se debe detallar de forma clara y sencilla para qué se usarán los datos:
-   Para procesar y calcular resúmenes tributarios preliminares.
-   Para analizar su historial de ventas y salud financiera con el fin de calcular su **"Salud Tributaria"**.
-   Para generar recomendaciones personalizadas de cursos en la "Academia SAMI".
-   **Finalidad Crediticia:** Para utilizar la "Salud Tributaria" y los datos financieros subyacentes con el objetivo de presentarle al usuario ofertas de crédito no vinculantes de nuestras entidades financieras aliadas.

#### c. Transferencia de Datos a Terceros (Marketplace de Créditos):
Se requiere un consentimiento explícito para la **transferencia y flujo transfronterizo (si aplica)** de sus datos personales y financieros (incluyendo la Salud Tributaria y resúmenes de ventas) a las entidades financieras listadas en nuestro Marketplace. Se debe proveer una lista actualizada de dichos socios y el usuario debe aceptar esta transferencia para poder acceder a las ofertas.

#### d. Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición):
Se informará al usuario sobre sus derechos ARCO y se establecerá un procedimiento claro y accesible (ej. un correo electrónico dedicado `privacidad@sami.pe` y una sección en su perfil) para que pueda ejercerlos en cualquier momento.

#### e. Plazo de Conservación:
Los datos personales serán conservados mientras el usuario mantenga una cuenta activa en SAMI y por un plazo adicional de 10 años por obligaciones legales (normativa tributaria y de la SBS), salvo que el usuario solicite su cancelación y no exista impedimento legal para ello.

#### f. Seguridad de la Información:
Se hará referencia a las medidas de seguridad técnicas y organizativas implementadas (ver `SECURITY.md`), como el cifrado AES-256 para datos en reposo y TLS 1.3 para datos en tránsito, para garantizar la confidencialidad e integridad de su información.

---

## 2. Flujo de "Conoce a tu Cliente" (KYC) y Prevención de Lavado de Activos (SPLAFT)

Para proteger la integridad del ecosistema financiero y cumplir con las normativas de prevención de lavado de activos y financiamiento del terrorismo, se implementará el siguiente flujo de validación de identidad.

### Nivel 1: Registro en la Plataforma
-   **Documentos/Datos Requeridos:**
    -   Número de RUC (Registro Único de Contribuyente).
    -   Número de DNI del Representante Legal.
-   **Proceso de Validación (Automatizado):**
    -   Consulta vía API a los padrones públicos de SUNAT para validar la existencia, estado ("Activo") y condición ("Habido") del RUC.
    -   Consulta vía API a los servicios de RENIEC para validar la identidad del Representante Legal asociado al RUC.

### Nivel 2: Solicitud de Acceso al Marketplace de Créditos
Este nivel se activa cuando el usuario manifiesta su interés en ser pre-evaluado para un crédito.
-   **Documentos/Datos Adicionales Requeridos:**
    1.  **Vigencia de Poder del Representante Legal:** Carga de la copia literal o consulta en línea al registro de SUNARP para confirmar que la persona que opera la cuenta tiene las facultades legales para solicitar financiamiento en nombre de la empresa.
    2.  **Declaración Jurada de Origen de Fondos y No Participación en Actividades Ilícitas:** Un checkbox obligatorio en el flujo digital con valor de declaración jurada.
    3.  **Verificación de Domicilio Fiscal:** Carga de un recibo de servicio (luz, agua) no mayor a 3 meses.
-   **Proceso de Validación (Automatizado/Manual):**
    -   Cruces contra listas de personas expuestas políticamente (PEP) y listas de sancionados internacionales (OFAC, ONU).
    -   Monitoreo transaccional de la actividad contable en SAMI para detectar patrones inusuales que puedan requerir una debida diligencia ampliada.

---

## 3. Checklist de Cumplimiento para la Superintendencia de Banca y Seguros (SBS)

Como Proveedor de Servicios Tecnológicos (PST) crítico para entidades financieras supervisadas, SAMI debe cumplir con los siguientes requisitos mínimos:

| N° | Requisito                                     | Cumplimiento (Check) | Observaciones y Referencias                                                              |
|----|-----------------------------------------------|:--------------------:|------------------------------------------------------------------------------------------|
| 1  | **Gestión de Seguridad de la Información**      |           ✅          | Implementar un SGSI basado en ISO 27001. Referirse al `SECURITY.md` para detalles técnicos. |
| 2  | **Continuidad del Negocio y Recuperación**      |           ✅          | Mantener un Plan de Continuidad del Negocio (BCP) y un Plan de Recuperación de Desastres (DRP) actualizados y probados anualmente. |
| 3  | **Cifrado de Datos Sensibles**                  |           ✅          | Asegurar el cifrado de datos en tránsito (TLS 1.3+) y en reposo (AES-256). Ver `SECURITY.md`. |
| 4  | **Gestión de Incidentes de Ciberseguridad**     |           ✅          | Establecer un protocolo para la detección, respuesta y notificación de incidentes a las entidades financieras aliadas en un plazo máximo de 24 horas. |
| 5  | **Auditorías de Seguridad Periódicas**          |           ✅          | Contratar anualmente a terceros independientes para realizar auditorías de seguridad, incluyendo pruebas de penetración (pentesting) y análisis de vulnerabilidades. |
| 6  | **Acuerdos de Nivel de Servicio (SLA)**         |           ✅          | Definir y cumplir con SLAs claros con las entidades financieras, especificando disponibilidad, tiempo de respuesta y penalidades. |
| 7  | **Cláusulas de Confidencialidad**               |           ✅          | Todos los contratos con personal y entidades aliadas deben incluir cláusulas robustas de confidencialidad y no divulgación de información. |
| 8  | **Transparencia en Subcontratación**            |           ✅          | Notificar a las entidades financieras sobre cualquier subcontratación de servicios críticos (ej. proveedores de cloud como AWS, Azure) y asegurar que estos cumplen con las normativas. |
| 9  | **Acceso para el Regulador (SBS)**              |           ✅          | Garantizar contractualmente que SAMI permitirá el acceso de la SBS a su infraestructura y registros en el marco de una supervisión a una de las entidades financieras aliadas. |
| 10 | **Segregación de Datos**                        |           ✅          | Implementar una arquitectura de base de datos que garantice la segregación lógica y/o física de los datos de cada MYPE y de cada entidad financiera. |
| 11 | **Gestión de Cambios Robusta**                  |           ✅          | Mantener un proceso formal de gestión de cambios para el software y la infraestructura, con pruebas exhaustivas antes del despliegue en producción. |
| 12 | **Residencia de Datos (si aplica)**             |           ✅          | Cumplir con cualquier normativa específica de la SBS sobre la localización geográfica de los datos financieros. |
