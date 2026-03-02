import { sortTodosByDueDate } from '@/features/todo/sort';
import type { TodoCache } from '@/storage/todo-cache';

import { normalizeJoplinTodos } from './joplin-todo-normalizer';
import type { OneDriveJoplinSource } from './mock-onedrive-source';
import type { TodoSyncResult } from './types';

export const syncTodosFromOneDrive = async (
  source: OneDriveJoplinSource,
  cache: TodoCache,
): Promise<TodoSyncResult> => {
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
};
