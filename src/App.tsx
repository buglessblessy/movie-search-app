import { useState, useEffect, useCallback } from 'react';
import { Search, Heart, Star, X, Calendar, Globe, Plus } from 'lucide-react';

// --- Types ---
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
  { code: '', name: 'All' },
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ja', name: 'Japanese' },
];

const App = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Initial Load & Persistence
  useEffect(() => {
    const saved = localStorage.getItem('movieflix-favs');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('movieflix-favs', JSON.stringify(favorites));
  }, [favorites]);

  // 2. Fetch Logic (Handles Appending for "Load More")
  const fetchMovies = useCallback(async (isNewSearch: boolean = false) => {
    setLoading(true);
    const currentPage = isNewSearch ? 1 : page;
    
    let url = `${BASE_URL}/discover/movie?page=${currentPage}&sort_by=popularity.desc`;
    
    if (query) {
      url = `${BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${currentPage}`;
    } else if (language) {
      url += `&with_original_language=${language}`;
    }

    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` }
      });
      const data = await res.json();
      
      if (isNewSearch) {
        setMovies(data.results || []);
      } else {
        setMovies(prev => [...prev, ...(data.results || [])]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, language, page]);

  // 3. Trigger fetch on filter change
  useEffect(() => {
    setPage(1);
    fetchMovies(true);
  }, [query, language]);

  // 4. Trigger fetch on page change (Load More)
  useEffect(() => {
    if (page > 1) fetchMovies(false);
  }, [page]);

  const toggleFavorite = (movie: Movie) => {
    const isFav = favorites.find((f) => f.id === movie.id);
    if (isFav) setFavorites(favorites.filter((f) => f.id !== movie.id));
    else setFavorites([...favorites, movie]);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-20 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[#141414]/95 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5">
        <h1 className="text-3xl font-black text-red-600 tracking-tighter uppercase cursor-pointer" onClick={() => {setQuery(''); setLanguage('');}}>
          Movieflix
        </h1>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search movies..."
            className="w-full bg-zinc-900 border border-zinc-700 py-2.5 pl-12 pr-4 rounded-md focus:outline-none focus:ring-1 focus:ring-red-600 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </nav>

      {/* Language Filter Row */}
      <div className="px-6 mt-6 flex gap-3 overflow-x-auto scrollbar-hide py-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
              language === lang.code ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>

      <main className="px-6 mt-8">
        {/* Watchlist Section */}
        {favorites.length > 0 && !query && (
          <div className="mb-12">
            <h3 className="text-xs font-bold text-zinc-500 mb-4 uppercase tracking-[0.2em]">My Watchlist</h3>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
              {favorites.map((m) => (
                <MovieCard key={m.id} movie={m} isFav={true} onToggle={toggleFavorite} onOpen={() => setSelectedMovie(m)} size="small" />
              ))}
            </div>
          </div>
        )}

        {/* Results Grid */}
        <h3 className="text-xl font-bold mb-6 text-zinc-100 uppercase tracking-tight">
          {query ? `Results for "${query}"` : `${LANGUAGES.find(l => l.code === language)?.name} Movies`}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-10">
          {movies.map((m) => (
            <MovieCard 
              key={m.id} 
              movie={m} 
              isFav={!!favorites.find(f => f.id === m.id)} 
              onToggle={toggleFavorite} 
              onOpen={() => setSelectedMovie(m)} 
            />
          ))}
        </div>

        {/* Load More Button */}
        <div className="mt-16 flex justify-center">
          <button 
            onClick={() => setPage(prev => prev + 1)}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-md font-bold transition-all disabled:opacity-50"
          >
            {loading ? 'Loading...' : <><Plus size={20} /> Load More Movies</>}
          </button>
        </div>
      </main>

      {/* Movie Details Modal (Same as before) */}
      {selectedMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl bg-[#181818] rounded-xl overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]">
            <button onClick={() => setSelectedMovie(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full hover:bg-black transition-colors"><X size={20} /></button>
            <div className="relative h-64 md:h-96">
              <img src={selectedMovie.backdrop_path ? BACKDROP_PATH + selectedMovie.backdrop_path : IMAGE_PATH + selectedMovie.poster_path} className="w-full h-full object-cover" alt="Backdrop" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent" />
            </div>
            <div className="p-8">
              <div className="flex items-center gap-4 mb-4 text-sm text-zinc-400">
                <span className="text-green-400 font-bold flex items-center gap-1"><Star size={16} className="fill-current" /> {selectedMovie.vote_average.toFixed(1)}</span>
                <span className="flex items-center gap-1"><Calendar size={16} /> {selectedMovie.release_date}</span>
                <span className="flex items-center gap-1 uppercase"><Globe size={16} /> {selectedMovie.original_language}</span>
              </div>
              <h2 className="text-4xl font-black mb-4 uppercase">{selectedMovie.title}</h2>
              <p className="text-zinc-400 leading-relaxed mb-8">{selectedMovie.overview}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// MovieCard Component
const MovieCard = ({ movie, isFav, onToggle, onOpen, size = "large" }: any) => (
  <div onClick={onOpen} className={`group relative cursor-pointer ${size === 'small' ? 'min-w-[160px] w-[160px]' : 'w-full'}`}>
    <div className="relative overflow-hidden rounded-md aspect-[2/3] transition-all duration-300 group-hover:scale-105 shadow-lg">
      <img src={movie.poster_path ? IMAGE_PATH + movie.poster_path : "https://via.placeholder.com/500x750?text=No+Poster"} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
        <button onClick={(e) => { e.stopPropagation(); onToggle(movie); }} className="absolute top-2 right-2 p-2 rounded-full bg-black/40 hover:bg-black/80">
          <Heart size={16} className={isFav ? 'fill-red-600 text-red-600' : 'text-white'} />
        </button>
        <p className="text-[10px] font-black text-white mb-2 uppercase line-clamp-1">{movie.title}</p>
      </div>
    </div>
    <div className="mt-2"><h4 className="text-[11px] font-bold truncate text-zinc-500 group-hover:text-white uppercase tracking-tight">{movie.title}</h4></div>
  </div>
);

export default App;