import { syncTodosFromOneDriveWithCacheFallback } from '@/features/sync/sync-todos';
import type { OneDriveJoplinSource } from '@/features/sync/onedrive-source';
import type { TodoCache } from '@/storage/todo-cache';

import { getWidgetSnapshotState } from './widget-state';
import type { WidgetBridge } from './widget-bridge';
import { publishTodosToWidget } from './widget-bridge';

type WidgetRefreshRunOptions = {
  now?: Date;
  maxRetries?: number;
  retryDelayMs?: number;
};

export type WidgetRefreshRunResult = {
  status: 'skipped' | 'synced' | 'cache-fallback' | 'failed';
  reason?: 'no-refresh-request' | 'not-due-yet';
  refreshAt?: string;
};

const isDue = (refreshAt: string, now: Date) => {
  const dueAtMs = Date.parse(refreshAt);
  if (Number.isNaN(dueAtMs)) {
    return true;
  }

  return dueAtMs <= now.getTime();
};

export const runWidgetRefreshIfDue = async (
  source: OneDriveJoplinSource,
  cache: TodoCache,
  bridge: WidgetBridge,
  options?: WidgetRefreshRunOptions,
): Promise<WidgetRefreshRunResult> => {
  const scheduledRefreshAt = await bridge.loadRefreshRequest();
  if (!scheduledRefreshAt) {
    return { status: 'skipped', reason: 'no-refresh-request' };
  }

  const now = options?.now ?? new Date();
  if (!isDue(scheduledRefreshAt, now)) {
    return { status: 'skipped', reason: 'not-due-yet', refreshAt: scheduledRefreshAt };
  }

  await bridge.clearRefreshRequest();

  try {
    const result = await syncTodosFromOneDriveWithCacheFallback(source, cache, {
      maxRetries: options?.maxRetries ?? 2,
      retryDelayMs: options?.retryDelayMs ?? 500,
    });

    const published = await publishTodosToWidget(bridge, result.todos, result.syncedAt, {
      state: getWidgetSnapshotState(result.todos.length, result.fromCache ? 'error' : 'ready'),
      errorMessage: result.fromCache ? '네트워크 문제로 마지막 캐시를 표시합니다.' : null,
    });

    return {
      status: result.fromCache ? 'cache-fallback' : 'synced',
      refreshAt: published.refreshAt,
    };
  } catch {
    const fallbackSnapshot = await cache.loadTodos();
    const published = await publishTodosToWidget(
      bridge,
      fallbackSnapshot.todos,
      fallbackSnapshot.lastSyncedAt,
      {
        state: 'error',
        errorMessage: '동기화에 실패했습니다. 마지막 캐시를 표시합니다.',
      },
    );

    return {
      status: 'failed',
      refreshAt: published.refreshAt,
    };
  }
};
