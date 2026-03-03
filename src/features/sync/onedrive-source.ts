import type { JoplinRawTodo } from './types';

import { OneDriveAuthError, OneDriveNetworkError, OneDrivePermissionError } from './errors';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const JOPLIN_FOLDER_PATH = '/me/drive/root:/Apps/Joplin';
const JOPLIN_SYNC_PAGE_SIZE = 200;
const GRAPH_RETRYABLE_HTTP_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const DEFAULT_GRAPH_MAX_RETRIES = 3;
const DEFAULT_GRAPH_RETRY_BASE_DELAY_MS = 300;

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
  const normalizedContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const lines = normalizedContent.replace(/\r/g, '').split('\n');
  const map = new Map<string, string>();

  let titleFromFirstLine = '';
  let metadataLines = lines;

  const firstLine = lines[0]?.trim() ?? '';
  const embeddedIdIndex = firstLine.indexOf('id:');
  if (embeddedIdIndex > 0) {
    titleFromFirstLine = firstLine.slice(0, embeddedIdIndex).trim();
    metadataLines = [firstLine.slice(embeddedIdIndex), ...lines.slice(1)];
  } else {
    const separator = firstLine.indexOf(':');
    const firstLineLooksLikeMetadata =
      separator > 0 && /^[a-zA-Z0-9_]+$/.test(firstLine.slice(0, separator).trim());

    if (!firstLineLooksLikeMetadata) {
      titleFromFirstLine = firstLine;
      metadataLines = lines.slice(1);
    }
  }

  for (const line of metadataLines) {
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
    title: titleFromFirstLine || map.get('title') || '',
    type_: parseIntegerField(map.get('type_')),
    is_todo: parseIntegerField(map.get('is_todo')),
    todo_due: parseIntegerField(map.get('todo_due')),
    todo_completed: parseIntegerField(map.get('todo_completed')),
    updated_time: parseIntegerField(map.get('updated_time')),
    encryption_applied: parseIntegerField(map.get('encryption_applied')),
  };
};

export const __private__ = {
  parseJoplinMetadata,
};

type GraphRequestContext = {
  logicalPath?: string;
  operation: string;
  requestUrl: string;
};

type GraphErrorBody = {
  error?: {
    code?: string;
    message?: string;
    innerError?: {
      code?: string;
      'request-id'?: string;
      date?: string;
    };
    innererror?: {
      code?: string;
      'request-id'?: string;
      date?: string;
    };
  };
};

const buildErrorDetail = (context: GraphRequestContext, parts: (string | null | undefined)[]) =>
  [
    `operation=${context.operation}`,
    `requestUrl=${context.requestUrl}`,
    context.logicalPath ? `logicalPath=${context.logicalPath}` : null,
    ...parts,
  ]
    .filter(Boolean)
    .join(' | ');

