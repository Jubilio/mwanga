const logger = require('../utils/logger');
const { safeRequestPath } = require('../utils/privacyMask');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error(`${req.method} ${safeRequestPath(req)} - ${statusCode} - ${message}`);
  if (err.stack && !isProduction) {
    logger.debug(err.stack);
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
    ...(!isProduction && { stack: err.stack }),
  });
};

module.exports = errorHandler;
