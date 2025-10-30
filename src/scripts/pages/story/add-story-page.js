import StoryModel from '../../model/story-model';
import AuthModel from '../../model/auth-model';

class AddStoryPage {
  constructor() {
    this._storyModel = new StoryModel();
    this._authModel = new AuthModel();
    this._map = null;
    this._marker = null;
    this._selectedPosition = null;
  }

  async render() {
    return `
      <section class="content">
        <h1 class="content__heading">Tambah Story Baru</h2>
        <div class="add-story-form">
          <form id="addStoryForm" enctype="multipart/form-data">
            <div class="form-group">
              <label for="description">Deskripsi</label>
              <textarea id="description" name="description" required></textarea>
            </div>
            <div class="form-group">
              <label>Pilih Sumber Foto</label>
              <div class="photo-source-options">
                <label class="radio-option">
                  <input type="radio" name="photoSource" value="file" checked>
                  <span>Pilih dari File</span>
                </label>
                <label class="radio-option">
                  <input type="radio" name="photoSource" value="camera">
                  <span>Gunakan Kamera</span>
                </label>
              </div>
              
              <div id="fileInputSection" class="photo-input-section">
                <label for="photo">Pilih Foto</label>
                <input type="file" id="photo" name="photo" accept="image/*" required>
              </div>
              
              <div id="cameraSection" class="photo-input-section" style="display: none;">
                <div class="camera-tools">
                  <button type="button" id="openCamera" class="secondary-button">Buka Kamera</button>
                  <button type="button" id="capturePhoto" class="secondary-button" disabled>Ambil Foto</button>
                  <button type="button" id="closeCamera" class="secondary-button" disabled>Tutup Kamera</button>
                  <div class="camera-view" aria-label="Pratinjau kamera">
                    <video id="cameraVideo" autoplay playsinline style="max-width:100%; display:none"></video>
                    <canvas id="cameraCanvas" style="display:none"></canvas>
                  </div>
                </div>
              </div>
              
              <div id="imagePreview" class="image-preview"></div>
            </div>
            <div class="form-group">
              <label>Lokasi</label>
              <div id="mapContainer" class="map-container" aria-label="Peta untuk memilih lokasi"></div>
              <p class="map-help">Klik pada peta atau geser marker untuk memilih lokasi</p>
              <div class="location-info" role="group" aria-label="Koordinat terpilih">
                <p class="coordinate-label">Data koordinat lokasi:</p>
                <div class="coordinate-display">
                  <span class="coordinate-item">
                    <strong>Latitude:</strong> <span id="latitude-display">-</span>
                  </span>
                  <span class="coordinate-item">
                    <strong>Longitude:</strong> <span id="longitude-display">-</span>
                  </span>
                </div>
              </div>
            </div>
            <div class="form-group">
              <button type="submit" class="submit-button">Tambah Story</button>
              <div id="guestModeContainer">
                <label>
                  <input type="checkbox" id="guestMode"> Tambahkan sebagai tamu
                </label>
              </div>
            </div>
            <div id="addStoryMessage" class="message"></div>
          </form>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const addStoryForm = document.getElementById('addStoryForm');
    const photoInput = document.getElementById('photo');
    const imagePreview = document.getElementById('imagePreview');
    const addStoryMessage = document.getElementById('addStoryMessage');
    const guestModeCheckbox = document.getElementById('guestMode');
    const openCameraBtn = document.getElementById('openCamera');
    const capturePhotoBtn = document.getElementById('capturePhoto');
    const closeCameraBtn = document.getElementById('closeCamera');
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const photoSourceRadios = document.querySelectorAll('input[name="photoSource"]');
    const fileInputSection = document.getElementById('fileInputSection');
    const cameraSection = document.getElementById('cameraSection');
    this._cameraStream = null;
    this._cameraBlob = null;
    this._currentPhotoSource = 'file';

    // Guard login
    if (!this._authModel.isLoggedIn()) {
      window.location.hash = '#/login';
      return;
    }

    // Handle photo source selection
    photoSourceRadios.forEach(radio => {
      radio.addEventListener('change', (event) => {
        this._currentPhotoSource = event.target.value;
        this._switchPhotoSource(event.target.value);
      });
    });

    // Preview gambar
    photoInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
        // Reset hasil kamera jika user memilih file manual
        this._cameraBlob = null;
      } else {
        imagePreview.innerHTML = '';
      }
    });

    // Kamera: buka stream
    openCameraBtn.addEventListener('click', async () => {
      try {
        this._cameraBlob = null;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        this._cameraStream = stream;
        cameraVideo.srcObject = stream;
        cameraVideo.style.display = 'block';
        cameraCanvas.style.display = 'none';
        capturePhotoBtn.disabled = false;
        closeCameraBtn.disabled = false;
      } catch (err) {
        addStoryMessage.textContent = `Tidak dapat mengakses kamera: ${err.message}`;
        addStoryMessage.classList.add('error');
      }
    });

    // Kamera: ambil foto dari video -> canvas -> blob
    capturePhotoBtn.addEventListener('click', async () => {
      if (!this._cameraStream) return;
      const video = cameraVideo;
      const canvas = cameraCanvas;
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);
      cameraCanvas.style.display = 'block';
      // Tampilkan preview gambar hasil tangkap
      imagePreview.innerHTML = `<img src="${canvas.toDataURL('image/jpeg', 0.9)}" alt="Preview">`;
      // Simpan blob untuk pengiriman
      canvas.toBlob((blob) => { this._cameraBlob = blob; }, 'image/jpeg', 0.9);
    });

    // Kamera: tutup stream
    closeCameraBtn.addEventListener('click', () => {
      if (this._cameraStream) {
        this._cameraStream.getTracks().forEach(t => t.stop());
        this._cameraStream = null;
      }
      cameraVideo.srcObject = null;
      cameraVideo.style.display = 'none';
      capturePhotoBtn.disabled = true;
      closeCameraBtn.disabled = true;
    });

    // Muat Leaflet jika belum
    await this._ensureLeafletLoaded(addStoryMessage);

    // Inisialisasi peta untuk memilih lokasi
    const mapEl = document.getElementById('mapContainer');
    this._map = L.map(mapEl).setView([-6.2088, 106.8456], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this._map);

    // Marker draggable pada posisi awal
    const startLat = -6.2088;
    const startLon = 106.8456;
    this._marker = L.marker([startLat, startLon], { draggable: true }).addTo(this._map);
    this._selectedPosition = { lat: startLat, lon: startLon };
    this._updateCoordinateDisplay(startLat, startLon);

    // Drag marker -> update koordinat
    this._marker.on('dragend', () => {
      const { lat, lng } = this._marker.getLatLng();
      this._selectedPosition = { lat, lon: lng };
      this._updateCoordinateDisplay(lat, lng);
    });

    // Click peta -> pindahkan marker
    this._map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this._marker.setLatLng([lat, lng]);
      this._selectedPosition = { lat, lon: lng };
      this._updateCoordinateDisplay(lat, lng);
    });

    setTimeout(() => this._map.invalidateSize(), 100);

    // Submit form
    addStoryForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const description = document.getElementById('description').value;
      let photo = null;
      
      // Gunakan foto sesuai dengan mode yang dipilih
      if (this._currentPhotoSource === 'camera') {
        photo = this._cameraBlob;
        if (!photo) {
          addStoryMessage.textContent = 'Silakan ambil foto dengan kamera terlebih dahulu';
          addStoryMessage.classList.add('error');
          return;
        }
      } else {
        photo = document.getElementById('photo').files[0];
        if (!photo) {
          addStoryMessage.textContent = 'Silakan pilih file foto terlebih dahulu';
          addStoryMessage.classList.add('error');
          return;
        }
      }
      
      const isGuestMode = guestModeCheckbox.checked;

      const lat = this._selectedPosition ? this._selectedPosition.lat : null;
      const lon = this._selectedPosition ? this._selectedPosition.lon : null;

      try {
        addStoryMessage.textContent = 'Mengunggah story...';
        addStoryMessage.classList.remove('error');

        if (isGuestMode) {
          await this._storyModel.addStoryAsGuest(description, photo, lat, lon);
        } else {
          await this._storyModel.addStory(description, photo, lat, lon);
        }

        addStoryMessage.textContent = 'Story berhasil ditambahkan!';
        addStoryForm.reset();
        imagePreview.innerHTML = '';

        setTimeout(() => {
          window.location.hash = '#/stories';
        }, 1500);
      } catch (error) {
        addStoryMessage.textContent = `Error: ${error.message}`;
        addStoryMessage.classList.add('error');
      }
    });
  }

  _updateCoordinateDisplay(lat, lon) {
    const latDisplay = document.getElementById('latitude-display');
    const lonDisplay = document.getElementById('longitude-display');
    if (latDisplay && lonDisplay) {
      if (typeof lat === 'number' && typeof lon === 'number') {
        latDisplay.textContent = Number(lat).toFixed(8);
        lonDisplay.textContent = Number(lon).toFixed(8);
      } else {
        latDisplay.textContent = '-';
        lonDisplay.textContent = '-';
      }
    }
  }

  _switchPhotoSource(source) {
    const fileInputSection = document.getElementById('fileInputSection');
    const cameraSection = document.getElementById('cameraSection');
    const photoInput = document.getElementById('photo');
    const imagePreview = document.getElementById('imagePreview');

    if (source === 'camera') {
      // Tampilkan kontrol kamera, sembunyikan file input
      fileInputSection.style.display = 'none';
      cameraSection.style.display = 'block';
      
      // Reset file input dan hapus required
      photoInput.value = '';
      photoInput.removeAttribute('required');
      
      // Reset preview jika ada
      imagePreview.innerHTML = '';
      
    } else {
      // Tampilkan file input, sembunyikan kontrol kamera
      fileInputSection.style.display = 'block';
      cameraSection.style.display = 'none';
      
      // Tambahkan required ke file input
      photoInput.setAttribute('required', 'required');
      
      // Tutup kamera jika sedang aktif
      if (this._cameraStream) {
        this._cameraStream.getTracks().forEach(t => t.stop());
        this._cameraStream = null;
      }
      
      // Reset camera elements
      const cameraVideo = document.getElementById('cameraVideo');
      const capturePhotoBtn = document.getElementById('capturePhoto');
      const closeCameraBtn = document.getElementById('closeCamera');
      
      if (cameraVideo) {
        cameraVideo.srcObject = null;
        cameraVideo.style.display = 'none';
      }
      
      if (capturePhotoBtn) capturePhotoBtn.disabled = true;
      if (closeCameraBtn) closeCameraBtn.disabled = true;
      
      // Reset camera blob dan preview
      this._cameraBlob = null;
      imagePreview.innerHTML = '';
    }
  }

  async _ensureLeafletLoaded(messageEl) {
    if (typeof window.L !== 'undefined') return;

    const cssHref = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    const jsSrc = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

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

      timeoutId = setTimeout(() => {
        if (typeof window.L === 'undefined') {
          if (messageEl) messageEl.textContent = 'Leaflet belum tersedia. Coba muat ulang halaman.';
          reject(new Error('Leaflet loading timeout'));
        }
      }, 10000);

      if (!existingCss) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssHref;
        link.onload = () => { cssLoaded = true; checkComplete(); };
        link.onerror = () => { clearTimeout(timeoutId); if (messageEl) messageEl.textContent = 'Gagal memuat CSS Leaflet.'; reject(new Error('Leaflet CSS load failed')); };
        document.head.appendChild(link);
      }

      if (!existingScript) {
        const script = document.createElement('script');
        script.src = jsSrc;
        script.onload = () => { jsLoaded = true; setTimeout(checkComplete, 100); };
        script.onerror = () => { clearTimeout(timeoutId); if (messageEl) messageEl.textContent = 'Gagal memuat JS Leaflet.'; reject(new Error('Leaflet JS load failed')); };
        document.body.appendChild(script);
      } else {
        if (typeof window.L !== 'undefined') { jsLoaded = true; checkComplete(); }
        else { const interval = setInterval(() => { if (typeof window.L !== 'undefined') { clearInterval(interval); jsLoaded = true; checkComplete(); } }, 100); }
      }
    });
  }
}

export default AddStoryPage;