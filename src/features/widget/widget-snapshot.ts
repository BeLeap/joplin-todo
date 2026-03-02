import type { TodoItem } from '@/features/todo/types';

import type { WidgetSnapshot } from './types';

const WIDGET_SNAPSHOT_VERSION = 1;

export const createWidgetSnapshot = (
  todos: TodoItem[],
  lastSyncedAt: string | null,
  maxItems = 20,
): WidgetSnapshot => {
  const limitedTodos = todos.slice(0, maxItems).map((todo) => ({
    id: todo.id,
    title: todo.title,
    due: todo.due,
    completed: todo.completed,
  }));

  return {
    version: WIDGET_SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    lastSyncedAt,
    todos: limitedTodos,
  };
};

export const serializeWidgetSnapshot = (snapshot: WidgetSnapshot): string =>
  JSON.stringify(snapshot);

export const parseWidgetSnapshot = (value: string): WidgetSnapshot => {
  const parsed = JSON.parse(value) as WidgetSnapshot;

  if (parsed.version !== WIDGET_SNAPSHOT_VERSION || !Array.isArray(parsed.todos)) {
    throw new Error('Invalid widget snapshot payload');
  }

  return parsed;
};
