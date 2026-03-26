import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { registerPeriodicTodoBackgroundSync } from '@/features/sync/background-sync-task';
import { registerJoplinHomeWidgetTask } from '@/features/widget/android-home-widget';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    registerJoplinHomeWidgetTask();
    registerPeriodicTodoBackgroundSync().catch((error: unknown) => {
      console.error('[background-sync-registration-failed]', error);
    });
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Slot />
    </ThemeProvider>
  );
}
