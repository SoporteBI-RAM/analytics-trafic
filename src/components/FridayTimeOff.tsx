import React, { useState, useMemo } from 'react';
import { User, FridayTimeOff as FridayTimeOffType, Holiday } from '../types';
import { Calendar, ChevronLeft, ChevronRight, Sun, Check, X, Send, Users, AlertCircle, Star, Plus, Trash2, Mail } from 'lucide-react';

interface FridayTimeOffProps {
  users: User[];
  currentUser: User;
  fridayTimeOffs: FridayTimeOffType[];
  holidays: Holiday[];
  onCreateTimeOff: (timeOff: FridayTimeOffType) => void;
  onUpdateTimeOff: (timeOff: FridayTimeOffType) => void;
  onDeleteTimeOff: (timeOffId: string) => void;
  onCreateHoliday: (holiday: Holiday) => void;
  onDeleteHoliday: (holidayId: string) => void;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const FridayTimeOff: React.FC<FridayTimeOffProps> = ({
  users,
  currentUser,
  fridayTimeOffs,
  holidays,
  onCreateTimeOff,
  onUpdateTimeOff,
  onDeleteTimeOff,
  onCreateHoliday,
  onDeleteHoliday
}) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [pendingSelections, setPendingSelections] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayDate, setHolidayDate] = useState<string>('');
  const [holidayName, setHolidayName] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryContent, setSummaryContent] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'Admin';
  const maxTimeOffsPerMonth = 1;

  // Obtener todos los viernes del mes actual
  const fridaysInMonth = useMemo(() => {
    const fridays: Date[] = [];
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 5) { // 5 = Viernes
        fridays.push(new Date(d));
      }
    }
    return fridays;
  }, [currentMonth, currentYear]);

  // Filtrar tardes libres del mes actual
  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthTimeOffs = useMemo(() => {
    return fridayTimeOffs.filter(to => to.month === currentMonthKey);
  }, [fridayTimeOffs, currentMonthKey]);

  // Contar tardes libres por usuario en el mes
  const userTimeOffCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    monthTimeOffs.forEach(to => {
      if (to.status !== 'rejected') {
        counts[to.userId] = (counts[to.userId] || 0) + 1;
      }
    });
    return counts;
  }, [monthTimeOffs]);

  // Tardes libres del usuario actual en el mes
  const myTimeOffs = monthTimeOffs.filter(to => to.userId === currentUser.id && to.status !== 'rejected');
  const myTimeOffCount = myTimeOffs.length + pendingSelections.length;

  // Navegar entre meses
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setPendingSelections([]);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setPendingSelections([]);
  };

  // Formatear fecha a YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Verificar si un viernes es feriado
  const isHoliday = (friday: Date): Holiday | undefined => {
    const dateStr = formatDate(friday);
    return holidays.find(h => h.date === dateStr);
  };

  // Obtener tardes libres para un viernes específico
  const getTimeOffsForFriday = (friday: Date) => {
    const dateStr = formatDate(friday);
    return monthTimeOffs.filter(to => to.date === dateStr && to.status !== 'rejected');
  };

  // Verificar si el usuario ya tiene una tarde libre en ese viernes
  const hasTimeOffOnFriday = (friday: Date, userId: string) => {
    const dateStr = formatDate(friday);
    return monthTimeOffs.some(to => to.date === dateStr && to.userId === userId && to.status !== 'rejected');
  };

  // Verificar si el viernes está en las selecciones pendientes
  const isPendingSelection = (friday: Date) => {
    return pendingSelections.includes(formatDate(friday));
  };

  // Manejar selección de un viernes
  const handleFridayClick = (friday: Date) => {
    const dateStr = formatDate(friday);

    // Si es feriado, no se puede seleccionar
    if (isHoliday(friday)) {
      return;
    }

    // Si ya tiene una tarde libre confirmada, no hacer nada
    if (hasTimeOffOnFriday(friday, currentUser.id)) {
      return;
    }

    // Verificar límite de 1 por mes
    if (myTimeOffCount >= maxTimeOffsPerMonth && !isPendingSelection(friday)) {
      return;
    }

    // Toggle selección
    if (isPendingSelection(friday)) {
      setPendingSelections(prev => prev.filter(d => d !== dateStr));
    } else {
      setPendingSelections(prev => [...prev, dateStr]);
    }
  };

  // Enviar solicitudes de tardes libres
  const handleSubmitTimeOffs = () => {
    if (pendingSelections.length === 0) return;
    setShowConfirmModal(true);
  };

  const confirmSubmit = () => {
    const now = new Date().toISOString();

    pendingSelections.forEach(dateStr => {
      const newTimeOff: FridayTimeOffType = {
        id: `fto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser.id,
        date: dateStr,
        month: currentMonthKey,
        status: 'approved',
        createdAt: now,
        createdBy: currentUser.id
      };
      onCreateTimeOff(newTimeOff);
    });

    setPendingSelections([]);
    setShowConfirmModal(false);
  };

  // Admin: Eliminar tarde libre
  const handleRemoveTimeOff = (timeOffId: string) => {
    onDeleteTimeOff(timeOffId);
  };

  // Admin: Abrir modal para agregar feriado
  const openHolidayModal = (friday: Date) => {
    setHolidayDate(formatDate(friday));
    setHolidayName('');
    setShowHolidayModal(true);
  };

  // Admin: Crear feriado
  const handleCreateHoliday = () => {
    if (!holidayName.trim()) return;

    const newHoliday: Holiday = {
      id: `hol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: holidayDate,
      name: holidayName.trim(),
      createdBy: currentUser.id,
      createdAt: new Date().toISOString()
    };

    onCreateHoliday(newHoliday);
    setShowHolidayModal(false);
    setHolidayName('');
    setHolidayDate('');
  };

  // Admin: Eliminar feriado
  const handleRemoveHoliday = (holidayId: string) => {
    onDeleteHoliday(holidayId);
  };

  // Generar resumen para correo
  const handleGenerateEmailSummary = () => {
    const monthName = MONTHS[currentMonth];
    let content = `Resumen de Tardes Libres - ${monthName} ${currentYear}\n`;
    content += `Tráfico Analítica RAM\n`;
    content += `-------------------------------------------\n\n`;

    let hasTimeOffs = false;
    users.forEach(user => {
      const userTimeOffs = monthTimeOffs.filter(to => to.userId === user.id && to.status !== 'rejected');
      if (userTimeOffs.length > 0) {
        hasTimeOffs = true;
        content += `${user.name.toUpperCase()}:\n`;
        userTimeOffs.forEach((to, index) => {
          const date = new Date(to.date + 'T12:00:00');
          const formattedDate = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
          content += `- ${formattedDate}\n`;
        });
        content += '\n';
      }
    });

    if (!hasTimeOffs) {
      content += `No hay tardes libres registradas para este mes.\n\n`;
    }

    const holidayList = holidays.filter(h => h.date.startsWith(currentMonthKey));
    if (holidayList.length > 0) {
      content += `FERIADOS DEL MES:\n`;
      holidayList.forEach(h => {
        const date = new Date(h.date + 'T12:00:00');
        const formattedDate = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        content += `- ${formattedDate}: ${h.name}\n`;
      });
      content += '\n';
    }

    content += `-------------------------------------------\n`;
    content += `Generado el: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

    setSummaryContent(content);
    setShowSummaryModal(true);
  };

  // Obtener usuario completo
  const getUser = (userId: string) => {
    return users.find(u => u.id === userId);
  };

  // Obtener nombre del usuario
  const getUserName = (userId: string): string => {
    const user = getUser(userId);
    return user?.name || 'Usuario';
  };

  // Obtener avatar del usuario
  const getUserAvatar = (userId: string): string => {
    const user = getUser(userId);
    return user?.avatar || '';
  };

  // Verificar si la fecha ya pasó
  const isPastDate = (friday: Date) => {
    const todayStr = formatDate(today);
    const fridayStr = formatDate(friday);
    return fridayStr < todayStr;
  };

  return (
    <div className="space-y-6">
      {/* Header con navegación de mes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Sun className="text-amber-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Tardes Libres</h2>
              <p className="text-sm text-gray-500">Gestiona las tardes libres de los viernes del equipo</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleGenerateEmailSummary}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm mr-2"
              title="Enviar resumen por correo"
            >
              <Mail size={18} />
              <span className="hidden md:inline">Enviar Resumen</span>
            </button>

            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-lg font-semibold text-gray-800 min-w-[180px] text-center">
                {MONTHS[currentMonth]} {currentYear}
              </span>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Info del usuario */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="font-medium text-gray-800">{currentUser.name}</p>
              <p className="text-sm text-gray-500">
                {myTimeOffCount} de {maxTimeOffsPerMonth} tarde libre {myTimeOffCount === 1 ? 'seleccionada' : 'disponible'} este mes
              </p>
            </div>
          </div>

          {pendingSelections.length > 0 && (
            <button
              onClick={handleSubmitTimeOffs}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Send size={18} />
              Enviar Tardes Libres ({pendingSelections.length})
            </button>
          )}
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
            <span className="text-gray-600">Tu tarde libre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-100 border-2 border-amber-400 rounded"></div>
            <span className="text-gray-600">Selección pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded"></div>
            <span className="text-gray-600">Feriado</span>
          </div>
        </div>

        {/* Calendario de viernes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {fridaysInMonth.map((friday, index) => {
            const timeOffsOnDay = getTimeOffsForFriday(friday);
            const hasMyTimeOff = hasTimeOffOnFriday(friday, currentUser.id);
            const isPending = isPendingSelection(friday);
            const isPast = isPastDate(friday);
            const holidayInfo = isHoliday(friday);
            const canSelect = !isPast && !hasMyTimeOff && !holidayInfo && myTimeOffCount < maxTimeOffsPerMonth;

            return (
              <div
                key={index}
                className={`
                  border rounded-xl p-4 transition-all
                  ${holidayInfo ? 'bg-red-50 border-red-300' : ''}
                  ${isPast && !holidayInfo ? 'bg-gray-50 border-gray-200 opacity-60' : ''}
                  ${!holidayInfo && !isPast ? 'bg-white border-gray-200' : ''}
                  ${isPending ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-50' : ''}
                  ${hasMyTimeOff && !holidayInfo ? 'ring-2 ring-green-400 border-green-400 bg-green-50' : ''}
                `}
              >
                {/* Fecha */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className={`text-2xl font-bold ${holidayInfo ? 'text-red-700' : 'text-gray-800'}`}>
                      {friday.getDate()}
                    </p>
                    <p className={`text-sm ${holidayInfo ? 'text-red-600' : 'text-gray-500'}`}>
                      {holidayInfo ? 'Feriado' : 'Viernes'}
                    </p>
                  </div>

                  {/* Botón de selección o estado */}
                  {holidayInfo ? (
                    <div className="flex items-center gap-1">
                      <Star size={20} className="text-red-500 fill-red-500" />
                      {isAdmin && (
                        <button
                          onClick={() => handleRemoveHoliday(holidayInfo.id)}
                          className="text-red-400 hover:text-red-600 p-1 transition-colors"
                          title="Quitar feriado"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {!isPast && !hasMyTimeOff && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFridayClick(friday)}
                            disabled={!canSelect && !isPending}
                            className={`
                              w-8 h-8 rounded-full flex items-center justify-center transition-all
                              ${isPending
                                ? 'bg-amber-500 text-white'
                                : canSelect
                                  ? 'bg-gray-100 hover:bg-amber-100 text-gray-400 hover:text-amber-600'
                                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'}
                            `}
                          >
                            {isPending ? <Check size={16} /> : <Sun size={16} />}
                          </button>
                          {isAdmin && !isPast && (
                            <button
                              onClick={() => openHolidayModal(friday)}
                              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600 flex items-center justify-center transition-all"
                              title="Marcar como feriado"
                            >
                              <Star size={14} />
                            </button>
                          )}
                        </div>
                      )}

                      {hasMyTimeOff && (
                        <button
                          onClick={() => {
                            const myTimeOff = monthTimeOffs.find(to => to.date === formatDate(friday) && to.userId === currentUser.id);
                            if (myTimeOff) handleRemoveTimeOff(myTimeOff.id);
                          }}
                          className="w-8 h-8 rounded-full bg-green-500 hover:bg-red-500 text-white flex items-center justify-center transition-colors group"
                          title="Click para quitar tu tarde libre"
                        >
                          <Check size={16} className="group-hover:hidden" />
                          <X size={16} className="hidden group-hover:block" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Nombre del feriado */}
                {holidayInfo && (
                  <div className="mb-3 bg-red-100 rounded-lg px-3 py-2 border border-red-200">
                    <p className="text-sm font-medium text-red-700">{holidayInfo.name}</p>
                  </div>
                )}

                {/* Lista de personas con tarde libre */}
                {!holidayInfo && (
                  <div className="space-y-2">
                    {timeOffsOnDay.length === 0 && !isPending ? (
                      <p className="text-sm text-gray-400 italic">Sin asignaciones</p>
                    ) : (
                      <>
                        {timeOffsOnDay.map(to => (
                          <div
                            key={to.id}
                            className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-100"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={getUserAvatar(to.userId)}
                                alt={getUserName(to.userId)}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                              <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">
                                {getUserName(to.userId)}
                              </span>
                            </div>

                            {(to.userId === currentUser.id || isAdmin) && (
                              <button
                                onClick={() => handleRemoveTimeOff(to.id)}
                                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                title="Eliminar tarde libre"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}

                        {isPending && (
                          <div className="flex items-center justify-between bg-amber-100 rounded-lg px-3 py-2 border border-amber-200">
                            <div className="flex items-center gap-2">
                              <img
                                src={currentUser.avatar}
                                alt={currentUser.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                              <span className="text-sm font-medium text-amber-700">
                                {currentUser.name} (pendiente)
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen del mes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Resumen del Equipo - {MONTHS[currentMonth]}</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {users.map(user => {
            const count = userTimeOffCounts[user.id] || 0;
            const userTimeOffs = monthTimeOffs.filter(to => to.userId === user.id && to.status !== 'rejected');

            return (
              <div
                key={user.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500">{count}/{maxTimeOffsPerMonth} viernes</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {userTimeOffs.map(to => (
                    <div
                      key={to.id}
                      className="text-xs bg-white rounded px-2 py-1 text-gray-600 flex items-center gap-1"
                    >
                      <Calendar size={12} />
                      {new Date(to.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </div>
                  ))}
                  {count === 0 && (
                    <p className="text-xs text-gray-400 italic">Sin asignaciones</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de confirmación de tardes libres */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="text-amber-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Confirmar Tardes Libres</h3>
            </div>

            <p className="text-gray-600 mb-4">
              Vas a registrar {pendingSelections.length} tarde{pendingSelections.length > 1 ? 's' : ''} libre{pendingSelections.length > 1 ? 's' : ''} para los siguientes viernes:
            </p>

            <ul className="space-y-2 mb-6">
              {pendingSelections.map(dateStr => (
                <li key={dateStr} className="flex items-center gap-2 text-gray-700">
                  <Calendar size={16} className="text-amber-500" />
                  {new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </li>
              ))}
            </ul>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSubmit}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar feriado */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Star className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Marcar como Feriado</h3>
            </div>

            <p className="text-gray-600 mb-4">
              Vas a marcar el viernes {new Date(holidayDate + 'T12:00:00').toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })} como feriado. Los usuarios no podrán seleccionar este día.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del feriado
              </label>
              <input
                type="text"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="Ej: Día de la Independencia"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowHolidayModal(false);
                  setHolidayName('');
                  setHolidayDate('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateHoliday}
                disabled={!holidayName.trim()}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Marcar Feriado
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Resumen para Correo */}
      {showSummaryModal && summaryContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Mail className="text-indigo-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Resumen del Mes</h3>
                  <p className="text-sm text-gray-500">Formato listo para enviar por correo</p>
                </div>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
              {summaryContent}
            </div>

            <div className="p-6 border-t flex justify-end gap-3 bg-white">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(summaryContent);
                  alert('Resumen copiado al portapapeles');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Copiar al Portapapeles
              </button>
              <a
                href={`mailto:?subject=Resumen Tardes Libres - ${MONTHS[currentMonth]} ${currentYear}&body=${encodeURIComponent(summaryContent)}`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
              >
                <Mail size={18} />
                Abrir en Correo
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

