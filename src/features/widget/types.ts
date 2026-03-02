export type WidgetTodoItem = {
  id: string;
  title: string;
  due: string | null;
  completed: boolean;
};

export type WidgetSnapshot = {
  version: 1;
  generatedAt: string;
  lastSyncedAt: string | null;
  todos: WidgetTodoItem[];
};
