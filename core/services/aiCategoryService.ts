export interface CategorySuggestion {
  category: string;
  confidence: number;
  reason: string;
  alternativeCategories?: string[];
  source?: string;
}

/**
 * AI utility function that parses the text content of new purchases
 * and suggests an expense category automatically before the user saves the expense.
 */
export const suggestPurchaseCategory = async (
  textContent: string,
  extraCtx?: { ruc?: string; vendorName?: string; totalAmount?: number }
): Promise<CategorySuggestion> => {
  if (!textContent || textContent.trim().length === 0) {
    return {
      category: 'Otros Gastos',
      confidence: 0,
      reason: 'Ingrese el detalle o descripción del comprobante de compra para que la IA sugiera una categoría automáticamente.',
      alternativeCategories: ['Mercadería y Suministros']
    };
  }

  try {
    const res = await fetch('/api/v1/expenses/suggest-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textContent: textContent.trim(),
        ruc: extraCtx?.ruc,
        vendorName: extraCtx?.vendorName,
        totalAmount: extraCtx?.totalAmount
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          category: data.category,
          confidence: data.confidence,
          reason: data.reason,
          alternativeCategories: data.alternativeCategories || [],
          source: data.source
        };
      }
    }
  } catch (err) {
    console.warn('[AI Category Service] Server endpoint call failed, applying client heuristic:', err);
  }

  // Client-side fallback if server is unreachable
  const lower = textContent.toLowerCase();
  if (/flete|transporte|envio|despacho|gasolina|combustible|peaje|encomienda|logistica|carga/i.test(lower)) {
    return {
      category: 'Logística y Transporte',
      confidence: 0.92,
      reason: 'Detectado servicio de traslado, flete o despacho de mercadería.',
      alternativeCategories: ['Servicios Públicos', 'Otros Gastos']
    };
  }
  if (/luz|agua|internet|telefono|sedapal|enel|claro|movistar|entel|recibo/i.test(lower)) {
    return {
      category: 'Servicios Públicos',
      confidence: 0.94,
      reason: 'Detectado pago de servicios públicos o telecomunicaciones.',
      alternativeCategories: ['Alquileres y Oficinas']
    };
  }
  if (/harina|materia|insumo|saco|mercaderia|tela|hilo|alimento|producto|stock|carne|verdura/i.test(lower)) {
    return {
      category: 'Mercadería y Suministros',
      confidence: 0.93,
      reason: 'Detectada adquisición de materias primas o productos para inventario.',
      alternativeCategories: ['Otros Gastos']
    };
  }
  if (/software|hosting|dominio|licencia|laptop|impresora|computador|app|cloud|sistema/i.test(lower)) {
    return {
      category: 'Tecnología y Software',
      confidence: 0.91,
      reason: 'Detectada compra de licencias, equipamiento de cómputo o software.',
      alternativeCategories: ['Servicios Públicos']
    };
  }
  if (/alquiler|arriendo|local|oficina|mueble|escritorio|papel|silla/i.test(lower)) {
    return {
      category: 'Alquileres y Oficinas',
      confidence: 0.89,
      reason: 'Detectado gasto de alquiler de espacio comercial o papelería.',
      alternativeCategories: ['Servicios Públicos']
    };
  }
  if (/facebook|instagram|ads|publicidad|marketing|banner|volante|diseno/i.test(lower)) {
    return {
      category: 'Marketing y Ventas',
      confidence: 0.90,
      reason: 'Detectada inversión en pauta publicitaria o material promocional.',
      alternativeCategories: ['Otros Gastos']
    };
  }

  return {
    category: 'Otros Gastos',
    confidence: 0.70,
    reason: 'Categoría por defecto para comprobantes generales.',
    alternativeCategories: ['Mercadería y Suministros']
  };
};
