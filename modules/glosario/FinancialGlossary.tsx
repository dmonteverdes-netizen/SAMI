import React, { useState, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  CheckCircle2, 
  Copy, 
  Check, 
  Share2, 
  Info, 
  Scale, 
  Sparkles, 
  ChevronDown, 
  HelpCircle, 
  Building2, 
  Receipt, 
  TrendingUp,
  FileText
} from 'lucide-react';

export interface GlossaryTerm {
  id: string;
  term: string;
  category: 'Impuestos & SUNAT' | 'Financiamiento & Créditos' | 'Comprobantes Digitales' | 'Gestión & Caja';
  shortDef: string;
  fullDef: string;
  mypeExample: string;
  normativeBasis?: string;
  keyBenefit: string;
  tags: string[];
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'igv-mype',
    term: 'IGV MYPE (Punta o Prórroga del IGV)',
    category: 'Impuestos & SUNAT',
    shortDef: 'Mecanismo legal que permite a las micro y pequeñas empresas postergar el pago del IGV de sus ventas hasta por 3 meses.',
    fullDef: 'Ley N° 30524. Otorga a las MYPES con ventas anuales de hasta 1700 UIT la facultad de diferir la cancelación del Impuesto General a las Ventas (18%) hasta por 3 meses posteriores a la fecha de vencimiento original sin generar intereses moratorios ni multas SUNAT.',
    mypeExample: 'Si emitiste una factura de S/ 10,000 en enero a un cliente que te pagará en 90 días, puedes diferir el pago del IGV (S/ 1,800) hasta abril, protegiendo tu caja mensual.',
    normativeBasis: 'Ley N° 30524 y D.S. N° 026-2017-EF',
    keyBenefit: 'Evita el descalce de caja al no tener que pagar el IGV de facturas emitidas al crédito aún no cobradas.',
    tags: ['IGV', 'MYPE', 'SUNAT', 'Prórroga', 'Caja']
  },
  {
    id: 'regimen-mype-tributario',
    term: 'Régimen MYPE Tributario (RMT)',
    category: 'Impuestos & SUNAT',
    shortDef: 'Régimen tributario diseñado para micro y pequeñas empresas que otorga tasas progresivas del Impuesto a la Renta.',
    fullDef: 'Creado mediante Decreto Legislativo N° 1269. Aplica a contribuyentes domiciliados en el Perú cuyos ingresos netos no superen las 1,700 UIT en el ejercicio gravable. Las primeras 15 UIT de utilidad tributan solo una tasa del 10% de Impuesto a la Renta anual (en lugar del 29.5%).',
    mypeExample: 'Una MYPE con utilidad neta de S/ 50,000 al año (aproximadamente 9.6 UIT) pagará el 10% de Impuesto a la Renta (S/ 5,000) aprovechando la tasa preferencial del RMT.',
    normativeBasis: 'Decreto Legislativo N° 1269 y D.S. N° 403-2016-EF',
    keyBenefit: 'Reducción sustancial del costo tributario sobre ganancias en comparación al Régimen General.',
    tags: ['RMT', 'Impuesto a la Renta', 'Regímenes', 'UIT', 'SUNAT']
  },
  {
    id: 'credito-fiscal-igv',
    term: 'Crédito Fiscal del IGV',
    category: 'Impuestos & SUNAT',
    shortDef: 'Monto del IGV pagado en compras de bienes y servicios directamente vinculados al giro del negocio que descuenta el IGV a pagar.',
    fullDef: 'Es el derecho que tiene la empresa de descontar del IGV cobrado en sus ventas (débito fiscal) el IGV pagado en sus compras con facturas válidas. Para ser deducible, debe cumplir el principio de causalidad y estar bancarizado si supera el monto mínimo legal.',
    mypeExample: 'Si cobraste S/ 3,600 de IGV en ventas y pagaste S/ 2,000 de IGV en compras de insumos para tu empresa, solo pagarás a SUNAT la diferencia neta de S/ 1,600.',
    normativeBasis: 'Texto Único Ordenado de la Ley del IGV (D.S. N° 055-99-EF, Art. 18 y 19)',
    keyBenefit: 'Ahorro tributario directo y legal mediante la correcta sustentación de compras operativas.',
    tags: ['Crédito Fiscal', 'IGV', 'Deducción', 'Factura', 'Compras']
  },
  {
    id: 'factura-electronica',
    term: 'Factura Electrónica (Comprobante Digital)',
    category: 'Comprobantes Digitales',
    shortDef: 'Documento tributario emitido en formato digital (XML/PDF) con validez legal para sustentar costo, gasto y crédito fiscal.',
    fullDef: 'Comprobante de pago emitido a través de Sistemas de Emisión Electrónica (SEE-SUNAT, SEE-DEL, SEE-PSE). Contiene firma digital y código QR de verificación. Es obligatorio para transacciones entre personas jurídicas o negocios con RUC.',
    mypeExample: 'Emitir una factura F001-00000123 a través del portal SOL o de SAMI genera automáticamente un archivo XML enviado a SUNAT para registro tributario en tiempo real.',
    normativeBasis: 'Resolución de Superintendencia N° 097-2012/SUNAT y modificaciones',
    keyBenefit: 'Automatización del registro contable, validez legal para factoring y reducción de costos de impresión.',
    tags: ['Factura', 'Comprobante', 'XML', 'SEE', 'SUNAT']
  },
  {
    id: 'detracciones-spot',
    term: 'Detracciones del IGV (Sistema SPOT)',
    category: 'Impuestos & SUNAT',
    shortDef: 'Mecanismo donde el comprador descuenta un porcentaje del pago total y lo deposita en la cuenta Banco de la Nación del proveedor.',
    fullDef: 'El Sistema de Pago de Obligaciones Tributarias (SPOT) aplica a bienes y servicios específicos definidos por SUNAT (servicios empresariales, transporte, construcción). El comprador retiene un porcentaje (ej. 10% o 12%) y lo abona en la cuenta de detracciones del proveedor.',
    mypeExample: 'Al facturar un servicio de mantenimiento por S/ 1,000 con detracción del 12%, tu cliente te deposita S/ 880 a tu cuenta comercial y S/ 120 a tu cuenta del Banco de la Nación para tributos.',
    normativeBasis: 'Texto Único Ordenado del D. Leg. N° 940 (D.S. N° 155-2004-EF)',
    keyBenefit: 'Garantiza fondos exclusivos en la cuenta del Banco de la Nación para la cancelación automática de impuestos SUNAT.',
    tags: ['Detracciones', 'SPOT', 'Banco de la Nación', 'Porcentaje', 'SUNAT']
  },
  {
    id: 'retenciones-igv',
    term: 'Retenciones del IGV',
    category: 'Impuestos & SUNAT',
    shortDef: 'Régimen donde empresas designadas como Agentes de Retención por SUNAT retienen el 3% del pago a sus proveedores.',
    fullDef: 'Mecanismo en el que el comprador (designado como Agente de Retención) retiene el 3% del importe total de la operación en compras mayores a S/ 700 y emite un Comprobante de Retención Electrónico. El proveedor utiliza este saldo como pago a cuenta de su IGV.',
    mypeExample: 'Si le vendes S/ 5,000 a una gran corporación (agente de retención), te pagarán S/ 4,850 en efectivo y te entregarán un certificado de retención por S/ 150 para aplicar en tu IGV del mes.',
    normativeBasis: 'Resolución de Superintendencia N° 037-2002/SUNAT',
    keyBenefit: 'Permite acumular pagos a cuenta del IGV que reducen la deuda al momento de la declaración mensual.',
    tags: ['Retenciones', 'Agente de Retención', 'Comprobante', '3%', 'SUNAT']
  },
  {
    id: 'factoring-mype',
    term: 'Factoring (Adelanto de Facturas por Cobrar)',
    category: 'Financiamiento & Créditos',
    shortDef: 'Herramienta financiera para convertir facturas negociables a plazo de 30, 60 o 90 días en efectivo inmediato.',
    fullDef: 'Venta o cesión de los derechos de cobro de facturas comerciales a una empresa de factoring o entidad financiera supervisada por la SBS. La entidad adelanta entre el 85% y 95% del valor neto de la factura cobrando un descuento o TCEA preferencial.',
    mypeExample: 'Tienes una factura de S/ 20,000 por cobrar en 60 días de un supermercado. Mediante Factoring, recibes S/ 19,400 en 24 horas para reponer inventario sin endeudamiento tradicional.',
    normativeBasis: 'Ley N° 29623 (Ley de la Factura Negociable) y D.S. N° 208-2015-EF',
    keyBenefit: 'Genera liquidez inmediata sin requerir garantías reales ni sobrecargar tus líneas de crédito bancarias.',
    tags: ['Factoring', 'Liquidez', 'Factura Negociable', 'SBS', 'Financiamiento']
  },
  {
    id: 'tcea-credito',
    term: 'TCEA (Tasa Costo Efectivo Anual)',
    category: 'Financiamiento & Créditos',
    shortDef: 'Tasa transparente que refleja el costo total real de un préstamo financiero incluyendo intereses, comisiones y seguros.',
    fullDef: 'Métrica estandarizada por la Ley de Transparencia Financiera de la SBS. Resume todo lo que terminarás pagando por un crédito: la Tasa de Interés Compensatorio Efectiva Anual (TEA), comisiones de evaluación, seguros de desgravamen y portes.',
    mypeExample: 'Si dos bancos te ofrecen un préstamo MYPE con la misma tasa de interés (TEA 20%), pero el Banco A cobra comisiones altas (TCEA 28%) y el Banco B no (TCEA 22%), el Banco B es considerablemente más barato.',
    normativeBasis: 'Resolución SBS N° 3274-2017 (Reglamento de Gestión de Conducta de Mercado)',
    keyBenefit: 'Permite comparar objetivamente el costo real entre distintas ofertas de microcrédito.',
    tags: ['TCEA', 'Interés', 'SBS', 'Costo Real', 'Préstamo']
  },
  {
    id: 'trea-ahorro',
    term: 'TREA (Tasa Rendimiento Efectivo Anual)',
    category: 'Financiamiento & Créditos',
    shortDef: 'Rendimiento efectivo real que ganará tu dinero en una cuenta de ahorros o depósito a plazo fijo deduciendo comisiones.',
    fullDef: 'Tasa calculada conforme a la normativa SBS que expresa el rendimiento neto anual de un depósito de ahorro. Considera la TEA ganada menos los mantenimientos de cuenta y costos operativos aplicables.',
    mypeExample: 'Si depositas el excedente de caja de tu empresa en una cuenta a plazo fijo con TREA de 6.5% anual sin mantenimiento, obtendrás exactamente S/ 650 de ganancia por cada S/ 10,000 al año.',
    normativeBasis: 'Normativa de Transparencia del Sistema Financiero SBS',
    keyBenefit: 'Garantiza visibilidad del crecimiento neto del excedente de caja depositado en entidades financieras.',
    tags: ['TREA', 'Ahorro', 'Plazo Fijo', 'Rendimiento', 'SBS']
  },
  {
    id: 'solvencia-fiscal-mype',
    term: 'Salud Tributaria y Solvencia Fiscal',
    category: 'Gestión & Caja',
    shortDef: 'Indicador de madurez y consistencia en la declaración y pago puntual de tributos SUNAT, clave para acceder a créditos.',
    fullDef: 'Consolidado analítico que evalúa el cumplimiento de declaraciones mensuales (PDT/Declara Fácil), la consistencia entre compras y ventas registradas, la ausencia de coactivas y la proporción de comprobantes formales.',
    mypeExample: 'Presentar tus declaraciones mensuales antes de la fecha de vencimiento SUNAT y mantener tus facturas de compras bancarizadas eleva tu evaluación de salud tributaria, otorgándote acceso a tasas crediticias preferenciales.',
    normativeBasis: 'Criterios de Evaluación Risk Scoring SBS & SUNAT',
    keyBenefit: 'Mejora automáticamente el perfil de riesgo crediticio ante entidades financieras supervisadas.',
    tags: ['Salud Tributaria', 'Solvencia', 'SUNAT', 'Evaluación', 'Riesgo']
  },
  {
    id: 'uit-referencia',
    term: 'UIT (Unidad Impositiva Tributaria)',
    category: 'Impuestos & SUNAT',
    shortDef: 'Valor en Soles fijado anualmente por el MEF para determinar impuestos, multas y topes de regímenes tributarios.',
    fullDef: 'Unidad de medida oficial establecida mediante Decreto Supremo del Ministerio de Economía y Finanzas (MEF). Sirve como base imponible y límite legal para categorizar regímenes como el RMT (hasta 1,700 UIT) o el Nuevo RUS (hasta 96 UIT anuales).',
    mypeExample: 'Si la UIT es S/ 5,350 en 2026, el tope de 1,700 UIT para permanecer en el Régimen MYPE Tributario equivale a S/ 9,095,000 en ventas anuales.',
    normativeBasis: 'Decreto Supremo anual de fijación de la UIT - MEF Perú',
    keyBenefit: 'Estandariza los parámetros de categorización y deducciones tributarias en el Perú.',
    tags: ['UIT', 'MEF', 'Parámetro', 'Límite', 'SUNAT']
  },
  {
    id: 'sire-libros-electronicos',
    term: 'SIRE (Sistema Integrado de Registros Electrónicos)',
    category: 'Comprobantes Digitales',
    shortDef: 'Plataforma web/móvil de SUNAT que propone automáticamente el Registro de Ventas e Ingresos (RVIE) y de Compras (RCE).',
    fullDef: 'Sistema obligatorio que reemplaza al PLE (Programa de Libros Electrónicos). SUNAT elabora una propuesta automatizada de los registros a partir de los comprobantes de pago electrónicos emitidos y recibidos por el contribuyente.',
    mypeExample: 'Al final del mes, ingresas al SIRE y revisas la propuesta de Registro de Compras realizada por SUNAT para validar o complementar facturas antes de cerrar el periodo.',
    normativeBasis: 'Resolución de Superintendencia N° 112-2021/SUNAT y modificaciones',
    keyBenefit: 'Elimina el tipeo manual de libros contables y minimiza discrepancias informativas con SUNAT.',
    tags: ['SIRE', 'RVIE', 'RCE', 'Libros Electrónicos', 'SUNAT']
  },
  {
    id: 'bancarizacion-itf',
    term: 'Bancarización e Impuesto ITF',
    category: 'Gestión & Caja',
    shortDef: 'Obligación de efectuar pagos mediante bancos o entidades financieras a partir de S/ 2,000 o US$ 500 para sustentar costo/gasto.',
    fullDef: 'Ley N° 28194. Establece que los pagos iguales o superiores a S/ 2,000 o $500 deben efectuarse con Medios de Pago Financieros (transferencia, cheque, depósito en cuenta, tarjeta). Las operaciones están gravadas con el 0.005% del Impuesto a las Transacciones Financieras (ITF).',
    mypeExample: 'Si compras mercadería por S/ 3,500 y la pagas en efectivo en ventanilla, perderás el derecho al crédito fiscal del IGV y al costo deducible para el Impuesto a la Renta.',
    normativeBasis: 'Texto Único Ordenado de la Ley N° 28194 (D.S. N° 150-2007-EF)',
    keyBenefit: 'Protege la deducción fiscal del crédito de compras ante fiscalizaciones de SUNAT.',
    tags: ['Bancarización', 'ITF', 'Medios de Pago', 'Transferencia', 'SUNAT']
  },
  {
    id: 'flujo-caja-operativo',
    term: 'Flujo de Caja Operativo',
    category: 'Gestión & Caja',
    shortDef: 'Registro real de los ingresos y egresos de dinero generados por las operaciones cotidianas del negocio.',
    fullDef: 'Muestra la liquidez neta generada exclusivamente por las actividades operativas principales (cobros por ventas menos pagos a proveedores, planilla e impuestos). Es distinto a la utilidad contable porque mide dinero disponible, no devengos.',
    mypeExample: 'Tener utilidades en el papel de S/ 15,000 no sirve si todas tus facturas están al crédito y te quedas con S/ 0 en cuenta bancaria para pagar el alquiler a fin de mes.',
    normativeBasis: 'Principios de Finanzas Corporativas y Contabilidad Operativa',
    keyBenefit: 'Previene quiebras por iliquidez temporal mediante la medición de la capacidad real de pago.',
    tags: ['Flujo de Caja', 'Liquidez', 'Caja', 'Operaciones', 'Cobranza']
  }
];

