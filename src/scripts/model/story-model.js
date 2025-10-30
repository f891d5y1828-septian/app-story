import CONFIG from '../config';

class StoryModel {
  constructor() {
    this._baseUrl = CONFIG.BASE_URL;
    this._maxBytes = 9500000; // ~9.5MB to stay under typical 10MB limits
  }

  async getToken() {
    return localStorage.getItem('token') || CONFIG.API_TOKEN;
  }

  async getStories(page = 1, size = 10, location = 0) {
    try {
      const token = await this.getToken();
      const response = await fetch(`${this._baseUrl}/stories?page=${page}&size=${size}&location=${location}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      return responseJson.listStory;
    } catch (error) {
      console.error('Error getting stories:', error);
      return [];
    }
  }

  async getStoryById(id) {
    try {
      const token = await this.getToken();
      const response = await fetch(`${this._baseUrl}/stories/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      return responseJson.story;
    } catch (error) {
      console.error('Error getting story by id:', error);
      return null;
    }
  }

  async _canvasToBlob(canvas, type = 'image/jpeg', quality = 0.9) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  async _readImage(fileOrBlob) {
    // Prefer createImageBitmap for performance, fallback to HTMLImageElement
    try {
      const bitmap = await createImageBitmap(fileOrBlob);
      return { width: bitmap.width, height: bitmap.height, draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h) };
    } catch (_) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrBlob);
      });
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
      });
      return { width: img.width, height: img.height, draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h) };
    }
  }

  async _compressImage(fileOrBlob, { maxBytes = this._maxBytes, maxWidth = 1920, mime = 'image/jpeg' } = {}) {
    // If already small enough, return as is
    if (fileOrBlob && fileOrBlob.size && fileOrBlob.size <= maxBytes) return fileOrBlob;

    const image = await this._readImage(fileOrBlob);
    let targetW = Math.min(image.width, maxWidth);
    let targetH = Math.round(image.height * (targetW / image.width));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let quality = 0.9;

    for (let i = 0; i < 8; i += 1) { // attempt up to 8 times, reducing quality/size
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.clearRect(0, 0, targetW, targetH);
      image.draw(ctx, targetW, targetH);

      const blob = await this._canvasToBlob(canvas, mime, quality);
      if (blob && blob.size <= maxBytes) return blob;

      // reduce further
      if (quality > 0.5) quality -= 0.1; else { // lower quality first
        targetW = Math.round(targetW * 0.85);
        targetH = Math.round(targetH * 0.85);
        if (targetW < 640) quality = Math.max(quality - 0.05, 0.4); // don't go too tiny; tweak quality
      }
    }

    // As a last resort return the final blob even if slightly above; better than original huge
    const finalBlob = await this._canvasToBlob(canvas, mime, Math.max(quality, 0.4));
    return finalBlob || fileOrBlob;
  }

  async addStory(description, photoFile, lat = null, lon = null) {
    try {
      const token = await this.getToken();
      const formData = new FormData();
      
      formData.append('description', description);
      const compressed = await this._compressImage(photoFile);
      formData.append('photo', compressed, (photoFile && photoFile.name) ? photoFile.name.replace(/\.[^.]+$/, '.jpg') : 'photo.jpg');
      
      if (lat !== null && lon !== null) {
        formData.append('lat', lat);
        formData.append('lon', lon);
      }
      
      const response = await fetch(`${this._baseUrl}/stories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      return responseJson;
    } catch (error) {
      console.error('Error adding story:', error);
      throw error;
    }
  }

  async addStoryAsGuest(description, photoFile, lat = null, lon = null) {
    try {
      const formData = new FormData();
      
      formData.append('description', description);
      const compressed = await this._compressImage(photoFile);
      formData.append('photo', compressed, (photoFile && photoFile.name) ? photoFile.name.replace(/\.[^.]+$/, '.jpg') : 'photo.jpg');
      
      if (lat !== null && lon !== null) {
        formData.append('lat', lat);
        formData.append('lon', lon);
      }
      
      const response = await fetch(`${this._baseUrl}/stories/guest`, {
        method: 'POST',
        body: formData
      });
      
      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      return responseJson;
    } catch (error) {
      console.error('Error adding story as guest:', error);
      throw error;
    }
  }
}

export default StoryModel;