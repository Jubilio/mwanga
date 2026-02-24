import { Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fmt } from '../../utils/calculations';

export default function HousingHistoryTable({ rendas, currency, handleDelete, showToast }) {
  // Sort descending by month
  const sortedRendas = [...rendas].sort((a, b) => b.mes.localeCompare(a.mes));

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 flex items-center justify-between border-b border-black/5 dark:border-white/5">
        <h3 className="font-bold text-gray-800 dark:text-white">Histórico de Gastos</h3>
        {/* Mock Filter/Sort buttons for UI aesthetic */}
        <div className="flex gap-2">
          <select className="text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none dark:text-white cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <option>Todos os Anos</option>
            <option>2026</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/2 dark:bg-white/2 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-black/5 dark:border-white/5">
              <th className="px-5 py-3 font-semibold">Mês</th>
              <th className="px-5 py-3 font-semibold">Descrição</th>
              <th className="px-5 py-3 font-semibold">Valor</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold hidden md:table-cell">Notas</th>
              <th className="px-5 py-3 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {sortedRendas.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-5 py-8 text-center text-gray-400 text-sm italic">
                  Nenhum registo encontrado.
                </td>
              </tr>
            ) : (
              sortedRendas.map((r, idx) => (
                <tr key={r.id || `rent-${idx}`} className="group hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {r.mes}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-800 dark:text-white font-semibold">
                    {r.proprietario}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-800 dark:text-white font-bold">
                    {fmt(r.valor, currency)}
                  </td>
                  <td className="px-5 py-4">
                    {r.estado === 'pago' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-leaf/10 text-leaf text-[10px] font-bold uppercase tracking-wider border border-leaf/20">
                        <CheckCircle2 size={12} /> Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-coral/10 text-coral text-[10px] font-bold uppercase tracking-wider border border-coral/20">
                        <AlertCircle size={12} /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500 hidden md:table-cell truncate max-w-[150px]">
                    {r.obs || '-'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      className="p-2 text-gray-400 hover:text-coral hover:bg-coral/10 rounded-lg transition-colors opacity-50 group-hover:opacity-100"
                      onClick={() => { handleDelete(r.id); showToast('🗑️ Removido'); }}
                      title="Excluir registo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
