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
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: widgetPalette.background,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}>
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}>
        <TextWidget
          text="오늘 할 일"
          style={{
            fontSize: 20,
            color: widgetPalette.text,
            fontWeight: '700',
          }}
        />
        <FlexWidget
          style={{
            backgroundColor: widgetPalette.text,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}>
          <TextWidget text={getStateLabel(state)} style={{ fontSize: 11, color: widgetPalette.background, fontWeight: '700' }} />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        style={{
          backgroundColor: widgetPalette.backgroundElement,
          borderRadius: 6,
          padding: 12,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: widgetPalette.text,
          flexDirection: 'column',
        }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <FlexWidget
            style={{
              borderRadius: 4,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: widgetPalette.text,
              backgroundColor: widgetPalette.background,
              marginRight: 8,
            }}>
            <TextWidget text={`항목 ${todos.length}개`} style={{ fontSize: 11, color: widgetPalette.text, fontWeight: '700' }} />
          </FlexWidget>
          <TextWidget text="Joplin TODO" style={{ fontSize: 12, color: widgetPalette.textSecondary }} />
        </FlexWidget>
        <TextWidget
          text={`마지막 동기화: ${formatSyncedAtLabel(snapshot?.lastSyncedAt ?? null)}`}
          style={{ fontSize: 11, color: widgetPalette.textSecondary }}
        />
      </FlexWidget>

      {errorText ? (
        <FlexWidget
          style={{
            backgroundColor: widgetPalette.background,
            borderRadius: 6,
            padding: 10,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: widgetPalette.text,
          }}>
          <TextWidget text="오류 발생" style={{ color: widgetPalette.danger, fontSize: 11, fontWeight: '700', marginBottom: 2 }} />
          <TextWidget text={errorText} style={{ color: widgetPalette.danger, fontSize: 11 }} />
        </FlexWidget>
      ) : null}

      {todos.length === 0 ? (
        <FlexWidget
          style={{
            backgroundColor: widgetPalette.backgroundElement,
            borderRadius: 6,
            padding: 12,
            borderWidth: 1,
            borderColor: widgetPalette.text,
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
                flexDirection: 'column',
                marginBottom: index === todos.length - 1 ? 0 : 8,
                padding: 12,
                backgroundColor: widgetPalette.backgroundElement,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: widgetPalette.text,
              }}>
              <TextWidget text={todo.title} style={{ fontSize: 13, color: widgetPalette.text, fontWeight: '600' }} />
              <FlexWidget style={{ flexDirection: 'row', marginTop: 6 }}>
                <FlexWidget
                  style={{
                    borderRadius: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: widgetPalette.text,
                    backgroundColor: widgetPalette.background,
                  }}>
                  <TextWidget text="진행중" style={{ fontSize: 11, color: widgetPalette.text, fontWeight: '700' }} />
                </FlexWidget>
              </FlexWidget>
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
