import { Component } from 'react';

/**
 * ErrorBoundary — Captura erros de render em sub-árvores React.
 *
 * Sem este componente, qualquer erro não tratado num componente lazy-loaded
 * (ex: Credito.jsx, Settings.jsx) derruba a aplicação inteira sem feedback.
 *
 * Uso:
 *   <ErrorBoundary>
 *     <Suspense fallback={<Loader />}>
 *       <LazyPage />
 *     </Suspense>
 *   </ErrorBoundary>
 *
 * Ou com contexto específico:
 *   <ErrorBoundary context="Crédito">
 *     <Credito />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Em produção, aqui enviaríamos para Sentry/DataDog.
    // Por agora, logamos de forma estruturada para facilitar debugging.
    console.error('[ErrorBoundary] Uncaught render error:', {
      context: this.props.context || 'unknown',
      error: error?.message,
      componentStack: info?.componentStack,
    });
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const context = this.props.context || 'Esta página';
    const isDev = import.meta.env.DEV;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-coral/10 text-coral">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        {/* Message */}
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            {context} encontrou um erro
          </h2>
          <p className="text-sm text-slate-400">
            Algo correu mal ao carregar esta secção. Os teus dados estão seguros.
          </p>
          {isDev && this.state.error && (
            <pre className="mt-3 max-w-md overflow-auto rounded-xl bg-slate-100 p-3 text-left text-[10px] text-coral dark:bg-white/5">
              {this.state.error.message}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={this.handleReset}
            className="rounded-xl bg-ocean/10 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-ocean transition-all hover:bg-ocean/20 dark:text-sky"
          >
            Tentar Novamente
          </button>
          <button
            onClick={() => window.history.back()}
            className="rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }
}
