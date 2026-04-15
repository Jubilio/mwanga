import React from 'react';
import { StyleSheet, View, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/GlassCard';
import { useFinance } from '@/hooks/useFinanceStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function DividasScreen() {
  const { state } = useFinance();
  const dividas = state.dividas || [
    { id: '1', description: 'Empréstimo Amigo', total_amount: 5000, remaining_amount: 2500, due_date: '2026-05-01' },
    { id: '2', description: 'Crédito Bancário', total_amount: 150000, remaining_amount: 120000, due_date: '2026-04-30' },
  ];

  const renderItem = ({ item }) => {
    const progress = (1 - (item.remaining_amount / item.total_amount)) * 100;
    
    return (
      <GlassCard style={styles.debtCard}>
        <View style={styles.debtHeader}>
           <ThemedText style={styles.debtTitle}>{item.description}</ThemedText>
           <View style={[styles.statusBadge, item.remaining_amount > 0 ? styles.pendingBadge : styles.paidBadge]}>
             <ThemedText style={styles.statusText}>{item.remaining_amount > 0 ? 'PENDENTE' : 'PAGO'}</ThemedText>
           </View>
        </View>

        <View style={styles.amountRow}>
           <View>
              <ThemedText style={styles.amountLabel}>RESTANTE</ThemedText>
              <ThemedText style={styles.mainAmount}>{item.remaining_amount.toLocaleString()} MT</ThemedText>
           </View>
           <View style={styles.totalBox}>
              <ThemedText style={styles.amountLabel}>TOTAL</ThemedText>
              <ThemedText style={styles.totalAmount}>{item.total_amount.toLocaleString()} MT</ThemedText>
           </View>
        </View>

        <View style={styles.progressContainer}>
           <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
        
        <View style={styles.footer}>
           <ThemedText style={styles.dueDate}>Vence: {item.due_date}</ThemedText>
           <TouchableOpacity style={styles.payBtn}>
              <ThemedText style={styles.payBtnText}>AMORTIZAR</ThemedText>
           </TouchableOpacity>
        </View>
      </GlassCard>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
           <Ionicons name="chevron-back-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText type="title">Minhas Dívidas</ThemedText>
        <TouchableOpacity style={styles.addBtn}>
           <Ionicons name="add-outline" size={24} color="#fcc419" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={dividas}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#51cf66" style={{ marginBottom: 15 }} />
            <ThemedText style={styles.emptyText}>Parabéns! Nenhuma dívida ativa.</ThemedText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 5,
  },
  addBtn: {
    padding: 5,
  },
  listContent: {
    padding: 20,
  },
  debtCard: {
    marginBottom: 20,
    padding: 20,
  },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  debtTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadge: {
     backgroundColor: '#ff6b6b20',
  },
  paidBadge: {
     backgroundColor: '#51cf6620',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ff6b6b',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1,
    marginBottom: 5,
  },
  mainAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
  },
  totalBox: {
    alignItems: 'flex-end',
  },
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ff6b6b',
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 11,
    color: '#666',
  },
  payBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  payBtnText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  emptyContainer: {
    padding: 100,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#51cf66',
    fontWeight: 'bold',
  },
});
