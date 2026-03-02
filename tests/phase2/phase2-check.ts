import assert from 'node:assert/strict';

import { EncryptedJoplinSyncError } from '@/features/sync/errors';
import { normalizeJoplinTodos } from '@/features/sync/joplin-todo-normalizer';
import { MockOneDriveJoplinSource } from '@/features/sync/mock-onedrive-source';
import { syncTodosFromOneDrive } from '@/features/sync/sync-todos';
import { InMemoryTodoCache } from '@/storage/todo-cache';

const run = async () => {
  const cache = new InMemoryTodoCache();
  const source = new MockOneDriveJoplinSource();

  const result = await syncTodosFromOneDrive(source, cache);
  assert.equal(result.todos.length, 2, 'TODO 타입만 동기화되어야 합니다.');
  assert.equal(result.todos[0]?.id, 'todo-1', '마감일이 있는 todo가 먼저 와야 합니다.');

  const cached = await cache.loadTodos();
  assert.equal(cached.todos.length, 2, '동기화 결과를 캐시에 저장해야 합니다.');
  assert.equal(cached.lastSyncedAt, result.syncedAt, '동기화 시각을 캐시에 저장해야 합니다.');

  assert.throws(
    () =>
      normalizeJoplinTodos([
        {
          id: 'enc-1',
          title: 'Encrypted todo',
          type_: 13,
          todo_due: 0,
          todo_completed: 0,
          updated_time: Date.now(),
          encryption_applied: 1,
        },
      ]),
    EncryptedJoplinSyncError,
    '암호화된 데이터는 예외 처리해야 합니다.',
  );

  console.log('Phase 2 checks passed.');
};

run();
