// CSS imports
import '../styles/styles.css';

import App from './pages/app';
import AuthModel from './model/auth-model';
import CONFIG from './config';
import { isSubscribed, subscribe, unsubscribe } from './utils/push-manager';

document.addEventListener('DOMContentLoaded', async () => {
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
      navigator.serviceWorker.register('./sw.js')
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
      // Tampilkan tombol bantuan agar pengguna bisa memperbaiki izin
      pushToggle.textContent = 'Notifikasi Ditolak – Buka Panduan';
      pushToggle.setAttribute('aria-pressed', 'false');
      pushToggle.disabled = false;
      pushToggle.dataset.action = 'help';
      return;
    }
    if (permission === 'default') {
      pushToggle.textContent = 'Aktifkan Notifikasi';
      pushToggle.setAttribute('aria-pressed', 'false');
      pushToggle.disabled = false;
      delete pushToggle.dataset.action;
      return;
    }
    // permission === 'granted'
    pushToggle.textContent = isOn ? 'Matikan Notifikasi' : 'Aktifkan Notifikasi';
    pushToggle.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    pushToggle.disabled = false;
    delete pushToggle.dataset.action;
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
        const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
        if (permission === 'denied' || pushToggle.dataset.action === 'help') {
          // Tampilkan panduan cara mengizinkan notifikasi
          alert('Notifikasi ditolak oleh browser.\n\nCara mengaktifkan kembali:\n1) Klik ikon gembok di kiri URL → Site settings → Notifications → Allow.\n2) Atau buka chrome://settings/content/notifications lalu izinkan untuk f891d5y1828-septian.github.io.\n3) Setelah mengizinkan, reload halaman dan klik “Aktifkan Notifikasi”.');
          updatePushUI(false);
          return;
        }
        const subscribed = await isSubscribed();
        if (subscribed) {
          await unsubscribe();
          updatePushUI(false);
        } else {
          await subscribe();
          updatePushUI(true);
        }
      } catch (err) {
        console.error('Toggle push gagal:', err);
        alert(`Gagal mengubah notifikasi: ${err.message || err}`);
        updatePushUI(false);
      } finally {
        pushToggle.disabled = false;
      }
    });
  }
});
