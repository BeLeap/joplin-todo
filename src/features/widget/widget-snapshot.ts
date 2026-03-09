import type { TodoItem } from '@/features/todo/types';

import type { WidgetSnapshot, WidgetSnapshotState } from './types';

const WIDGET_SNAPSHOT_VERSION = 1;

export const createWidgetSnapshot = (
  todos: TodoItem[],
  lastSyncedAt: string | null,
  maxItems = 20,
  state: WidgetSnapshotState = todos.length > 0 ? 'ready' : 'empty',
  errorMessage: string | null = null,
): WidgetSnapshot => {
  const limitedTodos = todos.slice(0, maxItems).map((todo) => ({
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
  }));

  return {
    version: WIDGET_SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    lastSyncedAt,
    state,
    errorMessage,
    todos: limitedTodos,
  };
};

export const serializeWidgetSnapshot = (snapshot: WidgetSnapshot): string =>
  JSON.stringify(snapshot);

export const parseWidgetSnapshot = (value: string): WidgetSnapshot => {
  const parsed = JSON.parse(value) as WidgetSnapshot;

  const hasInvalidTodo =
    !Array.isArray(parsed.todos) ||
    parsed.todos.some(
      (todo) =>
        typeof todo?.id !== 'string' ||
        typeof todo?.title !== 'string' ||
        typeof todo?.completed !== 'boolean',
    );

  if (
    parsed.version !== WIDGET_SNAPSHOT_VERSION ||
    typeof parsed.generatedAt !== 'string' ||
    (parsed.lastSyncedAt !== null && typeof parsed.lastSyncedAt !== 'string') ||
    !['syncing', 'ready', 'empty', 'error'].includes(parsed.state) ||
    (parsed.errorMessage !== null && typeof parsed.errorMessage !== 'string') ||
    hasInvalidTodo
  ) {
    throw new Error('Invalid widget snapshot payload');
  }

  return parsed;
};
