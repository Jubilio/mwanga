import { expect, it } from 'vitest';
import { describePushError } from './pushErrors';
const err = (message, extra = {}) => Object.assign(new Error(message), extra);
it('separates phone and browser permission denials', () => {
  expect(describePushError(err('PERMISSION_DENIED'), { isNative: true }).key).toBe('denied_native');
  expect(describePushError(err('PERMISSION_DENIED')).key).toBe('denied_web');
});
it('names missing server configuration for each platform', () => {
  expect(describePushError(err('PUSH_NOT_CONFIGURED')).key).toBe('web_not_configured');
  expect(describePushError(err('NATIVE_PUSH_NOT_CONFIGURED'), { isNative: true }).key).toBe('native_not_configured');
});
it('keeps the Firebase reason for a failed device registration', () => {
  const result = describePushError(err('REGISTRATION_FAILED', { detail: 'SERVICE_NOT_AVAILABLE' }), { isNative: true });
  expect(result.key).toBe('fcm_failed');
  expect(result.code).toBe('REGISTRATION_FAILED: SERVICE_NOT_AVAILABLE');
});
it('explains network, session and server failures from the API', () => {
  expect(describePushError(err('Network Error', { isAxiosError: true })).key).toBe('offline');
  expect(describePushError(err('x', { isAxiosError: true, response: { status: 401 } })).key).toBe('session');
  const server = describePushError(err('x', { isAxiosError: true, response: { status: 500, data: { message: 'Failed to save push subscription.' } } }));
  expect(server).toEqual({ key: 'server', values: { status: 500 }, code: 'HTTP 500: Failed to save push subscription.' });
});
it('falls back to the raw error name so nothing is silent', () => {
  const abort = Object.assign(new Error('Registration failed - push service error'), { name: 'AbortError' });
  expect(describePushError(abort)).toMatchObject({ key: 'unknown', code: 'AbortError: Registration failed - push service error' });
});
