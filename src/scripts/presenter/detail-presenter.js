class DetailPresenter {
  constructor({ view, model, id }) {
    this._view = view;
    this._model = model;
    this._id = id;
  }

  async init() {
    try {
      const movie = await this._model.getMovieById(this._id);
      if (movie) {
        this._view.showMovie(movie);
      } else {
        this._view.showError('Film tidak ditemukan');
      }
    } catch (error) {
      this._view.showError(error.message);
    }
  }
}

export default DetailPresenter;