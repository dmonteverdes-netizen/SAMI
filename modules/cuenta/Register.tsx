import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Building, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Mail, 
  FileDigit, 
  Upload, 
  UserCheck,
  AlertTriangle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  validateRUC, 
  validateEmail, 
  validateLegalRepresentation, 
  RucValidationData, 
  LegalRepValidationData 
} from '../../core/services/validationService';

// ─── Tipos e Interfaces ───

interface RegisterProps {
  onBackToLogin: () => void;
  onRegisterSuccess: () => void;
  onBack?: () => void;
}

// ─── Componente Principal ───

const Register: React.FC<RegisterProps> = ({ onBackToLogin, onRegisterSuccess, onBack }) => {
  // ─── Estado y Hooks ───
  const [ruc, setRuc] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isValidatingRuc, setIsValidatingRuc] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [isValidatingLegalRep, setIsValidatingLegalRep] = useState(false);
  
  const [rucStatus, setRucStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [legalRepStatus, setLegalRepStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [isEmailValid, setIsEmailValid] = useState<boolean | null>(null);
  
  const [rucData, setRucData] = useState<RucValidationData | null>(null);
  const [legalRepData, setLegalRepData] = useState<LegalRepValidationData | null>(null);
  const [vdpFileName, setVdpFileName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(4);

  // Redirección automática al tener éxito en el registro
  useEffect(() => {
    if (!success) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onRegisterSuccess();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [success, onRegisterSuccess]);

  // Validación de correo con debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (email.length > 5) {
        setIsValidatingEmail(true);
        setError('');
        try {
          const result = await validateEmail(email);
          setIsEmailValid(result.isValid);
          if (!result.isValid && result.message) {
            setError(result.message);
          }
        } catch {
          setIsEmailValid(false);
        } finally {
          setIsValidatingEmail(false);
        }
      } else if (email.length === 0) {
        setIsEmailValid(null);
        setError('');
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [email]);

  // ─── Handlers y Lógica de Negocio ───

  const handleRucChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setRuc(val);
    if (rucStatus !== 'idle') {
      setRucStatus('idle');
      setLegalRepStatus('idle');
      setLegalRepData(null);
      setVdpFileName('');
    }
  };

  const handleRucValidation = async () => {
    if (ruc.length !== 11) {
      setError('El RUC debe constar de 11 dígitos numéricos.');
      return;
    }

    setIsValidatingRuc(true);
    setError('');
    setRucStatus('idle');
    setLegalRepStatus('idle');
    
    try {
      const result = await validateRUC(ruc);
      
      if (result.isValid && result.data) {
        setRucStatus('valid');
        setRucData(result.data);
      } else {
        setRucStatus('invalid');
        setError(result.message || 'El RUC ingresado no es válido.');
      }
    } catch {
      setError('Error al procesar la validación algorítmica del RUC.');
      setRucStatus('invalid');
    } finally {
      setIsValidatingRuc(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setVdpFileName(file.name);
    setIsValidatingLegalRep(true);
    setError('');
    setLegalRepStatus('idle');

    try {
      const result = await validateLegalRepresentation(ruc, file.name);
      if (result.isValid && result.data) {
        setLegalRepStatus('valid');
        setLegalRepData(result.data);
      } else {
        setLegalRepStatus('invalid');
        setError(result.message || 'Error validando representatividad legal.');
      }
    } catch {
      setError('Error al procesar el archivo de Vigencia de Poder.');
      setLegalRepStatus('invalid');
    } finally {
      setIsValidatingLegalRep(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rucStatus !== 'valid') {
      setError('Debes validar un RUC con algoritmo SUNAT válido primero.');
      return;
    }
    if (legalRepStatus !== 'valid') {
      setError('Debes adjuntar y validar una Vigencia de Poder para la simulación.');
      return;
    }
    if (!isEmailValid) {
      setError('Por favor, ingresa un correo electrónico válido y disponible.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    
    // Simulación del procesamiento de alta en el entorno de pruebas
    setIsValidatingRuc(true);
    setTimeout(() => {
      setIsValidatingRuc(false);
      setSuccess(true);
    }, 1200);
  };

  // ─── Render / JSX ───

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-gray-100 dark:border-gray-800 p-8 md:p-10 overflow-hidden relative"
      >
        {/* Decoración sutil de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-6 py-2"
              >
                <div id="registration-success-container" className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-x-0 top-0 w-20 h-20 rounded-full bg-emerald-500/20 animate-ping -ml-0" />
                    <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/25 relative z-10">
                      <CheckCircle2 size={44} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 id="success-header-title" className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight">
                    ¡Registro de Prueba Exitoso!
                  </h2>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-3 py-1 rounded-full inline-flex items-center gap-1">
                      <AlertTriangle size={11} className="text-amber-600" />
                      Modo Demostración
                    </span>
                  </div>
                </div>

                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                  Se ha validado el RUC <span className="font-mono font-black text-gray-800 dark:text-white">{ruc}</span> {rucData?.legalName ? `(${rucData.legalName})` : ''} mediante algoritmo SUNAT Módulo 11.
                </p>

                <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl p-4 text-left space-y-2.5">
                  <div className="flex items-start gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                    <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>Los datos de razón social y vigencia de poderes fueron simulados para este entorno de demostración. La integración en vivo con SUNARP y SUNAT PIDE está en desarrollo.</span>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-1 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: 4, ease: "linear" }}
                      className="bg-emerald-500 h-full"
                    />
                  </div>

                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    Redirigiéndote al login en <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">{countdown}</span> segundos...
                  </p>

                  <button
                    id="btn-login-success-manual"
                    type="button"
                    onClick={onRegisterSuccess}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    Ir al Inicio de Sesión
                    <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {onBack && (
                  <button 
                    type="button"
                    onClick={onBack}
                    className="group mb-5 inline-flex items-center gap-1.5 text-xs font-black text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    <ArrowRight size={13} className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
                    Volver al inicio
                  </button>
                )}

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                      <ShieldCheck size={24} />
                    </div>
                    <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white uppercase italic">
                      SAMI <span className="text-indigo-600">Onboarding</span>
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-full">
                    <AlertTriangle size={10} className="text-amber-500" />
                    Modo Demostración
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                  Registro de Negocio MYPE
                </h2>
                <p className="text-gray-500 text-xs md:text-sm mb-6 font-medium">
                  Validación algorítmica SUNAT y simulación de expediente comercial.
                </p>

                <form onSubmit={handleRegister} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                      Número de RUC (11 dígitos)
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={ruc} 
                        onChange={handleRucChange}
                        placeholder="20100070970"
                        className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all font-mono text-base tracking-widest pr-12"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                         {isValidatingRuc ? (
                           <Loader2 size={20} className="text-indigo-500 animate-spin" />
                         ) : rucStatus === 'valid' ? (
                           <CheckCircle2 size={20} className="text-green-500" />
                         ) : rucStatus === 'invalid' ? (
                           <XCircle size={20} className="text-red-500" />
                         ) : (
                           <Building size={20} className="text-gray-300" />
                         )}
                      </div>
                    </div>
                    
                    <AnimatePresence mode="wait">
                      {rucStatus === 'idle' && ruc.length === 11 && !isValidatingRuc && (
                        <motion.button
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          type="button"
                          onClick={handleRucValidation}
                          className="mt-3 w-full py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                        >
                          Verificar Checksum SUNAT (Módulo 11)
                        </motion.button>
                      )}
                    </AnimatePresence>

                    {rucData && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mt-3 p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                            RUC Válido · Razón Social Simulada:
                          </p>
                          <span className="text-[9px] font-black text-amber-700 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                            Simulado
                          </span>
                        </div>
                        <p className="text-xs font-black text-gray-800 dark:text-gray-200">{rucData.legalName}</p>
                        <div className="flex gap-2 pt-1">
                          <span className="text-[9px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">{rucData.status}</span>
                          <span className="text-[9px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">{rucData.condition}</span>
                        </div>
                      </motion.div>
                    )}

                    <AnimatePresence>
                      {rucStatus === 'valid' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                              <FileDigit size={12} className="text-indigo-500" />
                              Vigencia de Poder (Simulación SUNARP)
                            </label>
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                              Prototipo
                            </span>
                          </div>
                          
                          <div className={`relative group border-2 border-dashed rounded-2xl transition-all ${
                            legalRepStatus === 'valid' ? 'border-emerald-300 bg-emerald-50/30' : 
                            legalRepStatus === 'invalid' ? 'border-red-300 bg-red-50/30' : 
                            'border-gray-200 dark:border-gray-800 hover:border-indigo-300'
                          }`}>
                            <input 
                              type="file" 
                              onChange={handleFileUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={isValidatingLegalRep}
                            />
                            
                            <div className="p-5 flex flex-col items-center justify-center text-center">
                              {isValidatingLegalRep ? (
                                <div className="flex flex-col items-center">
                                  <Loader2 size={28} className="text-indigo-500 animate-spin mb-2" />
                                  <p className="text-[10px] font-bold text-indigo-600 uppercase">Simulando análisis documental...</p>
                                  <p className="text-[9px] text-gray-400 mt-1 italic">Procesando archivo en entorno demo...</p>
                                </div>
                              ) : legalRepStatus === 'valid' && legalRepData ? (
                                <div className="flex flex-col items-center">
                                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-1.5">
                                    <UserCheck size={18} />
                                  </div>
                                  <p className="text-xs font-black text-gray-900 dark:text-gray-100">Documento Procesado (Simulado)</p>
                                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase mt-0.5">
                                    Titular: {legalRepData.representative}
                                  </p>
                                  <p className="text-[9px] text-gray-400 truncate max-w-[220px] mt-0.5 italic">{vdpFileName}</p>
                                </div>
                              ) : (
                                <>
                                  <Upload size={22} className="text-gray-400 mb-1.5 group-hover:text-indigo-500 transition-colors" />
                                  <p className="text-[10px] font-bold text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                    {vdpFileName || 'Carga documento de prueba (PDF/JPG/PNG)'}
                                  </p>
                                  <p className="text-[9px] text-gray-400 mt-0.5 italic">Integración oficial con SUNARP en desarrollo</p>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className={`grid grid-cols-1 gap-3.5 transition-opacity ${rucStatus !== 'valid' || legalRepStatus !== 'valid' ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                     <div className="relative">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full px-4 py-3 rounded-2xl border-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none transition-all text-sm pr-11 ${
                              isEmailValid === true ? 'border-emerald-200 focus:border-emerald-500' : 
                              isEmailValid === false ? 'border-red-200 focus:border-red-500' : 
                              'border-gray-100 dark:border-gray-800 focus:border-indigo-500'
                            }`}
                            placeholder="contacto@mype.pe"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {isValidatingEmail ? (
                              <Loader2 size={16} className="text-indigo-500 animate-spin" />
                            ) : isEmailValid === true ? (
                              <CheckCircle2 size={16} className="text-emerald-500" />
                            ) : isEmailValid === false ? (
                              <XCircle size={16} className="text-red-500" />
                            ) : (
                              <Mail size={16} className="text-gray-300" />
                            )}
                          </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">
                          Contraseña (mínimo 8 caracteres)
                        </label>
                        <input 
                          type="password" 
                          value={password} 
                          onChange={e => setPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                          placeholder="••••••••"
                        />
                     </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl flex items-start gap-2">
                      <XCircle size={15} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={rucStatus !== 'valid' || legalRepStatus !== 'valid' || !isEmailValid || password.length < 8}
                    className={`w-full py-4 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer ${
                      rucStatus === 'valid' && legalRepStatus === 'valid' && isEmailValid && password.length >= 8
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20 active:scale-95' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    Completar Registro de Prueba
                    <ArrowRight size={18} />
                  </button>

                  <button 
                    type="button" 
                    onClick={onBackToLogin}
                    className="w-full py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    Ya tengo una cuenta · <span className="underline">Iniciar Sesión</span>
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
