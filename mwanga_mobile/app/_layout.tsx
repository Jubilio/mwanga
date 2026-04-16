import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { FinanceProvider, useFinance } from '@/hooks/useFinanceStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotifications } from '@/hooks/useNotifications';
import api from '@/constants/api';
import { registerBackgroundSync } from '@/services/syncService';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { BlurView } from 'expo-blur';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const FINANCIAL_QUOTES = [
  "O melhor investimento que podes fazer é em ti mesmo.",
  "Riqueza não é o que ganhas, é o que guardas.",
  "Orçamento não é sobre limitação, é sobre priorização.",
  "A disciplina financeira é o passaporte para a liberdade.",
  "Pequenos riachos formam grandes rios.",
  "O tempo é o teu maior aliado nos juros compostos.",
  "Dinheiro é um excelente escravo, mas um mestre terrível.",
  "A paciência é a chave para a riqueza.",
  "O rico domina sobre o pobre, e o que toma emprestado é servo do que empresta. (Provérbios 22:7)",
  "A riqueza obtida com pressa diminuirá, mas quem a ajunta pelo trabalho terá aumento. (Provérbios 13:11)",
  "Foste fiel no pouco, sobre o muito te colocarei. (Mateus 25:21)",
  "Honra ao Senhor com os teus bens e com a primícia de toda a tua renda. (Provérbios 3:9)",
  "Os planos do diligente levam à fartura, mas a pressa excessiva leva à pobreza. (Provérbios 21:5)",
  "Pois onde estiver o vosso tesouro, ali estará também o vosso coração. (Mateus 6:21)"
];

function SplashOverlay() {
  const { state } = useFinance();
  const [fadeAnim] = useState(new Animated.Value(1));
  const [isVisible, setIsVisible] = useState(true);
  const [quote] = useState(FINANCIAL_QUOTES[Math.floor(Math.random() * FINANCIAL_QUOTES.length)]);

  useEffect(() => {
    if (!state.loading) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => setIsVisible(false));
    }
  }, [state.loading]);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={styles.splashContent}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/splash-premium.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <ThemedText style={styles.brandTitle}>Mwanga ✦</ThemedText>
          <ThemedText style={styles.quoteText}>"{quote}"</ThemedText>
          
          <View style={styles.progressTrack}>
            <Animated.View style={styles.progressFill} />
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
}

function AuthCheck() {
  const { state } = useFinance();
  const { expoPushToken } = useNotifications();

  useEffect(() => {
    async function checkToken() {
      const token = await AsyncStorage.getItem('mwanga-token');
      
      // Hide splash screen once we know our auth status and data is loaded
      await SplashScreen.hideAsync();

      if (!token) {
        router.replace('/login');
      } else if (expoPushToken) {
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
        <SplashOverlay />
        <StatusBar style="auto" />
      </ThemeProvider>
    </FinanceProvider>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#07090f',
  },
  splashContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#1a8fa8',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#1a8fa8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: 'white',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    marginBottom: 30,
  },
  quoteText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
  },
  progressTrack: {
    width: width * 0.6,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '30%',
    backgroundColor: '#1a8fa8',
  }
});
