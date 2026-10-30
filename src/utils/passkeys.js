import { Capacitor } from '@capacitor/core';
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';
import api from './api';

/** The Android WebView has no WebAuthn, so biometric login is offered on the web only. */
export function passkeysAvailable() {
  return !Capacitor.isNativePlatform() && browserSupportsWebAuthn();
}

export async function registerPasskey() {
  const { data: optionsJSON } = await api.get('/auth/webauthn/generate-registration-options');
  const response = await startRegistration({ optionsJSON });
  await api.post('/auth/webauthn/verify-registration', response);
}

export async function loginWithPasskey(email) {
  const { data: optionsJSON } = await api.post('/auth/webauthn/generate-authentication-options', { email });
  const response = await startAuthentication({ optionsJSON });
  const { data } = await api.post('/auth/webauthn/verify-authentication', { email, response });
  return data;
}
