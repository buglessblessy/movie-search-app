import { useState, useEffect, useCallback } from 'react';
import { 
  Search, Heart, Clock, X, ImageOff, 
  SlidersHorizontal, Play, Star, Globe, Users, Calendar, RefreshCcw
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
  { code: 'ta', name: 'Tamil' },
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
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Persistence ---
  useEffect(() => {
    const fav = localStorage.getItem('mf-fav');
    const later = localStorage.getItem('mf-later');
    if (fav) setFavorites(JSON.parse(fav));
    if (later) setWatchLater(JSON.parse(later));
  }, []);

  useEffect(() => {
    localStorage.setItem('mf-fav', JSON.stringify(favorites));
    localStorage.setItem('mf-later', JSON.stringify(watchLater));
  }, [favorites, watchLater]);

  // --- Fast Fetching Logic ---
  const fetchMovies = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true);
    let url = query.trim() 
      ? `${BASE_URL}/search/movie?query=${encodeURIComponent(query.trim())}&page=${pageNum}`
      : `${BASE_URL}/discover/movie?page=${pageNum}&sort_by=${sortBy}&vote_count.gte=50&include_adult=false`;

    if (!query && language) url += `&with_original_language=${language}`;

    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` },
      });
      const data = await res.json();
      let results: Movie[] = data.results || [];

      // Strict language filter (Client side)
      if (language) {
        results = results.filter(m => m.original_language === language);
      }

      setMovies(prev => reset ? results : [...prev, ...results.filter(m => !prev.find(p => p.id === m.id))]);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [query, language, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchMovies(1, true); }, 400);
    return () => clearTimeout(timer);
  }, [query, language, sortBy, fetchMovies]);

  useEffect(() => {
    if (page > 1) fetchMovies(page, false);
  }, [page, fetchMovies]);

  // --- Trailer Modal Fetcher (Only when movie is clicked) ---
  useEffect(() => {
    if (!selectedMovie) { setTrailerKey(null); return; }
    fetch(`${BASE_URL}/movie/${selectedMovie.id}/videos`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    })
    .then(res => res.json())
    .then(data => {
      const v = data.results?.find((x: any) => x.site === 'YouTube' && x.type === 'Trailer') || 
                data.results?.find((x: any) => x.site === 'YouTube' && x.type === 'Teaser');
      setTrailerKey(v?.key || null);
    });
  }, [selectedMovie]);

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20 font-sans selection:bg-red-600">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-xl px-4 md:px-8 py-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-red-600 uppercase tracking-tighter cursor-pointer" onClick={() => window.location.reload()}>Movieflix</h1>
            <button onClick={() => { setQuery(''); setLanguage(''); }} className="p-2 text-zinc-500 hover:text-white transition-colors"><RefreshCcw size={18} /></button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input type="text" placeholder="Search movies..." className="w-full bg-zinc-900/50 border border-zinc-800 py-2 pl-9 pr-4 rounded-full text-sm focus:outline-none focus:border-red-600" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full text-xs font-bold outline-none cursor-pointer">
                {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full text-xs font-bold outline-none cursor-pointer">
                {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-10">
        {/* --- FAVORITES TOP SHELF --- */}
        {favorites.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                  <Heart size={18} className="text-red-600 fill-red-600" />
                  <h2 className="text-lg font-black uppercase tracking-widest">My List</h2>
               </div>
               <button onClick={() => setFavorites([])} className="text-[10px] font-bold text-zinc-600 hover:text-red-600 uppercase tracking-tighter">Clear All</button>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
              {favorites.map(movie => (
                <div key={movie.id} className="min-w-[160px] md:min-w-[200px]">
                  <MovieCard movie={movie} onOpen={() => setSelectedMovie(movie)} isFav={true} isLater={!!watchLater.find(f => f.id === movie.id)} toggleFavorite={(m) => setFavorites(prev => prev.filter(x => x.id !== m.id))} toggleWatchLater={(m) => setWatchLater(prev => prev.find(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : [...prev, m])} />
                </div>
              ))}
            </div>
            <hr className="border-white/5 mt-4" />
          </section>
        )}

        {/* Discovery Grid */}
        <div className="mb-10 border-l-4 border-red-600 pl-6">
          <h2 className="text-4xl font-black uppercase tracking-tighter">{query ? `Results: ${query}` : language ? `${LANGUAGES.find(l=>l.code===language)?.name} Cinema` : "Top Trending"}</h2>
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em]">{loading ? "Syncing..." : `${movies.length} Titles Available`}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
          {movies.map(movie => (
            <MovieCard key={movie.id} movie={movie} onOpen={() => setSelectedMovie(movie)} isFav={!!favorites.find(f => f.id === movie.id)} isLater={!!watchLater.find(f => f.id === movie.id)} toggleFavorite={(m) => setFavorites(prev => prev.find(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : [...prev, m])} toggleWatchLater={(m) => setWatchLater(prev => prev.find(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : [...prev, m])} />
          ))}
        </div>

        {!loading && movies.length > 0 && (
          <div className="flex justify-center pt-24">
            <button onClick={() => setPage(p => p + 1)} className="px-10 py-4 border border-white/10 hover:bg-white hover:text-black rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all">
              Load More
            </button>
          </div>
        )}
      </main>

      {/* --- CINEMATIC MODAL --- */}
      {selectedMovie && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-0 md:p-6 backdrop-blur-3xl">
          <div className="bg-[#0a0a0a] max-w-6xl w-full rounded-none md:rounded-[2.5rem] overflow-hidden relative max-h-screen md:max-h-[95vh] border border-white/5 flex flex-col shadow-2xl">
            <button onClick={() => setSelectedMovie(null)} className="absolute top-6 right-6 z-[120] bg-black/60 hover:bg-red-600 p-3 rounded-full transition-all border border-white/10"><X size={20} /></button>
            <div className="overflow-y-auto scrollbar-hide flex-1">
              <div className="relative aspect-video w-full bg-black">
                {trailerKey ? (
                  <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`} allowFullScreen frameBorder="0" className="relative z-50" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center flex-col relative">
                    {selectedMovie.backdrop_path && <img src={BACKDROP_PATH + selectedMovie.backdrop_path} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="" />}
                    <div className="z-10 text-center">
                       <Play size={48} className="mx-auto mb-4 text-zinc-800" />
                       <span className="text-zinc-500 font-black uppercase text-xs tracking-widest">Trailer not available</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-8 md:px-16 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                    <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-6">{selectedMovie.title}</h2>
                    <p className="text-zinc-400 text-lg leading-relaxed font-medium">{selectedMovie.overview}</p>
                </div>
                <div className="bg-zinc-900/30 rounded-[2rem] p-8 border border-white/5 space-y-6">
                   <SidebarItem label="Release" value={selectedMovie.release_date} Icon={Calendar} />
                   <SidebarItem label="Language" value={selectedMovie.original_language.toUpperCase()} Icon={Globe} />
                   <div className="flex items-center gap-2 pt-4 border-t border-white/5"><Star size={14} className="text-red-600 fill-red-600" /><span className="font-black text-2xl">{selectedMovie.vote_average.toFixed(1)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SidebarItem = ({ label, value, Icon }: any) => (
  <div>
    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">{label}</p>
    <div className="flex items-center gap-2 font-bold text-zinc-200 text-sm uppercase"><Icon size={14} /> {value}</div>
  </div>
);

const MovieCard = ({ movie, onOpen, isFav, isLater, toggleFavorite, toggleWatchLater }: any) => (
  <div className="group flex flex-col relative cursor-pointer">
    <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl transition-all duration-500 group-hover:scale-[1.02]" onClick={onOpen}>
      {movie.poster_path ? (
        <img src={IMAGE_PATH + movie.poster_path} className="w-full h-full object-cover" alt="" />
      ) : <div className="w-full h-full flex items-center justify-center"><ImageOff size={32} /></div>}
      <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(movie); }} className={`p-3 rounded-2xl backdrop-blur-xl border border-white/10 transition-all ${isFav ? 'bg-red-600 text-white' : 'bg-black/60 text-white hover:bg-red-600'}`}><Heart size={14} className={isFav ? 'fill-white' : ''} /></button>
        <button onClick={(e) => { e.stopPropagation(); toggleWatchLater(movie); }} className={`p-3 rounded-2xl backdrop-blur-xl border border-white/10 transition-all ${isLater ? 'bg-yellow-500 text-white' : 'bg-black/60 text-white hover:bg-yellow-500'}`}><Clock size={14} className={isLater ? 'fill-white' : ''} /></button>
      </div>
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-500">
         <div className="p-5 bg-white text-black rounded-full scale-50 group-hover:scale-100 transition-all"><Play size={20} fill="black" /></div>
      </div>
    </div>
    <div className="mt-4 px-2">
      <h3 className="text-xs font-black uppercase truncate group-hover:text-red-600 transition-colors tracking-tighter mb-1">{movie.title}</h3>
      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
          <span>{movie.release_date?.split('-')[0]}</span>
          <span className="text-red-600">★ {movie.vote_average.toFixed(1)}</span>
      </div>
    </div>
  </div>
);

export default App;