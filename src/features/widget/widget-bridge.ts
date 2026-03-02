import type { TodoItem } from '@/features/todo/types';

import { createWidgetSnapshot } from './widget-snapshot';
import type { WidgetSnapshot } from './types';

export interface WidgetBridge {
  saveSnapshot(snapshot: WidgetSnapshot): Promise<void>;
  loadSnapshot(): Promise<WidgetSnapshot | null>;
  clearSnapshot(): Promise<void>;
}

export class InMemoryWidgetBridge implements WidgetBridge {
  private snapshot: WidgetSnapshot | null = null;

  async saveSnapshot(snapshot: WidgetSnapshot): Promise<void> {
    this.snapshot = { ...snapshot, todos: [...snapshot.todos] };
  }

  async loadSnapshot(): Promise<WidgetSnapshot | null> {
    if (!this.snapshot) {
      return null;
    }

    return { ...this.snapshot, todos: [...this.snapshot.todos] };
  }

  async clearSnapshot(): Promise<void> {
    this.snapshot = null;
  }
}

export const publishTodosToWidget = async (
  bridge: WidgetBridge,
  todos: TodoItem[],
  lastSyncedAt: string | null,
): Promise<WidgetSnapshot> => {
  const snapshot = createWidgetSnapshot(todos, lastSyncedAt);
  await bridge.saveSnapshot(snapshot);

  return snapshot;
};
