import { useEffect, useState } from 'react';
import { X, Plus, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import api from '../utils/api';

const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Saúde',
  'Lazer',
  'Poupança',
  'Salário',
  'Outro',
];

const TYPES = [
  { value: 'despesa', label: 'Despesa', icon: ArrowDownLeft },
  { value: 'receita', label: 'Receita', icon: ArrowUpRight },
];

function resolveInitialType(actionId) {
  if (actionId === 'ADD_INCOME') {
    return 'receita';
  }

  return 'despesa';
}

export default function QuickAddNotificationModal({
  isOpen,
  payload,
  onClose,
  showToast,
}) {
  const { state, dispatch } = useFinance();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: 'despesa',
    desc: '',
    valor: '',
    cat: 'Alimentação',
    nota: '',
    account_id: '',
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialType = resolveInitialType(payload?.actionId);
    setForm({
      data: payload?.date || new Date().toISOString().slice(0, 10),
      tipo: initialType,
      desc: '',
      valor: '',
      cat: initialType === 'receita' ? 'Salário' : 'Alimentação',
      nota: '',
      account_id: '',
    });
  }, [isOpen, payload]);

  async function registerInteraction(interaction, actionId) {
    if (!payload?.notificationId) {
      return;
    }

    try {
      await api.post('/notifications/interactions', {
        notificationId: payload.notificationId,
        interaction,
        actionId,
      });
    } catch {
      // Silent on purpose: interaction analytics should not block quick entry.
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.desc || !form.valor) {
      showToast('Preenche descrição e valor para fechar o dia.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          ...form,
          valor: Number(form.valor),
          account_id: form.account_id || null,
        },
      });

      await registerInteraction('actioned', form.tipo === 'receita' ? 'ADD_INCOME' : 'ADD_EXPENSE');
      showToast('Registo feito. Sequência financeira protegida.');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#03141d]/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white shadow-[0_30px_80px_rgba(3,20,29,0.25)]">
        <div className="relative overflow-hidden rounded-t-[2rem] bg-[linear-gradient(135deg,#0a4d68,#088395)] px-6 py-6 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_42%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]">
                <Wallet size={12} /> Quick Add
              </div>
              <h2 className="text-2xl font-black tracking-tight">Fecha o dia em menos de 20 segundos</h2>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                O Mwanga abriu diretamente a ação do lembrete. Regista uma despesa ou receita sem perder o teu ritmo.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-white/10 p-3 text-white transition hover:bg-white/20"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPES.map((item) => {
              const Icon = item.icon;
              const active = form.tipo === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    tipo: item.value,
                    cat: item.value === 'receita' ? 'Salário' : form.cat,
                  })}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? 'border-[#0a4d68] bg-[#0a4d68] text-white shadow-lg'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`rounded-2xl p-3 ${active ? 'bg-white/15' : 'bg-white'}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.2em]">{item.label}</div>
                    <div className={`text-xs ${active ? 'text-white/75' : 'text-slate-500'}`}>
                      {item.value === 'receita' ? 'Entrada rápida' : 'Saída rápida'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Data
              </label>
              <input
                type="date"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-[#0a4d68]"
                value={form.data}
                onChange={(event) => setForm({ ...form, data: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Valor
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-[#0a4d68]"
                placeholder="0.00"
                value={form.valor}
                onChange={(event) => setForm({ ...form, valor: event.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Descrição
              </label>
              <input
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-[#0a4d68]"
                placeholder={form.tipo === 'receita' ? 'Ex: Salário, Freelance' : 'Ex: Supermercado, Transporte'}
                value={form.desc}
                onChange={(event) => setForm({ ...form, desc: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Categoria
              </label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-[#0a4d68]"
                value={form.cat}
                onChange={(event) => setForm({ ...form, cat: event.target.value })}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Conta
              </label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-[#0a4d68]"
                value={form.account_id}
                onChange={(event) => setForm({ ...form, account_id: event.target.value })}
              >
                <option value="">Sem conta ligada</option>
                {(state.contas || []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Nota opcional
              </label>
              <input
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-[#0a4d68]"
                placeholder="Ex: pago com M-Pesa"
                value={form.nota}
                onChange={(event) => setForm({ ...form, nota: event.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Cada pequeno registo reforça o teu hábito e melhora a qualidade das recomendações do Mwanga.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0a4d68] px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(10,77,104,0.25)] transition hover:bg-[#088395] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} />
              {isSubmitting ? 'A guardar...' : 'Guardar agora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
