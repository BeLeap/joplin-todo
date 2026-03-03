import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  exchangeCodeAsync,
  makeRedirectUri,
  refreshAsync,
  ResponseType,
  revokeAsync,
  useAuthRequest,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { OneDriveAuthError } from './errors';

WebBrowser.maybeCompleteAuthSession();

const ONEDRIVE_DISCOVERY = {
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  revocationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
};

const ONEDRIVE_SCOPES = ['openid', 'profile', 'offline_access', 'Files.Read'];
const ONEDRIVE_AUTH_STORAGE_KEY = '@joplinTodo/onedriveAuth';

type StoredAuthToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
};

const readStoredToken = async (): Promise<StoredAuthToken | null> => {
  const raw = await AsyncStorage.getItem(ONEDRIVE_AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredAuthToken;
    if (!parsed.accessToken || typeof parsed.accessToken !== 'string') {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken ?? null,
      expiresAt: parsed.expiresAt ?? null,
    };
  } catch {
    return null;
  }
};

const writeStoredToken = async (token: StoredAuthToken) => {
  await AsyncStorage.setItem(ONEDRIVE_AUTH_STORAGE_KEY, JSON.stringify(token));
};

const clearStoredToken = async () => {
  await AsyncStorage.removeItem(ONEDRIVE_AUTH_STORAGE_KEY);
};

const toExpiresAt = (expiresIn: number | undefined) => {
  if (!expiresIn || expiresIn <= 0) {
    return null;
  }

  return Date.now() + expiresIn * 1000;
};

export const useOneDriveAuth = () => {
  const clientId = process.env.EXPO_PUBLIC_ONEDRIVE_CLIENT_ID;
  const redirectUri = useMemo(() => makeRedirectUri({ scheme: 'joplintodo', path: 'auth' }), []);
  const [authToken, setAuthToken] = useState<StoredAuthToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: clientId ?? '',
      scopes: ONEDRIVE_SCOPES,
      responseType: ResponseType.Code,
      usePKCE: true,
      redirectUri,
    },
    ONEDRIVE_DISCOVERY,
  );

  useEffect(() => {
    const loadStoredToken = async () => {
      const stored = await readStoredToken();
      if (stored) {
        setAuthToken(stored);
      }
      setIsLoading(false);
    };

    void loadStoredToken();
  }, []);

  const exchangeAuthCode = useCallback(
    async (code: string, codeVerifier: string) => {
      if (!clientId) {
        throw new OneDriveAuthError('EXPO_PUBLIC_ONEDRIVE_CLIENT_ID 환경 변수가 필요합니다.');
      }

      const tokenResponse = await exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: codeVerifier,
          },
        },
        ONEDRIVE_DISCOVERY,
      );

      const nextToken: StoredAuthToken = {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken ?? null,
        expiresAt: toExpiresAt(tokenResponse.expiresIn),
      };

      await writeStoredToken(nextToken);
      setAuthToken(nextToken);
    },
    [clientId, redirectUri],
  );

  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
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
    setAuthToken(nextToken);
    return nextToken.accessToken;
  }, [authToken, clientId]);

  const signIn = useCallback(async () => {
    if (!clientId) {
      throw new OneDriveAuthError('EXPO_PUBLIC_ONEDRIVE_CLIENT_ID 환경 변수가 필요합니다.');
    }

    if (!request) {
      throw new OneDriveAuthError('OneDrive 로그인 준비 중입니다. 잠시 후 다시 시도해 주세요.');
    }

    const result = await promptAsync();
    if (result.type === 'error') {
      const oauthErrorCode = result.error?.code ?? result.params.error ?? result.errorCode ?? 'unknown_error';
      const oauthErrorDescription = result.error?.description ?? result.params.error_description;
      const oauthErrorMessage = oauthErrorDescription
        ? `OneDrive OAuth 오류 (${oauthErrorCode}): ${oauthErrorDescription}`
        : `OneDrive OAuth 오류 (${oauthErrorCode})`;
      throw new OneDriveAuthError(oauthErrorMessage);
    }

    if (result.type !== 'success') {
      throw new OneDriveAuthError(`OneDrive 로그인에 실패했습니다. (${result.type})`);
    }

    const code = result.params.code;
    if (!code || !request.codeVerifier) {
      throw new OneDriveAuthError('OneDrive 인증 응답을 처리하지 못했습니다. 다시 시도해 주세요.');
    }

    await exchangeAuthCode(code, request.codeVerifier);
  }, [clientId, exchangeAuthCode, promptAsync, request]);

  const signOut = useCallback(async () => {
    if (authToken?.accessToken && clientId) {
      await revokeAsync(
        {
          clientId,
          token: authToken.accessToken,
        },
        ONEDRIVE_DISCOVERY,
      ).catch(() => {
        // ignore revoke failures
      });
    }

    await clearStoredToken();
    setAuthToken(null);
  }, [authToken?.accessToken, clientId]);

  return {
    hasClientId: Boolean(clientId),
    hasSession: Boolean(authToken?.accessToken),
    isLoading,
    signIn,
    signOut,
    getValidAccessToken,
  };
};
