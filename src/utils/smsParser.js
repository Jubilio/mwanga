/**
 * Utilitário para processar SMS de serviços Mobile Money (M-Pesa, e-Mola, mKesh)
 * Extrai: Valor, Tipo, Data, Entidade e Saldo Final.
 */

export function parseMobileMoneySMS(text) {
  if (!text) return null;

  const patterns = [
    // M-Pesa Moçambique: "Recebeu 500.00MT de 84..." ou "Pagamento de 100.00MT a..."
    {
      name: 'M-Pesa',
      income: /Recebeu ([\d,.]+)\s*MT de ([^.]+)/i,
      expense: /Pagamento de ([\d,.]+)\s*MT a ([^.]+)/i,
      transfer: /Enviou ([\d,.]+)\s*MT a ([^.]+)/i,
      balance: /Saldo actual: ([\d,.]+)\s*MT/i,
      date: /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/
    },
    // e-Mola: "Recebeu 200MT de 87..." ou "Transferiu 100MT para..."
    {
      name: 'e-Mola',
      income: /Recebeu ([\d,.]+)\s*MT de ([^.]+)/i,
      expense: /Pagou ([\d,.]+)\s*MT a ([^.]+)/i,
      transfer: /Transferiu ([\d,.]+)\s*MT para ([^.]+)/i,
      balance: /Novo saldo: ([\d,.]+)\s*MT/i,
      date: /(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/
    }
  ];

  for (const p of patterns) {
    let type = null;
    let amount = 0;
    let entity = 'Desconhecido';
    let balance = null;
    let date = new Date().toISOString().split('T')[0];

    const incMatch = text.match(p.income);
    const expMatch = text.match(p.expense);
    const trfMatch = text.match(p.transfer);
    const balMatch = text.match(p.balance);
    const dateMatch = text.match(p.date);

    if (incMatch) {
      type = 'receita';
      amount = parseFloat(incMatch[1].replace(',', ''));
      entity = incMatch[2].trim();
    } else if (expMatch || trfMatch) {
      type = 'despesa';
      const m = expMatch || trfMatch;
      amount = parseFloat(m[1].replace(',', ''));
      entity = m[2].trim();
    }

    if (type) {
      if (balMatch) balance = parseFloat(balMatch[1].replace(',', ''));
      if (dateMatch) {
        // Tenta formatar a data se possível
        try {
          const d = new Date(dateMatch[1].replace(/\//g, '-'));
          if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
        } catch(e) {}
      }

      return {
        service: p.name,
        type,
        amount,
        description: `${p.name}: ${entity}`,
        category: type === 'receita' ? 'Salário' : 'Outro',
        balanceAfter: balance,
        rawDate: dateMatch ? dateMatch[1] : null,
        formattedDate: date
      };
    }
  }

  return null;
}
