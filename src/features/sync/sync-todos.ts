import { sortTodosByDueDate } from '@/features/todo/sort';
import type { TodoItem } from '@/features/todo/types';
import type { TodoCache } from '@/storage/todo-cache';

import { OneDriveNetworkError } from './errors';
import { normalizeJoplinTodos, toTodoItem } from './joplin-todo-normalizer';
import type { OneDriveJoplinSource, OneDriveSyncProgress } from './onedrive-source';
import type { TodoSyncResult, TodoSyncWithFallbackResult } from './types';

type SyncOptions = {
  maxRetries?: number;
  retryDelayMs?: number;
  onProgress?: (progress: OneDriveSyncProgress) => void;
  onTodoParsed?: (todo: TodoItem) => void;
};

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const syncTodosFromOneDrive = async (
  source: OneDriveJoplinSource,
  cache: TodoCache,
  options: SyncOptions = {},
): Promise<TodoSyncResult> => {
  const maxRetries = options.maxRetries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 500;
  const snapshot = await cache.loadTodos();
  const checkpoint = await cache.loadSyncCheckpoint();
  const canResume = checkpoint?.modifiedSince === snapshot.lastSyncedAt;
  const parsedTodoById = new Map((canResume ? checkpoint?.parsedTodos : []).map((todo) => [todo.id, todo]));
  let resumeFromCompleted = canResume ? checkpoint?.completed ?? 0 : 0;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const rawItems = await source.listJoplinItems(async (progress) => {
        if (progress.phase === 'downloading') {
          resumeFromCompleted = Math.max(resumeFromCompleted, progress.completed);
          await cache.saveSyncCheckpoint({
            modifiedSince: snapshot.lastSyncedAt,
            completed: resumeFromCompleted,
            parsedTodos: Array.from(parsedTodoById.values()),
          });
        }
        await options.onProgress?.(progress);
      }, async (item) => {
        const todoItem = toTodoItem(item);
        if (todoItem) {
          parsedTodoById.set(todoItem.id, todoItem);
          await cache.saveSyncCheckpoint({
            modifiedSince: snapshot.lastSyncedAt,
            completed: resumeFromCompleted,
            parsedTodos: Array.from(parsedTodoById.values()),
          });
          await options.onTodoParsed?.(todoItem);
        }
      }, {
        modifiedSince: snapshot.lastSyncedAt,
        resumeFromCompleted,
      });
      const parsedTodos = Array.from(parsedTodoById.values());
      const normalizedTodos = normalizeJoplinTodos(rawItems);
      const fetchedById = new Map(normalizedTodos.map((todo) => [todo.id, todo]));
      parsedTodos.forEach((todo) => {
        fetchedById.set(todo.id, todo);
      });
      const fetchedTodos = Array.from(fetchedById.values());
      const mergedTodos =
        source.incrementalMode === 'modifiedSince' && snapshot.lastSyncedAt
          ? (() => {
              const byId = new Map(snapshot.todos.map((todo) => [todo.id, todo]));
              fetchedTodos.forEach((todo) => {
                byId.set(todo.id, todo);
              });
              return Array.from(byId.values());
            })()
          : fetchedTodos;
      const sortedTodos = sortTodosByDueDate(mergedTodos);
      const syncedAt = new Date().toISOString();

      await cache.saveTodos(sortedTodos, syncedAt);
      await cache.clearSyncCheckpoint();

      return {
        todos: sortedTodos,
        syncedAt,
        source: 'onedrive',
      };
    } catch (error) {
      lastError = error;
      await cache.saveSyncCheckpoint({
        modifiedSince: snapshot.lastSyncedAt,
        completed: resumeFromCompleted,
        parsedTodos: Array.from(parsedTodoById.values()),
      });
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
