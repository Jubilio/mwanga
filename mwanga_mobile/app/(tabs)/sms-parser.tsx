import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/GlassCard';
import { Ionicons } from '@expo/vector-icons';
import api from '@/constants/api';
import { useFinance } from '@/hooks/useFinanceStore';

export default function SmsParserScreen() {
  const [smsText, setSmsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { dispatch } = useFinance();

  const handleParse = async () => {
    if (!smsText.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      // Call the existing backend endpoint for SMS parsing
      const resp = await api.post('/transactions/parse-sms', { text: smsText });
      setResult({ success: true, data: resp.data });
      
      // If it returned a transaction, let's sync local state (or refetch)
      // For now, we assume the backend saved it or we need to add it
      if (resp.data.transaction) {
         dispatch({ type: 'ADD_TRANSACTION', payload: resp.data.transaction });
      }
    } catch (err) {
      setResult({ success: false, error: 'Não foi possível interpretar este SMS. Verifique o formato.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText type="title">Importar SMS</ThemedText>
          <ThemedText style={styles.subtitle}>Cole o conteúdo do SMS do seu banco para extrair os dados automaticamente.</ThemedText>
        </View>

        <View style={styles.inputArea}>
          <TextInput
            style={styles.textArea}
            placeholder="Cole aqui o SMS (ex: Millennium BIM, BCI, M-Pesa...)"
            placeholderTextColor="#444"
            multiline
            value={smsText}
            onChangeText={setSmsText}
          />
          
          <TouchableOpacity 
            style={[styles.parseBtn, !smsText.trim() && styles.disabledBtn]} 
            onPress={handleParse}
            disabled={loading || !smsText.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={18} color="#000" style={{ marginRight: 8 }} />
                <ThemedText style={styles.parseBtnText}>ANALISAR SMS</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <GlassCard style={styles.resultCard}>
            {result.success ? (
              <View style={styles.resultSuccess}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#51cf66" style={{ marginBottom: 10 }} />
                <ThemedText style={styles.resultTitle}>Transação Identificada!</ThemedText>
                <View style={styles.txPreview}>
                   <ThemedText style={styles.txAmount}>{result.data?.amount} MT</ThemedText>
                   <ThemedText style={styles.txDesc}>{result.data?.description}</ThemedText>
                   <ThemedText style={styles.txDate}>{result.data?.date}</ThemedText>
                </View>
                <ThemedText style={styles.successNote}>A transação foi adicionada ao seu histórico.</ThemedText>
              </View>
            ) : (
              <View style={styles.resultError}>
                <Ionicons name="alert-circle-outline" size={32} color="#ff6b6b" style={{ marginBottom: 10 }} />
                <ThemedText style={styles.errorText}>{result.error}</ThemedText>
                <TouchableOpacity style={styles.retryBtn} onPress={() => setResult(null)}>
                   <ThemedText style={styles.retryBtnText}>Tentar Novamente</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>
        )}

        <View style={styles.helpBox}>
           <Ionicons name="phone-portrait-outline" size={16} color="#666" style={{ marginRight: 10 }} />
           <ThemedText style={styles.helpText}>Dica: Copie o SMS inteiro, incluindo cabeçalho e rodapé.</ThemedText>
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
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    lineHeight: 20,
  },
  inputArea: {
    marginBottom: 30,
  },
  textArea: {
    backgroundColor: '#151515',
    borderRadius: 20,
    padding: 20,
    color: '#fff',
    fontSize: 16,
    height: 200,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#222',
  },
  parseBtn: {
    backgroundColor: '#fcc419',
    height: 60,
    borderRadius: 20,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  parseBtnText: {
    color: '#000',
    fontWeight: '900',
    letterSpacing: 1,
  },
  resultCard: {
    marginBottom: 30,
    padding: 25,
  },
  resultSuccess: {
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 15,
  },
  txPreview: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: '100%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  txAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#51cf66',
  },
  txDesc: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
    color: '#fff',
  },
  txDate: {
    fontSize: 11,
    color: '#888',
    marginTop: 5,
  },
  successNote: {
    fontSize: 12,
    color: '#51cf66',
    fontWeight: 'bold',
  },
  resultError: {
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  retryBtn: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ff6b6b20',
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
  },
});
