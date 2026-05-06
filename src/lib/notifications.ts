/**
 * Web Push notification utilities.
 *
 * Flow:
 *   1. `requestAndSubscribe(userId)` — asks for permission, registers the
 *      service worker, creates a PushManager subscription, and upserts it
 *      into the `push_subscriptions` Supabase table so the backend cron can
 *      send reminders.
 *   2. `unsubscribe(userId)` — cancels the push subscription and removes
 *      the row from Supabase.
 *   3. `getPermission()` — returns the current Notification permission
 *      state ('granted' | 'denied' | 'default' | 'unsupported').
 *
 * The VITE_VAPID_PUBLIC_KEY env var must be the URL-safe-base64 string
 * generated alongside the private key stored in the backend.
 */
import { supabase } from '@/lib/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';
const SW_PATH = '/sw.js';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function isNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function getPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function getOrRegisterSW(): Promise<ServiceWorkerRegistration | null> {
  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (existing) return existing;
    return await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  } catch {
    return null;
  }
}

/**
 * Requests notification permission, subscribes to push, and stores the
 * subscription in Supabase. Returns the final permission state.
 */
export async function requestAndSubscribe(
  userId: string,
): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;

  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY not set — push subscription skipped.');
    return 'granted';
  }

  const registration = await getOrRegisterSW();
  if (!registration) return 'granted';

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'granted';

    await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: 'user_id,endpoint' },
    );
  } catch {
    // Push subscription failed — permission is still granted, so return that.
  }

  return 'granted';
}

/**
 * Cancels the push subscription and removes it from Supabase.
 */
export async function unsubscribe(userId: string): Promise<void> {
  if (!isNotificationSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint);
}
