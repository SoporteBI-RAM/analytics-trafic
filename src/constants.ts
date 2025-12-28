import { User, Client } from './types';

export const MOCK_CLIENTS: Client[] = [];

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Santiago Tito',
    email: 'santiago@ram.com',
    password: 'ram2024',
    avatar: 'https://picsum.photos/seed/santiago/200/200',
    role: 'Admin'
  },
  {
    id: 'u2',
    name: 'Usuario RAM 2',
    email: 'usuario2@ram.com',
    password: 'ram2024',
    avatar: 'https://picsum.photos/seed/user2/200/200',
    role: 'Analyst'
  },
  {
    id: 'u3',
    name: 'Usuario RAM 3',
    email: 'usuario3@ram.com',
    password: 'ram2024',
    avatar: 'https://picsum.photos/seed/user3/200/200',
    role: 'Analyst'
  },
  {
    id: 'u4',
    name: 'Usuario RAM 4',
    email: 'usuario4@ram.com',
    password: 'ram2024',
    avatar: 'https://picsum.photos/seed/user4/200/200',
    role: 'Analyst'
  }
];

export const STATUS_LABELS: Record<string, string> = {
  todo: 'Por Hacer',
  inprogress: 'En Progreso',
  review: 'En Revisión',
  done: 'Finalizado'
};

export const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700 border-slate-200',
  inprogress: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};
