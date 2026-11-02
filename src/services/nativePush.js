// Install both listeners before registering: native registration may complete
// before register() resolves. Remove only our listeners on every outcome.
export async function registerNativePush(plugin, timeoutMs = 15000) {
  const listeners = [];
  let timer;
  let resolveToken, rejectToken;
  const token = new Promise((resolve, reject) => { resolveToken = resolve; rejectToken = reject; });
  // Attach a rejection handler immediately, including setup/register failures.
  token.catch(() => {});
  try {
    listeners.push(await plugin.addListener('registration', result => resolveToken(result.value)));
    listeners.push(await plugin.addListener('registrationError', err => {
      const error = new Error('REGISTRATION_FAILED');
      // Firebase's own reason (for example SERVICE_NOT_AVAILABLE when the phone has no Google Play services).
      error.detail = err?.error || '';
      rejectToken(error);
    }));
    timer = setTimeout(() => rejectToken(new Error('REGISTRATION_TIMEOUT')), timeoutMs);
    await Promise.race([plugin.register(), token.then(() => undefined)]);
    const value = await token;
    if (!value) throw new Error('REGISTRATION_FAILED');
    return value;
  } finally {
    clearTimeout(timer);
    await Promise.allSettled(listeners.map(listener => listener.remove()));
  }
}
export async function disableNativePush(plugin, api, endpoint) {
  const token = endpoint || await registerNativePush(plugin);
  // Remove the server subscription first. If this fails, retain the endpoint
  // for a retry instead of falsely displaying a successful disable.
  await api.delete('/notifications/push-subscriptions', { data: { endpoint: token } });
  await plugin.unregister();
}
