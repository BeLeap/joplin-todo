export type WidgetTodoItem = {
  id: string;
  title: string;
  due: string | null;
  completed: boolean;
};

export type WidgetSnapshotState = 'syncing' | 'ready' | 'empty' | 'error';

export type WidgetSnapshot = {
  version: 1;
  generatedAt: string;
  lastSyncedAt: string | null;
  state: WidgetSnapshotState;
  errorMessage: string | null;
  todos: WidgetTodoItem[];
};
