/**
 * Local notification utilities for commitment reminders.
 *
 * Uses @capacitor/local-notifications so notifications are scheduled entirely
 * on-device — no FCM, no VAPID keys, no backend cron required.
 *
 * Flow:
 *   1. `scheduleCommitmentReminder(commitment)` — requests permission (once),
 *      then schedules a monthly repeating notification at 9 AM one day before
 *      the commitment's due_day.
 *   2. `cancelCommitmentReminder(commitmentId)` — cancels the scheduled
 *      notification for that commitment.
 *   3. `requestPermission()` — requests notification permission and returns
 *      whether it was granted.
 */
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/** Deterministic integer ID from a commitment UUID string. */
function notifId(commitmentId: string): number {
  let hash = 0;
  for (let i = 0; i < commitmentId.length; i++) {
    hash = ((hash << 5) - hash) + commitmentId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Returns true if the app is running as a native Capacitor app. */
function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Requests notification permission. Returns true if granted.
 * Safe to call multiple times — resolves immediately if already granted.
 */
export async function requestPermission(): Promise<boolean> {
  if (!isNative()) return false;
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

/**
 * Schedules a monthly repeating local notification that fires at 9 AM on
 * (due_day − 1) of each month. If due_day is 1, fires on the 1st (same day).
 * Safe to call again — cancels any existing notification for this commitment
 * before rescheduling.
 */
export async function scheduleCommitmentReminder(commitment: {
  id: string;
  name: string;
  due_day: number | null;
}): Promise<boolean> {
  if (!isNative()) return false;

  const granted = await requestPermission();
  if (!granted) return false;

  const { due_day, name, id } = commitment;
  if (!due_day) return false;

  const reminderDay = Math.max(1, due_day - 1);
  const nId = notifId(id);

  // Cancel any existing notification first to avoid duplicates.
  await LocalNotifications.cancel({ notifications: [{ id: nId }] }).catch(() => null);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: nId,
        title: 'Payment Due Tomorrow',
        body: `${name} is due tomorrow. Make sure you're ready.`,
        schedule: {
          on: { day: reminderDay, hour: 9, minute: 0 },
          repeats: true,
          allowWhileIdle: true,
        },
        actionTypeId: '',
        extra: { commitmentId: id },
      },
    ],
  });

  return true;
}

/**
 * Cancels the scheduled local notification for a commitment.
 */
export async function cancelCommitmentReminder(commitmentId: string): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.cancel({ notifications: [{ id: notifId(commitmentId) }] }).catch(
    () => null,
  );
}
