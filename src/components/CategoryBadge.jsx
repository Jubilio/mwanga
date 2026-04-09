import { useTranslation } from 'react-i18next';
import { 
  DollarSign, 
  Home, 
  Utensils, 
  Car, 
  PlusCircle, 
  GraduationCap, 
  Zap, 
  Globe, 
  Church, 
  Palmtree, 
  TrendingUp, 
  PiggyBank, 
  Package 
} from 'lucide-react';

const CATEGORY_CONFIG = {
  salary: { icon: DollarSign, color: 'text-leaf', bg: 'bg-leaf/10' },
  house_rent: { icon: Home, color: 'text-coral', bg: 'bg-coral/10' },
  food: { icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  transport: { icon: Car, color: 'text-sky', bg: 'bg-sky/10' },
  health: { icon: PlusCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  education: { icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  energy_water: { icon: Zap, color: 'text-gold', bg: 'bg-gold/10' },
  internet: { icon: Globe, color: 'text-ocean', bg: 'bg-ocean/10' },
  church_donations: { icon: Church, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  leisure: { icon: Palmtree, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  investments: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  savings: { icon: PiggyBank, color: 'text-leaf', bg: 'bg-leaf/10' },
  other: { icon: Package, color: 'text-gray-500', bg: 'bg-gray-500/10' },
};

export default function CategoryBadge({ category, className = "" }) {
  const { t } = useTranslation();
  
  // Find key based on ID (to support existing data format)
  const categoryKeys = {
    'Salário': 'salary',
    'Renda Casa': 'house_rent',
    'Alimentação': 'food',
    'Transporte': 'transport',
    'Saúde': 'health',
    'Educação': 'education',
    'Energia/Água': 'energy_water',
    'Internet': 'internet',
    'Igreja/Doações': 'church_donations',
    'Lazer': 'leisure',
    'Investimentos': 'investments',
    'Poupança': 'savings',
    'Outro': 'other',
    'Habitação': 'habitacao',
    'housing': 'habitacao'
  };

  const key = categoryKeys[category] || category?.toLowerCase() || 'other';
  const config = CATEGORY_CONFIG[key] || CATEGORY_CONFIG.other;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg} ${config.color} ${className}`}>
      <Icon size={12} strokeWidth={2.5} />
      <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[80px]">
        {t(`transactions.categories.${key}`, { defaultValue: category })}
      </span>
    </div>
  );
}
