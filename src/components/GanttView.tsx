import React from 'react';
import { Task, User } from '../types';

interface GanttViewProps {
  tasks: Task[];
  users: User[];
}

// Convertir string YYYY-MM-DD a Date sin zona horaria
const dateFromString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Diferencia en días entre dos strings de fecha
const getDiffInDays = (date1Str: string, date2Str: string) => {
  const date1 = dateFromString(date1Str);
  const date2 = dateFromString(date2Str);
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date1.getTime() - date2.getTime()) / oneDay);
};

const addDaysToDate = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

export const GanttView: React.FC<GanttViewProps> = ({ tasks, users }) => {
  const sortedTasks = [...tasks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  const minDate = sortedTasks.length 
    ? getStartOfWeek(dateFromString(sortedTasks[0].startDate)) 
    : new Date();
    
  const daysToShow = 30;
  const dates = Array.from({ length: daysToShow }, (_, i) => addDaysToDate(minDate, i));
  
  // Convertir minDate a string para comparaciones
  const minDateStr = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`;

  const getTaskStyle = (task: Task) => {
    const offset = getDiffInDays(task.startDate, minDateStr);
    const duration = getDiffInDays(task.dueDate, task.startDate) + 1;
    
    const left = Math.max(0, offset);
    const width = Math.max(1, duration);
    
    const colors: Record<string, string> = {
      todo: '#e2e8f0',
      inprogress: '#3b82f6',
      review: '#f59e0b',
      done: '#10b981'
    };

    return {
      gridColumnStart: left + 2,
      gridColumnEnd: `span ${width}`,
      backgroundColor: colors[task.status],
    };
  };

  const formatDateDay = (date: Date) => new Intl.DateTimeFormat('es-ES', { day: '2-digit' }).format(date);
  const formatDateWeekday = (date: Date) => new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).charAt(0);

  // Calcular posición del día actual
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayOffset = getDiffInDays(todayStr, minDateStr);
  const showTodayLine = todayOffset >= 0 && todayOffset < daysToShow;

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200 pb-4">
      <div className="min-w-[800px] p-4 relative">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Cronograma de Proyecto</h3>
        
        {/* Headers de fechas */}
        <div className="grid grid-cols-[200px_repeat(30,minmax(30px,1fr))] gap-0 mb-2 border-b border-gray-100 pb-2 relative">
          <div className="font-semibold text-sm text-gray-500">Tarea</div>
          {dates.map((date, i) => {
            const isToday = i === todayOffset;
            return (
              <div key={i} className={`text-center text-[10px] flex flex-col items-center relative ${isToday ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                <span>{formatDateDay(date)}</span>
                <span className="text-[8px] uppercase">{formatDateWeekday(date)}</span>
                {isToday && (
                  <div className="absolute -bottom-1 w-full h-0.5 bg-blue-500"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contenedor de tareas con línea de hoy */}
        <div className="relative">
          {/* Línea vertical del día actual */}
          {showTodayLine && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
              style={{ 
                left: `calc(200px + ${todayOffset * 100 / daysToShow}% + ${todayOffset * 0.5}px)`,
              }}
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                HOY
              </div>
            </div>
          )}

          {/* Tareas */}
          <div className="space-y-2">
          {tasks.map(task => {
             const assignee = users.find(u => u.id === task.assigneeId);
             return (
              <div key={task.id} className="grid grid-cols-[200px_repeat(30,minmax(30px,1fr))] gap-y-1 items-center hover:bg-gray-50">
                <div className="pr-4 py-1">
                  <div className="text-sm font-medium truncate" title={task.title}>{task.title}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    {assignee && <img src={assignee.avatar} className="w-4 h-4 rounded-full" alt={assignee.name}/>}
                    {assignee?.name.split(' ')[0]}
                  </div>
                </div>
                
                {getDiffInDays(task.dueDate, minDateStr) >= 0 && (
                  <div 
                    className="h-6 rounded-md shadow-sm relative group opacity-90 hover:opacity-100 transition-opacity"
                    style={getTaskStyle(task)}
                  >
                     <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis w-full px-1">
                       {task.status !== 'todo' && `${getDiffInDays(task.dueDate, task.startDate) + 1}d`}
                     </span>
                  </div>
                )}
              </div>
             );
          })}
          </div>
        </div>
        
        {/* Leyenda */}
        <div className="mt-6 flex gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#e2e8f0] rounded"></div> Por Hacer</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#3b82f6] rounded"></div> En Progreso</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#f59e0b] rounded"></div> Revisión</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#10b981] rounded"></div> Finalizado</div>
            {showTodayLine && (
              <div className="flex items-center gap-1 ml-auto">
                <div className="w-0.5 h-3 bg-blue-500"></div>
                <span className="text-blue-600 font-semibold">Hoy</span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
