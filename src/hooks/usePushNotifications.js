import { useEffect, useState } from 'react';
import api from '../utils/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;

    setIsSupported(supported);
    if (!supported) {
      return undefined;
    }

    let active = true;

    const refresh = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (active) {
          setIsSubscribed(Boolean(subscription));
          setPermission(Notification.permission);
        }
      } catch {
        if (active) {
          setIsSubscribed(false);
        }
      }
    };

    refresh();
    return () => {
      active = false;
    };
  }, []);

  async function syncSubscription(subscription, metadata = {}) {
    await api.post('/notifications/push-subscriptions', {
      subscription: subscription.toJSON(),
      deviceType: metadata.deviceType || 'pwa',
      platform: metadata.platform || 'web',
    });
  }

  async function isBraveBrowser() {
    try {
      return Boolean(await navigator?.brave?.isBrave?.());
    } catch {
      return false;
    }
  }

  async function resolveRegistration() {
    let registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      return registration;
    }

    if (import.meta.env.PROD) {
      registration = await navigator.serviceWorker.register('/sw.js');
      return registration;
    }

    return navigator.serviceWorker.ready;
  }

  async function enablePush() {
    if (!isSupported) {
      throw new Error('Push notifications are not supported in this browser.');
    }

    setIsLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        throw new Error('Notification permission was not granted.');
      }

      const configResponse = await api.get('/notifications/push-config');
      const { publicKey, enabled } = configResponse.data || {};

      if (!enabled || !publicKey) {
        throw new Error('Push delivery is not configured on the server.');
      }

      let registration = await resolveRegistration();
      await registration.update?.();
      registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await syncSubscription(subscription);
        setIsSubscribed(true);
        return subscription;
      }

      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      } catch (error) {
        const brave = await isBraveBrowser();
        const errorText = String(error?.message || error || '').toLowerCase();

        if (errorText.includes('push service error')) {
          if (brave) {
            throw new Error('O Brave está a bloquear o serviço de push. Ativa "Use Google services for push messaging" e tenta novamente.');
          }

          throw new Error('O navegador recusou o registo push. Recarrega a app, confirma que estás em localhost/HTTPS e tenta outra vez.');
        }

        if (error?.name === 'AbortError') {
          throw new Error('O registo push foi interrompido. Recarrega a app e tenta novamente.');
        }

        throw error;
      }

      await syncSubscription(subscription);
      setIsSubscribed(true);
      return subscription;
    } finally {
      setIsLoading(false);
    }
  }

  async function disablePush() {
    if (!isSupported) {
      return;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await api.delete('/notifications/push-subscriptions', {
          data: { endpoint: subscription.endpoint },
        });
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshSubscriptionStatus() {
    if (!isSupported) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(Boolean(subscription));
    return Boolean(subscription);
  }

  async function sendTestPush() {
    await api.post('/notifications/test');
  }

  return {
    disablePush,
    enablePush,
    isLoading,
    isSubscribed,
    isSupported,
    permission,
    refreshSubscriptionStatus,
    sendTestPush,
  };
}
