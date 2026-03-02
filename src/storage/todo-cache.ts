import type { TodoItem } from '@/features/todo/types';

type TodoCacheSnapshot = {
  todos: TodoItem[];
  lastSyncedAt: string | null;
};

export interface TodoCache {
  saveTodos(todos: TodoItem[], syncedAt: string): Promise<void>;
  loadTodos(): Promise<TodoCacheSnapshot>;
  clear(): Promise<void>;
}

export class InMemoryTodoCache implements TodoCache {
  private snapshot: TodoCacheSnapshot = {
    todos: [],
    lastSyncedAt: null,
  };

  async saveTodos(todos: TodoItem[], syncedAt: string): Promise<void> {
    this.snapshot = {
      todos: [...todos],
      lastSyncedAt: syncedAt,
    };
  }

  async loadTodos(): Promise<TodoCacheSnapshot> {
    return {
      todos: [...this.snapshot.todos],
      lastSyncedAt: this.snapshot.lastSyncedAt,
    };
  }

  async clear(): Promise<void> {
    this.snapshot = {
      todos: [],
      lastSyncedAt: null,
    };
  }
}