export const FINANCIAL_FAQ = [
  {
    question: '¿Cuál es la diferencia entre Factura y Boleta de Venta en Perú?',
    answer: 'La Factura Electrónica se emite a clientes que cuentan con RUC empresarial y necesitan deducir gastos o utilizar el Crédito Fiscal del IGV (18%). La Boleta de Venta se emite a consumidores finales (personas naturales) que no requieren crédito tributario.'
  },
  {
    question: '¿Cómo funciona la prórroga del IGV MYPE en la práctica?',
    answer: 'Si tu MYPE vende menos de 1,700 UIT al año, al presentar la declaración mensual en Declara Fácil SUNAT, seleccionas la opción "Prórroga del IGV". Esto pospone la fecha límite de pago del impuesto por 3 meses, dándote margen de liquidez si vendiste al crédito.'
  },
  {
    question: '¿Qué requisitos exige un banco o entidad financiera para aprobar un crédito MYPE?',
    answer: 'Las entidades evalúan tu Salud Tributaria (orden en declaraciones SUNAT), el promedio de ventas bancarizadas o declaradas en comprobantes electrónicos, la estabilidad del flujo de caja y la ausencia de deudas coactivas en la Central de Riesgos SBS.'
  },
  {
    question: '¿Por qué es importante bancarizar las compras mayores a S/ 2,000?',
    answer: 'Porque SUNAT desconoce el Crédito Fiscal del IGV y el costo deducible para el Impuesto a la Renta de cualquier compra superior a S/ 2,000 o US$ 500 pagada en efectivo sin medio bancario acreditado.'
  }
];

