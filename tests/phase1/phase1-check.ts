import assert from 'node:assert/strict';

import { sortTodos } from '@/features/todo/sort';
import type { TodoItem } from '@/features/todo/types';
import { InMemoryTodoCache } from '@/storage/todo-cache';

const sampleTodos: TodoItem[] = [
  {
    id: '3',
    title: 'Alpha',
    completed: false,
    updatedTime: '2026-03-02T10:00:00.000Z',
  },
  {
    id: '2',
    title: 'Bravo',
    completed: false,
    updatedTime: '2026-03-02T09:00:00.000Z',
  },
  {
    id: '1',
    title: 'Charlie',
    completed: false,
    updatedTime: '2026-03-02T11:00:00.000Z',
  },
];

const sorted = sortTodos(sampleTodos);
assert.deepEqual(
  sorted.map((todo: TodoItem) => todo.id),
  ['1', '3', '2'],
  'updatedTime 최신순으로 정렬되어야 합니다.',
);

const run = async () => {
  const cache = new InMemoryTodoCache();
  const syncedAt = '2026-03-02T12:34:56.000Z';
  await cache.saveTodos(sorted, syncedAt);
  const loaded = await cache.loadTodos();

  assert.equal(loaded.lastSyncedAt, syncedAt, '마지막 동기화 시각을 저장해야 합니다.');
  assert.deepEqual(
    loaded.todos.map((todo: TodoItem) => todo.id),
    ['1', '3', '2'],
    '저장한 todo 순서를 유지해서 불러와야 합니다.',
  );

  await cache.clear();
  const cleared = await cache.loadTodos();
  assert.equal(cleared.lastSyncedAt, null, '캐시 clear 후 마지막 동기화 시각은 null이어야 합니다.');
  assert.deepEqual(cleared.todos, [], '캐시 clear 후 todo 목록은 비어야 합니다.');

  console.log('Phase 1 checks passed.');
};

run();
