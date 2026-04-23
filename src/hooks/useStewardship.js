import { useMemo, useEffect, useState } from 'react';
import { useFinance } from './useFinance';
import { Heart, Shield, Zap, Star } from 'lucide-react';
import api from '../utils/api';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';

export function useStewardship() {
  const { state } = useFinance();
  
  // Fetch Binth messages count for Diligence score
  const binthUsageCount = useLiveQuery(async () => {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    return await db.mensagens
      .where('timestamp')
      .above(last30Days.getTime())
      .count();
  }, []);

  const stats = useMemo(() => {
    const currentNetWorth = state.contas?.reduce((acc, c) => acc + Number(c.current_balance || 0), 0) + Number(state.settings.cash_balance || 0);

    // 1. Generosidade (Dízimos/Ofertas/Doações)
    const donations = state.transacoes
      .filter(t => t.tipo === 'despesa' && (t.cat?.toLowerCase().includes('dízimo') || t.cat?.toLowerCase().includes('oferta') || t.cat?.toLowerCase().includes('doação')))
      .reduce((acc, t) => acc + Number(t.valor), 0);
    const totalIncome = state.transacoes
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + Number(t.valor), 0);
    const generosityScore = Math.min(100, totalIncome > 0 ? (donations / (totalIncome * 0.1)) * 100 : 0);

    // 2. Prudência (Savings Rate)
    const totalExpense = state.transacoes
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + Number(t.valor), 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const prudenceScore = Math.min(100, Math.max(0, savingsRate * 5)); // 20% savings = 100 score

    // 3. Diligência (Recording Frequency + Binth Usage)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const recentTrans = state.transacoes.filter(t => new Date(t.data) > last30Days).length;
    
    // Diligence is 70% transactions, 30% Binth engagement
    const transScore = Math.min(100, (recentTrans / 15) * 100);
    const aiScore = Math.min(100, (Number(binthUsageCount || 0) / 10) * 100); // 10 messages/month = 100%
    const diligenceScore = (transScore * 0.7) + (aiScore * 0.3);

    // 4. Integridade (Debt Control)
    const totalDebts = state.metas?.filter(m => m.type === 'debt' || m.category === 'dívida').length || 0;
    const integrityScore = Math.max(0, 100 - (totalDebts * 10));

    // 5. Runway (Months of Survival)
    const monthlyExpense = totalExpense > 0 ? (totalExpense / 3) : 1; 
    const runwayMonths = Math.floor(currentNetWorth / (totalExpense > 0 ? totalExpense : 1));

    const totalScore = Math.round((generosityScore + prudenceScore + diligenceScore + integrityScore) / 4);

    return { generosityScore, prudenceScore, diligenceScore, integrityScore, totalScore, donations, savingsRate, runwayMonths };
  }, [state, binthUsageCount]);

  const badges = useMemo(() => [
    { id: 'generous', icon: Heart, label: 'Doador Generoso', active: stats.generosityScore > 80, color: 'text-rose-400', desc: 'Dás com alegria e propósito.' },
    { id: 'prudent', icon: Shield, label: 'Poupador Prudente', active: stats.prudenceScore > 70, color: 'text-emerald-400', desc: 'Preparas o futuro com sabedoria.' },
    { id: 'diligent', icon: Zap, label: 'Gestor Diligente', active: stats.diligenceScore > 90, color: 'text-amber-400', desc: 'Cuidas bem dos teus registos e consultas a Binth.' },
    { id: 'integrity', icon: Star, label: 'Homem de Palavra', active: stats.integrityScore > 95, color: 'text-blue-400', desc: 'Honras os teus compromissos.' },
    { id: 'savings_master', icon: Zap, label: 'Mestre da Poupança', active: stats.savingsRate > 30, color: 'text-sky-400', desc: 'A tua taxa de poupança é de elite.' },
  ], [stats]);

  // Achievement Detection Logic
  useEffect(() => {
    const checkAchievements = async () => {
      const activeBadges = badges.filter(b => b.active).map(b => b.id);
      const storedBadges = JSON.parse(localStorage.getItem('mwanga-unlocked-badges') || '[]');

      const newUnlocks = activeBadges.filter(id => !storedBadges.includes(id));

      if (newUnlocks.length > 0) {
        // Trigger Confetti!
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#7C3AED', '#4F46E5', '#C9963A', '#00D68F']
        });

        // Update local storage
        localStorage.setItem('mwanga-unlocked-badges', JSON.stringify([...storedBadges, ...newUnlocks]));

        // Notify user via API
        for (const badgeId of newUnlocks) {
          const badge = badges.find(b => b.id === badgeId);
          await api.post('/notifications', {
            title: `🏆 Conquista Desbloqueada: ${badge.label}`,
            message: `Parabéns, Explorador! Ganhaste o badge "${badge.label}". ${badge.desc}`,
            type: 'success',
            action_payload: { route: '/mordomia' }
          }).catch(err => console.error('Error notifying achievement:', err));
        }
      }
    };

    if (state.user?.id) {
        checkAchievements();
    }
  }, [badges, state.user?.id]);

  return { stats, badges };
}
