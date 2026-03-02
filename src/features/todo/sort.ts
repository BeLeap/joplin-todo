import type { TodoItem } from './types';

const getDueTimestamp = (due: TodoItem['due']) => {
  if (!due) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = Date.parse(due);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

const getUpdatedTimestamp = (updatedTime: TodoItem['updatedTime']) => {
  const parsed = Date.parse(updatedTime);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const sortTodosByDueDate = (todos: TodoItem[]): TodoItem[] => {
  return [...todos].sort((a, b) => {
    const dueDelta = getDueTimestamp(a.due) - getDueTimestamp(b.due);
    if (dueDelta !== 0) {
      return dueDelta;
    }

    const updatedDelta = getUpdatedTimestamp(b.updatedTime) - getUpdatedTimestamp(a.updatedTime);
    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return a.title.localeCompare(b.title);
  });
};
