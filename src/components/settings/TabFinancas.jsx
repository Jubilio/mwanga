import { Wallet, TrendingUp, Home as HomeIcon, Zap, Sparkles, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSmsSync } from '../../hooks/useSmsSync';
import { useOutletContext } from 'react-router-dom';

export default function TabFinancas({ form, setFormDirty, state }) {
  const { t } = useTranslation();
  const { showToast } = useOutletContext() || {};
  const { syncSms } = useSmsSync(showToast);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="glass-card p-10 border-t-4 border-teal-500">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <Wallet size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black font-serif text-slate-800">{t('settings.financas.title')}</h2>
            <p className="text-sm text-slate-500">{t('settings.financas.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">{t('settings.financas.income_section')}</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t('settings.financas.income_subtitle')}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('settings.financas.salary_label')}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.user_salary}
                    onChange={(e) => setFormDirty(f => ({ ...f, user_salary: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xl font-serif text-teal-600 outline-none focus:border-teal-500/40 transition-all shadow-inner"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {form.currency}
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 mt-2 italic px-1">{t('settings.financas.salary_tip')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                <HomeIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">{t('settings.financas.housing_section')}</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t('settings.financas.housing_subtitle')}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('settings.financas.landlord_label')}</label>
                <input
                  type="text"
                  value={form.landlord_name}
                  onChange={(e) => setFormDirty(f => ({ ...f, landlord_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 outline-none focus:border-amber-500/40 transition-all font-medium"
                  placeholder={t('settings.financas.landlord_placeholder')}
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('settings.financas.rent_label')}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.default_rent}
                    onChange={(e) => setFormDirty(f => ({ ...f, default_rent: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xl font-serif text-amber-600 outline-none focus:border-amber-500/40 transition-all shadow-inner"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {form.currency}
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 mt-2 italic px-1">{t('settings.financas.rent_tip')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SMS AUTOMATION & WALLET ═══ */}
        <div className="mt-12 pt-12 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">{t('settings.financas.automation_section')}</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t('settings.financas.automation_subtitle')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="group">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('settings.financas.cash_balance_label')}</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.cash_balance}
                  onChange={(e) => setFormDirty(f => ({ ...f, cash_balance: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xl font-serif text-indigo-600 outline-none focus:border-indigo-500/40 transition-all shadow-inner"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  {form.currency}
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Conta Padrão (Entradas)</label>
              <select
                value={form.default_income_account_id}
                onChange={(e) => setFormDirty(f => ({ ...f, default_income_account_id: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 outline-none focus:border-indigo-500/40 transition-all appearance-none cursor-pointer font-medium"
              >
                <option value="">Nenhuma</option>
                {state.contas?.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Conta Padrão (Despesas)</label>
              <select
                value={form.default_expense_account_id}
                onChange={(e) => setFormDirty(f => ({ ...f, default_expense_account_id: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 outline-none focus:border-indigo-500/40 transition-all appearance-none cursor-pointer font-medium"
              >
                <option value="">Nenhuma</option>
                {state.contas?.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div
              onClick={() => setFormDirty(f => ({ ...f, sms_automation_enabled: !f.sms_automation_enabled }))}
              className="flex items-center justify-between p-6 rounded-2xl bg-indigo-50 border border-indigo-100/50 cursor-pointer hover:bg-white transition-all group shadow-sm h-fit"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${form.sms_automation_enabled ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{t('settings.financas.sms_sync_tag')}</p>
                  <span className="text-xs font-bold text-slate-700">{t('settings.financas.sms_sync_label')}</span>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 relative transition-colors ${form.sms_automation_enabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-all ${form.sms_automation_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>

            {form.sms_automation_enabled && (
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); syncSms(true); }}
                className="w-full flex justify-center items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
              >
                <RefreshCcw size={14} /> Sincronizar SMS Agora
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
