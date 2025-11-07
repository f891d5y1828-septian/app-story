import CONFIG from '../config';

// Helper: ambil VAPID public key dari CONFIG atau localStorage
function getVapidPublicKey() {
  try {
    const fromConfig = (CONFIG && CONFIG.VAPID_PUBLIC_KEY) ? CONFIG.VAPID_PUBLIC_KEY : '';
    const fromGlobal = (typeof globalThis !== 'undefined' && globalThis.CONFIG && globalThis.CONFIG.VAPID_PUBLIC_KEY)
      ? globalThis.CONFIG.VAPID_PUBLIC_KEY
      : '';
    const fromStorage = typeof localStorage !== 'undefined' ? (localStorage.getItem('vapidPublicKey') || '') : '';

    const resolved = fromConfig || fromGlobal || fromStorage;
    console.log('[PushManager] VAPID resolution:', {
      fromConfig: !!fromConfig,
      fromGlobal: !!fromGlobal,
      fromStorage: !!fromStorage,
      resolvedLength: resolved ? resolved.length : 0,
    });
    return resolved;
  } catch (err) {
    console.warn('[PushManager] getVapidPublicKey error, fallback to CONFIG', err);
    return CONFIG && CONFIG.VAPID_PUBLIC_KEY ? CONFIG.VAPID_PUBLIC_KEY : '';
  }
}

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export async function getRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    try {
      // Use relative path so it works on subpath deployments (e.g., GitHub Pages)
      reg = await navigator.serviceWorker.register('./sw.js');
      console.log('Service Worker registered, waiting for activation...');
      // Wait for the service worker to be active
      await navigator.serviceWorker.ready;
      console.log('Service Worker is ready');
    } catch (e) {
      console.error('Service Worker registration failed:', e);
      return null;
    }
  }
  return reg;
}

export async function getSubscription() {
  const reg = await getRegistration();
  if (!reg || !reg.pushManager) return null;
  try {
    return await reg.pushManager.getSubscription();
  } catch (_) {
    return null;
  }
}

export async function isSubscribed() {
  const sub = await getSubscription();
  return !!sub;
}

export async function subscribe() {
  console.log('Starting subscription process...');
  
  const permission = await Notification.requestPermission();
  console.log('Notification permission status:', permission);
  
  if (permission === 'denied') {
    throw new Error('Izin notifikasi diblokir. Mohon izinkan dari pengaturan browser.');
  }
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi tidak diberikan.');
  }

  const reg = await getRegistration();
  if (!reg) {
    throw new Error('Service Worker belum terdaftar');
  }
  
  console.log('Service Worker registration:', reg);
  console.log('Service Worker state:', reg.active ? 'active' : 'not active');
  
  // Ensure service worker is active before subscribing
  if (!reg.active) {
    throw new Error('Service Worker belum aktif. Mohon tunggu beberapa saat dan coba lagi.');
  }

  // Ambil VAPID dari CONFIG atau localStorage
  const vapid = getVapidPublicKey();
  if (!vapid) {
    throw new Error('VAPID public key belum diisi. Silakan isi di CONFIG atau localStorage.vapidPublicKey');
  }

  console.log('Attempting to subscribe with VAPID key...');
  
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid),
  });

  console.log('Subscription successful:', sub);
  localStorage.setItem('pushSubscription', JSON.stringify(sub));

  // Optional: kirim subscription ke server Anda jika endpoint tersedia
  // try {
  //   await fetch(`${CONFIG.BASE_URL}/push/subscribe`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(sub),
  //   });
  // } catch (_) {}

  return sub;
}

export async function unsubscribe() {
  const sub = await getSubscription();
  if (sub) {
    await sub.unsubscribe();
  }
  localStorage.removeItem('pushSubscription');
  return true;
}

// Menampilkan notifikasi uji untuk verifikasi UI
export async function showTestNotification() {
  try {
    // Pastikan izin diberikan
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    if (permission !== 'granted') {
      return false;
    }

    const reg = await getRegistration();
    if (!reg) return false;

    await reg.showNotification('CINEMAGIC', {
      body: 'Notifikasi aktif! Cerita baru tersedia.',
      icon: './images/logo.png',
      badge: './images/logo.png',
      data: {
        url: './#/stories',
        storyId: 'demo-notif',
      },
    });

    return true;
  } catch (_) {
    return false;
  }
}