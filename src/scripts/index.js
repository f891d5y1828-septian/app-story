// CSS imports
import '../styles/styles.css';

import App from './pages/app';
import AuthModel from './model/auth-model';
import CONFIG from './config';
import { isSubscribed, subscribe, unsubscribe, showTestNotification } from './utils/push-manager';

document.addEventListener('DOMContentLoaded', async () => {
  // Pastikan VAPID Public Key tersedia di localStorage sebagai fallback
  try {
    const existingVapid = localStorage.getItem('vapidPublicKey');
    if (!existingVapid) {
      // Sinkronkan dengan nilai dari CONFIG bila tersedia
      if (typeof CONFIG !== 'undefined' && CONFIG.VAPID_PUBLIC_KEY) {
        localStorage.setItem('vapidPublicKey', CONFIG.VAPID_PUBLIC_KEY);
      }
    }
  } catch (_) {
    // abaikan jika storage tidak tersedia
  }

  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });
  await app.renderPage();

  // Setup Logout link
  const auth = new AuthModel();
  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    // Tampilkan/semmbunyikan berdasarkan status login
    logoutLink.style.display = auth.isLoggedIn() ? 'inline-block' : 'none';

    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      auth.logout();
      // Sembunyikan link setelah logout
      logoutLink.style.display = 'none';
      // Arahkan ke halaman login
      window.location.hash = '#/login';
    });
  }

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
    // Update visibilitas logout link pada navigasi setelah perpindahan halaman
    const logoutLink2 = document.getElementById('logout-link');
    if (logoutLink2) {
      logoutLink2.style.display = auth.isLoggedIn() ? 'inline-block' : 'none';
    }
  });

  // PWA: Daftarkan Service Worker untuk caching dan Background Sync
  // Aktifkan hanya di production mode
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Daftarkan Service Worker di semua mode (dev dan prod).
      // HMR sudah dimatikan di konfigurasi dev, sehingga SW aman dijalankan.
      navigator.serviceWorker.register('./sw-v2.js')
        .then((reg) => {
          console.log('Service Worker terdaftar:', reg.scope);
        })
        .catch((err) => {
          console.warn('Pendaftaran Service Worker gagal:', err);
        });
    });
  }

  // PWA Install: handle beforeinstallprompt, show button, and trigger prompt
  let deferredPromptEvent = null;
  const installButton = document.getElementById('install-button');

  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent automatic mini-infobar
    event.preventDefault();
    deferredPromptEvent = event;
    if (installButton) installButton.style.display = 'inline-block';
  });

  if (installButton) {
    installButton.addEventListener('click', async () => {
      try {
        if (!deferredPromptEvent) return;
        deferredPromptEvent.prompt();
        const { outcome } = await deferredPromptEvent.userChoice;
        // Hide button after choice
        installButton.style.display = 'none';
        deferredPromptEvent = null;
        // Optional: feedback
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
      } catch (e) {
        console.error('Install prompt error:', e);
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    // App successfully installed
    if (installButton) installButton.style.display = 'none';
  });

  // Push Notification Toggle: inisialisasi status dan aksi
  const pushToggle = document.getElementById('push-toggle');

  function updatePushUI(isOn) {
    if (!pushToggle) return;
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

    if (permission === 'denied') {
      pushToggle.textContent = 'Aktifkan Notifikasi';
      pushToggle.setAttribute('aria-pressed', 'false');
      pushToggle.disabled = false; // Tetap aktif agar pengguna bisa mencoba lagi
      return;
    }

    if (permission === 'default') {
      pushToggle.textContent = 'Aktifkan Notifikasi';
      pushToggle.setAttribute('aria-pressed', 'false');
      pushToggle.disabled = false;
      return;
    }

    // permission === 'granted'
    pushToggle.textContent = isOn ? 'Matikan Notifikasi' : 'Aktifkan Notifikasi';
    pushToggle.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    pushToggle.disabled = false;
  }

  async function initPushUI() {
    if (!pushToggle) return;
    if (typeof Notification === 'undefined') {
      pushToggle.textContent = 'Notifikasi tidak didukung';
      pushToggle.disabled = true;
      return;
    }
    try {
      const current = await isSubscribed();
      updatePushUI(current);
    } catch (e) {
      console.warn('Cek status subscription gagal:', e);
      updatePushUI(false);
    }
  }

  if (pushToggle) {
    await initPushUI();
    pushToggle.addEventListener('click', async () => {
      try {
        pushToggle.disabled = true;
        const subscribed = await isSubscribed();
        if (subscribed) {
          await unsubscribe();
          updatePushUI(false);
        } else {
          await subscribe();
          updatePushUI(true);
          // Tampilkan notifikasi uji setelah berhasil subscribe
          await showTestNotification();
        }
      } catch (err) {
        console.error('Toggle push gagal:', err);
        alert(`Gagal mengubah notifikasi: ${err.message || err}`);
        // Kembalikan state UI ke sebelum aksi gagal
        const subscribed = await isSubscribed();
        updatePushUI(subscribed);
      } finally {
        pushToggle.disabled = false;
      }
    });
  }
});
