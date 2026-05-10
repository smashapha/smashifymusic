import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Flame, Music, Disc, User, ChevronRight, TrendingUp, Sparkles, DollarSign, Clock, Crown, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Song, Artist } from '../types';
import SongCard from '../components/common/SongCard';
import Avatar from '../components/common/Avatar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAiRecommendations } from '../services/aiService';

const Home: React.FC = () => {
  const { userProfile } = useAuth();
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [newReleases, setNewReleases] = useState<Song[]>([]);
  const [forSaleSongs, setForSaleSongs] = useState<Song[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [aiPicks, setAiPicks] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ songs: Song[], artists: Artist[] }>({ songs: [], artists: [] });
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const [refreshing, setRefreshing] = useState(false);
  const startY = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - startY.current;
    if (deltaY > 80 && window.scrollY === 0) {
      setRefreshing(true);
      await fetchData();
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 1) {
        performSearch();
      } else {
        setIsSearching(false);
        setSearchResults({ songs: [], artists: [] });
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const { data: songsData } = await supabase
        .from('songs')
        .select('*, profiles:artist_id(*)')
        .ilike('title', `%${searchQuery}%`)
        .eq('approved', true)
        .limit(5);

      const { data: artistsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'artist')
        .eq('approved', true)
        .ilike('stage_name', `%${searchQuery}%`)
        .limit(5);

      setSearchResults({
        songs: (songsData || []).map(s => ({
          ...s,
          artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Unknown Artist',
          cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
          audio_url: s.audio_url
        })),
        artists: (artistsData || []).map(a => ({
          ...a,
          name: a.stage_name || a.full_name
        })) as any
      });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchData = async () => {
    try {
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select(`
          *,
          profiles:artist_id (
            full_name,
            stage_name,
            avatar_url,
            verified
          )
        `)
        .eq('approved', true);

      if (songsError) throw songsError;

      const formattedSongs = (songsData || []).map((s: any) => ({
        ...s,
        artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Unknown Artist',
        cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
        url: s.audio_url
      }));

      setTrendingSongs(formattedSongs.sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 10));
      setNewReleases(formattedSongs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10));
      setForSaleSongs(formattedSongs.filter(s => s.is_for_sale).slice(0, 10));

      const { data: artistsData, error: artistsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'artist')
        .eq('approved', true)
        .not('stage_name', 'is', null)
        .limit(10);

      if (!artistsError) {
        setTopArtists(artistsData as any);
      }

      if (userProfile) {
        const { data: recentData } = await supabase
          .from('recently_played')
          .select(`
            song_id,
            songs:song_id (
              *,
              profiles:artist_id (
                full_name,
                stage_name,
                avatar_url,
                verified
              )
            )
          `)
          .eq('profile_id', userProfile.id)
          .order('played_at', { ascending: false })
          .limit(10);

        if (recentData && recentData.length > 0) {
          const formattedRecent = recentData
            .filter((r: any) => r.songs)
            .map((r: any) => {
              const s = r.songs;
              return {
                ...s,
                artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Unknown Artist',
                cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
                url: s.audio_url
              };
            });
          setRecentSongs(formattedRecent);
        }

        // AI Picks based on likes
        try {
          const { data: likedData } = await supabase
            .from('likes')
            .select('songs (title, genre)')
            .eq('profile_id', userProfile.id)
            .limit(20);
            
          if (likedData && likedData.length > 0) {
            const likedStrings = likedData.filter((l: any) => l.songs).map((l: any) => `${l.songs.title} (${l.songs.genre})`);
            const aiRecs = await getAiRecommendations(likedStrings, formattedSongs);
            setAiPicks(aiRecs);
          }
        } catch(err) {
          console.error("Failed to load AI Picks", err);
        }
      }
    } catch (err) {
      console.error('Error fetching home data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
     return (
        <div className="pb-32 px-4 md:px-12 pt-8 animate-pulse">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
              <div className="h-16 w-64 bg-white/10 rounded-2xl"></div>
              <div className="w-full md:w-96 h-14 bg-white/10 rounded-2xl"></div>
           </div>
           <div className="h-[400px] md:h-[500px] w-full bg-white/10 rounded-[40px] md:rounded-[60px] mb-16"></div>
           <div className="space-y-4 mb-20">
              <div className="h-10 w-48 bg-white/10 rounded-xl mb-8"></div>
              <div className="flex gap-6 overflow-hidden">
                 <div className="min-w-[280px] h-32 bg-white/10 rounded-3xl"></div>
                 <div className="min-w-[280px] h-32 bg-white/10 rounded-3xl"></div>
                 <div className="min-w-[280px] h-32 bg-white/10 rounded-3xl"></div>
                 <div className="min-w-[280px] h-32 bg-white/10 rounded-3xl"></div>
              </div>
           </div>
        </div>
     );
  }

  const featured = trendingSongs[0];

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div 
      className="pb-32 px-4 md:px-12 pt-8"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {refreshing && (
        <div className="flex justify-center -mt-4 mb-4">
          <div className="w-6 h-6 border-2 border-smash-orange border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* Welcome Message & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
        {userProfile ? (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-5xl font-black font-display italic tracking-tight leading-tight">
              {getGreeting()}, <br/>
              <span className="text-smash-orange">{userProfile.full_name?.split(' ')[0] || 'Listener'}</span>! 🎵
            </h1>
          </motion.div>
        ) : (
          <div>
            <h1 className="text-3xl md:text-5xl font-black font-display italic tracking-tight uppercase">Smashify <span className="text-smash-purple">MW</span></h1>
            <p className="text-smash-gray font-bold">The heartbeat of Malawian music.</p>
          </div>
        )}

        <div className="relative w-full md:w-96 group">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-smash-gray group-focus-within:text-smash-orange transition-colors" />
          <input 
            type="text" 
            placeholder="Search artists or tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
               if (e.key === 'Enter' && searchQuery.trim().length > 0) {
                 navigate(`/discover?q=${encodeURIComponent(searchQuery)}`);
               }
            }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:outline-none focus:border-smash-orange transition-all shadow-2xl"
          />
          <AnimatePresence>
            {searchQuery.trim().length > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-smash-dark border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
              >
                <div className="p-4 space-y-4">
                  {isSearching ? (
                    <div className="py-8 flex justify-center">
                      <div className="w-6 h-6 border-2 border-smash-orange border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (searchResults.songs.length === 0 && searchResults.artists.length === 0) ? (
                    <p className="text-xs text-smash-gray font-bold text-center py-4 uppercase tracking-widest">No results found</p>
                  ) : (
                    <>
                      {searchResults.artists.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-2">Artists</p>
                          {searchResults.artists.map((artist, i) => (
                            <div 
                              key={`search-artist-${artist.id}-${i}`}
                              onClick={() => { navigate(`/artist/${artist.id}`); setSearchQuery(''); }}
                              className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                            >
                              <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-10 h-10 rounded-full" />
                              <div>
                                <p className="text-sm font-bold truncate leading-tight">{(artist as any).name}</p>
                                <p className="text-[10px] text-smash-gray font-bold uppercase tracking-widest">{artist.genre || 'Artist'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResults.songs.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-2">Tracks</p>
                          {searchResults.songs.map((song, i) => (
                            <div 
                              key={`search-song-${song.id}-${i}`}
                              onClick={() => { /* Play song? */ }}
                              className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                            >
                              <img src={song.cover_url} className="w-10 h-10 rounded-lg object-cover" />
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate leading-tight uppercase italic">{song.title}</p>
                                <p className="text-[10px] text-smash-gray font-bold uppercase tracking-widest">{song.artist_name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button 
                        onClick={() => navigate(`/discover?q=${encodeURIComponent(searchQuery)}`)}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-center rounded-xl transition-colors"
                      >
                        View all results
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Featured Banner */}
      {featured && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-[400px] md:h-[500px] rounded-[40px] md:rounded-[60px] overflow-hidden mb-16 group cursor-pointer"
          onClick={() => navigate(`/artist/${featured.artist_id}`)}
        >
           <img 
             src={featured.cover_url} 
             className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[10s]" 
             alt="" 
             referrerPolicy="no-referrer"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-smash-black via-smash-black/20 to-transparent" />
           <div className="absolute inset-0 bg-gradient-to-r from-smash-black/60 to-transparent" />
           
           <div className="absolute bottom-12 left-8 md:left-16 right-8 max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                 <div className="px-4 py-1.5 bg-smash-orange text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-xl">TRENDING NOW</div>
                 <div className="flex items-center gap-2 text-sm text-white/80 font-bold">
                    <Sparkles size={14} className="text-smash-cyan" /> {(featured.plays || 0).toLocaleString()} STREAMS
                 </div>
              </div>
              <h1 className="text-5xl md:text-8xl font-black font-display italic uppercase tracking-tighter leading-none mb-6">
                 {featured.title}
              </h1>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                    <Avatar src={featured.profiles?.avatar_url} name={featured.profiles?.stage_name || featured.profiles?.full_name} className="w-full h-full" />
                 </div>
                 <p className="text-2xl font-black font-display italic uppercase tracking-tight">{featured.artist_name}</p>
                 {featured.profiles?.verified && <div className="w-6 h-6 bg-smash-cyan rounded-full flex items-center justify-center"><Check size={14} className="text-black" /></div>}
              </div>
           </div>
        </motion.section>
      )}

      {/* Sections */}
      {recentSongs.length > 0 && (
        <HomeSection title="Recently Played" icon={<Clock className="text-smash-cyan" />} subtitle="Jump back into your recent jams.">
           <div className="flex overflow-x-auto gap-6 pb-8 snap-x no-scrollbar">
              {recentSongs.map((song, i) => (
                <SongCard key={`recent-${song.id}-${i}`} song={song} queue={recentSongs} className="min-w-[280px] md:min-w-[320px] snap-start" />
              ))}
           </div>
        </HomeSection>
      )}

      {aiPicks.length > 0 && (
        <HomeSection title="AI Picks For You" icon={<Sparkles className="text-smash-purple" />} subtitle="Powered by Gemini: tracks you'll love based on your likes.">
           <div className="flex overflow-x-auto gap-6 pb-8 snap-x no-scrollbar">
              {aiPicks.map((song, i) => (
                <SongCard key={`aipicks-${song.id}-${i}`} song={song} queue={aiPicks} className="min-w-[280px] md:min-w-[320px] snap-start" />
              ))}
           </div>
        </HomeSection>
      )}

      <HomeSection title="Trending Hits" icon={<Flame className="text-smash-orange" />} subtitle="The biggest tracks in the Warm Heart right now.">
         <div className="flex overflow-x-auto gap-6 pb-8 snap-x no-scrollbar">
            {trendingSongs.length > 0 ? trendingSongs.map((song, i) => (
              <SongCard key={`trending-${song.id}-${i}`} song={song} queue={trendingSongs} className="min-w-[280px] md:min-w-[320px] snap-start" />
            )) : (
              <div className="py-12 px-8 bg-white/5 rounded-3xl border border-white/10 text-smash-gray font-bold uppercase tracking-widest text-xs">No trending tracks yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection title="New Releases" icon={<Sparkles className="text-white" />} subtitle="Fresh drops from your favorite local superstars.">
         <div className="flex overflow-x-auto gap-6 pb-8 snap-x no-scrollbar">
            {newReleases.length > 0 ? newReleases.map((song, i) => (
              <SongCard key={`new-${song.id}-${i}`} song={song} queue={newReleases} className="min-w-[280px] snap-start" />
            )) : (
              <div className="py-12 px-8 bg-white/5 rounded-3xl border border-white/10 text-smash-gray font-bold uppercase tracking-widest text-xs">No new releases yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection title="For Sale" icon={<DollarSign className="text-smash-green" />} subtitle="Support artists directly by owning their music.">
         <div className="flex overflow-x-auto gap-6 pb-8 snap-x no-scrollbar">
            {forSaleSongs.length > 0 ? forSaleSongs.map((song, i) => (
              <SongCard key={`sale-${song.id}-${i}`} song={song} queue={forSaleSongs} className="min-w-[280px] snap-start" />
            )) : (
              <div className="py-12 px-8 bg-white/5 rounded-3xl border border-white/10 text-smash-gray font-bold uppercase tracking-widest text-xs">No tracks for sale yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection title="Featured Artists" icon={<User className="text-white" />} subtitle="The visionaries shaping Malawian culture.">
         <div className="flex overflow-x-auto gap-8 pb-8 snap-x no-scrollbar">
            {topArtists.length > 0 ? topArtists.map((artist, i) => (
              <motion.div 
                key={`artist-${artist.id}-${i}`}
                whileHover={{ y: -5 }}
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="flex flex-col items-center gap-4 min-w-[160px] cursor-pointer snap-start group"
              >
                 <div className="relative p-1 rounded-full bg-gradient-to-tr from-smash-orange to-smash-purple group-hover:p-1.5 transition-all">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-smash-black">
                       <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-full h-full transform group-hover:scale-110 transition-transform" />
                    </div>
                    {artist.verified && (
                       <div className="absolute bottom-1 right-1 w-8 h-8 bg-smash-cyan rounded-full border-4 border-smash-black flex items-center justify-center">
                          <Check size={16} className="text-black" />
                       </div>
                    )}
                 </div>
                 <div className="text-center">
                    <p className="font-display font-black text-lg italic uppercase truncate tracking-tight">{artist.stage_name || (artist as any).full_name || artist.name}</p>
                    <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">{artist.genre || 'Artist'}</p>
                 </div>
              </motion.div>
            )) : (
              <div className="py-12 px-8 bg-white/5 rounded-3xl border border-white/10 text-smash-gray font-bold uppercase tracking-widest text-xs">No featured artists yet</div>
            )}
         </div>
      </HomeSection>

      {/* Support Artists Banner (From Listener View) */}
      <div className="mt-16 bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 mb-16 shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-smash-orange/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
         <div className="relative z-10 flex-1">
            <h3 className="text-3xl font-display font-black italic uppercase mb-2 flex items-center gap-3">
               <Heart className="text-smash-red" fill="currentColor" /> Support Malawian Artists
            </h3>
            <p className="text-smash-gray font-bold text-lg max-w-2xl">
               Your purchases and donations go directly to them via Mobile Money. Let's build the music industry together.
            </p>
         </div>
         <div className="relative z-10">
            <button onClick={() => navigate('/pricing')} className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-sm rounded-full hover:bg-smash-orange hover:text-white transition-all shadow-xl flex items-center gap-2">
               <Crown size={18} /> Go Premium
            </button>
         </div>
      </div>

      <div className="bento-card bg-gradient-to-r from-smash-orange to-smash-red p-12 text-center relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
         <h2 className="text-4xl md:text-6xl font-black font-display italic uppercase tracking-tighter mb-4 relative z-10">MOTO FEED PREVIEW</h2>
         <p className="text-white/80 text-xl font-bold mb-10 max-w-xl mx-auto relative z-10">Experience the world's first swipeable music discovery feed. Discover your next favorite song in seconds.</p>
         <button 
           onClick={() => navigate('/moto-feed')}
           className="px-12 py-5 bg-white text-smash-black rounded-[24px] font-black text-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all relative z-10 shadow-2xl"
         >
            ENTERING THE FEED
         </button>
      </div>
    </div>
  );
};

const HomeSection = ({ title, subtitle, icon, children }: any) => (
  <section className="mb-20">
    <div className="flex items-center justify-between mb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {icon}
          <h2 className="text-3xl md:text-4xl font-black font-display italic uppercase tracking-tighter">{title}</h2>
        </div>
        <p className="text-smash-gray font-bold tracking-tight">{subtitle}</p>
      </div>
      <button className="flex items-center gap-2 text-xs font-black text-smash-gray hover:text-white uppercase tracking-widest transition-all group">
         View All <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
    {children}
  </section>
);

const Check = ({ size, className }: any) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
   </svg>
);

export default Home;
