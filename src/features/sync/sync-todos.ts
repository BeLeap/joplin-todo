import { sortTodosByDueDate } from '@/features/todo/sort';
import type { TodoCache } from '@/storage/todo-cache';

import { OneDriveNetworkError } from './errors';
import { normalizeJoplinTodos, toTodoItem } from './joplin-todo-normalizer';
import type { OneDriveJoplinSource, OneDriveSyncProgress } from './onedrive-source';
import type { TodoSyncResult, TodoSyncWithFallbackResult } from './types';

type SyncOptions = {
  maxRetries?: number;
  retryDelayMs?: number;
  onProgress?: (progress: OneDriveSyncProgress) => void;
  onTodoParsed?: (todo: ReturnType<typeof toTodoItem>) => void;
};

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      const rawItems = await source.listJoplinItems(options.onProgress, (item) => {
        const todoItem = toTodoItem(item);
        if (todoItem) {
          options.onTodoParsed?.(todoItem);
        }
      });
      const normalizedTodos = normalizeJoplinTodos(rawItems);
      const sortedTodos = sortTodosByDueDate(normalizedTodos);
      const syncedAt = new Date().toISOString();

      await cache.saveTodos(sortedTodos, syncedAt);

      return {
        todos: sortedTodos,
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
