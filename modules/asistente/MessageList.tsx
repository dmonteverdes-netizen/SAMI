
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Sender } from '../../types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

const TypingIndicator: React.FC = () => {
  const [statusIdx, setStatusIdx] = React.useState(0);
  const statuses = [
    "SAMI está pensando...",
    "Analizando tu flujo de caja...",
    "Consultando normativas SUNAT...",
    "Procesando datos financieros...",
    "Preparando respuesta personalizada..."
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statuses.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="flex justify-start gap-5 my-10 items-start group"
    >
      <div className="relative">
        <div className="w-12 h-12 bg-gradient-to-tr from-indigo-700 via-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0 shadow-2xl shadow-indigo-500/30 relative z-20 border border-white/20">
          S
        </div>
        {/* Pulsing Halos */}
        <motion.div 
          animate={{ 
            scale: [1, 1.8, 1],
            opacity: [0.1, 0.4, 0.1]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl z-0"
        />
        <motion.div 
          animate={{ 
            rotate: 360,
            scale: [0.9, 1.1, 0.9]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-2 border-2 border-dashed border-indigo-400/20 rounded-[1.5rem] z-10"
        />
      </div>
      
      <div className="relative pt-1">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl rounded-tl-none px-7 py-5 shadow-2xl shadow-black/[0.04] flex items-center gap-2.5 min-w-[100px]">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -10, 0],
                scale: [1, 1.2, 1],
                backgroundColor: ['#6366F1', '#38BDF8', '#6366F1']
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "circInOut"
              }}
              className="w-3 h-3 rounded-full shadow-sm"
            />
          ))}
        </div>
        
        <AnimatePresence mode="wait">
          <motion.p 
            key={statusIdx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute -bottom-7 left-2 text-[10px] font-black text-indigo-500/80 dark:text-indigo-400/80 uppercase tracking-[0.25em] whitespace-nowrap"
          >
            {statuses[statusIdx]}
          </motion.p>
        </AnimatePresence>

        {/* Subtle glow beneath the bubble */}
        <div className="absolute -inset-4 bg-indigo-500/5 dark:bg-indigo-400/5 blur-3xl -z-10 rounded-full" />
      </div>
    </motion.div>
  );
};

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-950 custom-scrollbar">
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </AnimatePresence>
      {isLoading && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
