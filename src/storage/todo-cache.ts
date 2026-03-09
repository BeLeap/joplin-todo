import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TodoItem } from '@/features/todo/types';

type TodoCacheSnapshot = {
  todos: TodoItem[];
  lastSyncedAt: string | null;
};

export type TodoSyncCheckpoint = {
  modifiedSince: string | null;
  completed: number;
  parsedTodos: TodoItem[];
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

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
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
  saveSyncCheckpoint(checkpoint: TodoSyncCheckpoint): Promise<void>;
  loadSyncCheckpoint(): Promise<TodoSyncCheckpoint | null>;
  clearSyncCheckpoint(): Promise<void>;
  clear(): Promise<void>;
}

export class InMemoryTodoCache implements TodoCache {
  private snapshot: TodoCacheSnapshot = EMPTY_SNAPSHOT;
  private checkpoint: TodoSyncCheckpoint | null = null;

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

  async saveSyncCheckpoint(checkpoint: TodoSyncCheckpoint): Promise<void> {
    this.checkpoint = {
      ...checkpoint,
      parsedTodos: [...checkpoint.parsedTodos],
    };
  }

  async loadSyncCheckpoint(): Promise<TodoSyncCheckpoint | null> {
    if (!this.checkpoint) {
      return null;
    }

    return {
      ...this.checkpoint,
      parsedTodos: [...this.checkpoint.parsedTodos],
    };
  }

  async clearSyncCheckpoint(): Promise<void> {
    this.checkpoint = null;
  }

  async clear(): Promise<void> {
    this.snapshot = EMPTY_SNAPSHOT;
    this.checkpoint = null;
  }
}

const TODO_SYNC_CHECKPOINT_STORAGE_KEY = 'joplin-todo/sync-checkpoint/v1';

const toSyncCheckpoint = (value: unknown): TodoSyncCheckpoint | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as {
    modifiedSince?: unknown;
    completed?: unknown;
    parsedTodos?: unknown;
  };
  const modifiedSince =
    typeof candidate.modifiedSince === 'string' || candidate.modifiedSince === null
      ? candidate.modifiedSince
      : null;
  const completed =
    typeof candidate.completed === 'number' && Number.isInteger(candidate.completed) && candidate.completed >= 0
      ? candidate.completed
      : null;
  const parsedTodos = Array.isArray(candidate.parsedTodos) ? candidate.parsedTodos.filter(isTodoItem) : null;

  if (completed === null || parsedTodos === null) {
    return null;
  }

  return {
    modifiedSince,
    completed,
    parsedTodos,
  };
};

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

  async saveSyncCheckpoint(checkpoint: TodoSyncCheckpoint): Promise<void> {
    await AsyncStorage.setItem(TODO_SYNC_CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpoint));
  }

  async loadSyncCheckpoint(): Promise<TodoSyncCheckpoint | null> {
    const raw = await AsyncStorage.getItem(TODO_SYNC_CHECKPOINT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return toSyncCheckpoint(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async clearSyncCheckpoint(): Promise<void> {
    await AsyncStorage.removeItem(TODO_SYNC_CHECKPOINT_STORAGE_KEY);
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(TODO_CACHE_STORAGE_KEY);
    await AsyncStorage.removeItem(TODO_SYNC_CHECKPOINT_STORAGE_KEY);
  }
}
