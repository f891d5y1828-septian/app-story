import StoryModel from '../../model/story-model';
import AuthModel from '../../model/auth-model';
import * as UrlParser from '../../routes/url-parser';
import { createStoryDetailTemplate } from '../templates/template-creator';
import MapWidget from '../../utils/map-widget';

class StoryDetailPage {
  constructor() {
    this._storyModel = new StoryModel();
    this._authModel = new AuthModel();
  }

  async render() {
    return `
      <section class="content">
        <div id="story" class="story">
          <div id="loading" class="loading-indicator">Loading story...</div>
          <div id="error-container" class="error-container"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const storyContainer = document.getElementById('story');
    const loadingElement = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');
    
    try {
      // Cek apakah user sudah login
      if (!this._authModel.isLoggedIn()) {
        window.location.hash = '#/login';
        return;
      }
      
      // Ambil id dari URL
      const { id: storyId } = UrlParser.parseActivePathname();
      
      // Ambil detail story dari API
      const story = await this._storyModel.getStoryById(storyId);
      
      // Hapus loading indicator
      loadingElement.style.display = 'none';
      
      // Tampilkan detail story
      storyContainer.innerHTML = createStoryDetailTemplate(story);

      // Tampilkan peta jika koordinat tersedia
      if (typeof story.lat === 'number' && typeof story.lon === 'number') {
        const mapEl = document.getElementById('story-map');
        if (mapEl) {
          const map = new MapWidget(mapEl, { zoom: 10 });
          map.init();
          map.setSingleMarker(story);
        }
      }
    } catch (error) {
      loadingElement.style.display = 'none';
      errorContainer.innerHTML = `<p>Error: ${error.message}</p>`;
    }
  }
}

export default StoryDetailPage;