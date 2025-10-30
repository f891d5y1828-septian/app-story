class FavoriteModel {
  constructor() {
    this.STORAGE_KEY = 'FAVORITE_MOVIES';
  }

  getFavoriteMovies() {
    const favorites = localStorage.getItem(this.STORAGE_KEY);
    return favorites ? JSON.parse(favorites) : [];
  }

  isFavorite(id) {
    const favorites = this.getFavoriteMovies();
    return favorites.some((movieId) => movieId === id);
  }

  toggleFavorite(id) {
    const favorites = this.getFavoriteMovies();
    
    if (this.isFavorite(id)) {
      // Remove from favorites
      const newFavorites = favorites.filter((movieId) => movieId !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newFavorites));
      return false; // Not favorite anymore
    } else {
      // Add to favorites
      favorites.push(id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
      return true; // Is now favorite
    }
  }
}

export default FavoriteModel;