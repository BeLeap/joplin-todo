import React from 'react';
import { Platform } from 'react-native';
import {
  FlexWidget,
  TextWidget,
  registerWidgetTaskHandler,
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';

import type { WidgetSnapshot } from './types';
import { createWidgetBridge } from './widget-bridge-factory';

const WIDGET_NAME = 'JoplinTodo';
const widgetBridge = createWidgetBridge();

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


const getStateLabel = (state: WidgetSnapshot['state']): string => {
  if (state === 'ready') return '정상';
  if (state === 'syncing') return '동기화 중';
  if (state === 'error') return '오류';
  return '비어 있음';
};

const loadSnapshot = async (): Promise<WidgetSnapshot | null> => {
  return widgetBridge.loadSnapshot();
};

const hasMatchingWidgetName = (incomingName: string) => {
  if (incomingName === WIDGET_NAME) {
    return true;
  }

  return incomingName.toLowerCase() === WIDGET_NAME.toLowerCase();
};

const WidgetRoot = ({ snapshot, explicitError }: { snapshot: WidgetSnapshot | null; explicitError?: string }) => {
  const todos = snapshot?.todos.slice(0, 4) ?? [];
  const state = snapshot?.state ?? 'empty';
  const errorText = explicitError ?? snapshot?.errorMessage ?? null;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#FFFFFF',
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}>
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}>
        <TextWidget text="Joplin TODO" style={{ fontSize: 14, color: '#0F172A' }} />
        <TextWidget text={getStateLabel(state)} style={{ fontSize: 12, color: '#334155' }} />
      </FlexWidget>

      <TextWidget
        text={`마지막 동기화: ${formatSyncedAtLabel(snapshot?.lastSyncedAt ?? null)}`}
        style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}
      />

      {errorText ? (
        <TextWidget text={`오류: ${errorText}`} style={{ color: '#B91C1C', fontSize: 12, marginBottom: 6 }} />
      ) : null}

      {todos.length === 0 ? (
        <TextWidget text="표시할 항목이 없습니다." style={{ color: '#64748B', fontSize: 12 }} />
      ) : (
        <FlexWidget style={{ flexDirection: 'column' }}>
          {todos.map((todo) => (
            <FlexWidget key={todo.id} style={{ flexDirection: 'column', marginBottom: 4 }}>
              <TextWidget text={`• ${todo.title}`} style={{ fontSize: 13 }} />
            </FlexWidget>
          ))}
        </FlexWidget>
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
    if (!hasMatchingWidgetName(props.widgetInfo.widgetName)) {
      props.renderWidget(
        <WidgetRoot
          snapshot={null}
          explicitError={`위젯 이름 불일치: expected=${WIDGET_NAME}, actual=${props.widgetInfo.widgetName}`}
        />,
      );
      return;
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
    renderWidget: async () => renderCurrentWidget(),
  });
};
