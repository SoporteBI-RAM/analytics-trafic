export type Status = 'todo' | 'inprogress' | 'review' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  avatarColor?: string;
  role: 'Admin' | 'Analyst';
}

export interface Client {
  id: string;
  name: string;
}

export interface RecurrenceConfig {
  enabled: boolean;
  frequency: RecurrenceFrequency;
  daysOfWeek: DayOfWeek[]; // Para weekly
  dayOfMonth?: number; // Para monthly (1-31)
  interval: number;
  endDate: string;
}

export interface TaskInstance {
  instanceDate: string;
  status: Status;
  completedDate?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  assigneeIds: string[];
  clientId: string | null;
  startDate: string;
  dueDate: string;
  tags: string[];
  completedDate?: string | null;

  // Recurrencia
  isRecurring?: boolean;
  recurrence?: RecurrenceConfig;
  instances?: TaskInstance[];
  parentTaskId?: string | null;
}

export enum ViewMode {
  KANBAN = 'KANBAN',
  GANTT = 'GANTT',
  TEAM = 'TEAM',
  TEAM_MANAGEMENT = 'TEAM_MANAGEMENT',
  TABLE = 'TABLE',
  CLIENT_MANAGEMENT = 'CLIENT_MANAGEMENT',
  CLIENT_PERFORMANCE = 'CLIENT_PERFORMANCE',
  USER_PERFORMANCE = 'USER_PERFORMANCE',
  DASHBOARD = 'DASHBOARD',
  FRIDAY_TIME_OFF = 'FRIDAY_TIME_OFF',
  VACATIONS = 'VACATIONS'
}

// Vacaciones
export interface Vacation {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number; // Días hábiles calculados
  status: 'pending' | 'approved' | 'rejected' | 'taken';
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
}

// Tardes Libres - Cada registro representa una tarde libre de un usuario
export interface FridayTimeOff {
  id: string;
  userId: string;
  date: string; // Fecha del viernes (YYYY-MM-DD)
  month: string; // Mes en formato YYYY-MM para facilitar filtros
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  createdBy: string; // ID del usuario que creó el registro
  approvedBy?: string; // ID del admin que aprobó/rechazó
  approvedAt?: string;
}

// Feriados - Viernes que no pueden ser seleccionados como tarde libre
export interface Holiday {
  id: string;
  date: string; // Fecha del viernes feriado (YYYY-MM-DD)
  name: string; // Nombre del feriado
  createdBy: string; // ID del admin que lo creó
  createdAt: string;
}
