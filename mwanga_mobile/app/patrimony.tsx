import React from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/GlassCard';
import { useFinance } from '@/hooks/useFinanceStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function PatrimonyScreen() {
  const { state } = useFinance();
  
  const accounts = state.contas || [
    { id: '1', name: 'Millennium BIM', current_balance: 45000, type: 'Banco' },
    { id: '2', name: 'M-Pesa', current_balance: 12500, type: 'Carteira Móvel' },
  ];

  const assets = state.activos || [
    { id: '1', name: 'Poupança Prazo', value: 150000, type: 'Investimento' },
  ];

  const totalPatrimony = accounts.reduce((acc, curr) => acc + curr.current_balance, 0) + 
                         assets.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText type="title">Património</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <LinearGradient
          colors={['#0f2027', '#203a43', '#2c5364']}
          style={styles.totalHero}
        >
           <ThemedText style={styles.heroLabel}>PATRIMÓNIO LÍQUIDO TOTAL</ThemedText>
           <ThemedText style={styles.heroValue}>{totalPatrimony.toLocaleString()} MT</ThemedText>
           <View style={styles.heroBadge}>
              <ThemedText style={styles.heroBadgeText}>Sincronizado</ThemedText>
           </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>CONTAS E CARTEIRAS</ThemedText>
            <TouchableOpacity>
               <Ionicons name="add-outline" size={20} color="#fcc419" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.list}>
             {accounts.map((acc) => (
               <TouchableOpacity key={acc.id} style={styles.itemRow}>
                 <View style={styles.itemIcon}>
                    <Ionicons name="business-outline" size={20} color={acc.type === 'Banco' ? '#339af0' : '#51cf66'} />
                 </View>
                 <View style={styles.itemInfo}>
                    <ThemedText style={styles.itemName}>{acc.name}</ThemedText>
                    <ThemedText style={styles.itemType}>{acc.type}</ThemedText>
                 </View>
                 <ThemedText style={styles.itemValue}>{acc.current_balance.toLocaleString()} MT</ThemedText>
                 <Ionicons name="chevron-forward-outline" size={16} color="#444" style={{ marginLeft: 10 }} />
               </TouchableOpacity>
             ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>ACTIVOS E INVESTIMENTOS</ThemedText>
            <TouchableOpacity>
               <Ionicons name="add-outline" size={20} color="#fcc419" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.list}>
             {assets.map((asset) => (
               <GlassCard key={asset.id} style={styles.assetCard}>
                 <View style={styles.assetHeader}>
                   <Ionicons name="home-outline" size={24} color="#fcc419" />
                   <ThemedText style={styles.itemName}>{asset.name}</ThemedText>
                 </View>
                 <ThemedText style={styles.assetValue}>{asset.value.toLocaleString()} MT</ThemedText>
                 <ThemedText style={styles.itemType}>{asset.type}</ThemedText>
               </GlassCard>
             ))}
          </View>
        </View>

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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backBtn: {
    padding: 5,
  },
  totalHero: {
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    marginBottom: 10,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 15,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  heroBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '800',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#666',
    letterSpacing: 1.5,
  },
  list: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemType: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  assetCard: {
    padding: 20,
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  assetValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
});
