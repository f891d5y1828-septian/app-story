import CONFIG from '../../config';

const createStoryItemTemplate = (story) => `
  <div class="story-item">
    <div class="story-item__header">
      <h3 class="story-item__title">${story.name}</h3>
      <p class="story-item__date">${new Date(story.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    <div class="story-item__content">
      <img class="story-item__thumbnail" src="${story.photoUrl}" alt="${story.name}" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='./images/placeholder-movie.svg';">
      <p class="story-item__description">${story.description}</p>
    </div>
    <div class="story-item__footer">
      <a href="#/story/${story.id}" class="story-item__detail-button">Lihat Detail</a>
      <div class="offline-actions">
        <button class="save-offline-btn" data-id="${story.id}" aria-label="Simpan story untuk dibaca offline">Simpan Offline</button>
        <button class="delete-offline-btn" data-id="${story.id}" aria-label="Hapus story dari penyimpanan offline">Hapus Offline</button>
      </div>
    </div>
  </div>
`;

const createStoryDetailTemplate = (story) => `
  <div class="story-detail">
    <h1 class="story-detail__title">${story.name}</h2>
    <p class="story-detail__date">${new Date(story.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <img class="story-detail__image" src="${story.photoUrl}" alt="${story.name}" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='./images/placeholder-movie.svg';">
    <div class="story-detail__info">
      <p class="story-detail__description">${story.description}</p>
      ${story.lat && story.lon ? `
        <div class="story-detail__location">
          <h3>Lokasi</h3>
          <p>Latitude: ${story.lat}</p>
          <p>Longitude: ${story.lon}</p>
          <a href="https://www.google.com/maps?q=${story.lat},${story.lon}" target="_blank" rel="noopener noreferrer">Lihat di Google Maps</a>
        </div>
        <div id="story-map" class="story-detail-map"></div>
      ` : ''}
    </div>
  </div>
`;

export {
  createStoryItemTemplate,
  createStoryDetailTemplate,
};