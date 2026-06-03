import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export function useBinthPriority() {
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCoach = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/binth/priority');
      setCoach(response.data);
    } catch (err) {
      console.error('[useBinthPriority] Failed to load priority', err);
      setError('Não foi possível carregar o plano financeiro agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoach();
  }, [fetchCoach]);

  return {
    coach,
    loading,
    error,
    refetch: fetchCoach,
  };
}
