import api from '../utils/api';

/**
 * Cria um pagamento na PaySuite (M-Pesa, e-Mola ou cartão) e redireciona para o checkout.
 * O preço é decidido no servidor; aqui só se escolhe o plano e o ciclo.
 */
export async function startCheckout(plan, cycle = 'monthly') {
  const { data } = await api.post('/payments/checkout', { plan, cycle });
  window.location.href = data.checkout_url;
  return data;
}

/** Estado de um pagamento ao voltar do checkout (/settings?payment=return&ref=...). */
export async function getPaymentStatus(reference) {
  const { data } = await api.get(`/payments/${encodeURIComponent(reference)}`);
  return data;
}
