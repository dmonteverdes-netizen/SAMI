
import type { Course, Invoice, UserProgress } from '../types/types';
import { calculateTaxHealth } from './creditService';

// --- Database Schema (Mocked) ---

const allCourses: Course[] = [
  {
    id: 'C05',
    title: 'De Cero a Bancarizado: Tu Pasaporte al Crédito',
    description: 'Domina las reglas del juego tributario y crediticio en Perú. Este curso es tu ruta directa para formalizarte, acceder a crédito barato y proteger tu negocio.',
    badgeUrl: 'https://placehold.co/128x128/4B0082/ffffff?text=Pro',
    category: 'finance',
    recommendationReason: 'Es la base fundamental para cualquier MYPE que busca financiamiento serio en 2025.',
    lessons: [
      {
        id: 'L0501', title: 'Lección 1: ¿Por Qué Dejar de Ser Invisible?', type: 'text',
        content: `### La Verdad Desnuda: La SUNAT ya te ve.\n\nDeja de pensar que "muevo solo efectivo". Si usas Yape, Plin, tienes un POS o le compras a proveedores formales, ya estás en el radar de la SUNAT. La fiscalización de 2025 es algorítmica y automática.\n\nCreer que la informalidad es un "ahorro" es el error financiero más caro. Te cierra las puertas a créditos con tasas de 10-20% (como los de Impulso MYPERU) y te deja vulnerable a préstamos "gota a gota" del 200% o más. Peor aún, una multa de SUNAT puede destruir toda la ganancia de un año.\n\nEl nuevo sistema SIRE (Sistema Integrado de Registros Electrónicos) lo cambió todo. Ya no "declaras" lo que vendes; ahora **auditas y validas la propuesta que SUNAT te presenta**. Ignorarla es aceptarla. La formalización no es un costo, es tu blindaje.`,
        quiz: [
          { question: 'En el entorno 2025, ¿cuál es el rol principal del empresario frente al SIRE de SUNAT?', options: ['Digitar sus ventas y compras desde cero.', 'Auditar y validar la propuesta que SUNAT genera automáticamente.', 'Ignorar el sistema si solo usa efectivo.'], correctAnswerIndex: 1, explanation: 'Con el SIRE, SUNAT pre-construye los registros. Tu trabajo es revisar (auditar) que esa información sea correcta.' },
          { question: 'Según el curso, ¿cuál es el mayor riesgo financiero de la informalidad?', options: ['Pagar una pequeña multa de vez en cuando.', 'Tener que contratar a un contador.', 'Cerrarte el acceso a crédito barato y exponerte a multas destructivas.'], correctAnswerIndex: 2, explanation: 'La informalidad te excluye del sistema financiero formal (crédito barato) y te expone a multas que pueden superar tu ganancia anual.' },
          { question: '¿Qué significa "ignorar la propuesta del SIRE"?', options: ['Que SUNAT olvidará tu caso.', 'Que aceptas tácitamente lo que SUNAT dice que vendiste y compraste.', 'Que tienes 30 días más para responder.'], correctAnswerIndex: 1, explanation: 'El sistema está diseñado para que la falta de acción sea una aceptación, lo cual es un gran peligro si la propuesta tiene errores.' }
        ]
      },
      {
        id: 'L0502', title: 'Lección 2: Tu DNI Tributario (Eligiendo Régimen)', type: 'text',
        content: `### Matriz de Decisión: ¿En qué liga juegas?\n\nElegir el régimen tributario correcto es como elegir la categoría de peso en el boxeo. Pelear en la categoría equivocada es una derrota segura. Aquí tus opciones realistas para 2025:\n\n1.  **NRUS (Nuevo RUS):** Para subsistencia. Vendes **menos de S/ 8,000 al mes**. Pagas S/ 20 o S/ 50 y te olvidas. No puedes emitir facturas. Es el salvavidas, no el motor de crecimiento.\n2.  **RER (Régimen Especial de Renta):** Para comercio estándar. Vendes **hasta S/ 525,000 al año**. Pagas 1.5% de tus ventas mensuales. Es simple, pero pagas incluso si no tienes ganancias. Obligatorio usar SIRE.\n3.  **RMT (Régimen MYPE Tributario):** Para crecimiento y márgenes bajos. La clave aquí es que **pagas impuesto sobre la GANANCIA (Utilidad)**, no sobre la venta. Si tienes muchos gastos (alquiler, planilla, mercadería), este es tu régimen. Te permite deducir gastos y pagar lo justo. Es el régimen del verdadero empresario.`,
        quiz: [
          { question: 'Un negocio con muchos gastos (alquiler, personal) y ventas de S/ 20,000 al mes, ¿qué régimen le conviene más?', options: ['NRUS, porque el pago es bajo.', 'RER, porque la tasa es fija sobre las ventas.', 'RMT, porque puede deducir sus gastos y pagar impuesto solo sobre la utilidad.'], correctAnswerIndex: 2, explanation: 'El RMT es ideal para negocios con costos altos, ya que permite descontarlos (deducirlos) antes de calcular el impuesto.' },
          { question: '¿Cuál es la PRINCIPAL limitación del NRUS?', options: ['El pago mensual es muy alto.', 'No permite emitir facturas, limitando tus clientes a personas naturales.', 'Te obliga a llevar muchos libros contables.'], correctAnswerIndex: 1, explanation: 'La incapacidad de emitir facturas es la barrera más grande del NRUS para el crecimiento, ya que te impide vender a otras empresas.' },
          { question: 'Si estás en el RER y un mes vendes mucho pero no tienes ganancias (por costos altos), ¿pagas Impuesto a la Renta?', options: ['No, porque no hubo ganancia.', 'Sí, el 1.5% de las ventas totales.', 'Depende de lo que diga el contador.'], correctAnswerIndex: 1, explanation: 'El RER no considera la utilidad. El impuesto es un porcentaje fijo de las ventas, lo cual es una desventaja en meses de baja rentabilidad.' }
        ]
      },
      {
        id: 'L0503', title: 'Lección 3: El Precio Real del Dinero (TEA vs. TCEA)', type: 'text',
        content: `### La Trampa de la Tasa de Interés.\n\nEl banco no es tu amigo, es un proveedor de un insumo llamado "dinero". Si no sabes leer la etiqueta del precio, te venderán el producto más caro. La etiqueta tiene dos precios:\n\n*   **TEA (Tasa Efectiva Anual):** Es el marketing. Es solo el interés. Una TEA de 15% suena increíble.\n*   **TCEA (Tasa de Costo Efectivo Anual):** Es la VERDAD. Es la TEA + comisiones + portes + **seguro de desgravamen**. Ese seguro es el costo oculto que dispara el precio.\n\n**Realidad brutal:** Un crédito de consumo con 19% TEA puede terminar siendo **105% TCEA**. Estás pagando el doble de lo que pediste. **NUNCA aceptes un crédito sin ver la TCEA en la Hoja Resumen.** Exígela siempre. Un préstamo con una TEA más alta pero TCEA más baja es MÁS BARATO.`,
        quiz: [
          { question: 'Al comparar dos préstamos, ¿en qué indicador DEBES fijarte para saber cuál es realmente más barato?', options: ['En la TEA, porque es el interés principal.', 'En la TCEA, porque incluye todos los costos y seguros.', 'En el número de cuotas.'], correctAnswerIndex: 1, explanation: 'La TCEA es el costo total y real del crédito. Es el único indicador válido para comparar préstamos.' },
          { question: '¿Qué es el Seguro de Desgravamen?', options: ['Un seguro opcional para el local del negocio.', 'Un costo obligatorio en los créditos que paga la deuda si el titular fallece.', 'Un descuento por pago puntual.'], correctAnswerIndex: 1, explanation: 'El Seguro de Desgravamen es un componente clave y obligatorio de la TCEA que muchos ignoran, pero que incrementa significativamente el costo del crédito.' },
          { question: 'Un Préstamo A tiene 25% TEA y 40% TCEA. El Préstamo B tiene 30% TEA y 38% TCEA. ¿Cuál eliges?', options: ['Préstamo A, porque su TEA es menor.', 'Préstamo B, porque su TCEA es menor.', 'Ninguno, ambos son caros.'], correctAnswerIndex: 1, explanation: 'Aunque la TEA del Préstamo B es mayor, su costo final (TCEA) es más bajo, haciéndolo la opción más económica.' }
        ]
      },
       {
        id: 'L0504', title: 'Lección 4: Tu Nota en el Sistema (Infocorp/Sentinel)', type: 'text',
        content: `### Tu Reporte de Crédito es tu CV Financiero.\n\nInfocorp, Equifax o Sentinel no son una "lista negra". Son centrales de riesgo que simplemente reportan tu comportamiento de pago. Tener un buen reporte es tu activo más valioso para conseguir crédito barato. No tener historial es casi tan malo como tener uno malo.\n\n**Estrategias para construir tu "Score":**\n\n1.  **Microcréditos Estratégicos:** Saca un microcrédito digital (ej. Yape de S/ 200) y págalo **puntual**. Repite. Esto crea un historial de pago positivo y rápido.\n2.  **Deuda Inteligente:** No es necesario no tener deudas. Es necesario pagarlas a tiempo. Una tarjeta de crédito con pago puntual cada mes construye un excelente score.\n3.  **Saneamiento:** ¿Tienes deudas pasadas? Descarga tu reporte de la SBS (es gratis). Si tienes deudas caras (TCEA > 50%), acércate a una entidad financiera y pide una "compra de deuda" usando las garantías de **Impulso MYPERU**. Puedes bajar tu tasa drásticamente.`,
        quiz: [
          { question: '¿Cuál es la forma más rápida de empezar a construir un historial crediticio positivo si no tienes ninguno?', options: ['Pedir un préstamo grande para demostrar capacidad.', 'No pedir ningún crédito para no tener deudas.', 'Usar y pagar puntualmente microcréditos digitales.'], correctAnswerIndex: 2, explanation: 'Los microcréditos son una herramienta excelente para crear un registro de comportamiento de pago confiable de manera rápida y con bajo riesgo.' },
          { question: '¿Qué significa "estar en Infocorp"?', options: ['Que estás en una lista negra y no puedes recibir crédito.', 'Que tu comportamiento de pago (bueno o malo) está siendo reportado.', 'Que tienes una deuda castigada.'], correctAnswerIndex: 1, explanation: 'Todos los que interactúan con el sistema financiero están en Infocorp. La clave no es estar o no, sino tener una buena calificación dentro del reporte.' },
          { question: 'Si tienes una deuda en una tarjeta de crédito con una TCEA de 90%, ¿cuál es la acción más inteligente?', options: ['Dejar de pagarla para que prescriba.', 'Buscar otra entidad que te compre la deuda a una TCEA mucho menor.', 'Pagar solo el monto mínimo cada mes.'], correctAnswerIndex: 1, explanation: 'La compra de deuda es una estrategia financiera poderosa para reducir la carga de intereses de deudas caras y ordenar tus finanzas.' }
        ]
      },
       {
        id: 'L0505', title: 'Lección 5: El Crédito como Herramienta (No como Rescate)', type: 'text',
        content: `### Deuda Buena vs. Deuda Mala.\n\nEl sobreendeudamiento destruye más negocios que la competencia. Debes entender para qué sirve el dinero del banco:\n\n*   **Deuda Buena (Inversión):** Pides dinero para comprar un activo que **generará más dinero** que la cuota del préstamo. Ejemplo: comprar una máquina que aumenta tu producción y cuyas ganancias pagan el crédito y dejan utilidad. El crédito de capital de trabajo es deuda buena SI Y SOLO SI tienes un plan claro de retorno.\n*   **Deuda Mala (Gasto/Supervivencia):** Pides dinero para cubrir huecos de caja, pagar sueldos o comprar mercadería que no tienes la seguridad de vender. **NUNCA uses un crédito para pagar otro crédito de las mismas características.** Eso es una espiral de muerte financiera.\n\n**Herramienta Clave:** El programa **Impulso MYPERU** te da una garantía del Estado de hasta el 98%. Esto obliga a los bancos a darte tasas mucho más bajas. Si eres formal (RER o RMT), este programa es tu mejor aliado. Pregunta por él.`,
        quiz: [
          { question: '¿Cuál es la definición de "Deuda Buena"?', options: ['Cualquier préstamo de un banco conocido.', 'Un préstamo para pagar deudas personales.', 'Un préstamo para adquirir un activo que genera ingresos superiores a la cuota.'], correctAnswerIndex: 2, explanation: 'La deuda buena se paga sola con los rendimientos del activo que financió, y además genera una ganancia.' },
          { question: '¿Por qué NUNCA deberías usar tu tarjeta de crédito personal para financiar tu negocio?', options: ['Porque los intereses (TCEA) son extremadamente altos y destruyen el valor.', 'Porque es ilegal según la SUNAT.', 'Porque el banco te puede anular la línea de crédito.'], correctAnswerIndex: 0, explanation: 'Las tarjetas de consumo tienen las TCEA más altas del mercado, diseñadas para gasto, no para inversión. Usarlas en el negocio es un error financiero grave.' },
          { question: '¿Cuál es el principal beneficio del programa "Impulso MYPERU"?', options: ['Te regala dinero para empezar tu negocio.', 'El Estado actúa como tu garante, reduciendo el riesgo para el banco y bajando tu tasa de interés (TCEA).', 'Cancela tus deudas antiguas con otros bancos.'], correctAnswerIndex: 1, explanation: 'El aval del Estado es la pieza clave que reduce drásticamente el costo del crédito (TCEA) para las MYPEs formales.' }
        ]
      },
    ]
  },
  {
    id: 'C01',
    title: 'Gestión de Tesorería para MYPES',
    description: 'Aprende a manejar tu flujo de caja, optimizar pagos y asegurar la liquidez de tu negocio según estudios de CENTRUM Católica.',
    badgeUrl: 'https://placehold.co/128x128/007bff/ffffff?text=Caja',
    category: 'finance',
    lessons: [
      { 
        id: 'L0101', 
        title: 'Lección 1: Introducción al Flujo de Caja', 
        type: 'text', 
        content: `### El Flujo de Caja No Miente.\n\nSegún investigaciones de CENTRUM Católica y ESAN, el **82% de las MYPEs en el Perú fracasan** no por falta de rentabilidad o buenas ventas, sino por un colapso en su **sincronización de caja**. Vender no es lo mismo que cobrar.\n\nDebes clasificar tus movimientos de caja en tres flujos clave:\n1. **Flujo Operativo:** Ingresos de clientes del día y pagos regulares a proveedores (el motor principal).\n2. **Flujo de Inversión:** Dinero destinado a activos fijos (maquinarias, locales, laptops).\n3. **Flujo de Financiamiento:** Desembolsos de créditos, factoring, o aportes de capital.\n\nPara blindar tu negocio, debes proyectar un saldo mínimo de caja para emergencias de al menos **30 días de tus costos de operación fijos** (planilla, alquiler, luz). El efectivo es el rey.`,
        quiz: [
          { question: 'Según el curso, ¿cuál es la razón por la que quiebran el 82% de las pymes en el mercado peruano?', options: ['Baja calidad de sus productos comerciales.', 'Mala gestión de sincronización y liquidez de flujo de caja.', 'Saturación publicitaria de la competencia.'], correctAnswerIndex: 1, explanation: 'La falta de sincronización (vender al crédito a 90 días pero pagar al proveedor al contado) agota el efectivo y produce quiebra técnica.' },
          { question: '¿Qué tipo de movimiento se cataloga dentro del Flujo Operativo de un negocio?', options: ['La compra de un camión de reparto.', 'El cobro inmediato de una venta de repuestos.', 'Un préstamo del banco Interbank.'], correctAnswerIndex: 1, explanation: 'Los cobros directos de mercadería o servicios regulares son parte del Flujo Operativo.' }
        ] 
      },
      { 
        id: 'L0102', 
        title: 'Lección 2: Creando tu Presupuesto y Costos Fijos', 
        type: 'text', 
        content: `### La Regla del Punto de Equilibrio.\n\nPara poder operar con tranquilidad, debes conocer tu **Punto de Equilibrio (PE)** mensual. Es el nivel de ventas exacto en el cual tus ingresos igualan a tus costos fijos y variables totales; es decir, donde la utilidad es cero.\n\n**Fórmula Simplificada:** \nPE = Costos Fijos ÷ Margen de Contribución.\n\nSi tus costos fijos (personal en planilla, local comercial, seguros, licencias) suman S/ 5,000 mensuales, y tu ganancia neta promedio es del 40% de cada sol vendido, debes vender como mínimo S/ 12,500 para no perder dinero. Todo sol adicional a esa meta es ganancia pura.`,
        quiz: [
          { question: 'Si tus costos fijos son S/ 4,000 al mes y tu margen de contribución es 50%, ¿cuánto debes vender al mes para alcanzar tu Punto de Equilibrio?', options: ['S/ 4,000', 'S/ 8,000', 'S/ 12,000'], correctAnswerIndex: 1, explanation: 'PE = S/ 4,000 / 0.50 = S/ 8,000. Ese es el mínimo de ventas que debes asegurar.' }
        ] 
      },
      { 
        id: 'L0103', 
        title: 'Lección 3: Control de Cobranzas y el Motor del Factoring', 
        type: 'text', 
        content: `### DSO (Days Sales Outstanding) y Liquidez Mediante Factoring SBS.\n\nEl DSO mide cuántos días demoras en promedio para cobrar tus facturas. En Perú, las grandes corporaciones exigen a las pymes plazos de pago de **60, 90 o incluso 120 días**.\n\nEsto asfixia tu capital de trabajo. Aquí es donde entra la **Ley N° 29608 (Ley que fomenta el financiamiento a través de la Factura Negociable)**. Al registrar tu factura electrónica en SAMI, un banco o fondo aliado adquiere los derechos de cobro y te adelanta hasta el **95% de su valor neto** en menos de 2 horas.\n\n**Beneficio principal:** No es un préstamo comercial ordinario; la deuda no entra en tu reporte SBS como un pasivo financiero, protegiendo tu capacidad de apalancamiento.`,
        quiz: [
          { question: 'Bajo la ley de Factura Negociable en Perú, ¿cuál es un beneficio principal de la operación de factoring para una MYPE?', options: ['Se cancela el RUC del proveedor.', 'El banco asume el cobro y te otorga liquidez inmediata sin registrar deuda financiera tradicional en la central de riesgos.', 'No se pagan comisiones ni tasas de descuento.'], correctAnswerIndex: 1, explanation: 'El factoring convierte una factura a plazo en liquidez inmediata y no figura como deudas tradicionales si es sin recurso.' }
        ] 
      }
    ],
    recommendationReason: 'Detectamos que mejorar la gestión de tu liquidez podría ser muy beneficioso ahora mismo.'
  },
  {
    id: 'C03',
    title: 'Formalización y Beneficios Tributarios',
    description: 'Entiende las ventajas de ser formal bajo la Ley 30056, cómo emitir comprobantes y beneficiarte de los Regímenes MYPE de la SUNAT.',
    badgeUrl: 'https://placehold.co/128x128/ffc107/000000?text=SUNAT',
    category: 'finance',
    lessons: [
      { 
        id: 'L0301', 
        title: 'Lección 1: ¿Por qué ser formal bajo la Ley N° 30056?', 
        type: 'text', 
        content: `### Beneficios de la Ley N° 30056 y la Formalización Comercial.\n\nLa formalidad en Perú está regulada por la **Ley de Impulso al Desarrollo Productivo y al Crecimiento Empresarial (Ley 30056)**. Ser formal te concede tres ventajas que multiplican el valor de tu negocio:\n\n1. **Acceso a Compras Estatales:** El Estado Peruano destina por ley no menos del **40% de sus adquisiciones** a las micro y pequeñas empresas.\n2. **Préstamos Preferenciales Garantizados:** Puedes postular a fondos subsidiados y con cobertura estatal como los del programa **Impulso MYPERU**, con tasas anuales (TCEA) históricamente bajas de 10% a 15%, frente al 60% de los informales.\n3. **Contratar con Empresas Grandes:** Las medianas y grandes corporaciones exigen factura obligatoria para deducir costos operacionales. No dar factura te limita a mercados muy pequeños y de baja rentabilidad.`,
        quiz: [
          { question: '¿Qué porcentaje mínimo de sus compras está obligado el Estado peruano a comprar a las MYPES formales por ley?', options: ['Ninguno, es opcional para el estado.', 'Al menos el 45% del total de licitaciones públicas.', 'Al menos el 40% de las contrataciones y adquisiciones.'], correctAnswerIndex: 2, explanation: 'La Ley 30056 dicta que el Estado Peruano debe reservar al menos el 40% de su presupuesto para MYPES de diversos rubros.' }
        ] 
      },
      { 
        id: 'L0302', 
        title: 'Lección 2: Facturas vs. Boletas y el Crédito Fiscal', 
        type: 'text', 
        content: `### El Poder del Crédito Fiscal de IGV.\n\nSegún la **Ley del Impuesto General a las Ventas (Decreto Legislativo 821)**, cada vez que vendes un bien o servicio en Perú, cobras un **18% de IGV** que debes entregar mensualmente a la SUNAT. El IGV de las ventas se conoce como **Débito Fiscal**.\n\nSin embargo, la ley te permite descontar (deducir) todo el **Crédito Fiscal** acumulado por las compras sustentadas con **Factura** que sean necesarias para tu negocio (principio de causalidad).\n\n**Ejemplo Práctico:**\n* Cobraste S/ 1,800 de IGV en tus ventas del mes.\n* Compraste mercadería y pagaste S/ 1,200 de IGV exigiendo Factura.\n* Solo pagas a la SUNAT la diferencia neta: **S/ 600**.\n\nSi pides boletas o compras sin comprobante, pierdes este beneficio por completo y regalas dinero directamente.`,
        quiz: [
          { question: '¿Cuál es el requisito indispensable para poder utilizar el IGV de una compra como Crédito Fiscal a favor de tu empresa?', options: ['Sustentar la compra únicamente con Factura electrónica que use el RUC del negocio y cumpla el principio de causalidad.', 'Pagar la compra en efectivo sin declarar.', 'Comprar a una persona natural formalizada bajo Nuevo RUS.'], correctAnswerIndex: 0, explanation: 'Solo las facturas electrónicas con el RUC de tu negocio otorgan Crédito Fiscal, siempre y cuando el gasto sea causal al giro de tu negocio.' }
        ] 
      },
      { 
        id: 'L0303', 
        title: 'Lección 3: Acogiéndose al Régimen MYPE Tributario (D.L. 1269)', 
        type: 'text', 
        content: `### Beneficios Progresivos del RMT (Decreto Legislativo N° 1269).\n\nEl **Régimen MYPE Tributario (RMT)** fue creado específicamente para incentivar el escalamiento de los emprendedores en Perú. A diferencia del Régimen General, el RMT ofrece tasas de Impuesto a la Renta progresivas y sumamente bajas para las pymes:\n\n* **Tramo Inicial:** Si tu Ganancia Neta Anual (Utilidad) es **menor a 15 UIT** (S/ 77,250), la tasa del impuesto anual de Renta es de solo **10%**.\n* **Tramo de Escalamiento:** Por el exceso de 15 UIT hasta las 1,700 UIT de facturación, pagas tasas de 29.5%.\n\nEsto le da un aire financiero tremendo a tu negocio en sus primeros tres años de desarrollo, permitiendo reinvertir las utilidades sin sufrir asfixias impositivas.`,
        quiz: [
          { question: 'Bajo el Régimen MYPE Tributario (RMT), ¿cuál es la tasa impositiva anual que pagas si tu utilidad anual no supera las 15 UIT?', options: ['Una tasa fija mensual de S/ 50.', 'Solo el 10% de la utilidad anual neta.', 'El 29.5% del total facturado.'], correctAnswerIndex: 1, explanation: 'El RMT promueve el crecimiento cobrando solo una tasa del 10% sobre la utilidad neta en las primeras 15 UIT del año.' }
        ] 
      }
    ],
    recommendationReason: 'Aumentar tu formalidad te abrirá las puertas a mejores créditos y clientes.'
  },
  {
    id: 'C06',
    title: 'Contabilidad Práctica para MYPEs',
    description: 'Aprende a organizar tus libros virtuales, entender tus estados financieros y prepararte para las auditorías bajo el SIRE de SUNAT.',
    badgeUrl: 'https://placehold.co/128x128/2c3e50/ffffff?text=Contador',
    category: 'accounting',
    lessons: [
      { 
        id: 'L0601', 
        title: 'Lección 1: Conceptos Básicos: Activos, Pasivos y Patrimonio', 
        type: 'text', 
        content: `### La Ecuación Contable Fundamental.\n\nToda organización empresarial se rige bajo una regla matemática inquebrantable:\n\n**Activos = Pasivos + Patrimonio**\n\n* **Activos:** Todo lo que tu negocio posee y le genera valor (efectivo en cuentas, mercaderías, cuentas por cobrar, maquinarias).\n* **Pasivos:** Las obligaciones y deudas con terceros (créditos bancarios, impuestos SUNAT pendientes, cuentas por pagar a proveedores).\n* **Patrimonio:** El valor neto real de los accionistas; corresponde a los aportes iniciales de capital más las utilidades retenidas que se deciden reinvertir.\n\nEntender esto te permite armar balances contables objetivos de inmediato sin cometer el error grave de confundir tus finanzas personales y domésticas con el dinero de tu empresa.`,
        quiz: [
          { question: '¿Cuál es la fórmula contable inquebrantable que rige la estructura financiera de una empresa?', options: ['Activos = Pasivos - Patrimonio', 'Activos = Pasivo + Patrimonio', 'Ventas = Compras + IGV'], correctAnswerIndex: 1, explanation: 'Los Activos totales representan todos los recursos de la empresa, los cuales están financiados o por terceros (Pasivo) o por los dueños (Patrimonio).' }
        ] 
      },
      { 
        id: 'L0602', 
        title: 'Lección 2: Entendiendo el Estado de Ganancia y Pérdida', 
        type: 'text', 
        content: `### Margen Bruto, Operativo e Impuesto Neto.\n\nEl Estado de Resultados (o de Ganancias y Pérdidas) te dice si tu negocio está ganando dinero en un lapso determinado de tiempo.\n\n* **Ingresos de Venta Totales (Base Imponible):** Todo lo facturado neto de IGV.\n* **Costo de Ventas:** Lo que costó directamente adquirir o fabricar los productos vendidos.\n* **Margen Bruto:** Ventas - Costo de Ventas.\n* **Gastos Administrativos y de Operación:** Alquileres, sueldos de personal de oficina, marketing y ventas.\n* **EBITDA:** Ganancia operativa antes de intereses, amortizaciones e impuestos. Es el principal medidor de salud operativa que los fondos de inversion examinan.`,
        quiz: [
          { question: '¿Qué es el EBITDA de una empresa?', options: ['La cantidad de dinero total que hay depositado en el banco.', 'La utilidad o flujo generado puramente de las operaciones comerciales de la empresa, antes de deducciones financieras o impositivas.', 'La deuda acumulada en la central de deudas.'], correctAnswerIndex: 1, explanation: 'EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization) muestra el rendimiento real del core o corazón comercial del negocio.' }
        ] 
      },
      { 
        id: 'L0603', 
        title: 'Lección 3: El Sistema Integrado de Registros Electrónicos (SIRE)', 
        type: 'text', 
        content: `### El Fin de la Digitación Manual: Cumplimiento SIRE SUNAT.\n\nSUNAT ha automatizado la fiscalización con el **SIRE (Módulo de Compras y Ventas Electrónicas)**. La SUNAT ya recibe de forma digital cada boleta y factura emitida con tu RUC.\n\nPor ende, el SIRE genera una propuesta automática de tus registros mensuales. Como empresario, ya no tienes que tipear todo en un excel; tu deber legal es **revisar, comparar y aceptar o complementar** dicha propuesta antes de la fecha de vencimiento según el calendario tributario nacional.\n\nNo responder al SIRE es aceptar la propuesta de SUNAT, lo cual representa un riesgo de multas si un proveedor emitió un comprobante erróneo con tu nombre.`,
        quiz: [
          { question: '¿Cuál es la función principal del contribuyente frente al nuevo sistema SIRE de SUNAT?', options: ['Digitar manualmente todas sus facturas de forma tradicional en un software local.', 'Revisar, contrastar y aceptar o complementar la propuesta electrónica que SUNAT arma de manera centralizada.', 'Pedir que le anulen el RUC temporalmente.'], correctAnswerIndex: 1, explanation: 'El SIRE cambia la contabilidad de digitación a un rol puramente auditor y validador de los comprobantes electrónicos transmitidos.' }
        ] 
      }
    ]
  },
  {
    id: 'C02',
    title: 'Domina las Ventas Digitales',
    description: 'Impulsa tus ingresos utilizando redes sociales, pasarelas de pago digitales (Yape/Plin) y técnicas de marketing automatizadas.',
    badgeUrl: 'https://placehold.co/128x128/28a745/ffffff?text=Ventas',
    category: 'growth',
    lessons: [
      { 
        id: 'L0201', 
        title: 'Lección 1: Vendiendo con Yape y Plin para Negocios', 
        type: 'text', 
        content: `### Ecosistema de Pagos Móviles y su Trazabilidad.\n\nMás de **16 millones de peruanos** usan Yape o Plin a diario. No aceptar códigos QR de cobro móvil equivale a regalarle clientes a la tienda del frente.\n\n**Hito Fundamental:** Los cobros móviles aceleran tu flujo de efectivo un 300% frente a compras con tarjeta de crédito que tardan 48 horas en abonarse. No obstante, recuerda que la **SUNAT fiscaliza las cuentas bancarias que reciben más de 3 UIT mensuales** por transferencias frecuentes. El cobro móvil debe estar respaldado por la emisión de comprobantes de pago como boletas de venta automáticas para proteger tu flujo comercial de contingencias de lavado o ingresos no declarables.`,
        quiz: [
          { question: '¿Por qué deberías registrar Yape o Plin de Negocio formal de forma corporativa en vez de una cuenta personal ordinaria?', options: ['Para evadir impuestos.', 'Para poder centralizar tus liquidaciones de venta formales asociadas al RUC de tu negocio y evitar alertas de desbalance patrimonial de la SUNAT.', 'Porque te cobran más barato.'], correctAnswerIndex: 1, explanation: 'Los bancos ofrecen cuentas para negocios corporativas vinculadas al RUC y facilitan la contabilidad automática de ingresos del local.' }
        ] 
      },
      { 
        id: 'L0202', 
        title: 'Lección 2: Campañas de Meta Ads de Alta Conversión', 
        type: 'text', 
        content: `### Estratificación de Presupuestos Digitales.\n\nPara promocionar tu negocio local en Facebook e Instagram, debes dominar la segmentación por geolocalización. Las plataformas te permiten irradiar anuncios exclusivamente a **2 kilómetros a la redonda de tu tienda** o punto de venta.\n\n**Estrategia Dinámica:**\n1. Diseña un video corto y directo de 15 segundos exponiendo la solución. \n2. Establece un presupuesto de inicio bajo de S/ 5 a S/ 10 diarios.\n3. Dirige el botón de acción ('CTA') de inmediato a tu número exclusivo de WhatsApp Business operado con plantillas de bienvenida automática para convertir el interés en ventas rápidas.`,
        quiz: [
          { question: '¿Cuál es la estrategia de segmentación ideal en Meta Ads para una tienda física local de abarrotes o cafetería?', options: ['Segmentar a todo el país para tener más likes.', 'Geolocalizar el público en un radio hiperlocal de 1 a 3 km alrededor del local.', 'Anunciar únicamente a personas con educación universitaria.'], correctAnswerIndex: 1, explanation: 'Un radio local concentra el presupuesto en personas que viven o transitan directamente cerca de tu comercio físico.' }
        ] 
      },
      { 
        id: 'L0203', 
        title: 'Lección 3: Atención y Cierre Exponencial en WhatsApp Business', 
        type: 'text', 
        content: `### Respuestas Rápidas, Etiquetas y Ventas de Alto Tráfico.\n\nEl WhatsApp normal limita tu capacidad organizativa. Con **WhatsApp Business** puedes categorizar a tus prospectos usando **etiquetas de colores**:\n* "Cliente Nuevo"\n* "Pago Pendiente"\n* "Pedido Listo Para Enviar"\n* "Factura Emitida"\n\nAdicionalmente, activa mensajes de ausencia y respuestas rápidas configurando atajos como **/precio** o **/catalogo** para responder preguntas repetitivas en menos de 5 segundos. La velocidad de atención define el 80% del éxito en el cierre comercial digital.`,
        quiz: [
          { question: '¿Qué herramienta de WhatsApp Business te ayuda a acelerar respuestas repetitivas sobre precios o catálogos?', options: ['Llamar por teléfono al cliente.', 'Respuestas rápidas activables por atajos de teclado como "/"', 'Contratar un call center externo.'], correctAnswerIndex: 1, explanation: 'Los atajos rápidos guardan plantillas de texto listas y pulidas para enviarse en décimas de segundo, agilizando el flujo comercial.' }
        ] 
      }
    ],
    recommendationReason: 'Una estrategia digital podría ayudarte a acelerar el crecimiento de tus ventas.'
  },
  {
    id: 'C07',
    title: 'Gestión de Proveedores y Obligaciones',
    description: 'Optimiza tu cadena de suministro, negocia mejores plazos con proveedores formales y reduce tus costos operativos bajo bases sólidas.',
    badgeUrl: 'https://placehold.co/128x128/6c757d/ffffff?text=Prov',
    category: 'operations',
    lessons: [
      { 
        id: 'L0701', 
        title: 'Lección 1: Selección Crítica de Proveedores Formales', 
        type: 'text', 
        content: `### El Costo de un Proveedor Informal.\n\nComprar insumos o mercadería a proveedores informales que no te dan factura electrónica destruye el valor de tu negocio. Al comprar informal:\n1. No puedes deducir el IGV de la operación comercial como Crédito Fiscal (pagas 18% más de impuestos directos de forma artificial).\n2. No puedes deducir dicho costo como Gasto Causal en RMT (pagas hasta el 29.5% de impuesto a la renta sobre ese dinero).\n\n**Protocolo de Selección SAMI:** Exige RUC activo y condición **HABIDO** antes de emitir una orden de compra o adelanto bancario.`,
        quiz: [
          { question: 'Al comprar suministros sin factura a proveedores informales, ¿qué efecto tributario perjudicial sufres?', options: ['Ninguno, la SUNAT no lo registra.', 'Pierdes el crédito fiscal del IGV y no puedes deducir el valor como gasto real, aumentando tu carga tributaria artificialmente.', 'El proveedor te denuncia ante el INDECOPI.'], correctAnswerIndex: 1, explanation: 'La falta de comprobantes válidos te impide usar el gasto contablemente, lo que te obliga a pagar un impuesto alto sobre ganancias artificiales.' }
        ] 
      },
      { 
        id: 'L0702', 
        title: 'Lección 2: El Arte de Negociar Plazos (Financiando tu Negocio)', 
        type: 'text', 
        content: `### Negociación de Condiciones de Pago.\n\nEl financiamiento más barato no proviene de un banco, sino de tus propios proveedores. Consiste en la negociación de términos de pago diferido (Net 30, Net 45 o Net 60 días) sin devengo de intereses ordinarios.\n\nPara lograr plazos de pago diferido, incrementa de forma progresiva la frecuencia de tus compras y demuestra solvencia fiscal. Al compartir tu información de **Salud Tributaria** con ellos, demuestras que eres un contribuyente ejemplar y ordenado, lo cual actúa como el mejor aval corporativo de pago puntual.`,
        quiz: [
          { question: '¿Cuál es la fuente de apalancamiento o financiamiento más económica y libre de intereses para el inventario de una MYPE?', options: ['Un préstamo de consumo rápido de un banco.', 'Plazos de pago netos de 30 o 45 días negociados directamente con el proveedor regular de insumos.', 'Empeñar maquinaria de producción.'], correctAnswerIndex: 1, explanation: 'Los plazos del proveedor representan un apalancamiento puro a tasa de interés 0%, ideal para preservar la liquidez operativa.' }
        ] 
      },
      { 
        id: 'L0703', 
        title: 'Lección 3: Gestión de Cuentas por Pagar y Conciliación', 
        type: 'text', 
        content: `### Priorización de Obligaciones y Reporte de Pagos SBS.\n\nNo pagar a tiempo a tus proveedores destruye tu confianza comercial. Clasifica tus deudas según su costo financiero y plazo:\n1. **Obligaciones Laborales (Gratificaciones, CTS, Planilla):** Costo legal alto, prioridad crítica.\n2. **Impuestos SUNAT:** Devengan intereses moratorios de 0.03% diario. Deben pagarse de inmediato bajo calendario.\n3. **Préstamos Financieros:** Impactan tu Score SBS de inmediato.\n4. **Proveedores Comerciales:** Plazo extendido negociable.\n\nMantén un calendario de conciliación semanal para coordinar estos pagos de manera predictiva y organizada.`,
        quiz: [
          { question: '¿Qué tasa de interés moratorio mensual aproximado acumulan las deudas tributarias no pagadas a tiempo con la SUNAT?', options: ['0.9% de interés acumulado mensual de mora.', '0% si eres del RUS.', '50% mensual de interés ordinario.'], correctAnswerIndex: 0, explanation: 'La tasa de interés moratorio (TIM) de la SUNAT es de 0.03% diario (aprox 0.9% mensual). Es un pasivo que crece si se descuida.' }
        ] 
      }
    ]
  },
  {
    id: 'C08',
    title: 'Análisis de Riesgos Crediticios',
    description: 'Aprende cómo las entidades financieras evalúan tu perfil bajo regulaciones de la SBS y optimiza tu Salud Tributaria.',
    badgeUrl: 'https://placehold.co/128x128/48cae4/ffffff?text=Risk',
    category: 'finance',
    lessons: [
      { 
        id: 'L0801', 
        title: 'Lección 1: Los 5 Pilares de Evaluación (Resolución SBS N° 11356-2008)', 
        type: 'text', 
        content: `### El Rigor Crediticio bajo el Filtro Regulador.\n\nEn el sistema financiero peruano, la SBS (Superintendencia de Banca, Seguros y AFP) regula la clasificación del deudor. Los analistas ponderan los riesgos en base a las **5 "C" del crédito**:\n\n1. **Carácter (Character):** Tu reputación en centrales de riesgo. Tu historial de pago puntual.\n2. **Capacidad (Capacity):** Tus ingresos reales medidos contra tus compromisos recurrentes.\n3. **Capital (Capital):** Tu patrimonio neto y activos del negocio.\n4. **Colateral (Collateral):** Las garantías físicas o avales que respaldan la operación.\n5. **Condiciones (Conditions):** Las tendencias de mercado que impactan tu sector de negocio.\n\nSAMI te ayuda a documentar tu **Capacidad** de manera fidedigna al registrar de forma ordenada tus comprobantes de venta y compra.`,
        quiz: [
          { question: '¿Cuál de las 5 "C" del crédito analiza de manera rigurosa la solvencia patrimonial e inversión propia del dueño de la empresa?', options: ['Carácter', 'Condiciones', 'Capital'], correctAnswerIndex: 2, explanation: 'El Capital evalúa los aportes patrimoniales del emprendedor, reduciendo la relación de apalancamiento puramente externo.' }
        ] 
      },
      { 
        id: 'L0802', 
        title: 'Lección 2: Factores Clave que Evalúan las Entidades Financieras', 
        type: 'text', 
        content: `### Cómo Analizan los Bancos la Información de tu Negocio.\n\nSAMI **no otorga créditos ni realiza la evaluación de riesgo**: su función es ordenar tu información contable y tributaria para facilitarle el análisis a las entidades financieras aliadas. Cada banco, caja o fintech aplica **sus propios modelos y políticas internas de riesgo** para evaluar a tu MYPE.\n\nAunque cada entidad tiene criterios propios, la mayoría valora favorablemente tres factores esenciales al revisar tu expediente:\n\n* **Constancia y Estabilidad de Ingresos:** Un negocio con ventas regulares mes a mes demuestra predictibilidad y capacidad operativa continua, reduciendo la probabilidad de impago frente a flujos con oscilaciones drásticas.\n* **Tendencia y Crecimiento:** Un volumen sostenido de ventas a lo largo del tiempo refleja demanda activa y potencial de expansión comercial.\n* **Nivel de Formalidad Documentaria:** Contar con comprobantes electrónicos sustentados (facturas y boletas) y compras con crédito fiscal permite a los analistas verificar tus cifras de manera fidedigna sin depender de estimaciones informales.`,
        quiz: [
          { question: '¿Por qué las entidades financieras valoran la constancia y regularidad de los ingresos mes a mes de una MYPE?', options: ['Porque demuestra predictibilidad operativa y reduce la probabilidad de impago.', 'Porque define automáticamente la tasa de interés regulada por SUNAT.', 'Porque permite prescindir de comprobantes de pago formales.'], correctAnswerIndex: 0, explanation: 'Los flujos de caja estables y predecibles facilitan la planificación financiera y dan mayor seguridad a los analistas de riesgo de cualquier entidad financiera.' }
        ] 
      },
      { 
        id: 'L0803', 
        title: 'Lección 3: Prácticas Clave para Fortalecer el Perfil Financiero de tu Negocio', 
        type: 'text', 
        content: `### Buenas Prácticas de Formalidad y Salud Financiera.\n\nPara que tu negocio sea más atractivo ante cualquier banco, caja o entidad financiera aliada, mantén una disciplina financiera y tributaria constante con estos pasos estratégicos:\n\n1. **Registra tus Comprobantes Digitales al Día:** Emite boletas y facturas electrónicas por cada venta y solicita facturas en tus compras comerciales para que tu información contable refleje el volumen real de tu operación.\n2. **Uso Prudente de Líneas de Crédito:** Si cuentas con tarjetas o líneas de crédito revolventes comerciales, procura mantener su uso por **debajo del 30%** de la línea disponible para demostrar holgura de liquidez.\n3. **Cumplimiento Tributario Puntual:** Declara y paga tus tributos mensuales dentro del cronograma de vencimientos de SUNAT. Evitar contingencias, multas o cobranzas coactivas protege la reputación de tu empresa ante el sistema financiero.`,
        quiz: [
          { question: '¿Cuál es una práctica recomendada en el uso de líneas de crédito para proyectar solidez financiera ante las entidades evaluadoras?', options: ['Mantener el uso por debajo del 30% de la capacidad disponible para evidenciar holgura de liquidez.', 'Tener la línea copada al 100% de manera permanente para mostrar alto movimiento.', 'No declarar las compras en los registros contables.'], correctAnswerIndex: 0, explanation: 'Mantener un uso moderado de las líneas de crédito indica a los analistas de riesgo que la empresa no opera con estrés de liquidez inmediata.' }
        ] 
      }
    ]
  },
  {
    id: 'C09',
    title: 'Planificación Financiera Estratégica',
    description: 'Aprende a proyectar el futuro de tu negocio, establecer metas financieras claras y tomar decisiones basadas en datos.',
    badgeUrl: 'https://placehold.co/128x128/6366f1/ffffff?text=Plan',
    category: 'finance',
    lessons: [
      {
        id: 'L0901', 
        title: 'Estableciendo Metas SMART', 
        type: 'text', 
        content: 'La planificación estratégica comienza con objetivos Específicos, Medibles, Alcanzables, Relevantes y con un Tiempo definido (SMART). Sin metas financieras, tu negocio navega a la deriva.', 
        quiz: [
          { question: '¿Qué significa la "M" en las metas SMART?', options: ['Maestro', 'Medible', 'Motivado'], correctAnswerIndex: 1, explanation: 'Las metas deben ser medibles para saber si se han alcanzado.' }
        ] 
      },
      {
        id: 'L0902', 
        title: 'Proyecciones de Venta y Escenarios', 
        type: 'text', 
        content: 'Aprende a crear escenarios optimistas, realistas y pesimistas. La clave está en estar preparado para cualquier cambio en el mercado.', 
        quiz: [
          { question: '¿Por qué es importante proyectar un escenario pesimista?', options: ['Para ser negativo.', 'Para identificar riesgos y tener un plan de contingencia.', 'No es importante.'], correctAnswerIndex: 1, explanation: 'Estar preparado para lo peor te ayuda a sobrevivir en tiempos difíciles.' }
        ] 
      }
    ]
  },
  {
    id: 'C10',
    title: 'Marketing Digital para PYMEs',
    description: 'Potencia tu presencia en línea, atrae nuevos clientes y fideliza a los actuales mediante estrategias digitales efectivas.',
    badgeUrl: 'https://placehold.co/128x128/ec4899/ffffff?text=Mkt',
    category: 'growth',
    lessons: [
      {
        id: 'L1001', 
        title: 'Creación de Contenido de Valor', 
        type: 'text', 
        content: 'No se trata solo de vender, sino de educar y entretener a tu audiencia. Crea contenido que resuelva problemas para tus clientes potenciales.', 
        quiz: [
          { question: '¿Cuál es el objetivo del marketing de contenidos?', options: ['Bombardear con publicidad.', 'Construir confianza y autoridad brindando valor.', 'Gastar dinero.'], correctAnswerIndex: 1, explanation: 'El valor atrae y retiene a los clientes mejor que la publicidad intrusiva.' }
        ] 
      },
      {
        id: 'L1002', 
        title: 'Publicidad en Meta Ads y TikTok', 
        type: 'text', 
        content: 'Aprende a segmentar tu audiencia para que tu inversión en publicidad llegue a las personas que realmente están interesadas en tu producto.', 
        quiz: [
          { question: '¿Qué es la segmentación de audiencia?', options: ['Mostrar anuncios a todo el mundo.', 'Dividir a los usuarios según intereses y demografía para mayor efectividad.', 'Eliminar seguidores.'], correctAnswerIndex: 1, explanation: 'La segmentación permite dirigir el presupuesto a los perfiles con mayor probabilidad de compra.' }
        ] 
      }
    ]
  },
  {
    id: 'C11',
    title: 'Gestión de Inventarios',
    description: 'Controla tu stock al detalle, reduce mermas y optimiza el capital invertido en mercadería.',
    badgeUrl: 'https://placehold.co/128x128/10b981/ffffff?text=Stock',
    category: 'operations',
    lessons: [
      {
        id: 'L1101', 
        title: 'Métodos de Valorización (PEPS/UEPS)', 
        type: 'text', 
        content: 'Entender cómo valorar tu inventario impacta directamente en tus estados financieros y en el cálculo de tus impuestos.', 
        quiz: [
          { question: '¿Qué significa el método PEPS?', options: ['Primero en Entrar, Primero en Salir.', 'Pago Extra Para Seguridad.', 'Precio Económico Para Siempre.'], correctAnswerIndex: 0, explanation: 'PEPS asume que los primeros productos comprados son los primeros en venderse.' }
        ] 
      },
      {
        id: 'L1102', 
        title: 'Punto de Repedido y Stock de Seguridad', 
        type: 'text', 
        content: 'Nunca te quedes sin stock. Calculamos cuándo es el momento exacto para volver a pedir mercadería a tus proveedores.', 
        quiz: [
          { question: '¿Para qué sirve el stock de seguridad?', options: ['Para ocupar espacio.', 'Para cubrir variaciones inesperadas en la demanda o retrasos de proveedores.', 'Para aumentar impuestos.'], correctAnswerIndex: 1, explanation: 'Es una reserva ante imprevistos para no dejar de vender.' }
        ] 
      }
    ]
  },
  {
    id: 'C12',
    title: 'Negociación con Proveedores',
    description: 'Desarrolla habilidades de negociación para obtener mejores precios, plazos de pago y condiciones que beneficien a tu empresa.',
    badgeUrl: 'https://placehold.co/128x128/f59e0b/ffffff?text=Neg',
    category: 'operations',
    lessons: [
      {
        id: 'L1201', 
        title: 'La Preparación es la Clave', 
        type: 'text', 
        content: 'Antes de sentarte a negociar, debes conocer tus números, tus alternativas y las necesidades de tu proveedor.', 
        quiz: [
          { question: '¿Qué es el MAAN en una negociación?', options: ['Mejor Alternativa a un Acuerdo Negociado.', 'Monto Anual de Ahorro Neto.', 'Meta Analítica de Negocio.'], correctAnswerIndex: 0, explanation: 'Conocer tu mejor alternativa te da poder en la mesa de negociación.' }
        ] 
      },
      {
        id: 'L1202', 
        title: 'Creando Acuerdos Ganar-Ganar', 
        type: 'text', 
        content: 'Una buena relación con proveedores es de largo plazo. Busca beneficios mutuos que vayan más allá de un simple descuento en el precio.', 
        quiz: [
          { question: '¿Qué define un acuerdo "Ganar-Ganar"?', options: ['Que yo gano y el otro pierde.', 'Ambas partes obtienen beneficios y fortalecen su relación comercial.', 'Que nadie gana nada.'], correctAnswerIndex: 1, explanation: 'El éxito duradero se basa en la colaboración y el beneficio mutuo.' }
        ] 
      }
    ]
  },
  {
    id: 'C13',
    title: 'Obligaciones Tributarias Simplificadas',
    description: 'Mantente al día con la SUNAT sin complicaciones. Aprende los cronogramas, declaraciones y cómo evitar multas comunes.',
    badgeUrl: 'https://placehold.co/128x128/3b82f6/ffffff?text=Tax',
    category: 'accounting',
    lessons: [
      {
        id: 'L1301', 
        title: 'El Calendario de Vencimientos', 
        type: 'text', 
        content: 'Conoce exactamente cuándo te toca declarar según el último dígito de tu RUC. La puntualidad te ahorra dinero en multas innecesarias.', 
        quiz: [
          { question: '¿De qué depende tu fecha de vencimiento tributario?', options: ['De tu fecha de cumpleaños.', 'Del último dígito de tu RUC.', 'De la suerte.'], correctAnswerIndex: 1, explanation: 'SUNAT establece cronogramas basados en la terminación del RUC.' }
        ] 
      },
      {
        id: 'L1302', 
        title: 'Gastos Deducibles y No Deducibles', 
        type: 'text', 
        content: 'No todo lo pides con factura sirve para bajar impuestos. Aprende qué gastos son aceptados por la SUNAT como parte de tu giro de negocio.', 
        quiz: [
          { question: '¿Qué característica debe tener un gasto para ser deducible?', options: ['Debe ser personal.', 'Debe ser necesario para producir rentas o mantener su fuente (Causalidad).', 'Debe ser muy caro.'], correctAnswerIndex: 1, explanation: 'El principio de causalidad es fundamental para aceptar un gasto tributariamente.' }
        ] 
      }
    ]
  },
];

