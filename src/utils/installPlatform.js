// Browsers on iOS that are not Safari, and in-app browsers (WhatsApp, Facebook, Instagram…)
// that open links in their own window. In those, "Add to Home Screen" is missing or hidden,
// so we ask people to open the page in Safari.
const NON_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|YaBrowser|DuckDuckGo|FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|musical_ly|WhatsApp|Twitter/i;

/**
 * Works out how this visitor can install Mwanga.
 * iPadOS reports itself as a Mac, so a Mac user agent with a touch screen counts as iOS.
 */
export function detectInstallPlatform({ userAgent = '', maxTouchPoints = 0, standalone = false } = {}) {
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  const safari = ios && /Safari\//i.test(userAgent) && !NON_SAFARI.test(userAgent);
  return { ios, safari, standalone: Boolean(standalone) };
}

export function currentInstallPlatform() {
  if (typeof window === 'undefined') return detectInstallPlatform();
  const standalone = window.navigator.standalone === true
    || (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
  return detectInstallPlatform({
    userAgent: window.navigator.userAgent,
    maxTouchPoints: window.navigator.maxTouchPoints || 0,
    standalone,
  });
}
