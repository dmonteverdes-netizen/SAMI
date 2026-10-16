import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CreditCard, 
  FileText, 
  LifeBuoy, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Download, 
  Send, 
  Clock, 
  FileCheck, 
  UserPlus, 
  AlertTriangle, 
  Activity, 
  ArrowRight, 
  HelpCircle,
  TrendingUp,
  Sliders,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, AppRole } from '../../types';
import { logAdminAction } from '../../services/auditService';
import { showLocalPushNotification } from '../../services/pushNotificationService';
import { encryptData, decryptData } from '../../services/encryptionService';

interface ManagementModuleProps {
  currentUser: User;
  onNavigate?: (view: any) => void;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Activo' | 'Pendiente' | 'Inactivo';
  lastActive: string;
}

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  category: 'Facturación' | 'Salud Tributaria' | 'Acceso' | 'Créditos' | 'General';
  priority: 'Alta' | 'Media' | 'Baja';
  status: 'Abierto' | 'En Proceso' | 'Resuelto';
  createdAt: string;
  slaHours: number;
}

interface IndecopiClaim {
  id: string;
  ruc: string;
  fullName: string;
  type: 'Reclamo' | 'Queja';
  description: string;
  status: 'Presentado' | 'Bajo Revisión' | 'Atendido';
  createdAt: string;
}

interface CompanyInvoice {
  id: string;
  period: string;
  plan: string;
  amount: number;
  dueDate: string;
  status: 'Pagado' | 'Vencido' | 'Pendiente';
}

interface SystemAuditLog {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  ip: string;
  module: 'Usuarios' | 'Suscripciones' | 'Soporte' | 'Reclamos' | 'Trazabilidad';
}