export const FinancialGlossary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [expandedTermId, setExpandedTermId] = useState<string | null>('igv-mype');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const categories = ['Todos', 'Impuestos & SUNAT', 'Financiamiento & Créditos', 'Comprobantes Digitales', 'Gestión & Caja'];

  // Unique starting letters
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    GLOSSARY_TERMS.forEach(t => {
      const first = t.term.charAt(0).toUpperCase();
      if (/[A-Z]/.test(first)) set.add(first);
    });
    return Array.from(set).sort();
  }, []);

  const filteredTerms = useMemo(() => {
    return GLOSSARY_TERMS.filter(item => {
      const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
      const matchesLetter = !activeLetter || item.term.charAt(0).toUpperCase() === activeLetter;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        item.term.toLowerCase().includes(searchLower) ||
        item.shortDef.toLowerCase().includes(searchLower) ||
        item.fullDef.toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower));

      return matchesCategory && matchesLetter && matchesSearch;
    });
  }, [searchTerm, selectedCategory, activeLetter]);

  const handleCopy = (term: GlossaryTerm) => {
    const textToCopy = `📌 ${term.term}\n${term.shortDef}\n\nExplicación: ${term.fullDef}\nEjemplo MYPE: ${term.mypeExample}\nFuente: SAMI Fintech MYPE Perú (Glosario E-E-A-T)`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(term.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Structured Data (JSON-LD) for E-E-A-T Search & AI Indexing
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "name": "Glosario Financiero y Tributario MYPE Perú",
    "description": "Diccionario oficial de términos tributarios SUNAT, contables y crediticios SBS para micro y pequeñas empresas en el Perú.",
    "publisher": {
      "@type": "Organization",
      "name": "SAMI Fintech Perú",
      "url": "https://sami.pe"
    },
    "hasDefinedTerm": GLOSSARY_TERMS.map(t => ({
      "@type": "DefinedTerm",
      "name": t.term,
      "description": t.shortDef,
      "inDefinedTermSet": "Glosario Financiero MYPE",
      "termCode": t.id
    }))
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Head Injection for AI & SEO Crawlers */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden border border-indigo-800/50">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-4 h-4 text-amber-300" />
            Glosario Verificado E-E-A-T & Core AI Knowledge
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Glosario Financiero y Tributario MYPE
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Conceptos clave sobre la <strong className="text-amber-300 font-bold">prórroga del IGV MYPE</strong>, regímenes SUNAT, comprobantes electrónicos y normas de la SBS explicados con rigor técnico, sencillez práctica y respaldo normativo.
          </p>

          {/* E-E-A-T Badges */}
          <div className="pt-2 flex flex-wrap gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Basado en Leyes SUNAT & SBS
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Scale className="w-4 h-4 text-blue-400" />
              Verificado por Especialistas
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Fuente Indexable para IA
            </span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search Bar */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar término (ej. IGV MYPE, Factura, TCEA)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Alphabetical A-Z Filter Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mr-1">Índice:</span>
          <button
            onClick={() => setActiveLetter(null)}
            className={`px-2 py-1 rounded-md font-bold transition-colors ${
              activeLetter === null
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos
          </button>
          {availableLetters.map(letter => (
            <button
              key={letter}
              onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
              className={`w-7 h-7 flex items-center justify-center rounded-md font-mono text-xs transition-colors ${
                activeLetter === letter
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Glossary Terms List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>Mostrando <strong>{filteredTerms.length}</strong> de {GLOSSARY_TERMS.length} términos definidos</span>
          {selectedCategory !== 'Todos' && <span className="font-medium text-indigo-600 dark:text-indigo-400">Categoría: {selectedCategory}</span>}
        </div>

        {filteredTerms.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center space-y-3 border border-slate-200 dark:border-slate-700">
            <Info className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">No se encontraron términos</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Intenta cambiar la palabra de búsqueda o seleccionar otra categoría del glosario.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('Todos'); setActiveLetter(null); }}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              Restablecer todos los filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTerms.map((item) => {
              const isExpanded = expandedTermId === item.id;
              return (
                <article
                  key={item.id}
                  id={`term-${item.id}`}
                  className={`bg-white dark:bg-slate-800/90 rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded 
                      ? 'border-indigo-500/50 dark:border-indigo-500/40 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/20' 
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
                  }`}
                >
                  {/* Card Header Header */}
                  <div 
                    onClick={() => setExpandedTermId(isExpanded ? null : item.id)}
                    className="p-5 sm:p-6 cursor-pointer flex items-start justify-between gap-4 select-none"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                          {item.category}
                        </span>
                        {item.id === 'igv-mype' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            ★ Concepto Destacado
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                        {item.term}
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        {item.shortDef}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item);
                        }}
                        title="Copiar definición"
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <div className={`p-1.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-600' : ''}`}>
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detailed Content */}
                  {isExpanded && (
                    <div className="px-5 pb-6 sm:px-6 space-y-5 border-t border-slate-100 dark:border-slate-700/60 pt-5 bg-slate-50/50 dark:bg-slate-900/30">
                      {/* Deep Explanation */}
                      <div className="space-y-1.5">
                        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          Explicación Normativa y Técnica
                        </h3>
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                          {item.fullDef}
                        </p>
                      </div>

                      {/* Practical MYPE Example */}
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5" />
                          Ejemplo Práctico para tu MYPE
                        </div>
                        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                          {item.mypeExample}
                        </p>
                      </div>

                      {/* Grid: Normative Basis & Key Benefit */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {item.normativeBasis && (
                          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                            <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Scale className="w-3.5 h-3.5 text-blue-500" />
                              Base Legal Normativa:
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 font-mono font-medium block">
                              {item.normativeBasis}
                            </span>
                          </div>
                        )}
                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                          <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Beneficio Clave para el Negocio:
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium block">
                            {item.keyBenefit}
                          </span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Etiquetas:</span>
                        {item.tags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setSearchTerm(tag)}
                            className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-mono hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-950 transition-colors"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Structured FAQ Section (E-E-A-T & Search Indexing) */}
      <section className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            Preguntas Frecuentes Tributarias
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Dudas comunes sobre tributación e impuestos MYPE en Perú
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FINANCIAL_FAQ.map((faq, index) => (
            <div 
              key={index}
              className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2"
            >
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-start gap-2">
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-black">Q{index + 1}.</span>
                {faq.question}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Assistant Integration Banner */}
      <div className="bg-slate-900 border border-indigo-900/50 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg font-bold">¿Tienes dudas adicionales sobre tus impuestos SUNAT?</h3>
          <p className="text-xs text-slate-300">
            Pregúntale a SAMI AI en tiempo real para obtener asesoría contable automatizada adaptada a tus facturas.
          </p>
        </div>
        <a
          href="#chat"
          onClick={(e) => {
            e.preventDefault();
            const chatBtn = document.querySelector('[data-view="chat"]') as HTMLElement;
            if (chatBtn) chatBtn.click();
          }}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 whitespace-nowrap"
        >
          Consultar a SAMI AI →
        </a>
      </div>
    </div>
  );
};

export default FinancialGlossary;
