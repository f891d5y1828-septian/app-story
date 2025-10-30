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
  // Hindari pendaftaran saat pengembangan (localhost) agar HMR stabil
  const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && !isLocalhost) {
    window.addEventListener('load', () => {
      // Gunakan path relatif agar kompatibel di GitHub Pages (project pages)
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          // Optional: log status
          // console.log('SW registered', reg.scope);

          // Setup tombol toggle push
          const btn = document.getElementById('push-toggle');
          const setBtnState = async () => {
            const subscribed = await isSubscribed();
            if (!btn) return;
            btn.textContent = subscribed ? 'Matikan Notifikasi' : 'Aktifkan Notifikasi';
            btn.setAttribute('aria-pressed', String(subscribed));
          };
          setBtnState();

          if (btn) {
            btn.addEventListener('click', async () => {
              try {
                const subscribed = await isSubscribed();
                if (!subscribed) {
                  if (!CONFIG.VAPID_PUBLIC_KEY && !localStorage.getItem('vapidPublicKey')) {
                    alert('VAPID public key belum diisi. Silakan isi di CONFIG atau localStorage.vapidPublicKey');
                    return;
                  }
                  await subscribe();
                } else {
                  await unsubscribe();
                }
                await setBtnState();
              } catch (err) {
                console.error('Push toggle error:', err);
                alert('Gagal mengubah langganan notifikasi: ' + err.message);
              }
            });
          }
        })
        .catch((err) => {
          // console.warn('SW registration failed', err);
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
});
