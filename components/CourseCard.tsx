
import React from 'react';
import type { Course } from '../types';
import ProgressBar from './ProgressBar';
import { motion } from 'motion/react';
import { ChevronRight, Star, Clock } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  progress: number;
  isRecommended: boolean;
  onClick: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, progress, isRecommended, onClick }) => {
  const isCompleted = progress >= 100;
  const level = course.level || (course.id === 'C05' ? 'Intermedio' : 'Inicial');
  const scoreReward = course.scoreReward || (course.id === 'C05' ? '+20 SAMI Score' : '+15 SAMI Score');
  const format = course.format || (course.id === 'C05' ? 'Práctico' : 'Video');

  return (
    <motion.div 
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`group bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-black/[0.02] border border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer flex flex-col h-full relative transition-all duration-300 ${isCompleted ? 'ring-2 ring-green-500/20' : ''}`}
      onClick={onClick}
    >
      {/* Decorative Background Glow */}
      <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] pointer-events-none opacity-10 transition-opacity group-hover:opacity-20 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} />

      {isRecommended && !isCompleted && (
        <div className="absolute top-6 left-6 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 text-yellow-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-400/20 animate-pulse">
          <Star size={10} className="fill-current" />
          IA Sugiere
        </div>
      )}

      <div className="p-8 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-6 pt-2">
          <div className="flex-grow pr-4">
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {course.title}
            </h3>
            
            {/* Academia Benefit Badges */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-md text-[9px] font-black uppercase tracking-wider">
                {scoreReward}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md text-[9px] font-black uppercase tracking-wider">
                Nivel: {level}
              </span>
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-md text-[9px] font-black uppercase tracking-wider">
                Formato: {format}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <Clock size={12} />
                {course.lessons.length} Lecciones
              </span>
              <div className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                {course.category || 'General'}
              </span>
            </div>
          </div>
          {isCompleted && (
            <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 p-2 border border-green-100 dark:border-green-800/50 shadow-sm flex items-center justify-center">
              <img src={course.badgeUrl} alt={`${course.title} Badge`} className="max-w-[80%] max-h-[80%]" />
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed flex-grow mb-8 line-clamp-3">
          {course.description}
        </p>

        {isRecommended && !isCompleted && course.recommendationReason && (
          <div className="mb-8 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 italic text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            "{course.recommendationReason}"
          </div>
        )}

        <div className="mt-auto space-y-6">
          {isCompleted ? (
            <div className="flex items-center justify-between p-4 bg-green-50/50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-200 rounded-xl flex items-center justify-center">
                  <Star size={16} className="fill-current" />
                </div>
                <span className="text-xs font-black text-green-700 dark:text-green-300 uppercase tracking-widest">Completado</span>
              </div>
              <ChevronRight size={16} className="text-green-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <ProgressBar 
                progress={progress} 
                showLabel={true} 
                color={isRecommended ? "bg-indigo-600" : "bg-blue-600"} 
              />
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Comenzar Lección</span>
                <ChevronRight size={14} />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CourseCard;
