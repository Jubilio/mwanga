import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './i18n'
import * as Sentry from '@sentry/react'

// ── Sentry: Monitorização de erros em tempo real ───────────────────────────
// Activo apenas em produção para evitar ruído em desenvolvimento.
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Captura 20% das sessões para análise de performance (production)
    tracesSampleRate: 0.2,
    // Captura replays de sessão apenas quando há erro
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Ignora erros conhecidos e não accionáveis
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'NetworkError',
    ],
  });
}

// Register PWA service worker
registerSW({ immediate: true })

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh',
          background: '#040e1f', color: '#e2e8f0', fontFamily: 'Inter, sans-serif',
          gap: '16px', padding: '24px', textAlign: 'center'
        }}>
          <img src="/splash-premium.png" alt="Mwanga" style={{ width: 64, height: 64, borderRadius: 16 }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Algo correu mal</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            O Mwanga encontrou um erro inesperado. A equipa já foi notificada.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #0a4d68, #1a8fa8)',
              color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '14px'
            }}
          >
            Recarregar
          </button>
        </div>
      }
    >
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
