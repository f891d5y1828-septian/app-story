class MoviesData {
  static async getMovies() {
    return [
      {
        id: 1,
        title: 'The Purple Night',
        overview: 'Seorang musisi mencari jati diri di tengah malam kota yang berpendar ungu.',
        posterUrl: 'https://www.themoviedb.org/t/p/w500/9Xw0I5RV2ZqNLpul6lXKoviYg55.jpg',
        year: 2023,
        genres: ['Drama', 'Mystery'],
        rating: 7.6
      },
      {
        id: 2,
        title: 'Echoes of Tomorrow',
        overview: 'Ilmuwan menemukan cara mengirim pesan ke masa depan, namun ada konsekuensi.',
        posterUrl: 'https://www.themoviedb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
        year: 2024,
        genres: ['Sci-Fi', 'Thriller'],
        rating: 8.1
      },
      {
        id: 3,
        title: 'Starlight Market',
        overview: 'Dua pedagang bersaing di pasar malam bertabur lampu jatuh cinta tanpa disadari.',
        posterUrl: 'https://www.themoviedb.org/t/p/w500/6KErczPBROQty7QoIsaa6wJYXZi.jpg',
        year: 2022,
        genres: ['Romance', 'Comedy'],
        rating: 7.2
      },
      {
        id: 4,
        title: 'River of Code',
        overview: 'Seorang developer muda menghadapi dilema etis di balik startup yang sukses.',
        posterUrl: 'https://www.themoviedb.org/t/p/w500/6MKr3KgOLmzOP6MSuZERO41Lpkt.jpg',
        year: 2021,
        genres: ['Drama'],
        rating: 7.9
      },
      {
        id: 5,
        title: 'Hidden Coordinates',
        overview: 'Tim penjelajah mencari koordinat rahasia menggunakan GPS di pelosok dunia.',
        posterUrl: 'https://www.themoviedb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg',
        year: 2020,
        genres: ['Adventure'],
        rating: 7.9
      }
    ];
  }

  static async getMovieById(id) {
    const movies = await this.getMovies();
    return movies.find((movie) => movie.id === parseInt(id));
  }
}

export default MoviesData;