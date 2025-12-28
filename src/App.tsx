import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { TaskCard } from './components/TaskCard';
import { GanttView } from './components/GanttView';
import { Filters } from './components/Filters';
import { TeamManagement } from './components/TeamManagement';
import { ClientManagement } from './components/ClientManagement';
import { TableView } from './components/TableView';
import { User, Task, Status, ViewMode, Priority, Client, DayOfWeek } from './types';
import { MOCK_USERS, MOCK_CLIENTS, STATUS_LABELS, STATUS_COLORS } from './constants';
import { generateDailyReport } from './services/geminiService';
import { sheetsService } from './services/sheetsService';
import {
  LayoutDashboard,
  CalendarRange,
  Users as UsersIcon,
  Plus,
  Sparkles,
  LogOut,
  Mail,
  UserCog,
  X,
  Edit,
  Trash2,
  Save,
  Building2
} from 'lucide-react';

// Helper para obtener fecha local en formato YYYY-MM-DD SIEMPRE en UTC-5 (Ecuador)
const getLocalDateString = (date?: Date | string | null): string => {
  let d: Date;

  if (!date) {
    d = new Date();
  } else if (typeof date === 'string') {
    // Si ya es YYYY-MM-DD, devolverlo tal cual
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Si tiene hora, extraer solo la fecha
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    d = new Date(date);
  } else {
    d = date;
  }

  // Convertir a UTC-5 (Ecuador)
  const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000); // UTC
  const ecuadorTime = new Date(utcTime - (5 * 3600000)); // UTC-5

  const year = ecuadorTime.getUTCFullYear();
  const month = String(ecuadorTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ecuadorTime.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const INITIAL_TASKS: Task[] = [];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.KANBAN);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedTaskTitle, setCompletedTaskTitle] = useState('');

  // Filtros
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [searchTaskName, setSearchTaskName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showRecurringOnly, setShowRecurringOnly] = useState(false);

  // Función para manejar login y auto-seleccionar el usuario en filtros
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Auto-seleccionar el usuario logueado en el filtro de responsables
    // Si es Analyst, es OBLIGATORIO que esté seleccionado él mismo
    if (user.role === 'Analyst') {
      setSelectedAssignees([user.id]);
    } else {
      // Admin ve a todos por defecto (vacío = todos)
      setSelectedAssignees([user.id]);
    }
    // Excluir tareas finalizadas por defecto
    setSelectedStatuses(['todo', 'inprogress', 'review']);
  };

  // Función para manejar logout y limpiar filtros
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

    // Polling cada 10 segundos para sincronizar cambios de otros usuarios
    const interval = setInterval(() => {
      syncDataFromSheets();
    }, 10000);

    // Verificar cada hora si hay que generar nuevas tareas hijas
    const dailyCheck = setInterval(async () => {
      console.log('⏰ Verificación horaria de tareas recurrentes');
      const newChildren = await generateDailyChildTasks(tasks);
      if (newChildren.length > 0) {
        const allTasks = [...tasks, ...newChildren];
        setTasks(allTasks);
        localStorage.setItem('tasks', JSON.stringify(allTasks));
        newChildren.forEach(child => {
          sheetsService.saveTaskIncremental('create', child);
        });
      }
    }, 3600000); // 1 hora

    return () => {
      clearInterval(interval);
      clearInterval(dailyCheck);
    };
  }, []);

  const syncDataFromSheets = async () => {
    try {
      const [loadedTasks, loadedUsers, loadedClients] = await Promise.all([
        sheetsService.getTasks(),
        sheetsService.getUsers(),
        sheetsService.getClients()
      ]);

      // Solo actualizar si hay datos nuevos
      if (loadedTasks.length > 0) {
        setTasks(prevTasks => {
          const hasChanges = JSON.stringify(prevTasks) !== JSON.stringify(loadedTasks);
          return hasChanges ? loadedTasks.map(t => ({
            ...t,
            assigneeIds: t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []),
            clientId: t.clientId || null
          })) : prevTasks;
        });
      }

      if (loadedUsers.length > 0) {
        setUsers(prevUsers => {
          const hasChanges = JSON.stringify(prevUsers) !== JSON.stringify(loadedUsers);
          return hasChanges ? loadedUsers : prevUsers;
        });
      }

      if (loadedClients.length > 0) {
        setClients(prevClients => {
          const hasChanges = JSON.stringify(prevClients) !== JSON.stringify(loadedClients);
          return hasChanges ? loadedClients : prevClients;
        });
      }
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  };

  const loadData = async () => {
    try {
      const [loadedTasks, loadedUsers, loadedClients] = await Promise.all([
        sheetsService.getTasks(),
        sheetsService.getUsers(),
        sheetsService.getClients()
      ]);

      if (loadedUsers.length > 0) {
        setUsers(loadedUsers);
      }

      if (loadedClients.length > 0) {
        setClients(loadedClients);
      }

      if (loadedTasks.length > 0) {
        const tasksWithAssigneeIds = loadedTasks.map(t => ({
          ...t,
          assigneeIds: t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []),
          clientId: t.clientId || null
        }));

        // Generar tareas hijas para HOY (proceso diario)
        const newChildTasks = await generateDailyChildTasks(tasksWithAssigneeIds);

        const allTasks = [...tasksWithAssigneeIds, ...newChildTasks];
        setTasks(allTasks);

        // Guardar nuevas tareas hijas en Sheets
        if (newChildTasks.length > 0) {
          newChildTasks.forEach(childTask => {
            sheetsService.saveTaskIncremental('create', childTask);
          });
        }
      } else {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
          const parsed = JSON.parse(savedTasks);
          const newChildTasks = await generateDailyChildTasks(parsed);
          const allTasks = [...parsed, ...newChildTasks];
          setTasks(allTasks);
          localStorage.setItem('tasks', JSON.stringify(allTasks));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        setTasks(parsed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generar tareas hijas para HOY (proceso diario)
  const generateDailyChildTasks = async (allTasks: Task[]): Promise<Task[]> => {
    const today = getLocalDateString(); // Fecha local, no UTC
    const todayDate = new Date(today);

    console.log('🌅 Proceso diario: Generando tareas para', today);

    // Filtrar solo tareas madre activas
    const motherTasks = allTasks.filter(t => t.isRecurring && !t.parentTaskId);

    const newChildTasks: Task[] = [];

    for (const mother of motherTasks) {
      if (!mother.recurrence) continue;

      const startDate = new Date(mother.startDate);
      const endDate = new Date(mother.recurrence.endDate || mother.dueDate);

      // Verificar si hoy está en el rango
      if (todayDate < startDate || todayDate > endDate) continue;

      // Verificar si debe crear tarea hoy
      const shouldCreate = checkIfShouldCreateTask(today, mother.recurrence);

      if (!shouldCreate) {
        console.log(`  ⏭️ "${mother.title}" - Hoy no coincide`);
        continue;
      }

      // Verificar si ya existe tarea hija para hoy
      const existsToday = allTasks.some(t =>
        t.parentTaskId === mother.id &&
        t.startDate === today
      );

      if (existsToday) {
        console.log(`  ℹ️ "${mother.title}" - Ya existe tarea para hoy`);
        continue;
      }

      // Crear tarea hija
      console.log(`  ✅ Creando tarea hija para "${mother.title}"`);

      const childTask: Task = {
        id: `t${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `${mother.title} (${today})`,
        description: mother.description,
        status: 'todo',
        priority: mother.priority,
        assigneeId: mother.assigneeId,
        assigneeIds: mother.assigneeIds,
        clientId: mother.clientId,
        startDate: today,
        dueDate: today,
        tags: mother.tags,
        completedDate: null,
        isRecurring: false,
        recurrence: undefined,
        instances: [],
        parentTaskId: mother.id
      };

      newChildTasks.push(childTask);
    }

    if (newChildTasks.length > 0) {
      console.log(`✅ ${newChildTasks.length} tareas hijas creadas para hoy`);
    } else {
      console.log('ℹ️ No se crearon tareas nuevas hoy');
    }

    return newChildTasks;
  };

  // LEGACY: Guardado completo (mantener por compatibilidad)
  const saveTasks = async (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('tasks', JSON.stringify(newTasks));
    await sheetsService.saveTasks(newTasks);
  };

  const handleCreateUser = async (user: User) => {
    const newUsers = [...users, user];
    setUsers(newUsers);
    localStorage.setItem('users', JSON.stringify(newUsers));
    await sheetsService.saveUserIncremental('create', user);
  };

  const handleUpdateUser = async (user: User) => {
    const newUsers = users.map(u => u.id === user.id ? user : u);
    setUsers(newUsers);
    localStorage.setItem('users', JSON.stringify(newUsers));
    await sheetsService.saveUserIncremental('update', user);
  };

  const handleDeleteUser = async (userId: string) => {
    const newUsers = users.filter(u => u.id !== userId);
    setUsers(newUsers);
    localStorage.setItem('users', JSON.stringify(newUsers));
    await sheetsService.saveUserIncremental('delete', { id: userId });
  };

  const handleCreateClient = async (client: Client) => {
    const newClients = [...clients, client];
    setClients(newClients);
    localStorage.setItem('clients', JSON.stringify(newClients));
    await sheetsService.saveClientIncremental('create', client);
  };

  const handleUpdateClient = async (client: Client) => {
    const newClients = clients.map(c => c.id === client.id ? client : c);
    setClients(newClients);
    localStorage.setItem('clients', JSON.stringify(newClients));
    await sheetsService.saveClientIncremental('update', client);
  };

  const handleDeleteClient = async (clientId: string) => {
    const newClients = clients.filter(c => c.id !== clientId);
    setClients(newClients);
    localStorage.setItem('clients', JSON.stringify(newClients));
    await sheetsService.saveClientIncremental('delete', { id: clientId });
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
          const today = new Date().toISOString().split('T')[0];
          taskWithNewStatus.completedDate = today;
        }

        // Si se desmarca como completada, limpiar fecha
        if (updatedTask.status === 'done' && status !== 'done') {
          taskWithNewStatus.completedDate = null;
        }

        const newTasks = tasks.map(t => t.id === draggingId ? taskWithNewStatus : t);
        setTasks(newTasks);
        localStorage.setItem('tasks', JSON.stringify(newTasks));
        sheetsService.saveTaskIncremental('update', taskWithNewStatus);

        // Mostrar celebración si se completó
        if (wasCompleted) {
          setCompletedTaskTitle(taskWithNewStatus.title);
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 4000);
        }
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
    console.log('📝 Creando tarea con datos:', taskData);

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
      console.log('🔄 Normalizado days a daysOfWeek:', normalizedRecurrence.daysOfWeek);
    }

    if (normalizedRecurrence && normalizedRecurrence.enabled === undefined) {
      normalizedRecurrence.enabled = true;
      console.log('🔧 Agregado enabled=true a recurrence');
    }

    // Crear tarea MADRE
    const motherTask: Task = {
      id: `t${Date.now()}`,
      title: taskData.title || '',
      description: taskData.description || '',
      status: 'todo', // La madre siempre empieza en todo
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

    console.log('👩 Tarea madre creada:', motherTask);

    let newTasks = [motherTask];

    // Si es recurrente Y hoy es un día válido, crear tarea HIJA para HOY
    if (motherTask.isRecurring && motherTask.recurrence) {
      const today = getLocalDateString(); // Fecha local
      const startDate = new Date(motherTask.startDate);
      const endDate = new Date(motherTask.recurrence.endDate || motherTask.dueDate);
      const todayDate = new Date(today);

      console.log('📅 Verificando si crear tarea para hoy:', {
        today,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      if (todayDate >= startDate && todayDate <= endDate) {
        const shouldCreateToday = checkIfShouldCreateTask(today, motherTask.recurrence);

        if (shouldCreateToday) {
          console.log('✅ Creando tarea hija para HOY');
          const childTask: Task = {
            id: `t${Date.now()}_child_${today}`,
            title: `${motherTask.title} (${today})`,
            description: motherTask.description,
            status: 'todo',
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
          console.log('👶 Tarea hija creada:', childTask);
        } else {
          console.log('⏭️ HOY no es un día válido para esta recurrencia');
        }
      }
    }

    const allTasks = [...tasks, ...newTasks];
    setTasks(allTasks);
    localStorage.setItem('tasks', JSON.stringify(allTasks));

    // Guardar todas en Sheets
    newTasks.forEach(task => {
      sheetsService.saveTaskIncremental('create', task);
    });

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

    console.log('🔍 checkIfShouldCreateTask:', {
      fecha: dateString,
      dayOfWeek,
      dayOfMonth,
      frequency: recurrence.frequency,
      daysOfWeek: recurrence.daysOfWeek,
      days: recurrence.days
    });

    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    };

    if (recurrence.frequency === 'daily') {
      console.log('  ✅ Diaria - siempre true');
      return true;
    }

    if (recurrence.frequency === 'weekly') {
      // Intentar primero con daysOfWeek
      let targetDays = recurrence.daysOfWeek?.map((d: string) => dayMap[d]) || [];

      // Si no hay daysOfWeek pero hay days, usar days directamente
      if (targetDays.length === 0 && recurrence.days) {
        targetDays = recurrence.days;
        console.log('  🔄 Usando days directamente:', targetDays);
      }

      console.log('  🎯 Días objetivo:', targetDays);
      console.log('  📅 Hoy es día:', dayOfWeek);

      const resultado = targetDays.includes(dayOfWeek);
      console.log(`  ${resultado ? '✅' : '❌'} Resultado:`, resultado);

      return resultado;
    }

    if (recurrence.frequency === 'monthly') {
      const targetDay = recurrence.dayOfMonth || 1;
      const resultado = dayOfMonth === targetDay;
      console.log(`  ${resultado ? '✅' : '❌'} Mensual - Día objetivo: ${targetDay}, Hoy: ${dayOfMonth}`);
      return resultado;
    }

    console.log('  ❌ Frecuencia no reconocida');
    return false;
  };

  const handleUpdateTask = (taskData: Task) => {
    // Detectar si la tarea pasó a "done"
    const oldTask = tasks.find(t => t.id === taskData.id);
    const wasCompleted = oldTask && oldTask.status !== 'done' && taskData.status === 'done';

    // Si se completó ahora, agregar fecha de finalización
    if (wasCompleted) {
      const today = new Date().toISOString().split('T')[0];
      taskData.completedDate = today;
    }

    // Si se desmarca como completada, limpiar fecha
    if (oldTask && oldTask.status === 'done' && taskData.status !== 'done') {
      taskData.completedDate = null;
    }

    const newTasks = tasks.map(t => t.id === taskData.id ? taskData : t);
    setTasks(newTasks);
    localStorage.setItem('tasks', JSON.stringify(newTasks));
    sheetsService.saveTaskIncremental('update', taskData);
    setEditingTask(null);

    // Mostrar celebración si se completó
    if (wasCompleted) {
      setCompletedTaskTitle(taskData.title);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4000);
    }
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

      // Filtrar todas las tareas a eliminar
      const idsToDelete = tasksToDelete.map(t => t.id);
      const newTasks = tasks.filter(t => !idsToDelete.includes(t.id));

      setTasks(newTasks);
      localStorage.setItem('tasks', JSON.stringify(newTasks));

      // Eliminar de Sheets
      tasksToDelete.forEach(t => {
        sheetsService.saveTaskIncremental('delete', t);
      });

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
    setShowRecurringOnly(false);
  };

  // Aplicar filtros
  const filteredTasks = tasks.filter(task => {
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
      const today = new Date().toISOString().split('T')[0];
      const isOverdue = task.status !== 'done' && task.dueDate < today;
      if (!isOverdue) return false;
    }

    // Filtro de tareas madre
    if (showRecurringOnly && !task.isRecurring) {
      return false;
    }

    return true;
  });

  // Filtrar tareas madre (solo mostrar tareas hijas individuales en Kanban)
  const displayTasks = filteredTasks.filter(t => !t.isRecurring || t.parentTaskId);

  const tasksByStatus = {
    todo: displayTasks.filter(t => t.status === 'todo'),
    inprogress: displayTasks.filter(t => t.status === 'inprogress'),
    review: displayTasks.filter(t => t.status === 'review'),
    done: displayTasks.filter(t => t.status === 'done'),
  };

  const tasksByAssignee = users.map(user => ({
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
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">

      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex z-10">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-center">
            <img src="https://rangle.ec/img/ram.webp" alt="RAM Logo" className="h-10 object-contain" />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setViewMode(ViewMode.KANBAN)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.KANBAN ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={18} />
            Tablero Kanban
          </button>

          <button
            onClick={() => setViewMode(ViewMode.GANTT)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.GANTT ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
          >
            <CalendarRange size={18} />
            Cronograma (Gantt)
          </button>



          <button
            onClick={() => setViewMode(ViewMode.TABLE)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.TABLE ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={18} />
            Vista de Tabla
          </button>

          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => setViewMode(ViewMode.TEAM)} /* Team View Mode for Cards */
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.TEAM ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
            >
              <UsersIcon size={18} />
              Equipo
            </button>

            <button
              onClick={() => setViewMode(ViewMode.TEAM_MANAGEMENT)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.TEAM_MANAGEMENT ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
            >
              <UserCog size={18} />
              Gestión de Equipo
            </button>

            <button
              onClick={() => setViewMode(ViewMode.CLIENT_MANAGEMENT)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === ViewMode.CLIENT_MANAGEMENT ? 'bg-ram-cream text-ram-navy font-bold' : 'text-ram-grey hover:bg-gray-50'}`}
            >
              <Building2 size={18} />
              Gestión de Clientes
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
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
        </div>

        <div className="p-4 flex items-center gap-3 border-t border-gray-100">
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
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

        <div className="flex justify-between items-center px-8 py-5 bg-white border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {viewMode === ViewMode.KANBAN && 'Tablero de Tareas'}
              {viewMode === ViewMode.GANTT && 'Cronograma General'}
              {viewMode === ViewMode.TEAM && 'Carga de Trabajo del Equipo'}
              {viewMode === ViewMode.TABLE && 'Vista de Tabla'}
              {viewMode === ViewMode.TEAM_MANAGEMENT && 'Gestión de Equipo'}
              {viewMode === ViewMode.CLIENT_MANAGEMENT && 'Gestión de Clientes'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Mostrando {filteredTasks.length} de {tasks.length} tareas
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Alerta de tareas vencidas */}
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const overdueTasks = filteredTasks.filter(t =>
                t.status !== 'done' && t.dueDate < today
              );
              if (overdueTasks.length > 0) {
                return (
                  <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-lg flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-red-700">
                      {overdueTasks.length} tarea{overdueTasks.length > 1 ? 's' : ''} vencida{overdueTasks.length > 1 ? 's' : ''}
                    </span>
                  </div>
                );
              }
              return null;
            })()}
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="bg-[#0078D4] hover:bg-[#006cbd] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <Plus size={18} />
              Nueva Tarea
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8 relative">

          <Filters
            currentUser={currentUser!}
            users={users}
            clients={clients}
            selectedStatuses={selectedStatuses}
            selectedPriorities={selectedPriorities}
            selectedAssignees={selectedAssignees}
            selectedClients={selectedClients}
            searchTaskName={searchTaskName}
            dateFrom={dateFrom}
            dateTo={dateTo}
            showOverdueOnly={showOverdueOnly}
            showRecurringOnly={showRecurringOnly}
            onStatusChange={handleStatusFilter}
            onPriorityChange={handlePriorityFilter}
            onAssigneeChange={handleAssigneeFilter}
            onClientChange={handleClientFilter}
            onSearchChange={setSearchTaskName}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onOverdueToggle={setShowOverdueOnly}
            onRecurringToggle={setShowRecurringOnly}
            onClearFilters={handleClearFilters}
          />

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
              tasks={filteredTasks}
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
                          <p className="font-medium text-gray-800 line-clamp-1">{task.title}</p>
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
              tasks={filteredTasks}
              users={users}
              clients={clients}
              onEditTask={(task) => setEditingTask(task)}
              onDeleteTask={handleDeleteTask}
            />
          )}

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
    </div>
  );
};

const TaskModal: React.FC<{
  task?: Task | null;
  users: User[];
  clients: Client[];
  onSave: (task: any) => void;
  onClose: () => void;
}> = ({ task, users, clients, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assigneeIds: task?.assigneeIds || [],
    clientId: task?.clientId || null,
    startDate: getLocalDateString(task?.startDate),
    dueDate: getLocalDateString(task?.dueDate || new Date(Date.now() + 86400000 * 7)),
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
          <input
            type="text"
            placeholder="Título"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          />

          <textarea
            placeholder="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
              className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="todo">Por Hacer</option>
              <option value="inprogress">En Progreso</option>
              <option value="review">En Revisión</option>
              <option value="done">Finalizado</option>
            </select>

            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
              className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>

          <select
            value={formData.clientId || ''}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value || null })}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin cliente</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsables ({formData.assigneeIds.length} seleccionados)
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha inicio
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

          <input
            type="text"
            placeholder="Tags (separados por coma)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          />

          {/* RECURRENCIA */}
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
          </div>

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
