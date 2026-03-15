import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshAsync } from 'expo-auth-session';

import { OneDriveAuthError } from './errors';

const ONEDRIVE_DISCOVERY = {
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  revocationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
};

export const ONEDRIVE_AUTH_STORAGE_KEY = '@joplinTodo/onedriveAuth';

export type StoredAuthToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
};

export const readStoredToken = async (): Promise<StoredAuthToken | null> => {
  const raw = await AsyncStorage.getItem(ONEDRIVE_AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredAuthToken;
    if (!parsed.accessToken || typeof parsed.accessToken !== 'string') {
      throw new OneDriveAuthError('저장된 OneDrive 세션 포맷이 올바르지 않습니다. 다시 로그인해 주세요.');
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken ?? null,
      expiresAt: parsed.expiresAt ?? null,
    };
  } catch (error) {
    throw new OneDriveAuthError(
      `저장된 OneDrive 세션을 읽지 못했습니다: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

export const writeStoredToken = async (token: StoredAuthToken) => {
  await AsyncStorage.setItem(ONEDRIVE_AUTH_STORAGE_KEY, JSON.stringify(token));
};

export const clearStoredToken = async () => {
  await AsyncStorage.removeItem(ONEDRIVE_AUTH_STORAGE_KEY);
};

export const toExpiresAt = (expiresIn: number | undefined) => {
  if (!expiresIn || expiresIn <= 0) {
    return null;
  }

  return Date.now() + expiresIn * 1000;
};

export const getValidStoredAccessToken = async (clientId: string | null | undefined): Promise<string | null> => {
  const authToken = await readStoredToken();
  if (!authToken) {
    return null;
  }

  if (!authToken.expiresAt || authToken.expiresAt - 60_000 > Date.now()) {
    return authToken.accessToken;
  }

  if (!authToken.refreshToken || !clientId) {
    return authToken.accessToken;
  }

  const refreshed = await refreshAsync(
    {
      clientId,
      refreshToken: authToken.refreshToken,
    },
    ONEDRIVE_DISCOVERY,
  );

  const nextToken: StoredAuthToken = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? authToken.refreshToken,
    expiresAt: toExpiresAt(refreshed.expiresIn),
  };

  await writeStoredToken(nextToken);
  return nextToken.accessToken;
};

export { ONEDRIVE_DISCOVERY };
