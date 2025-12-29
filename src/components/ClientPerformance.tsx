import React, { useMemo } from 'react';
import { Task, Client, User } from '../types';
import { TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface ClientPerformanceProps {
    tasks: Task[];
    clients: Client[];
    currentUser: User;
}

interface ClientStats {
    clientId: string | null;
    clientName: string;
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
}

export const ClientPerformance: React.FC<ClientPerformanceProps> = ({ tasks, clients, currentUser }) => {
    const clientStats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const statsMap = new Map<string | null, ClientStats>();

        // Initialize stats for all clients
        clients.forEach(client => {
            statsMap.set(client.id, {
                clientId: client.id,
                clientName: client.name,
                total: 0,
                completed: 0,
                pending: 0,
                overdue: 0,
                completionRate: 0
            });
        });

        // Add "Sin Cliente" category
        statsMap.set(null, {
            clientId: null,
            clientName: 'Sin Cliente',
            total: 0,
            completed: 0,
            pending: 0,
            overdue: 0,
            completionRate: 0
        });

        // Calculate stats from filtered tasks
        tasks.forEach(task => {
            const clientId = task.clientId;

            if (!statsMap.has(clientId)) {
                // Client not in list, create entry
                const client = clients.find(c => c.id === clientId);
                statsMap.set(clientId, {
                    clientId,
                    clientName: client?.name || 'Cliente Desconocido',
                    total: 0,
                    completed: 0,
                    pending: 0,
                    overdue: 0,
                    completionRate: 0
                });
            }

            const stats = statsMap.get(clientId)!;
            stats.total++;

            if (task.status === 'done') {
                stats.completed++;
            } else {
                stats.pending++;
                if (task.dueDate < today) {
                    stats.overdue++;
                }
            }
        });

        // Calculate completion rates and filter out clients with no tasks
        const result: ClientStats[] = [];
        statsMap.forEach(stats => {
            if (stats.total > 0) {
                stats.completionRate = Math.round((stats.completed / stats.total) * 100);
                result.push(stats);
            }
        });

        // Sort by completion rate (descending)
        return result.sort((a, b) => b.completionRate - a.completionRate);
    }, [tasks, clients]);

    if (clientStats.length === 0) {
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
                    <TrendingUp className="text-ram-blue" size={24} />
                    <h2 className="text-2xl font-bold text-gray-800">Rendimiento por Cliente</h2>
                </div>
                <p className="text-sm text-gray-500">
                    Mostrando estadísticas de {clientStats.length} cliente{clientStats.length !== 1 ? 's' : ''} con tareas activas
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientStats.map(stats => (
                    <div
                        key={stats.clientId || 'no-client'}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                        {/* Client Name */}
                        <h3 className="text-lg font-bold text-gray-800 mb-4 truncate">
                            {stats.clientName}
                        </h3>

                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-600">Progreso</span>
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

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle2 size={16} className="text-green-600" />
                                    <span className="text-xs font-medium text-gray-600">Completadas</span>
                                </div>
                                <p className="text-xl font-bold text-gray-800">{stats.completed}</p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock size={16} className="text-blue-600" />
                                    <span className="text-xs font-medium text-gray-600">Pendientes</span>
                                </div>
                                <p className="text-xl font-bold text-gray-800">{stats.pending}</p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle size={16} className="text-red-600" />
                                    <span className="text-xs font-medium text-gray-600">Vencidas</span>
                                </div>
                                <p className="text-xl font-bold text-red-600">{stats.overdue}</p>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Total Tareas</span>
                                <span className="text-lg font-bold text-ram-navy">{stats.total}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
