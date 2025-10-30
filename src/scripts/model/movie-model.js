import MoviesData from '../data/movies-data';

class MovieModel {
  async getMovies() {
    return MoviesData.getMovies();
  }

  async getMovieById(id) {
    return MoviesData.getMovieById(id);
  }
}

export default MovieModel;