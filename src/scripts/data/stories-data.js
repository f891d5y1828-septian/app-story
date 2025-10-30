import CONFIG from '../config';

class StoriesData {
  static _getToken() {
    // Prioritaskan token hasil login
    const loginToken = localStorage.getItem('token');
    const savedToken = localStorage.getItem('storyApiToken');
    return loginToken || savedToken || CONFIG.API_TOKEN || '';
  }

  static async getStories({ page = 1, size = 20, location = 1 } = {}) {
    const token = this._getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const url = `${CONFIG.BASE_URL}/stories?page=${page}&size=${size}&location=${location}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let message = `Gagal mengambil stories: ${response.status}`;
      try {
        const body = await response.json();
        message = body.message || message;
      } catch (_) {
        // ignore
      }
      throw new Error(message);
    }

    const data = await response.json();
    return data.listStory || [];
  }

  static async createStory({ description, photo, lat, lon }) {
    const token = this._getToken();
    
    if (!token) {
      throw new Error('Token tidak tersedia. Silakan login terlebih dahulu.');
    }

    const formData = new FormData();
    formData.append('description', description);
    formData.append('photo', photo);
    
    if (lat && lon) {
      formData.append('lat', lat);
      formData.append('lon', lon);
    }

    const url = `${CONFIG.BASE_URL}/stories`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.message || 'Gagal menambahkan story');
    }

    return responseData;
  }
}

export default StoriesData;