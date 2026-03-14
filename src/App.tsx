import { useState, useEffect, useCallback } from 'react';
import { Search, Heart, Clock, X, Plus, Loader2, ImageOff, Trash2, SlidersHorizontal } from 'lucide-react';

// --- Interfaces & Constants ---
interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
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

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Popularity' },
  { value: 'vote_average.desc', label: 'Top Rated' },
  { value: 'primary_release_date.desc', label: 'Newest' },
];

const App = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watchLater, setWatchLater] = useState<Movie[]>([]);
  const [recentlyWatched, setRecentlyWatched] = useState<Movie[]>([]);

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [sortBy, setSortBy] = useState('popularity.desc');

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Persistence ---
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

  // --- API Fetch Logic (Modified for large list) ---
  const fetchMovies = useCallback(async (pageNumber = 1, reset = false) => {
    setLoading(true);
    let url = "";

    if (query.trim()) {
      url = `${BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${pageNumber}`;
    } else {
      url = `${BASE_URL}/discover/movie?page=${pageNumber}&sort_by=${sortBy}&vote_count.gte=100`;
      if (language) url += `&with_original_language=${language}`;
    }

    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` },
      });
      const data = await res.json();
      let results = data.results || [];

      if (query.trim() && language) {
        results = results.filter((m: Movie) => m.original_language === language);
      }

      if (reset) setMovies(results);
      else setMovies(prev => [...prev, ...results]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [query, language, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchMovies(1, true);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, language, sortBy, fetchMovies]);

  useEffect(() => {
    if (page > 1) fetchMovies(page, false);
  }, [page, fetchMovies]);

  useEffect(() => {
    const fetchTrailer = async () => {
      if (!selectedMovie) return;
      const res = await fetch(`${BASE_URL}/movie/${selectedMovie.id}/videos`, {
        headers: { accept: 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` },
      });
      const data = await res.json();
      const trailer = data.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      setTrailerKey(trailer ? trailer.key : null);

      setRecentlyWatched(prev => {
        const filtered = prev.filter(m => m.id !== selectedMovie.id);
        return [selectedMovie, ...filtered].slice(0, 15);
      });
    };
    fetchTrailer();
  }, [selectedMovie]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl px-4 md:px-8 py-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-black text-red-600 uppercase tracking-tighter cursor-pointer" onClick={() => window.location.reload()}>Movieflix</h1>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Search catalog..."
                className="w-full bg-zinc-900 border border-zinc-800 py-2 pl-9 pr-4 rounded-full text-sm focus:outline-none focus:border-red-600 transition-all"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full text-xs outline-none cursor-pointer hover:bg-zinc-800 transition-colors"
              >
                {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
              </select>

              <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-full px-3">
                <SlidersHorizontal size={14} className="text-zinc-500 mr-2" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs outline-none cursor-pointer py-2 pr-2"
                >
                  {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value} className="bg-zinc-900">{opt.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* History Bar */}
      {recentlyWatched.length > 0 && (
        <div className="bg-red-600/5 py-3 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 pr-3 border-r border-white/10 shrink-0 text-zinc-500 uppercase tracking-tighter text-[10px] font-bold">
               <Clock size={12} /> History
               <button onClick={() => setRecentlyWatched([])} className="hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
            </div>
            {recentlyWatched.map((movie) => (
              <div 
                key={movie.id} 
                className="flex items-center gap-2 shrink-0 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-full cursor-pointer transition-all border border-white/5"
                onClick={() => setSelectedMovie(movie)}
              >
                <span className="text-[10px] font-bold text-zinc-400">{movie.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 mt-10">
        {/* Watch Later & Favorites as Small Toggles */}
        <div className="flex gap-4 mb-12 overflow-x-auto pb-2 scrollbar-hide">
           {watchLater.length > 0 && (
             <button onClick={() => setMovies(watchLater)} className="shrink-0 flex items-center gap-2 bg-zinc-900 border border-white/5 px-4 py-2 rounded-xl hover:border-yellow-500/50 transition-all">
                <Clock size={16} className="text-yellow-500"/>
                <span className="text-sm font-bold">Watch Later ({watchLater.length})</span>
             </button>
           )}
           {favorites.length > 0 && (
             <button onClick={() => setMovies(favorites)} className="shrink-0 flex items-center gap-2 bg-zinc-900 border border-white/5 px-4 py-2 rounded-xl hover:border-red-500/50 transition-all">
                <Heart size={16} className="text-red-500 fill-red-500"/>
                <span className="text-sm font-bold">My Favorites ({favorites.length})</span>
             </button>
           )}
        </div>

        {/* Main Grid Header */}
        <div className="flex justify-between items-end mb-8 border-l-4 border-red-600 pl-4">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">
              {query ? `Results for "${query}"` : "Discover Movies"}
            </h2>
            <p className="text-zinc-500 text-sm font-medium">Showing {movies.length} items</p>
          </div>
          {loading && <Loader2 className="animate-spin text-red-600 mb-2" size={24} />}
        </div>

        {/* Large Results Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {movies.map(movie => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onOpen={() => setSelectedMovie(movie)}
              isFav={!!favorites.find(f => f.id === movie.id)}
              isLater={!!watchLater.find(f => f.id === movie.id)}
              toggleFavorite={(m: Movie) => setFavorites(prev => prev.find(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : [...prev, m])}
              toggleWatchLater={(m: Movie) => setWatchLater(prev => prev.find(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : [...prev, m])}
            />
          ))}
        </div>

        {/* Load More Button */}
        <div className="flex flex-col items-center justify-center pt-20 gap-4">
          <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">End of current list</p>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="group flex items-center gap-3 px-12 py-4 bg-white text-black hover:bg-red-600 hover:text-white rounded-full font-black text-sm uppercase transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Plus size={18} />}
            Load More Movies
          </button>
        </div>
      </main>

      {/* Details Modal */}
      {selectedMovie && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111] max-w-5xl w-full rounded-3xl overflow-hidden relative max-h-[90vh] shadow-2xl border border-white/5">
            <button onClick={() => setSelectedMovie(null)} className="absolute top-6 right-6 z-10 bg-black/50 p-3 rounded-full hover:bg-red-600 transition-colors"><X size={24} /></button>
            <div className="overflow-y-auto max-h-[90vh] scrollbar-hide">
              <div className="relative h-[300px] md:h-[500px]">
                {selectedMovie.backdrop_path ? (
                  <img src={BACKDROP_PATH + selectedMovie.backdrop_path} className="w-full h-full object-cover" alt="" />
                ) : <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><ImageOff size={48} /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
              </div>
              
              <div className="p-8 md:p-12 -mt-20 relative">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                    <div>
                      <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none mb-2">{selectedMovie.title}</h2>
                      <div className="flex gap-3 text-xs font-bold text-zinc-500">
                        <span>{selectedMovie.release_date}</span>
                        <span className="text-red-600 uppercase tracking-widest">{selectedMovie.original_language}</span>
                      </div>
                    </div>
                    <div className="bg-red-600 px-6 py-2 rounded-full font-black text-xl">⭐ {selectedMovie.vote_average.toFixed(1)}</div>
                </div>

                <p className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-3xl">{selectedMovie.overview}</p>

                {trailerKey && (
                  <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black aspect-video">
                    <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${trailerKey}?autoplay=0`} allowFullScreen />
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

// --- Movie Card ---
const MovieCard = ({ movie, onOpen, isFav, isLater, toggleFavorite, toggleWatchLater }: any) => (
  <div className="group flex flex-col relative">
    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 shadow-lg">
      {movie.poster_path ? (
        <img
          src={IMAGE_PATH + movie.poster_path}
          className="w-full h-full object-cover cursor-pointer group-hover:scale-110 transition-transform duration-700"
          onClick={onOpen}
          alt={movie.title}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-800" onClick={onOpen}><ImageOff size={40} /></div>
      )}

      {/* Quick Action Overlay */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(movie); }} className={`p-2.5 rounded-full backdrop-blur-md transition-all ${isFav ? 'bg-red-600' : 'bg-black/60 hover:bg-red-600'}`}>
          <Heart size={16} className={isFav ? 'fill-white' : ''} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); toggleWatchLater(movie); }} className={`p-2.5 rounded-full backdrop-blur-md transition-all ${isLater ? 'bg-yellow-500' : 'bg-black/60 hover:bg-yellow-500'}`}>
          <Clock size={16} className={isLater ? 'fill-white' : ''} />
        </button>
      </div>
      
      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
         <button onClick={onOpen} className="w-full py-2 bg-white text-black text-[10px] font-black uppercase rounded-lg">View Details</button>
      </div>
    </div>

    <div className="mt-4">
      <h3 className="text-xs font-black uppercase truncate group-hover:text-red-600 transition-colors leading-tight">{movie.title}</h3>
      <div className="flex justify-between items-center mt-1">
          <span className="text-[10px] text-zinc-600 font-bold">{movie.release_date?.split('-')[0]}</span>
          <span className="text-[10px] text-zinc-400 font-black tracking-tighter italic">AVG {movie.vote_average.toFixed(1)}</span>
      </div>
    </div>
  </div>
);

export default App;