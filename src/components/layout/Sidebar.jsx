import { 
  LayoutDashboard, ArrowRightLeft, Home, Target, 
  PieChart, Calculator, Landmark, BarChart3, Globe, Brain, CreditCard, Wallet, MessageSquare
} from 'lucide-react';
import SidebarItem from './SidebarItem';
import PremiumCard from './PremiumCard';
import UserCard from './UserCard';

const MAIN_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transacoes', icon: ArrowRightLeft, label: 'Transações' },
  { to: '/orcamento', icon: PieChart, label: 'Orçamento' },
  { to: '/habitacao', icon: Home, label: 'Habitação' },
  { to: '/xitique', icon: Wallet, label: 'Xitique' },
  { to: '/metas', icon: Target, label: 'Metas' },
  { to: '/dividas', icon: CreditCard, label: 'Dívidas' },
];

const INTEL_ITEMS = [
  { to: '/sms-import', icon: MessageSquare, label: 'Importar SMS' },
  { to: '/insights', icon: Brain, label: 'Binth Insights' },
  { to: '/patrimonio', icon: Landmark, label: 'Património' },
  { to: '/simuladores', icon: Calculator, label: 'Simuladores' },
  { to: '/relatorio', icon: BarChart3, label: 'Relatórios' },
];

export default function Sidebar({ isOpen }) {
  return (
    <aside
      className={`sidebar-new ${isOpen ? 'open' : ''} hide-mobile custom-scrollbar`}
      style={{
        width: '280px',
        background: 'linear-gradient(180deg, #0B1623 0%, #0E1F2F 100%)',
        backdropFilter: 'blur(10px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        flexShrink: 0,
        zIndex: 50,
        boxShadow: '4px 0 24px rgba(0,0,0,0.1)'
      }}
    >
      <div className="p-6">
        <div className="logo-container mb-10 flex items-center justify-center">
          <div className="logo-icon animate-glow text-[#D4AF37]" style={{ fontSize: '1.5rem', marginRight: '8px' }}>✦</div>
          <div className="logo-text">
            <span className="logo-mwanga font-black text-2xl tracking-tight text-white drop-shadow-md">Mwanga</span>
          </div>
        </div>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-4">Menu Principal</div>
        <nav className="space-y-1.5 mb-8">
          {MAIN_ITEMS.map((item) => (
            <SidebarItem key={item.to} {...item} end={item.to === '/'} />
          ))}
        </nav>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-4">Inteligência</div>
        <nav className="space-y-1.5 mb-8">
          {INTEL_ITEMS.map((item) => (
            <SidebarItem key={item.to} {...item} premium={true} />
          ))}
        </nav>
      </div>

      <PremiumCard />
      <UserCard />
    </aside>
  );
}
