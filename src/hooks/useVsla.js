import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../components/Toast';

export function useVsla() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const { showToast } = useToast();

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/vsla/groups');
      setGroups(response.data.data || []);
    } catch {
      // API Error handled by individual components or ignored if background task
    } finally {
      setLoading(false);
    }
  }, []);

  const createGroup = async (groupData) => {
    setLoading(true);
    try {
      const response = await api.post('/vsla/groups', groupData);
      showToast('Grupo VSLA criado com sucesso!', 'success');
      await fetchGroups();
      return response.data.data;
    } catch {
      showToast('Erro ao criar grupo', 'error');
      throw new Error('Failed to create VSLA group');
    } finally {
      setLoading(false);
    }
  };

  const getGroupDetails = async (groupId) => {
    setLoading(true);
    try {
      const response = await api.get(`/vsla/groups/${groupId}`);
      setActiveGroup(response.data.data);
      return response.data.data;
    } catch {
      showToast('Erro ao carregar detalhes do grupo', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    loading,
    activeGroup,
    createGroup,
    getGroupDetails,
    refreshGroups: fetchGroups
  };
}
