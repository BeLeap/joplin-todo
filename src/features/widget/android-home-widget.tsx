"use no memo";

import React from 'react';
import { Platform } from 'react-native';
import {
  FlexWidget,
  ListWidget,
  TextWidget,
  registerWidgetTaskHandler,
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';

import { OneDriveAuthError } from '@/features/sync/errors';
import { getValidStoredAccessToken } from '@/features/sync/onedrive-auth-session';
import { GraphOneDriveJoplinSource } from '@/features/sync/onedrive-source';
import { AsyncStorageTodoCache } from '@/storage/todo-cache';

import type { WidgetSnapshot, WidgetSnapshotState, WidgetTodoItem } from './types';
import { createWidgetBridge } from './widget-bridge-factory';
import { runWidgetRefreshIfDue } from './widget-refresh-runner';

const WIDGET_NAME = 'JoplinTodo';
const widgetBridge = createWidgetBridge();
const cache = new AsyncStorageTodoCache();

const widgetPalette = {
  text: '#000000',
  background: '#FFFFFF',
  backgroundElement: '#F0F0F3',
  backgroundSelected: '#E0E1E6',
  textSecondary: '#60646C',
  danger: '#7F1D1D',
} as const;

const formatSyncedAtLabel = (syncedAt: string | null): string => {
  if (!syncedAt) {
    return '동기화 기록 없음';
  }

  return new Date(syncedAt).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStateLabel = (state: WidgetSnapshotState): string => {
  if (state === 'ready') return '완료';
  if (state === 'syncing') return '동기화 중';
  if (state === 'error') return '오류';
  return '대기';
};

const loadSnapshot = async (): Promise<WidgetSnapshot | null> => {
  return widgetBridge.loadSnapshot();
};

const hasMatchingWidgetName = (incomingName: string | undefined) => {
  if (!incomingName) {
    return false;
  }

  if (incomingName === WIDGET_NAME) {
    return true;
  }

  return incomingName.toLowerCase() === WIDGET_NAME.toLowerCase();
};

const syncWidgetDataIfDue = async () => {
  const envToken = process.env.EXPO_PUBLIC_ONEDRIVE_ACCESS_TOKEN?.trim() || null;
  const sessionToken = await getValidStoredAccessToken(process.env.EXPO_PUBLIC_ONEDRIVE_CLIENT_ID);
  const token = sessionToken ?? envToken;

  if (!token) {
    throw new OneDriveAuthError('백그라운드 동기화에 필요한 OneDrive 세션이 없습니다. 앱에서 로그인해 주세요.');
  }

  const source = new GraphOneDriveJoplinSource(token);
  const refreshResult = await runWidgetRefreshIfDue(source, cache, widgetBridge);

  if (refreshResult.status === 'failed') {
    throw new Error('백그라운드 위젯 동기화가 실패했습니다.');
  }
};

const WidgetHeader = ({ state, todoCount, lastSyncedAt }: {
  state: WidgetSnapshotState;
  todoCount: number;
  lastSyncedAt: string | null;
}) => (
  <FlexWidget
    style={{
      backgroundColor: widgetPalette.backgroundElement,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: widgetPalette.text,
      marginBottom: 10,
      flexDirection: 'column',
    }}>
    <FlexWidget
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text="Joplin TODO" style={{ fontSize: 11, color: widgetPalette.textSecondary }} />
        <TextWidget text="오늘 할 일" style={{ fontSize: 18, color: widgetPalette.text, fontWeight: '700' }} />
      </FlexWidget>
      <FlexWidget
        style={{
          backgroundColor: state === 'error' ? widgetPalette.background : widgetPalette.text,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: widgetPalette.text,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}>
        <TextWidget
          text={getStateLabel(state)}
          style={{
            fontSize: 11,
            color: state === 'error' ? widgetPalette.danger : widgetPalette.background,
            fontWeight: '700',
          }}
        />
      </FlexWidget>
    </FlexWidget>

    <FlexWidget
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
      <TextWidget text={`미완료 ${todoCount}개`} style={{ fontSize: 12, color: widgetPalette.text, fontWeight: '600' }} />
      <TextWidget text={formatSyncedAtLabel(lastSyncedAt)} style={{ fontSize: 11, color: widgetPalette.textSecondary }} />
    </FlexWidget>
  </FlexWidget>
);

const WidgetErrorBanner = ({ message }: { message: string }) => (
  <FlexWidget
    style={{
      backgroundColor: widgetPalette.background,
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: widgetPalette.danger,
    }}>
    <TextWidget text="오류 발생" style={{ color: widgetPalette.danger, fontSize: 11, fontWeight: '700', marginBottom: 2 }} />
    <TextWidget text={message} style={{ color: widgetPalette.danger, fontSize: 11 }} />
  </FlexWidget>
);

const EmptyState = () => (
  <FlexWidget
    style={{
      backgroundColor: widgetPalette.backgroundElement,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: widgetPalette.text,
    }}>
    <TextWidget text="표시할 미완료 항목이 없습니다." style={{ color: widgetPalette.textSecondary, fontSize: 12 }} />
  </FlexWidget>
);

const TodoRow = ({ todo, isLast }: { todo: WidgetTodoItem; isLast: boolean }) => (
  <FlexWidget
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: isLast ? 0 : 6,
      backgroundColor: widgetPalette.backgroundElement,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: widgetPalette.backgroundSelected,
    }}>
    <FlexWidget
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        backgroundColor: widgetPalette.text,
        marginRight: 8,
      }}
    />
    <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
      <TextWidget text={todo.title} style={{ fontSize: 13, color: widgetPalette.text, fontWeight: '600' }} />
      <TextWidget text="진행중" style={{ fontSize: 10, color: widgetPalette.textSecondary, marginTop: 2 }} />
    </FlexWidget>
  </FlexWidget>
);