const toGraphError = async (response: Response, context: GraphRequestContext) => {
  const rawBody = await response.text();
  let graphCode: string | undefined;
  let graphMessage: string | undefined;
  let graphInnerCode: string | undefined;
  let graphRequestId: string | undefined;
  let graphDate: string | undefined;

  try {
    const parsed = JSON.parse(rawBody) as GraphErrorBody;
    const innerError = parsed.error?.innerError ?? parsed.error?.innererror;
    graphCode = parsed.error?.code;
    graphMessage = parsed.error?.message;
    graphInnerCode = innerError?.code;
    graphRequestId = innerError?.['request-id'];
    graphDate = innerError?.date;
  } catch {
    // Graph가 JSON이 아닌 에러 본문을 돌려줄 수 있어 무시하고 rawBody를 그대로 보존합니다.
  }

  const retryAfter = response.headers.get('retry-after');
  const detail = buildErrorDetail(context, [
    `httpStatus=${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
    graphCode ? `graphCode=${graphCode}` : null,
    graphMessage ? `graphMessage=${graphMessage}` : null,
    graphInnerCode ? `graphInnerCode=${graphInnerCode}` : null,
    graphRequestId ? `graphRequestId=${graphRequestId}` : null,
    graphDate ? `graphDate=${graphDate}` : null,
    retryAfter ? `retryAfter=${retryAfter}` : null,
    `response=${rawBody.slice(0, 300)}`,
  ]);

  if (response.status === 401) {
    return new OneDriveAuthError(undefined, detail);
  }

  if (response.status === 403) {
    return new OneDrivePermissionError(undefined, detail);
  }

  return new OneDriveNetworkError(`OneDrive 요청 실패 | ${detail}`);
};

export interface OneDriveJoplinSource {
  listJoplinItems(onProgress?: (progress: OneDriveSyncProgress) => void): Promise<JoplinRawTodo[]>;
}

export type OneDriveSyncProgress = {
  phase: 'listing' | 'downloading';
  currentFileName: string | null;
  completed: number;
  total: number;
};

export class GraphOneDriveJoplinSource implements OneDriveJoplinSource {
  constructor(
    private readonly accessToken: string,
    private readonly retryOptions: {
      maxRetries?: number;
      baseDelayMs?: number;
    } = {},
  ) {}

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getRetryDelayMs(attempt: number, retryAfterHeader: string | null) {
    if (retryAfterHeader) {
      const seconds = Number.parseInt(retryAfterHeader, 10);
      if (Number.isFinite(seconds) && seconds >= 0) {
        return seconds * 1000;
      }
    }

    const baseDelayMs = this.retryOptions.baseDelayMs ?? DEFAULT_GRAPH_RETRY_BASE_DELAY_MS;
    return baseDelayMs * 2 ** attempt;
  }

  private async graphFetch(url: string, context: Omit<GraphRequestContext, 'requestUrl'>) {
    const maxRetries = this.retryOptions.maxRetries ?? DEFAULT_GRAPH_MAX_RETRIES;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });
      } catch (error) {
        if (attempt >= maxRetries) {
          const message = error instanceof Error ? error.message : String(error);
          const detail = buildErrorDetail({ ...context, requestUrl: url }, [`reason=${message}`]);
          throw new OneDriveNetworkError(`OneDrive 요청 중 네트워크 예외 발생 | ${detail}`);
        }

        await this.sleep(this.getRetryDelayMs(attempt, null));
        continue;
      }

      if (response.ok) {
        return response;
      }

      const isRetryableStatus = GRAPH_RETRYABLE_HTTP_STATUS.has(response.status);
      if (isRetryableStatus && attempt < maxRetries) {
        await this.sleep(this.getRetryDelayMs(attempt, response.headers.get('retry-after')));
        continue;
      }

      throw await toGraphError(response, { ...context, requestUrl: url });
    }

    throw new OneDriveNetworkError(
      `OneDrive 요청 실패 | ${buildErrorDetail({ ...context, requestUrl: url }, ['reason=retry-exhausted'])}`,
    );
  }

  private async listJoplinFiles() {
    const files: GraphDriveItem[] = [];
    let nextLink = `${GRAPH_BASE_URL}${JOPLIN_FOLDER_PATH}:/children?$top=${JOPLIN_SYNC_PAGE_SIZE}`;

    while (nextLink) {
      const response = await this.graphFetch(nextLink, {
        operation: 'list-joplin-files',
        logicalPath: `${JOPLIN_FOLDER_PATH}:/children`,
      });
      const body = (await response.json()) as GraphListResponse;
      const page = body.value?.filter((item) => item.file && isJoplinItemFile(item.name)) ?? [];
      files.push(...page);
      nextLink = body['@odata.nextLink'] ?? '';
    }

    return files;
  }

  async listJoplinItems(onProgress?: (progress: OneDriveSyncProgress) => void): Promise<JoplinRawTodo[]> {
    const files = await this.listJoplinFiles();
    onProgress?.({
      phase: 'downloading',
      currentFileName: null,
      completed: 0,
      total: files.length,
    });

    const rawItems: (JoplinRawTodo | null)[] = [];
    for (const [index, file] of files.entries()) {
      onProgress?.({
        phase: 'downloading',
        currentFileName: file.name,
        completed: index,
        total: files.length,
      });

      const contentUrl = `${GRAPH_BASE_URL}/me/drive/items/${file.id}/content`;
      const response = await this.graphFetch(contentUrl, {
        operation: 'download-joplin-item',
        logicalPath: `${JOPLIN_FOLDER_PATH}/${file.name}`,
      });
      const content = await response.text();
      rawItems.push(parseJoplinMetadata(content));

      onProgress?.({
        phase: 'downloading',
        currentFileName: file.name,
        completed: index + 1,
        total: files.length,
      });
    }

    return rawItems.filter((item): item is JoplinRawTodo => item !== null);
  }
}
