import React from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/GlassCard';
import { useFinance } from '@/hooks/useFinanceStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const { state } = useFinance();

  // Mock data for charts - in a real app, these would come from state.transacoes calculations
  const lineData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        data: [20000, 25000, 18000, 30000, 28000, 35000],
        color: (opacity = 1) => `rgba(81, 207, 102, ${opacity})`, // Income
        strokeWidth: 3
      },
      {
        data: [15000, 18000, 22000, 19000, 25000, 21000],
        color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`, // Expenses
        strokeWidth: 3
      }
    ],
    legend: ['Receitas', 'Despesas']
  };

  const pieData = [
    { name: 'Casa', population: 35, color: '#ff6b6b', legendFontColor: '#888', legendFontSize: 12 },
    { name: 'Lazer', population: 20, color: '#5c7cfa', legendFontColor: '#888', legendFontSize: 12 },
    { name: 'Comida', population: 25, color: '#fcc419', legendFontColor: '#888', legendFontSize: 12 },
    { name: 'Transporte', population: 10, color: '#51cf66', legendFontColor: '#888', legendFontSize: 12 },
    { name: 'Outros', population: 10, color: '#845ef7', legendFontColor: '#888', legendFontSize: 12 },
  ];

  const chartConfig = {
    backgroundColor: '#0a0a0a',
    backgroundGradientFrom: '#151515',
    backgroundGradientTo: '#0a0a0a',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(136, 136, 136, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#fcc419'
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText type="title">Relatórios</ThemedText>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="calendar-outline" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryGrid}>
           <GlassCard style={styles.summaryCard}>
              <ThemedText style={styles.summaryLabel}>TAXA DE POUPANÇA</ThemedText>
              <ThemedText style={styles.summaryValue}>28%</ThemedText>
              <ThemedText style={styles.summaryTrend}>+2% vs mês anterior</ThemedText>
           </GlassCard>
           <GlassCard style={styles.summaryCard}>
              <ThemedText style={styles.summaryLabel}>MELHOR CATEGORIA</ThemedText>
              <ThemedText style={styles.summaryValue}>Lazer</ThemedText>
              <ThemedText style={styles.summaryTrend}>Gasto reduzido em 15%</ThemedText>
           </GlassCard>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up-outline" size={18} color="#fcc419" style={{ marginRight: 8 }} />
            <ThemedText style={styles.sectionTitle}>RECEITAS VS DESPESAS</ThemedText>
          </View>
          <LineChart
            data={lineData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>DISTRIBUIÇÃO DE GASTOS</ThemedText>
          <View style={styles.pieContainer}>
            <PieChart
              data={pieData}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              accessor={'population'}
              backgroundColor={'transparent'}
              paddingLeft={'15'}
              absolute
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>FLUXO CAIXA MENSAL (K MT)</ThemedText>
          <BarChart
            data={{
              labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
              datasets: [{ data: [5, 7, 4, 8, 6] }]
            }}
            width={width - 40}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(252, 196, 25, ${opacity})`}}
            style={styles.chart}
          />
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  filterBtn: {
    padding: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  summaryCard: {
    flex: 1,
    padding: 15,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#666',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  summaryTrend: {
    fontSize: 10,
    color: '#51cf66',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#888',
    letterSpacing: 1,
    marginBottom: 15,
  },
  chart: {
    borderRadius: 20,
    marginVertical: 8,
  },
  pieContainer: {
    backgroundColor: '#151515',
    borderRadius: 20,
    paddingVertical: 10,
  }
});
