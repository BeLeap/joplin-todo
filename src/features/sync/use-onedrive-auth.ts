import {
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseType,
  revokeAsync,
  useAuthRequest,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { OneDriveAuthError } from './errors';
import {
  clearStoredToken,
  getValidStoredAccessToken,
  ONEDRIVE_DISCOVERY,
  readStoredToken,
  toExpiresAt,
  type StoredAuthToken,
  writeStoredToken,
} from './onedrive-auth-session';

WebBrowser.maybeCompleteAuthSession();

const ONEDRIVE_SCOPES = ['openid', 'profile', 'offline_access', 'Files.Read'];

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
    const token = await getValidStoredAccessToken(clientId);
    if (!token) {
      setAuthToken(null);
      return null;
    }

    const stored = await readStoredToken();
    setAuthToken(stored);
    return token;
  }, [clientId]);

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
      );
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
