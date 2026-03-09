import assert from 'node:assert/strict';

import { EncryptedJoplinSyncError, OneDriveNetworkError } from '@/features/sync/errors';
import { normalizeJoplinTodos } from '@/features/sync/joplin-todo-normalizer';
import { MockOneDriveJoplinSource } from '@/features/sync/mock-onedrive-source';
import {
  GraphOneDriveJoplinSource,
  __private__,
  type OneDriveJoplinSource,
  type OneDriveSyncProgress,
} from '@/features/sync/onedrive-source';
import { syncTodosFromOneDrive, syncTodosFromOneDriveWithCacheFallback } from '@/features/sync/sync-todos';
import type { JoplinRawTodo } from '@/features/sync/types';
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
        todo_completed: 0,
        updated_time: Date.now(),
        encryption_applied: 0,
      },
    ];
  }
}

class AlwaysFailNetworkSource implements OneDriveJoplinSource {
  async listJoplinItems(
    _onProgress?: (progress: OneDriveSyncProgress) => void,
  ): Promise<JoplinRawTodo[]> {
    throw new OneDriveNetworkError('offline');
  }
}

class IncrementalSource implements OneDriveJoplinSource {
  readonly incrementalMode = 'modifiedSince' as const;

  async listJoplinItems(
    _onProgress?: (progress: OneDriveSyncProgress) => void,
    _onItem?: (item: JoplinRawTodo) => void,
    options?: { modifiedSince?: string | null },
  ) {
    if (!options?.modifiedSince) {
      return [
        {
          id: 'todo-existing',
          title: 'Existing todo',
          type_: 1,
          is_todo: 1,
          todo_completed: 0,
          updated_time: Date.now(),
          encryption_applied: 0,
        },
      ];
    }

    return [
      {
        id: 'todo-new',
        title: 'New todo',
        type_: 1,
        is_todo: 1,
        todo_completed: 0,
        updated_time: Date.now(),
        encryption_applied: 0,
      },
    ];
  }
}


class CheckpointSpyCache extends InMemoryTodoCache {
  public saveCalls = 0;
  public checkpoints: { modifiedSince: string | null; completed: number; parsedTodos: string[] }[] = [];

  override async saveSyncCheckpoint(checkpoint: {
    modifiedSince: string | null;
    completed: number;
    parsedTodos: import('@/features/todo/types').TodoItem[];
  }) {
    this.saveCalls += 1;
    this.checkpoints.push({
      modifiedSince: checkpoint.modifiedSince,
      completed: checkpoint.completed,
      parsedTodos: checkpoint.parsedTodos.map((todo) => todo.id),
    });
    await super.saveSyncCheckpoint(checkpoint);
  }
}

class TwoItemSource implements OneDriveJoplinSource {
  async listJoplinItems(
    onProgress?: (progress: OneDriveSyncProgress) => void | Promise<void>,
    onItem?: (item: JoplinRawTodo) => void | Promise<void>,
  ): Promise<JoplinRawTodo[]> {
    const items: JoplinRawTodo[] = [
      {
        id: 'todo-checkpoint-1',
        title: 'checkpoint 1',
        type_: 1,
        is_todo: 1,
        todo_completed: 0,
        updated_time: Date.now(),
        encryption_applied: 0,
      },
      {
        id: 'todo-checkpoint-2',
        title: 'checkpoint 2',
        type_: 1,
        is_todo: 1,
        todo_completed: 0,
        updated_time: Date.now(),
        encryption_applied: 0,
      },
    ];

    await onProgress?.({ phase: 'downloading', currentFileName: 'todo-checkpoint-1.md', completed: 0, total: 2 });
    await onItem?.(items[0]!);
    await onProgress?.({ phase: 'downloading', currentFileName: 'todo-checkpoint-1.md', completed: 1, total: 2 });

    await onProgress?.({ phase: 'downloading', currentFileName: 'todo-checkpoint-2.md', completed: 1, total: 2 });
    await onItem?.(items[1]!);
    await onProgress?.({ phase: 'downloading', currentFileName: 'todo-checkpoint-2.md', completed: 2, total: 2 });

    return items;
  }
}

