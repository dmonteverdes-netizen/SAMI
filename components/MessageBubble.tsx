
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Message } from '../types';
import { Sender } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const BotAvatar: React.FC = () => (
  <motion.div 
    initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
    animate={{ scale: 1, opacity: 1, rotate: 0 }}
    className="relative flex-shrink-0"
  >
    <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20 relative z-10 uppercase">
      S
    </div>
    <motion.div 
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.1, 0.2, 0.1]
      }}
      transition={{ duration: 3, repeat: Infinity }}
      className="absolute inset-0 bg-indigo-500 rounded-2xl blur-md"
    />
  </motion.div>
);

const UserAvatar: React.FC = () => (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0, rotate: 10 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      className="w-10 h-10 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500 flex-shrink-0 shadow-sm border border-gray-100 dark:border-gray-700"
    >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
    </motion.div>
);


const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isBot = message.sender === Sender.BOT;

  const bubbleClasses = isBot
    ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-3xl rounded-tl-none border border-gray-100 dark:border-gray-800 shadow-xl shadow-black/[0.02]'
    : 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-3xl rounded-tr-none shadow-lg shadow-indigo-500/20';

  const containerClasses = `flex items-start gap-4 my-8 ${isBot ? 'justify-start' : 'justify-end flex-row-reverse'}`;
  
  const textContentWithBreaks = message.text.split('\n').map((line, index) => (
    <React.Fragment key={index}>
      {line}
      {index < message.text.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 25
      }}
      className={containerClasses}
    >
      {isBot ? <BotAvatar /> : <UserAvatar />}
      
      <div className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} max-w-[85%] md:max-w-[75%]`}>
        <motion.div 
          layout
          className={`px-6 py-4 ${bubbleClasses} relative transition-colors duration-300`}
        >
          {isBot && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent skew-x-12 pointer-events-none overflow-hidden rounded-3xl"
            />
          )}
          <div className="text-sm md:text-base leading-relaxed break-words font-medium relative z-10">
            {textContentWithBreaks}
          </div>
        </motion.div>
        
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-[9px] mt-2 font-black uppercase tracking-[0.2em] text-gray-400 px-2`}
        >
          {isBot ? 'SAMI Intelligence • Network Verificada' : 'Tú'}
        </motion.span>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
