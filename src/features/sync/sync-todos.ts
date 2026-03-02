import { sortTodosByDueDate } from '@/features/todo/sort';
import type { TodoCache } from '@/storage/todo-cache';

import { OneDriveNetworkError } from './errors';
import { normalizeJoplinTodos } from './joplin-todo-normalizer';
import type { OneDriveJoplinSource } from './onedrive-source';
import type { TodoSyncResult } from './types';

type SyncOptions = {
  maxRetries?: number;
  retryDelayMs?: number;
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
      const rawItems = await source.listJoplinItems();
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
