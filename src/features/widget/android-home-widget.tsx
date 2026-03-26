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
import { GraphOneDriveJoplinSource } from '@/features/sync/onedrive-source';
import { getValidStoredAccessToken } from '@/features/sync/onedrive-auth-session';
import { AsyncStorageTodoCache } from '@/storage/todo-cache';

import type { WidgetSnapshot } from './types';
import { createWidgetBridge } from './widget-bridge-factory';
import { runWidgetRefreshIfDue } from './widget-refresh-runner';

const WIDGET_NAME = 'JoplinTodo';
const widgetBridge = createWidgetBridge();
const cache = new AsyncStorageTodoCache();

const widgetPalette = {
  text: '#111111',
  background: '#FAFAF8',
  surface: '#FFFFFF',
  border: '#D8D8D2',
  textSecondary: '#5F5F58',
  accent: '#1F1F1F',
  accentSoft: '#EFEFEB',
  danger: '#7F1D1D',
  dangerSurface: '#FBF0F0',
} as const;

const getStateLabel = (state: WidgetSnapshot['state']): string => {
  if (state === 'ready') return '동기화 완료';
  if (state === 'syncing') return '동기화 중';
  if (state === 'error') return '동기화 오류';
  return '동기화 대기';
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

const WidgetRoot = ({ snapshot, explicitError }: { snapshot: WidgetSnapshot | null; explicitError?: string }) => {
  const todos = snapshot?.todos.filter((todo) => !todo.completed) ?? [];
  const state = snapshot?.state ?? 'empty';
  const errorText = explicitError ?? snapshot?.errorMessage ?? null;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: widgetPalette.background,
        padding: 12,
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}>
      <FlexWidget
        style={{
          width: 'match_parent',
          backgroundColor: widgetPalette.surface,
          borderColor: widgetPalette.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 7,
          marginBottom: 6,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <TextWidget
          text={`${todos.length}개`}
          style={{
            fontSize: 18,
            color: widgetPalette.text,
            fontWeight: '700',
          }}
        />
        <FlexWidget
          style={{
            backgroundColor: widgetPalette.accentSoft,
            borderRadius: 999,
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: widgetPalette.border,
          }}>
          <TextWidget text={getStateLabel(state)} style={{ fontSize: 9, color: widgetPalette.textSecondary, fontWeight: '700' }} />
        </FlexWidget>
      </FlexWidget>

      {errorText ? (
        <FlexWidget
          style={{
            backgroundColor: widgetPalette.dangerSurface,
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: widgetPalette.danger,
          }}>
          <TextWidget text="오류 발생" style={{ color: widgetPalette.danger, fontSize: 11, fontWeight: '700', marginBottom: 2 }} />
          <TextWidget text={errorText} style={{ color: widgetPalette.danger, fontSize: 11 }} />
        </FlexWidget>
      ) : null}

      {todos.length === 0 ? (
        <FlexWidget
          style={{
            backgroundColor: widgetPalette.surface,
            borderRadius: 8,
            padding: 12,
            borderWidth: 1,
            borderColor: widgetPalette.border,
          }}>
          <TextWidget text="표시할 미완료 항목이 없습니다." style={{ color: widgetPalette.textSecondary, fontSize: 12 }} />
        </FlexWidget>
      ) : (
        <ListWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
          }}>
          {todos.map((todo, index) => (
            <FlexWidget
              key={todo.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: index === todos.length - 1 ? 0 : 6,
                paddingHorizontal: 10,
                paddingVertical: 8,
                backgroundColor: widgetPalette.surface,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: widgetPalette.border,
              }}>
              <FlexWidget
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: widgetPalette.accent,
                  marginRight: 8,
                }}
              />
              <TextWidget text={todo.title} style={{ fontSize: 12, color: widgetPalette.text, fontWeight: '500' }} />
            </FlexWidget>
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
