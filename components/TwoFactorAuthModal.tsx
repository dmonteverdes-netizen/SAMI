import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, RefreshCw } from 'lucide-react';

interface TwoFactorAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  correctCode: string;
  userName?: string;
}

const TwoFactorAuthModal: React.FC<TwoFactorAuthModalProps> = ({ onClose, onSuccess, correctCode, userName }) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

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
      if (code.length === 6) setTimeout(() => verifyCode(code), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = (code?: string) => {
    const finalCode = code || digits.join('');
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      if (finalCode === correctCode) {
        onSuccess();
      } else {
        setError('Código incorrecto. Verifica e inténtalo de nuevo.');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
      setIsLoading(false);
    }, 600);
  };

  const handleResend = () => {
    setResendCooldown(30);
    setDigits(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    // In production: call resend SMS API
  };

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
          Enviamos un código SMS{userName ? ` a ${userName}` : ''}.<br/>
          <span className="text-xs text-gray-400">[DEMO] Código: {correctCode}</span>
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
          onClick={() => verifyCode()}
          disabled={isLoading || digits.join('').length !== 6}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-3"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin" /> Verificando...
            </span>
          ) : 'Verificar Código'}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="w-full text-gray-400 hover:text-blue-600 text-xs font-semibold py-2 transition-colors disabled:opacity-50"
        >
          {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : '¿No llegó? Reenviar código'}
        </button>

        <button type="button" onClick={onClose} className="w-full text-gray-400 text-xs py-2 mt-1 hover:text-gray-600 transition-colors">
          Cancelar
        </button>
      </motion.div>
    </div>
  );
};

export default TwoFactorAuthModal;
