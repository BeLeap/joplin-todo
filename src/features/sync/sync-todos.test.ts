import assert from 'node:assert/strict';
import test from 'node:test';

import type { JoplinRawTodo } from '@/features/sync/types';
import { syncTodosFromOneDrive } from '@/features/sync/sync-todos';
import type { OneDriveJoplinSource, OneDriveSyncProgress } from '@/features/sync/onedrive-source';
import { InMemoryTodoCache } from '@/storage/todo-cache';

const createRawTodo = (overrides: Partial<JoplinRawTodo> = {}): JoplinRawTodo => ({
  id: overrides.id ?? 'todo-1',
  title: overrides.title ?? 'Test todo',
  type_: overrides.type_ ?? 1,
  is_todo: overrides.is_todo ?? 1,
  todo_completed: overrides.todo_completed ?? 0,
  deleted_time: overrides.deleted_time ?? 0,
  updated_time: overrides.updated_time ?? 1,
  encryption_applied: overrides.encryption_applied ?? 0,
});

class FakeOneDriveSource implements OneDriveJoplinSource {
  constructor(
    private readonly items: JoplinRawTodo[],
    private readonly fileNames: string[],
  ) {}

  async listJoplinItems(
    onProgress?: (progress: OneDriveSyncProgress) => void | Promise<void>,
    onItem?: (item: JoplinRawTodo) => void | Promise<void>,
    options?: {
      modifiedSince?: string | null;
      resumeFromCompleted?: number;
      onFilesListed?: (fileNames: string[]) => void | Promise<void>;
    },
  ): Promise<JoplinRawTodo[]> {
    await options?.onFilesListed?.(this.fileNames);
    await onProgress?.({
      phase: 'downloading',
      currentFileName: null,
      completed: 0,
      total: this.items.length,
    });

    for (const [index, item] of this.items.entries()) {
      await onItem?.(item);
      await onProgress?.({
        phase: 'downloading',
        currentFileName: `${item.id}.md`,
        completed: index + 1,
        total: this.items.length,
      });
    }

    return this.items;
  }
}

test('removes checkpoint todo when Joplin marks the item deleted', async () => {
  const cache = new InMemoryTodoCache();
  const activeTodo = createRawTodo({ id: 'todo-1', title: 'Keep me' });
  await cache.saveTodos([
    {
      id: activeTodo.id,
      title: activeTodo.title,
      completed: false,
      updatedTime: new Date(activeTodo.updated_time).toISOString(),
    },
  ], '2026-03-17T00:00:00.000Z');
  await cache.saveSyncCheckpoint({
    modifiedSince: '2026-03-17T00:00:00.000Z',
    completed: 0,
    parsedTodos: [
      {
        id: activeTodo.id,
        title: activeTodo.title,
        completed: false,
        updatedTime: new Date(activeTodo.updated_time).toISOString(),
      },
    ],
  });

  const source = new FakeOneDriveSource(
    [createRawTodo({ id: 'todo-1', title: 'Keep me', deleted_time: 123 })],
    ['todo-1.md'],
  );

  const result = await syncTodosFromOneDrive(source, cache);

  assert.deepEqual(result.todos, []);
  assert.deepEqual((await cache.loadTodos()).todos, []);
  assert.equal(await cache.loadSyncCheckpoint(), null);
});

test('keeps active todos and only reports parsed items for non-deleted todos', async () => {
  const cache = new InMemoryTodoCache();
  const parsedIds: string[] = [];
  const source = new FakeOneDriveSource(
    [
      createRawTodo({ id: 'todo-1', title: 'Visible todo' }),
      createRawTodo({ id: 'todo-2', title: 'Deleted todo', deleted_time: 456 }),
    ],
    ['todo-1.md', 'todo-2.md'],
  );

  const result = await syncTodosFromOneDrive(source, cache, {
    onTodoParsed: (todo) => {
      parsedIds.push(todo.id);
    },
  });

  assert.deepEqual(parsedIds, ['todo-1']);
  assert.deepEqual(
    result.todos.map((todo) => todo.id),
    ['todo-1'],
  );
});
