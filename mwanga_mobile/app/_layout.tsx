import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { FinanceProvider, useFinance } from '@/hooks/useFinanceStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotifications } from '@/hooks/useNotifications';
import api from '@/constants/api';
import { registerBackgroundSync } from '@/services/syncService';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthCheck() {
  const { state } = useFinance();
  const { expoPushToken } = useNotifications();

  useEffect(() => {
    async function checkToken() {
      const token = await AsyncStorage.getItem('mwanga-token');
      if (!token) {
        router.replace('/login');
      } else if (expoPushToken) {
        // Sync push token with backend
        try {
           await api.post('/users/push-token', { token: expoPushToken });
        } catch (e) {
           console.warn('Failed to sync push token');
        }
      }
    }
    if (!state.loading) {
      checkToken();
    }
  }, [state.loading, expoPushToken]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    registerBackgroundSync().catch(e => console.error('BG Sync Register Error', e));
  }, []);

  return (
    <FinanceProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthCheck />
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </FinanceProvider>
  );
}
