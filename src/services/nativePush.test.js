import { afterEach, expect, it, vi } from 'vitest';
import { registerNativePush, disableNativePush } from './nativePush';
afterEach(() => vi.useRealTimers());
function plugin() {
  const events = {}, remove = vi.fn();
  return { events, remove, addListener: vi.fn(async (name, listener) => { events[name] = listener; return { remove }; }), register: vi.fn(async () => events.registration({ value: 'native-token' })), unregister: vi.fn(async () => {}) };
}
it('captures immediate registration events with listeners installed first and cleans them up', async () => {
  const native = plugin();
  expect(await registerNativePush(native)).toBe('native-token');
  expect(native.addListener).toHaveBeenCalledTimes(2);
  expect(native.remove).toHaveBeenCalledTimes(2);
});
it('propagates registration failures instead of false success and removes listeners', async () => {
  const native = plugin(); native.register.mockRejectedValueOnce(new Error('FCM missing'));
  await expect(registerNativePush(native)).rejects.toThrow('FCM missing');
  expect(native.remove).toHaveBeenCalledTimes(2);
});
it('does not hang forever when the native plugin never emits a token', async () => {
  vi.useFakeTimers();
  const native = plugin(); native.register.mockResolvedValueOnce(undefined);
  const pending = registerNativePush(native, 100);
  const result = expect(pending).rejects.toThrow('REGISTRATION_TIMEOUT');
  await vi.advanceTimersByTimeAsync(101); await result;
  expect(native.remove).toHaveBeenCalledTimes(2);
});
it('removes the server subscription before unregistering the device', async () => {
  const native = plugin(), order = [];
  const api = { delete: vi.fn(async () => order.push('server')) };
  native.unregister.mockImplementation(async () => order.push('native'));
  await disableNativePush(native, api, 'stored-token');
  expect(api.delete).toHaveBeenCalledWith('/notifications/push-subscriptions', { data: { endpoint: 'stored-token' } });
  expect(order).toEqual(['server', 'native']);
});
it('keeps native registration available for retry if removing the server subscription fails', async () => {
  const native = plugin(), api = { delete: vi.fn().mockRejectedValue(new Error('offline')) };
  await expect(disableNativePush(native, api, 'stored-token')).rejects.toThrow('offline');
  expect(native.unregister).not.toHaveBeenCalled();
});
it('recovers a legacy token before disabling and does not create a new server subscription', async () => {
  const native = plugin(), api = { delete: vi.fn(async () => {}) };
  await disableNativePush(native, api);
  expect(api.delete).toHaveBeenCalledWith('/notifications/push-subscriptions', { data: { endpoint: 'native-token' } });
});
