import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

// Render's free instance can take close to a minute to wake up; past this the
// in-app loading screen takes over so the splash never gets stuck.
const MAX_SPLASH_MS = 45000;
let hidden = false;

/** Hides the native splash once; safe to call from anywhere and on the web. */
export function hideSplash() {
  if (hidden || !Capacitor.isNativePlatform()) return;
  hidden = true;
  SplashScreen.hide().catch(() => {});
}

export function scheduleSplashFallback() {
  if (Capacitor.isNativePlatform()) setTimeout(hideSplash, MAX_SPLASH_MS);
}
