import { sortTodosByDueDate } from '@/features/todo/sort';
import type { TodoCache } from '@/storage/todo-cache';

import { OneDriveNetworkError } from './errors';
import { normalizeJoplinTodos } from './joplin-todo-normalizer';
import type { OneDriveJoplinSource, OneDriveSyncProgress } from './onedrive-source';
import type { TodoSyncResult, TodoSyncWithFallbackResult } from './types';

type SyncOptions = {
  maxRetries?: number;
  retryDelayMs?: number;
  onProgress?: (progress: OneDriveSyncProgress) => void;
};

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mergeTodosById = (previousTodos: TodoSyncResult['todos'], incomingTodos: TodoSyncResult['todos']) => {
  const byId = new Map(previousTodos.map((todo) => [todo.id, todo]));
  incomingTodos.forEach((todo) => byId.set(todo.id, todo));
  return sortTodosByDueDate([...byId.values()]);
};

export const syncTodosFromOneDrive = async (
  source: OneDriveJoplinSource,
  cache: TodoCache,
  options: SyncOptions = {},
): Promise<TodoSyncResult> => {
  const maxRetries = options.maxRetries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 500;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const previousSnapshot = await cache.loadTodos();
      const rawItems = await source.listJoplinItems({
        modifiedSince: previousSnapshot.lastSyncedAt,
        onProgress: options.onProgress,
      });
      const normalizedTodos = normalizeJoplinTodos(rawItems);
      const sortedTodos = sortTodosByDueDate(normalizedTodos);
      const todosToPersist =
        previousSnapshot.lastSyncedAt === null
          ? sortedTodos
          : mergeTodosById(previousSnapshot.todos, sortedTodos);
      const syncedAt = new Date().toISOString();

      await cache.saveTodos(todosToPersist, syncedAt);

      return {
        todos: todosToPersist,
        syncedAt,
        source: 'onedrive',
      };
    } catch (error) {
      lastError = error;
      if (!(error instanceof OneDriveNetworkError) || attempt >= maxRetries) {
        throw error;
      }

      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError;
};

export const syncTodosFromOneDriveWithCacheFallback = async (
  source: OneDriveJoplinSource,
  cache: TodoCache,
  options: SyncOptions = {},
): Promise<TodoSyncWithFallbackResult> => {
  try {
    const result = await syncTodosFromOneDrive(source, cache, options);
    return {
      ...result,
      fromCache: false,
    };
  } catch (error) {
    if (!(error instanceof OneDriveNetworkError)) {
      throw error;
    }

    const snapshot = await cache.loadTodos();
    if (snapshot.lastSyncedAt === null) {
      throw error;
    }

    return {
      todos: snapshot.todos,
      syncedAt: snapshot.lastSyncedAt,
      source: 'onedrive',
      fromCache: true,
    };
  }
};
