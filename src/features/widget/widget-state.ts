import type { WidgetSnapshotState } from './types';

export const getWidgetSnapshotState = (
  todoCount: number,
  status: 'syncing' | 'ready' | 'error',
): WidgetSnapshotState => {
  if (status === 'syncing') {
    return 'syncing';
  }

  if (status === 'error') {
    return 'error';
  }

  return todoCount > 0 ? 'ready' : 'empty';
};

