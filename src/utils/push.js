/**
 * Utilitário para gerir Notificações Web Push no Mwanga
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl62i47Y4_YpZ_W_6u_Y-W_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y_Y'; 

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Este browser não suporta notificações.');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeUserToPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Verificar se já existe subscrição
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Criar nova subscrição
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }
    
    return subscription;
  } catch (error) {
    console.error('Erro ao subscrever para Push:', error);
    return null;
  }
}

export function sendLocalNotification(title, options = {}) {
  if (Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [100, 50, 100],
        ...options
      });
    });
  }
}

// Auxiliar para converter a chave VAPID
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
