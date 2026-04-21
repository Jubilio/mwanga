import { fmt } from './calculations';

export const generateTransactionsPDF = (transactions, state) => {
  const currency = state.settings.currency || 'MT';
  const totalIncome = transactions.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + Number(t.valor), 0);
  const totalExpense = transactions.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + Number(t.valor), 0);
  const balance = totalIncome - totalExpense;

  const printWindow = window.open('', '_blank');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mwanga - Relatório Financeiro</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; color: #111827; margin: 0; padding: 40px; }
        .header { background: #111827; color: white; padding: 40px; border-radius: 12px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; }
        .header p { margin: 5px 0 0; opacity: 0.7; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 40px; }
        .summary-card { padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; }
        .summary-card span { display: block; font-size: 10px; font-weight: 900; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }
        .summary-card b { font-size: 18px; color: #111827; }
        .income { border-left: 4px solid #10b981; }
        .expense { border-left: 4px solid #ef4444; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { text-align: left; background: #f9fafb; padding: 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; }
        td { padding: 12px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
        .val-inc { color: #059669; font-weight: 700; }
        .val-exp { color: #dc2626; font-weight: 700; }
        .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #eee; padding-top: 20px; }
        @media print {
          .no-print { display: none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>MWANGA ✦</h1>
          <p>Relatório Financeiro Premium</p>
        </div>
        <div style="text-align: right">
          <p style="opacity: 1">Gerado em: ${new Date().toLocaleDateString()}</p>
          <p style="opacity: 1">Utilizador: ${state.user?.name || 'Utilizador'}</p>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card income">
          <span>Total Receitas</span>
          <b>${fmt(totalIncome, currency)}</b>
        </div>
        <div class="summary-card expense">
          <span>Total Despesas</span>
          <b>${fmt(totalExpense, currency)}</b>
        </div>
        <div class="summary-card">
          <span>Balanço Líquido</span>
          <b>${fmt(balance, currency)}</b>
        </div>
      </div>

      <h2>Detalhes das Transações</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => `
            <tr>
              <td>${t.data}</td>
              <td>${t.desc}</td>
              <td>${t.cat || 'Geral'}</td>
              <td class="${t.tipo === 'receita' ? 'val-inc' : 'val-exp'}">
                ${t.tipo === 'receita' ? '+' : '-'} ${fmt(t.valor, currency)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        Mwanga Finance - Gestão Inteligente e Mordomia Digital
      </div>

      <script>
        window.onload = () => {
          window.print();
          // window.close(); // Opcional: fechar após imprimir
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
