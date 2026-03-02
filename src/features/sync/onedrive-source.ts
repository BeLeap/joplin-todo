import type { JoplinRawTodo } from './types';

import { OneDriveAuthError, OneDriveNetworkError, OneDrivePermissionError } from './errors';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const JOPLIN_FOLDER_PATH = '/me/drive/special/approot:/Joplin';
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

const parseJoplinMetadata = (content: string): JoplinRawTodo | null => {
  const lines = content.split(/\r?\n/);
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
    type_: Number.parseInt(map.get('type_') ?? '0', 10),
    todo_due: Number.parseInt(map.get('todo_due') ?? '0', 10),
    todo_completed: Number.parseInt(map.get('todo_completed') ?? '0', 10),
    updated_time: Number.parseInt(map.get('updated_time') ?? '0', 10),
    encryption_applied: Number.parseInt(map.get('encryption_applied') ?? '0', 10),
  };
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
