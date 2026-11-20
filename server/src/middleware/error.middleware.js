const logger = require('../utils/logger');
const { safeRequestPath } = require('../utils/privacyMask');
const { captureException } = require('../utils/sentry');

// Stable codes the app can branch on, instead of matching the Portuguese text.
const STATUS_CODES = {
  400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND',
  409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE', 422: 'UNPROCESSABLE', 429: 'RATE_LIMITED',
};

function errorCode(err, statusCode) {
  // A 500's own code (ECONNREFUSED, a driver code...) is an internal detail: never sent.
  if (statusCode >= 500) return 'INTERNAL_ERROR';
  if (typeof err.code === 'string' && /^[A-Z][A-Z0-9_]{2,60}$/.test(err.code)) return err.code;
  return STATUS_CODES[statusCode] || 'ERROR';
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  const isProduction = process.env.NODE_ENV === 'production';
  const path = safeRequestPath(req);

  logger.error({ reqId: req.id }, `${req.method} ${path} - ${statusCode} - ${message}`);
  if (err.stack && !isProduction) {
    logger.debug(err.stack);
  }
  if (statusCode >= 500) {
    captureException(err, { reqId: req.id, method: req.method, path, userId: req.user?.id });
  }

  // In production a 500 can carry database or library internals (table names,
  // SQL, file paths). The detail stays in the logs; the client gets a generic text.
  const clientMessage = isProduction && statusCode >= 500
    ? 'Ocorreu um erro interno. Tente novamente.'
    : message;

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    code: errorCode(err, statusCode),
    // `error` and `message` carry the same text: older screens read one, newer the other.
    error: clientMessage,
    message: clientMessage,
    // Quoted by the user when they report a problem, to find the log line.
    ...(req.id && { requestId: req.id }),
    ...(!isProduction && { stack: err.stack }),
  });
};

module.exports = errorHandler;
module.exports.errorCode = errorCode;
