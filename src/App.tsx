import { useState, useEffect, useCallback } from 'react';
import { Search, Heart, Clock, History, X, Plus, Loader2 } from 'lucide-react';

// --- Interfaces & Constants ---
interface Movie {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  overview: string;
  original_language: string;
}

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYmQxMzAxZjY2NWU4Y2QxNzE0MmY5MDZjZjY3OGRlNCIsIm5iZiI6MTc1NzU3Njk2NS4yNjQ5OTk5LCJzdWIiOiI2OGMyN2YwNWU4MjNlYzFjOGM5YzE5MWUiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.fc2zg3UXyWqQfADW2S3GP20zYbAtjxWAY4tBnEy2d6o";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";
const BACKDROP_PATH = "https://image.tmdb.org/t/p/original";

const LANGUAGES = [
  { code: '', name: 'All Languages' },
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ja', name: 'Japanese' },
];

const App = () => {
  // --- State Management ---
  const [movies, setMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);

  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watchLater, setWatchLater] = useState<Movie[]>([]);
  const [recentlyWatched, setRecentlyWatched] = useState<Movie[]>([]);

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('');

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Persistence Engine ---
  useEffect(() => {
    const fav = localStorage.getItem('movieflix-favorites');
    const later = localStorage.getItem('movieflix-watchlater');
    const recent = localStorage.getItem('movieflix-recent');

    if (fav) setFavorites(JSON.parse(fav));
    if (later) setWatchLater(JSON.parse(later));
    if (recent) setRecentlyWatched(JSON.parse(recent));
  }, []);

  useEffect(() => {
    localStorage.setItem('movieflix-favorites', JSON.stringify(favorites));
    localStorage.setItem('movieflix-watchlater', JSON.stringify(watchLater));
    localStorage.setItem('movieflix-recent', JSON.stringify(recentlyWatched));
  }, [favorites, watchLater, recentlyWatched]);

  // --- Fetch Logic ---
  const fetchMovies = useCallback(async (pageNumber = 1, reset = false) => {
    setLoading(true);
    let url = "";

    // Search endpoint does not support with_original_language, so we handle logic branch
    if (query.trim()) {
      url = `${BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${pageNumber}`;
    } else {
      url = `${BASE_URL}/discover/movie?page=${pageNumber}&sort_by=popularity.desc`;
      if (language) url += `&with_original_language=${language}`;
    }

    try {
      const res = await fetch(url, {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      });

      const data = await res.json();
      let results = data.results || [];

      // Local filter for search results since TMDB API doesn't support search + language filter in one call
      if (query.trim() && language) {
        results = results.filter((m: Movie) => m.original_language === language);
      }

      if (reset) setMovies(results);
      else setMovies(prev => [...prev, ...results]);
    } catch (error) {
      console.error("Error fetching movies:", error);
    } finally {
      setLoading(false);
    }
  }, [query, language]);

  const fetchTrendingMovies = async () => {
    const res = await fetch(`${BASE_URL}/trending/movie/day`, {
      headers: { accept: 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    const data = await res.json();
    setTrendingMovies(data.results || []);
  };

  const fetchTopRatedMovies = async () => {
    const res = await fetch(`${BASE_URL}/movie/top_rated`, {
      headers: { accept: 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    const data = await res.json();
    setTopRatedMovies(data.results || []);
  };

  // --- Search & Language Watcher (Debounced) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchMovies(1, true);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, language, fetchMovies]);

  // --- Load More Watcher ---
  useEffect(() => {
    if (page > 1) fetchMovies(page, false);
  }, [page, fetchMovies]);

  // --- Initial Mount ---
  useEffect(() => {
    fetchTrendingMovies();
    fetchTopRatedMovies();
  }, []);

  // --- Trailer & Recent Logic ---
  useEffect(() => {
    const fetchTrailer = async () => {
      if (!selectedMovie) return;

      const res = await fetch(`${BASE_URL}/movie/${selectedMovie.id}/videos`, {
        headers: { accept: 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` },
      });

      const data = await res.json();
      const trailer = data.results.find(
        (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
      );

      setTrailerKey(trailer ? trailer.key : null);

      setRecentlyWatched(prev => {
        const filtered = prev.filter(m => m.id !== selectedMovie.id);
        return [selectedMovie, ...filtered].slice(0, 10);
      });
    };

    fetchTrailer();
  }, [selectedMovie]);

  // --- Interactive Handlers ---
  const toggleFavorite = (movie: Movie) => {
    const exists = favorites.find(m => m.id === movie.id);
    if (exists) setFavorites(favorites.filter(m => m.id !== movie.id));
    else setFavorites([...favorites, movie]);
  };

  const toggleWatchLater = (movie: Movie) => {
    const exists = watchLater.find(m => m.id === movie.id);
    if (exists) setWatchLater(watchLater.filter(m => m.id !== movie.id));
    else setWatchLater([...watchLater, movie]);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-20 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#141414]/90 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5">
        <h1 className="text-3xl font-black text-red-600 uppercase tracking-tighter">Movieflix</h1>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search movies..."
              className="w-full bg-zinc-900 border border-zinc-700 py-2 pl-10 pr-4 rounded-lg focus:outline-none focus:border-red-600 transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 px-3 py-2 rounded-lg text-sm outline-none"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </nav>

      <main className="px-6 mt-8 space-y-12">
        {/* Curated Rows */}
        {recentlyWatched.length > 0 && (
          <Row title="🕒 Recently Watched" movies={recentlyWatched} onOpen={setSelectedMovie} />
        )}
        {watchLater.length > 0 && (
          <Row title="⏳ Watch Later" movies={watchLater} onOpen={setSelectedMovie} />
        )}
        {favorites.length > 0 && (
          <Row title="❤️ Favorites" movies={favorites} onOpen={setSelectedMovie} />
        )}

        <Row title="🔥 Trending" movies={trendingMovies} onOpen={setSelectedMovie} />
        <Row title="⭐ Top Rated" movies={topRatedMovies} onOpen={setSelectedMovie} />

        {/* Explore Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            Explore All 
            {loading && <Loader2 className="animate-spin text-red-600" size={20} />}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {movies.map(movie => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onOpen={() => setSelectedMovie(movie)}
                isFav={!!favorites.find(f => f.id === movie.id)}
                isLater={!!watchLater.find(f => f.id === movie.id)}
                toggleFavorite={toggleFavorite}
                toggleWatchLater={toggleWatchLater}
              />
            ))}
          </div>
        </div>

        {/* Load More Button */}
        <div className="flex justify-center pt-8">
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="flex items-center gap-2 px-10 py-3 bg-red-600 hover:bg-red-700 rounded-full font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
            Load More Movies
          </button>
        </div>
      </main>

      {/* Modal / Detail View */}
      {selectedMovie && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
          <div className="bg-[#181818] max-w-4xl w-full rounded-2xl overflow-hidden relative max-h-[90vh] shadow-2xl">
            <button 
                onClick={() => setSelectedMovie(null)} 
                className="absolute top-4 right-4 z-10 bg-black/50 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="overflow-y-auto max-h-[90vh]">
              <img
                src={BACKDROP_PATH + (selectedMovie.backdrop_path || selectedMovie.poster_path)}
                className="w-full h-64 md:h-96 object-cover"
                alt="Backdrop"
              />

              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">{selectedMovie.title}</h2>
                    <span className="text-red-600 font-bold text-xl">⭐ {selectedMovie.vote_average.toFixed(1)}</span>
                </div>

                <p className="text-gray-400 text-lg leading-relaxed mb-8">{selectedMovie.overview}</p>

                {trailerKey ? (
                  <div className="rounded-xl overflow-hidden shadow-2xl border border-white/5">
                    <iframe
                      width="100%"
                      className="aspect-video"
                      src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                      allowFullScreen
                    />
                  </div>
                ) : (
                    <div className="h-40 bg-zinc-900 flex items-center justify-center rounded-xl text-zinc-600 italic">
                        No official trailer found.
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Row Component ---
const Row = ({ title, movies, onOpen }: any) => (
  <div className="group">
    <h2 className="text-xl font-bold mb-4 px-2">{title}</h2>
    <div className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide">
      {movies.map((movie: Movie) => (
        <div
          key={movie.id}
          className="min-w-[140px] md:min-w-[180px] cursor-pointer hover:scale-105 transition-transform duration-300"
          onClick={() => onOpen(movie)}
        >
          <div className="relative rounded-lg overflow-hidden shadow-lg border border-white/5">
            <img
              src={IMAGE_PATH + movie.poster_path}
              className="h-[210px] md:h-[270px] w-full object-cover"
              alt={movie.title}
              onError={(e:any) => e.target.src = 'https://via.placeholder.com/500x750?text=No+Poster'}
            />
          </div>
          <p className="text-sm mt-2 font-medium truncate text-gray-300">{movie.title}</p>
        </div>
      ))}
    </div>
  </div>
);

// --- MovieCard Component ---
const MovieCard = ({ movie, onOpen, isFav, isLater, toggleFavorite, toggleWatchLater }: any) => (
  <div className="group flex flex-col">
    <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-xl bg-zinc-900 border border-white/5">
      <img
        src={IMAGE_PATH + movie.poster_path}
        className="w-full h-full object-cover cursor-pointer group-hover:scale-110 transition-transform duration-500"
        onClick={onOpen}
        alt={movie.title}
        onError={(e:any) => e.target.src = 'https://via.placeholder.com/500x750?text=No+Poster'}
      />

      <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(movie); }}
          className="bg-black/70 backdrop-blur-md p-2 rounded-full hover:bg-red-600 transition-all"
        >
          <Heart size={16} className={isFav ? 'text-white fill-white' : 'text-white'} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); toggleWatchLater(movie); }}
          className="bg-black/70 backdrop-blur-md p-2 rounded-full hover:bg-yellow-500 transition-all"
        >
          <Clock size={16} className={isLater ? 'text-yellow-400 fill-yellow-400' : 'text-white'} />
        </button>
      </div>
    </div>

    <div className="mt-3 px-1">
      <p className="text-sm font-bold truncate group-hover:text-red-500 transition-colors uppercase tracking-tight">{movie.title}</p>
      <div className="flex justify-between items-center mt-1">
          <span className="text-[10px] text-zinc-500 font-bold">{movie.release_date?.split('-')[0]}</span>
          <span className="text-[10px] text-red-500 font-black">★ {movie.vote_average.toFixed(1)}</span>
      </div>
    </div>
  </div>
);

export default App;