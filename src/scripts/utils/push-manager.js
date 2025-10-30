import CONFIG from '../config';

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
      reg = await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
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
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi tidak diberikan');
  }

  const reg = await getRegistration();
  if (!reg) throw new Error('Service Worker belum terdaftar');

  const vapid = localStorage.getItem('vapidPublicKey') || CONFIG.VAPID_PUBLIC_KEY;
  if (!vapid) throw new Error('VAPID public key belum dikonfigurasi');

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid),
  });

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