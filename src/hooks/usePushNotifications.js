import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import api from '../utils/api';
import { useFinance } from './useFinance';
const changedEvent = 'mwanga-push-changed';
function urlBase64ToUint8Array(value) {
  const base64 = (value + '='.repeat((4 - value.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(window.atob(base64), char => char.charCodeAt(0));
}
export function usePushNotifications() {
  const { state } = useFinance();
  const storageKey = `mwanga-native-push-v1-${state.user?.id || 'guest'}`;
  // Native (Android/iOS) push relied on Firebase and was removed. The Capacitor
  // WebView has no Web Push, so push is unsupported inside the native app;
  // in-app notifications still work there.
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lock = useRef(false);
  const isNative = Capacitor.isNativePlatform();
  const refreshStatus = useCallback(async () => {
    try {
      if (isNative) {
        setIsSupported(false);
        setIsSubscribed(false);
      } else {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        setIsSupported(supported);
        if (!supported) { setIsSubscribed(false); return; }
        setPermission(Notification.permission);
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        const enabled = localStorage.getItem(`${storageKey}-web-enabled`);
        setIsSubscribed(Boolean(subscription) && enabled !== 'false');
      }
    } catch { setIsSubscribed(false); }
  }, [isNative, storageKey]);
  useEffect(() => {
    refreshStatus();
    window.addEventListener(changedEvent, refreshStatus);
    return () => window.removeEventListener(changedEvent, refreshStatus);
  }, [refreshStatus]);
  const announce = () => window.dispatchEvent(new Event(changedEvent));
  async function enablePush() {
    if (lock.current) throw new Error('PUSH_BUSY');
    lock.current = true; setIsLoading(true);
    try {
      if (isNative) throw new Error('PUSH_NOT_SUPPORTED');
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') throw new Error('PERMISSION_DENIED');
      const { data } = await api.get('/notifications/push-config');
      if (!data?.enabled || !data.publicKey) throw new Error('PUSH_NOT_CONFIGURED');
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('SERVICE_WORKER_NOT_READY');
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(data.publicKey) });
      localStorage.setItem(`${storageKey}-web-enabled`, 'false');
      await api.post('/notifications/push-subscriptions', { subscription: subscription.toJSON(), deviceType: 'pwa', platform: Capacitor.getPlatform() });
      localStorage.setItem(`${storageKey}-web-enabled`, 'true');
      setIsSubscribed(true); announce(); return subscription;
    } finally { lock.current = false; setIsLoading(false); }
  }
  async function disablePush() {
    if (lock.current) throw new Error('PUSH_BUSY');
    lock.current = true; setIsLoading(true);
    try {
      if (isNative) {
        // Drop the server copy of a token saved before native push was removed.
        let stored;
        try { stored = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { stored = null; }
        if (stored?.endpoint) await api.delete('/notifications/push-subscriptions', { data: { endpoint: stored.endpoint } });
        localStorage.removeItem(storageKey);
      } else {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await api.delete('/notifications/push-subscriptions', { data: { endpoint: subscription.endpoint } });
          const removed = await subscription.unsubscribe();
          if (!removed) throw new Error('UNSUBSCRIBE_FAILED');
        }
        localStorage.setItem(`${storageKey}-web-enabled`, 'false');
      }
      setIsSubscribed(false); announce();
    } finally { lock.current = false; setIsLoading(false); }
  }
  return { disablePush, enablePush, isLoading, isSubscribed, isSupported, permission, refreshSubscriptionStatus: refreshStatus, sendTestPush: () => api.post('/notifications/test') };
}
