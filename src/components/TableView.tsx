import React, { useState } from 'react';
import { Task, User, Client } from '../types';
import { Table, Download, Edit, FileSpreadsheet, FileText } from 'lucide-react';

interface TableViewProps {
  tasks: Task[];
  users: User[];
  clients: Client[];
  onEditTask: (task: Task) => void;
}

export const TableView: React.FC<TableViewProps> = ({ tasks, users, clients, onEditTask }) => {
  const [sortField, setSortField] = useState<'client' | 'dueDate' | 'status' | 'title'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'Sin cliente';
    return clients.find(c => c.id === clientId)?.name || 'Sin cliente';
  };

  const getAssigneeNames = (task: Task) => {
    const ids = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
    return ids
      .map(id => users.find(u => u.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'Sin asignar';
  };

  const statusLabels: Record<string, string> = {
    todo: 'Por Hacer',
    inprogress: 'En Progreso',
    review: 'En Revisión',
    done: 'Finalizado'
  };

  const statusColors: Record<string, string> = {
    todo: 'bg-slate-100 text-slate-700',
    inprogress: 'bg-blue-100 text-blue-700',
    review: 'bg-amber-100 text-amber-700',
    done: 'bg-emerald-100 text-emerald-700'
  };

  // Ordenar tareas
  const sortedTasks = [...tasks].sort((a, b) => {
    let aValue: string, bValue: string;

    switch (sortField) {
      case 'client':
        aValue = getClientName(a.clientId);
        bValue = getClientName(b.clientId);
        break;
      case 'dueDate':
        aValue = a.dueDate;
        bValue = b.dueDate;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'title':
        aValue = a.title;
        bValue = b.title;
        break;
      default:
        return 0;
    }

    if (sortOrder === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ['Cliente', 'Tarea', 'Fecha Entrega', 'Estado', 'Responsable(s)'];
    const rows = sortedTasks.map(task => [
      getClientName(task.clientId),
      task.title,
      new Date(task.dueDate).toLocaleDateString('es-ES'),
      statusLabels[task.status],
      getAssigneeNames(task)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tareas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Exportar a Excel (TSV para compatibilidad)
  const exportToExcel = () => {
    const headers = ['Cliente', 'Tarea', 'Descripción', 'Fecha Entrega', 'Estado', 'Prioridad', 'Responsable(s)'];
    const rows = sortedTasks.map(task => [
      getClientName(task.clientId),
      task.title,
      task.description,
      new Date(task.dueDate).toLocaleDateString('es-ES'),
      statusLabels[task.status],
      task.priority.toUpperCase(),
      getAssigneeNames(task)
    ]);

    const tsvContent = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tareas_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${parseInt(day)}/${parseInt(month)}/${year}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header con botones de exportación */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="flex items-center gap-2">
          <Table size={20} className="text-gray-600" />
          <h3 className="font-semibold text-gray-800">Vista de Tabla</h3>
          <span className="text-sm text-gray-500">({sortedTasks.length} tareas)</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileText size={16} />
            Exportar CSV
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                onClick={() => handleSort('client')}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Cliente {sortField === 'client' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('title')}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Tarea {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('dueDate')}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Fecha Entrega {sortField === 'dueDate' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Prioridad
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Estado {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Responsable(s)
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedTasks.map((task) => {
              const isOverdue = task.status !== 'done' && task.dueDate < new Date().toISOString().split('T')[0];
              
              return (
                <tr 
                  key={task.id} 
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {getClientName(task.clientId)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-800">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                      {formatDate(task.dueDate)}
                      {isOverdue && ' ⚠️'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.priority === 'critical' ? 'bg-red-100 text-red-700' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {task.priority === 'critical' ? 'Crítica' :
                       task.priority === 'high' ? 'Alta' :
                       task.priority === 'medium' ? 'Media' :
                       'Baja'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status]}`}>
                      {statusLabels[task.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {getAssigneeNames(task)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onEditTask(task)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded transition-colors"
                    >
                      <Edit size={14} />
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedTasks.length === 0 && (
        <div className="p-8 text-center text-gray-400">
          <Table size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay tareas para mostrar</p>
        </div>
      )}
    </div>
  );
};
