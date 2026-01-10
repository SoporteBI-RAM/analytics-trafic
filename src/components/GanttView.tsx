import React from 'react';
import { Task, User } from '../types';
import { Edit, Trash2 } from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';

interface GanttViewProps {
  tasks: Task[];
  users: User[];
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
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

export const GanttView: React.FC<GanttViewProps> = ({ tasks, users, onEdit, onDelete }) => {
  const sortedTasks = [...tasks].sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Calcular rango de fechas
  const todayStr = getLocalDateString();
  const today = new Date(todayStr + 'T12:00:00');

  let minDate: Date;
  let maxDate: Date;

  if (sortedTasks.length > 0) {
    const earliestTaskDate = dateFromString(sortedTasks[0].startDate);
    minDate = earliestTaskDate < today ? earliestTaskDate : today;

    const latestTask = sortedTasks.reduce((latest, task) => {
      const taskEnd = dateFromString(task.dueDate);
      return taskEnd > latest ? taskEnd : latest;
    }, dateFromString(sortedTasks[0].dueDate));

    maxDate = latestTask > today ? latestTask : addDaysToDate(today, 30);
  } else {
    minDate = today;
    maxDate = addDaysToDate(today, 30);
  }

  minDate = addDaysToDate(minDate, -7);
  maxDate = addDaysToDate(maxDate, 14);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000));
  const dates = Array.from({ length: totalDays }, (_, i) => addDaysToDate(minDate, i));

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
      gridColumnStart: left + 1,
      gridColumnEnd: `span ${width}`,
      backgroundColor: colors[task.status],
    };
  };

  const formatDateDay = (date: Date) => new Intl.DateTimeFormat('es-ES', { day: '2-digit' }).format(date);
  const formatDateWeekday = (date: Date) => new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).charAt(0);

  const todayOffset = getDiffInDays(todayStr, minDateStr);
  const showTodayLine = todayOffset >= 0 && todayOffset < totalDays;

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current && showTodayLine) {
      const scrollLeft = (todayOffset * 40) - (scrollRef.current.clientWidth / 2);
      scrollRef.current.scrollLeft = Math.max(0, scrollLeft);
    }
  }, [todayOffset, showTodayLine]);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Cronograma de Proyecto</h3>

        {/* Contenedor con columna fija */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">

          {/* COLUMNA FIJA */}
          <div className="w-[280px] flex-shrink-0 bg-gray-50 border-r border-gray-200">
            <div className="h-[60px] flex items-center px-4 border-b border-gray-200 font-semibold text-sm text-gray-700 bg-white">
              Tarea
            </div>

            {tasks.map(task => {
              const assignee = users.find(u => u.id === task.assigneeId);
              return (
                <div key={task.id} className="h-[48px] px-4 flex items-center justify-between border-b border-gray-100 hover:bg-gray-100 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate" title={task.title}>{task.title}</div>
                      {/* Etiqueta para tareas madre */}
                      {task.isRecurring && !task.parentTaskId && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-300 rounded-full text-[10px] font-bold text-purple-700 shadow-sm flex-shrink-0">
                          <span className="text-[8px]">🔄</span>
                          M
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      {assignee && <img src={assignee.avatar} className="w-4 h-4 rounded-full" alt={assignee.name} />}
                      {assignee?.name.split(' ')[0]}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(task)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(task)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ÁREA SCROLLABLE */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div style={{ width: `${totalDays * 40}px` }}>

              {/* Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${totalDays}, 40px)` }} className="h-[60px] border-b border-gray-200 bg-white">
                {dates.map((date, i) => {
                  const isToday = i === todayOffset;
                  return (
                    <div key={i} className={`text-center text-[10px] flex flex-col items-center justify-center relative ${isToday ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                      <span>{formatDateDay(date)}</span>
                      <span className="text-[8px] uppercase">{formatDateWeekday(date)}</span>
                      {isToday && <div className="absolute -bottom-1 w-full h-0.5 bg-blue-500"></div>}
                    </div>
                  );
                })}
              </div>

              {/* Barras */}
              <div className="relative">
                {showTodayLine && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
                    style={{ left: `${todayOffset * 40}px` }}
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                      HOY
                    </div>
                  </div>
                )}

                {tasks.map(task => {
                  return (
                    <div key={task.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${totalDays}, 40px)`, height: '48px' }} className="items-center border-b border-gray-100 hover:bg-gray-50/50 relative">
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
          </div>
        </div>

        {/* Leyenda FIJA */}
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
