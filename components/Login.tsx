import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppRole, User } from '../types';
import { ShieldCheck, TrendingUp, GraduationCap, CreditCard, ChevronLeft } from 'lucide-react';
import { logAdminAction } from '../services/auditService';

interface LoginProps {
  onLoginSuccess: () => void;
  onRegisterClick: () => void;
  onBack?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onRegisterClick, onBack }) => {
  const [category, setCategory] = useState<'MYPE' | 'BANK' | 'SAMI'>('MYPE');
  const [role, setRole] = useState<AppRole>(AppRole.MYPE_ADMIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  // Updated roles list by category
  const rolesByCategory = {
    MYPE: [
      { role: AppRole.MYPE_ADMIN, label: '🛡️ Administrador MYPE' },
      { role: AppRole.MYPE_WORKER, label: '👷 Trabajador' }
    ],
    BANK: [
      { role: AppRole.BANK_ANALYST, label: '🔍 Analista' },
      { role: AppRole.BANK_SUPERVISOR, label: '⚖️ Supervisor' },
      { role: AppRole.BANK_ADMIN, label: '⚙️ Administrador' }
    ],
    SAMI: [
       { role: AppRole.SAMI_ADMIN, label: '🚀 Fundador / Equipo SAMI' }
    ]
  };

  // Sync role when category changes
  useEffect(() => {
    setRole(rolesByCategory[category][0].role);
  }, [category]);

  // DEMO CREDENTIALS
  const DEMO_USERS = {
    [AppRole.MYPE_ADMIN]: { email: 'bodega@sami.pe', password: 'Mype2024!', id: 'u2', name: 'Carlos Gomez', role: AppRole.MYPE_ADMIN, businessId: 'b1' },
    [AppRole.MYPE_WORKER]: { email: 'empleado@sami.pe', password: 'Worker2024!', id: 'u3', name: 'Juan Perez', role: AppRole.MYPE_WORKER, businessId: 'b1' },
    [AppRole.BANK_ANALYST]: { email: 'analista@banco.pe', password: 'Bank2024!', id: 'bank1', name: 'Analista', role: AppRole.BANK_ANALYST, businessId: 'none' },
    [AppRole.BANK_SUPERVISOR]: { email: 'supervisor@banco.pe', password: 'Bank2024!', id: 'bank2', name: 'Supervisor', role: AppRole.BANK_SUPERVISOR, businessId: 'none' },
    [AppRole.BANK_ADMIN]: { email: 'admin@banco.pe', password: 'Bank2024!', id: 'bank3', name: 'Admin Banco', role: AppRole.BANK_ADMIN, businessId: 'none' },
    [AppRole.SAMI_ADMIN]: { email: 'team@sami.pe', password: 'Sami2024!', id: 'u1', name: 'Maria Rodriguez', role: AppRole.SAMI_ADMIN, businessId: 'sami-internal' }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const demoUser = DEMO_USERS[role as keyof typeof DEMO_USERS];
    if (demoUser && email === demoUser.email && password === demoUser.password) {
      logAdminAction(demoUser as User, `Inicio de sesión exitoso como ${role}`);
      login(demoUser as User);
      onLoginSuccess();
    } else {
      // For failed attempts, we log with what we know
      logAdminAction(
        { id: 'unknown', name: email || 'Anónimo', role: role as AppRole }, 
        `Intento de sesión fallido como ${role}`
      );
      setError('Credenciales incorrectas. Selecciona un rol y usa "Llenar Datos Demo".');
    }
  };

  const fillDemo = () => {
    const demo = DEMO_USERS[role as keyof typeof DEMO_USERS];
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
    }
  };

  // PRODUCCIÓN: handleBiometricLogin debe implementarse con:
  // 1. GET /api/auth/webauthn/challenge → obtener challenge del servidor
  // 2. navigator.credentials.get({ publicKey: challengeOptions })
  // 3. POST /api/auth/webauthn/verify → verificar la aserción
  // Librería recomendada: @simplewebauthn/browser
  // Ver: https://simplewebauthn.dev/
  const handleBiometricLogin = async () => {
    setError('');
    
    // Check WebAuthn support
    if (!window.PublicKeyCredential) {
      setError('Tu dispositivo no soporta autenticación biométrica.');
      return;
    }
    try {
      // Simulate WebAuthn assertion (in production: call backend for challenge)
      // This is a demo simulation — in production use navigator.credentials.get()
      
      // For demo: simulate a successful biometric check
      const demoUser = DEMO_USERS[role as keyof typeof DEMO_USERS];
      if (demoUser) {
        // Simulate biometric verification delay
        setError(''); 
        // Show "verifying biometrics" state
        const bioBtn = document.querySelector('[data-bio-btn]') as HTMLButtonElement;
        if (bioBtn) bioBtn.textContent = 'Verificando biometría...';
        
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        logAdminAction(demoUser as User, `Inicio de sesión por biometría como ${role}`);
        login(demoUser as User);
        onLoginSuccess();
      }
    } catch (err) {
      setError('La verificación biométrica falló. Usa email y contraseña.');
    }
  };

  const features = [
    { icon: <TrendingUp size={16} />, text: 'Dashboard financiero en tiempo real' },
    { icon: <ShieldCheck size={16} />, text: 'SAMI Score — tu historial crediticio MYPE' },
    { icon: <CreditCard size={16} />, text: 'Marketplace de créditos con aliados financieros' },
    { icon: <GraduationCap size={16} />, text: 'Academia SAMI — formalízate y crece' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL — Brand */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden flex-col justify-between p-12"
           style={{ background: 'linear-gradient(135deg, #0F0F1A 0%, #1A1A35 50%, #0D1B4A 100%)' }}>
        
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-10"
               style={{ background: 'radial-gradient(circle, #3B5BDB, transparent)' }} />
          <div className="absolute bottom-1/3 left-1/3 w-48 h-48 rounded-full opacity-8"
               style={{ background: 'radial-gradient(circle, #6741D9, transparent)' }} />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#3B5BDB' }}>
            <ShieldCheck size={22} className="text-white" />
          </div>
          <span className="text-white text-2xl font-extrabold tracking-tight">SAMI</span>
        </div>

        {/* Main content */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-white text-5xl font-extrabold leading-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            La mano derecha<br />de tu <span style={{ color: '#6366F1' }}>MYPE.</span>
          </h1>
          <p className="text-gray-400 text-lg mb-10">
            Contabilidad, Créditos y Educación en un solo lugar.
          </p>
          
          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(99,102,241,0.2)' }}>
                  <span className="text-indigo-400">{f.icon}</span>
                </div>
                <span className="text-gray-300 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Partner logos strip */}
        <div className="relative z-10 border-t border-white/10 pt-6">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-mono">Aliados Financieros</p>
          <div className="flex items-center gap-6">
            {['Fintech Veloz', 'Caja Confianza', 'Banco ProMYPE'].map((name) => (
              <div key={name} className="text-gray-500 text-xs font-semibold hover:text-gray-300 transition-colors">{name}</div>
            ))}
          </div>
        </div>

        {/* Security methods strip */}
        <div className="relative z-10 mt-auto pt-6 border-t border-white/10">
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-3 font-black">Métodos de Acceso Seguros</p>
          <div className="flex flex-wrap gap-2">
            {['🔑 Email + Contraseña', '📱 SMS OTP', '🔐 Huella / Face ID', '🛡️ Autenticador App'].map(m => (
              <span key={m} className="text-gray-400 text-[10px] font-semibold bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <div className="w-full max-w-sm">
          
          {/* Back button */}
          {onBack && (
            <button 
              type="button"
              onClick={onBack}
              className="group mb-5 inline-flex items-center gap-1.5 text-xs font-black text-slate-400 dark:text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
              Volver al inicio
            </button>
          )}
          
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#3B5BDB' }}>
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white">SAMI</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 font-black leading-tight">Bienvenido de vuelta</h2>
          <p className="text-gray-500 text-sm mb-8">Ingresa tus credenciales de acceso</p>

          {/* Category selector */}
          <div className="mb-4">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Tipo de Entidad</label>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {(['MYPE', 'BANK', 'SAMI'] as const).map((cat) => (
                <button 
                  key={cat} 
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                    category === cat
                      ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {cat === 'MYPE' ? '🏪 MYPE' : cat === 'BANK' ? '🏦 BANCO' : '🚀 SAMI'}
                </button>
              ))}
            </div>
          </div>

          {/* Role selector based on category */}
          <div className="mb-6">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Simular Perfil</label>
            <div className="grid grid-cols-1 gap-2">
              {rolesByCategory[category].map((rObj) => (
                <button 
                  key={rObj.role} 
                  type="button"
                  onClick={() => setRole(rObj.role)}
                  className={`py-2 px-3 text-left text-xs font-bold rounded-xl border-2 transition-all flex items-center justify-between ${
                    role === rObj.role
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/10'
                      : 'border-gray-100 dark:border-gray-800 text-gray-500 hover:border-indigo-200'
                  }`}
                >
                  {rObj.label}
                  {role === rObj.role && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Métodos de acceso modernos */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={fillDemo}
              className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 rounded-2xl transition-all active:scale-98 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer"
            >
              <span className="text-xl">📱</span>
              Ingresar como Demo (sin contraseña)
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 font-semibold">o ingresa con tu cuenta</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder={DEMO_USERS[role].email}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                style={{ '--tw-ring-color': '#3B5BDB' } as React.CSSProperties} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                style={{ '--tw-ring-color': '#3B5BDB' } as React.CSSProperties} />
            </div>

            {error && (
              <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit"
              className="w-full text-white font-bold py-3 px-4 rounded-xl transition-all hover:opacity-90 active:scale-98 text-sm"
              style={{ background: '#3B5BDB' }}>
              Iniciar Sesión
            </button>

            {/* WebAuthn / Biometric Login Button */}
            {window.PublicKeyCredential && (
              <button
                type="button"
                data-bio-btn
                onClick={handleBiometricLogin}
                className="w-full flex items-center justify-center gap-3 border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-all text-xs font-bold py-3.5 rounded-2xl"
              >
                <span className="text-lg">🔐</span>
                Usar Huella Digital o Face ID
                <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-black uppercase">NUEVO</span>
              </button>
            )}

            {/* Demo autofill */}
            <button type="button" onClick={fillDemo}
              className="w-full text-gray-400 hover:text-gray-600 text-xs font-mono py-2 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-400 transition-colors">
              ⚡ Auto-completar credenciales de DEMO
            </button>

            <button type="button" onClick={onRegisterClick}
              className="w-full text-indigo-600 dark:text-indigo-400 text-xs font-bold py-2 hover:underline transition-all">
              ¿No tienes cuenta? Regístrate aquí
            </button>
          </form>

          {/* Trust signals de seguridad */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: '🔒', label: 'TLS 1.3', sub: 'Datos cifrados' },
                 { icon: '🛡️', label: 'AES-256', sub: 'Encriptación' },
                 { icon: '📋', label: 'Ley 29733', sub: 'Protección de datos' },
              ].map(t => (
                <div key={t.label} className="flex flex-col items-center gap-1">
                  <span className="text-xl">{t.icon}</span>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{t.label}</p>
                  <p className="text-[9px] text-slate-400">{t.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            SAMI · Plataforma financiera para MYPEs peruanas
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
