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

const twoDigitYear = (y) => (y.length === 2 ? `20${y}` : y);

// Formats seen on real phones (2026-11-02) that the older patterns below miss.
const REAL_FORMATS = [
  {
    // "DJV2M5U6H4I confirmado. Compraste 3.25GB atraves do M-Pesa no dia 31/10/26 as 9:05 PM no valor de 100.00MT. O novo saldo M-Pesa e de 0.28MT."
    re: /^\s*([A-Z0-9]{8,14})\s+confirmad[oa]\.\s*Compraste\s+(.+?)\s+atrav[eé]s do M-Pesa.*?dia\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4}).*?valor de\s+([\d.,]+)\s*MT/i,
    build: (m) => ({ service: 'M-Pesa', type: 'despesa', amount: m[6], entity: `Compra ${m[2]}`, day: m[3], month: m[4], year: m[5], transaction_id: m[1] }),
  },
  {
    // "ID Trans: CO261102.1209.T42855. Efetuou um levantamento de 100.00MT no Agente ID 448365, ANIJA AMIMO as 12:09:38 02/11/2026. Taxa: 3.00MT. Novo saldo: 2,163.16MT."
    re: /ID Trans:\s*(\S+?)\.\s.*?levantamento de\s+([\d.,]+)\s*MT no Agente(?: ID)?\s+([^,]+?)(?:,\s*([^.]+?))?\s+as\s+[\d:]+\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    build: (m) => ({ service: null, type: 'despesa', amount: m[2], entity: `Levantamento no agente ${m[3]}${m[4] ? ` (${m[4].trim()})` : ''}`, day: m[5], month: m[6], year: m[7], transaction_id: m[1] }),
  },
  {
    // "A conta 406659018 foi debitada no valor de 1000.00 MZN as 19:00 do dia 31/10/26. ... Millennium bim"
    re: /conta\s+(\d+)\s+foi debitada no valor de\s+([\d.,]+)\s*(?:MZN|MT).*?dia\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4}).*millennium\s*bim/i,
    build: (m) => ({ service: 'Millennium bim', type: 'despesa', amount: m[2], entity: `Débito na conta ${m[1]}`, day: m[3], month: m[4], year: m[5] }),
  },
  {
    // BCI: "registamos um levantamento de 3.000,00 MZN a 29/10/2026 14:51 no ATM com cartao ***5710"
    re: /levantamento de\s+([\d.,]+)\s*(?:MZN|MT)\s+a\s+(\d{2})\/(\d{2})\/(\d{4})\s+\d{2}:\d{2}\s+n[oa]\s+(.+?)\s+com\s+cart[aã]o/i,
    build: (m) => ({ service: 'BCI', type: 'despesa', amount: m[1], entity: `Levantamento ${m[5].trim()}`, day: m[2], month: m[3], year: m[4] }),
  },
];

// "Novo saldo: 2,163.16MT", "O novo saldo M-Pesa e de 0.28MT", "Saldo actual: 3,000.00MT"
const BALANCE = /(?:novo\s+saldo(?:\s+M-Pesa)?(?:\s+(?:e|é)\s+de|:)|saldo\s+actual:)\s*([\d.,]+)\s*(?:MT|MZN)/i;

export function parseBalance(text) {
  const m = String(text || '').match(BALANCE);
  return m ? parseAmount(m[1]) : null;
}

function parseRealFormats(text) {
  for (const f of REAL_FORMATS) {
    const m = text.match(f.re);
    if (!m) continue;
    const r = f.build(m);
    const formattedDate = `${twoDigitYear(r.year)}-${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`;
    return {
      service: r.service || 'Mobile Money',
      bank_name: r.service,
      type: r.type,
      amount: parseAmount(r.amount),
      description: r.service ? `${r.service}: ${r.entity}` : r.entity,
      category: 'other',
      balanceAfter: parseBalance(text),
      transaction_id: r.transaction_id || null,
      rawDate: `${r.day}/${r.month}/${r.year}`,
      formattedDate,
    };
  }
  return null;
}

export function parseMobileMoneySMS(text) {
  if (!text) return null;

  const bci = parseBciCardPurchase(text);
  if (bci) return bci;

  const real = parseRealFormats(text);
  if (real) return real;

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
      balance = balMatch ? parseAmount(balMatch[1]) : parseBalance(text);
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
