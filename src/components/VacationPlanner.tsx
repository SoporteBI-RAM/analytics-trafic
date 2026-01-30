import React, { useState, useMemo } from 'react';
import { User, Vacation, Holiday } from '../types';
import { ChevronLeft, ChevronRight, Users, Palmtree, UserPlus, CheckCheck, CheckCircle2, X, Calendar as CalendarIcon, CalendarDays, Trash2, Mail } from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';

interface VacationPlannerProps {
    users: User[];
    currentUser: User;
    vacations: Vacation[];
    holidays: Holiday[];
    onCreateVacation: (vacation: Vacation) => void;
    onDeleteVacation: (vacationId: string) => void;
    onUpdateVacation?: (vacation: Vacation) => void;
}

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const VacationPlanner: React.FC<VacationPlannerProps> = ({
    users,
    currentUser,
    vacations,
    holidays,
    onCreateVacation,
    onDeleteVacation,
    onUpdateVacation
}) => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    // Selección de rango
    const [selectionStart, setSelectionStart] = useState<string | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [targetUserId, setTargetUserId] = useState<string>(currentUser.id);

    // Estado para ver/editar vacación (incluye la fecha clickeada)
    const [selectedDetail, setSelectedDetail] = useState<{ vacation: Vacation, dateStr: string } | null>(null);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryContent, setSummaryContent] = useState<string | null>(null);
    const [selectedUserSummary, setSelectedUserSummary] = useState<User | null>(null);

    const isAdmin = currentUser.role === 'Admin';

    // Navegación de calendario
    const goToPreviousMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    // Generar días del mes
    const calendarDays = useMemo(() => {
        const days: Date[] = [];
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);

        const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        for (let i = startPadding; i > 0; i--) {
            const d = new Date(firstDay);
            d.setDate(d.getDate() - i);
            days.push(d);
        }

        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }

        return days;
    }, [currentMonth, currentYear]);

    const formatDate = (date: Date): string => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const isWeekend = (date: Date) => {
        const day = date.getDay();
        return day === 0 || day === 6;
    };

    const getHoliday = (date: Date) => {
        const dateStr = formatDate(date);
        return holidays.find(h => h.date === dateStr);
    };

    const getVacationsForDay = (date: Date) => {
        const dateStr = formatDate(date);
        return vacations.filter(v =>
            dateStr >= v.startDate && dateStr <= v.endDate && v.status !== 'rejected'
        );
    };

    const isDateSelected = (date: Date) => {
        if (!selectionStart) return false;
        const dateStr = formatDate(date);
        if (selectionEnd) {
            return dateStr >= selectionStart && dateStr <= selectionEnd;
        }
        return dateStr === selectionStart;
    };

    const handleDateClick = (date: Date) => {
        // Solo bloquear feriados, permitir fines de semana
        if (getHoliday(date)) return;

        const dateStr = formatDate(date);

        if (!selectionStart || (selectionStart && selectionEnd)) {
            setSelectionStart(dateStr);
            setSelectionEnd(null);
        } else {
            if (dateStr < selectionStart) {
                setSelectionEnd(selectionStart);
                setSelectionStart(dateStr);
                setShowConfirmModal(true);
            } else {
                setSelectionEnd(dateStr);
                setShowConfirmModal(true);
            }
        }
    };

    // Calculadora de días hábiles local safe
    const calculateBusinessDaysForRange = (startStr: string, endStr: string) => {
        let count = 0;
        // Usar T12:00:00 para evitar problemas de timezone al convertir a fecha local
        const cur = new Date(startStr + 'T12:00:00');
        const end = new Date(endStr + 'T12:00:00');

        const curDate = new Date(cur); // Copia segura
        const endDate = new Date(end); // Copia segura

        while (curDate <= endDate) {
            const day = curDate.getDay();
            const isWeekEnd = day === 0 || day === 6;
            const isHol = holidays.some(h => h.date === formatDate(curDate));

            if (!isWeekEnd && !isHol) {
                count++;
            }
            curDate.setDate(curDate.getDate() + 1);
        }
        return count;
    };

    const calculateBusinessDays = () => {
        if (!selectionStart || !selectionEnd) return 0;
        return calculateBusinessDaysForRange(selectionStart, selectionEnd);
    };

    // Calcular días totales (incluyendo fines de semana)
    const calculateTotalDays = (startStr: string, endStr: string) => {
        const start = new Date(startStr + 'T12:00:00');
        const end = new Date(endStr + 'T12:00:00');
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
        return diffDays;
    };

    const calculateTotalDaysForSelection = () => {
        if (!selectionStart || !selectionEnd) return 0;
        return calculateTotalDays(selectionStart, selectionEnd);
    };

    const handleSubmitVacation = () => {
        if (!selectionStart || !selectionEnd) return;

        const totalDays = calculateTotalDaysForSelection();

        const newVacation: Vacation = {
            id: `vac-${Date.now()}`,
            userId: isAdmin ? targetUserId : currentUser.id,
            startDate: selectionStart,
            endDate: selectionEnd,
            daysCount: totalDays,
            status: 'pending', // Ahora inicia como Solicitado
            createdAt: new Date().toISOString(),
            createdBy: currentUser.id
        };

        onCreateVacation(newVacation);
        setSelectionStart(null);
        setSelectionEnd(null);
        setShowConfirmModal(false);
    };

    const handleDeleteEntireVacation = () => {
        if (selectedDetail) {
            onDeleteVacation(selectedDetail.vacation.id);
            setSelectedDetail(null);
        }
    };

    const handleDeleteSpecificDay = () => {
        if (!selectedDetail) return;
        const { vacation, dateStr } = selectedDetail;

        // 1. Eliminar la vacación original
        onDeleteVacation(vacation.id);

        // 2. Calcular nuevas fechas con seguridad de timezone
        // Usamos T12:00:00 para garantizar mediodía y evitar saltos de día por UTC
        const clickedDate = new Date(dateStr + 'T12:00:00');

        // Dia anterior
        const prevDate = new Date(clickedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = formatDate(prevDate);

        // Dia siguiente
        const nextDate = new Date(clickedDate);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = formatDate(nextDate);

        // Verificar si hay parte anterior
        const hasBefore = dateStr > vacation.startDate;
        // Verificar si hay parte posterior
        const hasAfter = dateStr < vacation.endDate;

        if (hasBefore) {
            const daysCount = calculateTotalDays(vacation.startDate, prevDateStr);
            if (daysCount > 0) {
                const newVac1: Vacation = {
                    ...vacation,
                    id: `vac-${Date.now()}-1`,
                    endDate: prevDateStr,
                    daysCount: daysCount,
                    createdAt: new Date().toISOString()
                };
                onCreateVacation(newVac1);
            }
        }

        if (hasAfter) {
            const daysCount = calculateTotalDays(nextDateStr, vacation.endDate);
            if (daysCount > 0) {
                const newVac2: Vacation = {
                    ...vacation,
                    id: `vac-${Date.now()}-2`,
                    startDate: nextDateStr,
                    daysCount: daysCount,
                    createdAt: new Date().toISOString()
                };
                onCreateVacation(newVac2);
            }
        }
        setSelectedDetail(null);
    };

    const handleGenerateVacationSummary = () => {
        // Calcular el rango de un año completo desde hoy
        const todayDate = new Date();
        const oneYearFromNow = new Date(todayDate);
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        let content = `Resumen de Vacaciones - Año Completo\n`;
        content += `Desde: ${todayDate.toLocaleDateString('es-ES')} hasta ${oneYearFromNow.toLocaleDateString('es-ES')}\n`;
        content += `Tráfico Analítica RAM\n`;
        content += `-------------------------------------------\n\n`;

        let hasVacations = false;
        users.forEach(user => {
            // Filtrar vacaciones de este usuario que estén dentro del próximo año
            const userVacations = vacations.filter(v => {
                if (v.userId !== user.id || v.status === 'rejected') return false;

                // Una vacación se muestra si está dentro del rango de un año desde hoy
                const vStart = new Date(v.startDate + 'T12:00:00');
                const vEnd = new Date(v.endDate + 'T12:00:00');

                // Incluir si la vacación termina después de hoy Y empieza antes de un año desde hoy
                return (vEnd >= todayDate && vStart <= oneYearFromNow);
            }).sort((a, b) => a.startDate.localeCompare(b.startDate)); // Ordenar por fecha de inicio

            if (userVacations.length > 0) {
                hasVacations = true;
                content += `${user.name.toUpperCase()}:\n`;
                userVacations.forEach((v) => {
                    const start = new Date(v.startDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                    const end = new Date(v.endDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                    const totalDays = calculateTotalDays(v.startDate, v.endDate);
                    const businessDays = calculateBusinessDaysForRange(v.startDate, v.endDate);
                    const statusLabel = v.status === 'taken' ? 'CONFIRMADO' : v.status === 'approved' ? 'APROBADO' : 'SOLICITADO';
                    content += `- Del ${start} al ${end} (${totalDays} días / ${businessDays} laborales) [${statusLabel}]\n`;
                });
                content += '\n';
            }
        });

        if (!hasVacations) {
            content += `No hay vacaciones registradas para el próximo año.\n\n`;
        }

        content += `-------------------------------------------\n`;
        content += `Generado el: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

        setSummaryContent(content);
        setShowSummaryModal(true);
    };

    const handleGenerateUserVacationSummary = (user: User) => {
        const userVacations = vacations.filter(v =>
            v.userId === user.id &&
            v.status !== 'rejected' &&
            v.startDate.startsWith(currentYear.toString())
        ).sort((a, b) => a.startDate.localeCompare(b.startDate));

        let content = `Resumen de Vacaciones - ${user.name}\n`;
        content += `Año ${currentYear}\n`;
        content += `Tráfico Analítica RAM\n`;
        content += `-------------------------------------------\n\n`;

        if (userVacations.length > 0) {
            userVacations.forEach((v) => {
                const start = new Date(v.startDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                const end = new Date(v.endDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                const totalDays = calculateTotalDays(v.startDate, v.endDate);
                const businessDays = calculateBusinessDaysForRange(v.startDate, v.endDate);
                const statusLabel = v.status === 'taken' ? 'CONFIRMADO' : v.status === 'approved' ? 'APROBADO' : 'SOLICITADO';
                content += `- Del ${start} al ${end} (${totalDays} días / ${businessDays} laborales) [${statusLabel}]\n`;
            });

            const stats = userVacationStats[user.id];
            content += `\nTOTAL AÑO ${currentYear}:\n`;
            content += `- Días Totales: ${stats?.total || 0}\n`;
            content += `- Días Laborales: ${stats?.business || 0}\n`;
        } else {
            content += `No tiene vacaciones registradas para el año ${currentYear}.\n`;
        }

        content += `\n-------------------------------------------\n`;
        content += `Generado el: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

        setSummaryContent(content);
        setShowSummaryModal(true);
        setSelectedUserSummary(null);
    };

    const handleUpdateVacationStatus = (status: 'approved' | 'taken') => {
        if (selectedDetail && onUpdateVacation) {
            const updatedVacation: Vacation = {
                ...selectedDetail.vacation,
                status: status,
                approvedBy: status === 'approved' ? currentUser.id : selectedDetail.vacation.approvedBy,
                approvedAt: status === 'approved' ? new Date().toISOString() : selectedDetail.vacation.approvedAt
            };
            onUpdateVacation(updatedVacation);
            setSelectedDetail(null);
        }
    };

    const userVacationStats = useMemo(() => {
        const stats: Record<string, { total: number, business: number }> = {};
        vacations.forEach(v => {
            if (v.status !== 'rejected' && v.startDate.startsWith(currentYear.toString())) {
                if (!stats[v.userId]) stats[v.userId] = { total: 0, business: 0 };
                stats[v.userId].total += calculateTotalDays(v.startDate, v.endDate);
                stats[v.userId].business += calculateBusinessDaysForRange(v.startDate, v.endDate);
            }
        });
        return stats;
    }, [vacations, currentYear]);

    const getUser = (id: string) => users.find(u => u.id === id);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Palmtree className="text-teal-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Planificador de Vacaciones</h2>
                            <p className="text-sm text-gray-500">Gestiona las vacaciones anuales del equipo</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleGenerateVacationSummary}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm mr-2"
                            title="Enviar resumen por correo"
                        >
                            <Mail size={18} />
                            <span className="hidden md:inline">Enviar Resumen</span>
                        </button>

                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
                            <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-lg font-semibold text-gray-800 min-w-[180px] text-center">
                                {MONTHS[currentMonth]} {currentYear}
                            </span>
                            <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info y Controles de Selección */}
                {isAdmin && (
                    <div className="mb-4 flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <UserPlus size={18} className="text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Asignar a:</span>
                        <select
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                            className="bg-white border border-blue-200 text-sm rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Leyenda */}
                <div className="flex gap-4 mb-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-gray-300 rounded"></div><span className="text-gray-500">Día hábil</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-100 rounded"></div><span className="text-gray-500">Fin de semana (seleccionable)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div><span className="text-gray-500">Feriado (bloqueado)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-teal-100 border border-teal-300 rounded"></div><span className="text-gray-500">Selección</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-100 border border-indigo-300 rounded"></div><span className="text-gray-500">Vacaciones</span></div>
                    <div className="flex items-center gap-2"><CheckCheck size={14} className="text-teal-600" /> <span className="text-gray-500">Confirmado (Admin)</span></div>
                </div>

                {/* Calendario Grid */}
                <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
                    {/* Headers */}
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                        <div key={d} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-500 uppercase">
                            {d}
                        </div>
                    ))}

                    {/* Días */}
                    {calendarDays.map((date, idx) => {
                        const isCurrentMonth = date.getMonth() === currentMonth;
                        const isWeekEnd = isWeekend(date);
                        const holiday = getHoliday(date);
                        const isSelected = isDateSelected(date);
                        const vacationsOnDay = getVacationsForDay(date);
                        const dateStr = formatDate(date);

                        let bgClass = 'bg-white';
                        if (!isCurrentMonth) bgClass = 'bg-gray-50 text-gray-400';
                        else if (isWeekEnd) bgClass = 'bg-gray-50';
                        if (holiday) bgClass = 'bg-red-50';
                        if (isSelected) bgClass = 'bg-teal-50 ring-inset ring-2 ring-teal-400';

                        return (
                            <div
                                key={idx}
                                onClick={() => {
                                    if (isCurrentMonth) handleDateClick(date);
                                }}
                                className={`
                    min-h-[100px] p-2 relative group hover:bg-gray-50 transition-colors cursor-pointer
                    ${bgClass}
                `}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm font-medium ${holiday ? 'text-red-600' : 'text-gray-700'}`}>
                                        {date.getDate()}
                                    </span>
                                    {holiday && (
                                        <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded truncate max-w-[80px]" title={holiday.name}>
                                            {holiday.name}
                                        </span>
                                    )}
                                </div>

                                {/* Avatares de vacaciones */}
                                <div className="mt-2 space-y-1">
                                    {vacationsOnDay.map(v => {
                                        const user = getUser(v.userId);
                                        if (!user) return null;

                                        const uniqueKey = `${v.id}-${idx}`;

                                        return (
                                            <div
                                                key={uniqueKey}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDetail({ vacation: v, dateStr: dateStr });
                                                }}
                                                className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5 text-xs overflow-hidden hover:bg-indigo-100 cursor-pointer transition-colors"
                                                title={`${user.name} (Click para detalles)`}
                                            >
                                                <img src={user.avatar} className="w-4 h-4 rounded-full" />
                                                <span className="truncate text-indigo-700 font-medium">{user.name.split(' ')[0]}</span>
                                                {/* Indicador visual de validación: Círculo verde con check */}
                                                {v.status === 'taken' && (
                                                    <div className="bg-teal-500 rounded-full p-0.5 ml-auto flex items-center justify-center shadow-sm">
                                                        <CheckCheck size={8} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Resumen Anual */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Users size={20} className="text-gray-600" />
                    Resumen de Días Tomados (Año {currentYear})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {users.map(u => (
                        <div
                            key={u.id}
                            onClick={() => setSelectedUserSummary(u)}
                            className="bg-gray-50 p-4 rounded-lg flex items-center gap-3 border border-gray-100 hover:bg-white hover:shadow-md hover:border-teal-200 cursor-pointer transition-all group"
                        >
                            <img src={u.avatar} className="w-10 h-10 rounded-full bg-white object-cover border-2 border-transparent group-hover:border-teal-400 transition-all" />
                            <div>
                                <p className="font-semibold text-gray-800 text-sm group-hover:text-teal-700">{u.name}</p>
                                <p className="text-xs text-gray-500">{userVacationStats[u.id]?.total || 0} días ({userVacationStats[u.id]?.business || 0} hábiles)</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Confirmación Creación */}
            {showConfirmModal && selectionStart && selectionEnd && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmar Vacaciones</h3>
                        <p className="text-gray-600 mb-4 text-sm">
                            Vas a asignar vacaciones para <strong>{isAdmin && targetUserId !== currentUser.id ? getUser(targetUserId)?.name : 'ti'}</strong>.
                        </p>

                        <div className="bg-gray-50 p-3 rounded-lg mb-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Desde:</span>
                                <span className="font-medium">{selectionStart}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Hasta:</span>
                                <span className="font-medium">{selectionEnd}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-2 space-y-1">
                                <div className="flex justify-between text-indigo-700 font-bold">
                                    <span>Duración Total:</span>
                                    <span>{calculateTotalDaysForSelection()} días</span>
                                </div>
                                <div className="flex justify-between text-teal-600 text-xs">
                                    <span>Días Laborales (Lun-Vie):</span>
                                    <span>{calculateBusinessDays()} días</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowConfirmModal(false); setSelectionStart(null); setSelectionEnd(null); }}
                                className="flex-1 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmitVacation}
                                className="flex-1 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 font-medium"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalles / Eliminar Vacación */}
            {selectedDetail && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl relative">
                        <button
                            onClick={() => setSelectedDetail(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Palmtree className="text-indigo-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Detalles de Vacación</h3>
                                <p className="text-sm text-gray-500">{getUser(selectedDetail.vacation.userId)?.name}</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Periodo Completo:</span>
                                <span className="font-medium">{selectedDetail.vacation.startDate} — {selectedDetail.vacation.endDate}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Día Seleccionado:</span>
                                <span className="font-bold text-amber-700">{selectedDetail.dateStr}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-2 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Duración Total:</span>
                                    <span className="font-bold text-indigo-700">
                                        {calculateTotalDays(selectedDetail.vacation.startDate, selectedDetail.vacation.endDate)} días
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Días Laborales (Lun-Vie):</span>
                                    <span className="text-gray-600">
                                        {calculateBusinessDaysForRange(selectedDetail.vacation.startDate, selectedDetail.vacation.endDate)} días
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Opciones de Eliminación - Restringido si ya está validado (solo admin) */}
                        {(isAdmin || (selectedDetail.vacation.userId === currentUser.id && selectedDetail.vacation.status !== 'taken')) && (
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Opciones de Eliminación</p>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleDeleteSpecificDay}
                                        className="flex flex-col items-center justify-center gap-2 p-3 border-2 border-amber-100 bg-amber-50 hover:bg-amber-100 hover:border-amber-200 rounded-xl transition-all text-amber-700"
                                    >
                                        <CalendarIcon size={20} />
                                        <span className="text-xs font-medium text-center">Eliminar Solo<br />{selectedDetail.dateStr}</span>
                                    </button>

                                    <button
                                        onClick={handleDeleteEntireVacation}
                                        className="flex flex-col items-center justify-center gap-2 p-3 border-2 border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-200 rounded-xl transition-all text-red-700"
                                    >
                                        <CalendarDays size={20} />
                                        <span className="text-xs font-medium text-center">Eliminar Todo<br />El Periodo</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Solo Admin: Acciones de Estado */}
                        {isAdmin && selectedDetail.vacation.status !== 'taken' && (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                {selectedDetail.vacation.status === 'pending' && (
                                    <button
                                        onClick={() => handleUpdateVacationStatus('approved')}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                                    >
                                        <CheckCircle2 size={16} />
                                        Aprobar Solicitud
                                    </button>
                                )}

                                {selectedDetail.vacation.status === 'approved' && (
                                    <button
                                        onClick={() => handleUpdateVacationStatus('taken')}
                                        className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-100"
                                    >
                                        <CheckCheck size={16} />
                                        Confirmar Vacaciones Tomadas
                                    </button>
                                )}
                            </div>
                        )}

                        {selectedDetail.vacation.status === 'taken' && (
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-teal-600 bg-teal-50 py-2 rounded-lg border border-teal-100">
                                <CheckCheck size={18} />
                                <span className="font-bold text-sm">Vacaciones Confirmadas</span>
                            </div>
                        )}

                        {!(isAdmin || selectedDetail.vacation.userId === currentUser.id) && (
                            <p className="text-xs text-center text-gray-400 mt-2">Solo lectura</p>
                        )}
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
                                    <h3 className="text-lg font-bold text-gray-800">Resumen de Vacaciones</h3>
                                    <p className="text-sm text-gray-500">Listado para enviar al equipo</p>
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
                                href={`mailto:?subject=Resumen Anual de Vacaciones - Tráfico RAM&body=${encodeURIComponent(summaryContent)}`}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
                            >
                                <Mail size={18} />
                                Abrir en Correo
                            </a>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Resumen Individual de Usuario */}
            {selectedUserSummary && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b">
                            <div className="flex items-center gap-3">
                                <img src={selectedUserSummary.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-teal-100" />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">{selectedUserSummary.name}</h3>
                                    <p className="text-sm text-gray-500">Resumen de Vacaciones {currentYear}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUserSummary(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-3">
                                {vacations
                                    .filter(v => v.userId === selectedUserSummary.id && v.status !== 'rejected' && v.startDate.startsWith(currentYear.toString()))
                                    .sort((a, b) => a.startDate.localeCompare(b.startDate))
                                    .map(v => (
                                        <div key={v.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center justify-between group">
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                    {new Date(v.startDate + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long' })}
                                                </p>
                                                <p className="text-sm font-semibold text-gray-800">
                                                    {new Date(v.startDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {new Date(v.endDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                </p>
                                                <p className="text-xs text-teal-600 font-medium">
                                                    {calculateTotalDays(v.startDate, v.endDate)} días totales / {calculateBusinessDaysForRange(v.startDate, v.endDate)} laborales
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {v.status === 'taken' ? (
                                                    <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1">
                                                        <CheckCheck size={10} /> Confirmado
                                                    </span>
                                                ) : v.status === 'approved' ? (
                                                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1">
                                                        <CheckCircle2 size={10} /> Aprobado
                                                    </span>
                                                ) : (
                                                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Solicitado</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                {vacations.filter(v => v.userId === selectedUserSummary.id && v.status !== 'rejected' && v.startDate.startsWith(currentYear.toString())).length === 0 && (
                                    <div className="text-center py-10">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Palmtree className="text-gray-400" size={24} />
                                        </div>
                                        <p className="text-gray-500 font-medium text-sm">No tiene vacaciones registradas en {currentYear}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setSelectedUserSummary(null)}
                                className="flex-1 py-2 border border-gray-300 bg-white rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => handleGenerateUserVacationSummary(selectedUserSummary)}
                                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all"
                            >
                                <Mail size={18} />
                                Enviar por Mail
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
