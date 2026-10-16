
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus } from '../../types';
import { 
    Plus, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Trash2, 
    LayoutList,
    Filter,
    ChevronRight,
    ChevronLeft,
    Tag,
    Pencil,
    Bell,
    Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskModuleProps {
    tasks: Task[];
    onAddTask: (task: Omit<Task, 'id'>) => void;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onDeleteTask: (taskId: string) => void;
}

const TaskModule: React.FC<TaskModuleProps> = ({ tasks, onAddTask, onUpdateTask, onDeleteTask }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [isGroupedByCategory, setIsGroupedByCategory] = useState(false);
    
    // Animation state for updates
    const [taskRevisions, setTaskRevisions] = useState<Record<string, number>>({});
    
    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Extract unique categories
    const uniqueCategories = useMemo(() => {
        const categories = tasks.map(t => t.category).filter((c): c is string => !!c);
        return Array.from(new Set(categories));
    }, [tasks]);
    
    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [category, setCategory] = useState('');
    const [reminderDaysBefore, setReminderDaysBefore] = useState<number | ''>('');
    const [taskStatus, setTaskStatus] = useState<TaskStatus>(TaskStatus.PENDING);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const reminderVal = reminderDaysBefore === '' ? undefined : Number(reminderDaysBefore);
        if (editingTaskId) {
            setTaskRevisions(prev => ({
                ...prev,
                [editingTaskId]: (prev[editingTaskId] || 0) + 1
            }));
            onUpdateTask(editingTaskId, {
                title,
                description,
                dueDate,
                priority,
                category: category || undefined,
                reminderDaysBefore: reminderVal,
                status: taskStatus
            });
        } else {
            onAddTask({
                title,
                description,
                dueDate,
                priority,
                status: taskStatus,
                category: category || undefined,
                reminderDaysBefore: reminderVal
            });
        }
        resetForm();
    };

    const handleEdit = (task: Task) => {
        setEditingTaskId(task.id);
        setTitle(task.title);
        setDescription(task.description);
        setDueDate(task.dueDate);
        setPriority(task.priority);
        setCategory(task.category || '');
        setReminderDaysBefore(task.reminderDaysBefore ?? '');
        setTaskStatus(task.status);
        setShowForm(true);
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDueDate('');
        setPriority('medium');
        setCategory('');
        setReminderDaysBefore('');
        setTaskStatus(TaskStatus.PENDING);
        setEditingTaskId(null);
        setShowForm(false);
    };

    const filteredTasks = tasks.filter(t => {
        const matchesStatus = filter === 'all' || t.status === filter;
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesStatus && matchesCategory;
    });

    const groupedTasks = useMemo(() => {
        if (!isGroupedByCategory) return null;
        const groups: Record<string, Task[]> = {};
        filteredTasks.forEach(task => {
            const cat = task.category || 'Sin Categoría';
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(task);
        });
        return groups;
    }, [filteredTasks, isGroupedByCategory]);

    const renderTaskCard = (task: Task) => {
        return (
            <motion.div 
                layout
                key={`${task.id}-${taskRevisions[task.id] || 0}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`group bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-6 transition-all hover:shadow-md ${
                    task.status === 'completed' ? 'opacity-70 dark:opacity-50' : ''
                }`}
            >
                <button 
                    onClick={() => {
                        let nextStatus: TaskStatus = TaskStatus.PENDING;
                        if (task.status === TaskStatus.PENDING) nextStatus = TaskStatus.IN_PROGRESS;
                        else if (task.status === TaskStatus.IN_PROGRESS) nextStatus = TaskStatus.COMPLETED;
                        else if (task.status === TaskStatus.COMPLETED) nextStatus = TaskStatus.PENDING;
                        else if (task.status === TaskStatus.OVERDUE) nextStatus = TaskStatus.IN_PROGRESS;
                        onUpdateTask(task.id, { status: nextStatus });
                    }}
                    type="button"
                    aria-label={`Cambiar estado de la tarea "${task.title}". Estado actual: ${getStatusConfig(task.status).label}`}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        task.status === 'completed' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 hover:scale-105' 
                        : task.status === 'in_progress'
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30 hover:scale-105'
                        : task.status === 'overdue'
                        ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30 hover:scale-105'
                        : 'bg-gray-50 dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-700 group-hover:border-indigo-300 hover:scale-105'
                    }`}
                    title="Haga clic para alternar el estado de la tarea (Pendiente → En Progreso → Completada)"
                >
                    {getStatusIcon(task.status)}
                </button>
                
                <div className="flex-grow min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className={`font-black text-gray-900 dark:text-white truncate transition-all ${
                            task.status === 'completed' ? 'line-through text-gray-400' : ''
                        }`}>
                            {task.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${getPriorityColor(task.priority)}`}>
                                {task.priority === 'low' ? 'Baja' : task.priority === 'medium' ? 'Media' : 'Alta'}
                            </span>
                            {task.category && (
                                <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-md font-mono">
                                    <Tag size={10} aria-hidden="true" /> {task.category}
                                </span>
                            )}
                            {task.reminderDaysBefore !== undefined && (
                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 font-mono">
                                    <Bell size={10} aria-hidden="true" /> {task.reminderDaysBefore === 0 ? 'Hoy' : `${task.reminderDaysBefore}d antes`}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className={`text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2.5 ${
                        task.status === 'completed' ? 'text-gray-400 dark:text-gray-500' : ''
                    }`}>
                        {task.description}
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full uppercase tracking-tighter font-mono">
                            <Calendar size={12} aria-hidden="true" />
                            Vence: {task.dueDate}
                        </div>
                        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-0.5 border rounded-full font-mono ${getStatusConfig(task.status).bgClass}`}>
                            {getStatusConfig(task.status).icon}
                            {getStatusConfig(task.status).label}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-all duration-200 shrink-0">
                    <button 
                        id={`edit-task-btn-${task.id}`}
                        onClick={() => handleEdit(task)}
                        type="button"
                        aria-label={`Editar tarea: ${task.title}`}
                        className="p-2.5 md:p-3 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-2xl transition-all active:scale-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        title="Editar tarea"
                    >
                        <Pencil size={18} aria-hidden="true" />
                    </button>
                    <button 
                        id={`delete-task-btn-${task.id}`}
                        onClick={() => onDeleteTask(task.id)}
                        type="button"
                        aria-label={`Eliminar tarea: ${task.title}`}
                        className="p-2.5 md:p-3 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl transition-all active:scale-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500"
                        title="Eliminar tarea"
                    >
                        <Trash2 size={18} aria-hidden="true" />
                    </button>
                </div>
            </motion.div>
        );
    };

    // Calendar logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        
        const days = [];
        // Fill empty slots from previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        // Fill actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentMonth]);

    const changeMonth = (offset: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
    };

    const handleDateClick = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        setDueDate(dateStr);
        setEditingTaskId(null);
        setTitle('');
        setDescription('');
        setPriority('medium');
        setCategory('');
        setShowForm(true);
    };

    const getTasksForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return filteredTasks.filter(t => t.dueDate === dateStr);
    };

    const getStatusIcon = (status: TaskStatus) => {
        switch(status) {
            case 'completed': return <CheckCircle2 className="text-emerald-500" size={18} />;
            case 'overdue': return <AlertCircle className="text-rose-500" size={18} />;
            case 'in_progress': return <Timer className="text-indigo-500 animate-pulse" size={18} />;
            default: return <Clock className="text-sky-500" size={18} />;
        }
    };

    const getStatusConfig = (status: TaskStatus) => {
        switch(status) {
            case 'completed':
                return {
                    label: 'Completada',
                    bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
                    icon: <CheckCircle2 size={12} className="text-emerald-500 dark:text-emerald-400" />
                };
            case 'overdue':
                return {
                    label: 'Vencida',
                    bgClass: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
                    icon: <AlertCircle size={12} className="text-rose-500 dark:text-rose-400" />
                };
            case 'in_progress':
                return {
                    label: 'En Progreso',
                    bgClass: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30',
                    icon: <Timer size={12} className="text-indigo-500 dark:text-indigo-400 animate-pulse" />
                };
            default:
                return {
                    label: 'Pendiente',
                    bgClass: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30',
                    icon: <Clock size={12} className="text-sky-500 dark:text-sky-400" />
                };
        }
    };

    const getPriorityColor = (priority: string) => {
        switch(priority) {
            case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-10 max-w-5xl h-full flex flex-col gap-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-grow">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                        {editingTaskId ? 'Editar Tarea' : 'Gestión de Tareas'}
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex" role="tablist" aria-label="Modo de visualización de tareas">
                            <button 
                                onClick={() => setViewMode('list')}
                                role="tab"
                                aria-selected={viewMode === 'list'}
                                aria-label="Vista de lista"
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Lista
                            </button>
                            <button 
                                onClick={() => setViewMode('calendar')}
                                role="tab"
                                aria-selected={viewMode === 'calendar'}
                                aria-label="Vista de calendario"
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Calendario
                            </button>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                            {editingTaskId ? 'Modifica los detalles de tu tarea.' : 'Organiza tu día y mantente productivo.'}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    aria-expanded={showForm}
                    aria-controls="task-form-panel"
                    aria-label={showForm ? 'Cerrar formulario de tarea' : 'Abrir formulario para crear o editar tarea'}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <Plus size={18} aria-hidden="true" />
                    <span>NUEVA TAREA</span>
                </button>
            </header>

            <AnimatePresence>
                {showForm && (
                    <motion.div 
                        id="task-form-panel"
                        role="region"
                        aria-labelledby="task-form-heading"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700"
                    >
                        <h2 id="task-form-heading" className="sr-only">
                            {editingTaskId ? 'Editar Tarea' : 'Crear Nueva Tarea'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="task-title-input" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                        Título de la Tarea <span className="text-red-500" aria-hidden="true">*</span>
                                    </label>
                                    <input 
                                        id="task-title-input"
                                        type="text" 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Ej: Revisar inventario de hilos"
                                        aria-required="true"
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-800 dark:text-white"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="task-duedate-input" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                        Fecha de Vencimiento <span className="text-red-500" aria-hidden="true">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} aria-hidden="true" />
                                        <input 
                                            id="task-duedate-input"
                                            type="date" 
                                            value={dueDate} 
                                            onChange={e => setDueDate(e.target.value)}
                                            aria-required="true"
                                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-800 dark:text-white"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label htmlFor="task-description-input" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                    Descripción
                                </label>
                                <textarea 
                                    id="task-description-input"
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Detalles adicionales sobre lo que hay que hacer..."
                                    aria-label="Descripción detallada de la tarea"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-800 dark:text-white min-h-[100px]"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <fieldset className="space-y-2">
                                    <legend id="priority-fieldset-label" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                        Prioridad
                                    </legend>
                                    <div className="flex gap-2" role="radiogroup" aria-labelledby="priority-fieldset-label">
                                        {(['low', 'medium', 'high'] as const).map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                role="radio"
                                                aria-checked={priority === p}
                                                aria-label={`Prioridad ${p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : 'Alta'}`}
                                                onClick={() => setPriority(p)}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                    priority === p 
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' 
                                                    : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                {p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : 'Alta'}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                                <div className="space-y-2">
                                    <label htmlFor="task-status-select" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                        Estado
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" aria-hidden="true">
                                            {getStatusIcon(taskStatus)}
                                        </div>
                                        <select 
                                            id="task-status-select"
                                            value={taskStatus} 
                                            onChange={e => setTaskStatus(e.target.value as TaskStatus)}
                                            aria-label="Estado de la tarea"
                                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 pl-12 pr-8 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-800 dark:text-white appearance-none"
                                        >
                                            <option value="pending">Pendiente</option>
                                            <option value="in_progress">En Progreso</option>
                                            <option value="completed">Completada</option>
                                            <option value="overdue">Vencida</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="task-category-input" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                        Categoría (Opcional)
                                    </label>
                                    <div className="relative">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} aria-hidden="true" />
                                        <input 
                                            id="task-category-input"
                                            type="text" 
                                            value={category} 
                                            onChange={e => setCategory(e.target.value)}
                                            placeholder="Ej: Inventario, SUNAT, Ventas"
                                            aria-label="Categoría de la tarea (opcional)"
                                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="task-reminder-select" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                        Recordatorio (Días Antes)
                                    </label>
                                    <div className="relative">
                                        <Bell className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={18} aria-hidden="true" />
                                        <select 
                                            id="task-reminder-select"
                                            value={reminderDaysBefore} 
                                            onChange={e => setReminderDaysBefore(e.target.value === '' ? '' : Number(e.target.value))}
                                            aria-label="Configurar recordatorio antes de vencimiento"
                                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 pl-12 pr-8 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-800 dark:text-white appearance-none"
                                        >
                                            <option value="">Sin recordatorio</option>
                                            <option value="0">El mismo día</option>
                                            <option value="1">1 día antes</option>
                                            <option value="2">2 días antes</option>
                                            <option value="3">3 días antes</option>
                                            <option value="7">1 semana antes</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50 dark:border-gray-700">
                                <button 
                                    type="button" 
                                    onClick={resetForm}
                                    aria-label="Cancelar y cerrar formulario"
                                    className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    aria-label={editingTaskId ? 'Actualizar tarea' : 'Guardar nueva tarea'}
                                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                                >
                                    {editingTaskId ? 'Actualizar Tarea' : 'Guardar Tarea'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div className="flex flex-wrap items-center gap-2 md:gap-4" role="group" aria-label="Filtrar tareas por estado">
                    <div className="flex items-center gap-2 mr-2 text-gray-400">
                        <Filter size={16} aria-hidden="true" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Estado:</span>
                    </div>
                    {(['all', 'pending', 'in_progress', 'completed', 'overdue'] as const).map(f => {
                        const count = f === 'all' ? tasks.length : tasks.filter(t => t.status === f).length;
                        const labelText = f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'in_progress' ? 'En Progreso' : f === 'completed' ? 'Completadas' : 'Vencidas';
                        return (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setFilter(f as TaskStatus | 'all')}
                                aria-pressed={filter === f}
                                aria-label={`Filtrar por ${labelText} (${count})`}
                                className={`text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    filter === f 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/40'
                                }`}
                            >
                                <span>
                                    {labelText}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${
                                    filter === f 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Category Dropdown Filter */}
                    <div className="flex items-center gap-2">
                        <Tag size={16} className="text-gray-400" aria-hidden="true" />
                        <label htmlFor="task-category-filter-dropdown" className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Categoría:</label>
                        <div className="relative">
                            <select
                                id="task-category-filter-dropdown"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                aria-label="Filtrar tareas por categoría"
                                className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-gray-800 dark:text-gray-250 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">Todas ({tasks.length})</option>
                                {uniqueCategories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat} ({tasks.filter(t => t.category === cat).length})
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" aria-hidden="true">
                                <ChevronRight size={12} className="rotate-90" />
                            </div>
                        </div>
                    </div>

                    {/* Grouping Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsGroupedByCategory(!isGroupedByCategory)}
                        aria-pressed={isGroupedByCategory}
                        aria-label="Agrupar tareas por categoría en la vista de lista"
                        className={`text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl border transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isGroupedByCategory 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20' 
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700'
                        }`}
                        title="Agrupar tareas por categoría en la vista de lista"
                    >
                        <span>Agrupar por Categoría</span>
                        <span className={`w-2 h-2 rounded-full ${isGroupedByCategory ? 'bg-white animate-pulse' : 'bg-gray-300 dark:bg-gray-650'}`} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {viewMode === 'list' ? (
                    <motion.div 
                        key="list-view"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 gap-4">
                            {filteredTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-gray-900/30 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                                    <LayoutList className="text-gray-300 mb-4" size={48} aria-hidden="true" />
                                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">No hay tareas que mostrar</p>
                                </div>
                            ) : isGroupedByCategory && groupedTasks ? (
                                <div className="space-y-8">
                                    {(Object.entries(groupedTasks) as [string, Task[]][]).map(([catName, catTasks]) => (
                                        <div key={catName} className="space-y-4">
                                            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg" aria-hidden="true">
                                                    <Tag size={12} />
                                                </div>
                                                <div className="flex-grow">
                                                    <h3 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest font-mono">
                                                        {catName}
                                                    </h3>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/25">
                                                    {catTasks.length} {catTasks.length === 1 ? 'tarea' : 'tareas'}
                                                </span>
                                            </div>
                                            <div className="space-y-3 pl-0 md:pl-2">
                                                <AnimatePresence mode="popLayout">
                                                    {catTasks.map(task => renderTaskCard(task))}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <AnimatePresence mode="popLayout">
                                        {filteredTasks.map(task => renderTaskCard(task))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="calendar-view"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xl"
                    >
                        {/* Calendar Header */}
                        <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white capitalize">
                                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h2>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => changeMonth(-1)}
                                    aria-label="Ver mes anterior"
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <ChevronLeft size={20} aria-hidden="true" />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setCurrentMonth(new Date())}
                                    aria-label="Ir al mes actual"
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    Hoy
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => changeMonth(1)}
                                    aria-label="Ver mes siguiente"
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <ChevronRight size={20} aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-700" role="grid" aria-label="Calendario de tareas">
                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                                <div key={day} className="bg-gray-50 dark:bg-gray-900 py-4 text-center" role="columnheader">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{day}</span>
                                </div>
                            ))}
                            {calendarDays.map((date, i) => {
                                if (!date) return <div key={`empty-${i}`} className="bg-white dark:bg-gray-800 min-h-[120px] opacity-30" role="gridcell" aria-hidden="true" />;
                                
                                const dayTasks = getTasksForDate(date);
                                const isToday = date.toDateString() === new Date().toDateString();
                                const formattedDateStr = date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
                                
                                return (
                                    <div 
                                        key={date.toISOString()} 
                                        role="gridcell"
                                        tabIndex={0}
                                        aria-label={`Fecha ${formattedDateStr}, ${dayTasks.length} ${dayTasks.length === 1 ? 'tarea' : 'tareas'}`}
                                        onClick={() => handleDateClick(date)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleDateClick(date);
                                            }
                                        }}
                                        className={`bg-white dark:bg-gray-800 min-h-[140px] p-4 border-t border-transparent hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-all group relative focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            isToday ? 'bg-blue-50/20 dark:bg-blue-900/10 shadow-inner' : ''
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-sm font-black transition-all ${
                                                isToday ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-lg shadow-lg shadow-blue-500/20' : 'text-gray-900 dark:text-white group-hover:scale-110'
                                            }`}>
                                                {date.getDate()}
                                            </span>
                                            {dayTasks.length > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md">
                                                        {dayTasks.length}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1.5 relative z-10">
                                            {dayTasks.slice(0, 3).map(task => (
                                                <div 
                                                    key={task.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(task);
                                                    }}
                                                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black truncate cursor-pointer transition-all hover:translate-x-1 border flex items-center gap-1 ${
                                                        task.status === 'completed' 
                                                        ? 'bg-emerald-50 text-emerald-700 line-through dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100' 
                                                        : task.status === 'overdue'
                                                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-100'
                                                        : task.status === 'in_progress'
                                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-100 ring-1 ring-indigo-500/5 animate-pulse-subtle'
                                                        : 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border-slate-100'
                                                    }`}
                                                >
                                                    <span className="flex-shrink-0">{getStatusIcon(task.status)}</span>
                                                    <span className="truncate">{task.title}</span>
                                                </div>
                                            ))}
                                            {dayTasks.length > 3 && (
                                                <div className="text-[9px] font-black text-gray-400 pl-1 uppercase tracking-widest mt-1">
                                                    + {dayTasks.length - 3} más
                                                </div>
                                            )}
                                        </div>
                                        {/* New task ghost indicator on hover */}
                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300">
                                            <Plus size={14} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TaskModule;
