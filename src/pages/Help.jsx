import { useState } from 'react';
import { 
  Book, ChevronRight, HelpCircle, LayoutDashboard, 
  Wallet, Banknote, Users, Sparkles, Shield, 
  Smartphone, Search, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HELP_SECTIONS = [
  {
    id: 'intro',
    title: '📱 Primeiros Passos',
    icon: Smartphone,
    color: 'indigo',
    content: `
      O Mwanga é uma aplicação PWA. Isso significa que pode instalá-lo no seu telemóvel sem ir à Play Store ou App Store.
      \n\n• No Android: Clique nos 3 pontos do Chrome e selecione "Instalar Mensageiro Financeiro".
      \n• No iPhone: Use o botão Partilhar e selecione "Adicionar ao Ecrã Principal".
    `
  },
  {
    id: 'dashboard',
    title: '📊 Painel de Controlo',
    icon: LayoutDashboard,
    color: 'emerald',
    content: `
      O Dashboard oferece uma visão 360º das suas finanças.
      \n\n• Gráfico de Radar: Identifique rapidamente se os seus gastos estão equilibrados com os ganhos.
      \n• Widgets: Acompanhe o saldo total das suas contas e o progresso das suas metas de poupança num relance.
    `
  },
  {
    id: 'finance',
    title: '💰 Gestão Financeira',
    icon: Wallet,
    color: 'teal',
    content: `
      Domine o seu dinheiro com as ferramentas de orçamento.
      \n\n• Transações: Registe cada metical que sai ou entra. Separe por conta (M-Pesa, Carteira, Banco).
      \n• Regra 50/30/20: O sistema ajuda-o a cumprir a meta de gastar 50% em necessidades, 30% em desejos e 20% para o futuro.
      \n• Metas: Defina objetivos claros (ex: "Compra de Moto") e deixe o Mwanga calcular quanto precisa de poupar mensalmente.
    `
  },
  {
    id: 'credit',
    title: '⚖️ Crédito Inteligente',
    icon: Banknote,
    color: 'amber',
    content: `
      Antes de pedir um empréstimo, consulte os nossos simuladores.
      \n\n• Simulador de Prestação: Saiba exatamente quanto vai pagar ao banco por mês.
      \n• Comparador: Veja se compensa mais um empréstimo bancário, um Xitique ou esperar e poupar.
      \n• Consolidação: Aprenda a juntar várias dívidas numa só para pagar menos juros totais.
    `
  },
  {
    id: 'community',
    title: '🤝 Mwanga Community (VSLA)',
    icon: Users,
    color: 'sky',
    content: `
      Poupe em conjunto com a sua família ou amigos.
      \n\n• Shares: No Digital VSLA, você compra "shares" mensais que formam o capital do grupo.
      \n• Empréstimos Internos: Os membros podem pedir empréstimos ao grupo a taxas decididas pela comunidade.
      \n• Lucros: Os juros acumulados são distribuídos equitativamente no final do ciclo de poupança.
    `
  },
  {
    id: 'binth',
    title: '🤖 Assistente Binth IA',
    icon: Sparkles,
    color: 'purple',
    content: `
      O Binth é o cérebro do Mwanga.
      \n\n• Diagnósticos Rápidos: Peça conselhos sobre se deve ou não fazer uma compra.
      \n• Contexto Real: O Binth analisa os seus gastos reais (anonimamente) para dar respostas precisas.
    `
  },
  {
    id: 'security',
    title: '🛡️ Segurança e Alertas',
    icon: Shield,
    color: 'rose',
    content: `
      A sua privacidade é o nosso foco.
      \n\n• Notificações Push: Ative os lembretes para nunca ser apanhado de surpresa pela renda ou prestações.
      \n• Dados Protegidos: Usamos encriptação de nível militar para proteger os seus registos financeiros.
    `
  }
];

export default function Help() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = HELP_SECTIONS.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050B15] text-white/90 font-sans pb-24">
      
      {/* ═══ WORLD-CLASS HEADER ═══ */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0a4d68]/40 to-transparent pt-12 pb-20 px-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full animate-pulse" />
        
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
          <button 
            onClick={() => navigate(-1)}
            className="self-start mb-8 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
          >
            <ArrowLeft className="text-white/60 group-hover:text-white transition-colors" />
          </button>

          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-400 to-indigo-600 flex items-center justify-center shadow-[0_0_40px_rgba(20,184,166,0.3)] mb-6 animate-in zoom-in-75 duration-700">
            <Book className="text-white" size={36} />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black font-serif tracking-tight mb-4 drop-shadow-2xl">
            Centro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-300">Ajuda Mwanga</span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl font-medium mb-10">
            Tudo o que precisa de saber para iluminar o seu caminho financeiro e dominar o sistema Mwanga 2.0.
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-lg relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-teal-400 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar manual..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-teal-500/50 focus:bg-white/10 transition-all font-medium backdrop-blur-xl"
            />
          </div>
        </div>
      </div>

      {/* ═══ CONTENT GRID ═══ */}
      <div className="max-w-4xl mx-auto px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-1 gap-4">
          {filteredSections.map((section, idx) => (
            <div 
              key={section.id}
              className={`glass-card border border-white/5 hover:border-white/20 transition-all duration-500 overflow-hidden group ${activeTab === section.id ? '!border-teal-500/30' : ''}`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <button 
                onClick={() => setActiveTab(activeTab === section.id ? null : section.id)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-xl bg-${section.color}-500/10 flex items-center justify-center border border-${section.color}-500/20 group-hover:scale-110 transition-transform`}>
                    <section.icon size={24} className={`text-${section.color}-400`} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">{section.title}</h3>
                </div>
                <div className={`p-2 rounded-lg bg-white/5 opacity-40 transition-all ${activeTab === section.id ? 'rotate-90 opacity-100 bg-teal-500/20' : ''}`}>
                  <ChevronRight size={20} />
                </div>
              </button>
              
              {activeTab === section.id && (
                <div className="px-6 pb-8 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />
                  <div className="text-white/60 leading-relaxed font-medium whitespace-pre-wrap pl-1">
                    {section.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Support CTA */}
        <div className="mt-16 p-10 glass-card bg-gradient-to-br from-indigo-600/20 to-teal-600/10 border-indigo-500/20 text-center animate-in zoom-in-95 duration-1000">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle size={32} className="text-teal-400" />
          </div>
          <h2 className="text-2xl font-black mb-2">Ainda tem dúvidas?</h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto">O Binth está disponível 24/7 para responder a questões específicas sobre o seu contexto financeiro.</p>
          <button 
             onClick={() => navigate('/chat')}
             className="px-10 py-4 bg-white text-[#0a4d68] font-black uppercase tracking-widest text-xs rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.1)]"
          >
            Falar com o Binth
          </button>
        </div>
      </div>

    </div>
  );
}
