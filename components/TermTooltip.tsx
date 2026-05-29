// components/TermTooltip.tsx
import React, { useState } from 'react';

const TERMS: Record<string, string> = {
  'IGV': 'Impuesto General a las Ventas (18%). Es el impuesto que cobras en tus ventas y que debes entregar a SUNAT.',
  'SAMI Score': 'Tu puntaje financiero. Cuanto más alto, mejores préstamos puedes conseguir. Va de 300 a 850 puntos.',
  'RUC': 'Registro Único de Contribuyentes. Es el número de 11 dígitos que identifica tu negocio ante SUNAT.',
  'Boleta': 'Comprobante de venta para personas naturales. Lo emites cuando te paga un cliente sin empresa.',
  'Factura': 'Comprobante de venta para empresas. Lo emites cuando te compra otra empresa con RUC.',
  'SUNAT': 'La institución del gobierno que cobra impuestos en Perú.',
  'Factoring': 'Opción de cobrar tus facturas por adelantado, a cambio de un pequeño descuento.',
  'PSE': 'Proveedor de Servicios Electrónicos. Una empresa que conecta tu sistema con SUNAT electrónicamente.',
};

const TermTooltip: React.FC<{ term: string; children?: React.ReactNode }> = ({ term, children }) => {
  const [show, setShow] = useState(false);
  const definition = TERMS[term];

  if (!definition) return <>{children || term}</>;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="border-b border-dashed border-brand-400 text-brand-600 dark:text-brand-400 font-semibold cursor-help inline-flex items-center gap-0.5"
        onClick={() => setShow(!show)}
        aria-expanded={show}
      >
        {children || term}
      </button>
      {show && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-2xl leading-relaxed">
          <p className="font-black text-brand-300 mb-1">{term}</p>
          {definition}
          <button 
            type="button" 
            onClick={() => setShow(false)} 
            className="text-slate-400 mt-2 underline text-[10px] block border-0 bg-transparent p-0 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}
    </span>
  );
};

export default TermTooltip;
