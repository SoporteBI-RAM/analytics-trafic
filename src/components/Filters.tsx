import React, { useState, useRef, useEffect } from 'react';
import { User, Status, Priority, Client } from '../types';
import { Filter, X, ChevronDown, ChevronUp, Search, AlertCircle, Check } from 'lucide-react';

interface FiltersProps {
  currentUser: User;
  users: User[];
  clients: Client[];
  selectedStatuses: Status[];
  selectedPriorities: Priority[];
  selectedAssignees: string[];
  selectedClients: string[];
  searchTaskName: string;
  dateFrom: string;
  dateTo: string;
  showOverdueOnly: boolean;
  showMotherTasks: boolean;
  showRecurringOnly: boolean;
  onStatusChange: (status: Status) => void;
  onPriorityChange: (priority: Priority) => void;
  onAssigneeChange: (userId: string) => void;
  onClientChange: (clientId: string) => void;
  onSearchChange: (search: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onOverdueToggle: (value: boolean) => void;
  onMotherTasksToggle: (value: boolean) => void;
  onRecurringToggle: (value: boolean) => void;
  onClearFilters: () => void;
  onClearFiltersBySection: (section: 'status' | 'priority' | 'assignee' | 'client' | 'dates') => void;
}

export const Filters: React.FC<FiltersProps> = ({
  currentUser,
  users,
  clients,
  selectedStatuses,
  selectedPriorities,
  selectedAssignees,
  selectedClients,
  searchTaskName,
  dateFrom,
  dateTo,
  showOverdueOnly,
  showMotherTasks,
  showRecurringOnly,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onClientChange,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onOverdueToggle,
  onMotherTasksToggle,
  onRecurringToggle,
  onClearFilters,
  onClearFiltersBySection
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statuses: Status[] = ['todo', 'inprogress', 'review', 'done'];
  const priorities: Priority[] = ['low', 'medium', 'high', 'critical'];

  const statusLabels = {
    todo: 'Por Hacer',
    inprogress: 'En Progreso',
    review: 'En Revisión',
    done: 'Finalizado'
  };

  const priorityLabels = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica'
  };

  const hasActiveFilters = selectedStatuses.length > 0 ||
    selectedPriorities.length > 0 ||
    (currentUser.role !== 'Analyst' && selectedAssignees.length > 0) ||
    selectedClients.length > 0 ||
    searchTaskName.length > 0 ||
    showOverdueOnly ||
    showRecurringOnly ||
    dateFrom || dateTo;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-visible transition-all duration-200">
      {/* Header Bar */}
      <div className="p-4 flex items-center justify-between bg-white z-10 relative">
        <div className="flex items-center gap-4 flex-1">
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors"
          >
            <Filter size={18} className="text-[#0078D4]" />
            <span className="font-semibold text-gray-800">Filtros</span>
            {hasActiveFilters && (
              <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Activos
              </span>
            )}
            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>

          <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>

          {/* Quick Search - Always visible on Desktop */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTaskName}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar tarea..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors font-medium group"
            >
              <X size={14} className="group-hover:rotate-90 transition-transform" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filters Area */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-5">

            {/* Estado - Dropdown */}
            <FilterDropdown
              label="Estado"
              count={selectedStatuses.length}
              labelMap={statusLabels}
              selectedKeys={selectedStatuses}
              onClear={() => onClearFiltersBySection('status')}
            >
              {statuses.map(status => (
                <label key={status} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedStatuses.includes(status) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                    {selectedStatuses.includes(status) && <Check size={10} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedStatuses.includes(status)}
                    onChange={() => onStatusChange(status)}
                  />
                  <span className="text-sm text-gray-700">{statusLabels[status]}</span>
                </label>
              ))}
            </FilterDropdown>

            {/* Prioridad - Dropdown */}
            <FilterDropdown
              label="Prioridad"
              count={selectedPriorities.length}
              labelMap={priorityLabels}
              selectedKeys={selectedPriorities}
              onClear={() => onClearFiltersBySection('priority')}
            >
              {priorities.map(priority => (
                <label key={priority} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedPriorities.includes(priority) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                    {selectedPriorities.includes(priority) && <Check size={10} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedPriorities.includes(priority)}
                    onChange={() => onPriorityChange(priority)}
                  />
                  <span className="text-sm text-gray-700">{priorityLabels[priority]}</span>
                </label>
              ))}
            </FilterDropdown>

            {/* Responsable - Dropdown (Locked for Analyst) */}
            <div className="relative">
              {currentUser.role === 'Analyst' ? (
                <>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Responsable</label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed flex items-center justify-between">
                    <span>{currentUser.name} (Tú)</span>
                    <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">Fijo</span>
                  </div>
                </>
              ) : (
                <FilterDropdown
                  label="Responsable"
                  count={selectedAssignees.length}
                  customLabel={selectedAssignees.length > 0 ? `${selectedAssignees.length} seleccionados` : 'Todos'}
                  isFullWidth
                  onClear={() => onClearFiltersBySection('assignee')}
                >
                  {users.map(user => (
                    <label key={user.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedAssignees.includes(user.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                        {selectedAssignees.includes(user.id) && <Check size={10} className="text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selectedAssignees.includes(user.id)}
                        onChange={() => onAssigneeChange(user.id)}
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden">
                          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-sm text-gray-700">{user.name}</span>
                      </div>
                    </label>
                  ))}
                </FilterDropdown>
              )}
            </div>

            {/* Rangos de Fecha */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha Vencimiento</label>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => onClearFiltersBySection('dates')}
                    className="text-[10px] text-gray-400 hover:text-red-500 font-medium transition-colors flex items-center gap-0.5"
                  >
                    <X size={10} />
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => onDateFromChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => onDateToChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
            {/* Cliente - Dropdown */}
            <div className="relative">
              <FilterDropdown
                label="Cliente"
                count={selectedClients.length}
                customLabel={selectedClients.length > 0 ? `${selectedClients.length} seleccionados` : 'Todos'}
                isFullWidth
                onClear={() => onClearFiltersBySection('client')}
              >
                {clients.length === 0 ? (
                  <p className="text-sm text-gray-400 p-2 italic">No hay clientes</p>
                ) : (
                  clients.map(client => (
                    <label key={client.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedClients.includes(client.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                        {selectedClients.includes(client.id) && <Check size={10} className="text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selectedClients.includes(client.id)}
                        onChange={() => onClientChange(client.id)}
                      />
                      <span className="text-sm text-gray-700">{client.name}</span>
                    </label>
                  ))
                )}
              </FilterDropdown>
            </div>

            {/* Toggles */}
            <div className="flex items-start gap-4 flex-wrap">
              {/* Solo vencidas */}
              <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg border border-transparent hover:border-red-100/50 hover:shadow-sm transition-all group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showOverdueOnly ? 'bg-red-500 border-red-500' : 'border-gray-300 bg-white'}`}>
                  {showOverdueOnly && <Check size={12} className="text-white" />}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={showOverdueOnly}
                  onChange={(e) => onOverdueToggle(e.target.checked)}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-red-500" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-red-700">Solo vencidas</span>
                  </div>
                </div>
              </label>

              {/* Ver/Ocultar tareas madre */}
              <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg border border-transparent hover:border-purple-100/50 hover:shadow-sm transition-all group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showMotherTasks ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'}`}>
                  {showMotherTasks && <Check size={12} className="text-white" />}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={showMotherTasks}
                  onChange={(e) => onMotherTasksToggle(e.target.checked)}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-purple-500 font-bold text-xs ring-1 ring-purple-500 rounded px-1">M</div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                      {showMotherTasks ? 'Ocultar tareas madre' : 'Ver tareas madre'}
                    </span>
                  </div>
                </div>
              </label>

              {/* Solo tareas madre - Solo visible cuando showMotherTasks está activo */}
              {showMotherTasks && (
                <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg border border-transparent hover:border-indigo-100/50 hover:shadow-sm transition-all group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showRecurringOnly ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 bg-white'}`}>
                    {showRecurringOnly && <Check size={12} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={showRecurringOnly}
                    onChange={(e) => onRecurringToggle(e.target.checked)}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-indigo-500 font-bold text-xs ring-1 ring-indigo-500 rounded px-1">R</div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700">Solo tareas madre</span>
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal Helper Component for Dropdowns
interface FilterDropdownProps {
  label: string;
  count: number;
  labelMap?: Record<string, string>;
  selectedKeys?: string[];
  children: React.ReactNode;
  customLabel?: string;
  isFullWidth?: boolean;
  onClear?: () => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  count,
  labelMap,
  selectedKeys,
  children,
  customLabel,
  isFullWidth = false,
  onClear
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let displayText = 'Todos';
  if (customLabel) {
    displayText = customLabel;
  } else if (count > 0 && labelMap && selectedKeys) {
    if (count === 1) displayText = labelMap[selectedKeys[0]];
    else displayText = `${count} seleccionados`;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
        {onClear && count > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="text-[10px] text-gray-400 hover:text-red-500 font-medium transition-colors flex items-center gap-0.5"
          >
            <X size={10} />
            Limpiar
          </button>
        )}
      </div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-white border ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'} rounded-lg text-sm transition-all text-left shadow-sm`}
      >
        <span className={`truncate ${count > 0 ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
          {displayText}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-50 p-2 max-h-60 overflow-y-auto ${isFullWidth ? 'w-full' : 'w-56'}`}>
          <div className="space-y-0.5">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
