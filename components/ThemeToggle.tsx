import React from 'react';
import { motion } from 'motion/react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
    isCollapsed?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isCollapsed = false }) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div 
            className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-2'}`}
        >
            {!isCollapsed && (
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    {isDark ? 'Modo Oscuro' : 'Modo Claro'}
                </span>
            )}
            
            <button
                onClick={toggleTheme}
                className={`
                    relative h-8 w-14 rounded-full p-1 transition-colors duration-500 cursor-pointer outline-none
                    ${isDark ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-slate-200 shadow-inner'}
                `}
                aria-label="Alternar Tema"
            >
                <motion.div
                    animate={{ 
                        x: isDark ? 24 : 0,
                        rotate: isDark ? 360 : 0
                    }}
                    transition={{ 
                        type: "spring", 
                        stiffness: 500, 
                        damping: 30 
                    }}
                    className={`
                        h-6 w-6 rounded-full flex items-center justify-center shadow-lg
                        ${isDark ? 'bg-white text-indigo-600' : 'bg-white text-slate-400'}
                    `}
                >
                    {isDark ? (
                        <Moon size={14} strokeWidth={3} />
                    ) : (
                        <Sun size={14} strokeWidth={3} />
                    )}
                </motion.div>
            </button>
        </div>
    );
};

export default ThemeToggle;
