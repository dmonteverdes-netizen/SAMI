
import React from 'react';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'motion/react';

interface KpiCardProps {
    title: string;
    value: string;
    trend: number;
    tooltip: string;
    isTrendPositive?: boolean; // Default true (higher is better)
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, trend, tooltip, isTrendPositive = true }) => {
    const isPositiveEffect = isTrendPositive ? trend > 0 : trend < 0;
    const isNegativeEffect = isTrendPositive ? trend < 0 : trend > 0;
    
    const trendColor = isPositiveEffect 
        ? 'text-green-600 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20' 
        : isNegativeEffect 
            ? 'text-red-600 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' 
            : 'text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700';
    
    return (
        <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between group transition-all duration-500 hover:bg-gray-950 dark:hover:bg-black hover:text-white hover:shadow-2xl hover:shadow-indigo-500/20 hover:border-transparent cursor-pointer"
        >
            <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-black text-gray-400 group-hover:text-indigo-300 uppercase tracking-[0.2em] transition-colors">{title}</span>
                <div className="group relative">
                    <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <Info size={14} />
                    </div>
                    <div className="absolute top-0 right-full mr-4 w-48 bg-gray-900 text-white text-[10px] font-bold rounded-2xl py-3 px-4 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50 shadow-2xl translate-x-2 group-hover:translate-x-0">
                        {tooltip}
                        <div className="absolute top-3 -right-1 w-2 h-2 bg-gray-900 rotate-45" />
                    </div>
                </div>
            </div>
            
            <div className="flex items-end justify-between gap-4">
                <motion.p 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-4xl font-black text-gray-900 dark:text-white group-hover:text-white tracking-tighter tabular-nums leading-none transition-colors"
                >
                    {value}
                </motion.p>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black border transition-all duration-500 shadow-sm ${trendColor}`}
                >
                    <div className="flex items-center gap-1">
                        {trend > 0 ? (
                            <TrendingUp size={12} className={isPositiveEffect ? 'text-green-600' : 'text-red-600'} />
                        ) : trend < 0 ? (
                            <TrendingDown size={12} className={isPositiveEffect ? 'text-green-600' : 'text-red-600'} />
                        ) : (
                            <Minus size={12} className="text-gray-400" />
                        )}
                        <span className="tabular-nums">{(Math.abs(trend) * 100).toFixed(1)}%</span>
                    </div>
                </motion.div>
            </div>

            {/* Visual Accent */}
            <div className="mt-6 h-1 w-8 bg-indigo-600/20 rounded-full transition-all group-hover:w-full group-hover:bg-indigo-600/40" />
        </motion.div>
    );
};

export default KpiCard;
