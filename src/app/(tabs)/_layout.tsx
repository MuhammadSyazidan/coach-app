import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/data/store';
import { IconCalendar, IconFlag, IconList, IconToday, IconUser } from '@/ui/icons';
import { useTheme } from '@/ui/theme';

export default function TabsLayout() {
  const t = useTheme();
  const { ready, profile } = useStore();
  const insets = useSafeAreaInsets();
  if (ready && !profile) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.ink,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.tabBar, borderTopColor: t.line, borderTopWidth: 0.5, height: 64 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 8 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: t.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Hari ini', tabBarIcon: ({ color }) => <IconToday color={color} size={26} /> }} />
      <Tabs.Screen name="minggu" options={{ title: 'Rencana', tabBarIcon: ({ color }) => <IconCalendar color={color} size={26} /> }} />
      <Tabs.Screen name="aktivitas" options={{ title: 'Aktivitas', tabBarIcon: ({ color }) => <IconList color={color} size={26} /> }} />
      <Tabs.Screen name="lomba" options={{ title: 'Lomba', tabBarIcon: ({ color }) => <IconFlag color={color} size={26} /> }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: ({ color }) => <IconUser color={color} size={26} /> }} />
    </Tabs>
  );
}
