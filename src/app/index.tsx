import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  EncryptedJoplinSyncError,
  OneDriveAuthError,
  OneDriveNetworkError,
  OneDrivePermissionError,
} from '@/features/sync/errors';
import { MockOneDriveJoplinSource } from '@/features/sync/mock-onedrive-source';
import { GraphOneDriveJoplinSource, type OneDriveJoplinSource } from '@/features/sync/onedrive-source';
import { syncTodosFromOneDriveWithCacheFallback } from '@/features/sync/sync-todos';
import { AsyncStorageWidgetBridge, publishTodosToWidget } from '@/features/widget/widget-bridge';
import { getWidgetSnapshotState } from '@/features/widget/widget-state';
import type { TodoItem } from '@/features/todo/types';
import { AsyncStorageTodoCache } from '@/storage/todo-cache';

const createSyncSource = (): OneDriveJoplinSource => {
  const token = process.env.EXPO_PUBLIC_ONEDRIVE_ACCESS_TOKEN;
  if (token?.trim()) {
    return new GraphOneDriveJoplinSource(token);
  }

  return new MockOneDriveJoplinSource();
};

const source = createSyncSource();
const cache = new AsyncStorageTodoCache();
const widgetBridge = new AsyncStorageWidgetBridge();

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

const formatDueLabel = (due: string | null) => {
  if (!due) {
    return '마감일 없음';
  }

  return new Date(due).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSyncedAtLabel = (syncedAt: string | null) => {
  if (!syncedAt) {
    return '동기화 기록 없음';
  }

  return new Date(syncedAt).toLocaleString('ko-KR');
};

const toUserFriendlyError = (error: unknown) => {
  if (error instanceof EncryptedJoplinSyncError) {
    return error.message;
  }

  if (error instanceof OneDriveAuthError) {
    return error.message;
  }

  if (error instanceof OneDrivePermissionError) {
    return error.message;
  }

  if (error instanceof OneDriveNetworkError) {
    return `${error.message} 마지막 캐시를 표시합니다.`;
  }

  return '동기화에 실패했습니다. 마지막 캐시를 표시합니다.';
};

export default function HomeScreen() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCachedTodos = useCallback(async () => {
    const snapshot = await cache.loadTodos();
    setTodos(snapshot.todos);
    setLastSyncedAt(snapshot.lastSyncedAt);
    await publishTodosToWidget(widgetBridge, snapshot.todos, snapshot.lastSyncedAt, {
      state: getWidgetSnapshotState(snapshot.todos.length, 'ready'),
    });
  }, []);

  const refreshTodos = useCallback(async () => {
    setStatus('syncing');
    setErrorMessage(null);

    await publishTodosToWidget(widgetBridge, todos, lastSyncedAt, {
      state: getWidgetSnapshotState(todos.length, 'syncing'),
    });

    try {
      const result = await syncTodosFromOneDriveWithCacheFallback(source, cache, {
        maxRetries: 2,
        retryDelayMs: 500,
      });
      setTodos(result.todos);
      setLastSyncedAt(result.syncedAt);
      const friendlyError = result.fromCache
        ? '네트워크 문제로 마지막 캐시를 표시합니다.'
        : null;
      await publishTodosToWidget(widgetBridge, result.todos, result.syncedAt, {
        state: getWidgetSnapshotState(result.todos.length, result.fromCache ? 'error' : 'ready'),
        errorMessage: friendlyError,
      });
      setStatus(result.fromCache ? 'error' : 'success');
      setErrorMessage(friendlyError);
    } catch (error) {
      const friendlyError = toUserFriendlyError(error);
      await loadCachedTodos();
      const fallbackSnapshot = await cache.loadTodos();
      await publishTodosToWidget(widgetBridge, fallbackSnapshot.todos, fallbackSnapshot.lastSyncedAt, {
        state: 'error',
        errorMessage: friendlyError,
      });
      setStatus('error');
      setErrorMessage(friendlyError);
    }
  }, [lastSyncedAt, loadCachedTodos, todos]);

  useEffect(() => {
    const initialize = async () => {
      await loadCachedTodos();
      await refreshTodos();
    };

    void initialize();
  }, [loadCachedTodos, refreshTodos]);

  const statusMessage = useMemo(() => {
    switch (status) {
      case 'syncing':
        return '동기화 중...';
      case 'success':
        return 'OneDrive 동기화 성공';
      case 'error':
        return '오프라인/오류 상태 (캐시 표시)';
      default:
        return '대기 중';
    }
  }, [status]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">Joplin TODO 위젯 (MVP)</ThemedText>

          <ThemedView type="backgroundElement" style={styles.statusCard}>
            <ThemedText type="defaultSemiBold">연결 상태</ThemedText>
            <ThemedText>{statusMessage}</ThemedText>
            <ThemedText type="small">마지막 동기화: {formatSyncedAtLabel(lastSyncedAt)}</ThemedText>

            <Pressable style={styles.refreshButton} onPress={() => void refreshTodos()}>
              <ThemedText type="link">수동 새로고침</ThemedText>
            </Pressable>

            {errorMessage ? (
              <ThemedText type="small" themeColor="textSecondary">
                {errorMessage}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView style={styles.listSection}>
            <ThemedText type="subtitle">TODO 목록</ThemedText>
            {todos.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.todoCard}>
                <ThemedText type="small">표시할 TODO가 없습니다.</ThemedText>
              </ThemedView>
            ) : (
              todos.map((todo) => (
                <ThemedView key={todo.id} type="backgroundElement" style={styles.todoCard}>
                  <ThemedText type="defaultSemiBold">{todo.title}</ThemedText>
                  <ThemedText type="small">{formatDueLabel(todo.due)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {todo.completed ? '완료됨' : '진행중'}
                  </ThemedText>
                </ThemedView>
              ))
            )}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  statusCard: {
    padding: Spacing.three,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  listSection: {
    gap: Spacing.two,
  },
  todoCard: {
    padding: Spacing.three,
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
});
