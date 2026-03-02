import type { JoplinRawTodo } from './types';

export interface OneDriveJoplinSource {
  listJoplinItems(): Promise<JoplinRawTodo[]>;
}

export class MockOneDriveJoplinSource implements OneDriveJoplinSource {
  async listJoplinItems(): Promise<JoplinRawTodo[]> {
    return [
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
  }
}