const WidgetRoot = ({ snapshot, explicitError }: { snapshot: WidgetSnapshot | null; explicitError?: string }) => {
  const todos = snapshot?.todos.filter((todo) => !todo.completed) ?? [];
  const state = snapshot?.state ?? 'empty';
  const errorText = explicitError ?? snapshot?.errorMessage ?? null;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: widgetPalette.background,
        padding: 12,
        flexDirection: 'column',
      }}>
      <WidgetHeader state={state} todoCount={todos.length} lastSyncedAt={snapshot?.lastSyncedAt ?? null} />

      {errorText ? <WidgetErrorBanner message={errorText} /> : null}

      {todos.length === 0 ? (
        <EmptyState />
      ) : (
        <ListWidget style={{ width: 'match_parent', height: 'match_parent' }}>
          {todos.map((todo, index) => (
            <TodoRow key={todo.id} todo={todo} isLast={index === todos.length - 1} />
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  );
};

const renderCurrentWidget = async () => {
  try {
    const snapshot = await loadSnapshot();

    if (!snapshot) {
      return (
        <WidgetRoot
          snapshot={null}
          explicitError="스냅샷이 없습니다. 앱을 한 번 열어 동기화를 실행해 주세요."
        />
      );
    }

    return <WidgetRoot snapshot={snapshot} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return <WidgetRoot snapshot={null} explicitError={`스냅샷 파싱 실패: ${message}`} />;
  }
};

let isRegistered = false;

export const registerJoplinHomeWidgetTask = () => {
  if (Platform.OS !== 'android' || isRegistered) {
    return;
  }

  registerWidgetTaskHandler(async (props: WidgetTaskHandlerProps) => {
    const incomingWidgetName = props.widgetInfo?.widgetName;

    if (!hasMatchingWidgetName(incomingWidgetName)) {
      props.renderWidget(
        <WidgetRoot
          snapshot={null}
          explicitError={`위젯 이름 불일치: expected=${WIDGET_NAME}, actual=${String(incomingWidgetName)}`}
        />,
      );
      return;
    }

    try {
      await syncWidgetDataIfDue();
    } catch (error) {
      console.error('[widget-background-sync-failed]', error);
    }

    props.renderWidget(await renderCurrentWidget());
  });

  isRegistered = true;
};

export const requestJoplinHomeWidgetUpdate = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: async () => {
      try {
        await syncWidgetDataIfDue();
      } catch (error) {
        console.error('[widget-update-sync-failed]', error);
      }

      return renderCurrentWidget();
    },
  });
};
