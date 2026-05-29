
import React, { useState, useMemo } from 'react';
import type { Course, Lesson, UserProgress, QuizQuestion } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, ChevronRight, PlayCircle, BookOpen, Trophy, Award, ArrowLeft, ArrowRight, HelpCircle, Star, Zap, Sparkles } from 'lucide-react';

interface LessonModalProps {
  course: Course;
  userProgress: UserProgress;
  onClose: () => void;
  onLessonComplete: (lessonId: string) => void;
}

const QuizView: React.FC<{
  quiz: QuizQuestion[];
  lessonId: string;
  onQuizComplete: (lessonId: string) => void;
}> = ({ quiz, lessonId, onQuizComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  const question = quiz[currentQuestionIndex];
  const isCorrect = selectedAnswer === question.correctAnswerIndex;

  const handleAnswer = () => {
    if (selectedAnswer === null) return;
    setShowResult(true);
  };

  const handleNext = () => {
    setShowResult(false);
    setSelectedAnswer(null);
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onQuizComplete(lessonId);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 p-8 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <HelpCircle size={100} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
            Pregunta {currentQuestionIndex + 1} de {quiz.length}
          </div>
        </div>

        <h4 className="font-black text-xl text-gray-900 dark:text-white mb-8 tracking-tight">{question.question}</h4>
        
        <div className="grid grid-cols-1 gap-4 mb-10">
          {question.options.map((option, index) => {
            let stateClass = "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-400";
            if (showResult) {
              if (index === question.correctAnswerIndex) {
                stateClass = "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300";
              } else if (index === selectedAnswer && !isCorrect) {
                stateClass = "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300";
              } else {
                stateClass = "opacity-40 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700";
              }
            } else if (selectedAnswer === index) {
              stateClass = "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600 text-indigo-600 dark:text-indigo-400";
            }

            return (
              <button 
                key={index} 
                onClick={() => !showResult && setSelectedAnswer(index)} 
                disabled={showResult}
                className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 font-bold group flex items-center justify-between ${stateClass}`}
              >
                <span>{option}</span>
                {showResult && index === question.correctAnswerIndex && <CheckCircle2 size={18} className="text-green-500" />}
                {showResult && index === selectedAnswer && !isCorrect && <X size={18} className="text-red-500" />}
              </button>
            );
          })}
        </div>
        
        <AnimatePresence>
          {showResult && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`p-6 rounded-3xl mb-8 ${isCorrect ? 'bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/50' : 'bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/50'}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl flex-shrink-0 ${isCorrect ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-200' : 'bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200'}`}>
                  {isCorrect ? <Trophy size={16} /> : <X size={16} />}
                </div>
                <div>
                  <p className={`font-black text-sm uppercase tracking-wider mb-1 ${isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {isCorrect ? '¡Excelente!' : 'Casi lo tienes'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{question.explanation}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end">
          {!showResult ? (
            <button 
              onClick={handleAnswer} 
              disabled={selectedAnswer === null} 
              className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 transition-all shadow-xl shadow-indigo-500/20"
            >
              Validar Respuesta
            </button>
          ) : (
            <button 
              onClick={handleNext} 
              className="px-10 py-4 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2"
            >
              {currentQuestionIndex < quiz.length - 1 ? 'Siguiente Pregunta' : 'Finalizar Lección'}
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const LessonModal: React.FC<LessonModalProps> = ({ course, userProgress, onClose, onLessonComplete }) => {
  const progressCount = useMemo(() => {
    return course.lessons.filter(l => !!userProgress[l.id]).length;
  }, [course.lessons, userProgress]);

  const [showOverview, setShowOverview] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson>(course.lessons[0]);

  const progressPercent = (progressCount / course.lessons.length) * 100;
  const isCourseCompleted = progressPercent === 100;

  // Update showOverview based on progress if needed, but let's just default to overview if not started
  // Actually, if a user clicks on a course, they might want to see the overview even if in progress.
  // Let's add a button in the sidebar to go back to overview.

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-950 rounded-[3.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10" 
        onClick={e => e.stopPropagation()}
      >
        <header className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
               <BookOpen size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">SAMI ACADEMY</p>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{course.title}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="hidden sm:block min-w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tu Progreso</span>
                <span className="text-xs font-black text-blue-600">{progressPercent.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ type: "spring", stiffness: 50, damping: 20 }}
                  className="h-full bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                />
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-all hover:scale-110 hover:shadow-lg"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="flex flex-grow overflow-hidden">
          <aside className="w-80 p-8 border-r border-gray-100 dark:border-gray-800 overflow-y-auto bg-gray-50/30 dark:bg-gray-950/30">
            <div className="flex items-center justify-between mb-8 px-2">
              <h3 className="font-black text-sm text-gray-400 uppercase tracking-wider">Plan de Estudios</h3>
              <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">{course.lessons.length} Lecciones</span>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => setShowOverview(true)}
                className={`w-full text-left p-5 rounded-3xl flex items-center gap-4 transition-all group ${showOverview ? 'bg-white dark:bg-gray-900 border-2 border-indigo-600 shadow-xl shadow-black/[0.03]' : 'border-2 border-transparent hover:bg-white dark:hover:bg-gray-900 hover:shadow-lg'}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${showOverview ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-400'}`}>
                  <HelpCircle size={16} />
                </div>
                <span className={`text-xs font-black transition-colors ${showOverview ? 'text-gray-900 dark:text-white' : 'text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white'}`}>Descripción del Curso</span>
              </button>

              <div className="h-px bg-gray-100 dark:border-gray-800 my-4 mx-2" />

              {course.lessons.map((lesson, idx) => {
                const isCompleted = !!userProgress[lesson.id];
                const isActive = !showOverview && activeLesson.id === lesson.id;
                
                return (
                  <button 
                    key={lesson.id}
                    onClick={() => {
                      setActiveLesson(lesson);
                      setShowOverview(false);
                    }}
                    className={`w-full text-left p-5 rounded-3xl flex items-center gap-4 transition-all group ${isActive ? 'bg-white dark:bg-gray-900 border-2 border-blue-600 shadow-xl shadow-black/[0.03]' : 'border-2 border-transparent hover:bg-white dark:hover:bg-gray-900 hover:shadow-lg'}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isCompleted ? 'bg-green-100 dark:bg-green-900/40 text-green-600' : isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'}`}>
                      {isCompleted ? <CheckCircle2 size={16} /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                    </div>
                    <span className={`text-xs font-bold transition-colors ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white'}`}>{lesson.title}</span>
                  </button>
                );
              })}
            </div>

            {isCourseCompleted && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/50 rounded-[2rem] text-center"
              >
                <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-yellow-500/10 overflow-hidden border border-yellow-100 dark:border-yellow-800">
                   <img src={course.badgeUrl} alt="Badge" className="max-w-[70%] max-h-[70%]" />
                </div>
                <h4 className="font-black text-[10px] text-yellow-700 dark:text-yellow-400 uppercase tracking-widest mb-1">LOGRO DESBLOQUEADO</h4>
                <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">¡Has ganado la insignia del curso!</p>
              </motion.div>
            )}
          </aside>

          <main className="flex-grow p-12 overflow-y-auto bg-white dark:bg-gray-950">
            <div className="max-w-3xl mx-auto">
              <AnimatePresence mode="wait">
                {showOverview ? (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="py-6"
                  >
                    <div className="flex items-center gap-4 mb-8">
                      <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Star size={12} className="fill-current" />
                        Introducción al Curso
                      </div>
                    </div>

                    <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-8 leading-tight">
                      {course.title}
                    </h2>

                    <div className="prose prose-indigo dark:prose-invert max-w-none mb-12">
                      <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                        {course.description}
                      </p>
                    </div>

                    {course.recommendationReason && (
                      <div className="p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-[3rem] border border-indigo-100 dark:border-indigo-800 mb-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                          <Zap size={60} />
                        </div>
                        <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                          <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xl shadow-indigo-500/20">
                            <Sparkles size={28} />
                          </div>
                          <div>
                            <h4 className="font-black text-indigo-900 dark:text-indigo-100 mb-2 uppercase tracking-wide text-sm">¿Por qué este curso?</h4>
                            <p className="text-indigo-800 dark:text-indigo-200/80 font-medium italic">
                              "{course.recommendationReason}"
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                      <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                           <PlayCircle size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contenido</p>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{course.lessons.length} Módulos</p>
                        </div>
                      </div>
                      <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-yellow-600 shadow-sm">
                           <Award size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Certificación</p>
                          <p className="text-sm font-black text-gray-900 dark:text-white">Insignia {course.title}</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowOverview(false)}
                      className="w-full sm:w-auto px-12 py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/30 flex items-center justify-center gap-3"
                    >
                      Empezar Lecciones <ChevronRight size={20} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeLesson.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-4 mb-8">
                      <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                        {activeLesson.type === 'video' ? 'VIDEO' : 'LECTURA'}
                      </div>
                      <div className="w-1 h-1 rounded-full bg-gray-300" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lección Actual</p>
                    </div>

                    <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-10 leading-tight">{activeLesson.title}</h3>
                    
                    <div className="prose prose-blue dark:prose-invert max-w-none mb-12">
                      <div 
                        className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg"
                        dangerouslySetInnerHTML={{ __html: activeLesson.content.replace(/\n/g, '<br />') }} 
                      />
                    </div>

                    {!userProgress[activeLesson.id] && activeLesson.quiz && activeLesson.quiz.length > 0 ? (
                        <QuizView 
                          key={`quiz-${activeLesson.id}`}
                          quiz={activeLesson.quiz} 
                          lessonId={activeLesson.id} 
                          onQuizComplete={onLessonComplete} 
                        />
                    ) : userProgress[activeLesson.id] ? (
                        <motion.div 
                          key={`completed-${activeLesson.id}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-12 p-10 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/20 rounded-[3rem] text-center relative overflow-hidden"
                        >
                            {/* If last lesson, show badge here too */}
                            {isCourseCompleted && (
                              <motion.div 
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="absolute -top-6 -right-6 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl"
                              />
                            )}

                            <div className="w-20 h-20 bg-white dark:bg-gray-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-green-500 shadow-xl shadow-green-500/10 border border-green-50">
                               <CheckCircle2 size={40} />
                            </div>
                            <h4 className="font-black text-2xl text-gray-900 dark:text-white tracking-tight mb-2">¡Completado con éxito!</h4>
                            <p className="text-gray-500 font-medium max-w-sm mx-auto">Has dominado este contenido. Continúa con la siguiente lección para seguir creciendo.</p>
                            
                            {isCourseCompleted && (
                               <div className="mt-8 flex flex-col items-center">
                                  <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex items-center justify-center p-4 mb-4 border border-yellow-200">
                                    <img src={course.badgeUrl} alt="Badge" className="max-w-full max-h-full" />
                                  </div>
                                  <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Insignia Obtenida: {course.title}</p>
                               </div>
                            )}

                            <div className="mt-10 flex justify-center">
                              <button 
                                onClick={() => {
                                  const nextIdx = course.lessons.findIndex(l => l.id === activeLesson.id) + 1;
                                  if (nextIdx < course.lessons.length) {
                                    setActiveLesson(course.lessons[nextIdx]);
                                  } else {
                                    onClose();
                                  }
                                }}
                                className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3 shadow-xl"
                              >
                                {course.lessons.findIndex(l => l.id === activeLesson.id) + 1 < course.lessons.length ? (
                                  <>Siguiente Lección <ArrowRight size={18} /></>
                                ) : (
                                  <>Cerrar y Volver <ArrowLeft size={18} /></>
                                )}
                              </button>
                            </div>
                        </motion.div>
                    ) : (
                      <div className="mt-12 flex justify-center">
                        <button 
                          onClick={() => onLessonComplete(activeLesson.id)}
                          className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/30 flex items-center gap-3"
                        >
                          Marcar como Finalizada <CheckCircle2 size={20} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      </motion.div>
    </div>
  );
};

export default LessonModal;

