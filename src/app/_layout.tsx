import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, useFonts } from '@expo-google-fonts/barlow-condensed';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider, useStore } from '@/data/store';
import { ThemeModeContext, useIsDark, useTheme } from '@/ui/theme';

function useNotificationLinks() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (n: Notifications.Notification | undefined) => {
      const url = n?.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) open(last.notification);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    return () => sub.remove();
  }, []);
}

function Nav() {
  const t = useTheme();
  const dark = useIsDark();
  const nav = dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...nav, colors: { ...nav.colors, background: t.bg, card: t.bg, text: t.ink, border: t.line, primary: t.accent } }}>
      <StatusBar style={t.statusBar} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: t.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="minggu-depan" options={{ title: 'Rencana minggu' }} />
        <Stack.Screen name="sesi/[id]" options={{ title: 'Sesi' }} />
        <Stack.Screen name="checkin" options={{ title: 'Check-in', presentation: 'modal' }} />
        <Stack.Screen name="lomba/[id]" options={{ title: 'Lomba' }} />
        <Stack.Screen name="lomba/edit" options={{ title: 'Data lomba' }} />
        <Stack.Screen name="gerakan/index" options={{ title: 'Library gerakan' }} />
        <Stack.Screen name="gerakan/[id]" options={{ title: 'Gerakan' }} />
        <Stack.Screen name="aktivitas/[id]" options={{ title: 'Aktivitas' }} />
        <Stack.Screen name="statistik" options={{ title: 'Statistik' }} />
        <Stack.Screen name="pengaturan/[bagian]" options={{ title: 'Pengaturan' }} />
      </Stack>
    </ThemeProvider>
  );
}

function ThemedApp() {
  const { settings } = useStore();
  useNotificationLinks();
  return (
    <ThemeModeContext.Provider value={settings.themeMode ?? 'sistem'}>
      <Nav />
    </ThemeModeContext.Provider>
  );
}

export default function RootLayout() {
  // Font angka dimuat di latar; teks memakai font sistem sampai siap.
  useFonts({ BarlowCondensed_600SemiBold, BarlowCondensed_700Bold });
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemedApp />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
