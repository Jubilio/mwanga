const pino = require('pino');

// Secrets never reach the logs, whatever object is passed in. Covers request
// headers, the body of auth calls and personal AI keys.
const REDACT_PATHS = [
  'authorization', 'cookie', 'password', 'token', 'apiKey', 'api_key', 'secret',
  'accessToken', 'refreshToken', 'refresh_token', 'access_token', 'code_verifier',
  '*.authorization', '*.Authorization', '*.cookie', '*.password', '*.token',
  '*.apiKey', '*.api_key', '*.secret', '*.accessToken', '*.refreshToken',
  '*.refresh_token', '*.access_token', '*.code_verifier', '*.password_hash',
  'req.headers.authorization', 'req.headers.cookie', 'headers.authorization', 'headers.cookie',
  'req.body.password', 'req.body.apiKey', 'req.body.token',
];

// Production writes one JSON object per line (searchable in the Render log
// explorer). Development keeps the coloured, readable output.
const jsonLogs = process.env.NODE_ENV === 'production' || process.env.LOG_FORMAT === 'json';

const release = (process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || '').slice(0, 7) || undefined;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: { paths: REDACT_PATHS, censor: '[redacted]' },
  base: jsonLogs ? { service: 'mwanga-api', ...(release ? { release } : {}) } : undefined,
  ...(jsonLogs ? {} : {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

logger.release = release;
logger.REDACT_PATHS = REDACT_PATHS;

module.exports = logger;
