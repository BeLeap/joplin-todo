import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { getWidgetSnapshotState } from '@/features/widget/widget-state';
import { publishTodosToWidget } from '@/features/widget/widget-bridge';
import { createWidgetBridge } from '@/features/widget/widget-bridge-factory';
import { DEFAULT_WIDGET_REFRESH_INTERVAL_MINUTES } from '@/features/widget/widget-refresh-policy';
import { AsyncStorageTodoCache } from '@/storage/todo-cache';

import { OneDriveAuthError } from './errors';
import { getValidStoredAccessToken } from './onedrive-auth-session';
import { GraphOneDriveJoplinSource } from './onedrive-source';
import { syncTodosFromOneDriveWithCacheFallback } from './sync-todos';

export const JOPLIN_BACKGROUND_SYNC_TASK = 'joplin-todo-background-sync';

const cache = new AsyncStorageTodoCache();
const widgetBridge = createWidgetBridge();

const runBackgroundSyncOnce = async () => {
  const envToken = process.env.EXPO_PUBLIC_ONEDRIVE_ACCESS_TOKEN?.trim() || null;
  const sessionToken = await getValidStoredAccessToken(process.env.EXPO_PUBLIC_ONEDRIVE_CLIENT_ID);
  const token = sessionToken ?? envToken;

  if (!token) {
    throw new OneDriveAuthError('백그라운드 동기화에 필요한 OneDrive 세션이 없습니다. 앱에서 로그인해 주세요.');
  }

  const source = new GraphOneDriveJoplinSource(token);
  const result = await syncTodosFromOneDriveWithCacheFallback(source, cache, {
    maxRetries: 2,
    retryDelayMs: 500,
  });

  await publishTodosToWidget(widgetBridge, result.todos, result.syncedAt, {
    state: getWidgetSnapshotState(result.todos.length, result.fromCache ? 'error' : 'ready'),
    errorMessage: result.fromCache ? '네트워크 문제로 마지막 캐시를 표시합니다.' : null,
  });
};

const publishBackgroundSyncFailure = async (message: string) => {
  const fallbackSnapshot = await cache.loadTodos();
  await publishTodosToWidget(widgetBridge, fallbackSnapshot.todos, fallbackSnapshot.lastSyncedAt, {
    state: 'error',
    errorMessage: `백그라운드 동기화 실패: ${message}. 마지막 캐시를 표시합니다.`,
  });
};

if (!TaskManager.isTaskDefined(JOPLIN_BACKGROUND_SYNC_TASK)) {
  TaskManager.defineTask(JOPLIN_BACKGROUND_SYNC_TASK, async ({ error }) => {
    if (error) {
      console.error('[background-sync-task-manager-error]', error);
      await publishBackgroundSyncFailure(error.message);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    try {
      await runBackgroundSyncOnce();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (taskError) {
      const message = taskError instanceof Error ? taskError.message : String(taskError);
      console.error('[background-sync-task-failed]', taskError);
      await publishBackgroundSyncFailure(message);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export const registerPeriodicTodoBackgroundSync = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  const isTaskManagerAvailable = await TaskManager.isAvailableAsync();
  if (!isTaskManagerAvailable) {
    throw new Error('TaskManager를 사용할 수 없습니다. 개발 빌드(Android)에서 실행해 주세요.');
  }

  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    throw new Error(`BackgroundTask를 사용할 수 없습니다. status=${status}`);
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(JOPLIN_BACKGROUND_SYNC_TASK);
  if (isRegistered) {
    return;
  }

  await BackgroundTask.registerTaskAsync(JOPLIN_BACKGROUND_SYNC_TASK, {
    minimumInterval: DEFAULT_WIDGET_REFRESH_INTERVAL_MINUTES,
  });
};
