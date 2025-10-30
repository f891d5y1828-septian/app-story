import MovieModel from '../../model/movie-model';
import DetailPresenter from '../../presenter/detail-presenter';
import { parseActivePathname } from '../../routes/url-parser';

export default class DetailPage {
  async render() {
    return `
      <section class="container movie-detail">
        <div id="movie-detail-container" class="movie-detail-container">
          <div class="loading">Memuat...</div>
        </div>
        <div class="back-button-container">
        -          <a href="#/" class="back-button">Kembali ke Daftar Film</a>
        +          <a href="#/stories" class="back-button">← Kembali ke Daftar Stories</a>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const movieDetailContainer = document.querySelector('#movie-detail-container');
    const { id } = parseActivePathname();
    
    const view = {
      showMovie: (movie) => {
        movieDetailContainer.innerHTML = `
          <div class="movie-detail-content">
            <img class="movie-detail-poster" src="${movie.posterUrl}" alt="${movie.title}" referrerpolicy="no-referrer" onerror="this.src='images/placeholder-movie.svg'">
            <div class="movie-detail-info">
              <h1 class="movie-detail-title">${movie.title}</h2>
              <p class="movie-detail-rating">Rating: ⭐ ${movie.rating}</p>
              <p class="movie-detail-release-date">Tanggal Rilis: ${movie.releaseDate}</p>
              <div class="movie-detail-overview">
                <h3>Sinopsis:</h3>
                <p>${movie.overview}</p>
              </div>
            </div>
          </div>
        `;
      },
      showError: (message) => {
        movieDetailContainer.innerHTML = `<div class="error-message">${message}</div>`;
      }
    };

    const presenter = new DetailPresenter({
      view,
      model: new MovieModel(),
      id,
    });

    await presenter.init();
  }
}