// Mock user progress - in a real app, this would come from a database
const userProgressData: UserProgress = {
    'L0101': true,
};

// --- API Functions ---

export const getCourses = (): Promise<Course[]> => {
  return Promise.resolve(allCourses);
};

export const getUserProgress = (): Promise<UserProgress> => {
    return Promise.resolve(userProgressData);
}

export const getRecommendedCourses = async (salesHistory: Invoice[]): Promise<Course[]> => {
    const taxSummary = await calculateTaxHealth(salesHistory);
    const recommendations: Course[] = [];

    if (!taxSummary) {
        const formalizationCourse = allCourses.find(c => c.id === 'C05');
        if (formalizationCourse) recommendations.push(formalizationCourse);
        return recommendations;
    }
    
    if (taxSummary.avgMonthlySales < 15000) {
        const course = allCourses.find(c => c.id === 'C01');
        if (course) recommendations.push(course);
    }

    if (taxSummary.verifiedInvoicesCount < 10) {
        const course = allCourses.find(c => c.id === 'C02');
        if (course) recommendations.push(course);
    }

    if (taxSummary.formalityRatio < 100) {
        const course = allCourses.find(c => c.id === 'C03' || c.id === 'C05');
        if (course) recommendations.push(course);
    }
    
    if (recommendations.length === 0) {
        const course = allCourses.find(c => c.id === 'C05');
        if (course) recommendations.push(course);
    }

    // Return unique recommendations
    return [...new Map(recommendations.map(item => [item.id, item])).values()];
};
