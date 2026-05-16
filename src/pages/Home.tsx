import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Flame, Sparkles, DollarSign, Clock, Crown, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Song, Artist } from '../types';
import SongCard from '../components/common/SongCard';
import Avatar from '../components/common/Avatar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAiRecommendations } from '../services/aiService';
import { musicService } from '../services/musicService';

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

      // Enrich with purchase status if user is logged in
      const enrichedSongs = await musicService.enrichSongsWithPurchases(formattedSongs as any, userProfile?.id);

      setTrendingSongs(enrichedSongs.sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 10));
      setNewReleases(enrichedSongs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10));
      setForSaleSongs(enrichedSongs.filter(s => s.is_for_sale).slice(0, 10));

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
        <div className="pb-32 px-4 md:px-8 pt-6 animate-pulse bg-bg-page min-h-screen">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div className="h-[28px] w-48 bg-white/5 rounded-md"></div>
              <div className="w-full md:w-[400px] h-[48px] bg-white/5 rounded-[14px]"></div>
           </div>
           <div className="h-[320px] w-full bg-white/5 rounded-[24px] mb-12"></div>
           <div className="space-y-4 mb-20">
              <div className="h-[24px] w-40 bg-white/5 rounded-md mb-2"></div>
              <div className="flex gap-4 overflow-hidden">
                 <div className="min-w-[160px] h-40 bg-white/5 rounded-[16px]"></div>
                 <div className="min-w-[160px] h-40 bg-white/5 rounded-[16px]"></div>
                 <div className="min-w-[160px] h-40 bg-white/5 rounded-[16px]"></div>
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
      className="pb-32 pt-6 px-4 md:px-8 max-w-7xl mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {refreshing && (
        <div className="flex justify-center -mt-4 mb-4">
          <div className="w-6 h-6 border-2 border-smash-orange border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Welcome Message & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          {userProfile ? (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
               <h1 className="text-[24px] font-studio font-bold text-text-primary mb-0 leading-tight">
                  {getGreeting()}, <span className="text-smash-orange">{userProfile.full_name?.split(' ')[0] || 'Listener'}</span>.
               </h1>
            </motion.div>
          ) : (
            <div>
               <h1 className="text-[24px] font-studio font-bold text-text-primary mb-0 leading-tight">
                  Welcome to <span className="text-smash-orange">Smashify</span>
               </h1>
            </div>
          )}
        </div>

        <div className="relative w-full lg:w-[400px] group">
          <Search size={16} className="absolute left-[16px] top-1/2 -translate-y-1/2 text-text-muted transition-colors opacity-70" strokeWidth={2} />
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
            className="w-full h-[44px] bg-white/5 border border-white/10 rounded-[14px] pl-10 pr-4 text-[14px] font-display text-text-primary placeholder:text-text-muted focus:outline-none focus:border-white/20 transition-all focus:bg-white/10"
          />
          <AnimatePresence>
            {searchQuery.trim().length > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full left-0 right-0 mt-2 bg-bg-elevated border border-white/10 rounded-[16px] shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
              >
                <div className="p-3 space-y-3">
                  {isSearching ? (
                    <div className="py-6 flex justify-center">
                      <div className="w-5 h-5 border-2 border-smash-orange border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (searchResults.songs.length === 0 && searchResults.artists.length === 0) ? (
                    <p className="text-[13px] font-sans text-text-muted text-center py-4">No results found</p>
                  ) : (
                    <>
                      {searchResults.artists.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-display font-medium text-text-muted uppercase tracking-wider ml-2 mb-1">Artists</p>
                          {searchResults.artists.map((artist, i) => (
                            <div 
                              key={`search-artist-${artist.id}-${i}`}
                              onClick={() => { navigate(`/artist/${artist.id}`); setSearchQuery(''); }}
                              className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-[10px] cursor-pointer transition-colors"
                            >
                              <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-9 h-9 rounded-full" />
                              <div className="min-w-0">
                                <p className="text-[14px] font-sans font-medium text-text-primary truncate">{artist.stage_name || artist.full_name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResults.songs.length > 0 && (
                        <div className="space-y-1 mt-3">
                          <p className="text-[10px] font-display font-medium text-text-muted uppercase tracking-wider ml-2 mb-1">Tracks</p>
                          {searchResults.songs.map((song, i) => (
                            <div 
                              key={`search-song-${song.id}-${i}`}
                              className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-[10px] cursor-pointer transition-colors"
                            >
                              <img src={song.cover_url} className="w-9 h-9 rounded-[6px] object-cover" />
                              <div className="min-w-0">
                                <p className="text-[14px] font-sans font-medium text-text-primary truncate">{song.title}</p>
                                <p className="text-[12px] font-sans text-text-muted truncate">{song.artist_name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button 
                        onClick={() => navigate(`/discover?q=${encodeURIComponent(searchQuery)}`)}
                        className="w-full mt-2 py-2.5 bg-white/5 hover:bg-white/10 text-[12px] font-sans font-semibold text-text-primary rounded-[10px] transition-colors"
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-[300px] bg-bg-surface rounded-[20px] overflow-hidden mb-12 group cursor-pointer border border-white/5 flex flex-col md:flex-row"
          onClick={() => navigate(`/artist/${featured.artist_id}`)}
        >
           {/* Image on Right */}
           <div className="absolute inset-0 md:left-1/2">
              <img 
                src={featured.cover_url} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[8s]" 
                alt="" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-bg-surface via-bg-surface/80 to-transparent" />
           </div>
           
           {/* Content on Left half */}
           <div className="relative z-10 w-full md:w-1/2 h-full flex flex-col justify-center p-6 md:p-10">
              <div className="flex items-center gap-2 mb-4">
                 <div className="px-2.5 py-1 bg-smash-purple text-white text-[9px] font-display font-semibold rounded-sm uppercase tracking-widest shadow-sm">
                    Featured
                 </div>
              </div>
              <h1 className="text-[28px] md:text-[44px] font-studio font-extrabold tracking-tight leading-[1.1] mb-2 text-white line-clamp-2 uppercase">
                 {featured.title}
              </h1>
              <p className="text-[13px] md:text-[14px] font-display text-text-muted mb-6 md:mb-8 line-clamp-1 uppercase tracking-wider">{featured.artist_name}</p>
              
              <div className="flex">
                 <button className="px-5 md:px-6 py-2.5 md:py-3 bg-white text-black text-[11px] md:text-[12px] font-display font-bold uppercase tracking-widest rounded-full hover:bg-white/90 transition-all flex items-center gap-2">
                    <Flame size={16} /> Play Now
                 </button>
              </div>
           </div>
        </motion.section>
      )}

      {/* Sections */}
      {recentSongs.length > 0 && (
        <HomeSection title="Recently Played" subtitle="Jump back into your recent jams.">
           <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {recentSongs.map((song, i) => (
                <SongCard key={`recent-${song.id}-${i}`} song={song} queue={recentSongs} layout="grid" className="min-w-[140px] md:min-w-[170px] snap-start" />
              ))}
           </div>
        </HomeSection>
      )}

      {aiPicks.length > 0 && (
        <HomeSection title="AI Picks For You" subtitle="Tracks you'll love based on your listening history.">
           <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {aiPicks.map((song, i) => (
                <SongCard key={`aipicks-${song.id}-${i}`} song={song} queue={aiPicks} layout="grid" className="min-w-[140px] md:min-w-[170px] snap-start" />
              ))}
           </div>
        </HomeSection>
      )}

      <HomeSection title="Trending Hits" subtitle="The biggest tracks right now.">
         <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {trendingSongs.length > 0 ? trendingSongs.map((song, i) => (
              <SongCard key={`trending-${song.id}-${i}`} song={song} queue={trendingSongs} layout="grid" className="min-w-[140px] md:min-w-[170px] snap-start" />
            )) : (
              <div className="w-full py-8 text-center text-[13px] font-sans text-text-muted bg-white/5 border border-white/5 rounded-[16px]">No trending tracks yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection title="New Releases" subtitle="Fresh drops from your favorite local artists.">
         <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {newReleases.length > 0 ? newReleases.map((song, i) => (
              <SongCard key={`new-${song.id}-${i}`} song={song} queue={newReleases} layout="grid" className="min-w-[140px] md:min-w-[170px] snap-start" />
            )) : (
              <div className="w-full py-8 text-center text-[13px] font-sans text-text-muted bg-white/5 border border-white/5 rounded-[16px]">No new releases yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection title="For Sale" subtitle="Support artists directly by owning their music.">
         <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {forSaleSongs.length > 0 ? forSaleSongs.map((song, i) => (
              <SongCard key={`sale-${song.id}-${i}`} song={song} queue={forSaleSongs} layout="grid" className="min-w-[140px] md:min-w-[170px] snap-start" />
            )) : (
              <div className="w-full py-8 text-center text-[13px] font-sans text-text-muted bg-white/5 border border-white/5 rounded-[16px]">No tracks for sale yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection title="Featured Artists" subtitle="The visionaries shaping Malawian culture.">
         <div className="flex overflow-x-auto gap-6 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {topArtists.length > 0 ? topArtists.map((artist, i) => (
              <motion.div 
                key={`artist-${artist.id}-${i}`}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="flex flex-col items-center gap-3 min-w-[120px] cursor-pointer snap-start group"
              >
                 <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-smash-orange to-smash-purple group-hover:p-[3px] transition-all">
                    <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-[3px] border-[#0a0a0d]">
                       <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-full h-full transform group-hover:scale-105 transition-transform" />
                    </div>
                    {artist.verified && (
                       <div className="absolute bottom-1 right-1 w-6 h-6 bg-smash-purple rounded-full border-[3px] border-[#0a0a0d] flex items-center justify-center">
                          <Check className="text-white w-3 h-3" />
                       </div>
                    )}
                 </div>
                 <div className="text-center">
                    <p className="font-display font-bold text-[14px] truncate text-text-primary group-hover:text-smash-orange transition-colors">{artist.stage_name || (artist as any).full_name || artist.name}</p>
                 </div>
              </motion.div>
            )) : (
              <div className="w-full py-8 text-center text-[13px] font-sans text-text-muted bg-white/5 border border-white/5 rounded-[16px]">No featured artists yet</div>
            )}
         </div>
      </HomeSection>

      {/* Support Artists Banner */}
      <div className="mt-12 bg-gradient-to-r from-[#1E1E24] to-[#111118] border border-white/5 rounded-[20px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-smash-orange/5 rounded-full blur-[60px] -mt-10 -mr-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
         <div className="relative z-10 flex-1 text-center md:text-left flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 mx-auto md:mx-0 border border-yellow-500/30 shadow-sm">
               <Crown className="text-yellow-500" size={24} />
            </div>
            <div>
               <h3 className="text-[20px] font-studio font-bold mb-1 text-white">
                  Support Local Artists
               </h3>
               <p className="text-[14px] font-sans text-text-muted max-w-lg">
                  Direct purchases go directly to artists via mobile money. Buy tracks, build the industry.
               </p>
            </div>
         </div>
         <div className="relative z-10">
            <button onClick={() => navigate('/pricing')} className="px-6 py-3 bg-smash-orange text-white font-display font-semibold uppercase tracking-widest text-[11px] rounded-[10px] hover:bg-smash-orange/90 transition-all shadow-sm">
               Support your favorites directly
            </button>
         </div>
      </div>
    </div>
  );
};

const HomeSection = ({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) => (
  <section className="mb-10">
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-[22px] font-studio font-bold tracking-tight text-white leading-none mb-1">{title}</h2>
        <p className="text-[13px] font-display font-normal text-text-muted">{subtitle}</p>
      </div>
      <button className="text-[12px] font-display font-medium uppercase tracking-widest text-text-muted hover:text-white transition-all">
         View All
      </button>
    </div>
    {children}
  </section>
);

const Check = ({ className }: { className?: string }) => (
   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
   </svg>
);

export default Home;
