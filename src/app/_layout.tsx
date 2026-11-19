import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider } from '@/data/store';
import { useTheme } from '@/ui/theme';

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

export default function RootLayout() {
  const t = useTheme();
  const scheme = useColorScheme();
  useNotificationLinks();
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
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
          <Stack.Screen name="gerakan/[id]" options={{ title: 'Gerakan' }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
