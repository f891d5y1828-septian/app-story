import StoryModel from '../../model/story-model';
import AuthModel from '../../model/auth-model';

export default class MapPage {
  constructor() {
    this._storyModel = new StoryModel();
    this._authModel = new AuthModel();
  }
  async render() {
    return `
      <section class="container">
        <h1 class="page-title">Peta Story</h1>
        <div class="map-layout">
          <div class="map-sidebar" aria-label="Pengaturan dan daftar story">
            <ul id="stories-list" class="stories-list" aria-label="Daftar story"></ul>
          </div>
          <div>
            <div id="map" class="map" aria-label="Peta marker story"></div>
            <div id="coord-panel" class="coord-panel" aria-live="polite" aria-label="Data koordinat lokasi">
              <p class="coord-title">Data koordinat lokasi</p>
              <div class="coord-values">
                <span class="coord-item"><strong>Latitude:</strong> <span id="coord-lat">-</span></span>
                <span class="coord-item"><strong>Longitude:</strong> <span id="coord-lon">-</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    // Gunakan Model untuk memeriksa status login (tanpa akses langsung ke localStorage)
    if (!this._authModel.isLoggedIn()) {
      window.location.hash = '#/login';
      return;
    }

    const storiesListEl = document.querySelector('#stories-list');
    const mapEl = document.querySelector('#map');

    // Inisialisasi peta dan data menggunakan Model
    await this._loadMapAndData(mapEl, storiesListEl);
  }

  async _loadMapAndData(mapEl, storiesListEl) {
    await this._ensureLeafletLoaded(storiesListEl);

    // Create Leaflet map
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    });
    const opentopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenTopoMap (CC-BY-SA)'
    });

    const map = L.map(mapEl, {
      center: [ -6.200, 106.816 ],
      zoom: 5,
      layers: [osm]
    });

    // Pastikan ukuran peta valid agar tampilan rapi
    setTimeout(() => map.invalidateSize(), 150);

    const baseMaps = {
      'OpenStreetMap': osm,
      'OpenTopoMap': opentopo,
    };

    L.control.layers(baseMaps, {}).addTo(map);

    const coordLatEl = document.getElementById('coord-lat');
    const coordLonEl = document.getElementById('coord-lon');
    const updateCoordPanel = (lat, lon) => {
      if (typeof lat === 'number' && typeof lon === 'number') {
        coordLatEl.textContent = lat.toFixed(6);
        coordLonEl.textContent = lon.toFixed(6);
      }
    };

    storiesListEl.innerHTML = '<div class="loading">Memuat data...</div>';

    try {
      const stories = await this._storyModel.getStories(1, 30, 1);
      storiesListEl.innerHTML = '';

      const markersById = new Map();
      const listItemsById = new Map();
      const storiesById = new Map();

      stories.forEach((story) => {
        const item = document.createElement('li');
        item.className = 'story-item';
        item.dataset.id = story.id;
        item.tabIndex = 0;
        item.innerHTML = `
          <img class="story-photo" src="${story.photoUrl}" alt="Foto milik ${story.name}" />
          <div class="story-info">
            <h3 class="story-name">${story.name}</h3>
            <p class="story-description">${story.description || ''}</p>
            <p class="story-created">${new Date(story.createdAt).toLocaleString('id-ID')}</p>
          </div>
        `;
        storiesListEl.appendChild(item);
        listItemsById.set(story.id, item);
        storiesById.set(story.id, story);

        if (typeof story.lat === 'number' && typeof story.lon === 'number') {
          const marker = L.marker([story.lat, story.lon]);
          marker.bindPopup(`
            <div class="popup">
              <img src="${story.photoUrl}" alt="Foto milik ${story.name}" />
              <div class="popup-content">
                <strong>${story.name}</strong>
                <p>${story.description || ''}</p>
                <small>${new Date(story.createdAt).toLocaleString('id-ID')}</small>
              </div>
            </div>
          `);
          marker.addTo(map);
          markersById.set(story.id, marker);

          marker.on('click', () => {
            updateCoordPanel(story.lat, story.lon);
            this._highlight(story.id, markersById, listItemsById);
          });
        }
      });

      // Interactivity: sync list -> marker
      storiesListEl.addEventListener('click', (e) => {
        const item = e.target.closest('.story-item');
        if (!item) return;
        const id = item.dataset.id;
        const marker = markersById.get(id);
        const s = storiesById.get(id);
        if (marker) {
          map.setView(marker.getLatLng(), 10);
          marker.openPopup();
        }
        if (s) updateCoordPanel(s.lat, s.lon);
        this._highlight(id, markersById, listItemsById);
      });

      // Keyboard support for list items
      storiesListEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const item = e.target.closest('.story-item');
          if (!item) return;
          e.preventDefault();
          const id = item.dataset.id;
          const marker = markersById.get(id);
          const s = storiesById.get(id);
          if (marker) {
            map.setView(marker.getLatLng(), 10);
            marker.openPopup();
          }
          if (s) updateCoordPanel(s.lat, s.lon);
          this._highlight(id, markersById, listItemsById);
        }
      });

      // Fit map to markers
      const group = L.featureGroup(Array.from(markersById.values()));
      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds().pad(0.3));
      }
    } catch (error) {
      storiesListEl.innerHTML = `<div class="error-message">${error.message}. Pastikan Anda sudah login untuk memuat data.</div>`;
    }
  }

  _highlight(activeId, markersById, listItemsById) {
    listItemsById.forEach((el, id) => {
      if (id === activeId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    markersById.forEach((marker, id) => {
      const isActive = id === activeId;
      const icon = isActive
        ? L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            className: 'marker-active'
          })
        : L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
          });
      marker.setIcon(icon);
    });
  }

  async _ensureLeafletLoaded(storiesListEl) {
    if (typeof window.L !== 'undefined') return;

    const cssHref = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    const jsSrc = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

    // Check if Leaflet is already being loaded
    const existingCss = document.querySelector(`link[href="${cssHref}"]`);
    const existingScript = document.querySelector(`script[src="${jsSrc}"]`);

    return new Promise((resolve, reject) => {
      let cssLoaded = !!existingCss;
      let jsLoaded = false;
      let timeoutId;

      const checkComplete = () => {
        if (cssLoaded && jsLoaded && typeof window.L !== 'undefined') {
          clearTimeout(timeoutId);
          resolve();
        }
      };

      // Set timeout for loading
      timeoutId = setTimeout(() => {
        if (typeof window.L === 'undefined') {
          storiesListEl.innerHTML = '<div class="error-message">Leaflet belum tersedia. Coba muat ulang halaman.</div>';
          reject(new Error('Leaflet loading timeout'));
        }
      }, 10000);

      // Load CSS if not already loaded
      if (!existingCss) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssHref;
        link.onload = () => {
          cssLoaded = true;
          checkComplete();
        };
        link.onerror = () => {
          clearTimeout(timeoutId);
          storiesListEl.innerHTML = '<div class="error-message">Gagal memuat CSS Leaflet dari CDN.</div>';
          reject(new Error('Leaflet CSS load failed'));
        };
        document.head.appendChild(link);
      }

      // Load JS if not already loaded
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = jsSrc;
        script.onload = () => {
          jsLoaded = true;
          // Wait a bit for L to be available
          setTimeout(() => {
            if (typeof window.L !== 'undefined') {
              checkComplete();
            } else {
              // Try again after a short delay
              setTimeout(() => {
                if (typeof window.L !== 'undefined') {
                  checkComplete();
                }
              }, 500);
            }
          }, 100);
        };
        script.onerror = () => {
          clearTimeout(timeoutId);
          storiesListEl.innerHTML = '<div class="error-message">Gagal memuat JavaScript Leaflet dari CDN.</div>';
          reject(new Error('Leaflet JS load failed'));
        };
        document.body.appendChild(script);
      } else {
        // Script already exists, check if L is available
        if (typeof window.L !== 'undefined') {
          jsLoaded = true;
          checkComplete();
        } else {
          // Wait for existing script to load
          const checkExisting = () => {
            if (typeof window.L !== 'undefined') {
              jsLoaded = true;
              checkComplete();
            } else {
              setTimeout(checkExisting, 100);
            }
          };
          checkExisting();
        }
      }
    });
  }
}