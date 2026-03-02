import assert from 'node:assert/strict';

import { InMemoryWidgetBridge, publishTodosToWidget } from '@/features/widget/widget-bridge';
import {
  createWidgetSnapshot,
  parseWidgetSnapshot,
  serializeWidgetSnapshot,
} from '@/features/widget/widget-snapshot';
import type { TodoItem } from '@/features/todo/types';

const run = async () => {
  const todos: TodoItem[] = [
    {
      id: 'todo-1',
      title: '문서 정리',
      due: '2026-03-02T10:00:00.000Z',
      completed: false,
      updatedTime: '2026-03-02T08:00:00.000Z',
    },
    {
      id: 'todo-2',
      title: '위젯 UI 확인',
      due: null,
      completed: true,
      updatedTime: '2026-03-02T09:00:00.000Z',
    },
  ];

  const snapshot = createWidgetSnapshot(todos, '2026-03-02T09:30:00.000Z', 1);

  assert.equal(snapshot.version, 1, '위젯 스냅샷 버전이 1이어야 합니다.');
  assert.equal(snapshot.lastSyncedAt, '2026-03-02T09:30:00.000Z');
  assert.equal(snapshot.todos.length, 1, 'maxItems 제한이 반영되어야 합니다.');
  assert.equal(snapshot.todos[0]?.id, 'todo-1');

  const serialized = serializeWidgetSnapshot(snapshot);
  const parsed = parseWidgetSnapshot(serialized);

  assert.deepEqual(parsed, snapshot, '직렬화/역직렬화 시 동일해야 합니다.');

  const bridge = new InMemoryWidgetBridge();
  const published = await publishTodosToWidget(bridge, todos, '2026-03-02T11:00:00.000Z');
  const loaded = await bridge.loadSnapshot();

  assert.ok(loaded, '브리지 저장 후 로드 가능해야 합니다.');
  assert.equal(loaded?.todos.length, 2);
  assert.equal(loaded?.lastSyncedAt, '2026-03-02T11:00:00.000Z');
  assert.deepEqual(loaded, published);

  await bridge.clearSnapshot();
  assert.equal(await bridge.loadSnapshot(), null, 'clear 후 null이어야 합니다.');

  console.log('phase4-check: ok');
};

void run();
