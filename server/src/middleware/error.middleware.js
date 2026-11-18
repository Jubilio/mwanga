const logger = require('../utils/logger');
const { safeRequestPath } = require('../utils/privacyMask');
const { captureException } = require('../utils/sentry');

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
    message: clientMessage,
    // Quoted by the user when they report a problem, to find the log line.
    ...(req.id && { requestId: req.id }),
    ...(!isProduction && { stack: err.stack }),
  });
};

module.exports = errorHandler;
