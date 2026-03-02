import type { TodoItem } from '@/features/todo/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createWidgetSnapshot, parseWidgetSnapshot, serializeWidgetSnapshot } from './widget-snapshot';
import type { WidgetSnapshot, WidgetSnapshotState } from './types';
import {
  DEFAULT_WIDGET_REFRESH_INTERVAL_MINUTES,
  getNextWidgetRefreshAt,
} from './widget-refresh-policy';

export interface WidgetBridge {
  saveSnapshot(snapshot: WidgetSnapshot): Promise<void>;
  loadSnapshot(): Promise<WidgetSnapshot | null>;
  clearSnapshot(): Promise<void>;
  requestRefresh(refreshAt: string): Promise<void>;
}

type KeyValueStorage = {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
};

const SNAPSHOT_KEY = 'widget:snapshot';
const REFRESH_AT_KEY = 'widget:refresh-at';

export class AsyncStorageWidgetBridge implements WidgetBridge {
  constructor(
    private readonly storage: KeyValueStorage = AsyncStorage,
    private readonly snapshotKey = SNAPSHOT_KEY,
    private readonly refreshAtKey = REFRESH_AT_KEY,
  ) {}

  async saveSnapshot(snapshot: WidgetSnapshot): Promise<void> {
    await this.storage.setItem(this.snapshotKey, serializeWidgetSnapshot(snapshot));
  }

  async loadSnapshot(): Promise<WidgetSnapshot | null> {
    const serialized = await this.storage.getItem(this.snapshotKey);
    if (!serialized) {
      return null;
    }

    return parseWidgetSnapshot(serialized);
  }

  async clearSnapshot(): Promise<void> {
    await Promise.all([
      this.storage.removeItem(this.snapshotKey),
      this.storage.removeItem(this.refreshAtKey),
    ]);
  }

  async requestRefresh(refreshAt: string): Promise<void> {
    await this.storage.setItem(this.refreshAtKey, refreshAt);
  }

  async loadRefreshRequest(): Promise<string | null> {
    return this.storage.getItem(this.refreshAtKey);
  }
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
  state?: WidgetSnapshotState;
  errorMessage?: string | null;
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
  const snapshot = createWidgetSnapshot(
    todos,
    lastSyncedAt,
    20,
    options?.state ?? (todos.length > 0 ? 'ready' : 'empty'),
    options?.errorMessage ?? null,
  );
  const serializedSnapshot = serializeWidgetSnapshot(snapshot);

  const refreshIntervalMinutes =
    options?.refreshIntervalMinutes ?? DEFAULT_WIDGET_REFRESH_INTERVAL_MINUTES;
  const refreshAt = getNextWidgetRefreshAt(
    new Date(),
    options?.state === 'error' ? 'error' : 'ready',
    refreshIntervalMinutes,
  );

  await bridge.saveSnapshot(snapshot);
  await bridge.requestRefresh(refreshAt);

  return {
    snapshot,
    serializedSnapshot,
    refreshAt,
  };
};
