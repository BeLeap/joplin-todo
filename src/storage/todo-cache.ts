import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TodoItem } from '@/features/todo/types';

type TodoCacheSnapshot = {
  todos: TodoItem[];
  lastSyncedAt: string | null;
};

const TODO_CACHE_STORAGE_KEY = 'joplin-todo/cache/v1';

const EMPTY_SNAPSHOT: TodoCacheSnapshot = {
  todos: [],
  lastSyncedAt: null,
};

const isTodoItem = (value: unknown): value is TodoItem => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<TodoItem>;

  const hasDue = candidate.due === null || typeof candidate.due === 'string';

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    hasDue &&
    typeof candidate.completed === 'boolean' &&
    typeof candidate.updatedTime === 'string'
  );
};

const toSnapshot = (value: unknown): TodoCacheSnapshot => {
  if (!value || typeof value !== 'object') {
    return EMPTY_SNAPSHOT;
  }

  const candidate = value as {
    todos?: unknown;
    lastSyncedAt?: unknown;
  };

  const todos = Array.isArray(candidate.todos) ? candidate.todos.filter(isTodoItem) : [];
  const lastSyncedAt = typeof candidate.lastSyncedAt === 'string' ? candidate.lastSyncedAt : null;

  return {
    todos,
    lastSyncedAt,
  };
};

export interface TodoCache {
  saveTodos(todos: TodoItem[], syncedAt: string): Promise<void>;
  loadTodos(): Promise<TodoCacheSnapshot>;
  clear(): Promise<void>;
}

export class InMemoryTodoCache implements TodoCache {
  private snapshot: TodoCacheSnapshot = EMPTY_SNAPSHOT;

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
    this.snapshot = EMPTY_SNAPSHOT;
  }
}

export class AsyncStorageTodoCache implements TodoCache {
  async saveTodos(todos: TodoItem[], syncedAt: string): Promise<void> {
    const snapshot: TodoCacheSnapshot = {
      todos: [...todos],
      lastSyncedAt: syncedAt,
    };

    await AsyncStorage.setItem(TODO_CACHE_STORAGE_KEY, JSON.stringify(snapshot));
  }

  async loadTodos(): Promise<TodoCacheSnapshot> {
    const raw = await AsyncStorage.getItem(TODO_CACHE_STORAGE_KEY);
    if (!raw) {
      return EMPTY_SNAPSHOT;
    }

    try {
      return toSnapshot(JSON.parse(raw));
    } catch {
      return EMPTY_SNAPSHOT;
    }
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(TODO_CACHE_STORAGE_KEY);
  }
}
