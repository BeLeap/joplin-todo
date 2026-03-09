import assert from 'node:assert/strict';

import { getNextWidgetRefreshAt, getWidgetRefreshIntervalMs } from '@/features/widget/widget-refresh-policy';
import { getWidgetSnapshotState } from '@/features/widget/widget-state';
import {
  AsyncStorageWidgetBridge,
  InMemoryWidgetBridge,
  NativeWidgetBridge,
  publishTodosToWidget,
} from '@/features/widget/widget-bridge';
import {
  createWidgetSnapshot,
  parseWidgetSnapshot,
  serializeWidgetSnapshot,
} from '@/features/widget/widget-snapshot';
import { runWidgetRefreshIfDue } from '@/features/widget/widget-refresh-runner';
import type { TodoItem } from '@/features/todo/types';



class MemoryStorage {
  private readonly map = new Map<string, string>();

  async setItem(key: string, value: string) {
    this.map.set(key, value);
  }

  async getItem(key: string) {
    return this.map.get(key) ?? null;
  }

  async removeItem(key: string) {
    this.map.delete(key);
  }
}

const run = async () => {
  const todos: TodoItem[] = [
    {
      id: 'todo-1',
      title: '문서 정리',
      completed: false,
      updatedTime: '2026-03-02T08:00:00.000Z',
    },
    {
      id: 'todo-2',
      title: '위젯 UI 확인',
      completed: true,
      updatedTime: '2026-03-02T09:00:00.000Z',
    },
  ];

  const snapshot = createWidgetSnapshot(todos, '2026-03-02T09:30:00.000Z', 1, 'ready');

  assert.equal(snapshot.version, 1, '위젯 스냅샷 버전이 1이어야 합니다.');
  assert.equal(snapshot.lastSyncedAt, '2026-03-02T09:30:00.000Z');
  assert.equal(snapshot.todos.length, 1, 'maxItems 제한이 반영되어야 합니다.');
  assert.equal(snapshot.state, 'ready');
  assert.equal(snapshot.errorMessage, null);
  assert.equal(snapshot.todos[0]?.id, 'todo-1');

  const serialized = serializeWidgetSnapshot(snapshot);
  const parsed = parseWidgetSnapshot(serialized);

  assert.deepEqual(parsed, snapshot, '직렬화/역직렬화 시 동일해야 합니다.');

  assert.equal(getWidgetRefreshIntervalMs(15), 900000, '분 단위 주기 계산이 맞아야 합니다.');
  assert.equal(getWidgetRefreshIntervalMs(1), 300000, '최소 주기는 5분으로 보정되어야 합니다.');

  assert.equal(getWidgetSnapshotState(3, 'ready'), 'ready');
  assert.equal(getWidgetSnapshotState(0, 'ready'), 'empty');
  assert.equal(getWidgetSnapshotState(0, 'syncing'), 'syncing');
  assert.equal(getWidgetSnapshotState(1, 'error'), 'error');

  const bridge = new InMemoryWidgetBridge();
  const published = await publishTodosToWidget(bridge, todos, '2026-03-02T11:00:00.000Z', {
    refreshIntervalMinutes: 15,
    state: 'ready',
  });
  const loaded = await bridge.loadSnapshot();

  assert.ok(loaded, '브리지 저장 후 로드 가능해야 합니다.');
  assert.equal(loaded?.todos.length, 2);
  assert.equal(loaded?.lastSyncedAt, '2026-03-02T11:00:00.000Z');
  assert.equal(loaded?.state, 'ready');
  assert.deepEqual(loaded, published.snapshot);

  const reparsed = parseWidgetSnapshot(published.serializedSnapshot);
  assert.deepEqual(reparsed, published.snapshot, '발행 결과의 직렬화 데이터가 유효해야 합니다.');

  assert.throws(
    () =>
      parseWidgetSnapshot(
        JSON.stringify({
          version: 1,
          generatedAt: '2026-03-02T09:30:00.000Z',
          lastSyncedAt: null,
          state: 'ready',
          errorMessage: null,
        }),
      ),
    Error,
    '잘못된 스냅샷 스키마는 파싱 실패해야 합니다.',
  );

  const refreshAt = await bridge.loadRefreshRequest();
  assert.ok(refreshAt, '새로고침 요청 시각이 저장되어야 합니다.');
  assert.equal(typeof published.refreshAt, 'string');



  const errorPublished = await publishTodosToWidget(bridge, [], '2026-03-02T11:10:00.000Z', {
    state: 'error',
    errorMessage: '동기화 실패',
  });
  assert.equal(errorPublished.snapshot.state, 'error');
  assert.equal(errorPublished.snapshot.errorMessage, '동기화 실패');

  const errorRefreshAt = getNextWidgetRefreshAt(new Date('2026-03-02T11:00:00.000Z'), 'error', 30);
  assert.equal(errorRefreshAt, '2026-03-02T11:15:00.000Z', '오류 시 다음 실행 주기는 절반으로 단축됩니다.');

  await bridge.clearSnapshot();
  assert.equal(await bridge.loadSnapshot(), null, 'clear 후 null이어야 합니다.');
  assert.equal(await bridge.loadRefreshRequest(), null, 'clear 후 refreshAt은 null이어야 합니다.');

  await bridge.requestRefresh('2026-03-02T11:30:00.000Z');
  await bridge.clearRefreshRequest();
  assert.equal(await bridge.loadRefreshRequest(), null, 'refreshAt만 별도로 clear할 수 있어야 합니다.');



  const storage = new MemoryStorage();
  const storageBridge = new AsyncStorageWidgetBridge(storage);
  await storageBridge.saveSnapshot(snapshot);
  const fromStorage = await storageBridge.loadSnapshot();
  assert.deepEqual(fromStorage, snapshot, 'AsyncStorage 브리지가 스냅샷을 복원해야 합니다.');

  await storageBridge.requestRefresh('2026-03-02T12:00:00.000Z');
  assert.equal(
    await storageBridge.loadRefreshRequest(),
    '2026-03-02T12:00:00.000Z',
    'AsyncStorage 브리지가 refreshAt을 저장해야 합니다.',
  );

  await storageBridge.clearSnapshot();
  assert.equal(await storageBridge.loadSnapshot(), null, 'clear 후 스냅샷이 삭제되어야 합니다.');
  assert.equal(await storageBridge.loadRefreshRequest(), null, 'clear 후 refreshAt이 삭제되어야 합니다.');

  const nativeModuleStore = {
    snapshot: null as string | null,
    refreshAt: null as string | null,
    notifyCalled: false,
  };

  const nativeBridge = new NativeWidgetBridge({
    async saveSnapshot(serializedSnapshot: string) {
      nativeModuleStore.snapshot = serializedSnapshot;
    },
    async loadSnapshot() {
      return nativeModuleStore.snapshot;
    },
    async clearSnapshot() {
      nativeModuleStore.snapshot = null;
      nativeModuleStore.refreshAt = null;
    },
    async requestRefresh(refreshAt: string) {
      nativeModuleStore.refreshAt = refreshAt;
    },
    async loadRefreshRequest() {
      return nativeModuleStore.refreshAt;
    },
    async clearRefreshRequest() {
      nativeModuleStore.refreshAt = null;
    },
    async notifyWidgetDataChanged() {
      nativeModuleStore.notifyCalled = true;
    },
  });

  const nativePublished = await publishTodosToWidget(
    nativeBridge,
    todos,
    '2026-03-02T11:40:00.000Z',
    { state: 'ready' },
  );
  assert.equal(nativeModuleStore.notifyCalled, true, '네이티브 브리지에서는 위젯 갱신 알림을 호출해야 합니다.');
  assert.ok(nativePublished.refreshAt, '네이티브 브리지에서도 refreshAt이 계산되어야 합니다.');

  const dueBridge = new InMemoryWidgetBridge();
  await dueBridge.requestRefresh('2026-03-02T10:00:00.000Z');

  const result = await runWidgetRefreshIfDue(
    {
      async listJoplinItems() {
        return [
          {
            id: 'todo-3',
            title: 'Run refresh',
            type_: 1,
            is_todo: 1,
            todo_completed: 0,
            updated_time: Date.parse('2026-03-02T09:00:00.000Z'),
            encryption_applied: 0,
          },
        ];
      },
    },
    new MemoryTodoCache(),
    dueBridge,
    { now: new Date('2026-03-02T10:01:00.000Z') },
  );

  assert.equal(result.status, 'synced', 'refreshAt이 도래한 경우 동기화가 실행되어야 합니다.');
  const dueSnapshot = await dueBridge.loadSnapshot();
  assert.equal(dueSnapshot?.todos.length, 1);

  const notDueBridge = new InMemoryWidgetBridge();
  await notDueBridge.requestRefresh('2026-03-02T11:00:00.000Z');
  const notDueResult = await runWidgetRefreshIfDue(
    {
      async listJoplinItems() {
        throw new Error('not expected');
      },
    },
    new MemoryTodoCache(),
    notDueBridge,
    { now: new Date('2026-03-02T10:30:00.000Z') },
  );
  assert.equal(notDueResult.status, 'skipped');
  assert.equal(notDueResult.reason, 'not-due-yet');

  console.log('phase4-check: ok');
};

class MemoryTodoCache {
  private todos: TodoItem[] = [];

  private lastSyncedAt: string | null = null;

  private checkpoint: { modifiedSince: string | null; completed: number; parsedTodos: TodoItem[] } | null =
    null;

  async saveTodos(todos: TodoItem[], syncedAt: string) {
    this.todos = [...todos];
    this.lastSyncedAt = syncedAt;
  }

  async loadTodos() {
    return {
      todos: [...this.todos],
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  async clear() {
    this.todos = [];
    this.lastSyncedAt = null;
    this.checkpoint = null;
  }

  async saveSyncCheckpoint(checkpoint: {
    modifiedSince: string | null;
    completed: number;
    parsedTodos: TodoItem[];
  }) {
    this.checkpoint = {
      ...checkpoint,
      parsedTodos: [...checkpoint.parsedTodos],
    };
  }

  async loadSyncCheckpoint() {
    if (!this.checkpoint) {
      return null;
    }

    return {
      ...this.checkpoint,
      parsedTodos: [...this.checkpoint.parsedTodos],
    };
  }

  async clearSyncCheckpoint() {
    this.checkpoint = null;
  }
}

void run();
