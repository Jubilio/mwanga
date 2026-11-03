// One privacy policy for everything Binth sends to an AI provider or writes to
// the logs: transaction descriptions, names (creditors, goals, categories), the
// chat history, tool results and provider error text.
//
// Removed: phone numbers, e-mail addresses, card/account numbers and other long
// digit runs. Amounts are kept (up to 8 digits, or written with separators), so
// questions like "ganhei 1500000" still work.

const PHONE_MZ = /(?:\+|00)?258[\s.-]?8[2-7](?:[\s.-]?\d){7}\b/g;
const PHONE_LOCAL = /\b8[2-7](?:[\s.-]?\d){7}\b/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// 13-19 digits, optionally grouped by spaces or dashes (cards, IBAN-like accounts).
const CARD = /\b\d(?:[ -]?\d){12,18}\b/g;
const IBAN = /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){10,30}\b/g;

function maskCommon(text) {
  return String(text ?? '')
    .replace(EMAIL, '[email]')
    .replace(IBAN, '[conta]')
    .replace(PHONE_MZ, '[telefone]')
    .replace(CARD, '[número]')
    .replace(PHONE_LOCAL, '[telefone]');
}

// Free text where amounts matter (chat messages, tool results, logs).
// Digit runs of 9+ (NUIT, account numbers, references) are hidden.
function maskFreeText(text) {
  return maskCommon(text).replace(/\b\d{9,}\b/g, '[número]');
}

// Short labels (descriptions, creditor and goal names). Amounts never belong
// here, so any run of 6+ digits is a reference and is hidden. Cut to `max`.
function maskLabel(text, max = 80) {
  return maskCommon(text).replace(/\b\d{6,}\b/g, '[número]').slice(0, max);
}

// Masks every string inside a JSON-like value (tool results).
function maskDeep(value, depth = 0) {
  if (depth > 6) return null;
  if (typeof value === 'string') return maskFreeText(value);
  if (Array.isArray(value)) return value.map(v => maskDeep(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, maskDeep(v, depth + 1)]));
  }
  return value;
}

module.exports = { maskFreeText, maskLabel, maskDeep };
