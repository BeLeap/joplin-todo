import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { EncryptedJoplinSyncError } from '@/features/sync/errors';
import { MockOneDriveJoplinSource } from '@/features/sync/mock-onedrive-source';
import { syncTodosFromOneDrive } from '@/features/sync/sync-todos';
import type { TodoItem } from '@/features/todo/types';
import { InMemoryTodoCache } from '@/storage/todo-cache';

const source = new MockOneDriveJoplinSource();
const cache = new InMemoryTodoCache();

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

export default function HomeScreen() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCachedTodos = useCallback(async () => {
    const snapshot = await cache.loadTodos();
    setTodos(snapshot.todos);
    setLastSyncedAt(snapshot.lastSyncedAt);
  }, []);

  const refreshTodos = useCallback(async () => {
    setStatus('syncing');
    setErrorMessage(null);

    try {
      const result = await syncTodosFromOneDrive(source, cache);
      setTodos(result.todos);
      setLastSyncedAt(result.syncedAt);
      setStatus('success');
    } catch (error) {
      await loadCachedTodos();
      setStatus('error');

      if (error instanceof EncryptedJoplinSyncError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage('동기화에 실패했습니다. 마지막 캐시를 표시합니다.');
    }
  }, [loadCachedTodos]);

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
