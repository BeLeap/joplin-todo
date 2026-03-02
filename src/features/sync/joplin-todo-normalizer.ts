import type { TodoItem } from '@/features/todo/types';

import { EncryptedJoplinSyncError } from './errors';
import type { JoplinRawTodo } from './types';

const JOPLIN_TODO_TYPE = 13;

const toIsoOrNull = (value: number): string | null => {
  if (!value || value <= 0) {
    return null;
  }

  return new Date(value).toISOString();
};

export const normalizeJoplinTodos = (rawItems: JoplinRawTodo[]): TodoItem[] => {
  if (rawItems.some((item) => item.encryption_applied !== 0)) {
    throw new EncryptedJoplinSyncError();
  }

  return rawItems
    .filter((item) => item.type_ === JOPLIN_TODO_TYPE)
    .map((item) => ({
      id: item.id,
      title: item.title.trim() || '(제목 없음)',
      due: toIsoOrNull(item.todo_due),
      completed: item.todo_completed > 0,
      updatedTime: new Date(item.updated_time).toISOString(),
    }));
};
