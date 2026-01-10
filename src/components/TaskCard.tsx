import React from 'react';
import { Task, User } from '../types';
import { Calendar } from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';

interface TaskCardProps {
  task: Task;
  users: User[];
  onDragStart: (e: React.DragEvent, id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, users, onDragStart }) => {
  const priorityColors = {
    low: 'bg-ram-silver/20 text-ram-grey', // Silver/Grey
    medium: 'bg-ram-sand/30 text-ram-olive', // Sand/Olive
    high: 'bg-ram-gold/20 text-ram-bronze', // Gold/Bronze
    critical: 'bg-ram-bronze/20 text-ram-navy font-bold' // Bronze/Navy
  };

  const assignees = users.filter(u => task.assigneeIds?.includes(u.id) || u.id === task.assigneeId);

  // Comparar fechas en formato YYYY-MM-DD (sin conversión a Date para evitar zona horaria)
  const today = getLocalDateString(); // "2025-12-09"
  const isOverdue = task.status !== 'done' && task.dueDate < today;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={`bg-white p-3 rounded-lg shadow-sm border-2 cursor-move hover:shadow-md transition-all active:cursor-grabbing ${isOverdue ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
        }`}
    >
      {isOverdue && (
        <div className="flex items-center gap-1 text-red-600 text-[10px] font-bold mb-1.5 bg-red-100 px-1.5 py-0.5 rounded">
          <span>⚠️ VENCIDA</span>
        </div>
      )}

      {/* Etiqueta para tareas madre */}
      {task.isRecurring && !task.parentTaskId && (
        <div className="flex items-center gap-1 text-purple-700 text-[10px] font-bold mb-1.5 bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-300 px-1.5 py-0.5 rounded-full shadow-sm">
          <span>🔄 TAREA MADRE</span>
        </div>
      )}

      <div className="flex justify-between items-start mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        {assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map(assignee => (
              <img
                key={assignee.id}
                src={assignee.avatar}
                alt={assignee.name}
                className="w-5 h-5 rounded-full border border-white shadow-sm"
                title={assignee.name}
              />
            ))}
            {assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full border border-white bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      <h4 className="font-bold text-gray-800 text-xs mb-0.5 leading-snug">{task.title}</h4>
      <p className="text-[11px] text-gray-400 line-clamp-1 mb-2">{task.description}</p>

      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1.5 border-t border-gray-50 mt-1">
        <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
          <Calendar size={10} />
          <span>{(() => {
            // Formatear fecha directamente desde string YYYY-MM-DD sin conversión
            const [year, month, day] = task.dueDate.split('T')[0].split('-');
            return `${parseInt(day)}/${parseInt(month)}/${year}`;
          })()}</span>
        </div>
        {task.tags.length > 0 && (
          <span className="bg-gray-100 px-1 py-0 rounded text-gray-500 truncate max-w-[80px]">
            {task.tags[0]}
          </span>
        )}
      </div>
    </div>
  );
};
