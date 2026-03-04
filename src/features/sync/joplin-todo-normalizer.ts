import type { TodoItem } from '@/features/todo/types';

import { EncryptedJoplinSyncError } from './errors';
import type { JoplinRawTodo } from './types';

const toIsoOrNull = (value: number): string | null => {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const toIsoOrNow = (value: number): string => {
  const iso = toIsoOrNull(value);
  return iso ?? new Date(0).toISOString();
};


export const toTodoItem = (rawItem: JoplinRawTodo): TodoItem | null => {
  if (rawItem.encryption_applied !== 0) {
    throw new EncryptedJoplinSyncError();
  }

  if (Number(rawItem.is_todo) !== 1) {
    return null;
  }

  return {
    id: rawItem.id,
    title: rawItem.title?.trim() || '(제목 없음)',
    due: toIsoOrNull(rawItem.todo_due),
    completed: Number(rawItem.todo_completed) > 0,
    updatedTime: toIsoOrNow(rawItem.updated_time),
  };
};

export const normalizeJoplinTodos = (rawItems: JoplinRawTodo[]): TodoItem[] => {
  return rawItems
    .map(toTodoItem)
    .filter((item): item is TodoItem => item !== null);
};

