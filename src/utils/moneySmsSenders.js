/**
 * Which SMS Mwanga is allowed to read. The native query (MoneySmsPlugin.java) only
 * returns inbox SMS whose sender contains one of SENDERS or whose text contains one
 * of BODY_MARKERS, so personal messages never reach the app. Matching is
 * case-insensitive and by substring, e.g. "pesa" covers "M-PESA" and "MPESA".
 */
export const MONEY_SMS_SENDERS = [
  'pesa',       // Vodacom M-Pesa
  'mola',       // Movitel e-Mola
  'mkesh',      // Tmcel mKesh
  'millennium', // Millennium bim
  'bim',
  'bci',
  'absa',
  'standard',   // Standard Bank
];

export const MONEY_SMS_BODY_MARKERS = [
  'm-pesa',
  '800224224',   // BCI card alerts only carry BCI's free line
  '800 224 224',
];

/** Same rule as the native query, kept as a second check on whatever comes back. */
export function isMoneySms(sms) {
  const address = String(sms?.address || '').toLowerCase();
  const body = String(sms?.body || '').toLowerCase();
  return MONEY_SMS_SENDERS.some(sender => address.includes(sender))
    || MONEY_SMS_BODY_MARKERS.some(marker => body.includes(marker));
}
