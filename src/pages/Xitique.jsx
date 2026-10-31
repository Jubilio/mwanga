import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { fmt, getMonthKey } from '../utils/calculations';
import { getPaymentMethodLabel } from '../utils/paymentMethods';
import { ui } from '../utils/uiTranslation';
import { Plus, Trash2, CheckCircle2, AlertCircle, RefreshCcw, Wallet } from 'lucide-react';

export default function Xitique() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  const [showAdd, setShowAdd] = useState(false);
  const [paymentAccount, setPaymentAccount] = useState('');
  const [form, setForm] = useState({
    name: '',
    monthly_amount: '',
    total_participants: '',
    start_date: getMonthKey() + '-01',
    your_position: '1'
  });

  function handleCreate(e) {
    e.preventDefault();
    if (!form.name || !form.monthly_amount || !form.total_participants) return;
    dispatch({ 
      type: 'ADD_XITIQUE', 
      payload: { 
        ...form, 
        monthly_amount: parseFloat(form.monthly_amount),
        total_participants: parseInt(form.total_participants),
        your_position: parseInt(form.your_position)
      } 
    });
    setForm({ name: '', monthly_amount: '', total_participants: '', start_date: getMonthKey() + '-01', your_position: '1' });
    setShowAdd(false);
  }

  function handlePay(xitiqueId, contributionId) {
    const date = new Date().toISOString().slice(0, 10);
    dispatch({ type: 'PAY_XITIQUE', payload: { contributionId, date, account_id: paymentAccount || null } });
    setPaymentAccount('');
  }

  function handleReceive(xitiqueId, receiptId) {
    const date = new Date().toISOString().slice(0, 10);
    dispatch({ type: 'RECEIVE_XITIQUE', payload: { receiptId, date, account_id: paymentAccount || null } });
    setPaymentAccount('');
  }

  function getCycleRow(x, c) {
    const contribution = x.contributions.find(con => con.cycle_id === c.id);
    const receipt = x.receipts.find(r => r.cycle_id === c.id);
    return {
      isYourTurn: c.cycle_number === x.your_position,
      contribution: contribution || { paid: false, amount: 0, id: null },
      receipt: receipt || { received_date: null, total_received: x.monthly_amount * x.total_participants, id: null },
    };
  }

  function renderReceiptStatus({ receipt }) {
    return receipt.received_date ? (
      <span className="badge badge-pago">{t('xitique.table.received', { date: receipt.received_date })}</span>
    ) : (
      <span className="badge badge-atrasado">{t('xitique.table.your_turn_badge')}</span>
    );
  }

  function renderPaymentStatus({ contribution }) {
    return contribution.paid ? (
      <span className="badge badge-pago"><CheckCircle2 size={12} /> {t('xitique.table.paid')}</span>
    ) : (
      <span className="badge badge-pendente"><AlertCircle size={12} /> {t('xitique.table.pending')}</span>
    );
  }

  function renderCycleActions(x, { isYourTurn, contribution, receipt }) {
    const canPay = !contribution.paid && contribution.id;
    const canReceive = isYourTurn && !receipt.received_date && receipt.id;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {(!contribution.paid || (isYourTurn && !receipt.received_date)) && (
          <select
            className="form-input"
            style={{ padding: '0.2rem', fontSize: '0.7rem', minWidth: '120px', maxWidth: '100%' }}
            value={paymentAccount}
            onChange={e => setPaymentAccount(e.target.value)}
          >
            <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="">{t('xitique.table.no_account')}</option>
            {state.contas?.map(acc => (
              <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={acc.id} value={acc.id}>{acc.name} • {getPaymentMethodLabel(acc.type)}</option>
            ))}
          </select>
        )}
        {(canPay || canReceive) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {canPay && (
              <button onClick={() => handlePay(x.id, contribution.id)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}>
                {t('xitique.table.pay_btn')}
              </button>
            )}
            {canReceive && (
              <button onClick={() => handleReceive(x.id, receipt.id)} className="btn btn-leaf" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}>
                {t('xitique.table.receive_btn', { amount: fmt(receipt.total_received, currency) })}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{t('xitique.title')}</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{t('xitique.description')}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary">
          <Plus size={18} /> {showAdd ? t('xitique.btns.cancel') : t('xitique.btns.new')}
        </button>
      </div>

      {showAdd && (
        <div className="glass-card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label">{t('xitique.form.group_name')}</label>
                <input type="text" className="form-input" placeholder={t('xitique.form.group_name_placeholder')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="form-label">{t('xitique.form.monthly_amount', { currency })}</label>
                <input type="number" className="form-input" placeholder={t('xitique.form.monthly_amount_placeholder')} value={form.monthly_amount} onChange={e => setForm({ ...form, monthly_amount: e.target.value })} />
              </div>
              <div>
                <label className="form-label">{t('xitique.form.total_participants')}</label>
                <input type="number" className="form-input" placeholder="5" value={form.total_participants} onChange={e => setForm({ ...form, total_participants: e.target.value })} />
              </div>
              <div>
                <label className="form-label">{t('xitique.form.start_date')}</label>
                <input type="date" className="form-input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="form-label">{t('xitique.form.your_position')}</label>
                <input type="number" className="form-input" min="1" max={form.total_participants || 1} value={form.your_position} onChange={e => setForm({ ...form, your_position: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>{t('xitique.btns.create')}</button>
          </form>
        </div>
      )}

      {state.xitiques.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔁</div>
          <h3>{t('xitique.empty.title')}</h3>
          <p style={{ color: 'var(--color-muted)' }}>{t('xitique.empty.subtitle')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {state.xitiques.map(x => (
            <div key={x.id} className="glass-card animate-fade-in" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{x.name}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '1rem', rowGap: '0.25rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    <span>{t('xitique.card.monthly_payment')}: <strong>{fmt(x.monthly_amount, currency)}</strong></span>
                    <span>{t('xitique.card.participants')}: <strong>{x.total_participants}</strong></span>
                    <span>{t('xitique.card.your_turn', { position: x.your_position })}</span>
                  </div>
                </div>
                <button onClick={() => dispatch({ type: 'DELETE_XITIQUE', payload: x.id })} className="btn btn-danger" aria-label={ui("Eliminar")} style={{ padding: '0.5rem', width: 'auto', flexShrink: 0 }}>
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Progress Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t('xitique.card.total_contributed')}</div>
                   <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{fmt(x.contributions.filter(c => c.paid).reduce((s, c) => s + c.amount, 0), currency)}</div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t('xitique.card.total_to_receive')}</div>
                   <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-leaf)' }}>{fmt(x.monthly_amount * x.total_participants, currency)}</div>
                </div>
              </div>

              {/* Cycle list: stacked cards on phones, table from sm up.
                  On a phone the 5-column table pushed the pay/receive buttons off screen. */}
              <div className="flex flex-col gap-3 sm:hidden">
                {x.cycles.map(c => {
                  const row = getCycleRow(x, c);
                  return (
                    <div key={c.id} className="rounded-xl border border-white/10 p-3" style={row.isYourTurn ? { background: 'rgba(102, 187, 106, 0.05)' } : { background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <strong>{t('xitique.table.month_label', { number: c.cycle_number })}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{c.due_date}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {renderPaymentStatus(row)}
                        {row.isYourTurn && renderReceiptStatus(row)}
                      </div>
                      <div className="mt-3">{renderCycleActions(x, row)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden sm:block" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>{t('xitique.table.cycle')}</th>
                      <th>{t('xitique.table.expected_month')}</th>
                      <th>{t('xitique.table.receipt_status')}</th>
                      <th>{t('xitique.table.payment_status')}</th>
                      <th>{t('xitique.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {x.cycles.map(c => {
                      const row = getCycleRow(x, c);
                      return (
                        <tr key={c.id} style={row.isYourTurn ? { background: 'rgba(102, 187, 106, 0.05)' } : {}}>
                          <td><strong>{t('xitique.table.month_label', { number: c.cycle_number })}</strong></td>
                          <td>{c.due_date}</td>
                          <td>{row.isYourTurn ? renderReceiptStatus(row) : <span style={{ opacity: 0.3 }}>—</span>}</td>
                          <td>{renderPaymentStatus(row)}</td>
                          <td>{renderCycleActions(x, row)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
