/**
 * Category mapping and utilities for Mwanga
 * Handles retro-compatibility between old string categories and new semantic keys.
 */

export const CATEGORY_MAP = {
  'Salário': 'salary',
  'Salario': 'salary',
  'Renda Casa': 'house_rent',
  'Renda': 'house_rent',
  'Alimentação': 'food',
  'Alimentacao': 'food',
  'Comida': 'food',
  'Transporte': 'transport',
  'Saúde': 'health',
  'Saude': 'health',
  'Educação': 'education',
  'Educacao': 'education',
  'Energia/Água': 'energy_water',
  'Energia/Agua': 'energy_water',
  'Energia': 'energy_water',
  'Agua': 'energy_water',
  'Internet': 'internet',
  'Igreja/Doações': 'church_donations',
  'Igreja/Doacoes': 'church_donations',
  'Dízimo': 'church_donations',
  'Lazer': 'leisure',
  'Diversão': 'leisure',
  'Investimentos': 'investments',
  'Investimento': 'investments',
  'Poupança': 'savings',
  'Poupanca': 'savings',
  'Outro': 'other',
  'Outros': 'other',
  'Habitação': 'habitacao',
  'Habitacao': 'habitacao',
  'Casa': 'house_rent',
  'housing': 'habitacao'
};

/**
 * Normalizes a category string to its semantic key
 * @param {string} category - The raw category string or key
 * @returns {string} The semantic key
 */
export function normalizeCategory(category) {
  if (!category) return 'other';
  
  // If it's already a valid key in our map (as a value), return it
  const val = category.toLowerCase();
  if (Object.values(CATEGORY_MAP).includes(val)) {
    return val;
  }

  // Check the mapping (exact match)
  if (CATEGORY_MAP[category]) return CATEGORY_MAP[category];

  // Check the mapping (case-insensitive)
  const entry = Object.entries(CATEGORY_MAP).find(([k]) => k.toLowerCase() === val);
  if (entry) return entry[1];

  return val || 'other';
}

export const MAIN_CATEGORIES = [
  'salary',
  'house_rent',
  'food',
  'transport',
  'health',
  'education',
  'energy_water',
  'internet',
  'church_donations',
  'leisure',
  'investments',
  'savings',
  'xitique',
  'habitacao',
  'other'
];
