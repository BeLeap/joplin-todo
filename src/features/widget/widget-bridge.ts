import type { TodoItem } from '@/features/todo/types';

import { createWidgetSnapshot, serializeWidgetSnapshot } from './widget-snapshot';
import type { WidgetSnapshot } from './types';
import {
  DEFAULT_WIDGET_REFRESH_INTERVAL_MINUTES,
  getWidgetRefreshIntervalMs,
} from './widget-refresh-policy';

export interface WidgetBridge {
  saveSnapshot(snapshot: WidgetSnapshot): Promise<void>;
  loadSnapshot(): Promise<WidgetSnapshot | null>;
  clearSnapshot(): Promise<void>;
  requestRefresh(refreshAt: string): Promise<void>;
}

export class InMemoryWidgetBridge implements WidgetBridge {
  private snapshot: WidgetSnapshot | null = null;

  private refreshAt: string | null = null;

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
    this.refreshAt = null;
  }

  async requestRefresh(refreshAt: string): Promise<void> {
    this.refreshAt = refreshAt;
  }

  async loadRefreshRequest(): Promise<string | null> {
    return this.refreshAt;
  }
}

export type WidgetPublishOptions = {
  refreshIntervalMinutes?: number;
};

export type WidgetPublishResult = {
  snapshot: WidgetSnapshot;
  serializedSnapshot: string;
  refreshAt: string;
};

export const publishTodosToWidget = async (
  bridge: WidgetBridge,
  todos: TodoItem[],
  lastSyncedAt: string | null,
  options?: WidgetPublishOptions,
): Promise<WidgetPublishResult> => {
  const snapshot = createWidgetSnapshot(todos, lastSyncedAt);
  const serializedSnapshot = serializeWidgetSnapshot(snapshot);

  const refreshIntervalMinutes =
    options?.refreshIntervalMinutes ?? DEFAULT_WIDGET_REFRESH_INTERVAL_MINUTES;
  const refreshAt = new Date(
    Date.now() + getWidgetRefreshIntervalMs(refreshIntervalMinutes),
  ).toISOString();

  await bridge.saveSnapshot(snapshot);
  await bridge.requestRefresh(refreshAt);

  return {
    snapshot,
    serializedSnapshot,
    refreshAt,
  };
};
