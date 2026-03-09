import type { TodoItem } from './types';

const getUpdatedTimestamp = (updatedTime: TodoItem['updatedTime']) => {
  const parsed = Date.parse(updatedTime);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const sortTodos = (todos: TodoItem[]): TodoItem[] => {
  return [...todos].sort((a, b) => {
    const updatedDelta = getUpdatedTimestamp(b.updatedTime) - getUpdatedTimestamp(a.updatedTime);
    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return a.title.localeCompare(b.title);
  });
};
