const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss');
const compression = require('compression');
const errorHandler = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const financeRoutes = require('./routes/finance.routes');
const smsRoutes = require('./routes/smsRoutes');
const creditRoutes = require('./routes/credit.routes');
const kycRoutes = require('./routes/kyc.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');
const { getNotificationReadValue } = require('./services/notificationRead.service');
const logger = require('./utils/logger');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const swaggerDocument = YAML.load(path.join(__dirname, 'config', 'swagger.yaml'));

const app = express();

app.set('trust proxy', 1);

// 1. Security Middlewares
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://accounts.google.com", "https://mwanga-opal.vercel.app"],
      "frame-src": ["'self'", "https://accounts.google.com"],
      "connect-src": ["'self'", "https://accounts.google.com", "https://mwanga-opal.vercel.app", "https://topical-jaguar-71639.upstash.io"],
    },
  },
}));

// 2. CORS
app.use(cors({
  origin: [
    'https://mwanga-opal.vercel.app',
    'https://mwanga-qdsmbf6ck-jubilio-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Compression
app.use(compression());

// 4. Rate Limiting (JSON fixed)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5000,
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(hpp());

app.use((req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
    }
  }
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
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/auth', authRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

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
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// 11. Error Handling
app.use(errorHandler);

module.exports = app;
