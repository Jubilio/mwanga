const crypto = require('crypto');
const logger = require('../utils/logger');
const { safeRequestPath } = require('../utils/privacyMask');

// Slower than this is logged as a warning, so slow endpoints stand out in Render logs.
const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS) || 2000;
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

// Every request gets an id (kept from X-Request-Id when the caller sends a sane one),
// returned in the response header and written on its log line. One line per request,
// written when it finishes, with the status and how long it took.
function requestLog(req, res, next) {
  const start = process.hrtime.bigint();
  const incoming = req.get('x-request-id');
  req.id = incoming && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);

  res.on('finish', () => {
    const ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
    const status = res.statusCode;
    const path = safeRequestPath(req);
    const level = status >= 500 ? 'error' : ms >= SLOW_REQUEST_MS ? 'warn' : 'info';
    logger[level]({ reqId: req.id, method: req.method, path, status, ms }, `${req.method} ${path} ${status} ${ms}ms`);
  });
  next();
}

module.exports = { requestLog, SLOW_REQUEST_MS };
