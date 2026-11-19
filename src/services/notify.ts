import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, fromISO } from '@/core/dates';
import type { WeekPlan } from '@/core/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const CHANNEL = 'latihan';

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // eslint-disable-next-line import/namespace -- enum diekspor ulang lewat export * (terverifikasi di build/index.js)
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Latihan', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

/**
 * Jadwalkan ulang semua pengingat:
 * - Minggu 19:00: "Minggu depan mau latihan berapa kali?"
 * - Hari latihan: pengingat sesi
 * - Pagi setelah sesi kunci: check-in pegal
 */
export async function rescheduleAll(plan: WeekPlan | null, time: 'pagi' | 'sore') {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Rencana minggu depan', body: 'Minggu depan mau latihan berapa kali? Ketuk untuk mengatur jadwal.', data: { url: '/minggu-depan' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 19, minute: 0, channelId: CHANNEL },
  });
  if (!plan) return;
  const now = Date.now();
  for (const s of plan.sessions) {
    if (s.status !== 'planned') continue;
    const at = fromISO(s.date);
    at.setHours(time === 'pagi' ? 5 : 16, time === 'pagi' ? 0 : 0, 0, 0);
    if (at.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        content: { title: `Hari ini: ${s.title}`, body: s.summary, data: { url: `/sesi/${encodeURIComponent(s.id)}` } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
    }
    if (s.key) {
      const next = fromISO(addDays(s.date, 1));
      next.setHours(7, 30, 0, 0);
      if (next.getTime() > now) {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Bagaimana kakimu pagi ini?', body: `Check-in pegal setelah ${s.title.toLowerCase()} kemarin (2 ketukan).`, data: { url: `/checkin?moment=esok&sessionId=${encodeURIComponent(s.id)}` } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: next, channelId: CHANNEL },
        });
      }
    }
  }
}
