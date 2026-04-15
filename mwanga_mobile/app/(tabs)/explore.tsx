import React from 'react';
import { StyleSheet, View, FlatList, SafeAreaView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFinance } from '@/hooks/useFinanceStore';
import { ArrowUpRight, ArrowDownCircle, Search, Filter } from 'lucide-react-native';

export default function TransactionsScreen() {
  const { state } = useFinance();
  const transactions = state.transacoes || [
     { id: '1', desc: 'Mock Transaction', valor: 1500, tipo: 'receita', data: '2026-04-15' },
     { id: '2', desc: 'Mock Expense', valor: 500, tipo: 'despesa', data: '2026-04-14' },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.txRow}>
      <View style={[styles.txIconContainer, { backgroundColor: item.tipo === 'receita' ? '#51cf6615' : '#ff6b6b15' }]}>
        {item.tipo === 'receita' ? <ArrowUpRight size={18} color="#51cf66" /> : <ArrowDownCircle size={18} color="#ff6b6b" />}
      </View>
      <View style={styles.txInfo}>
        <ThemedText style={styles.txDesc}>{item.desc}</ThemedText>
        <ThemedText style={styles.txDate}>{item.data}</ThemedText>
      </View>
      <ThemedText style={[styles.txAmount, { color: item.tipo === 'receita' ? '#51cf66' : '#fff' }]}>
        {item.tipo === 'receita' ? '+' : '-'}{Math.abs(item.valor).toLocaleString()} MT
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Transações</ThemedText>
        <View style={styles.headerActions}>
           <Search size={22} color="#888" style={{ marginRight: 15 }} />
           <Filter size={22} color="#888" />
        </View>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>Nenhuma transação encontrada</ThemedText>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  listContent: {
    padding: 20,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#151515',
    borderRadius: 20,
    marginBottom: 12,
  },
  txIconContainer: {
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
  emptyContainer: {
    padding: 100,
    alignItems: 'center',
  },
  emptyText: {
    color: '#444',
    fontWeight: 'bold',
  },
});
