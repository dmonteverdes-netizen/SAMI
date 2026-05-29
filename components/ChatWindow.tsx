
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Sender } from '../types';
import { View } from './Sidebar';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

interface Suggestion {
  id: string;
  label: string;
  type: 'message' | 'action';
  payload: string;
  icon?: React.ReactNode;
}

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onViewChange?: (view: View) => void;
  error: string | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onSendMessage, onViewChange, error }) => {
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);

  // Simple heuristic-based suggestion generator
  React.useEffect(() => {
    if (messages.length === 0) {
      setSuggestions([
        { id: '1', label: '¿Cómo va mi score?', type: 'message', payload: '¿Cómo está mi score financiero hoy?' },
        { id: '2', label: 'Simular crédito', type: 'action', payload: 'credit' },
        { id: '3', label: 'Subir facturas', type: 'action', payload: 'accounting' }
      ]);
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.sender === Sender.BOT && !isLoading) {
      const text = lastMessage.text.toLowerCase();
      const newSuggestions: Suggestion[] = [];

      if (text.includes('crédito') || text.includes('préstamo') || text.includes('score')) {
        newSuggestions.push({ id: 's1', label: 'Ver detalles de mi crédito', type: 'action', payload: 'credit' });
        newSuggestions.push({ id: 's2', label: 'Requisitos para factorying', type: 'message', payload: '¿Qué necesito para hacer factoring?' });
      }

      if (text.includes('impuesto') || text.includes('sunat') || text.includes('factura') || text.includes('contabilidad')) {
        newSuggestions.push({ id: 's3', label: 'Descargar certificado tributario', type: 'message', payload: '¿Cómo descargo mi reporte tributario?' });
        newSuggestions.push({ id: 's4', label: 'Ver mi flujo de caja', type: 'action', payload: 'dashboard' });
      }

      if (text.includes('aprender') || text.includes('curso') || text.includes('educación')) {
        newSuggestions.push({ id: 's5', label: 'Explorar cursos de flujo de caja', type: 'action', payload: 'education' });
        newSuggestions.push({ id: 's6', label: 'Ver mi progreso educativo', type: 'message', payload: '¿Cómo va mi avance en los cursos?' });
      }

      if (newSuggestions.length === 0) {
        newSuggestions.push({ id: 'd1', label: 'Analizar mi perfil completo', type: 'action', payload: 'profiling' });
        newSuggestions.push({ id: 'd2', label: 'Ver mi puntaje SAMI Score', type: 'action', payload: 'credit' });
      }

      setSuggestions(newSuggestions);
    } else if (isLoading) {
      setSuggestions([]);
    }
  }, [messages, isLoading]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.type === 'message') {
      onSendMessage(suggestion.payload);
    } else if (suggestion.type === 'action' && onViewChange) {
      onViewChange(suggestion.payload as View);
    }
    setSuggestions([]);
  };

  return (
    <div className="flex flex-col h-full md:h-[90vh] w-full max-w-4xl bg-white dark:bg-gray-900 shadow-2xl rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-950 p-6 text-white flex items-center justify-between shadow-lg">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mr-4 border border-white/30 shadow-inner">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V4a2 2 0 012-2h8a2 2 0 012 2v4z"></path></svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Asistente SAMI</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-xs font-medium text-blue-100/80">IA Especializada en MYPES</p>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
          Encriptado AES-256
        </div>
      </header>

      <MessageList messages={messages} isLoading={isLoading} />
      
      {/* Dynamic Suggestions */}
      {!isLoading && suggestions.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {suggestions.map((suggestion) => (
                <motion.button
                  key={suggestion.id}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  whileHover={{ y: -2, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm whitespace-nowrap transition-colors hover:border-blue-300 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {suggestion.label}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
      {error && <div className="p-3 text-center text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 text-xs font-bold border-t border-red-100 dark:border-red-900/20">{error}</div>}
    </div>
  );
};

export default ChatWindow;
