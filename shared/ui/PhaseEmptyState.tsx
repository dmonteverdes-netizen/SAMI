import React from 'react';
import { 
  ShieldCheck, 
  Mail, 
  LogOut, 
  Building2, 
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { User, AppRole } from '../../core/types/types';
import { SAMI_COMMERCIAL_EMAIL } from '../../core/config/constants';
import ThemeToggle from '../layout/ThemeToggle';

interface PhaseEmptyStateProps {
  currentUser: User;
  onLogout: () => void;
  commercialEmail?: string;
}

/**
 * Obtiene la denominación institucional según el rol de la cuenta.
 */
const getRoleLabel = (role: AppRole): string => {
  switch (role) {
    case AppRole.BANK_ADMIN:
    case AppRole.BANK_SUPERVISOR:
    case AppRole.BANK_ANALYST:
      return 'Entidad Financiera';
    case AppRole.MYPE_ADMIN:
      return 'Administración MYPE';
    case AppRole.MYPE_WORKER:
      return 'Operador MYPE';
    case AppRole.SAMI_ADMIN:
    case AppRole.SAMI_ANALYST:
      return 'Equipo SAMI';
    default:
      return 'Usuario';
  }
};

/**
 * Pantalla de estado vacío cuando el rol autenticado no cuenta con módulos
 * disponibles en la fase activa del despliegue.
 * 
 * Requisitos de redacción:
 * - Español de Perú, sobrio, sin signos de exclamación.
 * - Sin estimaciones de plazos ni fechas.
 * - Sin detalles ni compromisos operativos o comerciales.
 * - Canal de contacto institucional parametrizado y cierre de sesión operativo.
 */
const PhaseEmptyState: React.FC<PhaseEmptyStateProps> = ({ 
  currentUser, 
  onLogout,
  commercialEmail = SAMI_COMMERCIAL_EMAIL
}) => {
  const roleLabel = getRoleLabel(currentUser.role);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col justify-between text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Barra superior institucional */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">SAMI</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Plataforma MYPE
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <LogOut size={14} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </header>

      {/* Contenedor central */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-sm text-center">
          
          {/* Icono de estado */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center">
            <Building2 size={28} />
          </div>

          {/* Ficha de identidad autenticada */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-medium">{roleLabel}</span>
            <span className="text-slate-400 dark:text-slate-500">•</span>
            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{currentUser.email}</span>
          </div>

          {/* Título y descripción sobria */}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
            Disponible próximamente
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
            El acceso para su perfil se habilitará en la siguiente etapa de despliegue de la plataforma. Para consultas comerciales o coordinaciones institucionales, puede comunicarse con el equipo de SAMI.
          </p>

          {/* Bloque de acciones */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={`mailto:${commercialEmail}?subject=Consulta%20institucional%20-%20SAMI`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Mail size={15} />
              <span>Contactar al equipo comercial</span>
              <ArrowUpRight size={14} className="opacity-80" />
            </a>

            <button
              onClick={onLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
            >
              <LogOut size={14} />
              <span>Cerrar sesión</span>
            </button>
          </div>

          {/* Indicador de contacto directo */}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 font-mono">
            {commercialEmail}
          </p>
        </div>
      </main>

      {/* Pie de página institucional */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>SAMI • Plataforma B2B2C para MYPEs</p>
      </footer>
    </div>
  );
};

export default PhaseEmptyState;
