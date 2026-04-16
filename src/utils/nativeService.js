import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { PushNotifications } from '@capacitor/push-notifications';

export const isNative = Capacitor.isNativePlatform();

export const storageSet = async (key, value) => {
  if (isNative) {
    await SecureStoragePlugin.set({ key, value });
  } else {
    localStorage.setItem(key, value); 
  }
};

export const storageGet = async (key) => {
  if (isNative) {
    try {
      const { value } = await SecureStoragePlugin.get({ key });
      return value;
    } catch {
      return null;
    }
  }
  return localStorage.getItem(key);
};

export const registerNativePush = async () => {
  if (isNative) {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
    }
  }
};
