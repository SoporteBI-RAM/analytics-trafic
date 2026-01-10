import { Task, TaskInstance, DayOfWeek, RecurrenceFrequency } from '../types';
import { getLocalDateString } from './dateUtils';

const dayMap: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

/**
 * Genera todas las instancias de una tarea recurrente
 */
export function generateRecurringInstances(task: Task): TaskInstance[] {
  console.log('🔧 generateRecurringInstances llamada con:', task);

  if (!task.isRecurring || !task.recurrence || !task.recurrence.enabled) {
    console.log('❌ No es recurrente o no está habilitada');
    return [];
  }

  const { frequency, daysOfWeek, interval, endDate } = task.recurrence;
  const instances: TaskInstance[] = [];

  const start = new Date(task.startDate);
  const end = new Date(endDate);

  console.log('📅 Rango de fechas:', {
    start: getLocalDateString(start),
    end: getLocalDateString(end),
    frequency,
    daysOfWeek,
    interval
  });

  if (frequency === 'daily') {
    let current = new Date(start);
    while (current <= end) {
      instances.push({
        instanceDate: getLocalDateString(current),
        status: 'todo',
        completedDate: null
      });
      current.setDate(current.getDate() + interval);
    }
  } else if (frequency === 'weekly') {
    const targetDays = daysOfWeek.map(d => dayMap[d]);
    console.log('🎯 Días objetivo (números 0-6):', targetDays);

    let current = new Date(start);
    let iteraciones = 0;

    while (current <= end) {
      const currentDay = current.getDay();
      console.log(`  Día ${iteraciones}: ${getLocalDateString(current)} (día ${currentDay})`);

      if (targetDays.includes(currentDay)) {
        console.log(`    ✅ Coincide! Agregando instancia`);
        instances.push({
          instanceDate: getLocalDateString(current),
          status: 'todo',
          completedDate: null
        });
      }
      current.setDate(current.getDate() + 1);
      iteraciones++;

      // Seguridad para evitar loops infinitos
      if (iteraciones > 100) {
        console.error('❌ Loop infinito detectado, saliendo...');
        break;
      }
    }
  } else if (frequency === 'monthly') {
    let current = new Date(start);
    while (current <= end) {
      instances.push({
        instanceDate: getLocalDateString(current),
        status: 'todo',
        completedDate: null
      });
      current.setMonth(current.getMonth() + interval);
    }
  }

  console.log(`✅ Total generado: ${instances.length} instancias`);
  return instances;
}

/**
 * Obtiene las instancias que deben mostrarse:
 * - La instancia actual (si hoy es un día de recurrencia)
 * - Todas las instancias pendientes (pasadas que no se completaron)
 */
export function getVisibleInstances(task: Task): TaskInstance[] {
  if (!task.instances || task.instances.length === 0) return [];

  const today = getLocalDateString();

  return task.instances.filter(instance => {
    // Si está completada, no mostrar
    if (instance.status === 'done') return false;

    // Mostrar si es hoy o anterior y está pendiente
    return instance.instanceDate <= today;
  });
}

/**
 * Obtiene la instancia actual (la de hoy o la más reciente pendiente)
 */
export function getCurrentInstance(task: Task): TaskInstance | null {
  if (!task.instances || task.instances.length === 0) return null;

  const today = getLocalDateString();

  // Buscar instancia de hoy
  const todayInstance = task.instances.find(i => i.instanceDate === today);
  if (todayInstance) return todayInstance;

  // Si no hay de hoy, retornar la más reciente pendiente
  const pendingInstances = task.instances
    .filter(i => i.status !== 'done' && i.instanceDate <= today)
    .sort((a, b) => b.instanceDate.localeCompare(a.instanceDate));

  return pendingInstances[0] || null;
}

/**
 * Convierte tareas recurrentes en tareas "expandidas" para mostrar en la UI
 * Cada instancia visible se muestra como una tarea separada
 */
export function expandRecurringTasks(tasks: Task[]): Task[] {
  console.log('🔍 expandRecurringTasks - Total tareas:', tasks.length);
  const expanded: Task[] = [];

  for (const task of tasks) {
    if (!task.isRecurring || !task.instances) {
      // Tarea normal, agregar tal cual
      expanded.push(task);
      continue;
    }

    console.log(`🔄 Procesando tarea recurrente: "${task.title}"`);
    console.log(`  📦 Total instancias en tarea:`, task.instances?.length);

    // Tarea recurrente: agregar instancias visibles
    const visibleInstances = getVisibleInstances(task);
    console.log(`  👁️ Instancias visibles:`, visibleInstances.length);
    console.log(`  📅 Instancias:`, visibleInstances);

    for (const instance of visibleInstances) {
      expanded.push({
        ...task,
        id: `${task.id}-instance-${instance.instanceDate}`, // ID único para la instancia
        dueDate: instance.instanceDate,
        status: instance.status,
        completedDate: instance.completedDate,
        parentTaskId: task.id, // Referencia a la tarea madre
        title: `${task.title}`, // Mantener título original
        isRecurring: false // Las instancias no son recurrentes
      });
    }
  }

  console.log('✅ Total tareas expandidas:', expanded.length);
  return expanded;
}

/**
 * Actualiza el estado de una instancia específica
 */
export function updateInstance(
  task: Task,
  instanceDate: string,
  updates: Partial<TaskInstance>
): Task {
  if (!task.instances) return task;

  return {
    ...task,
    instances: task.instances.map(inst =>
      inst.instanceDate === instanceDate
        ? { ...inst, ...updates }
        : inst
    )
  };
}

/**
 * Obtiene el label de frecuencia en español
 */
export function getFrequencyLabel(frequency: RecurrenceFrequency): string {
  const labels: Record<RecurrenceFrequency, string> = {
    daily: 'Diaria',
    weekly: 'Semanal',
    monthly: 'Mensual'
  };
  return labels[frequency];
}

/**
 * Obtiene los labels de días en español
 */
export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mié',
  thursday: 'Jue',
  friday: 'Vie',
  saturday: 'Sáb',
  sunday: 'Dom'
};
