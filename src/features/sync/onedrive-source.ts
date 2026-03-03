import type { JoplinRawTodo } from './types';

import { OneDriveAuthError, OneDriveNetworkError, OneDrivePermissionError } from './errors';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const JOPLIN_FOLDER_PATH = '/me/drive/special/approot:/Apps/Joplin';
const JOPLIN_SYNC_PAGE_SIZE = 200;

type GraphDriveItem = {
  id: string;
  name: string;
  file?: Record<string, unknown>;
};

type GraphListResponse = {
  value?: GraphDriveItem[];
  '@odata.nextLink'?: string;
};

const isJoplinItemFile = (name: string) => name.endsWith('.md');

const parseIntegerField = (value: string | undefined, fallback = 0) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
};

const parseJoplinMetadata = (content: string): JoplinRawTodo | null => {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  const map = new Map<string, string>();

  for (const line of lines) {
    if (!line.trim()) {
      break;
    }

    const separator = line.indexOf(':');
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) {
      map.set(key, value);
    }
  }

  const id = map.get('id');
  if (!id) {
    return null;
  }

  return {
    id,
    title: map.get('title') ?? '',
    type_: parseIntegerField(map.get('type_')),
    todo_due: parseIntegerField(map.get('todo_due')),
    todo_completed: parseIntegerField(map.get('todo_completed')),
    updated_time: parseIntegerField(map.get('updated_time')),
    encryption_applied: parseIntegerField(map.get('encryption_applied')),
  };
};

export const __private__ = {
  parseJoplinMetadata,
};

const toGraphError = async (response: Response) => {
  if (response.status === 401) {
    return new OneDriveAuthError();
  }

  if (response.status === 403) {
    return new OneDrivePermissionError();
  }

  const body = await response.text();
  return new OneDriveNetworkError(`OneDrive 요청 실패 (${response.status}): ${body.slice(0, 200)}`);
};

export interface OneDriveJoplinSource {
  listJoplinItems(): Promise<JoplinRawTodo[]>;
}

export class GraphOneDriveJoplinSource implements OneDriveJoplinSource {
  constructor(private readonly accessToken: string) {}

  private async graphFetch(url: string) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw await toGraphError(response);
    }

    return response;
  }

  private async listJoplinFiles() {
    const files: GraphDriveItem[] = [];
    let nextLink = `${GRAPH_BASE_URL}${JOPLIN_FOLDER_PATH}:/children?$top=${JOPLIN_SYNC_PAGE_SIZE}`;

    while (nextLink) {
      const response = await this.graphFetch(nextLink);
      const body = (await response.json()) as GraphListResponse;
      const page = body.value?.filter((item) => item.file && isJoplinItemFile(item.name)) ?? [];
      files.push(...page);
      nextLink = body['@odata.nextLink'] ?? '';
    }

    return files;
  }

  async listJoplinItems(): Promise<JoplinRawTodo[]> {
    const files = await this.listJoplinFiles();

    const rawItems = await Promise.all(
      files.map(async (file) => {
        const response = await this.graphFetch(`${GRAPH_BASE_URL}/me/drive/items/${file.id}/content`);
        const content = await response.text();
        return parseJoplinMetadata(content);
      }),
    );

    return rawItems.filter((item): item is JoplinRawTodo => item !== null);
  }
}
