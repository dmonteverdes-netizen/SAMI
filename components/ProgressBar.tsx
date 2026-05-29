
import React from 'react';
import { motion } from 'motion/react';

interface ProgressBarProps {
  progress: number;
  height?: number;
  showLabel?: boolean;
  color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  height = 8, 
  showLabel = false,
  color = "bg-blue-600"
}) => {
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progreso</span>
          <span className={`text-xs font-black ${color.replace('bg-', 'text-')}`}>{Math.round(progress)}%</span>
        </div>
      )}
      <div 
        className="w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
          className={`h-full rounded-full ${color} shadow-[0_0_12px_rgba(0,0,0,0.1)]`}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
