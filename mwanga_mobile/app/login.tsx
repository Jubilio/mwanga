import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useFinance } from '@/hooks/useFinanceStore';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import api from '@/constants/api';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { dispatch } = useFinance();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const resp = await api.post('/auth/login', { email, password });
      const { token, user } = resp.data;
      
      await AsyncStorage.setItem('mwanga-token', token);
      dispatch({ type: 'SET_USER', payload: user });
      
      router.replace('/(tabs)');
    } catch (err) {
      alert('Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={styles.branding}>
             <ThemedText style={styles.logo}>M</ThemedText>
             <ThemedText type="title" style={styles.title}>Mwanga ✨</ThemedText>
             <ThemedText style={styles.subtitle}>Gestão Financeira de Elite</ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>EMAIL</ThemedText>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="exemplo@mwanga.com"
                placeholderTextColor="#444"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>PALAVRA-PASSE</ThemedText>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#444"
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={styles.loginBtn} 
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={['#1a2a6c', '#b21f1f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <ThemedText style={styles.loginBtnText}>
                  {loading ? 'A ENTRIAR...' : 'ENTRAR'}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotBtn}>
              <ThemedText style={styles.forgotText}>Esqueceu a senha?</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  branding: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    fontSize: 60,
    fontWeight: '900',
    color: '#fcc419',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: '#151515',
    borderRadius: 15,
    padding: 18,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  loginBtn: {
    marginTop: 10,
    height: 60,
    borderRadius: 15,
    overflow: 'hidden',
  },
  gradientBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  forgotBtn: {
    alignItems: 'center',
  },
  forgotText: {
    color: '#666',
    fontSize: 13,
  },
});
