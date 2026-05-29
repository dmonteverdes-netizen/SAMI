
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
  UserCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { validateRUC, validateEmail, validateLegalRepresentation } from '../services/validationService';

interface RegisterProps {
  onBackToLogin: () => void;
  onRegisterSuccess: () => void;
  onBack?: () => void;
}

const Register: React.FC<RegisterProps> = ({ onBackToLogin, onRegisterSuccess, onBack }) => {
  const [ruc, setRuc] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isValidatingRuc, setIsValidatingRuc] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [isValidatingLegalRep, setIsValidatingLegalRep] = useState(false);
  
  const [rucStatus, setRucStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [legalRepStatus, setLegalRepStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [isEmailValid, setIsEmailValid] = useState<boolean | null>(null);
  
  const [rucData, setRucData] = useState<any>(null);
  const [legalRepData, setLegalRepData] = useState<any>(null);
  const [vdpFileName, setVdpFileName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(4);

  // Automatic redirect countdown once registration succeeds
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

  // Debounced email validation
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (email.length > 5) {
        setIsValidatingEmail(true);
        setError('');
        try {
          const result = await validateEmail(email);
          isEmailValid === null; // Keep state
          setIsEmailValid(result.isValid);
          if (!result.isValid && result.message) {
            setError(result.message);
          }
        } catch (err) {
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

  // Reset RUC and Legal Rep status when RUC input changes
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
      setError('El RUC debe tener 11 dígitos');
      return;
    }

    setIsValidatingRuc(true);
    setError('');
    setRucStatus('idle');
    setLegalRepStatus('idle');
    
    try {
      const result = await validateRUC(ruc);
      
      if (result.isValid) {
        setRucStatus('valid');
        setRucData(result.data);
      } else {
        setRucStatus('invalid');
        setError(result.message || 'RUC inválido');
      }
    } catch (err) {
      setError('Error al conectar con el servicio de validación');
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
      if (result.isValid) {
        setLegalRepStatus('valid');
        setLegalRepData(result.data);
      } else {
        setLegalRepStatus('invalid');
        setError(result.message || 'Error validando representatividad');
      }
    } catch (err) {
      setError('Error procesando el documento');
      setLegalRepStatus('invalid');
    } finally {
      setIsValidatingLegalRep(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rucStatus !== 'valid') {
      setError('Debes validar un RUC vigente primero');
      return;
    }
    if (legalRepStatus !== 'valid') {
        setError('Debes validar tu representatividad legal con una Vigencia de Poder');
        return;
    }
    if (!isEmailValid) {
      setError('Por favor, ingresa un correo electrónico válido y disponible');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    // Simulation of final registration processing
    setIsValidatingRuc(true);
    setTimeout(() => {
      setIsValidatingRuc(false);
      setSuccess(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-gray-100 dark:border-gray-800 p-10 overflow-hidden relative"
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
        
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
                  <h2 id="success-header-title" className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
                    ¡Registro Exitoso!
                  </h2>
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full inline-block">
                    Onboarding Completado
                  </p>
                </div>

                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                  Se ha validado satisfactoriamente el RUC <span className="font-mono font-black text-gray-800 dark:text-white">{ruc}</span> {rucData?.legalName ? `(${rucData.legalName})` : ''} y hemos cotejado tus credenciales de representación legal en el padrón de SUNAT.
                </p>

                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 text-left space-y-3">
                  <div className="flex items-center gap-3 text-xs font-bold text-gray-700 dark:text-gray-300">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>Identidad del RUC y Razón Social Verificadas</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-gray-700 dark:text-gray-300">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>Vigencia de Poder oficial cotejada</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-gray-700 dark:text-gray-300">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>Correo electrónico de contacto verificado</span>
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

                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                    <ShieldCheck size={24} />
                  </div>
                  <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white uppercase italic">SAMI <span className="text-indigo-600">Onboarding</span></span>
                </div>

                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 leading-tight">Únete a la revolución MYPE</h2>
                <p className="text-gray-500 text-sm mb-8 font-medium italic">Valida tu negocio y accede a beneficios exclusivos.</p>

                <form onSubmit={handleRegister} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Número de RUC (SUNAT)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={ruc} 
                        onChange={handleRucChange}
                        placeholder="20123456789"
                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all font-mono text-lg tracking-widest pr-12"
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
                          className="mt-3 w-full py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                        >
                          Validar RUC en Backend SUNAT
                        </motion.button>
                      )}
                    </AnimatePresence>

                    {rucData && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mt-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 rounded-2xl"
                      >
                        <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Razón Social Encontrada:</p>
                        <p className="text-xs font-black text-gray-800 dark:text-gray-200">{rucData.legalName}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[9px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">{rucData.status}</span>
                          <span className="text-[9px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">{rucData.condition}</span>
                        </div>
                      </motion.div>
                    )}

                    <AnimatePresence>
                      {rucStatus === 'valid' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-6 space-y-4"
                        >
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest flex items-center gap-2">
                            <FileDigit size={12} className="text-indigo-500" />
                            Representante Legal: Vigencia de Poder
                          </label>
                          
                          <div className={`relative group border-2 border-dashed rounded-2xl transition-all ${
                            legalRepStatus === 'valid' ? 'border-green-200 bg-green-50/30' : 
                            legalRepStatus === 'invalid' ? 'border-red-200 bg-red-50/30' : 
                            'border-gray-200 dark:border-gray-800 hover:border-indigo-300'
                          }`}>
                            <input 
                              type="file" 
                              onChange={handleFileUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={isValidatingLegalRep}
                            />
                            
                            <div className="p-6 flex flex-col items-center justify-center text-center">
                              {isValidatingLegalRep ? (
                                <div className="flex flex-col items-center">
                                  <Loader2 size={32} className="text-indigo-500 animate-spin mb-2" />
                                  <p className="text-[10px] font-bold text-indigo-600 uppercase">Cotejando con SUNAT y Registros Públicos...</p>
                                  <p className="text-[9px] text-gray-400 mt-1 italic">Analizando titularidad y facultades...</p>
                                </div>
                              ) : legalRepStatus === 'valid' ? (
                                <div className="flex flex-col items-center">
                                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white mb-2">
                                    <UserCheck size={20} />
                                  </div>
                                  <p className="text-xs font-black text-gray-900 dark:text-gray-100">Cotejo Exitoso</p>
                                  <p className="text-[10px] text-green-600 font-bold uppercase mt-1">Titular: {legalRepData.representative}</p>
                                  <p className="text-[9px] text-gray-400 truncate max-w-[200px] mt-1 italic">{vdpFileName}</p>
                                </div>
                              ) : (
                                <>
                                  <Upload size={24} className="text-gray-300 mb-2 group-hover:text-indigo-500 transition-colors" />
                                  <p className="text-[10px] font-bold text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                    {vdpFileName || 'Sube tu Vigencia de Poder (PDF/JPG)'}
                                  </p>
                                  <p className="text-[9px] text-gray-400 mt-1 italic">Máximo 3 meses de antigüedad</p>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className={`grid grid-cols-1 gap-4 transition-opacity ${rucStatus !== 'valid' || legalRepStatus !== 'valid' ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                     <div className="relative">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Correo Electrónico</label>
                        <div className="relative">
                          <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full px-5 py-3 rounded-2xl border-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none transition-all text-sm pr-12 ${
                              isEmailValid === true ? 'border-green-100 focus:border-green-500' : 
                              isEmailValid === false ? 'border-red-100 focus:border-red-500' : 
                              'border-gray-100 dark:border-gray-800 focus:border-indigo-500'
                            }`}
                            placeholder="hola@tuempresa.pe"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {isValidatingEmail ? (
                              <Loader2 size={16} className="text-indigo-500 animate-spin" />
                            ) : isEmailValid === true ? (
                              <CheckCircle2 size={16} className="text-green-500" />
                            ) : isEmailValid === false ? (
                              <XCircle size={16} className="text-red-500" />
                            ) : (
                              <Mail size={16} className="text-gray-300" />
                            )}
                          </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Contraseña</label>
                        <input 
                          type="password" 
                          value={password} 
                          onChange={e => setPassword(e.target.value)}
                          className="w-full px-5 py-3 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                          placeholder="••••••••"
                        />
                     </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-xl flex items-center gap-2">
                      <XCircle size={14} />
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={rucStatus !== 'valid' || legalRepStatus !== 'valid' || !isEmailValid || password.length < 6}
                    className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl ${
                      rucStatus === 'valid' && legalRepStatus === 'valid' && isEmailValid && password.length >= 6
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20 active:scale-95' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    Completar Registro
                    <ArrowRight size={18} />
                  </button>

                  <button 
                    type="button" 
                    onClick={onBackToLogin}
                    className="w-full py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
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
