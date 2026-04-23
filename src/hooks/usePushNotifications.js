import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
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
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  const refreshStatus = useCallback(async () => {
    if (isNative) {
      setIsSupported(true);
      const perm = await PushNotifications.checkPermissions();
      setPermission(perm.receive);
      // In native, we check if we have a token stored or if we are registered
      // For simplicity, we'll rely on the enablePush flow
    } else {
      const supported = typeof window !== 'undefined'
        && 'serviceWorker' in navigator
        && 'PushManager' in window
        && 'Notification' in window;

      setIsSupported(supported);
      if (supported) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(Boolean(subscription));
          setPermission(Notification.permission);
        } catch {
          setIsSubscribed(false);
        }
      }
    }
  }, [isNative]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  async function syncSubscription(subscriptionData, metadata = {}) {
    await api.post('/notifications/push-subscriptions', {
      subscription: subscriptionData,
      deviceType: metadata.deviceType || (isNative ? 'native' : 'pwa'),
      platform: metadata.platform || Capacitor.getPlatform(),
    });
  }

  async function enablePush() {
    setIsLoading(true);
    try {
      if (isNative) {
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') {
          perm = await PushNotifications.requestPermissions();
        }
        setPermission(perm.receive);

        if (perm.receive !== 'granted') {
          throw new Error('PERMISSION_DENIED');
        }

        await PushNotifications.register();

        return new Promise((resolve, reject) => {
          PushNotifications.addListener('registration', async (token) => {
            try {
              // Format FCM token to look like a subscription object for the backend or handle separately
              const subscription = {
                endpoint: token.value,
                isNative: true
              };
              await syncSubscription(subscription);
              setIsSubscribed(true);
              resolve(token.value);
            } catch (err) {
              reject(err);
            }
          });

          PushNotifications.addListener('registrationError', (error) => {
            reject(new Error(`Registration error: ${error.error}`));
          });
        });
      } else {
        // Web Push Logic (unchanged from original but cleaned up)
        const permissionResult = await Notification.requestPermission();
        setPermission(permissionResult);

        if (permissionResult !== 'granted') {
          throw new Error('PERMISSION_DENIED');
        }

        const configResponse = await api.get('/notifications/push-config');
        const { publicKey, enabled } = configResponse.data || {};

        if (!enabled || !publicKey) {
          throw new Error('PUSH_NOT_CONFIGURED');
        }

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        await syncSubscription(subscription.toJSON());
        setIsSubscribed(true);
        return subscription;
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function disablePush() {
    setIsLoading(true);
    try {
      if (isNative) {
        // Capacitor doesn't have a direct "unregister" that clears the token from FCM usually
        // but we can remove it from our backend
        // We'd need to store the token locally to find it and delete it
        setIsSubscribed(false);
      } else {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await api.delete('/notifications/push-subscriptions', {
            data: { endpoint: subscription.endpoint },
          });
          await subscription.unsubscribe();
        }
        setIsSubscribed(false);
      }
    } finally {
      setIsLoading(false);
    }
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
    refreshSubscriptionStatus: refreshStatus,
    sendTestPush,
  };
}

