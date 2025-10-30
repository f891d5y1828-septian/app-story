export default class MapWidget {
  constructor(containerSelector, options = {}) {
    this.containerSelector = containerSelector;
    this.options = options;
    this.map = null;
    this.markers = [];
  }

  init() {
    const el = typeof this.containerSelector === 'string'
      ? document.querySelector(this.containerSelector)
      : this.containerSelector;
    if (!el) return;
    if (!window.L) {
      console.error('Leaflet belum tersedia');
      return;
    }

    const center = this.options.center || [-6.200, 106.816];
    const zoom = this.options.zoom || 5;

    const tileUrl = this.options.tileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = this.options.attribution || '&copy; OpenStreetMap contributors';

    this.map = L.map(el).setView(center, zoom);
    L.tileLayer(tileUrl, { attribution }).addTo(this.map);
    setTimeout(() => this.map.invalidateSize(), 100);
  }

  setMarkers(items = []) {
    if (!this.map) this.init();
    if (!this.map) return;

    // Remove existing markers
    this.markers.forEach((m) => this.map.removeLayer(m));
    this.markers = [];

    items.forEach((item) => {
      const { lat, lon, name, description, photoUrl } = item;
      if (typeof lat === 'number' && typeof lon === 'number') {
        const marker = L.marker([lat, lon]);
        const img = photoUrl ? `<img src="${photoUrl}" alt="Foto" style="width:180px;max-height:120px;object-fit:cover;border-radius:6px;margin-bottom:6px;" />` : '';
        marker.bindPopup(`
          ${img}
          <div style="max-width:220px">
            <strong>${name || 'Story'}</strong>
            ${description ? `<p style="margin:6px 0">${description}</p>` : ''}
            <small>Lat: ${lat}, Lon: ${lon}</small>
          </div>
        `);
        marker.addTo(this.map);
        this.markers.push(marker);
      }
    });

    this.fitToMarkers();
  }

  setSingleMarker(item) {
    this.setMarkers([item]);
  }

  fitToMarkers() {
    if (!this.map) return;
    if (this.markers.length === 0) return;
    const group = L.featureGroup(this.markers);
    this.map.fitBounds(group.getBounds().pad(0.3));
  }
}