import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { logger } from '../../core/services/logger';

const router = express.Router();

// 1. POST /chat (or mounted at /api/v1/chat)
router.post('/', async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Mensaje requerido' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.info('[SAMI Chat Router] GEMINI_API_KEY is missing. Using Peruvian Fintech assistant fallback responder.');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const lowercaseMsg = message.toLowerCase();
    let responseText = '¡Hola! Soy SAMI, tu asesor financiero inteligente 24/7. ¿En qué puedo ayudarte hoy?';
    
    if (lowercaseMsg.includes('score') || lowercaseMsg.includes('salud tributaria') || lowercaseMsg.includes('tributaria')) {
      responseText = 'Tu **Salud Tributaria** refleja tu cumplimiento fiscal y volumen de ventas reales ante SUNAT. Fortalece este indicador registrando compras formales usando facturas en nuestro módulo. Al compartir este expediente con tu consentimiento explícito a entidades financieras aliadas (bancos, cajas, fintechs), ellas pueden evaluar tu negocio con tasas y condiciones fijadas por cada institución. Para conocer más, te invitamos a revisar el curso **C13: Obligaciones Tributarias** en la Academia SAMI.';
    } else if (lowercaseMsg.includes('igv') || lowercaseMsg.includes('impuesto') || lowercaseMsg.includes('sunat')) {
      responseText = 'Recuerda que el IGV (18%) cobrado en tus ventas debe ser compensado con el IGV de tus compras de negocio. Al registrar facturas de tus proveedores, acumulas crédito fiscal que disminuye directamente tus tributos por pagar del mes. Además, SAMI te mantiene al día con alertas automatizadas antes del vencimiento SUNAT. Esta es una orientación informativa general; para situaciones específicas de tu MYPE, te recomendamos consultar con tu contador de confianza, o revisar el curso **C06: Contabilidad Práctica** en la Academia SAMI.';
    } else if (lowercaseMsg.includes('crédito') || lowercaseMsg.includes('prestamo') || lowercaseMsg.includes('financiamiento') || lowercaseMsg.includes('tasa')) {
      responseText = 'Puedes explorar nuestro **Marketplace de Microcréditos y Factoring**. Al compartir tu información tributaria con tu consentimiento explícito con nuestras entidades financieras aliadas (BCP, Interbank, BBVA, etc.) directamente en la app, puedes solicitar opciones de financiamiento para capital de trabajo evaluadas por cada entidad según sus propias políticas. Si deseas prepararte para la evaluación de las entidades, te recomendamos el curso **C08: Análisis de Riesgos Crediticios** en la Academia SAMI.';
    } else if (lowercaseMsg.includes('contratar') || lowercaseMsg.includes('comprar') || lowercaseMsg.includes('plan') || lowercaseMsg.includes('planes') || lowercaseMsg.includes('precio') || lowercaseMsg.includes('costo') || lowercaseMsg.includes('tarifa') || lowercaseMsg.includes('suscribir') || lowercaseMsg.includes('pago')) {
      responseText = '¡Contratar SAMI es sumamente fácil y seguro! Contamos con tres planes adaptados a tu negocio:\n\n' +
        '1. **Plan Emprendedor (S/ 0 - Gratis para siempre)**: Control básico de caja, cálculo de IGV referencial y reporte de salud tributaria.\n' +
        '2. **Plan Crecimiento MYPE (S/ 49 al mes)**: Certificación de salud tributaria, alertas automáticas de agenda SUNAT por WhatsApp, y conexión directa a marketplace de créditos con entidades aliadas.\n' +
        '3. **Plan Elite Corp (S/ 149 al mes)**: Factoring en menos de 2 horas, dashboard multiusuario avanzado, soporte VIP y análisis de anomalías de compras de proveedores.\n\n' +
        'Para activarlo, regístrate en nuestra web con tu RUC 10/20, elige tu plan desde el panel de Administración y listo. ¡Sin contratos de permanencia!';
    } else if (lowercaseMsg.includes('crear usuario') || lowercaseMsg.includes('nuevo usuario') || lowercaseMsg.includes('usuarios') || lowercaseMsg.includes('invitar') || lowercaseMsg.includes('trabajador') || lowercaseMsg.includes('personal') || lowercaseMsg.includes('colaborador')) {
      responseText = 'Para **añadir un nuevo colaborador o usuario** en tu negocio:\n\n' +
        '1. Ve a la sección **Administración > Usuarios** del panel.\n' +
        '2. Haz clic en **Invitar Usuario** o **+ Nuevo Usuario**.\n' +
        '3. Escribe su nombre, correo y asígnale un rol (Administrador MYPE, Trabajador o Contador).\n' +
        '4. Al confirmar, el sistema generará una **contraseña temporal** en pantalla para que se la entregues directamente al colaborador. Al iniciar sesión por primera vez, el sistema le solicitará cambiarla por una propia.';
    } else if (lowercaseMsg.includes('dar de baja') || lowercaseMsg.includes('baja') || lowercaseMsg.includes('cancelar') || lowercaseMsg.includes('eliminar') || lowercaseMsg.includes('desactivar')) {
      responseText = 'Lamentamos que quieras dejar SAMI. Cuentas con opciones claras, transparentes y conformes a ley:\n\n' +
        '1. **Desactivar tu Cuenta (Inmediata)**: Desde el panel de Administración, puedes solicitar la desactivación inmediata de tu acceso y el de tus colaboradores. Tus registros contables se conservan protegidos conforme a la obligación de retención legal del Código Tributario Peruano.\n' +
        '2. **Exportar mis Datos (Portabilidad JSON)**: Puedes descargar una copia estructurada completa de tus comprobantes, usuarios y registros de consentimiento en formato JSON antes de darte de baja.\n' +
        '3. **Derecho ARCO de Cancelación (Ley N° 29733)**: Si deseas solicitar la cancelación de tus datos personales, puedes registrar una solicitud ARCO de Cancelación desde el módulo de Privacidad o mediante un ticket de soporte (plazo legal de atención de 10 días hábiles).';
    } else if (lowercaseMsg.includes('soporte') || lowercaseMsg.includes('ayuda') || lowercaseMsg.includes('ticket') || lowercaseMsg.includes('atencion') || lowercaseMsg.includes('reclamo') || lowercaseMsg.includes('problema')) {
      responseText = 'Si tienes un problema de soporte técnico, de acceso, o de facturación, estamos listos para atenderte:\n\n' +
        '- Puedes ingresar a **Administración > Soporte** para crear un Ticket de Soporte. El tiempo promedio de respuesta para cuentas gratuitas es de 12 horas, y menos de 2 horas para clientes premium.\n' +
        '- Para quejas o disconformidades, contamos con un **Libro de Reclamaciones Digital** (asociado a la normativa INDECOPI) en la misma barra superior.\n' +
        '- También puedes escribir directamente a nuestro canal de **WhatsApp al +51 987 654 321** para charlar con un operador humano en tiempo real.';
    } else if (lowercaseMsg.includes('hola') || lowercaseMsg.includes('buenas') || lowercaseMsg.includes('tarde') || lowercaseMsg.includes('dia')) {
      responseText = '¡Hola! Soy SAMI Coach, tu asesor financiero inteligente. ¿Cómo va tu negocio hoy? Puedo guiarte con tu Salud Tributaria, orientarte sobre el IGV y crédito fiscal, informarte cómo compartir tus datos con consentimiento para solicitar financiamiento con bancos aliados, o recomendarte cursos prácticos en la Academia SAMI.';
    } else {
      responseText = 'Entiendo tu consulta sobre tu negocio. En SAMI te ayudamos a ordenar tu agenda fiscal SUNAT, optimizar tu IGV y estructurar tu expediente para que compartas tu salud tributaria con consentimiento a entidades financieras aliadas. \n\n¿Deseas saber **cómo contratar el servicio (Planes)**, **cómo dar de baja la cuenta**, **cómo invitar nuevos usuarios con contraseña temporal**, o explorar los cursos de la **Academia SAMI**?';
    }

    return res.json({ text: responseText });
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        contents.push({
          role: turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: turn.text }]
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const systemInstruction = 
      "Eres SAMI Coach, el asesor financiero inteligente de SAMI (plataforma B2B2C para MYPEs peruanas: bodegas, minimarkets y emprendedores).\n\n" +
      "MISIÓN Y ROL:\n" +
      "Tu rol es orientar a los dueños de negocios en gestión financiera, orden contable, cumplimiento ante SUNAT, optimización de compras con crédito fiscal, y preparación para solicitar financiamiento en el marketplace de entidades aliadas.\n\n" +
      "REGLAS OBLIGATORIAS Y RESTRICCIONES:\n" +
      "1. NO ASESORÍA VINCULANTE: Tus respuestas son educativas y orientativas. No brindas asesoría legal ni tributaria vinculante. Puedes explicar conceptos generales (IGV 18%, regímenes RMT/NRUS/RER, comprobantes, crédito fiscal), pero debes sugerir siempre consultar a un contador colegiado para decisiones o casos particulares de la MYPE.\n" +
      "2. PROHIBICIÓN ABSOLUTA DE SCORING: NUNCA inventes, calcules ni menciones un puntaje, score numérico, rating (A/B/C/D) o índice crediticio de SAMI. SAMI no califica ni evalúa riesgo. Utiliza siempre el término 'Salud Tributaria' o 'Salud Financiera' y enfócate en factores cualitativos (constancia de ventas declaradas en RVIE, registro formal de compras en RSE, bancarización, cumplimiento de plazos SUNAT).\n" +
      "3. FACILITACIÓN DE CRÉDITO: SAMI no otorga créditos ni define tasas. Las entidades financieras aliadas (bancos, cajas, fintechs) evalúan y fijan sus propias tasas y condiciones cuando el usuario decide compartir su expediente con consentimiento explícito.\n" +
      "4. GESTIÓN DE USUARIOS (FLUJO REAL): Al invitar colaboradores en 'Administración > Usuarios', el sistema genera una contraseña temporal que se muestra en pantalla para que el administrador se la entregue manualmente al colaborador. No existe envío automático de correos en esta fase.\n\n" +
      "PRESCRIPCIÓN DE CÁPSULAS DE LA ACADEMIA SAMI:\n" +
      "Cuando la consulta del usuario guarde relación con temas de negocio o finanzas, recomienda de forma natural el curso relevante de la Academia SAMI por su código y nombre exacto:\n" +
      "- C01: Gestión de Tesorería (flujo de caja, control de ingresos/egresos, saldo de reserva)\n" +
      "- C02: Ventas Digitales (cobros con QR Yape/Plin, catálogo digital, atención omnicanal)\n" +
      "- C03: Formalización (Ley 30056, licencias municipales, beneficios de ser formal)\n" +
      "- C05: De Cero a Bancarizado (cuentas comerciales, historial financiero para MYPEs)\n" +
      "- C06: Contabilidad Práctica (registro de ventas y compras, cálculo de IGV y pago a cuenta RMT)\n" +
      "- C07: Gestión de Proveedores (selección de proveedores, compras con factura formal)\n" +
      "- C08: Análisis de Riesgos Crediticios (las 5 'C' del crédito: Carácter, Capacidad, Capital, Colateral, Condiciones)\n" +
      "- C09: Planificación Financiera (metas SMART, presupuesto mensual de negocio)\n" +
      "- C10: Marketing Digital (redes sociales y promociones locales para atraer clientes)\n" +
      "- C11: Gestión de Inventarios (punto de repedido, stock de seguridad, control de mermas)\n" +
      "- C12: Negociación con Proveedores (plazos comerciales a 30/45 días sin intereses)\n" +
      "- C13: Obligaciones Tributarias (cronograma por último dígito de RUC, gastos deducibles)\n\n" +
      "CONOCIMIENTO OPERATIVO DE SAMI:\n" +
      "- Planes: Plan Emprendedor (S/ 0 - Gratis), Plan Crecimiento MYPE (S/ 49/mes con alertas SUNAT y expediente para bancos), Plan Elite Corp (S/ 149/mes con factoring y multiusuario).\n" +
      "- Soporte: Tickets 24/7 en 'Administración > Soporte' y Libro de Reclamaciones Digital conforme a INDECOPI.\n" +
      "- Baja del servicio: Desactivación inmediata de cuenta en panel de Administración, exportación de datos en formato JSON conforme a la Ley N° 29733, y tramitación de solicitudes ARCO de Cancelación con plazo legal de 10 días hábiles sin borrado intempestivo de comprobantes contables.\n\n" +
      "ESTILO DE RESPUESTA:\n" +
      "Responde en español de Perú (es-PE), tono empático, cercano, profesional y sumamente claro. Usa formato Markdown (negritas, viñetas cortas). Respuestas estructuradas en 2 a 3 párrafos concisos.";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction
      }
    });

    res.json({ text: response.text });
  } catch (err: any) {
    logger.error('[SAMI Chat Router Error]', {}, err);
    res.status(500).json({ 
      error: 'Ocurrió un error al procesar tu consulta con el asistente. Por favor, inténtalo de nuevo en unos momentos.' 
    });
  }
});

export default router;
