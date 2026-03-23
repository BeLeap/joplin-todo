import type { JoplinRawTodo } from '@/features/sync/types';
import { syncTodosFromOneDrive } from '@/features/sync/sync-todos';
import type { OneDriveDownloadedItem, OneDriveJoplinSource, OneDriveSyncProgress } from '@/features/sync/onedrive-source';
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
    private readonly items: { fileName: string; item: JoplinRawTodo | null }[],
    private readonly fileNames: string[],
  ) {}

  async listJoplinItems(
    onProgress?: (progress: OneDriveSyncProgress) => void | Promise<void>,
    onItem?: (downloadedItem: OneDriveDownloadedItem) => void | Promise<void>,
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

    for (const [index, downloadedItem] of this.items.entries()) {
      await onItem?.(downloadedItem);
      await onProgress?.({
        phase: 'downloading',
        currentFileName: downloadedItem.fileName,
        completed: index + 1,
        total: this.items.length,
      });
    }

    return this.items
      .map(({ item }) => item)
      .filter((item): item is JoplinRawTodo => item !== null);
  }
}

describe('syncTodosFromOneDrive', () => {
  it('removes checkpoint todo when Joplin marks the item deleted', async () => {
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
      [{ fileName: 'todo-1.md', item: createRawTodo({ id: 'todo-1', title: 'Keep me', deleted_time: 123 }) }],
      ['todo-1.md'],
    );

    const result = await syncTodosFromOneDrive(source, cache);

    expect(result.todos).toEqual([]);
    await expect(cache.loadTodos()).resolves.toMatchObject({ todos: [] });
    await expect(cache.loadSyncCheckpoint()).resolves.toBeNull();
  });

  it('keeps active todos and only reports parsed items for non-deleted todos', async () => {
    const cache = new InMemoryTodoCache();
    const parsedIds: string[] = [];
    const source = new FakeOneDriveSource(
      [
        { fileName: 'todo-1.md', item: createRawTodo({ id: 'todo-1', title: 'Visible todo' }) },
        { fileName: 'todo-2.md', item: createRawTodo({ id: 'todo-2', title: 'Deleted todo', deleted_time: 456 }) },
      ],
      ['todo-1.md', 'todo-2.md'],
    );

    const result = await syncTodosFromOneDrive(source, cache, {
      onTodoParsed: (todo) => {
        parsedIds.push(todo.id);
      },
    });

    expect(parsedIds).toEqual(['todo-1']);
    expect(result.todos.map((todo) => todo.id)).toEqual(['todo-1']);
  });

  it('drops todos that look like trashed Joplin items because deleted_time is set', async () => {
    const cache = new InMemoryTodoCache();
    const source = new FakeOneDriveSource(
      [
        {
          fileName: '81505fbad9cc419182146796884e9e2c.md',
          item: createRawTodo({
            id: '81505fbad9cc419182146796884e9e2c',
            title: '휴지통 테스트',
            deleted_time: 1774228863121,
            updated_time: Date.parse('2026-03-23T01:21:03.121Z'),
          }),
        },
        {
          fileName: 'todo-visible.md',
          item: createRawTodo({
            id: 'todo-visible',
            title: 'Visible todo',
            updated_time: Date.parse('2026-03-23T01:30:00.000Z'),
          }),
        },
      ],
      ['81505fbad9cc419182146796884e9e2c.md', 'todo-visible.md'],
    );

    const result = await syncTodosFromOneDrive(source, cache);

    expect(result.todos.map((todo) => todo.id)).toEqual(['todo-visible']);
  });

  it('removes checkpoint todo when downloaded file is no longer parseable', async () => {
    const cache = new InMemoryTodoCache();
    await cache.saveTodos([
      {
        id: 'todo-legacy',
        title: 'Legacy todo',
        completed: false,
        updatedTime: new Date(1).toISOString(),
      },
    ], '2026-03-17T00:00:00.000Z');
    await cache.saveSyncCheckpoint({
      modifiedSince: '2026-03-17T00:00:00.000Z',
      completed: 0,
      parsedTodos: [
        {
          id: 'todo-legacy',
          title: 'Legacy todo',
          completed: false,
          updatedTime: new Date(1).toISOString(),
        },
      ],
    });

    const source = new FakeOneDriveSource(
      [{ fileName: 'todo-legacy.md', item: null }],
      ['todo-legacy.md'],
    );

    const result = await syncTodosFromOneDrive(source, cache);

    expect(result.todos).toEqual([]);
    await expect(cache.loadTodos()).resolves.toMatchObject({ todos: [] });
  });
});
