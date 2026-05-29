
import React, { useState, useEffect, useMemo } from 'react';
import type { Course, Invoice, UserProgress, SamiScoreResult } from '../types';
import { getRecommendedCourses, getCourses, getUserProgress } from '../services/educationService';
import CourseCard from './CourseCard';
import LessonModal from './LessonModal';
import { motion, AnimatePresence } from 'motion/react';
import SamiScoreGauge from './SamiScoreGauge';
import { Award, BookOpen, Filter, Search, Star, Zap, ChevronRight, CheckCircle2, Trophy, Shield, CreditCard, Sparkles, TrendingUp, X } from 'lucide-react';

interface EducationModuleProps {
  salesHistory: Invoice[];
  courses: Course[];
  userProgress: UserProgress;
  onLessonComplete: (lessonId: string) => void;
  isFinanceCertified: boolean;
  samiScore?: SamiScoreResult | null;
}

const EducationModule: React.FC<EducationModuleProps> = ({ salesHistory, courses, userProgress, onLessonComplete, isFinanceCertified, samiScore }) => {
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'finance' | 'accounting' | 'growth' | 'operations'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [localCourses, setLocalCourses] = useState<Course[]>(courses.length > 0 ? courses : []);
  const [localUserProgress, setLocalUserProgress] = useState<UserProgress>(Object.keys(userProgress).length > 0 ? userProgress : {});

  // Sync local state if props change (e.g., when completing a lesson)
  useEffect(() => {
    if (courses && courses.length > 0) {
      setLocalCourses(courses);
    }
  }, [courses]);

  useEffect(() => {
    if (userProgress && Object.keys(userProgress).length > 0) {
      setLocalUserProgress(userProgress);
    }
  }, [userProgress]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Llamada asíncrona real a getCourses y getUserProgress
        const [allCourses, progress] = await Promise.all([
          getCourses(),
          getUserProgress()
        ]);
        
        // Simular un leve retraso decorativo para mostrar el spinner y mejorar UX
        await new Promise(resolve => setTimeout(resolve, 800));

        if (active) {
          setLocalCourses(allCourses);
          setLocalUserProgress(progress);
          const recommendations = getRecommendedCourses(salesHistory);
          setRecommendedCourses(recommendations);
        }
      } catch (error) {
        console.error("Error al obtener los cursos y el progreso:", error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, [salesHistory]);

  const calculateProgress = (course: Course): number => {
    if (course.lessons.length === 0) return 0;
    const completedLessons = course.lessons.filter(lesson => localUserProgress[lesson.id]).length;
    return (completedLessons / course.lessons.length) * 100;
  };

  const filteredCourses = useMemo(() => {
    return localCourses.filter(course => {
      const matchesCategory = activeCategory === 'all' || course.category === activeCategory;
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           course.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [localCourses, activeCategory, searchQuery]);

  const completedCourses = useMemo(() => {
    return localCourses.filter(course => calculateProgress(course) >= 100);
  }, [localCourses, localUserProgress]);

  const isAllCompleted = localCourses.length > 0 && completedCourses.length === localCourses.length;

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
                <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                   className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"
                />
                <p className="mt-6 text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest text-sm">Cargando Academia...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {isFinanceCertified && (
        <motion.div 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-emerald-600 text-white py-4 px-6 relative z-50 border-b border-emerald-500 shadow-lg shadow-emerald-500/20"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-[1.2rem] flex items-center justify-center shadow-inner">
                <CheckCircle2 size={24} className="text-white drop-shadow-sm" />
              </div>
              <div>
                <h4 className="text-base font-black tracking-tighter">¡Certificación Financiera Completada!</h4>
                <p className="text-xs font-bold text-emerald-50/80 uppercase tracking-widest">Has finalizado todos los cursos de finanzas con éxito</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 bg-black/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">
                <Shield size={12} className="text-indigo-200" />
                Perfil verificado
              </div>
              <Trophy size={24} className="text-white/30" />
            </div>
          </div>
        </motion.div>
      )}

      {isAllCompleted && !isFinanceCertified && (
        <motion.div 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-emerald-600 text-white py-4 px-6 relative z-50 border-b border-emerald-500 shadow-lg shadow-emerald-500/20"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-[1.2rem] flex items-center justify-center shadow-inner">
                <Trophy size={24} className="text-white drop-shadow-sm" />
              </div>
              <div>
                <h4 className="text-base font-black tracking-tighter">¡Maestría Financiera Completada!</h4>
                <p className="text-xs font-bold text-emerald-50/80 uppercase tracking-widest">Has finalizado el 100% de tu formación en SAMI Academy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 bg-black/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">
                <Sparkles size={12} className="text-yellow-300" />
                Score Maximizada
              </div>
              <CheckCircle2 size={24} className="text-white/30" />
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 pt-32 pb-20 px-6 sm:px-10">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-64 h-64 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row lg:items-center justify-between gap-12"
          >
            <div className="max-w-2xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                <Star size={14} className="fill-current" />
                SAMI ACADEMY
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-8">
                Capacítate para <span className="text-indigo-600">Crecer</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                Accede a contenido exclusivo diseñado para MYPES peruanas. Domina tus finanzas, impuestos y ventas para desbloquear mejores condiciones de crédito.
              </p>
            </div>

            <div className="lg:w-96 flex flex-col gap-6">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-2xl shadow-indigo-500/10 border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Trophy size={80} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Tu Progreso</h3>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      {completedCourses.length} <span className="text-gray-400 text-sm">Cursos</span>
                    </p>
                    <p className="text-indigo-600 font-black text-xl">{completedCourses.length > 0 ? (completedCourses.length / localCourses.length * 100).toFixed(0) : 0}%</p>
                  </div>
                  <div className="w-full h-3 bg-gray-50 dark:bg-gray-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedCourses.length / localCourses.length) * 100}%` }}
                      className="h-full bg-gradient-to-r from-indigo-600 to-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-widest">
                    {localCourses.length - completedCourses.length} cursos pendientes por completar
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 -mt-10 relative z-20">
        {/* Credit Eligibility Section */}
        {samiScore && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Detailed Score Analysis */}
              <div className="lg:col-span-1">
                <SamiScoreGauge scoreResult={samiScore} />
              </div>

              {/* Eligibility & Benefits */}
              <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-950 rounded-[3rem] p-1 shadow-2xl flex flex-col">
                <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-[2.9rem] p-10 h-full flex flex-col border border-white/10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">Tu Estado de Elegibilidad</h3>
                      <p className="text-indigo-200/60 text-[10px] font-bold uppercase tracking-widest">Nivel de Confianza SAMI</p>
                    </div>
                  </div>

                  <div className="space-y-8 flex-grow">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Sparkles size={12} /> Capital Trabajo
                        </p>
                        <p className="text-3xl font-black text-white mb-1">S/ {(samiScore.avgMonthlySales * 2).toLocaleString()}</p>
                        <p className="text-xs text-indigo-100/40 font-medium">Línea de crédito estimada</p>
                      </div>
                      
                      <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <CreditCard size={12} /> Factoring
                        </p>
                        <p className="text-3xl font-black text-white mb-1">S/ {(samiScore.avgMonthlySales * 1.5).toLocaleString()}</p>
                        <p className="text-xs text-indigo-100/40 font-medium">Adelanto de facturado</p>
                      </div>
                    </div>

                    <div className="p-8 bg-indigo-500/10 rounded-3xl border border-indigo-400/20">
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                           <Shield size={32} className="text-white" />
                        </div>
                        <div>
                          <h4 className="text-white font-black text-lg mb-2">Análisis IA de SAMI</h4>
                          <p className="text-indigo-100/70 text-sm leading-relaxed">
                            {samiScore.score >= 650 
                              ? "Tu comportamiento financiero es ejemplar. Tienes acceso a tasas preferenciales (TEA 18-24%). Completa los cursos de 'Optimización Fiscal' para mantener este nivel." 
                              : "Tienes un perfil sólido con potencial de crecimiento. Recomendamos formalizar al 100% tus facturas del último mes para subir tu score a 'Excelente'."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-indigo-200/50 uppercase tracking-widest">Validado con SUNAT/SUNARP</span>
                     </div>
                     <button className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest hover:text-indigo-300 transition-colors">
                        Saber más <ChevronRight size={14} />
                     </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recommended & Badges Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          {/* My Badges Section */}
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-800 shadow-xl shadow-black/[0.02]">
            <div className="flex items-center justify-between mb-10">
              <h3 className="font-black text-xl text-gray-900 dark:text-white tracking-tight">Mis Insignias</h3>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 rounded-2xl">
                <Award size={20} />
              </div>
            </div>
            
            {completedCourses.length === 0 ? (
              <div className="text-center py-10 opacity-40">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 grayscale">
                   <Zap size={32} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Aún no tienes insignias</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                {completedCourses.map(course => (
                  <motion.div 
                    key={course.id}
                    title={course.title}
                    whileHover={{ scale: 1.1 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 p-2 border border-indigo-100 dark:border-indigo-800 shadow-sm overflow-hidden flex items-center justify-center">
                       <img src={course.badgeUrl} alt={course.title} className="max-w-full max-h-full" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {isFinanceCertified && (
              <div className="mt-10 p-6 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-3xl text-white shadow-xl shadow-indigo-500/30">
                 <div className="flex items-center gap-4 mb-3">
                   <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <CheckCircle2 size={18} />
                   </div>
                   <h4 className="font-black text-sm uppercase tracking-wider">Mundo Financiero</h4>
                 </div>
                 <p className="text-[11px] leading-relaxed opacity-90">
                   Has desbloqueado tasas preferenciales con socios estratégicos al completar tu formación básica.
                 </p>
              </div>
            )}
          </div>

          {/* Recommended Horizontal Scroll/List */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-800 shadow-xl shadow-black/[0.02]">
            <div className="flex items-center justify-between mb-10">
              <h3 className="font-black text-xl text-gray-900 dark:text-white tracking-tight">Recomendados para ti</h3>
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl">
                 IA Sugiere
              </div>
            </div>

            <div className="flex overflow-x-auto gap-8 pb-4 -mx-2 px-2 scrollbar-hide">
              {recommendedCourses.map(course => (
                <div key={course.id} className="min-w-[320px] flex-shrink-0">
                  <CourseCard 
                    course={course} 
                    progress={calculateProgress(course)} 
                    isRecommended={true}
                    onClick={() => setSelectedCourse(course)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters & All Courses Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-1 bg-indigo-600 rounded-full" />
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Todos los Cursos</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Busca temas específicos o filtra por categoría para potenciar tu MYPE.</p>
        </div>

        <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
           <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
             <button 
              onClick={() => setActiveCategory('all')}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800'}`}
             >
               Todos
             </button>
             <button 
              onClick={() => setActiveCategory('finance')}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'finance' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800'}`}
             >
               Finanzas
             </button>
             <button 
              onClick={() => setActiveCategory('accounting')}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'accounting' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800'}`}
             >
               Contabilidad
             </button>
             <button 
              onClick={() => setActiveCategory('growth')}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'growth' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800'}`}
             >
               Ventas
             </button>
             <button 
              onClick={() => setActiveCategory('operations')}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'operations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800'}`}
             >
               Operaciones
             </button>
           </div>

           <div className="relative group w-full md:w-auto">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Buscar por título o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-80 h-14 pl-14 pr-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
           </div>
        </div>

        {/* Results Counter */}
        <div className="mb-8 flex items-center justify-between px-2">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
             Mostrando {filteredCourses.length} de {localCourses.length} cursos
           </p>
           {searchQuery && (
             <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">
               Resultados para: "{searchQuery}"
             </p>
           )}
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <AnimatePresence>
            {filteredCourses.length > 0 ? (
              filteredCourses.map(course => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <CourseCard 
                      course={course} 
                      progress={calculateProgress(course)}
                      isRecommended={false}
                      onClick={() => setSelectedCourse(course)}
                  />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-white dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300">
                  <Filter size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No encontramos nada así</h3>
                <p className="text-gray-400">Intenta con otra categoría o términos de búsqueda.</p>
              </div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {selectedCourse && (
        <LessonModal
          course={selectedCourse}
          userProgress={localUserProgress}
          onClose={() => setSelectedCourse(null)}
          onLessonComplete={onLessonComplete}
        />
      )}
    </div>
  );
};

export default EducationModule;
