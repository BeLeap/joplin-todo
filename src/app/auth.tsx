import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const getFirstParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const decodeQueryValue = (value: string | undefined) => {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ error?: string | string[]; error_description?: string | string[] }>();
  const error = useMemo(() => decodeQueryValue(getFirstParam(params.error)), [params.error]);
  const errorDescription = useMemo(
    () => decodeQueryValue(getFirstParam(params.error_description)),
    [params.error_description],
  );

  if (!error) {
    return <Redirect href="/" />;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">OneDrive 로그인 실패</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
          {errorDescription ? <ThemedText type="small">{errorDescription}</ThemedText> : null}
          <Pressable style={styles.button} onPress={() => router.replace('/')}>
            <ThemedText type="link">홈으로 돌아가기</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  card: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  button: {
    marginTop: Spacing.one,
  },
});