class ResumableSource implements OneDriveJoplinSource {
  private firstAttemptDone = false;
  public readonly resumeOptions: number[] = [];

  async listJoplinItems(
    onProgress?: (progress: OneDriveSyncProgress) => void,
    onItem?: (item: JoplinRawTodo) => void,
    options?: { modifiedSince?: string | null; resumeFromCompleted?: number },
  ): Promise<JoplinRawTodo[]> {
    const resumeFromCompleted = options?.resumeFromCompleted ?? 0;
    this.resumeOptions.push(resumeFromCompleted);

    if (!this.firstAttemptDone) {
      this.firstAttemptDone = true;
      onProgress?.({ phase: 'downloading', currentFileName: 'todo-1.md', completed: 0, total: 2 });
      onItem?.({
        id: 'todo-resume-1',
        title: 'Resume 1',
        type_: 1,
        is_todo: 1,
        todo_completed: 0,
        updated_time: Date.now(),
        encryption_applied: 0,
      });
      onProgress?.({ phase: 'downloading', currentFileName: 'todo-1.md', completed: 1, total: 2 });
      throw new OneDriveNetworkError('download interrupted');
    }

    assert.equal(resumeFromCompleted, 1, '재시작 시 완료한 파일 수부터 이어받아야 합니다.');

    return [
      {
        id: 'todo-resume-2',
        title: 'Resume 2',
        type_: 1,
        is_todo: 1,
        todo_completed: 0,
        updated_time: Date.now(),
        encryption_applied: 0,
      },
    ];
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
      todo_completed: 0,
      updated_time: Date.now(),
      encryption_applied: 0,
    },
  ]);
  assert.equal(parsedFromTodoFlag.length, 1, 'is_todo 플래그가 있으면 todo로 처리해야 합니다.');
  assert.equal(parsed[0]?.title, '(제목 없음)', '빈 제목은 기본 텍스트를 사용해야 합니다.');



  const parsedFromMetadata = __private__.parseJoplinMetadata(`Hello, World!
id: meta-1
parent_id: root
is_todo: 1
todo_completed: 0
updated_time: 1700000000000
encryption_applied: 0

Body`);
  assert.ok(parsedFromMetadata, '메타데이터 파싱 결과가 있어야 합니다.');
  assert.equal(parsedFromMetadata?.id, 'meta-1');
  assert.equal(parsedFromMetadata?.title, 'Hello, World!', '첫 줄을 제목으로 파싱해야 합니다.');
  assert.equal(
    parsedFromMetadata?.updated_time,
    1700000000000,
    'updated_time 숫자 필드를 파싱해야 합니다.',
  );

  const parsedTodoFlagMetadata = __private__.parseJoplinMetadata(`id: meta-flag-1
title: Metadata todo via flag
type_: 1
is_todo: 1
todo_completed: 0
updated_time: 1700000000000
encryption_applied: 0

Body`);
  assert.equal(parsedTodoFlagMetadata?.is_todo, 1, 'is_todo 필드를 파싱해야 합니다.');
  assert.equal(
    parsedTodoFlagMetadata?.title,
    'Metadata todo via flag',
    '메타데이터가 먼저 시작되는 파일은 title 필드를 제목으로 사용해야 합니다.',
  );

  const parsedFromBodyThenMetadata = __private__.parseJoplinMetadata(`Body line 1
Body line 2

id: body-meta-1
type_: 1
is_todo: 1
todo_completed: 0
updated_time: 2026-03-04T05:18:43.454Z
encryption_applied: 0`);
  assert.ok(parsedFromBodyThenMetadata, '본문 뒤 메타데이터 형식도 파싱해야 합니다.');
  assert.equal(parsedFromBodyThenMetadata?.id, 'body-meta-1');
  assert.equal(parsedFromBodyThenMetadata?.is_todo, 1);
  assert.equal(
    parsedFromBodyThenMetadata?.updated_time,
    Date.parse('2026-03-04T05:18:43.454Z'),
    'ISO 시간 형식의 updated_time도 파싱해야 합니다.',
  );

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

  const incrementalCache = new InMemoryTodoCache();
  const incrementalSource = new IncrementalSource();
  await syncTodosFromOneDrive(incrementalSource, incrementalCache);
  const incrementalSynced = await syncTodosFromOneDrive(incrementalSource, incrementalCache);
  assert.equal(
    incrementalSynced.todos.length,
    2,
    '증분 동기화에서는 기존 캐시 todo와 변경 todo를 병합해야 합니다.',
  );

  const resumableCache = new InMemoryTodoCache();
  const resumableSource = new ResumableSource();
  await assert.rejects(
    () =>
      syncTodosFromOneDrive(resumableSource, resumableCache, {
        maxRetries: 0,
      }),
    OneDriveNetworkError,
    '중단된 동기화는 네트워크 오류를 그대로 드러내야 합니다.',
  );
  const resumedResult = await syncTodosFromOneDrive(resumableSource, resumableCache, {
    maxRetries: 0,
  });
  assert.deepEqual(
    resumableSource.resumeOptions,
    [0, 1],
    '재시도 시 이전 진행률(checkpoint)부터 이어받아야 합니다.',
  );
  assert.equal(resumedResult.todos.length, 2, '중단 이전에 파싱한 todo와 이후 todo를 함께 유지해야 합니다.');


  const checkpointSpyCache = new CheckpointSpyCache();
  await syncTodosFromOneDrive(new TwoItemSource(), checkpointSpyCache, {
    maxRetries: 0,
  });
  assert.ok(
    checkpointSpyCache.saveCalls >= 4,
    '동기화 진행 중에는 앱이 강제 종료되어도 이어받을 수 있도록 checkpoint를 주기적으로 저장해야 합니다.',
  );
  assert.ok(
    checkpointSpyCache.checkpoints.some((checkpoint) => checkpoint.completed === 1),
    '중간 진행률(completed=1)이 checkpoint에 반영되어야 합니다.',
  );

  const originalFetch = globalThis.fetch;
  let graphAttempt = 0;
  globalThis.fetch = (async (input) => {
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
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
            lastModifiedDateTime: '2026-03-02T10:00:00.000Z',
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

  let incrementalDownloadCount = 0;
  globalThis.fetch = (async (input) => {
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (requestUrl.endsWith('/content')) {
      incrementalDownloadCount += 1;
      return new Response(
        `changed item
id: todo-incremental
type_: 1
is_todo: 1
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
            id: 'item-unchanged',
            name: 'todo-unchanged.md',
            lastModifiedDateTime: '2026-03-02T09:59:59.000Z',
            file: {},
          },
          {
            id: 'item-changed',
            name: 'todo-changed.md',
            lastModifiedDateTime: '2026-03-02T10:00:01.000Z',
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

  const incrementalItems = await graphSource.listJoplinItems(undefined, undefined, {
    modifiedSince: '2026-03-02T10:00:00.000Z',
  });
  assert.equal(incrementalDownloadCount, 1, '마지막 동기화 이후 수정된 파일만 다운로드해야 합니다.');
  assert.equal(incrementalItems.length, 1);
  assert.equal(incrementalItems[0]?.id, 'todo-incremental');



  globalThis.fetch = ((_: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    })) as typeof fetch;

  const timeoutSource = new GraphOneDriveJoplinSource('fake-token', {
    maxRetries: 0,
    requestTimeoutMs: 5,
  });

  await assert.rejects(
    () => timeoutSource.listJoplinItems(),
    (error: unknown) => {
      assert.ok(error instanceof OneDriveNetworkError);
      assert.match(error.message, /request-timeout\(5ms\)/);
      return true;
    },
    'Graph 요청 타임아웃은 명확한 오류 메시지로 노출되어야 합니다.',
  );

  globalThis.fetch = originalFetch;

  console.log('Phase 2 checks passed.');
};

run();
