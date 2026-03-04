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
import {
  GraphOneDriveJoplinSource,
  type OneDriveJoplinSource,
  type OneDriveSyncProgress,
} from '@/features/sync/onedrive-source';
import { useOneDriveAuth } from '@/features/sync/use-onedrive-auth';
import { syncTodosFromOneDriveWithCacheFallback } from '@/features/sync/sync-todos';
import { publishTodosToWidget } from '@/features/widget/widget-bridge';
import { createWidgetBridge } from '@/features/widget/widget-bridge-factory';
import { getWidgetSnapshotState } from '@/features/widget/widget-state';
import type { TodoItem } from '@/features/todo/types';
import { sortTodosByDueDate } from '@/features/todo/sort';
import { AsyncStorageTodoCache } from '@/storage/todo-cache';

const createSyncSource = (token: string): OneDriveJoplinSource => new GraphOneDriveJoplinSource(token);
const cache = new AsyncStorageTodoCache();
const widgetBridge = createWidgetBridge();

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
  const { hasClientId, hasSession, isLoading: isAuthLoading, signIn, signOut, getValidAccessToken } =
    useOneDriveAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<OneDriveSyncProgress | null>(null);

  const loadCachedTodos = useCallback(async () => {
    const snapshot = await cache.loadTodos();
    setTodos(snapshot.todos);
    setLastSyncedAt(snapshot.lastSyncedAt);
    await publishTodosToWidget(widgetBridge, snapshot.todos, snapshot.lastSyncedAt, {
      state: getWidgetSnapshotState(snapshot.todos.length, 'ready'),
    });
  }, []);

  const refreshTodos = useCallback(async () => {
    const envToken = process.env.EXPO_PUBLIC_ONEDRIVE_ACCESS_TOKEN?.trim() || null;
    const sessionToken = await getValidAccessToken();
    const token = sessionToken ?? envToken;

    if (!token) {
      setStatus('error');
      setErrorMessage('OneDrive 로그인이 필요합니다.');
      return;
    }

    setStatus('syncing');
    setErrorMessage(null);
    setSyncProgress(null);
    setTodos([]);

    await publishTodosToWidget(widgetBridge, todos, lastSyncedAt, {
      state: getWidgetSnapshotState(todos.length, 'syncing'),
    });

    try {
      const source = createSyncSource(token);
      const result = await syncTodosFromOneDriveWithCacheFallback(source, cache, {
        maxRetries: 2,
        retryDelayMs: 500,
        onProgress: (progress) =>
          setSyncProgress((previousProgress) => ({
            ...progress,
            currentFileName:
              progress.currentFileName ??
              (progress.phase === 'downloading' ? previousProgress?.currentFileName ?? null : null),
          })),
        onTodoParsed: (todo) => {
          setTodos((previousTodos) =>
            sortTodosByDueDate([
              ...previousTodos.filter((previousTodo) => previousTodo.id !== todo.id),
              todo,
            ]),
          );
        },
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
      setSyncProgress(null);
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
      setSyncProgress(null);
    }
  }, [getValidAccessToken, lastSyncedAt, loadCachedTodos, todos]);

  useEffect(() => {
    const initialize = async () => {
      await loadCachedTodos();
      if (process.env.EXPO_PUBLIC_ONEDRIVE_ACCESS_TOKEN?.trim() || hasSession) {
        await refreshTodos();
      }
    };

    void initialize();
  }, [hasSession, loadCachedTodos, refreshTodos]);


  const handleSignIn = useCallback(async () => {
    try {
      setErrorMessage(null);
      await signIn();
      await refreshTodos();
    } catch (error) {
      setStatus('error');
      setErrorMessage(toUserFriendlyError(error));
    }
  }, [refreshTodos, signIn]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setStatus('idle');
    setErrorMessage(null);
  }, [signOut]);

  const statusMessage = useMemo(() => {
    switch (status) {
      case 'syncing': {
        if (!syncProgress) {
          return '동기화 중...';
        }

        const { phase, completed, total, currentFileName } = syncProgress;

        if (phase === 'listing') {
          return '동기화 중... 파일 목록을 확인하는 중';
        }

        const progressLabel = `(${Math.min(completed, total)}/${total})`;
        const fileLabel = currentFileName ? ` ${currentFileName}` : '';
        return `동기화 중... ${progressLabel}${fileLabel}`;
      }
      case 'success':
        return 'OneDrive 동기화 성공';
      case 'error':
        return '오프라인/오류 상태 (캐시 표시)';
      default:
        return '대기 중';
    }
  }, [status, syncProgress]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">Joplin TODO 위젯 (MVP)</ThemedText>

          <ThemedView type="backgroundElement" style={styles.statusCard}>
            <ThemedText type="defaultSemiBold">연결 상태</ThemedText>
            <ThemedText>{statusMessage}</ThemedText>
            <ThemedText type="small">마지막 동기화: {formatSyncedAtLabel(lastSyncedAt)}</ThemedText>

            {hasSession || process.env.EXPO_PUBLIC_ONEDRIVE_ACCESS_TOKEN?.trim() ? (
              <>
                <Pressable style={styles.refreshButton} onPress={() => void refreshTodos()}>
                  <ThemedText type="link">수동 새로고침</ThemedText>
                </Pressable>
                {hasSession ? (
                  <Pressable style={styles.refreshButton} onPress={() => void handleSignOut()}>
                    <ThemedText type="link">로그아웃</ThemedText>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Pressable
                style={styles.refreshButton}
                onPress={() => void handleSignIn()}
                disabled={!hasClientId || isAuthLoading}
              >
                <ThemedText type="link">{hasClientId ? 'OneDrive 로그인' : 'Client ID 설정 필요'}</ThemedText>
              </Pressable>
            )}

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
