import React, { useState, useEffect, useMemo } from 'react';
import { Auth } from './components/Auth';
import { TaskCard } from './components/TaskCard';
import { GanttView } from './components/GanttView';
import { Filters } from './components/Filters';
import { TeamManagement } from './components/TeamManagement';
import { ClientManagement } from './components/ClientManagement';
import { TableView } from './components/TableView';
import { ClientPerformance } from './components/ClientPerformance';
import { UserPerformance } from './components/UserPerformance';
import { Dashboard } from './components/Dashboard';
import { NotificationContainer } from './components/NotificationContainer';
import { FridayTimeOff } from './components/FridayTimeOff';
import { VacationPlanner } from './components/VacationPlanner';
import { User, Task, Status, ViewMode, Priority, Client, DayOfWeek, FridayTimeOff as FridayTimeOffType, Holiday, Vacation } from './types';
import { MOCK_USERS, MOCK_CLIENTS, STATUS_LABELS, STATUS_COLORS } from './constants';
import { generateDailyReport } from './services/geminiService';
import { sheetsService } from './services/sheetsService';
import { useOptimisticData } from './hooks/useOptimisticData';
import { useNotifications } from './hooks/useNotifications';
import {
  LayoutDashboard,
  CalendarRange,
  Users as UsersIcon,
  Plus,
  Sparkles,
  LogOut,
  Mail,
  UserCog,
  Menu,
  X,
  Edit,
  Trash2, AlertCircle, Check, Search, Filter, Calendar, ArrowLeft, BarChart3, Database, History, Layout, Settings, Briefcase, Save, Building2, Award, ChevronDown, ChevronUp, Sun, RefreshCw, Palmtree
} from 'lucide-react';
import { getLocalDateString } from './utils/dateUtils';



const INITIAL_TASKS: Task[] = [];

