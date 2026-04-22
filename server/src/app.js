const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');
const xss = require('xss');
const errorHandler = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const financeRoutes = require('./routes/finance.routes');
const smsRoutes = require('./routes/smsRoutes');
const creditRoutes = require('./routes/credit.routes');
const kycRoutes = require('./routes/kyc.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');
const inviteRoutes = require('./routes/invite.routes');
const webauthnRoutes = require('./routes/webauthn.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const { getNotificationReadValue } = require('./services/notificationRead.service');
const { initFeedbackTable } = require('./services/feedback.service');
const { initHouseholdExtras } = require('./services/household.service');
const logger = require('./utils/logger');
const path = require('path');

const app = express();

// Initialize tables
initFeedbackTable();
initHouseholdExtras();

app.set('trust proxy', 1);

// 1. Security Middlewares
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:", "http://localhost:3001", "https://mwanga-opal.vercel.app", "https://mwangafin.netlify.app", "https://ui-avatars.com"],
      "script-src": ["'self'", "https://accounts.google.com", "https://mwanga-opal.vercel.app", "https://mwangafin.netlify.app"],
      "frame-src": ["'self'", "https://accounts.google.com"],
      "connect-src": ["'self'", "https://accounts.google.com", "https://mwanga-opal.vercel.app", "https://mwangafin.netlify.app", "https://topical-jaguar-71639.upstash.io"],
    },
  },
}));

// 2. CORS
app.use(cors({
  origin: [
    'https://mwanga-opal.vercel.app',
    'https://mwanga-qdsmbf6ck-jubilio-projects.vercel.app',
    'https://mwangafin.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8081'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Compression
app.use(compression());

// 4. Rate Limiting
// 300 req/15min por IP é mais que suficiente para uso legítimo de uma fintech.
// Reduzido de 5000 que era demasiado permissivo e não protegia contra scraping/DoS.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Demasiados pedidos a partir deste IP. Por favor, tente novamente em 15 minutos.'
    });
  }
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Demasiadas tentativas de login. Tente novamente em uma hora.'
    });
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 5. Body Parsing & Sanitization
// 1MB é mais que suficiente para uma API financeira e reduz o risco de DoS por payload.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(hpp());

// Sanitização recursiva com a biblioteca xss (já instalada).
// A versão anterior só cobria strings no root do body — esta cobre objetos nested.
function sanitizeDeep(value) {
  if (typeof value === 'string') return xss(value);
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitizeDeep(v)])
    );
  }
  return value;
}

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeDeep(req.body);
  next();
});

// 6. Static Files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 7. Request Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// 8. Health Check
app.get('/api/health', async (req, res) => {
  try {
    const { db } = require('./config/db');
    await db.execute({ sql: 'SELECT 1', args: [] });
    res.json({
      status: 'healthy',
      branding: 'Mwanga ✦',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// 9. Routes registration
app.use('/api/feedback', feedbackRoutes);
app.use('/api/auth/webauthn', webauthnRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/households', inviteRoutes);
app.use('/api/behavior', require('./routes/behavior.routes'));

app.use('/api', financeRoutes);

app.get('/', (req, res) => {
  res.send('Mwanga ✦ Backend API is running.');
});

// 10. Metrics (Admin only)
const { authenticate, isAdmin } = require('./middleware/auth.middleware');
app.get('/api/metrics', authenticate, isAdmin, async (req, res) => {
  try {
    const { db } = require('./config/db');
    const unreadValue = await getNotificationReadValue(false);
    const stats = await db.execute({
      sql: `SELECT 
        (SELECT COUNT(*) FROM transactions) as total_transactions,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM households) as total_households,
        (SELECT COUNT(*) FROM notifications WHERE read = ?) as unread_notifications`,
      args: [unreadValue]
    });
    res.json({
      timestamp: new Date(),
      database: stats.rows[0],
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Metrics collection failed:', error.message);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// 11. Error Handling
app.use(errorHandler);

module.exports = app;
