import { sortTodos } from '@/features/todo/sort';
import type { TodoItem } from '@/features/todo/types';
import type { TodoCache } from '@/storage/todo-cache';

import { OneDriveNetworkError } from './errors';
import { normalizeJoplinTodos, toTodoItem } from './joplin-todo-normalizer';
import type { OneDriveDownloadedItem, OneDriveJoplinSource, OneDriveSyncProgress } from './onedrive-source';
import type { TodoSyncResult, TodoSyncWithFallbackResult } from './types';

type SyncOptions = {
  maxRetries?: number;
  retryDelayMs?: number;
  onProgress?: (progress: OneDriveSyncProgress) => void;
  onTodoParsed?: (todo: TodoItem) => void;
};

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toTodoIdFromFileName = (fileName: string) => {
  if (!fileName.endsWith('.md')) {
    return null;
  }

  const todoId = fileName.slice(0, -3).trim();
  return todoId ? todoId : null;
};

const removeParsedTodoByFileName = (
  parsedTodoById: Map<string, TodoItem>,
  fileName: string,
) => {
  const todoId = toTodoIdFromFileName(fileName);

  if (!todoId) {
    return false;
  }

  return parsedTodoById.delete(todoId);
};

const persistCheckpoint = async (
  cache: TodoCache,
  modifiedSince: string | null,
  completed: number,
  parsedTodoById: Map<string, TodoItem>,
) => {
  await cache.saveSyncCheckpoint({
    modifiedSince,
    completed,
    parsedTodos: Array.from(parsedTodoById.values()),
  });
};

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
  let listedTodoIds: Set<string> | null = null;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const rawItems = await source.listJoplinItems(async (progress) => {
        if (progress.phase === 'downloading') {
          resumeFromCompleted = Math.max(resumeFromCompleted, progress.completed);
          await persistCheckpoint(cache, snapshot.lastSyncedAt, resumeFromCompleted, parsedTodoById);
        }
        await options.onProgress?.(progress);
      }, async ({ fileName, item }: OneDriveDownloadedItem) => {
        if (!item) {
          removeParsedTodoByFileName(parsedTodoById, fileName);
          await persistCheckpoint(cache, snapshot.lastSyncedAt, resumeFromCompleted, parsedTodoById);
          return;
        }

        const todoItem = toTodoItem(item);

        if (todoItem) {
          parsedTodoById.set(todoItem.id, todoItem);
          await persistCheckpoint(cache, snapshot.lastSyncedAt, resumeFromCompleted, parsedTodoById);
          await options.onTodoParsed?.(todoItem);
          return;
        }

        parsedTodoById.delete(item.id);
        await persistCheckpoint(cache, snapshot.lastSyncedAt, resumeFromCompleted, parsedTodoById);
      }, {
        modifiedSince: null,
        resumeFromCompleted,
        onFilesListed: async (fileNames) => {
          listedTodoIds = new Set(fileNames.map(toTodoIdFromFileName).filter((todoId): todoId is string => !!todoId));
          for (const todoId of Array.from(parsedTodoById.keys())) {
            if (!listedTodoIds.has(todoId)) {
              parsedTodoById.delete(todoId);
            }
          }
          await persistCheckpoint(
            cache,
            snapshot.lastSyncedAt,
            Math.min(resumeFromCompleted, listedTodoIds.size),
            parsedTodoById,
          );
        },
      });
      const parsedTodos = Array.from(parsedTodoById.values());
      const normalizedTodos = normalizeJoplinTodos(rawItems);
      const fetchedById = new Map(normalizedTodos.map((todo) => [todo.id, todo]));
      parsedTodos.forEach((todo) => {
        if (listedTodoIds && !listedTodoIds.has(todo.id)) {
          return;
        }
        fetchedById.set(todo.id, todo);
      });
      const fetchedTodos = Array.from(fetchedById.values());
      const sortedTodos = sortTodos(fetchedTodos);
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
      await persistCheckpoint(cache, snapshot.lastSyncedAt, resumeFromCompleted, parsedTodoById);
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
