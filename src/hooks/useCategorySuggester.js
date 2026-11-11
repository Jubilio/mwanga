import { useCallback, useMemo } from 'react';
import api from '../utils/api';
import { MODEL_VERSION, SUGGEST_THRESHOLD, suggestCategory, trainCategoryModel } from '../utils/categoryModel';

/**
 * Trains the category model on the household's transactions already in memory
 * (retrained only when they change) and returns suggest(description, type).
 * suggest() returns null unless the model is confident enough to pre-fill.
 */
export function useCategorySuggester(transactions, { threshold = SUGGEST_THRESHOLD } = {}) {
  const model = useMemo(() => trainCategoryModel(Array.isArray(transactions) ? transactions : []), [transactions]);
  return useCallback((description, type) => {
    const s = suggestCategory(model, { description, type });
    if (!s.category || s.confidence < threshold) return null;
    return { ...s, confidence: Math.round(s.confidence * 100) / 100, version: MODEL_VERSION };
  }, [model, threshold]);
}

/**
 * Tells the server whether a suggestion was kept, so acceptance can be monitored.
 * Sends only categories, confidence and source, never the description.
 * Fire and forget: a failure here must never affect saving the transaction.
 */
export function reportCategorySuggestion(suggestion, chosen, channel) {
  if (!suggestion || !chosen) return;
  Promise.resolve()
    .then(() => api.post('/behavior/category-suggestion', {
      suggested: suggestion.category,
      chosen,
      confidence: suggestion.confidence,
      source: suggestion.source,
      version: suggestion.version,
      channel,
    }))
    .catch(() => {});
}
