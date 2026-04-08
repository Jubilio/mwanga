import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { 
  Book, ChevronRight, HelpCircle, LayoutDashboard, 
  Wallet, Banknote, Users, Sparkles, Shield, 
  Smartphone, Search, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Help() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const HELP_SECTIONS = [
    {
      id: 'intro',
      title: t('help.sections.intro.title'),
      icon: Smartphone,
      color: 'indigo',
      content: t('help.sections.intro.content')
    },
    {
      id: 'dashboard',
      title: t('help.sections.dashboard.title'),
      icon: LayoutDashboard,
      color: 'emerald',
      content: t('help.sections.dashboard.content')
    },
    {
      id: 'finance',
      title: t('help.sections.finance.title'),
      icon: Wallet,
      color: 'teal',
      content: t('help.sections.finance.content')
    },
    {
      id: 'credit',
      title: t('help.sections.credit.title'),
      icon: Banknote,
      color: 'amber',
      content: t('help.sections.credit.content')
    },
    {
      id: 'community',
      title: t('help.sections.community.title'),
      icon: Users,
      color: 'sky',
      content: t('help.sections.community.content')
    },
    {
      id: 'binth',
      title: t('help.sections.binth.title'),
      icon: Sparkles,
      color: 'purple',
      content: t('help.sections.binth.content')
    },
    {
      id: 'security',
      title: t('help.sections.security.title'),
      icon: Shield,
      color: 'rose',
      content: t('help.sections.security.content')
    }
  ];

  const filteredSections = HELP_SECTIONS.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050B15] text-white/90 font-sans pb-24">
      
      {/* ═══ WORLD-CLASS HEADER ═══ */}
      <div className="relative overflow-hidden bg-linear-to-b from-ocean/40 to-transparent pt-12 pb-20 px-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full animate-pulse" />
        
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
          <button 
            onClick={() => navigate(-1)}
            className="self-start mb-8 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
          >
            <ArrowLeft className="text-white/60 group-hover:text-white transition-colors" />
          </button>

          <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-teal-400 to-indigo-600 flex items-center justify-center shadow-[0_0_40px_rgba(20,184,166,0.3)] mb-6 animate-in zoom-in-75 duration-700">
            <Book className="text-white" size={36} />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black font-serif tracking-tight mb-4 drop-shadow-2xl">
            <Trans i18nKey="help.hero.title" components={{ span: <span className="text-transparent bg-clip-text bg-linear-to-r from-teal-300 to-indigo-300" /> }} />
          </h1>
          <p className="text-lg text-white/50 max-w-xl font-medium mb-10">
            {t('help.hero.description')}
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-lg relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-teal-400 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder={t('help.hero.search_placeholder')}
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
              className={`glass-card border border-white/5 hover:border-white/20 transition-all duration-500 overflow-hidden group ${activeTab === section.id ? 'border-teal-500/30!' : ''}`}
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
                  <div className="h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent mb-6" />
                  <div className="text-white/60 leading-relaxed font-medium whitespace-pre-wrap pl-1">
                    {section.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Support CTA */}
        <div className="mt-16 p-10 glass-card bg-linear-to-br from-indigo-600/20 to-teal-600/10 border-indigo-500/20 text-center animate-in zoom-in-95 duration-1000">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle size={32} className="text-teal-400" />
          </div>
          <h2 className="text-2xl font-black mb-2">{t('help.support.title')}</h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto">{t('help.support.description')}</p>
          <button 
             onClick={() => navigate('/chat')}
             className="btn bg-white text-ocean hover:bg-slate-50 border-none font-black px-10 py-5 rounded-full text-base shadow-2xl transition-all active:scale-95"
          >
            {t('help.support.btn')}
          </button>
        </div>
      </div>

    </div>
  );
}
