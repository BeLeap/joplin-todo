import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
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
import { syncTodosFromOneDriveWithCacheFallback } from '@/features/sync/sync-todos';
import { sortTodosByDueDate } from '@/features/todo/sort';
import type { TodoItem } from '@/features/todo/types';
import { useOneDriveAuth } from '@/features/sync/use-onedrive-auth';
import { createWidgetBridge } from '@/features/widget/widget-bridge-factory';
import { publishTodosToWidget } from '@/features/widget/widget-bridge';
import { getWidgetSnapshotState } from '@/features/widget/widget-state';
import { useTheme } from '@/hooks/use-theme';
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
    return `${error.message} | 마지막 캐시를 표시합니다.`;
  }

  if (error instanceof Error) {
    return `동기화에 실패했습니다: ${error.message} | 마지막 캐시를 표시합니다.`;
  }

  return `동기화에 실패했습니다: ${String(error)} | 마지막 캐시를 표시합니다.`;
};

export default function HomeScreen() {
  const theme = useTheme();
  const { hasClientId, hasSession, isLoading: isAuthLoading, signIn, signOut, getValidAccessToken } =
    useOneDriveAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<OneDriveSyncProgress | null>(null);
  const [syncStatusDetail, setSyncStatusDetail] = useState<string | null>(null);
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);

  const visibleTodos = useMemo(() => {
    if (!hideCompleted) {
      return todos;
    }

    return todos.filter((todo) => !todo.completed);
  }, [hideCompleted, todos]);

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
      setSyncStatusDetail(null);
      return;
    }

    setStatus('syncing');
    setSyncStatusDetail('동기화 준비 중 (인증 토큰 확인 완료)');
    setErrorMessage(null);
    setSyncProgress(null);

    const cachedSnapshot = await cache.loadTodos();
    setTodos(cachedSnapshot.todos);
    setLastSyncedAt(cachedSnapshot.lastSyncedAt);
    await publishTodosToWidget(widgetBridge, cachedSnapshot.todos, cachedSnapshot.lastSyncedAt, {
      state: getWidgetSnapshotState(cachedSnapshot.todos.length, 'syncing'),
    });

    try {
      setSyncStatusDetail('OneDrive 연결 중...');
      const source = createSyncSource(token);
      const result = await syncTodosFromOneDriveWithCacheFallback(source, cache, {
        maxRetries: 2,
        retryDelayMs: 500,
        onProgress: (progress) => {
          setSyncStatusDetail(
            progress.phase === 'listing'
              ? 'Joplin 원본 파일 목록 확인 중...'
              : '파일을 내려받아 TODO를 파싱 중...',
          );
          setSyncProgress((previousProgress) => ({
            ...progress,
            currentFileName:
              progress.currentFileName ??
              (progress.phase === 'downloading' ? previousProgress?.currentFileName ?? null : null),
          }));
        },
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
      const friendlyError = result.fromCache ? '네트워크 문제로 마지막 캐시를 표시합니다.' : null;
      await publishTodosToWidget(widgetBridge, result.todos, result.syncedAt, {
        state: getWidgetSnapshotState(result.todos.length, result.fromCache ? 'error' : 'ready'),
        errorMessage: friendlyError,
      });
      setStatus(result.fromCache ? 'error' : 'success');
      setErrorMessage(friendlyError);
      setSyncProgress(null);
      setSyncStatusDetail(result.fromCache ? '네트워크 오류로 캐시 결과를 표시 중' : null);
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
      setSyncStatusDetail('오류로 인해 서버 동기화를 중단하고 캐시 데이터를 복원함');
    }
  }, [getValidAccessToken, loadCachedTodos]);

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
      setSyncStatusDetail(null);
      await signIn();
      await refreshTodos();
    } catch (error) {
      setStatus('error');
      setErrorMessage(toUserFriendlyError(error));
      setSyncStatusDetail(null);
    }
  }, [refreshTodos, signIn]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setStatus('idle');
    setErrorMessage(null);
    setSyncStatusDetail(null);
  }, [signOut]);

  const statusHeadline = useMemo(() => {
    switch (status) {
      case 'syncing': {
        return '동기화 중...';
      }
      case 'success':
        return 'OneDrive 동기화 성공';
      case 'error':
        return '오프라인/오류 상태 (캐시 표시)';
      default:
        return '대기 중';
    }
  }, [status]);

  const statusDetail = useMemo(() => {
    if (status === 'syncing') {
      if (!syncProgress) {
        return syncStatusDetail ?? '초기화 단계 진행 중...';
      }

      const { phase, completed, total, currentFileName } = syncProgress;
      if (phase === 'listing') {
        return '파일 목록을 확인하는 중';
      }

      const progressLabel = `진행률 ${Math.min(completed, total)}/${total}`;
      return currentFileName ? `${progressLabel} · ${currentFileName}` : progressLabel;
    }

    if (status === 'error') {
      return errorMessage ?? '오류가 발생했습니다.';
    }

    return null;
  }, [errorMessage, status, syncProgress, syncStatusDetail]);

  const statusBadgeStyle = useMemo(() => {
    if (status === 'success') {
      return { backgroundColor: '#E7F8EE', color: '#0C7A42' };
    }

    if (status === 'error') {
      return { backgroundColor: '#FDECEC', color: '#B42424' };
    }

    if (status === 'syncing') {
      return { backgroundColor: '#E8F0FF', color: '#2A5AC8' };
    }

    return {
      backgroundColor: theme.backgroundElement,
      color: theme.textSecondary,
    };
  }, [status, theme.backgroundElement, theme.textSecondary]);

  const hasSignedInSession = hasSession || process.env.EXPO_PUBLIC_ONEDRIVE_ACCESS_TOKEN?.trim();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView type="backgroundElement" style={styles.headerCard}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Joplin Widget
            </ThemedText>
            <ThemedText style={styles.title}>오늘 할 일을 한눈에</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              OneDrive에 저장된 Joplin 항목을 동기화해 위젯과 앱에서 확인하세요.
            </ThemedText>
            <View style={styles.kpiRow}>
              <ThemedView type="background" style={styles.kpiChip}>
                <ThemedText type="smallBold">항목 {visibleTodos.length}개</ThemedText>
              </ThemedView>
              <ThemedView style={[styles.statusBadge, { backgroundColor: statusBadgeStyle.backgroundColor }]}>
                <ThemedText type="smallBold" style={{ color: statusBadgeStyle.color }}>
                  {status.toUpperCase()}
                </ThemedText>
              </ThemedView>
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.statusCard}>
            <ThemedText type="defaultSemiBold">연결 상태</ThemedText>
            <View style={styles.statusMessageBlock}>
              <ThemedText type="defaultSemiBold">{statusHeadline}</ThemedText>
              {statusDetail ? (
                <ThemedText
                  type="small"
                  style={[styles.statusDetailText, status === 'error' ? styles.statusErrorDetailText : null]}>
                  {statusDetail}
                </ThemedText>
              ) : null}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              마지막 동기화: {formatSyncedAtLabel(lastSyncedAt)}
            </ThemedText>

            <View style={styles.actionRow}>
              {hasSignedInSession ? (
                <>
                  <Pressable style={[styles.actionButton, styles.actionButtonPrimary]} onPress={() => void refreshTodos()}>
                    <ThemedText type="smallBold" style={styles.primaryButtonText}>
                      수동 새로고침
                    </ThemedText>
                  </Pressable>
                  {hasSession ? (
                    <Pressable style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => void handleSignOut()}>
                      <ThemedText type="smallBold">로그아웃</ThemedText>
                    </Pressable>
                  ) : null}
                </>
              ) : (
                <Pressable
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={() => void handleSignIn()}
                  disabled={!hasClientId || isAuthLoading}>
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    {hasClientId ? 'OneDrive 로그인' : 'Client ID 설정 필요'}
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {errorMessage ? (
              <ThemedView style={styles.errorBanner}>
                <ThemedText type="smallBold" style={styles.errorText}>
                  오류 발생
                </ThemedText>
                <ThemedText type="small" style={styles.errorText}>
                  {errorMessage}
                </ThemedText>
              </ThemedView>
            ) : null}
          </ThemedView>

          <ThemedView style={styles.listSection}>
            <View style={styles.listHeaderRow}>
              <ThemedText type="subtitle">목록</ThemedText>
              <Pressable
                style={[styles.filterChip, hideCompleted ? styles.filterChipActive : null]}
                onPress={() => setHideCompleted((previous) => !previous)}>
                <ThemedText
                  type="smallBold"
                  style={hideCompleted ? styles.filterChipTextActive : styles.filterChipTextInactive}>
                  {hideCompleted ? '완료된 항목 보이기' : '완료된 항목 숨기기'}
                </ThemedText>
              </Pressable>
            </View>
            {visibleTodos.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.todoCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  {hideCompleted
                    ? '완료되지 않은 항목이 없습니다. (완료됨 숨김 옵션이 켜져 있습니다.)'
                    : '표시할 항목이 없습니다.'}
                </ThemedText>
              </ThemedView>
            ) : (
              visibleTodos.map((todo) => (
                <ThemedView key={todo.id} type="backgroundElement" style={styles.todoCard}>
                  <ThemedText type="defaultSemiBold">{todo.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatDueLabel(todo.due)}
                  </ThemedText>
                  <ThemedView
                    style={[
                      styles.todoStatus,
                      { backgroundColor: todo.completed ? '#E7F8EE' : Colors.light.backgroundSelected },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: todo.completed ? '#0C7A42' : '#244A8F' }}>
                      {todo.completed ? '완료됨' : '진행중'}
                    </ThemedText>
                  </ThemedView>
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
    paddingBottom: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  headerCard: {
    borderRadius: Spacing.four,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 700,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  kpiChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  statusCard: {
    padding: Spacing.three,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  statusMessageBlock: {
    gap: Spacing.one,
  },
  statusDetailText: {
    color: '#2A5AC8',
    fontSize: 13,
    lineHeight: 18,
  },
  statusErrorDetailText: {
    color: '#B42424',
    fontWeight: 600,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButton: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actionButtonPrimary: {
    backgroundColor: '#2A5AC8',
  },
  actionButtonSecondary: {
    backgroundColor: '#E5E7EB',
  },
  primaryButtonText: {
    color: '#F8FAFC',
  },
  errorBanner: {
    backgroundColor: '#FDECEC',
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  errorText: {
    color: '#B42424',
  },
  listSection: {
    gap: Spacing.two,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    backgroundColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#2A5AC8',
  },
  filterChipTextInactive: {
    color: '#334155',
  },
  filterChipTextActive: {
    color: '#F8FAFC',
  },
  todoCard: {
    padding: Spacing.three,
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
  todoStatus: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    marginTop: Spacing.one,
  },
});
