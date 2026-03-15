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
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [sortBy, setSortBy] = useState('popularity.desc');
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

  // --- Fast Fetching ---
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

      if (language) {
        results = results.filter((m: Movie) => m.original_language === language);
      }

      setMovies(prev => reset ? results : [...prev, ...results.filter((m: Movie) => !prev.find((p: Movie) => p.id === m.id))]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [query, language, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchMovies(1, true); }, 400);
    return () => clearTimeout(timer);
  }, [query, language, sortBy, fetchMovies]);

  useEffect(() => { if (page > 1) fetchMovies(page, false); }, [page, fetchMovies]);

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
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600">
      <nav className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-red-600 uppercase tracking-tighter cursor-pointer" onClick={() => window.location.reload()}>Movieflix</h1>
            <button onClick={() => {setQuery(''); setLanguage('');}} className="text-zinc-500 hover:text-white transition-colors"><RefreshCcw size={18} /></button>
          </div>

          <div className="flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
            <input 
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search catalog..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="flex gap-2">
            <select value={language} onChange={e => setLanguage(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-xs font-bold cursor-pointer">
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            <div className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2">
                <SlidersHorizontal size={14} className="text-zinc-500 mr-2" />
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-transparent text-xs font-bold cursor-pointer outline-none">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {favorites.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Heart size={18} className="text-red-600 fill-red-600" />
                <h2 className="text-lg font-black uppercase tracking-widest">My List</h2>
              </div>
              <button onClick={() => setFavorites([])} className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold">Clear All</button>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
              {favorites.map((m: Movie) => (
                <div key={m.id} className="min-w-[150px] md:min-w-[200px]">
                  <MovieCard 
                    movie={m} isFav={true} onOpen={() => setSelectedMovie(m)}
                    isLater={!!watchLater.find((x: Movie) => x.id === m.id)}
                    toggleFavorite={() => setFavorites(p => p.filter((x: Movie) => x.id !== m.id))}
                    toggleWatchLater={() => setWatchLater(p => p.find((x: Movie) => x.id === m.id) ? p.filter((x: Movie) => x.id !== m.id) : [...p, m])}
                  />
                </div>
              ))}
            </div>
            <hr className="border-white/5 mt-4" />
          </section>
        )}

        <div className="mb-10 border-l-4 border-red-600 pl-6">
          <h2 className="text-4xl font-black uppercase tracking-tighter">
            {query ? `Searching: ${query}` : language ? `${LANGUAGES.find(l=>l.code===language)?.name} Cinema` : "Top Trending"}
          </h2>
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">{loading ? "Updating..." : `${movies.length} Results`}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
          {movies.map((m: Movie) => (
            <MovieCard 
              key={m.id} movie={m} onOpen={() => setSelectedMovie(m)}
              isFav={!!favorites.find((x: Movie) => x.id === m.id)}
              isLater={!!watchLater.find((x: Movie) => x.id === m.id)}
              toggleFavorite={() => setFavorites(p => p.find((x: Movie) => x.id === m.id) ? p.filter((x: Movie) => x.id !== m.id) : [...p, m])}
              toggleWatchLater={() => setWatchLater(p => p.find((x: Movie) => x.id === m.id) ? p.filter((x: Movie) => x.id !== m.id) : [...p, m])}
            />
          ))}
        </div>

        <div className="flex justify-center pt-24 pb-12">
          <button onClick={() => setPage(p => p + 1)} className="px-10 py-4 border border-white/10 rounded-full font-black text-[10px] uppercase hover:bg-white hover:text-black transition-all">Load More</button>
        </div>
      </main>

      {selectedMovie && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-0 md:p-6 backdrop-blur-3xl">
          <div className="bg-[#0a0a0a] max-w-6xl w-full rounded-none md:rounded-[2.5rem] overflow-hidden relative max-h-screen md:max-h-[95vh] border border-white/5 flex flex-col shadow-2xl">
            <button onClick={() => setSelectedMovie(null)} className="absolute top-6 right-6 z-[120] bg-black/60 hover:bg-red-600 p-3 rounded-full transition-all border border-white/10"><X size={20} /></button>
            <div className="overflow-y-auto scrollbar-hide flex-1">
              <div className="relative aspect-video w-full bg-black">
                {trailerKey ? (
                  <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`} allowFullScreen frameBorder="0" title="Movie Trailer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center flex-col relative text-zinc-600">
                    {selectedMovie.backdrop_path && <img src={BACKDROP_PATH + selectedMovie.backdrop_path} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />}
                    <Play size={40} className="mb-4" />
                    <span className="font-black uppercase text-xs tracking-widest">Trailer not available</span>
                  </div>
                )}
              </div>
              <div className="px-8 md:px-16 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                    <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-6 leading-none">{selectedMovie.title}</h2>
                    <p className="text-zinc-400 text-lg leading-relaxed">{selectedMovie.overview}</p>
                </div>
                <div className="bg-zinc-900/30 rounded-[2rem] p-8 border border-white/5 space-y-6 self-start">
                   <SidebarItem label="Release" value={selectedMovie.release_date} Icon={Calendar} />
                   <SidebarItem label="Language" value={selectedMovie.original_language.toUpperCase()} Icon={Globe} />
                   <SidebarItem label="Popularity" value={Math.floor(selectedMovie.popularity).toLocaleString()} Icon={Users} />
                   <div className="flex items-center gap-2 pt-4 border-t border-white/5"><Star size={16} className="text-red-600 fill-red-600" /><span className="font-black text-2xl">{selectedMovie.vote_average.toFixed(1)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SidebarItem = ({ label, value, Icon }: { label: string, value: string, Icon: any }) => (
  <div>
    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">{label}</p>
    <div className="flex items-center gap-2 font-bold text-zinc-200 text-sm"><Icon size={14} /> {value}</div>
  </div>
);

const MovieCard = ({ movie, onOpen, isFav, isLater, toggleFavorite, toggleWatchLater }: any) => (
  <div className="group flex flex-col relative cursor-pointer">
    <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl transition-all duration-500 group-hover:scale-[1.03]" onClick={onOpen}>
      {movie.poster_path ? (
        <img src={IMAGE_PATH + movie.poster_path} className="w-full h-full object-cover" alt={movie.title} />
      ) : <div className="w-full h-full flex items-center justify-center text-zinc-800"><ImageOff size={32} /></div>}
      <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(); }} className={`p-3 rounded-2xl backdrop-blur-xl border border-white/10 transition-all ${isFav ? 'bg-red-600 text-white' : 'bg-black/60 text-white hover:bg-red-600'}`}><Heart size={14} className={isFav ? 'fill-white' : ''} /></button>
        <button onClick={(e) => { e.stopPropagation(); toggleWatchLater(); }} className={`p-3 rounded-2xl backdrop-blur-xl border border-white/10 transition-all ${isLater ? 'bg-yellow-500 text-white' : 'bg-black/60 text-white hover:bg-yellow-500'}`}><Clock size={14} className={isLater ? 'fill-white' : ''} /></button>
      </div>
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
         <div className="p-4 bg-white text-black rounded-full scale-50 group-hover:scale-100 transition-all"><Play size={20} fill="black" /></div>
      </div>
    </div>
    <div className="mt-4 px-2">
      <h3 className="text-xs font-black uppercase truncate group-hover:text-red-600 transition-colors tracking-tighter mb-1">{movie.title}</h3>
      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-600 tracking-widest uppercase">
          <span>{movie.release_date?.split('-')[0]}</span>
          <span className="text-red-600">★ {movie.vote_average.toFixed(1)}</span>
      </div>
    </div>
  </div>
);

export default App;