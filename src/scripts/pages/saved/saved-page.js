import { createStoryItemTemplate } from '../templates/template-creator';
import { getAllSavedStories, deleteOfflineStory, getSavedIdsSet } from '../../utils/indexeddb';

class SavedPage {
  constructor() {
    this.savedStories = [];
  }

  async render() {
    return `
      <section class="content">
        <h1 class="content__heading">Story Tersimpan</h1>
        <p class="content__description">Daftar story yang telah Anda simpan untuk dibaca offline</p>
        <div class="list-controls" aria-label="Kontrol daftar story tersimpan">
          <label for="saved-search" class="sr-only">Cari story tersimpan</label>
          <input type="search" id="saved-search" class="story-search" placeholder="Cari story tersimpan...">
          <label for="saved-sort" class="sr-only">Urutkan story tersimpan</label>
          <select id="saved-sort" class="story-sort">
            <option value="newest">Terbaru Disimpan</option>
            <option value="oldest">Terlama Disimpan</option>
            <option value="name">Nama A-Z</option>
          </select>
        </div>
        <div id="saved-stories" class="stories">
          <div id="loading" class="loading-indicator">Memuat story tersimpan...</div>
          <div id="error-container" class="error-container"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const storiesContainer = document.getElementById('saved-stories');
    const loadingElement = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');
    const searchInput = document.getElementById('saved-search');
    const sortSelect = document.getElementById('saved-sort');
    let savedIds = new Set();

    try {
      // Ambil data stories yang tersimpan dari IndexedDB
      this.savedStories = await getAllSavedStories();
      savedIds = await getSavedIdsSet();
      
      // Hapus loading indicator
      loadingElement.style.display = 'none';
      
      // Tampilkan stories tersimpan
      if (this.savedStories.length === 0) {
        storiesContainer.innerHTML = `
          <div class="empty-state">
            <h2>Belum Ada Story Tersimpan</h2>
            <p>Anda belum menyimpan story apapun untuk dibaca offline.</p>
            <a href="#/stories" class="button primary">Jelajahi Stories</a>
          </div>
        `;
      } else {
        const renderStories = (list) => {
          storiesContainer.innerHTML = '';
          list.forEach((story) => {
            storiesContainer.innerHTML += createStoryItemTemplate(story);
          });
          
          // Update status tombol untuk story tersimpan
          document.querySelectorAll('.offline-actions').forEach((box) => {
            const id = box.querySelector('.toggle-offline-btn')?.dataset.id;
            if (!id) return;
            const saved = savedIds.has(String(id));
            const toggleBtn = box.querySelector('.toggle-offline-btn');
            if (saved) {
              toggleBtn.textContent = 'Batalkan Simpan';
              toggleBtn.classList.add('saved');
            } else {
              toggleBtn.textContent = 'Simpan';
              toggleBtn.classList.remove('saved');
            }
          });
          
          attachActionHandlers();
        };

        // Sorting helper
        const sortStories = (list, mode) => {
          const arr = [...list];
          switch (mode) {
            case 'oldest':
              arr.sort((a, b) => new Date(a.savedAt || a.createdAt) - new Date(b.savedAt || b.createdAt));
              break;
            case 'name':
              arr.sort((a, b) => String(a.name).localeCompare(String(b.name)));
              break;
            case 'newest':
            default:
              arr.sort((a, b) => new Date(b.savedAt || b.createdAt) - new Date(a.savedAt || a.createdAt));
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

        const refresh = async () => {
          // Refresh data dari IndexedDB
          this.savedStories = await getAllSavedStories();
          savedIds = await getSavedIdsSet();
          
          const sorted = sortStories(this.savedStories, sortSelect.value);
          const filtered = filterStories(sorted, searchInput.value);
          renderStories(filtered);
        };

        function attachActionHandlers() {
          document.querySelectorAll('.toggle-offline-btn').forEach((btn) => {
            btn.onclick = async (e) => {
              const id = e.currentTarget.dataset.id;
              const isSaved = savedIds.has(String(id));
              
              if (isSaved) {
                // Hapus dari offline storage
                await deleteOfflineStory(id);
                savedIds.delete(String(id));
                // Refresh tampilan
                refresh();
              }
              // Jika tidak tersimpan, tidak perlu action karena ini halaman tersimpan
            };
          });
        }

        // Initial render
        refresh();
        // Wire interactivity
        searchInput.addEventListener('input', refresh);
        sortSelect.addEventListener('change', refresh);
      }
      
    } catch (error) {
      console.error('Error loading saved stories:', error);
      loadingElement.style.display = 'none';
      errorContainer.innerHTML = `
        <div class="error-message">
          <h2>Gagal Memuat Story Tersimpan</h2>
          <p>Terjadi kesalahan saat memuat story yang tersimpan. Silakan coba lagi.</p>
          <button onclick="location.reload()" class="button primary">Muat Ulang</button>
        </div>
      `;
    }
  }
}

export default SavedPage;