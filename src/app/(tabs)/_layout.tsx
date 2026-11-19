import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { useStore } from '@/data/store';
import { IconCalendar, IconChart, IconFlag, IconHome, IconUser } from '@/ui/icons';
import { useTheme } from '@/ui/theme';

export default function TabsLayout() {
  const t = useTheme();
  const { ready, profile } = useStore();
  if (ready && !profile) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.line },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Hari ini', tabBarIcon: ({ color }) => <IconHome color={color} /> }} />
      <Tabs.Screen name="minggu" options={{ title: 'Minggu', tabBarIcon: ({ color }) => <IconCalendar color={color} /> }} />
      <Tabs.Screen name="lomba" options={{ title: 'Lomba', tabBarIcon: ({ color }) => <IconFlag color={color} /> }} />
      <Tabs.Screen name="progres" options={{ title: 'Progres', tabBarIcon: ({ color }) => <IconChart color={color} /> }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: ({ color }) => <IconUser color={color} /> }} />
    </Tabs>
  );
}
