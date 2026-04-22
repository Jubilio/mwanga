import { Plus, FileText, Download } from 'lucide-react';
import { fmt } from '../../utils/calculations';
import { generateTransactionsPDF } from '../../utils/pdfGenerator';

export default function TransactionsHeader({
  t,
  filteredCount,
  isFormOpen,
  setIsFormOpen,
  editingId,
  setEditingId,
  setForm,
  form,
  showBalance,
  totals,
  currency,
  balance,
  setIsScanOpen,
  exportToCSV,
  showToast,
  state,
  filtered
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl font-black dark:text-white leading-tight">Transações</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            {filteredCount} {t('transactions.records')}
          </p>
        </div>
        <button
          onClick={() => {
            if (isFormOpen && editingId) {
              setEditingId(null);
              setForm({ ...form, desc: '', valor: '', nota: '', account_id: '' });
            }
            setIsFormOpen(!isFormOpen);
          }}
          className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg transition-all active:scale-95 ${
            isFormOpen ? 'bg-coral text-white' : 'bg-linear-to-br from-ocean to-sky text-white'
          }`}
        >
          <Plus size={24} className={`transition-transform duration-300 ${isFormOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>

      <div className="glass-card p-5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-black tracking-[0.2em] text-gray-500">Entradas</span>
              <span className="text-sm font-black tabular-nums text-leaf-light">
                {showBalance ? fmt(totals.in, currency) : '••••'}
              </span>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-black tracking-[0.2em] text-gray-500">Saídas</span>
              <span className="text-sm font-black tabular-nums text-coral-light">
                {showBalance ? fmt(totals.out, currency) : '••••'}
              </span>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-black tracking-[0.2em] text-gray-500">Balanço</span>
              <span className={`text-sm font-black tabular-nums ${balance >= 0 ? 'text-white' : 'text-coral'}`}>
                {showBalance ? `${balance >= 0 ? '+' : ''}${fmt(balance, currency)}` : '••••'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-white/5 pt-4">
             <button
               onClick={() => setIsScanOpen(true)}
               className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all text-[10px] font-black uppercase tracking-widest border border-indigo-500/20"
             >
               <Plus size={14} /> Smart Scan
             </button>
             <button
               onClick={() => generateTransactionsPDF(filtered, state)} // Wait, state/filtered are not here. I should pass them.
               className="p-3 rounded-2xl bg-white/5 text-gray-400 hover:text-indigo-400 transition-all shrink-0"
               title="Exportar PDF"
             >
               <FileText size={20} />
             </button>
             <button
                onClick={() => {
                  exportToCSV();
                  showToast(t('transactions.toast_exported'));
                }}
                className="p-3 rounded-2xl bg-white/5 text-gray-400 hover:text-ocean transition-all shrink-0"
                title="Exportar CSV"
             >
               <Download size={20} />
             </button>
          </div>
       </div>
    </div>
  );
}