export const ManagementModule: React.FC<ManagementModuleProps> = ({ currentUser, onNavigate }) => {
  const isMypeAdmin = currentUser.role === AppRole.MYPE_ADMIN;
  const isBankAdmin = currentUser.role.startsWith('BANK_');
  const isSamiCoreAdmin = currentUser.role === AppRole.SAMI_ADMIN;

  // Tabs structure based on roles
  const availableTabs = useMemo(() => {
    const tabs = [];
    tabs.push({ id: 'users', label: 'Usuarios', icon: <Users size={16} /> });
    tabs.push({ id: 'billing', label: isMypeAdmin ? 'Planes y Facturas' : 'Consumos API', icon: <CreditCard size={16} /> });
    tabs.push({ id: 'tickets', label: 'Soporte y Tickets', icon: <LifeBuoy size={16} /> });
    tabs.push({ id: 'claims', label: 'Libro Reclamaciones', icon: <FileText size={16} /> });
    tabs.push({ id: 'audit', label: 'Trazabilidad Logs', icon: <Activity size={16} /> });
    return tabs;
  }, [isMypeAdmin]);

  const [activeTab, setActiveTab] = useState<string>('users');

  // --- Dynamic Persistent States ---

  // 1. Users list
  const [users, setUsers] = useState<AdminUser[]>(() => {
    const stored = localStorage.getItem('sami_manage_users');
    if (stored) {
      try {
        if (stored.startsWith('sami_v1:')) {
          return decryptData<AdminUser[]>(stored);
        }
        return JSON.parse(stored);
      } catch { /* Fallback */ }
    }
    
    // Default mock data matching realistic roles
    return [
      { id: 'u-1', name: 'Carlos Contreras', email: 'carlos.contreras@gamarramype.pe', role: 'MYPE Worker', status: 'Activo', lastActive: 'Ayer, 18:42' },
      { id: 'u-2', name: 'Ana Ramírez', email: 'aramirez.contadora@gmail.com', role: 'Contador Externo', status: 'Activo', lastActive: 'Hoy, 09:12' },
      { id: 'u-3', name: 'Roberto Carlos Cruz', email: 'roberto.cruz@gamarramype.pe', role: 'Administrador MYPE', status: 'Activo', lastActive: 'Ahora mismo' },
      { id: 'u-4', name: 'Mariela Alva', email: 'm.alva@gamarramype.pe', role: 'MYPE Worker', status: 'Pendiente', lastActive: '-' }
    ];
  });

  // 2. Tickets
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    const stored = localStorage.getItem('sami_manage_tickets');
    if (stored) {
      try {
        if (stored.startsWith('sami_v1:')) {
          return decryptData<SupportTicket[]>(stored);
        }
        return JSON.parse(stored);
      } catch { /* Fallback */ }
    }

    return [
      { id: 'SAMI-TCK-9281', title: 'Error al sincronizar factura F001-492', description: 'El sistema de compras rechaza registrar la factura indicando RUC proveedor incompleto.', category: 'Facturación', priority: 'Alta', status: 'Resuelto', createdAt: '2026-05-18T14:20:00Z', slaHours: 2 },
      { id: 'SAMI-TCK-9830', title: 'Consulta sobre desembolso factoring Caja Huancayo', description: 'Se solicitó adelanto de factura de mercadería hace 24 horas y aún figura en revisión bancaria.', category: 'Créditos', priority: 'Alta', status: 'En Proceso', createdAt: '2026-05-24T10:05:00Z', slaHours: 2 }
    ];
  });

  // 3. INDECOPI Claims
  const [claims, setClaims] = useState<IndecopiClaim[]>(() => {
    const stored = localStorage.getItem('sami_manage_claims');
    if (stored) {
      try {
        if (stored.startsWith('sami_v1:')) {
          return decryptData<IndecopiClaim[]>(stored);
        }
        return JSON.parse(stored);
      } catch { /* Fallback */ }
    }

    return [
      { id: 'SAMI-RECL-2026-01', ruc: '20123456789', fullName: 'Roberto Carlos Cruz', type: 'Reclamo', description: 'Por demora técnica en actualización de la evaluación de Salud Tributaria durante la evaluación bancaria.', status: 'Atendido', createdAt: '2026-04-10T11:00:00Z' }
    ];
  });

  // 4. Invoices
  const [invoices, setInvoices] = useState<CompanyInvoice[]>(() => {
    const stored = localStorage.getItem('sami_manage_invoices');
    if (stored) {
      try {
        if (stored.startsWith('sami_v1:')) {
          return decryptData<CompanyInvoice[]>(stored);
        }
        return JSON.parse(stored);
      } catch { /* Fallback */ }
    }

    return [
      { id: 'SAMI-INV-2026-03', period: 'Marzo 2026', plan: 'Plan Crecimiento MYPE', amount: 49.00, dueDate: '2026-04-05', status: 'Pagado' },
      { id: 'SAMI-INV-2026-04', period: 'Abril 2026', plan: 'Plan Crecimiento MYPE', amount: 49.00, dueDate: '2026-05-05', status: 'Pagado' },
      { id: 'SAMI-INV-2026-05', period: 'Mayo 2026', plan: 'Plan Crecimiento MYPE', amount: 49.00, dueDate: '2026-06-05', status: 'Pendiente' }
    ];
  });

  // 5. Audit logs list
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => {
    const stored = localStorage.getItem('sami_manage_logs');
    if (stored) {
      try {
        if (stored.startsWith('sami_v1:')) {
          return decryptData<SystemAuditLog[]>(stored);
        }
        return JSON.parse(stored);
      } catch { /* Fallback */ }
    }

    return [
      { id: 'LOG-8812', timestamp: '2026-05-28T09:12:00Z', username: 'Roberto Carlos Cruz', action: 'Invitó nuevo usuario: Mariela Alva (Worker)', ip: '190.235.12.84', module: 'Usuarios' },
      { id: 'LOG-8824', timestamp: '2026-05-28T09:30:11Z', username: 'Roberto Carlos Cruz', action: 'Accedió a módulo de optimización de IGV', ip: '190.235.12.84', module: 'Trazabilidad' },
      { id: 'LOG-8828', timestamp: '2026-05-28T09:42:04Z', username: 'Ana Ramírez', action: 'Descargó Reporte de Salud Financiera PDF', ip: '200.48.91.22', module: 'Trazabilidad' }
    ];
  });

  // Save states to localstorage securely to satisfy System Auditing standards (PCI-DSS & SBS)
  useEffect(() => {
    try { localStorage.setItem('sami_manage_users', encryptData(users)); } catch {}
  }, [users]);

  useEffect(() => {
    try { localStorage.setItem('sami_manage_tickets', encryptData(tickets)); } catch {}
  }, [tickets]);

  useEffect(() => {
    try { localStorage.setItem('sami_manage_claims', encryptData(claims)); } catch {}
  }, [claims]);

  useEffect(() => {
    try { localStorage.setItem('sami_manage_invoices', encryptData(invoices)); } catch {}
  }, [invoices]);

  useEffect(() => {
    try { localStorage.setItem('sami_manage_logs', encryptData(auditLogs)); } catch {}
  }, [auditLogs]);


  // --- Support Ticket Form Modals State ---
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({ title: '', category: 'General', priority: 'Media', description: '' });

  // --- INDECOPI Form State ---
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({ type: 'Reclamo', ruc: '20123456789', fullName: 'Roberto Carlos Cruz', description: '' });

  // --- Add User Form State ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'MYPE Worker' });

  // --- Deactivation State ---
  const [isDeactivatingModalOpen, setIsDeactivatingModalOpen] = useState(false);
  const [deactivatingConfirmed, setDeactivatingConfirmed] = useState(false);

  // --- Operation handlers ---
  const handleInviteUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) return;

    const newUser: AdminUser = {
      id: `u-${Math.floor(1000 + Math.random() * 9000)}`,
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      status: 'Pendiente',
      lastActive: '-'
    };

    setUsers(prev => [...prev, newUser]);
    
    // Log trace
    const newLog: SystemAuditLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      username: currentUser.name,
      action: `Invitó usuario: ${newUser.name} (${newUser.role})`,
      ip: '192.168.1.5',
      module: 'Usuarios'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    logAdminAction(currentUser, `Gestión: Invitó usuario ${newUser.name} con rol ${newUser.role}`);

    setIsUserModalOpen(false);
    setUserForm({ name: '', email: '', role: 'MYPE Worker' });
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'Activo' ? 'Inactivo' : 'Activo';
        
        // Log trace
        const newLog: SystemAuditLog = {
          id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toISOString(),
          username: currentUser.name,
          action: `Modificó estatus de usuario ID ${userId} a ${nextStatus}`,
          ip: '192.168.1.5',
          module: 'Usuarios'
        };
        setAuditLogs(prev => [newLog, ...prev]);
        logAdminAction(currentUser, `Gestión: Modificó estado de usuario ${u.name} a ${nextStatus}`);

        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    setUsers(prev => prev.filter(u => u.id !== userId));

    // Log trace
    const newLog: SystemAuditLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      username: currentUser.name,
      action: `Eliminó usuario: ${targetUser?.name || userId}`,
      ip: '192.168.1.5',
      module: 'Usuarios'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    logAdminAction(currentUser, `Gestión: Eliminó usuario ${targetUser?.name || userId}`);
  };

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.title || !ticketForm.description) return;

    const newTicket: SupportTicket = {
      id: `SAMI-TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: ticketForm.title,
      description: ticketForm.description,
      category: ticketForm.category as any,
      priority: ticketForm.priority as any,
      status: 'Abierto',
      createdAt: new Date().toISOString(),
      slaHours: 2 // Premium SLA
    };

    setTickets(prev => [newTicket, ...prev]);

    // Log trace
    const newLog: SystemAuditLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      username: currentUser.name,
      action: `Abrió ticket de soporte: ${newTicket.id} - ${newTicket.title}`,
      ip: '192.168.1.5',
      module: 'Soporte'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    logAdminAction(currentUser, `Soporte: Abrió ticket de soporte ID ${newTicket.id}`);

    setIsTicketModalOpen(false);
    setTicketForm({ title: '', category: 'General', priority: 'Media', description: '' });
  };

  const handleCreateClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.fullName || !claimForm.description) return;

    const newClaim: IndecopiClaim = {
      id: `SAMI-RECL-2026-${Math.floor(10 + Math.random() * 89)}`,
      ruc: claimForm.ruc,
      fullName: claimForm.fullName,
      type: claimForm.type as any,
      description: claimForm.description,
      status: 'Presentado',
      createdAt: new Date().toISOString()
    };

    setClaims(prev => [newClaim, ...prev]);

    // Log trace
    const newLog: SystemAuditLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      username: currentUser.name,
      action: `Registró disconformidad formal INDECOPI: ${newClaim.id}`,
      ip: '192.168.1.5',
      module: 'Reclamos'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    logAdminAction(currentUser, `Gobernanza: Registró hoja de reclamación ${newClaim.id}`);

    setIsClaimModalOpen(false);
    setClaimForm({ type: 'Reclamo', ruc: '20123456789', fullName: 'Roberto Carlos Cruz', description: '' });
  };

  const handleSimulateInvoiceDownload = (invoice: CompanyInvoice) => {
    showLocalPushNotification(
      "📥 Descarga Exitosa",
      `Factura ${invoice.id} por el monto de S/ ${invoice.amount.toLocaleString('es-PE')} correspondiente a ${invoice.period} descargada con éxito en formatos PDF y XML homologados por SUNAT.`
    );
    
    const newLog: SystemAuditLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      username: currentUser.name,
      action: `Descargó factura SUNAT: ${invoice.id}`,
      ip: '192.168.1.5',
      module: 'Suscripciones'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    logAdminAction(currentUser, `Facturación: Descargó comprobante de consumo ${invoice.id}`);
  };

  const handleConfirmDeactivation = () => {
    setDeactivatingConfirmed(true);
    
    // Log trace
    const newLog: SystemAuditLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      username: currentUser.name,
      action: `Solicitó baja programada de suscripción mensual`,
      ip: '192.168.1.5',
      module: 'Suscripciones'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    logAdminAction(currentUser, `Suscripción: Solicitó baja del plan comercial.`);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl min-h-screen">
      
      {/* Upper Navigation & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <motion.div 
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-2">
            <Sliders size={14} className="animate-spin-slow" />
            Control de Gobernanza & Gobernabilidad
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-none">
            Administración General
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mt-2.5">
            Canal unificado para gestionar usuarios, revisar facturas, plantear tickets, y auditar la trazabilidad de consumo.
          </p>
        </motion.div>

        {/* Action Button */}
        {isMypeAdmin && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsDeactivatingModalOpen(true)}
            className="px-5 py-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/50 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 text-xs font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            Dar de Baja el Servicio
          </motion.button>
        )}
      </div>

      {/* Glassmorphism Inner Horizontal Tabs */}
      <div className="flex flex-wrap gap-2 mb-10 border-b border-gray-200 dark:border-gray-800 pb-4">
        {availableTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-sm p-6 md:p-10"
        >
          {/* ─────── TAB 1: USERS MANAGEMENT ─────── */}
          {activeTab === 'users' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-950 dark:text-white">Colaboradores & Accesos</h3>
                  <p className="text-xs font-bold text-gray-400 mt-1">
                    Control de roles y privilegios de acceso para personal de {currentUser.name}.
                  </p>
                </div>
                <button
                  onClick={() => setIsUserModalOpen(true)}
                  className="flex items-center gap-2 px-4.5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md"
                >
                  <UserPlus size={16} />
                  <span>Invitar Colaborador</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="py-4">Nombre completo</th>
                      <th className="py-4">Correo electrónico</th>
                      <th className="py-4">Rol en SAMI</th>
                      <th className="py-4 text-center">Estado</th>
                      <th className="py-4">Último Acceso</th>
                      <th className="py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/40 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="py-4 font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center font-bold text-indigo-600">
                            {u.name.charAt(0)}
                          </div>
                          <span>{u.name}</span>
                        </td>
                        <td className="py-4 text-gray-500 font-bold">{u.email}</td>
                        <td className="py-4">
                          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider ${
                            u.status === 'Activo' ? 'bg-green-100 text-green-700' :
                            u.status === 'Pendiente' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-4 font-bold text-gray-400">{u.lastActive}</td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => handleToggleUserStatus(u.id)}
                              className="px-2.5 py-1.5 text-[10px] font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                              title="Activar/Desactivar acceso temporal"
                            >
                              Suspender
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar usuario"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────── TAB 2: BILLING & CONSUMPTION ─────── */}
          {activeTab === 'billing' && (
            <div>
              {isMypeAdmin ? (
                // MYPE Subscriber Billing
                <div className="space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-gradient-to-tr from-indigo-900 via-indigo-950 to-gray-950 text-white rounded-[2rem] p-8 border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                      <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-3 py-1 bg-white/10 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full">Suscripción Regular Activa</span>
                            <h4 className="text-2xl font-black mt-3">Plan Crecimiento MYPE</h4>
                          </div>
                          <span className="text-3xl font-extrabold tracking-tighter">S/ 49<span className="text-sm font-semibold">/mes</span></span>
                        </div>
                        <p className="text-xs text-white/70 font-semibold mt-4">
                          Próximo débito periódico: **05 de Junio, 2026** (Tarjetas autorizadas Visa termination *0932). No posees penalizaciones permanentes.
                        </p>
                      </div>
                      <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/15">
                        <div className="flex items-center gap-2">
                          <Check size={16} className="text-emerald-400" />
                          <span className="text-[10px] font-bold text-white/90">Historial SUNAT Ilimitado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={16} className="text-emerald-400" />
                          <span className="text-[10px] font-bold text-white/90">Alertas por WhatsApp (Próximamente)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={16} className="text-emerald-400" />
                          <span className="text-[10px] font-bold text-white/90">Microcréditos 1.2%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-gray-800/40 rounded-[2rem] border border-gray-150 dark:border-gray-800 p-8 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">Consumos del Periodo</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-gray-500">Alertas SUNAT enviadas:</span>
                            <span className="font-extrabold text-gray-900 dark:text-white">12 / 50</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-gray-500">Consultas de Verificación RUC:</span>
                            <span className="font-extrabold text-gray-900 dark:text-white">8 / Ilimitado</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-gray-500">Facturas Procesadas:</span>
                            <span className="font-extrabold text-gray-900 dark:text-white">169 / Ilimitado</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-200/55 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Última recalculación: Hace 20 min
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-gray-950 dark:text-white mb-4">Comprobantes y Facturas Emitidas</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-extrabold uppercase tracking-wider text-[10px]">
                            <th className="py-3">ID Factura</th>
                            <th className="py-3">Concepto / Plan</th>
                            <th className="py-3">Monto</th>
                            <th className="py-3">Fecha Límite</th>
                            <th className="py-3">Estado</th>
                            <th className="py-3 text-right">Comprobante SUNAT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map(inv => (
                            <tr key={inv.id} className="border-b border-gray-50 dark:border-gray-800/40 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                              <td className="py-3.5 font-black text-gray-900 dark:text-white">{inv.id}</td>
                              <td className="py-3.5 text-gray-600 dark:text-gray-300 font-bold">{inv.plan} ({inv.period})</td>
                              <td className="py-3.5 font-extrabold text-gray-900 dark:text-white">S/ {inv.amount.toFixed(2)}</td>
                              <td className="py-3.5 font-bold text-gray-400">{inv.dueDate}</td>
                              <td className="py-3.5">
                                <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                                  inv.status === 'Pagado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-3.5 text-right">
                                <button
                                  onClick={() => handleSimulateInvoiceDownload(inv)}
                                  className="flex items-center gap-1.5 ml-auto px-2.5 py-1.5 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/25 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                                >
                                  <Download size={12} />
                                  <span>Descargar PDF/XML</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // BANK / SAMI Admin APIs Consumption logs
                <div>
                  <h4 className="text-sm font-extrabold text-indigo-500 uppercase tracking-widest mb-6">Mapeo de Tráfico APIs e Ingesta de Datos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-center">
                    <div className="bg-slate-50 dark:bg-gray-800/30 border border-slate-100 dark:border-gray-800 rounded-2xl p-6">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Peticiones API</p>
                      <h5 className="text-3xl font-extrabold text-indigo-600 mt-2">1,249,840</h5>
                      <span className="text-[9px] font-semibold text-green-500 block mt-1">▲ +12.4% este mes</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-gray-800/30 border border-slate-100 dark:border-gray-800 rounded-2xl p-6">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Latencia Media Core</p>
                      <h5 className="text-3xl font-extrabold text-blue-500 mt-2">140 ms</h5>
                      <span className="text-[9px] font-semibold text-gray-400 block mt-1">SLA Objetivo: 200 ms</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-gray-800/30 border border-slate-100 dark:border-gray-800 rounded-2xl p-6">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tasa de Compras Anómalas</p>
                      <h5 className="text-3xl font-extrabold text-rose-500 mt-2">1.04%</h5>
                      <span className="text-[9px] font-semibold text-rose-400 block mt-1">1,940 picos sospechosos</span>
                    </div>
                  </div>

                  <div className="text-center p-8 bg-slate-50 dark:bg-gray-800/35 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
                    <TrendingUp className="mx-auto text-indigo-500 mb-2 animate-bounce" size={24} />
                    <p className="text-xs font-bold">Consolas y paneles adicionales de analítica de consumo API con conexión VPN Múltiple están resguardadas por seguridad.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────── TAB 3: SUPPORT & TICKETS ─────── */}
          {activeTab === 'tickets' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-950 dark:text-white">Tickets de Soporte Comercial y Técnico</h3>
                  <p className="text-xs font-bold text-gray-400 mt-1">
                    Cuentas con soporte garantizado directa con operadores financieros.
                  </p>
                </div>
                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md"
                >
                  <Plus size={16} />
                  <span>Crear Nuevo Ticket</span>
                </button>
              </div>

              {/* SLA Banner */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 p-5 rounded-2xl mb-8 flex items-start gap-4">
                <HelpCircle size={22} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wide">Acuerdo de Nivel de Servicio (SLA) Preferencial</p>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                    Al ser suscriptor del **Plan Crecimiento MYPE**, tus tickets tienen una prioridad priorizada con una garantía de respuesta de **menos de 2 horas (SLA)** directa por nuestra mesa de soporte y plataforma.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {tickets.map(t => (
                  <div key={t.id} className="p-5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-gray-150 dark:border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 tracking-wider font-mono">{t.id}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-650" />
                        <span className="px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{t.category}</span>
                        <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${
                          t.priority === 'Alta' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                        }`}>Prioridad {t.priority}</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight">{t.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">{t.description}</p>
                    </div>

                    <div className="flex items-center gap-4.5">
                      <div className="text-left md:text-right">
                        <p className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-center ${
                          t.status === 'Resuelto' ? 'bg-green-100 text-green-700' :
                          t.status === 'En Proceso' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>{t.status}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1">SLA {t.slaHours} Horas Máx.</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────── TAB 4: INDECOPI CLAIMS LEDGER ─────── */}
          {activeTab === 'claims' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-950 dark:text-white">Libro de Reclamación Digital</h3>
                  <p className="text-xs font-bold text-gray-400 mt-1">
                    Hojas de disconformidad formal regidas bajo el marco protector del INDECOPI peruano.
                  </p>
                </div>
                <button
                  onClick={() => setIsClaimModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md"
                >
                  <FileText size={16} />
                  <span>Presentar Reclamo / Queja</span>
                </button>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-5 rounded-2xl mb-8 flex items-start gap-4">
                <AlertTriangle size={22} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wide">Normativa del Libro de Reclamaciones</p>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    SAMI posee un canal oficial peruano regulado. **Reclamo**: Disconformidad relacionada con los productos o servicios brindados (plazo legal de atención: hasta un máximo de 15 días hábiles). **Queja**: Malestar o descontento respecto a la atención recibida.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {claims.map(c => (
                  <div key={c.id} className="p-5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-gray-150 dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 tracking-wider font-mono">{c.id}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-655" />
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-black text-[9px] uppercase tracking-widest">{c.type}</span>
                      </div>
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20">{c.status}</span>
                    </div>
                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase mb-1">{c.fullName} — RUC {c.ruc}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">{c.description}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-3">Fecha de radicado INDECOPI: {new Date(c.createdAt).toLocaleDateString('es-PE')}</p>
                  </div>
                ))}

                {claims.length === 0 && (
                  <p className="text-center py-6 text-gray-450 font-bold">No posees quejas ni reclamos formales vigentes en tu historial.</p>
                )}
              </div>
            </div>
          )}

          {/* ─────── TAB 5: AUDIT LOG TRAIL ─────── */}
          {activeTab === 'audit' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-950 dark:text-white">Trazabilidad Integral de la Información</h3>
                  <p className="text-xs font-bold text-gray-400 mt-1">
                    Auditoría transparente de accesos y consumos del ecosistema.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-150">
                  <Activity size={14} className="text-indigo-500" />
                  <span>Terminal de Gobernabilidad</span>
                </div>
              </div>

              <div className="space-y-3 font-mono">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-4 bg-[#0A0A0B] text-white rounded-xl border border-white/5 flex flex-col md:flex-row justify-between gap-3 text-left">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest font-mono">[{log.module}]</span>
                        <span className="text-emerald-400 text-xs font-bold">→ {log.username}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-normal">{log.action}</p>
                    </div>
                    <div className="text-right flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-1 font-sans text-[10px] text-slate-500 font-bold">
                      <span className="font-mono">{log.timestamp.substring(11, 19)}</span>
                      <span>IP: {log.ip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─────── MODAL 1: ADD USER FORM ─────── */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-2xl z-10 text-left"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-lg font-black text-gray-950 dark:text-white">Invitar Colaborador</h4>
                  <p className="text-xs text-gray-400 font-semibold mt-1">El invitado recibirá un correo de habilitación temporal.</p>
                </div>
                <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleInviteUserSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                    placeholder="Ej. Mariela Alva"
                    className="w-full bg-slate-50 dark:bg-gray-800/80 border border-slate-150 dark:border-gray-700/85 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="mariela.alva@gamarramype.pe"
                    className="w-full bg-slate-50 dark:bg-gray-800/80 border border-slate-150 dark:border-gray-700/85 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Rol Asignado</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-gray-800/80 border border-slate-150 dark:border-gray-700/85 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white font-bold select-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="MYPE Worker">Colaborador MYPE Worker</option>
                    <option value="Contador Externo">Contador Externo</option>
                    <option value="Administrador MYPE">Co-Administrador Comercial</option>
                  </select>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="px-5 py-3 border border-slate-150 dark:border-gray-700 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-md"
                  >
                    Enviar Invitación
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────── MODAL 2: SUPPORT TICKET FORM ─────── */}
      <AnimatePresence>
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTicketModalOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-2xl z-10 text-left"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-lg font-black text-gray-950 dark:text-white">Abrir Ticket de Soporte</h4>
                  <p className="text-xs text-gray-400 font-semibold mt-1">Garantía de respuesta preferencial de menos de 2 horas.</p>
                </div>
                <button onClick={() => setIsTicketModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTicketSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Asunto Principal</label>
                  <input
                    type="text"
                    required
                    value={ticketForm.title}
                    onChange={e => setTicketForm({ ...ticketForm, title: e.target.value })}
                    placeholder="Ej. Retraso en desembolso financiero core"
                    className="w-full bg-slate-50 dark:bg-gray-800/80 border border-slate-150 dark:border-gray-700/85 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Categoría</label>
                    <select
                      value={ticketForm.category}
                      onChange={e => setTicketForm({ ...ticketForm, category: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-gray-800/80 border border-slate-150 dark:border-gray-700/85 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white font-bold select-none focus:outline-none"
                    >
                      <option value="General">Soporte General</option>
                      <option value="Facturación">Facturas y Cobros</option>
                      <option value="Salud Tributaria">Salud Tributaria</option>
                      <option value="Créditos">Créditos de Mercado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Prioridad</label>
                    <select
                      value={ticketForm.priority}
                      onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-gray-800/80 border border-slate-150 dark:border-gray-700/85 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white font-bold select-none focus:outline-none"
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Descripción Completa del Caso</label>
                  <textarea
                    required
                    rows={4}
                    value={ticketForm.description}
                    onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })}
                    placeholder="Por favor, describe ampliamente el error o consulta técnica e ingresa de ser posible los códigos de transacciones o hashes de facturación para mayor celeridad."
                    className="w-full bg-slate-50 dark:bg-gray-800/80 border border-slate-150 dark:border-gray-700/85 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTicketModalOpen(false)}
                    className="px-5 py-3 border border-slate-150 dark:border-gray-700 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-md"
                  >
                    Generar Ticket
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────── MODAL 3: INDECOPI CLAIM FORM ─────── */}
      <AnimatePresence>
        {isClaimModalOpen && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClaimModalOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-2xl z-10 text-left"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-lg font-black text-gray-950 dark:text-white">Libro de Reclamación Digital Indecopi</h4>
                  <p className="text-xs text-gray-400 font-semibold mt-1">Garantiza un radicado oficial bajo el R.M. N° 1083-2011-MTC.</p>
                </div>
                <button onClick={() => setIsClaimModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateClaimSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Identificador RUC</label>
                    <input
                      type="text"
                      required
                      value={claimForm.ruc}
                      onChange={e => setClaimForm({ ...claimForm, ruc: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-gray-800/80 border border-slate-150 dark:border-gray-700/85 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Tipo de Incidencia</label>
                    <select
                      value={claimForm.type}
                      onChange={e => setClaimForm({ ...claimForm, type: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-gray-800/80 border border-slate-150 dark:border-gray-700/85 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white font-bold select-none focus:outline-none"
                    >
                      <option value="Reclamo">Reclamo (Problema de Servicio)</option>
                      <option value="Queja">Queja (Disconformidad de Trato)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Nombre completo de Consumidor</label>
                  <input
                    type="text"
                    required
                    value={claimForm.fullName}
                    onChange={e => setClaimForm({ ...claimForm, fullName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-gray-800/80 border border-slate-150 dark:border-gray-700/85 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Detalle de Disconformidad</label>
                  <textarea
                    required
                    rows={4}
                    value={claimForm.description}
                    onChange={e => setClaimForm({ ...claimForm, description: e.target.value })}
                    placeholder="Explica detalladamente la queja o reclamo. Un asesor del libro de reclamaciones de SAMI resolverá el inconveniente en cumplimiento con INDECOPI Perú de manera asertiva."
                    className="w-full bg-slate-50 dark:bg-gray-800/80 border border-slate-150 dark:border-gray-700/85 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(false)}
                    className="px-5 py-3 border border-slate-150 dark:border-gray-700 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-md"
                  >
                    Registrar Hoja INDECOPI
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────── MODAL 4: DEACTIVATION (Darse de baja) ─────── */}
      <AnimatePresence>
        {isDeactivatingModalOpen && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeactivatingModalOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-2xl z-10 text-left"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-lg font-black text-rose-600">Baja Programada</h4>
                  <p className="text-xs text-gray-400 font-semibold mt-1">Lamentamos mucho que consideres pausar SAMI.</p>
                </div>
                <button onClick={() => setIsDeactivatingModalOpen(false)} className="text-slate-400 hover:text-rose-650 p-1 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              {!deactivatingConfirmed ? (
                <div className="space-y-4">
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">
                    Al solicitar **Baja del Servicio**, tu plan pasará a ser **Plan Emprendedor (Gratuito)** al finalizar el periodo actual facturado.
                  </p>
                  <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-450 p-4 rounded-xl border border-rose-100 text-xs font-semibold leading-tight space-y-2">
                    <p className="font-extrabold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={15} /> Beneficios que se desactivarán:
                    </p>
                    <p>• Alertas automáticas de vencimientos SUNAT en plataforma y correo.</p>
                    <p>• Tasas preferenciales de capital de trabajo desde 1.2% mensual.</p>
                    <p>• Dashboard multiusuario y exportador de analítica robusta.</p>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold">
                    * No existen claúsulas de permanencia. Podrás exportar tu base contable en formatos XLS y ZIP homologados al instante.
                  </p>

                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-gray-800">
                    <button
                      onClick={() => setIsDeactivatingModalOpen(false)}
                      className="px-5 py-3 border border-slate-150 dark:border-gray-750 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 cursor-pointer"
                    >
                      Mantener Servicio de Salud Financiera
                    </button>
                    <button
                      onClick={handleConfirmDeactivation}
                      className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-md"
                    >
                      Darse de Baja
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center">
                    <Check size={32} />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-gray-950 dark:text-white">Baja Registrada Correctamente</h5>
                    <p className="text-xs text-gray-400 font-semibold mt-2 max-w-sm mx-auto leading-relaxed">
                      Suficiente. Tu suscripción no registrará cobros adicionales. Tu cuenta se reprogramó automáticamente a plan libre a partir del **05 de Junio, 2026**.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDeactivatingModalOpen(false)}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ManagementModule;
