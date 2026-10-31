import { Capacitor, registerPlugin } from '@capacitor/core';
import { MONEY_SMS_BODY_MARKERS, MONEY_SMS_SENDERS, isMoneySms } from '../utils/moneySmsSenders';

const MoneySms = registerPlugin('MoneySms');

export function isSmsInboxSupported() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * 'granted' | 'prompt' | 'prompt-with-rationale' | 'denied' | 'unavailable'.
 * On Android, 'denied' means the system will not show the dialog again: the user
 * chose "don't allow" twice (or "don't ask again"), or Android blocked it as a
 * restricted setting for an app installed outside the Play Store.
 */
export async function getSmsPermission() {
  if (!isSmsInboxSupported()) return 'unavailable';
  try {
    const { sms } = await MoneySms.checkPermissions();
    return sms;
  } catch {
    return 'unavailable';
  }
}

export async function requestSmsPermission() {
  if (!isSmsInboxSupported()) return 'unavailable';
  try {
    const { sms } = await MoneySms.requestPermissions({ permissions: ['sms'] });
    return sms;
  } catch {
    return 'denied';
  }
}

/** { sdkInt, installer, fromPlayStore }, or null outside the Android app. */
export async function getInstallInfo() {
  if (!isSmsInboxSupported()) return null;
  try {
    return await MoneySms.getInfo();
  } catch {
    return null;
  }
}

/** Android 13+ blocks SMS access for apps installed from a file until "restricted settings" is allowed. */
export function needsRestrictedSettings(info) {
  return Boolean(info && info.sdkInt >= 33 && !info.fromPlayStore);
}

export async function openAppSettings() {
  if (!isSmsInboxSupported()) return false;
  try {
    await MoneySms.openAppSettings();
    return true;
  } catch {
    return false;
  }
}

/** Mobile money and bank SMS received since minDate, newest first. */
export async function listMoneySms({ minDate, maxCount = 200 }) {
  const { smsList } = await MoneySms.listMessages({
    minDate,
    maxCount,
    senders: MONEY_SMS_SENDERS,
    bodyMarkers: MONEY_SMS_BODY_MARKERS,
  });
  return (smsList || []).filter(isMoneySms);
}
