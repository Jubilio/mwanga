const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss');
const errorHandler = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const financeRoutes = require('./routes/finance.routes');
const smsRoutes = require('./routes/smsRoutes');
const creditRoutes = require('./routes/credit.routes');
const kycRoutes = require('./routes/kyc.routes');
const adminRoutes = require('./routes/admin.routes');
const logger = require('./utils/logger');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const swaggerDocument = YAML.load(path.join(__dirname, 'config', 'swagger.yaml'));

const app = express();

// Security Middlewares
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

// Serve KYC Uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
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

// Rate Limiting - General API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, 
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', limiter);

// Stricter Rate Limiting for Auth/Sensitive routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 attempts per hour
  message: 'Too many login attempts from this IP, please try again after an hour',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Parameter Pollution Protection
app.use(hpp());

// Basic XSS Sanitization Middleware
app.use((req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
});

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.send('Mwanga ✦ Backend API is running.');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', branding: 'Mwanga ✦', timestamp: new Date() });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/auth', authRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', financeRoutes);

// Error Handling
app.use(errorHandler);

module.exports = app;
