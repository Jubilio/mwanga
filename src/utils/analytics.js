import { Capacitor } from '@capacitor/core';

/**
 * Google Analytics 4, loaded only on the website and only when
 * VITE_GA_MEASUREMENT_ID is set. Nothing is sent from the Android app.
 *
 * Privacy rules: only page paths and a few named events are sent. Never send
 * amounts, names, emails, phone numbers, SMS text or anything a user typed.
 * Query strings and hashes are stripped from page paths (they can hold reset
 * tokens or OAuth fragments).
 */
const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
let ready = false;

export function analyticsEnabled() {
  return Boolean(MEASUREMENT_ID) && import.meta.env.PROD && !Capacitor.isNativePlatform();
}

export function initAnalytics() {
  if (ready || !analyticsEnabled()) return;
  ready = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js reads the arguments object itself, so it must be pushed as-is.
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function trackPageView(pathname) {
  if (!ready || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: pathname,
    page_location: `${window.location.origin}${pathname}`,
    page_title: document.title,
  });
}

/** Allowed events: sign_up, login, download_apk, cta_click. Params must not hold personal data. */
export function trackEvent(name, params = {}) {
  if (!ready || !window.gtag) return;
  window.gtag('event', name, params);
}
