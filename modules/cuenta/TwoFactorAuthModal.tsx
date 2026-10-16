import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext';

interface TwoFactorAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  tempToken?: string;
  userName?: string;
  demoCodeHint?: string;
}

const TwoFactorAuthModal: React.FC<TwoFactorAuthModalProps> = ({
  onClose,
  onSuccess,
  tempToken,
  userName,
  demoCodeHint
}) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { verify2FA, pending2FA } = useAuth();

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError(null);

    // Auto-advance
    if (value && index < 5) inputRefs.current[index + 1]?.focus();

    // Auto-submit when complete
    if (value && index === 5) {
      const code = [...newDigits.slice(0, 5), value.slice(-1)].join('');
      if (code.length === 6) {
        setTimeout(() => handleVerify(code), 100);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const finalCode = code || digits.join('');
    if (finalCode.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const activeTempToken = tempToken || pending2FA?.tempToken;
      const result = await verify2FA(finalCode, activeTempToken);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Código incorrecto. Verifica e inténtalo de nuevo.');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor al verificar 2FA.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setResendCooldown(30);
    setDigits(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    setError(null);
  };

  const activeHint = demoCodeHint || pending2FA?.demoCodeHint || '884422';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center border border-gray-100 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={32} className="text-blue-600 dark:text-blue-400" />
        </div>

        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">
          Verificación en 2 pasos
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Enviamos un código de seguridad {userName ? `a ${userName}` : ''}.<br />
          <span className="text-xs text-indigo-500 font-mono font-medium">[Entorno de Prueba] Código de acceso: {activeHint}</span>
        </p>

        {/* OTP Input boxes */}
        <div className="flex justify-center gap-3 mb-6">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              value={d}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              maxLength={1}
              className={`w-12 h-14 text-center text-2xl font-black rounded-2xl border-2 transition-all font-mono
                bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                ${d ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'}
                focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                ${error ? 'border-red-400 animate-shake' : ''}
              `}
              disabled={isLoading}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm font-semibold mb-4 bg-red-50 dark:bg-red-900/10 py-2 px-4 rounded-xl">
            {error}
          </p>
        )}

        <button
          onClick={() => handleVerify()}
          disabled={isLoading || digits.join('').length !== 6}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-3 cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin" /> Verificando en servidor...
            </span>
          ) : 'Verificar en Servidor'}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="w-full text-gray-400 hover:text-blue-600 text-xs font-semibold py-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : '¿No llegó? Reenviar código'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-gray-400 text-xs py-2 mt-1 hover:text-gray-600 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </motion.div>
    </div>
  );
};

export default TwoFactorAuthModal;
