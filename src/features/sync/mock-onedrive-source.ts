import type { OneDriveJoplinSource, OneDriveSyncProgress } from './onedrive-source';
import type { JoplinRawTodo } from './types';

export class MockOneDriveJoplinSource implements OneDriveJoplinSource {
  async listJoplinItems(onProgress?: (progress: OneDriveSyncProgress) => void): Promise<JoplinRawTodo[]> {
    const items = [
      {
        id: 'todo-1',
        title: 'Pay rent',
        type_: 13,
        todo_due: Date.parse('2026-03-04T09:00:00.000Z'),
        todo_completed: 0,
        updated_time: Date.parse('2026-03-02T10:00:00.000Z'),
        encryption_applied: 0,
      },
      {
        id: 'todo-2',
        title: 'Book annual health checkup',
        type_: 13,
        todo_due: 0,
        todo_completed: 0,
        updated_time: Date.parse('2026-03-02T11:00:00.000Z'),
        encryption_applied: 0,
      },
      {
        id: 'note-1',
        title: 'Regular note (ignored)',
        type_: 1,
        todo_due: 0,
        todo_completed: 0,
        updated_time: Date.parse('2026-03-01T09:00:00.000Z'),
        encryption_applied: 0,
      },
    ];

    items.forEach((item, index) => {
      onProgress?.({
        phase: 'downloading',
        currentFileName: `${item.id}.md`,
        completed: index + 1,
        total: items.length,
      });
    });

    return items;
  }
}
