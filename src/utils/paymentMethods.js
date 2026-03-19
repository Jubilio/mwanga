export const PAYMENT_METHOD_LABELS = {
  dinheiro: 'Dinheiro',
  mpesa: 'M-Pesa',
  emola: 'Emola',
  mkesh: 'mKesh',
  banco: 'Banco',
  cash: 'Dinheiro',
  mobile: 'Carteira Móvel',
  bank: 'Banco',
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  investimento: 'Investimento',
};

export function getPaymentMethodLabel(type) {
  return PAYMENT_METHOD_LABELS[type] || type || 'Outro';
}
