import { ui } from './uiTranslation';
export const PAYMENT_METHOD_LABELS = {
  dinheiro: ui("Dinheiro"),
  mpesa: 'M-Pesa',
  emola: 'Emola',
  mkesh: 'mKesh',
  banco: ui("Banco"),
  cash: ui("Dinheiro"),
  mobile: ui("Carteira Móvel"),
  bank: ui("Banco"),
  corrente: ui("Conta Corrente"),
  poupanca: ui("Poupança"),
  investimento: ui("Investimento"),
};

export function getPaymentMethodLabel(type) {
  return ui(PAYMENT_METHOD_LABELS[type]) || type || ui("Outro");
}
