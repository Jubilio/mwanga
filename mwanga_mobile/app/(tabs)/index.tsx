import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/GlassCard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const [showBalance, setShowBalance] = useState(true);
  const realBalance = 125480.25; // Dummy for now
  const currency = 'MT';

  const quickActions = [
    { icon: 'add-outline', label: 'Despesa', color: '#ff6b6b' },
    { icon: 'arrow-up-outline', label: 'Receita', color: '#51cf66' },
    { icon: 'wallet-outline', label: 'Contas', color: '#339af0' },
    { icon: 'sparkles-outline', label: 'Binth', color: '#fcc419' },
    { icon: 'trending-down-outline', label: 'Dívidas', color: '#f06595' },
    { icon: 'stats-chart-outline', label: 'Relatórios', color: '#51cf66' },
  ];

  const transactions = [
    { id: '1', desc: 'Supermercado', amount: -2500, type: 'expense', date: 'Hoje' },
    { id: '2', desc: 'Salário Mensal', amount: 45000, type: 'income', date: 'Ontem' },
    { id: '3', desc: 'Transferência M-Pesa', amount: -500, type: 'expense', date: '14 Abr' },
  ];

  const handleQuickAction = (label) => {
    switch(label) {
      case 'Dívidas': router.push('/dividas'); break;
      case 'Binth': router.push('/binth'); break;
      case 'Contas': router.push('/patrimony'); break;
      case 'Relatórios': router.push('/reports'); break;
      case 'Receita':
      case 'Despesa':
        router.push('/explore'); // Placeholder for transactions
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.greetingText}>Bom dia ✨</ThemedText>
            <ThemedText type="title" style={styles.brandText}>Mwanga Financial</ThemedText>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="#aaa" />
          </TouchableOpacity>
        </View>

        {/* Balance Hero */}
        <LinearGradient
          colors={['#1a2a6c', '#b21f1f', '#fdbb2d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceHero}
        >
          <View style={styles.balanceHeader}>
            <ThemedText style={styles.balanceLabel}>SALDO DISPONÍVEL</ThemedText>
            <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
              {showBalance ? <Ionicons name="eye-outline" size={20} color="#fff" /> : <Ionicons name="eye-off-outline" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
          
          <ThemedText style={styles.balanceValue}>
            {showBalance ? `${realBalance.toLocaleString()} ${currency}` : '••••••'}
          </ThemedText>

          <View style={styles.miniStats}>
            <View style={styles.statItem}>
              <Ionicons name="trending-up-outline" size={14} color="#51cf66" />
              <ThemedText style={styles.statText}>+ 12.500 MT</ThemedText>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Ionicons name="trending-down-outline" size={14} color="#ff6b6b" />
              <ThemedText style={styles.statText}>- 8.200 MT</ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          {quickActions.map((action, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.actionBtn}
              onPress={() => handleQuickAction(action.label)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Health Score */}
        <GlassCard style={styles.healthCard}>
          <View style={styles.healthInfo}>
             <ThemedText style={styles.healthLabel}>SAÚDE FINANCEIRA</ThemedText>
             <ThemedText style={styles.healthValue}>Excelente</ThemedText>
          </View>
          <View style={styles.healthScoreContainer}>
             <View style={styles.healthScoreCircle}>
                <ThemedText style={styles.healthScoreText}>85</ThemedText>
             </View>
          </View>
        </GlassCard>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Transações Recentes</ThemedText>
          <TouchableOpacity onPress={() => router.push('/explore')}>
             <ThemedText style={styles.seeAll}>Tudo</ThemedText>
          </TouchableOpacity>
        </View>

        {transactions.map((tx) => (
          <View key={tx.id} style={styles.transactionRow}>
            <View style={[styles.txIcon, { backgroundColor: tx.type === 'income' ? '#51cf6620' : '#ff6b6b20' }]}>
              <Ionicons 
                name={tx.type === 'income' ? 'arrow-up-outline' : 'arrow-down-outline'} 
                size={18} 
                color={tx.type === 'income' ? '#51cf66' : '#ff6b6b'} 
              />
            </View>
            <View style={styles.txInfo}>
              <ThemedText style={styles.txDesc}>{tx.desc}</ThemedText>
              <ThemedText style={styles.txDate}>{tx.date}</ThemedText>
            </View>
            <ThemedText style={[styles.txAmount, { color: tx.type === 'income' ? '#51cf66' : '#fff' }]}>
              {tx.type === 'income' ? '+' : '-'}{Math.abs(tx.amount).toLocaleString()} MT
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  greetingText: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
  },
  iconButton: {
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
  },
  balanceHero: {
    padding: 25,
    borderRadius: 30,
    marginBottom: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 20,
  },
  miniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  statSeparator: {
    width: 1,
    height: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 10,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionBtn: {
    alignItems: 'center',
    width: (width - 40) / 4.5,
  },
  actionIcon: {
    width: 55,
    height: 55,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#aaa',
  },
  healthCard: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  healthInfo: {
    gap: 4,
  },
  healthLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#888',
    letterSpacing: 1.5,
  },
  healthValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#51cf66',
  },
  healthScoreContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fcc419',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScoreText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fcc419',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#888',
    letterSpacing: 1,
  },
  seeAll: {
    fontSize: 12,
    color: '#339af0',
    fontWeight: 'bold',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#151515',
    borderRadius: 20,
    marginBottom: 12,
  },
  txIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  txDate: {
    fontSize: 11,
    color: '#666',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '900',
  },
});