const App: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedTaskTitle, setCompletedTaskTitle] = useState('');

  // Filtros de interfaz - DEFINIDOS ANTES DEL USO
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>(['todo', 'inprogress', 'review']);
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [searchTaskName, setSearchTaskName] = useState('');
  const [dateFrom, setDateFrom] = useState(`${getLocalDateString().substring(0, 8)}01`);
  const [dateTo, setDateTo] = useState(getLocalDateString());
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showMotherTasks, setShowMotherTasks] = useState(false);
  const [showRecurringOnly, setShowRecurringOnly] = useState(false);

  // Ref para controlar el cooldown de sincronización
  const lastWriteTime = React.useRef<number>(0);
  const pollCount = React.useRef<number>(0);
  const COOLDOWN_MS = 5000;

  // Hook de notificaciones
  const { notifications, addNotification, removeNotification } = useNotifications();

  // Hooks optimistas
  const tasksOptimistic = useOptimisticData<Task>(INITIAL_TASKS, {
    syncFn: async (operation, task) => { await sheetsService.saveTaskIncremental(operation, task); },
    onSyncSuccess: () => { lastWriteTime.current = Date.now(); },
    onSyncError: (error) => { addNotification(`Error al sincronizar tarea: ${error.message}`, 'error'); }
  });

  const usersOptimistic = useOptimisticData<User>(MOCK_USERS, {
    syncFn: async (operation, user) => { await sheetsService.saveUserIncremental(operation, user); },
    onSyncSuccess: () => { lastWriteTime.current = Date.now(); },
    onSyncError: (error) => { addNotification(`Error al sincronizar usuario: ${error.message}`, 'error'); }
  });

  const clientsOptimistic = useOptimisticData<Client>(MOCK_CLIENTS, {
    syncFn: async (operation, client) => { await sheetsService.saveClientIncremental(operation, client); },
    onSyncSuccess: () => { lastWriteTime.current = Date.now(); },
    onSyncError: (error) => { addNotification(`Error al sincronizar cliente: ${error.message}`, 'error'); }
  });

  const fridayTimeOffsOptimistic = useOptimisticData<FridayTimeOffType>([], {
    syncFn: async (operation, timeOff) => { await sheetsService.saveFridayTimeOffIncremental(operation, timeOff); },
    onSyncSuccess: () => { lastWriteTime.current = Date.now(); },
    onSyncError: (error) => { addNotification(`Error al sincronizar tarde libre: ${error.message}`, 'error'); }
  });

  const holidaysOptimistic = useOptimisticData<Holiday>([], {
    syncFn: async (operation, holiday) => { await sheetsService.saveHolidayIncremental(operation, holiday); },
    onSyncSuccess: () => { lastWriteTime.current = Date.now(); },
    onSyncError: (error) => { addNotification(`Error al sincronizar feriado: ${error.message}`, 'error'); }
  });

  const vacationsOptimistic = useOptimisticData<Vacation>([], {
    syncFn: async (operation, vacation) => { await sheetsService.saveVacationIncremental(operation, vacation); },
    onSyncSuccess: () => { lastWriteTime.current = Date.now(); },
    onSyncError: (error) => { addNotification(`Error al sincronizar vacación: ${error.message}`, 'error'); }
  });

  // Aliases
  const tasks = tasksOptimistic.data;
  const users = usersOptimistic.data;
  const clients = clientsOptimistic.data;
  const fridayTimeOffs = fridayTimeOffsOptimistic.data;
  const holidays = holidaysOptimistic.data;
  const vacations = vacationsOptimistic.data;
  const setTasks = tasksOptimistic.setAll; // Alias para compatibilidad con código legacy

  // Refs para estado actual
  const tasksRef = React.useRef(tasks);
  const usersRef = React.useRef(users);
  const clientsRef = React.useRef(clients);
  const fridayTimeOffsRef = React.useRef(fridayTimeOffs);
  const holidaysRef = React.useRef(holidays);
  const vacationsRef = React.useRef(vacations);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { clientsRef.current = clients; }, [clients]);
  useEffect(() => { fridayTimeOffsRef.current = fridayTimeOffs; }, [fridayTimeOffs]);
  useEffect(() => { holidaysRef.current = holidays; }, [holidays]);
  useEffect(() => { vacationsRef.current = vacations; }, [vacations]);

  // ===================== FILTRADO GLOBAL POR ESTADO ACTIVO =====================
  const isAdmin = currentUser?.role === 'Admin';

  const visibleUsers = useMemo(() => {
    if (isAdmin) return users;
    return users.filter(u => u.isActive !== false);
  }, [users, isAdmin]);

  const activeUserIds = useMemo(() => new Set(users.filter(u => u.isActive !== false).map(u => u.id)), [users]);

  const visibleTasks = useMemo(() => {
    if (isAdmin) return tasks;
    return tasks.filter(t => {
      const assignees = t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []);
      return assignees.some(id => activeUserIds.has(id));
    });
  }, [tasks, isAdmin, activeUserIds]);

  const visibleVacations = useMemo(() => {
    if (isAdmin) return vacations;
    return vacations.filter(v => activeUserIds.has(v.userId));
  }, [vacations, isAdmin, activeUserIds]);

  const visibleFridayTimeOffs = useMemo(() => {
    if (isAdmin) return fridayTimeOffs;
    return fridayTimeOffs.filter(to => activeUserIds.has(to.userId));
  }, [fridayTimeOffs, isAdmin, activeUserIds]);

  // Handlers
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'Analyst') {
      setSelectedAssignees([user.id]);
    } else {
      setSelectedAssignees([user.id]);
    }
    setSelectedStatuses(['todo', 'inprogress', 'review']);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedAssignees([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedClients([]);
    setSearchTaskName('');
    setDateFrom('');
    setDateTo('');
    setShowOverdueOnly(false);
  };

  useEffect(() => {
    loadData();

    // Polling cada 10s (más seguro para quotas)
    const interval = setInterval(() => {
      syncDataFromSheets();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const syncDataFromSheets = async (forceAll: boolean = false) => {
    // Chequeo de seguridad: Cooldown
    // Solo bloquea si hay cambios PENDIENTES de sincronizar o muy recientes
    const isCooldownActive = Date.now() - lastWriteTime.current < COOLDOWN_MS;
    const hasPendingOps = tasksOptimistic.pendingOperations > 0 ||
      usersOptimistic.pendingOperations > 0 ||
      clientsOptimistic.pendingOperations > 0 ||
      fridayTimeOffsOptimistic.pendingOperations > 0 ||
      holidaysOptimistic.pendingOperations > 0 ||
      vacationsOptimistic.pendingOperations > 0;

    if (hasPendingOps) {
      // console.log('⏳ Saltando sync por operaciones pendientes');
      if (forceAll) addNotification('Sincronización pausada: hay cambios guardándose...', 'warning');
      return;
    }

    if (isCooldownActive && !forceAll) {
      // console.log('⏳ Saltando sync por actividad local reciente');
      return;
    }

    // Incrementar contador para polling escalonado
    pollCount.current += 1;
    const shouldSyncStaticData = forceAll || pollCount.current % 6 === 0; // Cada 60s (6 * 10s) o forzado

    if (forceAll) {
      addNotification('Actualizando datos...', 'info');
    }

    try {
      // 1. Siempre sincronizar TAREAS (alta frecuencia)
      const loadedTasks = await sheetsService.getTasks();

      // 2. Sincronizar datos ESTATICOS (baja frecuencia)
      let loadedUsers: User[] | null = null;
      let loadedClients: Client[] | null = null;
      let loadedFridayTimeOffs: FridayTimeOffType[] | null = null;
      let loadedHolidays: Holiday[] | null = null;
      let loadedVacations: Vacation[] | null = null;

      if (shouldSyncStaticData) {
        console.log('🔄 Sync: Ejecutando sync completa (static data)...');
        [loadedUsers, loadedClients, loadedFridayTimeOffs, loadedHolidays, loadedVacations] = await Promise.all([
          sheetsService.getUsers(),
          sheetsService.getClients(),
          sheetsService.getFridayTimeOffs(),
          sheetsService.getHolidays(),
          sheetsService.getVacations()
        ]);
      }

      // Solo actualizar si hay datos nuevos y diferentes al estado ACTUAL (usando refs)

      // 1. Tasks
      if (loadedTasks && loadedTasks.length > 0) {
        // Usar tasksRef.current para comparar con el estado actual VERDADERO
        const currentTasksJSON = JSON.stringify(tasksRef.current);
        const loadedTasksJSON = JSON.stringify(loadedTasks);

        if (currentTasksJSON !== loadedTasksJSON) {
          console.log('🔄 Sync: Detectados cambios en Tareas servidas');
          const normalizedTasks = loadedTasks.map(t => ({
            ...t,
            assigneeIds: t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []),
            clientId: t.clientId || null
          }));
          tasksOptimistic.setAll(normalizedTasks);
        }
      }

      // 2. Users (solo si se cargaron)
      if (loadedUsers && loadedUsers.length > 0) {
        if (JSON.stringify(usersRef.current) !== JSON.stringify(loadedUsers)) {
          console.log('🔄 Sync: Detectados cambios en Usuarios');
          usersOptimistic.setAll(loadedUsers);
        }
      }

      // 3. Clients (solo si se cargaron)
      if (loadedClients && loadedClients.length > 0) {
        if (JSON.stringify(clientsRef.current) !== JSON.stringify(loadedClients)) {
          console.log('🔄 Sync: Detectados cambios en Clientes');
          clientsOptimistic.setAll(loadedClients);
        }
      }

      // 4. Friday Time Offs (solo si se cargaron)
      if (loadedFridayTimeOffs && loadedFridayTimeOffs.length > 0) {
        if (JSON.stringify(fridayTimeOffsRef.current) !== JSON.stringify(loadedFridayTimeOffs)) {
          console.log('🔄 Sync: Detectados cambios en Tardes Libres');
          fridayTimeOffsOptimistic.setAll(loadedFridayTimeOffs);
        }
      }

      // 5. Holidays (solo si se cargaron)
      if (loadedHolidays && loadedHolidays.length > 0) {
        if (JSON.stringify(holidaysRef.current) !== JSON.stringify(loadedHolidays)) {
          console.log('🔄 Sync: Detectados cambios en Feriados');
          holidaysOptimistic.setAll(loadedHolidays);
        }
      }

      // 6. Vacations (solo si se cargaron)
      if (loadedVacations) {
        if (JSON.stringify(vacationsRef.current) !== JSON.stringify(loadedVacations)) {
          console.log('🔄 Sync: Detectados cambios en Vacaciones');
          vacationsOptimistic.setAll(loadedVacations);
        }
      }

    } catch (error) {
      console.error('Error syncing data:', error);
    }
  };

  const loadData = async () => {
    try {
      const [loadedTasks, loadedUsers, loadedClients, loadedFridayTimeOffs, loadedHolidays, loadedVacations] = await Promise.all([
        sheetsService.getTasks(),
        sheetsService.getUsers(),
        sheetsService.getClients(),
        sheetsService.getFridayTimeOffs(),
        sheetsService.getHolidays(),
        sheetsService.getVacations()
      ]);

      if (loadedUsers.length > 0) {
        usersOptimistic.setAll(loadedUsers);
      }

      if (loadedClients.length > 0) {
        clientsOptimistic.setAll(loadedClients);
      }

      if (loadedFridayTimeOffs.length > 0) {
        fridayTimeOffsOptimistic.setAll(loadedFridayTimeOffs);
      }

      if (loadedHolidays.length > 0) {
        holidaysOptimistic.setAll(loadedHolidays);
      }

      if (loadedVacations) {
        vacationsOptimistic.setAll(loadedVacations);
      }

      if (loadedTasks.length > 0) {
        const tasksWithAssigneeIds = loadedTasks.map((t: Task) => ({
          ...t,
          assigneeIds: t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []),
          clientId: t.clientId || null
        }));

        tasksOptimistic.setAll(tasksWithAssigneeIds);
      } else {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
          const parsed = JSON.parse(savedTasks);
          tasksOptimistic.setAll(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        tasksOptimistic.setAll(parsed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // LEGACY: Guardado completo (mantener por compatibilidad)
  const saveTasks = async (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('tasks', JSON.stringify(newTasks));
    await sheetsService.saveTasks(newTasks);
  };

  const handleCreateUser = async (user: User) => {
    // 1️⃣ Bloqueo inmediato
    lastWriteTime.current = Date.now();

    // 2️⃣ Actualizar INMEDIATAMENTE
    usersOptimistic.create(user);
    localStorage.setItem('users', JSON.stringify([...users, user]));

    // 2️⃣ Notificación instantánea
    addNotification('Usuario creado correctamente', 'success');

    // 3️⃣ Sincronización automática en background (manejada por el hook)
  };

  const handleUpdateUser = async (user: User) => {
    // 1️⃣ Bloqueo inmediato
    lastWriteTime.current = Date.now();

    // Preservar el password existente si el nuevo está vacío
    const existingUser = users.find(u => u.id === user.id);
    const updatedUser = {
      ...user,
      password: user.password && user.password.trim() !== '' ? user.password : existingUser?.password
    };

    // 2️⃣ Actualizar INMEDIATAMENTE
    usersOptimistic.update(updatedUser);
    const newUsers = users.map(u => u.id === user.id ? updatedUser : u);
    localStorage.setItem('users', JSON.stringify(newUsers));

    // 2️⃣ Notificación instantánea
    addNotification('Usuario actualizado correctamente', 'success');
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    // 1️⃣ Bloqueo inmediato
    lastWriteTime.current = Date.now();

    // 2️⃣ Eliminar INMEDIATAMENTE
    usersOptimistic.remove(userToDelete);
    const newUsers = users.filter(u => u.id !== userId);
    localStorage.setItem('users', JSON.stringify(newUsers));

    // 2️⃣ Notificación instantánea
    addNotification('Usuario eliminado correctamente', 'success');
  };

  const handleCreateClient = async (client: Client) => {
    // 1️⃣ Bloqueo inmediato
    lastWriteTime.current = Date.now();

    // 2️⃣ Actualizar INMEDIATAMENTE
    clientsOptimistic.create(client);
    localStorage.setItem('clients', JSON.stringify([...clients, client]));

    // 2️⃣ Notificación instantánea
    addNotification('Cliente creado correctamente', 'success');
  };

  const handleUpdateClient = async (client: Client) => {
    // 1️⃣ Bloqueo inmediato
    lastWriteTime.current = Date.now();

    // 2️⃣ Actualizar INMEDIATAMENTE
    clientsOptimistic.update(client);
    const newClients = clients.map(c => c.id === client.id ? client : c);
    localStorage.setItem('clients', JSON.stringify(newClients));

    // 2️⃣ Notificación instantánea
    addNotification('Cliente actualizado correctamente', 'success');
  };

  const handleDeleteClient = async (clientId: string) => {
    const clientToDelete = clients.find(c => c.id === clientId);
    if (!clientToDelete) return;

    // 1️⃣ Bloqueo inmediato
    lastWriteTime.current = Date.now();

    // 2️⃣ Eliminar INMEDIATAMENTE
    clientsOptimistic.remove(clientToDelete);
    const newClients = clients.filter(c => c.id !== clientId);
    localStorage.setItem('clients', JSON.stringify(newClients));

    // 2️⃣ Notificación instantánea
    addNotification('Cliente eliminado correctamente', 'success');
  };

  // ===================== TARDES LIBRES =====================
  const handleCreateFridayTimeOff = async (timeOff: FridayTimeOffType) => {
    lastWriteTime.current = Date.now();
    fridayTimeOffsOptimistic.create(timeOff);
    addNotification('Tarde libre registrada correctamente', 'success');
  };

  const handleUpdateFridayTimeOff = async (timeOff: FridayTimeOffType) => {
    lastWriteTime.current = Date.now();
    fridayTimeOffsOptimistic.update(timeOff);
    addNotification('Tarde libre actualizada correctamente', 'success');
  };

  const handleDeleteFridayTimeOff = async (timeOffId: string) => {
    const timeOffToDelete = fridayTimeOffs.find(to => to.id === timeOffId);
    if (!timeOffToDelete) return;
    lastWriteTime.current = Date.now();
    fridayTimeOffsOptimistic.remove(timeOffToDelete);
    addNotification('Tarde libre eliminada correctamente', 'success');
  };

  // ===================== FERIADOS =====================
  const handleCreateHoliday = async (holiday: Holiday) => {
    lastWriteTime.current = Date.now();
    holidaysOptimistic.create(holiday);
    addNotification('Feriado creado correctamente', 'success');
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    const holidayToDelete = holidays.find(h => h.id === holidayId);
    if (!holidayToDelete) return;
    lastWriteTime.current = Date.now();
    holidaysOptimistic.remove(holidayToDelete);
    addNotification('Feriado eliminado correctamente', 'success');
  };

  // ===================== VACACIONES =====================
  const handleCreateVacation = async (vacation: Vacation) => {
    lastWriteTime.current = Date.now();
    vacationsOptimistic.create(vacation);
    addNotification('Vacaciones registradas correctamente', 'success');
  };

  const handleDeleteVacation = async (vacationId: string) => {
    const vacationToDelete = vacations.find(v => v.id === vacationId);
    if (!vacationToDelete) return;
    lastWriteTime.current = Date.now();
    vacationsOptimistic.remove(vacationToDelete);
    addNotification('Vacaciones eliminadas correctamente', 'success');
  };

  const handleUpdateVacation = async (vacation: Vacation) => {
    lastWriteTime.current = Date.now();
    vacationsOptimistic.update(vacation);
    addNotification('Vacaciones actualizadas correctamente', 'success');
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    if (draggingId) {
      const updatedTask = tasks.find(t => t.id === draggingId);
      if (updatedTask) {
        // Detectar si se completó (arrastró a done)
        const wasCompleted = updatedTask.status !== 'done' && status === 'done';

        const taskWithNewStatus = { ...updatedTask, status };

        // Si se completó ahora, agregar fecha de finalización
        if (wasCompleted) {
          const today = getLocalDateString();
          taskWithNewStatus.completedDate = today;
        }

        // Si se desmarca como completada, limpiar fecha
        if (updatedTask.status === 'done' && status !== 'done') {
          taskWithNewStatus.completedDate = null;
        }


        // 1️⃣ Bloqueo inmediato
        lastWriteTime.current = Date.now();

        // 2️⃣ Actualizar INMEDIATAMENTE
        tasksOptimistic.update(taskWithNewStatus);
        const newTasks = tasks.map(t => t.id === draggingId ? taskWithNewStatus : t);
        localStorage.setItem('tasks', JSON.stringify(newTasks));

        // 2️⃣ Notificación y celebración
        if (wasCompleted) {
          setCompletedTaskTitle(taskWithNewStatus.title);
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 4000);
        } else {
          addNotification(`Tarea movida a ${STATUS_LABELS[status]}`, 'info', 2000);
        }

        // 3️⃣ Sincronización en background (automática)
      }
      setDraggingId(null);
    }
  };

  const handleGenerateReport = () => {
    setIsGeneratingEmail(true);
    const report = generateDailyReport(filteredTasks, users);
    setEmailDraft(report);
    setIsGeneratingEmail(false);
  };

  const handleCreateTask = (taskData: Partial<Task>) => {
    // Normalizar recurrence si viene con "days" en lugar de "daysOfWeek"
    let normalizedRecurrence = taskData.recurrence;
    if (normalizedRecurrence && (normalizedRecurrence as any).days) {
      const daysArray = (normalizedRecurrence as any).days;
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      normalizedRecurrence = {
        ...normalizedRecurrence,
        daysOfWeek: daysArray.map((d: number) => dayNames[d]) as any,
        enabled: true
      };
    }

    if (normalizedRecurrence && normalizedRecurrence.enabled === undefined) {
      normalizedRecurrence.enabled = true;
    }

    // Crear tarea MADRE
    const motherTask: Task = {
      id: `t${Date.now()}`,
      title: taskData.title || '',
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      assigneeId: taskData.assigneeIds?.[0] || null,
      assigneeIds: taskData.assigneeIds || [],
      clientId: taskData.clientId || null,
      startDate: getLocalDateString(taskData.startDate),
      dueDate: normalizedRecurrence?.endDate || getLocalDateString(taskData.dueDate || new Date(Date.now() + 86400000 * 7)),
      tags: taskData.tags || [],
      completedDate: null,
      isRecurring: taskData.isRecurring || false,
      recurrence: normalizedRecurrence,
      instances: [], // No usamos instances
      parentTaskId: null
    };

    let newTasks = [motherTask];

    // Si es recurrente Y hoy es un día válido, crear tarea HIJA para HOY
    if (motherTask.isRecurring && motherTask.recurrence) {
      const today = getLocalDateString(); // Fecha local
      const startDate = new Date(motherTask.startDate);
      const endDate = new Date(motherTask.recurrence.endDate || motherTask.dueDate);
      const todayDate = new Date(today);

      if (todayDate >= startDate && todayDate <= endDate) {
        const shouldCreateToday = checkIfShouldCreateTask(today, motherTask.recurrence);

        if (shouldCreateToday) {
          const childTask: Task = {
            id: `t${Date.now()}_child_${today}`,
            title: `${motherTask.title} (${today})`,
            description: motherTask.description,
            status: motherTask.status,
            priority: motherTask.priority,
            assigneeId: motherTask.assigneeId,
            assigneeIds: motherTask.assigneeIds,
            clientId: motherTask.clientId,
            startDate: today,
            dueDate: today,
            tags: motherTask.tags,
            completedDate: null,
            isRecurring: false, // Las hijas NO son recurrentes
            recurrence: undefined,
            instances: [],
            parentTaskId: motherTask.id
          };

          newTasks.push(childTask);
        }
      }
    }

    // 1️⃣ Bloqueo inmediato
    lastWriteTime.current = Date.now();

    // 2️⃣ Agregar INMEDIATAMENTE (optimistic update)
    newTasks.forEach(task => {
      tasksOptimistic.create(task);
    });

    const allTasks = [...tasks, ...newTasks];
    localStorage.setItem('tasks', JSON.stringify(allTasks));

    // 2️⃣ Notificación instantánea
    if (newTasks.length === 1) {
      addNotification('Tarea creada correctamente', 'success');
    } else {
      addNotification(`${newTasks.length} tareas creadas correctamente`, 'success');
    }

    // 3️⃣ Sincronización en background (automática por el hook)

    setShowNewTaskModal(false);
  };

  // Función auxiliar para obtener fecha actual en UTC-5 (Ecuador)
  const getTodayEcuador = (): string => {
    return getLocalDateString();
  };

  // Función auxiliar para crear Date object en UTC-5
  const createDateEcuador = (dateString: string): Date => {
    // Crear fecha en UTC y ajustar a Ecuador
    const [year, month, day] = dateString.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // Mediodía UTC para evitar cambios de día
    return utcDate;
  };

  // Función auxiliar para verificar si se debe crear tarea en una fecha
  const checkIfShouldCreateTask = (dateString: string, recurrence: any): boolean => {
    // Parsear fecha manualmente para evitar timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // Fecha local

    const dayOfWeek = date.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
    const dayOfMonth = date.getDate(); // 1-31

    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    };

    if (recurrence.frequency === 'daily') {
      return true;
    }

    if (recurrence.frequency === 'weekly') {
      // Intentar primero con daysOfWeek
      let targetDays = recurrence.daysOfWeek?.map((d: string) => dayMap[d]) || [];

      // Si no hay daysOfWeek pero hay days, usar days directamente
      if (targetDays.length === 0 && recurrence.days) {
        targetDays = recurrence.days;
      }

      const resultado = targetDays.includes(dayOfWeek);

      return resultado;
    }

    if (recurrence.frequency === 'monthly') {
      const targetDay = recurrence.dayOfMonth || 1;
      const resultado = dayOfMonth === targetDay;
      return resultado;
    }

    return false;
  };

  const handleUpdateTask = (taskData: Task) => {
    // Detectar si la tarea pasó a "done"
    const oldTask = tasks.find(t => t.id === taskData.id);
    const wasCompleted = oldTask && oldTask.status !== 'done' && taskData.status === 'done';

    // Si se completó ahora, agregar fecha de finalización
    if (wasCompleted) {
      const today = getLocalDateString();
      taskData.completedDate = today;
    }

    // Si se desmarca como completada, limpiar fecha
    if (oldTask && oldTask.status === 'done' && taskData.status !== 'done') {
      taskData.completedDate = null;
    }

    taskData.completedDate = null;

    // 1️⃣ Bloqueo inmediato
    lastWriteTime.current = Date.now();

    // 2️⃣ Actualizar INMEDIATAMENTE
    tasksOptimistic.update(taskData);
    const newTasks = tasks.map(t => t.id === taskData.id ? taskData : t);
    localStorage.setItem('tasks', JSON.stringify(newTasks));
    setEditingTask(null);

    // 2️⃣ Notificación y celebración
    if (wasCompleted) {
      setCompletedTaskTitle(taskData.title);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4000);
    } else {
      addNotification('Tarea actualizada correctamente', 'success');
    }

    // 3️⃣ Sincronización en background (automática)
  };

  const handleDeleteTask = (task: Task) => {
    // Determinar mensaje según tipo de tarea
    let confirmMessage = '¿Eliminar esta tarea?';

    if (task.isRecurring && !task.parentTaskId) {
      // Es tarea MADRE
      const pendingChildren = tasks.filter(t =>
        t.parentTaskId === task.id &&
        t.status !== 'done'
      );

      if (pendingChildren.length > 0) {
        confirmMessage = `Esta es una tarea MADRE con ${pendingChildren.length} tareas hijas pendientes.\n\n¿Eliminar la tarea madre y todas las hijas PENDIENTES?\n(Las finalizadas se mantendrán)`;
      } else {
        confirmMessage = '¿Eliminar esta tarea madre?\n(No tiene tareas hijas pendientes)';
      }
    } else if (task.parentTaskId) {
      // Es tarea HIJA
      confirmMessage = '¿Eliminar esta tarea?\n(La tarea madre se mantendrá)';
    }

    if (confirm(confirmMessage)) {
      let tasksToDelete: Task[] = [task];

      // Si es madre, agregar hijas pendientes a eliminar
      if (task.isRecurring && !task.parentTaskId) {
        const pendingChildren = tasks.filter(t =>
          t.parentTaskId === task.id &&
          t.status !== 'done'
        );
        tasksToDelete = [task, ...pendingChildren];

        console.log(`🗑️ Eliminando tarea madre + ${pendingChildren.length} hijas pendientes`);
      }

      // 1️⃣ Bloqueo inmediato
      lastWriteTime.current = Date.now();

      // 2️⃣ Eliminar INMEDIATAMENTE
      tasksToDelete.forEach(t => {
        tasksOptimistic.remove(t);
      });

      const idsToDelete = tasksToDelete.map(t => t.id);
      const newTasks = tasks.filter(t => !idsToDelete.includes(t.id));
      localStorage.setItem('tasks', JSON.stringify(newTasks));

      // 2️⃣ Notificación instantánea
      if (tasksToDelete.length === 1) {
        addNotification('Tarea eliminada correctamente', 'success');
      } else {
        addNotification(`${tasksToDelete.length} tareas eliminadas correctamente`, 'success');
      }

      // 3️⃣ Sincronización en background (automática)

      console.log(`✅ ${tasksToDelete.length} tarea(s) eliminada(s)`);
    }
  };

  // Filtros
  const handleStatusFilter = (status: Status) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handlePriorityFilter = (priority: Priority) => {
    setSelectedPriorities(prev =>
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    );
  };

  const handleAssigneeFilter = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleClientFilter = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };

  const handleClearFilters = () => {
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedAssignees([]);
    setSelectedClients([]);
    setSearchTaskName('');
    setDateFrom('');
    setDateTo('');
    setShowOverdueOnly(false);
    setShowMotherTasks(false); // Volver a ocultar tareas madre
    setShowRecurringOnly(false);
  };

  const handleClearFiltersBySection = (section: 'status' | 'priority' | 'assignee' | 'client' | 'dates') => {
    switch (section) {
      case 'status': setSelectedStatuses([]); break;
      case 'priority': setSelectedPriorities([]); break;
      case 'assignee': setSelectedAssignees([]); break;
      case 'client': setSelectedClients([]); break;
      case 'dates':
        setDateFrom('');
        setDateTo('');
        break;
    }
  };

  // Aplicar filtros sobre las tareas VISIBLES
  const filteredTasks = visibleTasks.filter(task => {
    // Filtro por estado
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(task.status)) {
      return false;
    }

    // Filtro por prioridad
    if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) {
      return false;
    }

    // Filtro por responsable
    if (currentUser?.role === 'Analyst') {
      // SI es analista, SOLO ve sus tareas (fuerza bruta)
      const isAssigned = task.assigneeIds?.includes(currentUser.id) || task.assigneeId === currentUser.id;
      if (!isAssigned) return false;
    } else {
      // Si es Admin, usa el filtro seleccionado UI
      if (selectedAssignees.length > 0) {
        const hasAssignee = task.assigneeIds?.some(id => selectedAssignees.includes(id)) ||
          (task.assigneeId && selectedAssignees.includes(task.assigneeId));
        if (!hasAssignee) return false;
      }
    }

    // Filtro por cliente
    if (selectedClients.length > 0 && (!task.clientId || !selectedClients.includes(task.clientId))) {
      return false;
    }

    // Búsqueda por nombre de tarea
    if (searchTaskName && !task.title.toLowerCase().includes(searchTaskName.toLowerCase())) {
      return false;
    }

    // Filtro por fecha desde (comparación de strings YYYY-MM-DD)
    if (dateFrom && task.dueDate < dateFrom) {
      return false;
    }

    // Filtro por fecha hasta (comparación de strings YYYY-MM-DD)
    if (dateTo && task.dueDate > dateTo) {
      return false;
    }

    // Filtro de tareas vencidas
    if (showOverdueOnly) {
      const today = getLocalDateString();
      const isOverdue = task.status !== 'done' && task.dueDate < today;
      if (!isOverdue) return false;
    }

    // Filtro de tareas madre
    if (showRecurringOnly && !task.isRecurring) {
      return false;
    }

    return true;
  });



  // Tareas que definen el "universo" actual (para el denominador del contador)
  const contextTasks = visibleTasks.filter(task => {
    // 1. Restricción por Rol (Analista solo ve lo suyo)
    if (currentUser?.role === 'Analyst') {
      const isAssigned = task.assigneeIds?.includes(currentUser.id) || task.assigneeId === currentUser.id;
      if (!isAssigned) return false;
    } else if (selectedAssignees.length > 0) {
      // 2. Filtro de responsables (Admin)
      const hasAssignee = task.assigneeIds?.some(id => selectedAssignees.includes(id)) ||
        (task.assigneeId && selectedAssignees.includes(task.assigneeId));
      if (!hasAssignee) return false;
    }

    // 3. Filtro por cliente
    if (selectedClients.length > 0 && (!task.clientId || !selectedClients.includes(task.clientId))) {
      return false;
    }

    return true;
  });

  // Aplicar filtros de tareas madre a contextTasks
  const displayContextTasks = contextTasks.filter(t => {
    // Si showMotherTasks está desactivado (por defecto), ocultar tareas madre
    if (!showMotherTasks && t.isRecurring && !t.parentTaskId) {
      return false; // Ocultar tarea madre
    }

    // Si showMotherTasks está activado y showRecurringOnly está activo, solo mostrar tareas madre
    if (showMotherTasks && showRecurringOnly) {
      return t.isRecurring && !t.parentTaskId; // Solo tareas madre
    }

    // Mostrar todas las tareas (incluidas madres e hijas)
    return true;
  });

  // Tareas para vistas de rendimiento: incluye TODAS las tareas (ignorando filtro de estado)
  // Se usa para comparar el total de tareas vs las que coinciden con los filtros
  const performanceTasksPreFilter = visibleTasks.filter(task => {
    // 1. Restricción por Rol (Analista solo ve lo suyo)
    if (currentUser?.role === 'Analyst') {
      const isAssigned = task.assigneeIds?.includes(currentUser.id) || task.assigneeId === currentUser.id;
      if (!isAssigned) return false;
    } else if (selectedAssignees.length > 0) {
      // 2. Filtro de responsables (Admin)
      const hasAssignee = task.assigneeIds?.some(id => selectedAssignees.includes(id)) ||
        (task.assigneeId && selectedAssignees.includes(task.assigneeId));
      if (!hasAssignee) return false;
    }

    // 3. Filtro por cliente
    if (selectedClients.length > 0 && (!task.clientId || !selectedClients.includes(task.clientId))) {
      return false;
    }

    // 4. Filtro por prioridad
    if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) {
      return false;
    }

    // 5. Filtro por búsqueda
    if (searchTaskName && !task.title.toLowerCase().includes(searchTaskName.toLowerCase())) {
      return false;
    }

    // 6. Filtro por fecha desde
    if (dateFrom && task.dueDate < dateFrom) {
      return false;
    }

    // 7. Filtro por fecha hasta
    if (dateTo && task.dueDate > dateTo) {
      return false;
    }

    // 8. Filtro de tareas vencidas
    if (showOverdueOnly) {
      const today = getLocalDateString();
      const isOverdue = task.status !== 'done' && task.dueDate < today;
      if (!isOverdue) return false;
    }

    // IMPORTANTE: NO aplicar filtro de estado aquí
    // Las vistas de rendimiento necesitan ver TODAS las tareas para comparar correctamente

    return true;
  });

  // Aplicar filtros de tareas madre a performanceTasks
  const performanceTasks = performanceTasksPreFilter.filter(t => {
    // Si showMotherTasks está desactivado (por defecto), ocultar tareas madre
    if (!showMotherTasks && t.isRecurring && !t.parentTaskId) {
      return false; // Ocultar tarea madre
    }

    // Si showMotherTasks está activado y showRecurringOnly está activo, solo mostrar tareas madre
    if (showMotherTasks && showRecurringOnly) {
      return t.isRecurring && !t.parentTaskId; // Solo tareas madre
    }

    // Mostrar todas las tareas (incluidas madres e hijas)
    return true;
  });

  // Filtrar tareas madre según el estado showMotherTasks
  const displayTasks = filteredTasks.filter(t => {
    // Si showMotherTasks está desactivado (por defecto), ocultar tareas madre
    if (!showMotherTasks && t.isRecurring && !t.parentTaskId) {
      return false; // Ocultar tarea madre
    }

    // Si showMotherTasks está activado y showRecurringOnly está activo, solo mostrar tareas madre
    if (showMotherTasks && showRecurringOnly) {
      return t.isRecurring && !t.parentTaskId; // Solo tareas madre
    }

    // Mostrar todas las tareas (incluidas madres e hijas)
    return true;
  });

  const tasksByStatus = {
    todo: displayTasks.filter(t => t.status === 'todo'),
    inprogress: displayTasks.filter(t => t.status === 'inprogress'),
    review: displayTasks.filter(t => t.status === 'review'),
    done: displayTasks.filter(t => t.status === 'done'),
  };

  const tasksByAssignee = visibleUsers.map(user => ({
    user,
    tasks: displayTasks.filter(t => t.assigneeIds?.includes(user.id) || t.assigneeId === user.id)
  }));
  const unassignedTasks = displayTasks.filter(t => !t.assigneeId && (!t.assigneeIds || t.assigneeIds.length === 0));

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#0078D4] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Responsive Logic */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center justify-center flex-1">
            <img src="./logo/logo.png" alt="Right Angle Media Logo" className="h-10 object-contain" />
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Vistas principales */}
          <button
            onClick={() => { setViewMode(ViewMode.DASHBOARD); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.DASHBOARD ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
          >
            <BarChart3 size={18} />
            Dashboard General
          </button>

          <button
            onClick={() => { setViewMode(ViewMode.KANBAN); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.KANBAN ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={18} />
            Tablero Kanban
          </button>

          <button
            onClick={() => { setViewMode(ViewMode.GANTT); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.GANTT ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
          >
            <CalendarRange size={18} />
            Cronograma (Gantt)
          </button>

          <button
            onClick={() => { setViewMode(ViewMode.TABLE); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.TABLE ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={18} />
            Vista de Tabla
          </button>

          {/* Sección Análisis */}
          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => { setViewMode(ViewMode.CLIENT_PERFORMANCE); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.CLIENT_PERFORMANCE ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
            >
              <BarChart3 size={18} />
              Rendimiento Clientes
            </button>

            <button
              onClick={() => { setViewMode(ViewMode.USER_PERFORMANCE); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.USER_PERFORMANCE ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
            >
              <Award size={18} />
              Rendimiento Usuarios
            </button>

            <button
              onClick={() => { setViewMode(ViewMode.FRIDAY_TIME_OFF); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.FRIDAY_TIME_OFF ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
            >
              <Sun size={18} />
              Tardes Libres de Viernes
            </button>

            <button
              onClick={() => { setViewMode(ViewMode.VACATIONS); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.VACATIONS ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
            >
              <Palmtree size={18} />
              Planificador de Vacaciones
            </button>
          </div>

          {/* Submenú Administración */}
          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-ram-grey hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <Settings size={18} />
                <span>Administración</span>
              </div>
              {isAdminMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Submenú items */}
            {isAdminMenuOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                <button
                  onClick={() => { setViewMode(ViewMode.TEAM); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.TEAM ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
                >
                  <UsersIcon size={16} />
                  Equipo
                </button>

                <button
                  onClick={() => { setViewMode(ViewMode.TEAM_MANAGEMENT); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.TEAM_MANAGEMENT ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
                >
                  <UserCog size={16} />
                  Gestión de Equipo
                </button>

                <button
                  onClick={() => { setViewMode(ViewMode.CLIENT_MANAGEMENT); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.CLIENT_MANAGEMENT ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
                >
                  <Building2 size={16} />
                  Gestión de Clientes
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* ... User Footer ... */}
        <div className="p-4 border-t border-gray-100">
          {/* Report Button */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 mb-4">
            <h4 className="font-semibold text-indigo-900 text-sm mb-1">Reporte Diario</h4>
            <p className="text-xs text-indigo-700 mb-3">Genera el reporte de tareas pendientes.</p>
            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingEmail}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {isGeneratingEmail ? (
                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Mail size={14} />
              )}
              Generar Reporte
            </button>
          </div>

          <div className="flex items-center gap-3">
            <img src={currentUser.avatar} alt="User" className="w-9 h-9 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500 truncate">{currentUser.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 p-1"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">

        <div className="flex justify-between items-center px-4 md:px-8 py-5 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>

            <div>
              <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 truncate max-w-[200px] md:max-w-none">
                  {viewMode === ViewMode.DASHBOARD && 'Dashboard General'}
                  {viewMode === ViewMode.KANBAN && 'Tablero'}
                  {viewMode === ViewMode.GANTT && 'Cronograma'}
                  {viewMode === ViewMode.TEAM && 'Equipo'}
                  {viewMode === ViewMode.TABLE && 'Tabla'}
                  {viewMode === ViewMode.TEAM_MANAGEMENT && 'Gestión Equipo'}
                  {viewMode === ViewMode.CLIENT_MANAGEMENT && 'Clientes'}
                  {viewMode === ViewMode.CLIENT_PERFORMANCE && 'Rendimiento Clientes'}
                  {viewMode === ViewMode.USER_PERFORMANCE && 'Rendimiento Usuarios'}
                  {viewMode === ViewMode.FRIDAY_TIME_OFF && 'Tardes Libres'}
                  {viewMode === ViewMode.VACATIONS && 'Planificador de Vacaciones'}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-medium text-sm md:text-base">
                    Hola {currentUser?.name.split(' ')[0]} 👋
                  </span>
                  <button
                    onClick={() => syncDataFromSheets(true)}
                    className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                    title="Actualizar datos"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
              <p className="hidden md:block text-sm text-gray-500 mt-1">
                Mostrando {displayTasks.length} de {displayContextTasks.length} tareas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Alerta de tareas vencidas - Compact on mobile */}
            {(() => {
              const today = getLocalDateString();
              const overdueTasks = filteredTasks.filter(t =>
                t.status !== 'done' && t.dueDate < today
              );
              if (overdueTasks.length > 0) {
                return (
                  <div className="bg-red-50 border border-red-200 px-2 md:px-4 py-1 md:py-2 rounded-lg flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="hidden md:inline text-sm font-medium text-red-700">
                      {overdueTasks.length} tarea{overdueTasks.length > 1 ? 's' : ''} vencida{overdueTasks.length > 1 ? 's' : ''}
                    </span>
                    <span className="md:hidden text-xs font-bold text-red-700">
                      {overdueTasks.length}
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            <button
              onClick={() => setShowNewTaskModal(true)}
              className="bg-ram-blue hover:bg-ram-navy text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Plus size={18} />
              <span className="hidden md:inline">Nueva Tarea</span>
              <span className="md:hidden">Nueva</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8 relative">

          <Filters
            currentUser={currentUser!}
            users={visibleUsers}
            clients={clients}
            selectedStatuses={selectedStatuses}
            selectedPriorities={selectedPriorities}
            selectedAssignees={selectedAssignees}
            selectedClients={selectedClients}
            searchTaskName={searchTaskName}
            dateFrom={dateFrom}
            dateTo={dateTo}
            showOverdueOnly={showOverdueOnly}
            showMotherTasks={showMotherTasks}
            showRecurringOnly={showRecurringOnly}
            onStatusChange={handleStatusFilter}
            onPriorityChange={handlePriorityFilter}
            onAssigneeChange={handleAssigneeFilter}
            onClientChange={handleClientFilter}
            onSearchChange={setSearchTaskName}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onOverdueToggle={setShowOverdueOnly}
            onMotherTasksToggle={setShowMotherTasks}
            onRecurringToggle={setShowRecurringOnly}
            onClearFilters={handleClearFilters}
            onClearFiltersBySection={handleClearFiltersBySection}
          />
          {viewMode === ViewMode.DASHBOARD && (
            <Dashboard
              tasks={displayTasks}
              contextTasks={performanceTasks}
              users={visibleUsers}
              clients={clients}
              currentUser={currentUser!}
            />
          )}

          {/* Indicador de filtro de vencidas */}
          {showOverdueOnly && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-red-500 rounded-full p-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-900">Mostrando solo tareas vencidas</p>
                  <p className="text-xs text-red-700">
                    {selectedAssignees.length > 0
                      ? `Vencidas de: ${selectedAssignees.map(id => users.find(u => u.id === id)?.name.split(' ')[0]).join(', ')}`
                      : 'De todos los usuarios'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOverdueOnly(false)}
                className="text-red-600 hover:text-red-800 text-xs font-medium px-3 py-1 hover:bg-red-100 rounded transition-colors"
              >
                Quitar filtro
              </button>
            </div>
          )}

          {/* Indicador de filtro personal */}
          {selectedAssignees.length === 1 && selectedAssignees[0] === currentUser.id && selectedStatuses.length === 3 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-blue-500 rounded-full p-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Mostrando solo tus tareas activas</p>
                  <p className="text-xs text-blue-700">Tareas finalizadas ocultas. Usa filtros para ver más</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedAssignees([]);
                  setSelectedStatuses([]);
                }}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium px-3 py-1 hover:bg-blue-100 rounded transition-colors"
              >
                Ver todas
              </button>
            </div>
          )}

          {viewMode === ViewMode.KANBAN && (
            <div className="flex gap-6 h-full min-w-[1000px] overflow-x-auto pb-4">
              {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                <div
                  key={status}
                  className="flex-1 min-w-[280px] flex flex-col h-full rounded-xl bg-gray-100/50"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status as Status)}
                >
                  <div className={`p-4 rounded-t-xl border-b border-gray-200/50 flex justify-between items-center ${STATUS_COLORS[status].split(' ')[0]}`}>
                    <h3 className={`font-bold text-sm ${STATUS_COLORS[status].split(' ')[1]}`}>
                      {STATUS_LABELS[status]}
                    </h3>
                    <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold text-gray-600">
                      {statusTasks.length}
                    </span>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {statusTasks.map(task => (
                      <div key={task.id} className="relative group">
                        <TaskCard
                          task={task}
                          users={users}
                          onDragStart={handleDragStart}
                        />
                        <div className="absolute top-2 right-2 hidden group-hover:flex gap-1 z-10">
                          <button
                            onClick={() => setEditingTask(task)}
                            className="bg-white p-1 rounded shadow hover:bg-blue-50"
                          >
                            <Edit size={14} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="bg-white p-1 rounded shadow hover:bg-red-50"
                          >
                            <Trash2 size={14} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {statusTasks.length === 0 && (
                      <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                        {selectedStatuses.length > 0 || selectedPriorities.length > 0 ? 'Sin tareas con estos filtros' : 'Arrastra tareas aquí'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === ViewMode.GANTT && (
            <GanttView
              tasks={displayTasks}
              users={users}
              onEdit={setEditingTask}
              onDelete={handleDeleteTask}
            />
          )}

          {viewMode === ViewMode.TEAM && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasksByAssignee.map(({ user, tasks }) => (
                <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                    <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt={user.name} />
                    <div>
                      <h3 className="font-bold text-gray-800">{user.name}</h3>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                    <div className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                      {tasks.length} tareas
                    </div>
                  </div>
                  <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                    {tasks.length > 0 ? tasks.map(task => (
                      <div key={task.id} className="flex items-start gap-2 text-sm border-l-2 border-blue-500 pl-3 py-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-gray-800 line-clamp-1">{task.title}</p>
                            {task.isRecurring && !task.parentTaskId && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-300 rounded-full text-[10px] font-bold text-purple-700 shadow-sm flex-shrink-0">
                                <span className="text-[8px]">🔄</span>
                                M
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${task.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>{STATUS_LABELS[task.status]}</span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-gray-400 italic text-center py-4">Sin tareas asignadas</p>
                    )}
                  </div>
                </div>
              ))}

              {unassignedTasks.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden border-dashed border-gray-300">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <UsersIcon className="text-gray-500" size={20} />
                    </div>
                    <h3 className="font-bold text-gray-600">Sin Asignar</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {unassignedTasks.map(task => (
                      <div key={task.id} className="opacity-75">
                        <p className="font-medium text-gray-800 text-sm">{task.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === ViewMode.TEAM_MANAGEMENT && (
            <TeamManagement
              users={users}
              currentUser={currentUser!}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {viewMode === ViewMode.CLIENT_MANAGEMENT && (
            <ClientManagement
              clients={clients}
              onCreateClient={handleCreateClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {viewMode === ViewMode.TABLE && (
            <TableView
              tasks={displayTasks}
              users={visibleUsers}
              clients={clients}
              onEditTask={(task) => setEditingTask(task)}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {viewMode === ViewMode.CLIENT_PERFORMANCE && (
            <ClientPerformance
              tasks={performanceTasks}
              clients={clients}
              currentUser={currentUser!}
            />
          )}

          {viewMode === ViewMode.USER_PERFORMANCE && (
            <UserPerformance
              tasks={performanceTasks}
              users={visibleUsers}
              currentUser={currentUser!}
            />
          )}

          {viewMode === ViewMode.FRIDAY_TIME_OFF && (
            <FridayTimeOff
              users={visibleUsers}
              currentUser={currentUser}
              fridayTimeOffs={fridayTimeOffs}
              holidays={holidays}
              onCreateTimeOff={handleCreateFridayTimeOff}
              onUpdateTimeOff={handleUpdateFridayTimeOff}
              onDeleteTimeOff={handleDeleteFridayTimeOff}
              onCreateHoliday={handleCreateHoliday}
              onDeleteHoliday={handleDeleteHoliday}
            />
          )}

          {viewMode === ViewMode.VACATIONS && (
            <VacationPlanner
              users={visibleUsers}
              currentUser={currentUser}
              vacations={vacations}
              holidays={holidays}
              onCreateVacation={handleCreateVacation}
              onDeleteVacation={handleDeleteVacation}
              onUpdateVacation={handleUpdateVacation}
            />
          )}

          {/* Footer con copyright */}
          <div className="mt-auto pt-8 pb-4 px-4 text-center border-t border-gray-200">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Desarrollado por Analítica RAM
            </p>
          </div>

        </div>

        {emailDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Reporte Diario de Tareas</h2>
                    <p className="text-sm text-gray-500">Tráfico Analítica RAM</p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailDraft(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                {emailDraft}
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-2xl">
                <button
                  onClick={() => setEmailDraft(null)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <a
                  href={`mailto:team@analytics.com?subject=Reporte Diario - Analytics&body=${encodeURIComponent(emailDraft)}`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
                >
                  <Mail size={18} />
                  Abrir en Correo
                </a>
              </div>
            </div>
          </div>
        )}

        {(showNewTaskModal || editingTask) && (
          <TaskModal
            task={editingTask}
            users={users}
            clients={clients}
            onSave={editingTask ? handleUpdateTask : handleCreateTask}
            onCreateClient={handleCreateClient}
            onClose={() => {
              setShowNewTaskModal(false);
              setEditingTask(null);
            }}
          />
        )}

      </main>

      {/* Modal de Celebración */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl shadow-2xl p-8 max-w-md text-center transform transition-all duration-500 scale-100 animate-in">
            {/* Confetti effect */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
              <div className="absolute top-10 right-1/4 w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
              <div className="absolute top-5 left-3/4 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
              <div className="absolute top-20 left-1/2 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.6s' }}></div>
            </div>

            {/* Content */}
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-bold text-green-800 mb-2">¡Felicidades!</h2>
            <p className="text-lg text-green-700 mb-3">Tarea completada:</p>
            <p className="text-xl font-semibold text-gray-800 mb-4 px-4 py-2 bg-white/60 rounded-lg">
              {completedTaskTitle}
            </p>
            <p className="text-sm text-green-600 font-medium">¡Sigue así, excelente trabajo! 💪</p>

            {/* Animated checkmark */}
            <div className="mt-6 inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Notificaciones - Feedback instantáneo */}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
};

const TaskModal: React.FC<{
  task?: Task | null;
  users: User[];
  clients: Client[];
  onSave: (task: any) => void;
  onCreateClient: (client: Client) => Promise<void>;
  onClose: () => void;
}> = ({ task, users, clients, onSave, onCreateClient, onClose }) => {
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assigneeIds: task?.assigneeIds || [],
    clientId: task?.clientId || null,
    startDate: getLocalDateString(task?.startDate),
    dueDate: task?.dueDate ? getLocalDateString(task.dueDate) : '',
    tags: task?.tags?.join(', ') || '',

    // Recurrencia
    isRecurring: task?.isRecurring || false,
    recurrenceFrequency: (task?.recurrence?.frequency as any) || 'weekly',
    recurrenceDays: task?.recurrence?.daysOfWeek || [],
    recurrenceDayOfMonth: task?.recurrence?.dayOfMonth || 1,
    recurrenceEndDate: task?.recurrence?.endDate || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.clientId) {
      alert('Por favor selecciona un cliente');
      return;
    }

    if (formData.assigneeIds.length === 0) {
      alert('Por favor selecciona al menos un responsable');
      return;
    }

    if (!formData.dueDate && !formData.isRecurring) {
      alert('Por favor selecciona una fecha de vencimiento');
      return;
    }

    const taskData: any = {
      ...task,
      ...formData,
      assigneeId: formData.assigneeIds[0] || null,
      startDate: getLocalDateString(formData.startDate),
      dueDate: getLocalDateString(formData.dueDate),
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    // Agregar recurrencia si está marcada
    if (formData.isRecurring) {
      const dayMap: Record<DayOfWeek, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6
      };

      const daysNumbers = formData.recurrenceDays.map(d => dayMap[d]);

      taskData.isRecurring = true;
      taskData.recurrence = {
        enabled: true,
        frequency: formData.recurrenceFrequency,
        days: daysNumbers,
        daysOfWeek: formData.recurrenceDays,
        dayOfMonth: formData.recurrenceDayOfMonth, // Para mensual
        endDate: formData.recurrenceEndDate
      };
    } else {
      taskData.isRecurring = false;
      taskData.recurrence = null;
    }

    console.log('📤 Enviando tarea:', taskData);
    onSave(taskData);
  };

  const toggleAssignee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(userId)
        ? prev.assigneeIds.filter(id => id !== userId)
        : [...prev.assigneeIds, userId]
    }));
  };

  const toggleRecurrenceDay = (day: DayOfWeek) => {
    setFormData(prev => ({
      ...prev,
      recurrenceDays: prev.recurrenceDays.includes(day)
        ? prev.recurrenceDays.filter(d => d !== day)
        : [...prev.recurrenceDays, day]
    }));
  };

  const handleCreateNewClient = async () => {
    if (!newClientName.trim()) {
      alert('Por favor ingresa un nombre para el cliente');
      return;
    }

    const newClient: Client = {
      id: `client-${Date.now()}`,
      name: newClientName.trim()
    };

    await onCreateClient(newClient);
    setFormData({ ...formData, clientId: newClient.id });
    setNewClientName('');
    setIsCreatingClient(false);
  };

  const dayLabels: Record<DayOfWeek, string> = {
    monday: 'L',
    tuesday: 'M',
    wednesday: 'X',
    thursday: 'J',
    friday: 'V',
    saturday: 'S',
    sunday: 'D'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{task ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Título de la tarea"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              placeholder="Descripción de la tarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Client - Required with inline creation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente <span className="text-red-500">*</span>
            </label>

            {!isCreatingClient ? (
              <div className="flex gap-2">
                <select
                  value={formData.clientId || ''}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value || null })}
                  className="flex-1 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus size={18} />
                  Nuevo
                </button>
              </div>
            ) : (
              <div className="border-2 border-green-500 rounded-lg p-3 bg-green-50">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Nombre del nuevo cliente
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ej: Empresa XYZ"
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateNewClient}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                  >
                    Guardar Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingClient(false);
                      setNewClientName('');
                    }}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Assignees - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsables <span className="text-red-500">*</span> ({formData.assigneeIds.length} seleccionados)
            </label>
            <div className="border rounded p-3 space-y-2 max-h-40 overflow-y-auto">
              {users.map(user => (
                <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={formData.assigneeIds.includes(user.id)}
                    onChange={() => toggleAssignee(user.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <img src={user.avatar} className="w-6 h-6 rounded-full" alt={user.name} />
                  <span className="text-sm text-gray-700">{user.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* RECURRING CHECKBOX - Moved here before dates */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-medium text-gray-900">Tarea Recurrente</span>
              </div>
            </label>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {formData.isRecurring ? 'Vencimiento tarea individual' : 'Fecha vencimiento'}
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required={!formData.isRecurring}
                disabled={formData.isRecurring}
              />
              {formData.isRecurring && (
                <p className="text-xs text-gray-500 mt-1">
                  Se usa "Fin Recurrencia" abajo
                </p>
              )}
            </div>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="todo">Por Hacer</option>
                <option value="inprogress">En Progreso</option>
                <option value="review">En Revisión</option>
                <option value="done">Finalizado</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              placeholder="Tags (separados por coma)"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* RECURRING CONFIG - Only shown if recurring is enabled */}
          {formData.isRecurring && (
            <div className="mt-4 ml-7 space-y-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">

              {/* Frecuencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia</label>
                <select
                  value={formData.recurrenceFrequency}
                  onChange={(e) => setFormData({ ...formData, recurrenceFrequency: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>

              {/* Días de la semana (solo si es semanal) */}
              {formData.recurrenceFrequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Días de la semana
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleRecurrenceDay(day)}
                        className={`w-10 h-10 rounded-full font-medium text-sm transition-colors ${formData.recurrenceDays.includes(day)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {dayLabels[day]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Día del mes (solo si es mensual) */}
              {formData.recurrenceFrequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Día del mes
                  </label>
                  <select
                    value={formData.recurrenceDayOfMonth}
                    onChange={(e) => setFormData({ ...formData, recurrenceDayOfMonth: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>Día {day}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fecha final */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fin Recurrencia (Última fecha)
                </label>
                <input
                  type="date"
                  value={formData.recurrenceEndDate}
                  onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min={formData.startDate}
                  required={formData.isRecurring}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se crearán tareas hasta esta fecha
                </p>
              </div>

              <div className="text-xs text-indigo-700 bg-indigo-100 p-3 rounded">
                <strong>💡 Cómo funciona:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Se guardará la tarea madre (plantilla)</li>
                  <li>• Si hoy cumple la frecuencia, se crea tarea para hoy</li>
                  <li>• Cada día se crean automáticamente tareas nuevas</li>
                </ul>
              </div>
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save size={18} />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
