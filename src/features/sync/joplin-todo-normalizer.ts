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

export const normalizeJoplinTodos = (rawItems: JoplinRawTodo[]): TodoItem[] => {
  if (rawItems.some((item) => item.encryption_applied !== 0)) {
    throw new EncryptedJoplinSyncError();
  }

  return rawItems
    .filter((item) => Number(item.is_todo) === 1)
    .map((item) => ({
      id: item.id,
      title: item.title?.trim() || '(제목 없음)',
      due: toIsoOrNull(item.todo_due),
      completed: Number(item.todo_completed) > 0,
      updatedTime: toIsoOrNow(item.updated_time),
    }));
};
