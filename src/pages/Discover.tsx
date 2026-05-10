import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Music2, Disc, User, Sparkles, Filter, ChevronRight, X, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Song, UserProfile } from '../types';
import SongCard from '../components/common/SongCard';
import Avatar from '../components/common/Avatar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAiRecommendations } from '../services/aiService';

const GENRES = ['Afropop', 'Hip Hop', 'Gospel', 'Amapiano', 'Reggae', 'R&B', 'Dancehall', 'Jazz', 'Electronic', 'Acoustic', 'Rock', 'Alternative', 'Soul', 'House'];

const Discover: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile } = useAuth();
  const initialQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [results, setResults] = useState<{ songs: Song[], artists: UserProfile[] }>({ songs: [], artists: [] });
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<Song[]>([]);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [activeTab, setActiveTab] = useState<'songs' | 'artists'>('songs');

  const [refreshing, setRefreshing] = useState(false);
  const startY = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - startY.current;
    if (deltaY > 80 && window.scrollY === 0) {
      setRefreshing(true);
      await Promise.all([fetchTrending(), fetchRecommendations(), handleSearch()]);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTrending();
    fetchRecommendations();
  }, [userProfile]);

  const fetchRecommendations = async () => {
    try {
      const { data: allSongs } = await supabase
        .from('songs')
        .select('*, profiles!artist_id(full_name, stage_name, avatar_url)')
        .eq('approved', true)
        .limit(100);
      
      if (allSongs) {
        const formatted = allSongs.map((s: any) => ({
          ...s,
          artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
          cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
          url: s.audio_url,
          profiles: s.profiles
        }));

        // Get user likes from localStorage for now as context
        let likedSongs: string[] = [];
        try {
          const likedIds = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
          likedSongs = formatted.filter(s => likedIds.includes(s.id)).map(s => s.title);
        } catch (e) {
          console.error('Error parsing likes:', e);
        }

        const recommendations = await getAiRecommendations(likedSongs, formatted as Song[]);
        setRecommendedSongs(recommendations);
      }
    } catch (err) {
      console.error('Recommendations error:', err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery || selectedGenre) {
        handleSearch();
      } else {
        setResults({ songs: [], artists: [] });
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedGenre]);

  const fetchTrending = async () => {
    const { data } = await supabase
      .from('songs')
      .select('*, profiles!artist_id(full_name, stage_name, avatar_url)')
      .eq('approved', true)
      .limit(6);
    if (data) {
        setTrending(data.map(s => ({
            ...s,
            artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
            cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
            url: s.audio_url,
            profiles: s.profiles
        })) as any);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      let songsQuery = supabase
        .from('songs')
        .select('*, profiles!artist_id(full_name, avatar_url)')
        .eq('approved', true);

      if (searchQuery) {
        songsQuery = songsQuery.ilike('title', `%${searchQuery}%`);
      }
      if (selectedGenre) {
        songsQuery = songsQuery.eq('genre', selectedGenre);
      }

      const { data: songsData } = await songsQuery.limit(20);

      let artistsQuery = supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'artist')
        .eq('approved', true);

      if (searchQuery) {
        artistsQuery = artistsQuery.ilike('stage_name', `%${searchQuery}%`);
      }
      if (selectedGenre) {
        artistsQuery = artistsQuery.eq('genre', selectedGenre);
      }

      const { data: artistsData } = await artistsQuery.limit(10);

      setResults({
        songs: (songsData || []).map(s => ({
            ...s,
            artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
            cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
            url: s.audio_url
        })) as any,
        artists: (artistsData || []).map(a => ({
          ...a,
          display_name: a.stage_name || a.full_name
        })) as any
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="space-y-12 pb-24"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {refreshing && (
        <div className="flex justify-center -mt-8 pt-8">
          <div className="w-6 h-6 border-2 border-smash-orange border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* Header & Search */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-smash-orange/20 to-transparent blur-3xl rounded-full" />
        <div className="relative pt-8 space-y-8">
          <h1 className="text-5xl md:text-7xl font-black font-display italic uppercase tracking-tighter leading-none translate-x-[-4px]">
             EXPLORE <br />
             <span className="text-smash-orange">THE SOUNDS</span>
          </h1>

          <div className="relative max-w-2xl group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-smash-gray group-focus-within:text-smash-orange transition-colors" size={24} />
            <input 
              type="text" 
              placeholder="Search songs, artists, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[32px] pl-16 pr-8 py-6 text-xl font-medium outline-none focus:border-smash-orange transition-all shadow-2xl backdrop-blur-md"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Genres Chips */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
         <button 
           onClick={() => setSelectedGenre(null)}
           className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${!selectedGenre ? 'bg-smash-orange text-white shadow-xl shadow-smash-orange/20' : 'bg-white/5 text-smash-gray hover:text-white'}`}
         >
           All
         </button>
         {GENRES.map(genre => (
           <button 
             key={genre}
             onClick={() => setSelectedGenre(genre === selectedGenre ? null : genre)}
             className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedGenre === genre ? 'bg-smash-orange text-white shadow-xl shadow-smash-orange/20' : 'bg-white/5 text-smash-gray hover:text-white'}`}
           >
             {genre}
           </button>
         ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
           <motion.div 
             key="loading"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-pulse mt-8"
           >
             {[1, 2, 3, 4, 5, 6].map(n => (
               <div key={n} className="flex flex-col gap-3">
                 <div className="w-full aspect-square bg-white/10 rounded-2xl"></div>
                 <div className="h-4 w-3/4 bg-white/10 rounded"></div>
                 <div className="h-3 w-1/2 bg-white/10 rounded"></div>
               </div>
             ))}
           </motion.div>
        ) : (searchQuery || selectedGenre) ? (
             <motion.div 
             key="results"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="space-y-8"
           >
             <div className="flex gap-4 border-b border-white/10 pb-2 mb-6">
                <button 
                  onClick={() => setActiveTab('songs')}
                  className={`text-sm font-black uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'songs' ? 'border-smash-orange text-white' : 'border-transparent text-smash-gray hover:text-white'}`}
                >
                  Songs
                </button>
                <button 
                  onClick={() => setActiveTab('artists')}
                  className={`text-sm font-black uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'artists' ? 'border-smash-orange text-white' : 'border-transparent text-smash-gray hover:text-white'}`}
                >
                  Artists
                </button>
             </div>

             {activeTab === 'songs' ? (
               <div className="space-y-8">
                 <div className="flex items-center justify-between">
                   <h2 className="text-3xl font-black font-display italic uppercase tracking-tighter">Tracks Found</h2>
                   <p className="text-xs font-black text-smash-gray uppercase tracking-widest">{results.songs.length} results</p>
                 </div>
                 {results.songs.length > 0 ? (
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {results.songs.map((song, i) => (
                        <SongCard key={`discover-song-${song.id}-${i}`} song={song} queue={results.songs} />
                      ))}
                   </div>
                 ) : (
                   <div className="p-12 bg-white/5 rounded-[32px] border border-white/10 text-center">
                      <Music2 size={48} className="mx-auto mb-4 text-smash-gray/30" />
                      <p className="text-smash-gray font-bold uppercase tracking-widest text-xs">No tracks match your search</p>
                   </div>
                 )}
               </div>
             ) : (
               <div className="space-y-8">
                 <div className="flex items-center justify-between">
                   <h2 className="text-3xl font-black font-display italic uppercase tracking-tighter">Artists Found</h2>
                   <p className="text-xs font-black text-smash-gray uppercase tracking-widest">{results.artists.length} results</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {results.artists.map((artist, i) => (
                     <motion.div 
                       key={`discover-artist-${artist.id}-${i}`}
                       whileHover={{ x: 10 }}
                       onClick={() => navigate(`/artist/${artist.id}`)}
                       className="p-4 bg-white/5 border border-white/10 rounded-[24px] flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors"
                     >
                       <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-smash-orange/20">
                          <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-full h-full" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <h4 className="font-display font-black italic uppercase text-lg truncate leading-none mb-1">{artist.stage_name || artist.full_name}</h4>
                          <p className="text-xs text-smash-gray font-bold uppercase tracking-widest">{artist.genre || 'Various'}</p>
                       </div>
                       <ChevronRight className="text-smash-gray" size={20} />
                     </motion.div>
                   ))}
                   {results.artists.length === 0 && (
                      <div className="col-span-full text-center text-smash-gray py-12 font-bold uppercase tracking-widest text-[10px]">No artists found</div>
                   )}
                 </div>
               </div>
             )}
           </motion.div>
        ) : (
           <motion.div 
             key="initial"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="space-y-16"
           >
              {/* Featured / Trending Section */}
             <div className="space-y-8">
                <div className="flex items-center gap-4">
                   <Sparkles className="text-smash-orange" size={32} />
                   <h2 className="text-4xl font-black font-display italic uppercase tracking-tighter leading-none">TRENDING SLAPS</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                   {trending.map((song, i) => (
                      <SongCard key={`discover-trending-${song.id}-${i}`} song={song} queue={trending} />
                   ))}
                </div>
             </div>

             {/* AI Recommendations Section */}
             {recommendedSongs.length > 0 && (
                <div className="space-y-8">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <Zap className="text-smash-orange" size={32} />
                         <h2 className="text-4xl font-black font-display italic uppercase tracking-tighter leading-none">FOR YOU <span className="text-smash-orange text-xs align-top bg-smash-orange/10 px-2 py-1 rounded-lg ml-2">AI POWERED</span></h2>
                      </div>
                      <button onClick={fetchRecommendations} className="text-[10px] font-black uppercase tracking-[0.2em] text-smash-gray hover:text-smash-orange transition-colors">Refresh Mix</button>
                   </div>

                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                      {recommendedSongs.map((song, i) => (
                         <div key={`discover-rec-${song.id}-${i}`} className="relative group">
                            <SongCard song={song} queue={recommendedSongs} />
                            <div className="absolute top-2 left-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                               <span className="bg-smash-black/80 backdrop-blur-md text-[8px] font-black uppercase px-2 py-1 rounded-md border border-white/10 text-smash-orange">Mixed for you</span>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             )}
               {/* Browse Categories */}
              <div className="space-y-8">
                 <h2 className="text-4xl font-black font-display italic uppercase tracking-tighter leading-none">CATEGORIES</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                       { name: 'Afropop', color: 'from-smash-orange to-red-500', icon: Music2 },
                       { name: 'Hip Hop', color: 'from-purple-600 to-blue-500', icon: Sparkles },
                       { name: 'Amapiano', color: 'from-green-500 to-teal-400', icon: Disc }
                    ].map((cat) => (
                       <div 
                         key={cat.name}
                         onClick={() => setSelectedGenre(cat.name)}
                         className={`relative h-48 rounded-[32px] overflow-hidden cursor-pointer group shadow-2xl`}
                       >
                          <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                          <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
                             <cat.icon size={48} className="text-white/20 group-hover:scale-110 transition-transform" />
                             <h3 className="text-3xl font-black font-display italic uppercase text-white drop-shadow-lg">{cat.name}</h3>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Discover;
