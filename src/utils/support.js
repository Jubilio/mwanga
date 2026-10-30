/**
 * Human contact channel (WhatsApp) used for upgrades and pre-sale questions.
 * VITE_SUPPORT_WHATSAPP overrides the default, in international format without "+" (e.g. 25884xxxxxxx).
 */
const DEFAULT_SUPPORT_WHATSAPP = '258874518769';

export function getSupportWhatsAppNumber() {
  return String(import.meta.env.VITE_SUPPORT_WHATSAPP || DEFAULT_SUPPORT_WHATSAPP).replace(/\D/g, '');
}

/** wa.me link with an optional pre-filled message, or null when no number is configured. */
export function getSupportWhatsAppUrl(message = '') {
  const number = getSupportWhatsAppNumber();
  if (!number) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${text}`;
}
