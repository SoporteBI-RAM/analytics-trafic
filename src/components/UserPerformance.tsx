import React, { useMemo, useState } from 'react';
import { Task, User } from '../types';
import { Award, CheckCircle2, Clock, AlertCircle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { getLocalDateString, formatLocalDate } from '../utils/dateUtils';

interface UserPerformanceProps {
    tasks: Task[];
    users: User[];
    currentUser: User;
}

interface UserStats {
    userId: string;
    userName: string;
    userAvatar: string;
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
    completedTasks: Task[];
    pendingTasks: Task[];
    overdueTasks: Task[];
}

const STATUS_LABELS: Record<string, string> = {
    todo: 'Por Hacer',
    inprogress: 'En Progreso',
    review: 'En Revisión',
    done: 'Finalizado'
};

const TaskDropdown: React.FC<{ title: string; tasks: Task[]; color: string; icon: React.ReactNode }> = ({ title, tasks, color, icon }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (tasks.length === 0) return null;

    return (
        <div className="bg-gray-50 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-3 flex items-center justify-between hover:bg-gray-100 rounded-lg transition-colors ${color}`}
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs font-medium">{title}</span>
                    <span className="text-xl font-bold">{tasks.length}</span>
                </div>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isOpen && (
                <div className="p-3 space-y-2 max-h-48 overflow-y-auto border-t border-gray-200">
                    {tasks.map(task => (
                        <div key={task.id} className="text-xs bg-white rounded p-2 border border-gray-200">
                            <div className="flex items-start gap-2">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800 line-clamp-1">{task.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${task.status === 'done' ? 'bg-green-100 text-green-700' :
                                            task.status === 'inprogress' ? 'bg-blue-100 text-blue-700' :
                                                task.status === 'review' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-gray-100 text-gray-600'
                                            }`}>
                                            {STATUS_LABELS[task.status]}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            {formatLocalDate(task.dueDate)}
                                        </span>
                                    </div>
                                </div>
                                {task.isRecurring && !task.parentTaskId && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-300 rounded-full text-[10px] font-bold text-purple-700 shadow-sm flex-shrink-0">
                                        <span className="text-[8px]">🔄</span>
                                        M
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const UserPerformance: React.FC<UserPerformanceProps> = ({ tasks, users, currentUser }) => {
    const userStats = useMemo(() => {
        const today = getLocalDateString();
        const statsMap = new Map<string, UserStats>();

        // Determine which users to show based on role
        const usersToShow = currentUser.role === 'Analyst'
            ? users.filter(u => u.id === currentUser.id)
            : users;

        // Initialize stats for users
        usersToShow.forEach(user => {
            statsMap.set(user.id, {
                userId: user.id,
                userName: user.name,
                userAvatar: user.avatar,
                total: 0,
                completed: 0,
                pending: 0,
                overdue: 0,
                completionRate: 0,
                completedTasks: [],
                pendingTasks: [],
                overdueTasks: []
            });
        });

        // Calculate stats from filtered tasks
        tasks.forEach(task => {
            // A task can have multiple assignees
            task.assigneeIds.forEach(userId => {
                if (statsMap.has(userId)) {
                    const stats = statsMap.get(userId)!;
                    stats.total++;

                    if (task.status === 'done') {
                        stats.completed++;
                        stats.completedTasks.push(task);
                    } else {
                        stats.pending++;
                        stats.pendingTasks.push(task);
                        if (task.dueDate < today) {
                            stats.overdue++;
                            stats.overdueTasks.push(task);
                        }
                    }
                }
            });
        });

        // Calculate completion rates
        const result: UserStats[] = [];
        statsMap.forEach(stats => {
            if (stats.total > 0) {
                stats.completionRate = Math.round((stats.completed / stats.total) * 100);
            }
            result.push(stats);
        });

        // Sort by completion rate (descending)
        return result.sort((a, b) => b.completionRate - a.completionRate);
    }, [tasks, users, currentUser]);

    if (userStats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <AlertCircle size={48} className="mb-4" />
                <p className="text-lg font-medium">No hay datos para mostrar</p>
                <p className="text-sm">Ajusta los filtros para ver estadísticas</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                    <Award className="text-ram-blue" size={24} />
                    <h2 className="text-2xl font-bold text-gray-800">Rendimiento por Usuario</h2>
                </div>
                <p className="text-sm text-gray-500">
                    {currentUser.role === 'Analyst'
                        ? 'Mostrando tus estadísticas personales'
                        : `Mostrando estadísticas de ${userStats.length} usuario${userStats.length !== 1 ? 's' : ''}`
                    }
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userStats.map(stats => (
                    <div
                        key={stats.userId}
                        className={`bg-white rounded-xl shadow-sm border-2 p-6 hover:shadow-md transition-all ${stats.userId === currentUser.id
                            ? 'border-ram-blue bg-ram-cream/10'
                            : 'border-gray-200'
                            }`}
                    >
                        {/* User Info */}
                        <div className="flex items-center gap-3 mb-4">
                            <img
                                src={stats.userAvatar}
                                alt={stats.userName}
                                className="w-12 h-12 rounded-full object-cover border-2 border-ram-blue"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-gray-800 truncate">
                                    {stats.userName}
                                    {stats.userId === currentUser.id && (
                                        <span className="ml-2 text-xs font-normal text-ram-blue">(Tú)</span>
                                    )}
                                </h3>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-600">Cumplimiento</span>
                                <span className="text-2xl font-bold text-ram-navy">{stats.completionRate}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${stats.completionRate >= 80
                                        ? 'bg-green-500'
                                        : stats.completionRate >= 50
                                            ? 'bg-ram-gold'
                                            : 'bg-red-500'
                                        }`}
                                    style={{ width: `${stats.completionRate}%` }}
                                />
                            </div>
                        </div>

                        {/* Stats with Dropdowns */}
                        <div className="space-y-2">
                            <TaskDropdown
                                title="Completadas"
                                tasks={stats.completedTasks}
                                color="text-green-700"
                                icon={<CheckCircle2 size={16} className="text-green-600" />}
                            />
                            <TaskDropdown
                                title="Pendientes"
                                tasks={stats.pendingTasks}
                                color="text-blue-700"
                                icon={<Clock size={16} className="text-blue-600" />}
                            />
                            <TaskDropdown
                                title="Vencidas"
                                tasks={stats.overdueTasks}
                                color="text-red-700"
                                icon={<AlertCircle size={16} className="text-red-600" />}
                            />
                        </div>

                        {/* Total */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Total Asignadas</span>
                                <span className="text-lg font-bold text-ram-navy">{stats.total}</span>
                            </div>
                        </div>

                        {/* Performance Badge */}
                        {stats.completionRate >= 90 && (
                            <div className="mt-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg text-center flex items-center justify-center gap-2">
                                <TrendingUp size={14} />
                                ¡Excelente Desempeño!
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
