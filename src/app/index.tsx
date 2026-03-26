import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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
import { sortTodos } from '@/features/todo/sort';
import type { TodoItem } from '@/features/todo/types';
import { useOneDriveAuth } from '@/features/sync/use-onedrive-auth';
import { createWidgetBridge } from '@/features/widget/widget-bridge-factory';
import { publishTodosToWidget } from '@/features/widget/widget-bridge';
import { getWidgetSnapshotState } from '@/features/widget/widget-state';
import { requestJoplinHomeWidgetUpdate } from '@/features/widget/android-home-widget';
import { useTheme } from '@/hooks/use-theme';
import { AsyncStorageTodoCache } from '@/storage/todo-cache';

const createSyncSource = (token: string): OneDriveJoplinSource => new GraphOneDriveJoplinSource(token);
const cache = new AsyncStorageTodoCache();
const widgetBridge = createWidgetBridge();

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

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
  const [isStatusCardCollapsed, setIsStatusCardCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const refreshAndroidHomeWidget = useCallback(
    async (reason: string) => {
      try {
        await requestJoplinHomeWidgetUpdate();
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`[widget-update-failed:${reason}]`, error);
        setStatus('error');
        setErrorMessage(`홈 위젯 업데이트 실패(${reason}): ${detail}`);
      }
    },
    [setErrorMessage, setStatus],
  );

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

    await refreshAndroidHomeWidget('load-cached-todos');
  }, [refreshAndroidHomeWidget]);

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
    setSyncStatusDetail('준비 중');
    setErrorMessage(null);
    setSyncProgress(null);

    const cachedSnapshot = await cache.loadTodos();
    setTodos(cachedSnapshot.todos);
    setLastSyncedAt(cachedSnapshot.lastSyncedAt);
    await publishTodosToWidget(widgetBridge, cachedSnapshot.todos, cachedSnapshot.lastSyncedAt, {
      state: getWidgetSnapshotState(cachedSnapshot.todos.length, 'syncing'),
    });
    await refreshAndroidHomeWidget('pre-sync-cache');

    try {
      setSyncStatusDetail('연결 중');
      const source = createSyncSource(token);
      const result = await syncTodosFromOneDriveWithCacheFallback(source, cache, {
        maxRetries: 2,
        retryDelayMs: 500,
        onProgress: (progress) => {
          setSyncStatusDetail(
            progress.phase === 'listing' ? '목록 확인 중' : '파일 처리 중',
          );
          setSyncProgress(progress);
        },
        onTodoParsed: (todo) => {
          setTodos((previousTodos) =>
            sortTodos([
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
      await refreshAndroidHomeWidget('sync-result');
      setStatus(result.fromCache ? 'error' : 'success');
      setErrorMessage(friendlyError);
      setSyncProgress(null);
      setSyncStatusDetail(result.fromCache ? '캐시 표시 중' : null);
    } catch (error) {
      const friendlyError = toUserFriendlyError(error);
      await loadCachedTodos();
      const fallbackSnapshot = await cache.loadTodos();
      await publishTodosToWidget(widgetBridge, fallbackSnapshot.todos, fallbackSnapshot.lastSyncedAt, {
        state: 'error',
        errorMessage: friendlyError,
      });
      await refreshAndroidHomeWidget('sync-fallback-error');
      setStatus('error');
      setErrorMessage(friendlyError);
      setSyncProgress(null);
      setSyncStatusDetail('캐시로 복구됨');
    }
  }, [getValidAccessToken, loadCachedTodos, refreshAndroidHomeWidget]);

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
      case 'syncing':
        return '동기화 중';
      case 'success':
        return '동기화 완료';
      case 'error':
        return '오류 · 캐시 표시';
      default:
        return '대기';
    }
  }, [status]);

  const statusDetail = useMemo(() => {
    if (status === 'syncing') {
      if (!syncProgress) {
        return syncStatusDetail ?? '진행 중';
      }

      const { phase, completed, total } = syncProgress;
      if (phase === 'listing') {
        return '목록 확인 중';
      }

      return `${Math.min(completed, total)}/${total} 파일 처리`;
    }

    if (status === 'error') {
      return errorMessage ?? '오류가 발생했습니다.';
    }

    return null;
  }, [errorMessage, status, syncProgress, syncStatusDetail]);

  const statusBadgeStyle = useMemo(() => {
    if (status === 'success') {
      return { backgroundColor: theme.text, color: theme.background };
    }

    if (status === 'error') {
      return { backgroundColor: theme.text, color: theme.background };
    }

    if (status === 'syncing') {
      return { backgroundColor: theme.text, color: theme.background };
    }

    return {
      backgroundColor: theme.backgroundElement,
      color: theme.textSecondary,
    };
  }, [status, theme.background, theme.backgroundElement, theme.text, theme.textSecondary]);

  const compactStatusLabel = useMemo(() => {
    if (status === 'syncing') {
      if (!syncProgress || syncProgress.phase === 'listing' || syncProgress.total <= 0) {
        return '동기화 0%';
      }

      const percentage = Math.round((Math.min(syncProgress.completed, syncProgress.total) / syncProgress.total) * 100);
      return `동기화 ${percentage}%`;
    }

    if (status === 'success') {
      return '동기화 완료';
    }

    if (status === 'error') {
      return '동기화 오류';
    }

    return '동기화 대기';
  }, [status, syncProgress]);

  const uiColors = useMemo(() => ({
    line: theme.text,
    elevatedSurface: theme.background,
    invertedSurface: theme.text,
    invertedText: theme.background,
    statusDetail: status === 'error' ? theme.text : theme.textSecondary,
  }), [status, theme.background, theme.text, theme.textSecondary]);

  const COLLAPSE_ENTER_Y = 36;
  const COLLAPSE_EXIT_Y = 12;
  const MIN_DIRECTION_CHANGE_Y = 4;
  const lastScrollYRef = useRef(0);
  const statusCardCollapsedRef = useRef(isStatusCardCollapsed);

  useEffect(() => {
    statusCardCollapsedRef.current = isStatusCardCollapsed;
  }, [isStatusCardCollapsed]);

  const setCollapsedWithAnimation = useCallback((nextCollapsed: boolean) => {
    setIsStatusCardCollapsed((previousCollapsed) => {
      if (previousCollapsed === nextCollapsed) {
        return previousCollapsed;
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      return nextCollapsed;
    });
  }, []);

  const commitCollapseStateForOffset = useCallback(
    (offsetY: number, deltaY: number) => {
      const y = Math.max(0, offsetY);
      const isCollapsed = statusCardCollapsedRef.current;

      if (!isCollapsed && y >= COLLAPSE_ENTER_Y && deltaY > MIN_DIRECTION_CHANGE_Y) {
        setCollapsedWithAnimation(true);
        return;
      }

      if (isCollapsed && y <= COLLAPSE_EXIT_Y && deltaY < -MIN_DIRECTION_CHANGE_Y) {
        setCollapsedWithAnimation(false);
      }
    },
    [setCollapsedWithAnimation],
  );

  const handleTodoListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextY = Math.max(0, event.nativeEvent.contentOffset.y);
      const previousY = lastScrollYRef.current;
      const deltaY = nextY - previousY;

      lastScrollYRef.current = nextY;
      commitCollapseStateForOffset(nextY, deltaY);
    },
    [commitCollapseStateForOffset],
  );

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = Math.max(0, event.nativeEvent.contentOffset.y);
      const deltaY = y - lastScrollYRef.current;
      lastScrollYRef.current = y;

      if (y <= COLLAPSE_EXIT_Y) {
        setCollapsedWithAnimation(false);
        return;
      }

      if (y >= COLLAPSE_ENTER_Y) {
        setCollapsedWithAnimation(true);
        return;
      }

      commitCollapseStateForOffset(y, deltaY);
    },
    [commitCollapseStateForOffset, setCollapsedWithAnimation],
  );

  const styles = useMemo(() => createStyles(uiColors), [uiColors]);

  const hasSignedInSession = hasSession || process.env.EXPO_PUBLIC_ONEDRIVE_ACCESS_TOKEN?.trim();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screenContent}>
          <View style={styles.headerSection}>
            <View style={styles.titleRow}>
              <ThemedText style={styles.title}>오늘 할 일</ThemedText>
              {isStatusCardCollapsed ? (
                <ThemedView style={styles.compactStatusBadge}>
                  <ThemedText type="smallBold" style={styles.compactStatusText}>
                    {compactStatusLabel}
                  </ThemedText>
                </ThemedView>
              ) : null}
            </View>
          </View>

          {isStatusCardCollapsed ? null : (
            <ThemedView type="backgroundElement" style={styles.statusCard}>
              <View style={styles.statusCardHeaderRow}>
                <ThemedText type="defaultSemiBold">동기화 상태</ThemedText>
                <View style={styles.kpiRow}>
                  <ThemedView type="background" style={styles.kpiChip}>
                    <ThemedText type="smallBold">항목 {visibleTodos.length}개</ThemedText>
                  </ThemedView>
                  <ThemedView style={[styles.statusBadge, { backgroundColor: statusBadgeStyle.backgroundColor }]}>
                    <ThemedText type="smallBold" style={{ color: statusBadgeStyle.color }}>
                      {statusHeadline}
                    </ThemedText>
                  </ThemedView>
                </View>
              </View>
              <View style={styles.statusMessageBlock}>
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
                        <ThemedText type="smallBold" style={styles.secondaryButtonText}>
                          로그아웃
                        </ThemedText>
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
          )}

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
            <ScrollView
              style={styles.todoListScrollArea}
              contentContainerStyle={styles.todoListContent}
              nestedScrollEnabled
              onScroll={handleTodoListScroll}
              onMomentumScrollEnd={handleScrollEnd}
              onScrollEndDrag={handleScrollEnd}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator>
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
                    <ThemedView
                      style={[
                        styles.todoStatus,
                        { backgroundColor: todo.completed ? uiColors.invertedSurface : uiColors.elevatedSurface },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={{ color: todo.completed ? uiColors.invertedText : uiColors.line }}>
                        {todo.completed ? '완료됨' : '진행중'}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                ))
              )}
            </ScrollView>
          </ThemedView>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (uiColors: {
  line: string;
  elevatedSurface: string;
  invertedSurface: string;
  invertedText: string;
  statusDetail: string;
}) => StyleSheet.create({
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
  screenContent: {
    flex: 1,
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  headerSection: {
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  compactStatusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: uiColors.line,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    backgroundColor: uiColors.invertedSurface,
  },
  compactStatusText: {
    color: uiColors.invertedText,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  kpiChip: {
    borderRadius: 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  statusCard: {
    padding: Spacing.three,
    borderRadius: 6,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  statusCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  statusMessageBlock: {
    gap: Spacing.one,
  },
  statusDetailText: {
    color: uiColors.statusDetail,
    fontSize: 13,
    lineHeight: 18,
  },
  statusErrorDetailText: {
    color: uiColors.statusDetail,
    fontWeight: 700,
    textDecorationLine: 'underline',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButton: {
    borderRadius: 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  actionButtonPrimary: {
    backgroundColor: uiColors.invertedSurface,
  },
  actionButtonSecondary: {
    backgroundColor: uiColors.elevatedSurface,
  },
  primaryButtonText: {
    color: uiColors.invertedText,
  },
  secondaryButtonText: {
    color: uiColors.line,
  },
  errorBanner: {
    backgroundColor: uiColors.elevatedSurface,
    borderRadius: 4,
    padding: Spacing.two,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  errorText: {
    color: uiColors.line,
  },
  listSection: {
    gap: Spacing.two,
    flex: 1,
  },
  todoListScrollArea: {
    flex: 1,
  },
  todoListContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  filterChip: {
    borderRadius: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    backgroundColor: uiColors.elevatedSurface,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  filterChipActive: {
    backgroundColor: uiColors.invertedSurface,
  },
  filterChipTextInactive: {
    color: uiColors.line,
  },
  filterChipTextActive: {
    color: uiColors.invertedText,
  },
  todoCard: {
    padding: Spacing.three,
    borderRadius: 6,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  todoStatus: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    marginTop: Spacing.one,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
});
