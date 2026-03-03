import assert from 'node:assert/strict';

import { EncryptedJoplinSyncError, OneDriveNetworkError } from '@/features/sync/errors';
import { normalizeJoplinTodos } from '@/features/sync/joplin-todo-normalizer';
import { MockOneDriveJoplinSource } from '@/features/sync/mock-onedrive-source';
import { GraphOneDriveJoplinSource, __private__, type OneDriveJoplinSource } from '@/features/sync/onedrive-source';
import { syncTodosFromOneDrive, syncTodosFromOneDriveWithCacheFallback } from '@/features/sync/sync-todos';
import { InMemoryTodoCache } from '@/storage/todo-cache';

class FlakySource implements OneDriveJoplinSource {
  private attempt = 0;

  async listJoplinItems() {
    this.attempt += 1;

    if (this.attempt === 1) {
      throw new OneDriveNetworkError('temporary');
    }

    return [
      {
        id: 'todo-retry',
        title: 'retry success',
        type_: 1,
        is_todo: 1,
        todo_due: 0,
        todo_completed: 0,
        updated_time: Date.now(),
        encryption_applied: 0,
      },
    ];
  }
}

class AlwaysFailNetworkSource implements OneDriveJoplinSource {
  async listJoplinItems() {
    throw new OneDriveNetworkError('offline');
  }
}

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

  const parsed = normalizeJoplinTodos([
    {
      id: 'todo-malformed',
      title: ' ',
      type_: 1,
      is_todo: 1,
      todo_due: Number.NaN,
      todo_completed: 1,
      updated_time: Number.NaN,
      encryption_applied: 0,
    },
  ]);
  const parsedFromTodoFlag = normalizeJoplinTodos([
    {
      id: 'todo-flagged',
      title: 'Legacy todo flag item',
      type_: 1,
      is_todo: 1,
      todo_due: 0,
      todo_completed: 0,
      updated_time: Date.now(),
      encryption_applied: 0,
    },
  ]);
  assert.equal(parsedFromTodoFlag.length, 1, 'is_todo 플래그가 있으면 todo로 처리해야 합니다.');
  assert.equal(parsed[0]?.title, '(제목 없음)', '빈 제목은 기본 텍스트를 사용해야 합니다.');
  assert.equal(parsed[0]?.due, null, '비정상 due 값은 null 처리해야 합니다.');



  const parsedFromMetadata = __private__.parseJoplinMetadata(`Hello, World!
id: meta-1
parent_id: root
is_todo: 1
todo_due: not-a-number
todo_completed: 0
updated_time: 1700000000000
encryption_applied: 0

Body`);
  assert.ok(parsedFromMetadata, '메타데이터 파싱 결과가 있어야 합니다.');
  assert.equal(parsedFromMetadata?.id, 'meta-1');
  assert.equal(parsedFromMetadata?.title, 'Hello, World!', '첫 줄을 제목으로 파싱해야 합니다.');
  assert.equal(parsedFromMetadata?.todo_due, 0, '잘못된 숫자 필드는 0으로 보정해야 합니다.');

  const parsedTodoFlagMetadata = __private__.parseJoplinMetadata(`id: meta-flag-1
title: Metadata todo via flag
type_: 1
is_todo: 1
todo_due: 0
todo_completed: 0
updated_time: 1700000000000
encryption_applied: 0

Body`);
  assert.equal(parsedTodoFlagMetadata?.is_todo, 1, 'is_todo 필드를 파싱해야 합니다.');

  const missingId = __private__.parseJoplinMetadata('title: no-id\ntype_: 13\n\nBody');
  assert.equal(missingId, null, 'id가 없는 메타데이터는 무시해야 합니다.');

  const flakyCache = new InMemoryTodoCache();
  const flakyResult = await syncTodosFromOneDrive(new FlakySource(), flakyCache, {
    maxRetries: 1,
    retryDelayMs: 1,
  });
  assert.equal(flakyResult.todos[0]?.id, 'todo-retry', '네트워크 오류는 재시도 후 성공해야 합니다.');

  await flakyCache.saveTodos(flakyResult.todos, flakyResult.syncedAt);
  const fallbackResult = await syncTodosFromOneDriveWithCacheFallback(
    new AlwaysFailNetworkSource(),
    flakyCache,
    {
      maxRetries: 0,
    },
  );
  assert.equal(fallbackResult.fromCache, true, '네트워크 실패 시 마지막 성공 캐시를 반환해야 합니다.');
  assert.equal(fallbackResult.todos[0]?.id, 'todo-retry');
  assert.equal(
    fallbackResult.syncedAt,
    flakyResult.syncedAt,
    '캐시 fallback 시 마지막 성공 동기화 시각을 유지해야 합니다.',
  );

  const originalFetch = globalThis.fetch;
  let graphAttempt = 0;
  globalThis.fetch = (async (input) => {
    const requestUrl = typeof input === 'string' ? input : input.url;
    graphAttempt += 1;

    if (graphAttempt === 1) {
      return new Response(JSON.stringify({ error: { code: 'tooManyRequests' } }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (requestUrl.endsWith('/content')) {
      return new Response(
        `from graph
id: todo-graph
type_: 1
is_todo: 1
todo_due: 0
todo_completed: 0
updated_time: 1700000000000
encryption_applied: 0

Body`,
        {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        },
      );
    }

    return new Response(
      JSON.stringify({
        value: [
          {
            id: 'item-1',
            name: 'todo.md',
            file: {},
          },
        ],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  const graphSource = new GraphOneDriveJoplinSource('fake-token', {
    maxRetries: 1,
    baseDelayMs: 1,
  });
  const graphItems = await graphSource.listJoplinItems();
  assert.equal(graphAttempt, 3, '429 응답은 지수 백오프로 재시도 후 성공해야 합니다.');
  assert.equal(graphItems.length, 1);

  globalThis.fetch = originalFetch;

  console.log('Phase 2 checks passed.');
};

run();
