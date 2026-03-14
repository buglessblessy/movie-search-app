import { useState, useEffect, useCallback } from 'react';
import { 
  Search, Heart, Clock, X, Plus, Loader2, ImageOff, 
  Trash2, SlidersHorizontal, Play, Star, Globe, Users, Calendar, RefreshCcw
} from 'lucide-react';

// --- Interfaces & Constants ---
interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
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
  // --- Main States ---
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

  // --- Persistence Logic ---
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

  // --- Fetching Logic (Strict Filter for Language) ---
  const fetchMovies = useCallback(async (pageNumber = 1, reset = false) => {
    setLoading(true);
    let url = "";

    if (query.trim()) {
      url = `${BASE_URL}/search/movie?query=${encodeURIComponent(query.trim())}&page=${pageNumber}`;
    } else {
      url = `${BASE_URL}/discover/movie?page=${pageNumber}&sort_by=${sortBy}&vote_count.gte=20`;
      if (language) url += `&with_original_language=${language}`;
    }

    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` },
      });
      const data = await res.json();
      let results = data.results || [];

      // Local Filter: Ensuring no language mix-ups
      if (language) {
        results = results.filter((m: Movie) => m.original_language === language);
      }

      if (reset) {
        setMovies(results);
      } else {
        setMovies(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          return [...prev, ...results.filter((m: Movie) => !existingIds.has(m.id))];
        });
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [query, language, sortBy]);

  // Debounced Search/Filter effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchMovies(1, true); 
    }, 400);
    return () => clearTimeout(timer);
  }, [query, language, sortBy, fetchMovies]);

  // Load More logic
  useEffect(() => {
    if (page > 1) fetchMovies(page, false);
  }, [page, fetchMovies]);

  // Trailer Loader
  useEffect(() => {
    const fetchTrailer = async () => {
      if (!selectedMovie) { setTrailerKey(null); return; }
      try {
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
      } catch (e) { console.error(e); }
    };
    fetchTrailer();
  }, [selectedMovie]);

  return (
    <div className="min-h-screen bg-[#070707] text-white pb-20 font-sans selection:bg-red-600">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-[#070707]/90 backdrop-blur-xl px-4 md:px-8 py-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-red-600 uppercase tracking-tighter cursor-pointer" onClick={() => window.location.reload()}>Movieflix</h1>
            <button 
              onClick={() => { setQuery(''); setLanguage(''); setSortBy('popularity.desc'); }}
              className="p-2 hover:bg-white/10 rounded-full transition-all text-zinc-500 hover:text-white"
              title="Reset All"
            >
              <RefreshCcw size={18} />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Search catalog..."
                className="w-full bg-zinc-900/50 border border-zinc-800 py-2 pl-9 pr-4 rounded-full text-sm focus:outline-none focus:border-red-600 text-white"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full text-xs outline-none cursor-pointer"
              >
                {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
              </select>

              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-full px-3">
                <SlidersHorizontal size={14} className="text-zinc-500 mr-2" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs outline-none cursor-pointer py-2 pr-2"
                >
                  {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-10">
        {/* User Collections */}
        {(favorites.length > 0 || watchLater.length > 0) && (
          <div className="flex gap-4 mb-10 overflow-x-auto pb-4 scrollbar-hide">
            {favorites.length > 0 && (
              <button onClick={() => setMovies(favorites)} className="flex items-center gap-2 bg-red-600/10 border border-red-600/20 px-5 py-2 rounded-2xl shrink-0">
                <Heart size={14} className="fill-red-600 text-red-600" />
                <span className="text-xs font-black uppercase tracking-widest">Favorites ({favorites.length})</span>
              </button>
            )}
            {watchLater.length > 0 && (
              <button onClick={() => setMovies(watchLater)} className="flex items-center gap-2 bg-yellow-600/10 border border-yellow-600/20 px-5 py-2 rounded-2xl shrink-0">
                <Clock size={14} className="text-yellow-600" />
                <span className="text-xs font-black uppercase tracking-widest">Watch Later ({watchLater.length})</span>
              </button>
            )}
          </div>
        )}

        <div className="mb-12 border-l-4 border-red-600 pl-6">
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-1">
            {query ? `Searching: ${query}` : language ? `${LANGUAGES.find(l=>l.code===language)?.name} Movies` : "Latest Releases"}
          </h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest opacity-60">
            {loading ? "Updating Catalog..." : `${movies.length} Results Found`}
          </p>
        </div>

        {/* Movie Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
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

        {!loading && movies.length > 0 && (
          <div className="flex justify-center pt-24">
            <button 
              onClick={() => setPage(p => p + 1)} 
              className="px-12 py-4 bg-white text-black hover:bg-red-600 hover:text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl"
            >
              Load More Content
            </button>
          </div>
        )}
      </main>

      {/* Cinematic Modal */}
      {selectedMovie && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-0 md:p-6 backdrop-blur-2xl">
          <div className="bg-[#0f0f0f] max-w-6xl w-full rounded-none md:rounded-[2rem] overflow-hidden relative max-h-screen md:max-h-[95vh] border border-white/5 flex flex-col shadow-2xl">
            
            {/* Close Button */}
            <button onClick={() => setSelectedMovie(null)} className="absolute top-6 right-6 z-[120] bg-black/60 hover:bg-red-600 p-3 rounded-full transition-all group backdrop-blur-md border border-white/10">
              <X size={20} className="group-hover:rotate-90 transition-transform" />
            </button>

            <div className="overflow-y-auto scrollbar-hide flex-1">
              {/* Video Area - NO OBSTRUCTIONS */}
              <div className="relative aspect-video w-full bg-black">
                {trailerKey ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&controls=1&rel=0&modestbranding=0&showinfo=1`} 
                    allowFullScreen 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    className="relative z-50 pointer-events-auto" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center flex-col relative">
                    {selectedMovie.backdrop_path && <img src={BACKDROP_PATH + selectedMovie.backdrop_path} className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" alt="" />}
                    <Play size={48} className="mb-4 text-zinc-800" />
                    <span className="text-zinc-600 font-black uppercase text-[10px] tracking-widest">Trailer Unavailable</span>
                  </div>
                )}
              </div>
              
              {/* Content Area */}
              <div className="px-8 md:px-16 pb-16 pt-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none text-white">{selectedMovie.title}</h2>
                    <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-medium">{selectedMovie.overview}</p>
                    <div className="flex flex-wrap gap-4 pt-4">
                        <button className="px-8 py-3 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-all">Start Watching</button>
                        <div className="flex items-center gap-2 px-6 py-3 bg-zinc-900 rounded-full border border-white/10">
                          <Star size={14} fill="#dc2626" className="text-red-600" />
                          <span className="font-black text-lg">{selectedMovie.vote_average.toFixed(1)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900/50 rounded-3xl p-8 border border-white/5 space-y-6 self-start">
                   <SidebarItem label="Release Date" value={selectedMovie.release_date} Icon={Calendar} />
                   <SidebarItem label="Original Language" value={selectedMovie.original_language.toUpperCase()} Icon={Globe} />
                   <SidebarItem label="Global Popularity" value={Math.floor(selectedMovie.popularity).toLocaleString()} Icon={Users} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helpers ---
const SidebarItem = ({ label, value, Icon }: any) => (
  <div className="space-y-1">
    <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">{label}</p>
    <div className="flex items-center gap-2 font-bold text-zinc-200 text-xs uppercase tracking-tight"><Icon size={12} /> {value}</div>
  </div>
);

const MovieCard = ({ movie, onOpen, isFav, isLater, toggleFavorite, toggleWatchLater }: any) => (
  <div className="group flex flex-col relative">
    <div className="relative aspect-[2/3] rounded-[1.5rem] overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl cursor-pointer" onClick={onOpen}>
      {movie.poster_path ? (
        <img src={IMAGE_PATH + movie.poster_path} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" alt={movie.title} />
      ) : <div className="w-full h-full flex items-center justify-center text-zinc-800"><ImageOff size={32} /></div>}

      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(movie); }} className={`p-3 rounded-xl backdrop-blur-xl border border-white/10 transition-all ${isFav ? 'bg-red-600 text-white' : 'bg-black/60 text-white hover:bg-red-600'}`}><Heart size={14} className={isFav ? 'fill-white' : ''} /></button>
        <button onClick={(e) => { e.stopPropagation(); toggleWatchLater(movie); }} className={`p-3 rounded-xl backdrop-blur-xl border border-white/10 transition-all ${isLater ? 'bg-yellow-500 text-white' : 'bg-black/60 text-white hover:bg-yellow-500'}`}><Clock size={14} className={isLater ? 'fill-white' : ''} /></button>
      </div>

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
         <div className="p-4 bg-white text-black rounded-full scale-50 group-hover:scale-100 transition-transform duration-500"><Play size={20} fill="black" /></div>
      </div>
    </div>
    <div className="mt-4 px-2">
      <h3 className="text-xs font-black uppercase truncate group-hover:text-red-600 transition-colors tracking-tighter mb-1">{movie.title}</h3>
      <div className="flex justify-between items-center text-[9px] font-black tracking-[0.1em] uppercase opacity-40 group-hover:opacity-100 transition-opacity">
          <span>{movie.release_date?.split('-')[0] || 'TBA'}</span>
          <span className="text-red-600">★ {movie.vote_average.toFixed(1)}</span>
      </div>
    </div>
  </div>
);

export default App;