import StoryModel from '../../model/story-model';
import AuthModel from '../../model/auth-model';
import { createStoryItemTemplate } from '../templates/template-creator';
import { saveOfflineStory, deleteOfflineStory, getSavedIdsSet } from '../../utils/indexeddb';
import MapWidget from '../../utils/map-widget';

class StoryListPage {
  constructor() {
    this._storyModel = new StoryModel();
    this._authModel = new AuthModel();
  }

  async render() {
    return `
      <section class="content">
        <h1 class="content__heading">Dicoding Stories</h2>
        <div class="list-controls" aria-label="Kontrol daftar story">
          <input type="search" id="story-search" class="story-search" placeholder="Cari story..." aria-label="Cari story">
          <select id="story-sort" class="story-sort" aria-label="Urutkan story">
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="name">Nama A-Z</option>
          </select>
        </div>
        <div id="stories-map" class="stories-map"></div>
        <div id="stories" class="stories">
          <div id="loading" class="loading-indicator">Loading stories...</div>
          <div id="error-container" class="error-container"></div>
        </div>
        <div class="add-story-button-container">
          <a href="#/add-story" class="add-story-button">+ Tambah Story</a>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const storiesContainer = document.getElementById('stories');
    const loadingElement = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');
    const mapContainer = document.getElementById('stories-map');
    const searchInput = document.getElementById('story-search');
    const sortSelect = document.getElementById('story-sort');
    let allStories = [];
    let savedIds = new Set();

    try {
      // Cek apakah user sudah login
      if (!this._authModel.isLoggedIn()) {
        window.location.hash = '#/login';
        return;
      }
      
      // Ambil data stories dari API
      allStories = await this._storyModel.getStories();
      savedIds = await getSavedIdsSet();
      
      // Hapus loading indicator
      loadingElement.style.display = 'none';
      
      // Tampilkan stories
      if (allStories.length === 0) {
        storiesContainer.innerHTML = '<div class="story-item__not__found">Tidak ada story yang ditemukan</div>';
      } else {
        const renderStories = (list) => {
          storiesContainer.innerHTML = '';
          list.forEach((story) => {
            storiesContainer.innerHTML += createStoryItemTemplate(story);
          });
          // Tandai status tombol berdasarkan IndexedDB
          document.querySelectorAll('.offline-actions').forEach((box) => {
            const id = box.querySelector('.save-offline-btn')?.dataset.id;
            if (!id) return;
            const saved = savedIds.has(String(id));
            const saveBtn = box.querySelector('.save-offline-btn');
            const delBtn = box.querySelector('.delete-offline-btn');
            if (saved) {
              saveBtn.textContent = 'Tersimpan';
              saveBtn.disabled = true;
              delBtn.disabled = false;
            } else {
              saveBtn.textContent = 'Simpan Offline';
              saveBtn.disabled = false;
              delBtn.disabled = true;
            }
          });
          attachActionHandlers();
        };

        // Sorting helper
        const sortStories = (list, mode) => {
          const arr = [...list];
          switch (mode) {
            case 'oldest':
              arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
              break;
            case 'name':
              arr.sort((a, b) => String(a.name).localeCompare(String(b.name)));
              break;
            case 'newest':
            default:
              arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }
          return arr;
        };

        // Filter helper
        const filterStories = (list, q) => {
          const qq = String(q || '').toLowerCase();
          if (!qq) return list;
          return list.filter((s) => {
            return String(s.name).toLowerCase().includes(qq) || String(s.description || '').toLowerCase().includes(qq);
          });
        };

        const refresh = () => {
          const sorted = sortStories(allStories, sortSelect.value);
          const filtered = filterStories(sorted, searchInput.value);
          renderStories(filtered);
        };

        function attachActionHandlers() {
          document.querySelectorAll('.save-offline-btn').forEach((btn) => {
            btn.onclick = async (e) => {
              const id = e.currentTarget.dataset.id;
              const story = allStories.find((s) => String(s.id) === String(id));
              if (!story) return;
              await saveOfflineStory(story);
              savedIds.add(String(id));
              refresh();
            };
          });
          document.querySelectorAll('.delete-offline-btn').forEach((btn) => {
            btn.onclick = async (e) => {
              const id = e.currentTarget.dataset.id;
              await deleteOfflineStory(id);
              savedIds.delete(String(id));
              refresh();
            };
          });
        }

        // Initial render
        refresh();
        // Wire interactivity
        searchInput.addEventListener('input', refresh);
        sortSelect.addEventListener('change', refresh);
      }

      // Inisialisasi peta daftar lokasi story
      if (mapContainer) {
        const map = new MapWidget(mapContainer, { zoom: 4 });
        map.init();
        const withLocation = allStories.filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
        map.setMarkers(withLocation);
      }
    } catch (error) {
      loadingElement.style.display = 'none';
      errorContainer.innerHTML = `<p>Error: ${error.message}</p>`;
    }
  }
}

export default StoryListPage;