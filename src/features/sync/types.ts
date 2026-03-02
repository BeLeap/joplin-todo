import type { TodoItem } from '@/features/todo/types';

export type JoplinRawTodo = {
  id: string;
  title: string;
  type_: number;
  todo_due: number;
  todo_completed: number;
  updated_time: number;
  encryption_applied: number;
};

export type TodoSyncResult = {
  todos: TodoItem[];
  syncedAt: string;
  source: 'onedrive';
};
