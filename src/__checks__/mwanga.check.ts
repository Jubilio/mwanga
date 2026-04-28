import { ApiCheck, BrowserCheck, HeartbeatMonitor, AssertionBuilder, RetryStrategyBuilder, EmailAlertChannel, Dashboard } from 'checkly/constructs'
import path from 'path'

// Alert Channel
export const emailChannel = new EmailAlertChannel('email-channel-1', {
  address: 'jubiliomausse5@gmail.com',
  sslExpiry: true,
})

// Dashboard
new Dashboard('mwanga-dashboard', {
  name: 'Mwanga ✦ Monitoring',
  description: 'Dashboard de monitoramento Mwanga.',
  tags: ['mwanga'],
  customUrl: 'mwanga-status',
})

// Heartbeat Monitor for Cron Jobs
new HeartbeatMonitor('mwanga-cron-heartbeat', {
  name: 'Mwanga Cron Scheduler',
  period: 5,
  periodUnit: 'minutes',
  grace: 2,
  graceUnit: 'minutes',
  tags: ['mwanga'],
  alertChannels: [emailChannel],
})

// API Check - Main Health (Render)
new ApiCheck('mwanga-api-health', {
  name: 'Mwanga API Health',
  activated: true,
  muted: false,
  frequency: 1,
  alertChannels: [emailChannel],
  retryStrategy: RetryStrategyBuilder.fixedStrategy({
    maxRetries: 1,
    baseBackoffSeconds: 0,
    maxDurationSeconds: 600,
    sameRegion: false,
  }),
  locations: ['eu-central-1', 'us-east-1'],
  tags: ['mwanga'],
  request: {
    url: 'https://mwanga-z1f4.onrender.com/api/health',
    method: 'GET',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody('$.status').equals('healthy'),
    ],
  },
})

// Browser Check - Homepage (Main - Vercel via config)
new BrowserCheck('mwanga-homepage-check', {
  name: 'Mwanga Homepage (Vercel)',
  alertChannels: [emailChannel],
  locations: ['eu-central-1', 'us-east-1'],
  tags: ['mwanga', 'vercel'],
  code: {
    entrypoint: path.join(__dirname, 'homepage.spec.ts'),
  },
})

// Browser Check - Homepage (Mirror - Netlify)
new BrowserCheck('mwanga-netlify-check', {
  name: 'Mwanga Homepage (Netlify)',
  alertChannels: [emailChannel],
  locations: ['eu-central-1', 'us-east-1'],
  tags: ['mwanga', 'netlify'],
  code: {
    entrypoint: path.join(__dirname, 'homepage.spec.ts'),
  },
  environmentVariables: [
    { key: 'BASE_URL', value: 'https://mwangafin.netlify.app' }
  ]
})

// Browser Check - Login Page
new BrowserCheck('mwanga-login-check', {
  name: 'Mwanga Login Page',
  alertChannels: [emailChannel],
  locations: ['eu-central-1', 'us-east-1'],
  tags: ['mwanga'],
  code: {
    entrypoint: path.join(__dirname, 'login.spec.ts'),
  },
})
