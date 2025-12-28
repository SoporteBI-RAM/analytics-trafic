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
  CLIENT_MANAGEMENT = 'CLIENT_MANAGEMENT'
}
