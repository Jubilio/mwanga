// Origens autorizadas a chamar a API com credenciais. Manter a lista explícita:
// nunca usar '*' nem refletir a origem do pedido (ver endurecimento do PR #23).
const allowedOrigins = [
  'https://mwanga-opal.vercel.app',
  'https://mwanga-qdsmbf6ck-jubilio-projects.vercel.app',
  'https://mwangafin.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8081',
  // Capacitor WebView origins for the native apps (Android / iOS)
  'https://localhost',
  'capacitor://localhost'
];

// Todos os métodos HTTP usados pelas rotas (router.get/post/put/patch/delete).
// Se faltar um aqui, o navegador bloqueia o pedido no preflight.
const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: allowedMethods,
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = { corsOptions, allowedOrigins, allowedMethods };
