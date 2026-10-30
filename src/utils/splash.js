import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

// AppSplash hides the native splash on its first render; this only covers a
// render that never happens (e.g. a crash before React mounts).
const MAX_SPLASH_MS = 10000;
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
