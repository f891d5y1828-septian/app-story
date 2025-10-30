class HomePresenter {
  constructor({ view, model }) {
    this._view = view;
    this._model = model;
  }

  async init() {
    try {
      const movies = await this._model.getMovies();
      this._view.showMovies(movies);
    } catch (error) {
      this._view.showError(error.message);
    }
  }
}

export default HomePresenter;