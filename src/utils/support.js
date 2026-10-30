/**
 * Human contact channel (WhatsApp) used for upgrades and pre-sale questions.
 * Configure with VITE_SUPPORT_WHATSAPP, in international format without "+" (e.g. 25884xxxxxxx).
 */
export function getSupportWhatsAppNumber() {
  return String(import.meta.env.VITE_SUPPORT_WHATSAPP || '').replace(/\D/g, '');
}

/** wa.me link with an optional pre-filled message, or null when no number is configured. */
export function getSupportWhatsAppUrl(message = '') {
  const number = getSupportWhatsAppNumber();
  if (!number) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${text}`;
}
