import React, { useMemo, useState } from 'react';
import { Task, User, Status, Priority, Client } from '../types';
import {
    BarChart3,
    CheckCircle2,
    AlertCircle,
    Clock,
    Briefcase,
    TrendingUp,
    User as UserIcon,
    Layout,
    X,
    ExternalLink,
    HelpCircle
} from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';

interface DashboardProps {
    tasks: Task[];
    contextTasks: Task[]; // Tareas sin filtro de estado (para cálculos globales)
    users: User[];
    clients: Client[];
    currentUser: User;
}

interface DrillDownState {
    title: string;
    tasks: Task[];
    color: string;
}

const STATUS_LABELS: Record<string, string> = {
    todo: 'Por Hacer',
    inprogress: 'En Progreso',
    review: 'En Revisión',
    done: 'Finalizado'
};

export const Dashboard: React.FC<DashboardProps> = ({ tasks, contextTasks, users, clients, currentUser }) => {
    const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);

    // --- KPI Calculation (Completion Rate uses contextTasks) ---
    const stats = useMemo(() => {
        // Pending/Critical/High based on CURRENT VIEW (tasks)
        const totalVisible = tasks.length;
        const pending = tasks.filter(t => t.status !== 'done');
        const critical = tasks.filter(t => t.priority === 'critical' && t.status !== 'done');
        const high = tasks.filter(t => t.priority === 'high' && t.status !== 'done');
        const activeWorkload = tasks.filter(t => t.status !== 'done');

        // Completion Rate based on CONTEXT (contextTasks - ignoring status filter)
        const contextTotal = contextTasks.length;
        const contextCompleted = contextTasks.filter(t => t.status === 'done');
        const completionRate = contextTotal > 0 ? Math.round((contextCompleted.length / contextTotal) * 100) : 0;

        // Current Month/Year Stats
        const today = getLocalDateString();
        const [currentYear, currentMonth] = today.split('-');

        const monthTasks = contextTasks.filter(t => t.dueDate.startsWith(`${currentYear}-${currentMonth}`));
        const monthCompleted = monthTasks.filter(t => t.status === 'done');
        const monthRate = monthTasks.length > 0 ? Math.round((monthCompleted.length / monthTasks.length) * 100) : 0;

        const yearTasks = contextTasks.filter(t => t.dueDate.startsWith(currentYear));
        const yearCompleted = yearTasks.filter(t => t.status === 'done');
        const yearRate = yearTasks.length > 0 ? Math.round((yearCompleted.length / yearTasks.length) * 100) : 0;

        return {
            total: totalVisible,
            pendingCount: pending.length,
            criticalCount: critical.length,
            highCount: high.length,
            completionRate,
            monthRate,
            yearRate,
            monthTotal: monthTasks.length,
            yearTotal: yearTasks.length,
            // Raw arrays for drill-down
            pendingTasks: pending,
            criticalTasks: critical,
            highTasks: high,
            activeTasks: activeWorkload,
            completedContextTasks: contextCompleted,
            monthCompletedTasks: monthCompleted,
            yearCompletedTasks: yearCompleted
        };
    }, [tasks, contextTasks]);

    // --- Breakdown by Priority (Active Tasks) ---
    const priorityBreakdown = useMemo(() => {
        const active = tasks.filter(t => t.status !== 'done');
        return {
            critical: active.filter(t => t.priority === 'critical'),
            high: active.filter(t => t.priority === 'high'),
            medium: active.filter(t => t.priority === 'medium'),
            low: active.filter(t => t.priority === 'low'),
        };
    }, [tasks]);

    // --- Breakdown by Status ---
    const statusBreakdown = useMemo(() => {
        return {
            todo: tasks.filter(t => t.status === 'todo'),
            inprogress: tasks.filter(t => t.status === 'inprogress'),
            review: tasks.filter(t => t.status === 'review'),
            done: tasks.filter(t => t.status === 'done'),
        };
    }, [tasks]);

    // --- Top Users by Workload (Pending Tasks) ---
    const userWorkload = useMemo(() => {
        const activeTasks = tasks.filter(t => t.status !== 'done');

        // Determinar qué usuarios mostrar basado en el rol
        const usersToShow = currentUser.role === 'Analyst'
            ? users.filter(u => u.id === currentUser.id)
            : users;

        const workload = usersToShow.map(user => {
            const userTasks = activeTasks.filter(t =>
                t.assigneeIds?.includes(user.id) || t.assigneeId === user.id
            );
            return { user, count: userTasks.length, tasks: userTasks };
        });
        // Sort by count desc and take top 5
        return workload.sort((a, b) => b.count - a.count).slice(0, 5);
    }, [tasks, users, currentUser]);

    // --- Client Distribution (Pending Tasks) ---
    const clientDistribution = useMemo(() => {
        const pendingTasks = tasks.filter(t => t.status !== 'done');
        const distribution = Array.from(new Set(pendingTasks.map(t => t.clientId).filter(Boolean))).map(clientId => {
            const clientTasks = pendingTasks.filter(t => t.clientId === clientId);
            const client = clients.find(c => c.id === clientId);
            return {
                id: clientId,
                name: client?.name || 'Cliente Desconocido',
                count: clientTasks.length,
                tasks: clientTasks
            };
        });
        return distribution.sort((a, b) => b.count - a.count);
    }, [tasks, clients]);

    // --- Helper for progress bars ---
    const maxWorkload = Math.max(...userWorkload.map(w => w.count), 1);

    const handleDrillDown = (title: string, tasks: Task[], color: string) => {
        setDrillDown({ title, tasks, color });
    };

    return (
        <div className="h-full overflow-y-auto p-2 relative">
            <div className="max-w-[1600px] mx-auto space-y-6 pb-12">

                {/* Header Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Layout className="text-ram-blue" />
                        Dashboard General
                    </h2>
                    <p className="text-gray-500 mt-1">Visión general del estado del proyecto. Haz clic en las tarjetas para ver detalles.</p>
                </div>

                {/* KPIs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* Card 1: Total Pending */}
                    <div
                        onClick={() => handleDrillDown('Tareas Pendientes', stats.pendingTasks, 'border-blue-500')}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer hover:border-blue-200"
                    >
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-gray-500 text-sm font-medium">Pendientes</p>
                                <div className="group/info relative">
                                    <HelpCircle size={14} className="text-gray-300 hover:text-gray-400" />
                                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50">
                                        Total de tareas que no están en estado 'Finalizado'.
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.pendingCount}</h3>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">A NIVEL GENERAL</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Clock size={20} />
                        </div>
                    </div>

                    {/* Card 2: Critical & High */}
                    <div
                        onClick={() => handleDrillDown('Alta Prioridad / Críticas', [...stats.criticalTasks, ...stats.highTasks], 'border-red-500')}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer hover:border-red-200"
                    >
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-gray-500 text-sm font-medium">Urgentes</p>
                                <div className="group/info relative">
                                    <HelpCircle size={14} className="text-gray-300 hover:text-gray-400" />
                                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50">
                                        Tareas con prioridad 'Alta' o 'Crítica' que están pendientes.
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold text-gray-800">{stats.criticalCount + stats.highCount}</h3>
                                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full uppercase">
                                    {stats.criticalCount} C
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">PRIORIDAD ALTA</p>
                        </div>
                        <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <AlertCircle size={20} />
                        </div>
                    </div>

                    {/* Card 3: Completion Rate */}
                    <div
                        onClick={() => handleDrillDown('Tareas Finalizadas (Total Contexto)', stats.completedContextTasks, 'border-emerald-500')}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer hover:border-emerald-200"
                    >
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-gray-500 text-sm font-medium">Rendimiento Total</p>
                                <div className="group/info relative">
                                    <HelpCircle size={14} className="text-gray-300 hover:text-gray-400" />
                                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50">
                                        (Tareas terminadas en total) / (Total de tareas en el contexto actual).
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.completionRate}%</h3>
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.completionRate}%` }}
                                />
                            </div>
                        </div>
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <TrendingUp size={20} />
                        </div>
                    </div>

                    {/* Card 4: Month Performance */}
                    <div
                        onClick={() => handleDrillDown('Finalizadas este Mes', stats.monthCompletedTasks, 'border-indigo-500')}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer hover:border-indigo-200"
                    >
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-gray-500 text-sm font-medium">Este Mes</p>
                                <div className="group/info relative">
                                    <HelpCircle size={14} className="text-gray-300 hover:text-gray-400" />
                                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50">
                                        Calculado como: (Tareas terminadas) / (Total de tareas con vencimiento este mes)
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.monthRate}%</h3>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{stats.monthTotal} TAREAS</p>
                        </div>
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Layout size={20} />
                        </div>
                    </div>

                    {/* Card 5: Year Performance */}
                    <div
                        onClick={() => handleDrillDown('Finalizadas este Año', stats.yearCompletedTasks, 'border-amber-500')}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer hover:border-amber-200"
                    >
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-gray-500 text-sm font-medium">Este Año</p>
                                <div className="group/info relative">
                                    <HelpCircle size={14} className="text-gray-300 hover:text-gray-400" />
                                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50">
                                        Calculado como: (Tareas terminadas) / (Total de tareas con vencimiento este año)
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.yearRate}%</h3>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{stats.yearTotal} TAREAS</p>
                        </div>
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BarChart3 size={20} />
                        </div>
                    </div>

                    {/* Card 6: Active Workload */}
                    <div
                        onClick={() => handleDrillDown('Carga de Trabajo Activa', stats.activeTasks, 'border-purple-500')}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer hover:border-purple-200"
                    >
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-gray-500 text-sm font-medium">Carga Activa</p>
                                <div className="group/info relative">
                                    <HelpCircle size={14} className="text-gray-300 hover:text-gray-400" />
                                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50">
                                        Suma de tareas 'Por Hacer', 'En Progreso' y 'En Revisión'.
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.pendingCount}</h3>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">POR HACER / PROCESO</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Briefcase size={20} />
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* Priority Distribution */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <AlertCircle size={18} className="text-gray-400" />
                            Distribución Prioridad
                        </h3>

                        <div className="space-y-4">
                            <PriorityBar
                                label="Crítica"
                                count={priorityBreakdown.critical.length}
                                color="bg-red-500"
                                total={stats.pendingCount}
                                onClick={() => handleDrillDown('Prioridad Crítica', priorityBreakdown.critical, 'border-red-500')}
                            />
                            <PriorityBar
                                label="Alta"
                                count={priorityBreakdown.high.length}
                                color="bg-orange-500"
                                total={stats.pendingCount}
                                onClick={() => handleDrillDown('Prioridad Alta', priorityBreakdown.high, 'border-orange-500')}
                            />
                            <PriorityBar
                                label="Media"
                                count={priorityBreakdown.medium.length}
                                color="bg-blue-500"
                                total={stats.pendingCount}
                                onClick={() => handleDrillDown('Prioridad Media', priorityBreakdown.medium, 'border-blue-500')}
                            />
                            <PriorityBar
                                label="Baja"
                                count={priorityBreakdown.low.length}
                                color="bg-green-500"
                                total={stats.pendingCount}
                                onClick={() => handleDrillDown('Prioridad Baja', priorityBreakdown.low, 'border-green-500')}
                            />
                        </div>

                        {stats.pendingCount === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm italic">
                                No hay tareas pendientes.
                            </div>
                        )}
                    </div>

                    {/* Status Pipeline */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <TrendingUp size={18} className="text-gray-400" />
                            Estado de Tareas
                        </h3>

                        <div className="flex flex-col gap-4">
                            <StatusBar
                                label="Por Hacer"
                                count={statusBreakdown.todo.length}
                                total={stats.total}
                                color="bg-slate-400"
                                onClick={() => handleDrillDown('Tareas Por Hacer', statusBreakdown.todo, 'border-slate-400')}
                            />
                            <StatusBar
                                label="En Progreso"
                                count={statusBreakdown.inprogress.length}
                                total={stats.total}
                                color="bg-blue-500"
                                onClick={() => handleDrillDown('Tareas En Progreso', statusBreakdown.inprogress, 'border-blue-500')}
                            />
                            <StatusBar
                                label="En Revisión"
                                count={statusBreakdown.review.length}
                                total={stats.total}
                                color="bg-purple-500"
                                onClick={() => handleDrillDown('Tareas En Revisión', statusBreakdown.review, 'border-purple-500')}
                            />
                            <StatusBar
                                label="Finalizado"
                                count={statusBreakdown.done.length}
                                total={stats.total}
                                color="bg-green-500"
                                onClick={() => handleDrillDown('Tareas Finalizadas', statusBreakdown.done, 'border-green-500')}
                            />
                        </div>
                    </div>

                    {/* Pending by Client */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Briefcase size={18} className="text-gray-400" />
                            Tareas por Cliente
                        </h3>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {clientDistribution.map(({ id, name, count, tasks: clientTasks }) => {
                                return (
                                    <div
                                        key={id}
                                        className="cursor-pointer group"
                                        onClick={() => handleDrillDown(`Tareas de ${name}`, clientTasks, 'border-ram-blue')}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-medium text-gray-600 truncate max-w-[120px] group-hover:text-ram-blue">{name}</span>
                                            <span className="text-[10px] font-bold text-gray-500">{count}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-ram-blue rounded-full transition-all duration-500"
                                                style={{ width: `${(count / stats.pendingCount) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {clientDistribution.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-sm italic">
                                    Sin clientes con pendientes.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Users Workload */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <UserIcon size={18} className="text-gray-400" />
                            Carga por Usuario
                        </h3>

                        <div className="space-y-4">
                            {userWorkload.map(({ user, count, tasks }) => (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors group"
                                    onClick={() => handleDrillDown(`Tareas de ${user.name}`, tasks, 'border-indigo-500')}
                                >
                                    <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full bg-gray-200 object-cover group-hover:ring-2 ring-indigo-200 transition-all" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">{user.name.split(' ')[0]}</span>
                                            <span className="text-[10px] font-bold text-gray-500 group-hover:text-indigo-600">{count}</span>
                                        </div>
                                        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full group-hover:bg-indigo-600 transition-colors"
                                                style={{ width: `${(count / maxWorkload) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {userWorkload.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-sm italic">
                                    Sin actividad.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Drill Down Modal */}
            {drillDown && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border-t-4 animate-in zoom-in-95 duration-200"
                        style={{ borderColor: drillDown.color.replace('border-', 'var(--tw-') }} // Fallback trick, or cleaner: just use inline style from color prop if mapped
                    >
                        <div className={`p-5 flex justify-between items-center border-b border-gray-100 ${drillDown.color.replace('border-', 'bg-').replace('500', '50')}`}>
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold text-gray-800">{drillDown.title}</h3>
                                <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-600 shadow-sm border border-gray-200">
                                    {drillDown.tasks.length}
                                </span>
                            </div>
                            <button
                                onClick={() => setDrillDown(null)}
                                className="p-2 hover:bg-black/5 rounded-full transition-colors text-gray-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                            {drillDown.tasks.length > 0 ? (
                                drillDown.tasks.map(task => (
                                    <div key={task.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">{task.title}</h4>
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${task.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                                        task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                                            task.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-green-100 text-green-700'
                                                        }`}>
                                                        {task.priority === 'critical' ? 'Critica' :
                                                            task.priority === 'high' ? 'Alta' :
                                                                task.priority === 'medium' ? 'Media' : 'Baja'}
                                                    </span>

                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${task.status === 'done' ? 'bg-green-100 text-green-700' :
                                                        task.status === 'inprogress' ? 'bg-blue-100 text-blue-700' :
                                                            task.status === 'review' ? 'bg-purple-100 text-purple-700' :
                                                                'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {STATUS_LABELS[task.status]}
                                                    </span>

                                                    {task.isRecurring && !task.parentTaskId && (
                                                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                                                            Recurrente
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-xs font-medium ${task.dueDate < getLocalDateString() && task.status !== 'done' ? 'text-red-500' : 'text-gray-500'
                                                    }`}>
                                                    {(() => {
                                                        const [year, month, day] = task.dueDate.split('T')[0].split('-');
                                                        return `${parseInt(day)}/${parseInt(month)}/${year}`;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-400 italic">
                                    No hay tareas en esta sección.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Component for Priority Bar
const PriorityBar = ({ label, count, color, total, onClick }: { label: string, count: number, color: string, total: number, onClick: () => void }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;

    return (
        <div onClick={onClick} className="cursor-pointer group">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium transition-colors">{label}</span>
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full group-hover:bg-gray-200 transition-colors">{count}</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-500 group-hover:brightness-90`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

// Helper Component for Status Bar (Refactored)
const StatusBar = ({ label, count, total, color, onClick }: { label: string, count: number, total: number, color: string, onClick: () => void }) => {
    return (
        <div onClick={onClick} className="flex items-center gap-3 cursor-pointer group">
            <div className="w-24 text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{label}</div>
            <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                <div
                    className={`h-full ${color} rounded-lg flex items-center justify-end px-2 transition-all duration-500 group-hover:brightness-95`}
                    style={{ width: `${(count / total) * 100}%` }}
                >
                    {count > 0 && <span className="text-xs text-white font-bold shadow-sm">{count}</span>}
                </div>
            </div>
        </div>
    );
};
