import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Plus, RefreshCw } from 'lucide-react';

export default function HousingForm({ form, setForm, handleSubmit, type, currency, saveDefaults }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="glass-card overflow-hidden transition-all duration-300">
      {/* Header / Toggle Button */}
      <button 
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 bg-black/2 dark:bg-white/2 hover:bg-ocean/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-ocean/10 flex items-center justify-center text-ocean">
            <Plus size={16} />
          </div>
          <span className="font-semibold text-gray-800 dark:text-white">
            {type === 'renda' ? t('housing.form.new_rent') : t('housing.form.new_maintenance')}
          </span>
        </div>
        <div className="text-gray-400">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Collapsible Form Body */}
      {isExpanded && (
        <form onSubmit={handleSubmit} className="p-5 border-t border-black/5 dark:border-white/5 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            {/* ROW 1 */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 block">{t('housing.form.month_label')}</label>
              <input type="month" className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean/50 focus:border-ocean outline-none transition-all dark:text-white" value={form.mes} onChange={e => setForm({ ...form, mes: e.target.value })} />
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 block">{t('housing.form.value_label', { currency })}</label>
              <input type="number" className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean/50 focus:border-ocean outline-none transition-all dark:text-white" placeholder="0.00" min="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 block">{t('housing.form.status_label')}</label>
              <select className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean/50 focus:border-ocean outline-none transition-all dark:text-white appearance-none" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                <option value="pago">t('housing.form.status_pago')</option>
                <option value="pendente">t('housing.form.status_pendente')</option>
              </select>
            </div>

            {/* ROW 2 */}
            {type === 'renda' && (
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 block">{t('housing.form.landlord_label')}</label>
                <input type="text" className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean/50 focus:border-ocean outline-none transition-all dark:text-white" placeholder={t('housing.form.landlord_placeholder')} value={form.proprietario} onChange={e => setForm({ ...form, proprietario: e.target.value })} />
              </div>
            )}
            
            {/* ROW 3 */}
            <div className={type === 'renda' ? 'md:col-span-3' : 'md:col-span-3'}>
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 block">{t('housing.form.obs_label')}</label>
              <input type="text" className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean/50 focus:border-ocean outline-none transition-all dark:text-white" placeholder={t('housing.form.obs_placeholder')} value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-black/5 dark:border-white/5">
            <button type="submit" className="bg-ocean hover:bg-ocean-deep text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-ocean/30 transition-all flex items-center gap-2">
              {t('housing.form.submit_btn')}
            </button>
            {type === 'renda' && (
              <button 
                type="button" 
                onClick={saveDefaults} 
                className="bg-transparent border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
              >
                <RefreshCw size={14} /> {t('housing.form.recurrent_btn')}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
