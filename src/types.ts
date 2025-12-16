export type Status = 'todo' | 'inprogress' | 'review' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  role: 'Manager' | 'Data Scientist' | 'Data Engineer' | 'Analyst';
}

export interface Client {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  assigneeIds: string[]; // Múltiples responsables
  clientId: string | null;
  startDate: string;
  dueDate: string;
  tags: string[];
  completedDate?: string | null; // Fecha cuando se marcó como finalizada
}

export enum ViewMode {
  KANBAN = 'KANBAN',
  GANTT = 'GANTT',
  TEAM = 'TEAM',
  TEAM_MANAGEMENT = 'TEAM_MANAGEMENT',
  TABLE = 'TABLE',
  CLIENT_MANAGEMENT = 'CLIENT_MANAGEMENT'
}
