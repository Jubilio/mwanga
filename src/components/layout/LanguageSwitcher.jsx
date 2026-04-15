import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 8px', borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(0,0,0,0.15)'
    }}>
      <Globe size={13} color="#8a9ab8" />
      <select
        value={i18n.language}
        onChange={handleLanguageChange}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#8a9ab8',
          fontSize: 11,
          outline: 'none',
          cursor: 'pointer',
          textTransform: 'uppercase',
          fontWeight: 600
        }}
      >
        <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="pt">PT</option>
        <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="en">EN</option>
      </select>
    </div>
  );
}
