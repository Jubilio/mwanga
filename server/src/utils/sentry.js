const logger = require('./logger');

// Server errors go to Sentry only when SENTRY_DSN is set (Render env var).
// Without it every function here does nothing, so local runs and tests are unaffected.
let Sentry = null;

function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || Sentry) return false;
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: logger.release,
      tracesSampleRate: 0,
      sendDefaultPii: false,
      // Financial data: never send request bodies, cookies or headers.
      beforeSend(event) {
        if (event.request) {
          delete event.request.data;
          delete event.request.cookies;
          delete event.request.headers;
          delete event.request.query_string;
        }
        return event;
      },
    });
    logger.info('Sentry error reporting enabled');
    return true;
  } catch (err) {
    Sentry = null;
    logger.warn(`Sentry could not start: ${err.message}`);
    return false;
  }
}

function captureException(err, context = {}) {
  if (!Sentry) return;
  try {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        if (value !== undefined) scope.setTag(key, String(value));
      }
      Sentry.captureException(err);
    });
  } catch { /* reporting must never break the request */ }
}

async function flushSentry(timeoutMs = 2000) {
  if (!Sentry) return;
  try { await Sentry.flush(timeoutMs); } catch { /* ignore */ }
}

module.exports = { initSentry, captureException, flushSentry };
