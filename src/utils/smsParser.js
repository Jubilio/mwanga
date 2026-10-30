/**
 * Utilitário para processar SMS de serviços Mobile Money (M-Pesa, e-Mola, mKesh)
 * e alertas de cartão BCI.
 * Extrai: Valor, Tipo, Data, Entidade e Saldo Final.
 */

/** "1.585,00" → 1585, "1,500.00" → 1500: the last separator is the decimal one. */
export function parseAmount(raw) {
  const cleaned = String(raw || '').replace(/[^\d.,]/g, '');
  if (!cleaned) return NaN;
  const decimalIsComma = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.');
  const normalized = decimalIsComma
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/,/g, '');
  return parseFloat(normalized);
}

// BCI: "registamos uma compra de 1.585,00 MZN a 30/10/2026 19:29 na(o) CAPUCCINO com cartao ***5710"
const BCI_CARD_PURCHASE = /compra de ([\d.,]+)\s*(?:MZN|MT)\s+a\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})\s+na\(?o?\)?\s+(.+?)\s+com\s+cart[aã]o\s+(\*+\d{3,4})/i;

function parseBciCardPurchase(text) {
  const m = text.match(BCI_CARD_PURCHASE);
  if (!m) return null;
  const [, amount, day, month, year, time, merchant, card] = m;
  return {
    service: 'BCI',
    bank_name: 'BCI',
    type: 'despesa',
    amount: parseAmount(amount),
    description: `BCI: ${merchant.trim()}`,
    category: 'other',
    balanceAfter: null,
    card,
    rawDate: `${day}/${month}/${year} ${time}`,
    formattedDate: `${year}-${month}-${day}`
  };
}

export function parseMobileMoneySMS(text) {
  if (!text) return null;

  const bci = parseBciCardPurchase(text);
  if (bci) return bci;

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
      amount = parseAmount(incMatch[1]);
      entity = incMatch[2].trim();
    } else if (expMatch || trfMatch) {
      type = 'despesa';
      const m = expMatch || trfMatch;
      amount = parseAmount(m[1]);
      entity = m[2].trim();
    }

    if (type) {
      if (balMatch) balance = parseAmount(balMatch[1]);
      if (dateMatch) {
        // Tenta formatar a data se possível
        try {
          const d = new Date(dateMatch[1].replace(/\//g, '-'));
          if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
        } catch(e) {}
      }

      return {
        service: p.name,
        bank_name: p.name,
        type,
        amount,
        description: `${p.name}: ${entity}`,
        category: type === 'receita' ? 'salary' : 'other',
        balanceAfter: balance,
        rawDate: dateMatch ? dateMatch[1] : null,
        formattedDate: date
      };
    }
  }

  return null;
}
