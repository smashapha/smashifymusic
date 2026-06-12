import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Flame, Sparkles, DollarSign, Clock, Trophy, Heart, Play, MoreVertical, Bell, X, Headphones, TrendingUp, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Song, Artist, Album } from '../types';
import SongCard from '../components/common/SongCard';
import Avatar from '../components/common/Avatar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { getAiRecommendations } from '../services/aiService';
import { musicService } from '../services/musicService';
import { optimizeImage } from '../lib/imageUtils';

const FEATURED_CHARTS = [
  {
    id: 'top-songs-global',
    title: 'Top Songs Global',
    subtitle: 'Your weekly update of the most played tracks right now - Global.',
    style: 'from-purple-800 to-indigo-950',
    type: 'weekly',
    cardTitle: 'Top Songs',
    cardSub: 'Global',
    iconText: 'Weekly Music Charts'
  },
  {
    id: 'top-songs-malawi',
    title: 'Top Songs Malawi',
    subtitle: 'Your weekly update of the most played tracks right now - Malawi.',
    style: 'from-orange-850 to-red-950',
    type: 'weekly',
    cardTitle: 'Top Songs',
    cardSub: 'Malawi',
    iconText: 'Weekly Music Charts'
  },
  {
    id: 'top-50-global',
    title: 'Top 50 - Global',
    subtitle: 'Your daily update of the most played tracks right now - Global.',
    style: 'from-teal-800 to-cyan-950',
    type: 'daily',
    cardTitle: 'Top 50',
    cardSub: 'GLOBAL',
    iconText: 'Daily Music Charts'
  },
  {
    id: 'top-50-malawi',
    title: 'Top 50 - Malawi',
    subtitle: 'Your daily update of the most played tracks right now - Malawi.',
    style: 'from-pink-800 to-rose-950',
    type: 'daily',
    cardTitle: 'Top 50',
    cardSub: 'MALAŴI',
    iconText: 'Daily Music Charts'
  }
];

const Home: React.FC = () => {
  const { userProfile } = useAuth();
  const { playSong, playQueue } = usePlayer();
  const [featuredItems, setFeaturedItems] = useState<any[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [newReleases, setNewReleases] = useState<Song[]>([]);
  const [forSaleSongs, setForSaleSongs] = useState<Song[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [aiPicks, setAiPicks] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const showNotificationsRef = useRef(showNotifications);
  useEffect(() => { showNotificationsRef.current = showNotifications; }, [showNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

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
    fetchNotifications();
  }, [userProfile]);

  const fetchNotifications = async () => {
    if (!userProfile?.id) return;
    try {
      const { data } = await supabase
        .from('listener_notifications')
        .select('*')
        .eq('listener_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (!userProfile?.id) return;
    const channel = supabase
      .channel(`listener-notifs-${userProfile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'listener_notifications',
        filter: `listener_id=eq.${userProfile.id}`
      }, (payload) => {
        setNotifications(prev => prev.some(n => n.id === payload.new.id) ? prev : [payload.new, ...prev]);
        // If panel is open, mark as read immediately
        if (showNotificationsRef.current) {
          supabase
            .from('listener_notifications')
            .update({ read: true })
            .eq('id', payload.new.id)
            .then(() => {});
        } else {
          // Panel closed — show toast alert
          toast(`🔔 ${payload.new.message}`, { duration: 4000 });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfile?.id]);

  const markAllRead = async () => {
    if (!userProfile?.id) return;
    await supabase
      .from('listener_notifications')
      .update({ read: true })
      .eq('listener_id', userProfile.id)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    if (featuredItems.length <= 1) return;
    const timer = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % featuredItems.length);
    }, 5000); // Rotate every 5 seconds
    return () => clearInterval(timer);
  }, [featuredItems.length]);

  // search removed

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
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
        .eq('approved', true)
        .lte('release_date', today);

      if (songsError) throw songsError;

      const formattedSongs = (songsData || []).map((s: any) => ({
        ...s,
        artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Unknown Artist',
        cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
        url: s.audio_url
      }));

      // Enrich with purchase status if user is logged in
      const enrichedSongs = await musicService.enrichSongsWithPurchases(formattedSongs as any, userProfile?.id);

      // Step 1: Get Elite artist IDs
      const { data: eliteArtists } = await supabase
        .from('profiles')
        .select('id')
        .in('artist_tier', ['Elite', 'elite', 'Label', 'label'])
        .eq('approved', true);

      const eliteIds = (eliteArtists || []).map(a => a.id);

      // Step 2: Get their top songs
      const { data: eliteSongs } = eliteIds.length > 0
        ? await supabase
            .from('songs')
            .select('*, profiles:artist_id(id, full_name, stage_name, avatar_url, artist_tier, verified)')
            .eq('approved', true)
            .eq('is_active', true)
            .lte('release_date', today)
            .in('artist_id', eliteIds)
            .order('plays', { ascending: false })
            .limit(8)
        : { data: [] };

      const carouselItems = (eliteSongs && eliteSongs.length > 0)
        ? eliteSongs.map((s: any) => ({
            ...s,
            artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Unknown Artist',
            cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
            url: s.audio_url
          }))
        : enrichedSongs.sort((a: any, b: any) => (b.plays || 0) - (a.plays || 0)).slice(0, 5);

      setFeaturedItems(carouselItems);

      // Weighted shuffle — popular songs more likely to appear but not always on top
      const weightedShuffle = (songs: any[]) => {
        const sorted = [...songs].sort((a, b) => (b.plays || 0) - (a.plays || 0));
        const top = sorted.slice(0, 20); // Consider top 20 by plays
        // Shuffle with weight: earlier songs have higher probability but not guaranteed
        const shuffled = top
          .map(song => ({ song, weight: Math.random() + (top.indexOf(song) < 5 ? 0.5 : 0) }))
          .sort((a, b) => b.weight - a.weight)
          .map(item => item.song);
        return shuffled.slice(0, 10);
      };
      setTrendingSongs(weightedShuffle(enrichedSongs));
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

      const { data: songsWithAlbums } = await supabase
        .from('songs')
        .select('album_id')
        .eq('approved', true)
        .lte('release_date', today)
        .not('album_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      const validAlbumIds = Array.from(new Set((songsWithAlbums || []).map(s => s.album_id)));

      if (validAlbumIds.length > 0) {
        const { data: albumsData } = await supabase
          .from('albums')
          .select('*, profiles:artist_id(full_name, stage_name)')
          .in('id', validAlbumIds)
          .limit(10)
          .order('created_at', { ascending: false });

        setAlbums((albumsData || []) as any);
      } else {
        setAlbums([]);
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

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-[400px] group">
            <Search size={16} className="absolute left-[16px] top-1/2 -translate-y-1/2 text-text-muted transition-colors opacity-70" strokeWidth={2} />
            <input 
              type="text" 
              placeholder="Search artists or tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim().length > 0) {
                  navigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`)
                  setSearchQuery('')
                }
              }}
              className="w-full h-[44px] bg-white/5 border border-white/10 rounded-[14px] pl-10 pr-12 text-[14px] font-display text-text-primary placeholder:text-text-muted focus:outline-none focus:border-white/20 transition-all focus:bg-white/10"
            />
            <button
              onClick={() => {
                if (searchQuery.trim().length > 0) {
                  navigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`)
                  setSearchQuery('')
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-smash-orange rounded-lg flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Search size={14} className="text-white" />
            </button>
          </div>
          <button
          onClick={() => { setShowNotifications(true); markAllRead(); }}
          className="relative w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors"
        >
          <Bell size={20} className="text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-smash-orange rounded-full text-[10px] font-black text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        </div>
      </div>

      {/* Featured Carousel */}
      {featuredItems.length > 0 && (() => {
        const featured = featuredItems[featuredIndex];
        return (
          <div className="relative mb-12">
            <motion.section
              key={featuredIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="relative h-[300px] bg-bg-surface rounded-[20px] overflow-hidden group cursor-pointer border border-white/5 flex flex-col md:flex-row"
              onClick={() => navigate(`/artist/${featured.artist_id}`)}
            >
              {/* Image */}
              <div className="absolute inset-0 md:left-1/2">
                <img
                  src={optimizeImage(featured.cover_url, 600, 600)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[8s]"
                  alt=""
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-bg-surface via-bg-surface/80 to-transparent" />
              </div>

              {/* Content */}
              <div className="relative z-10 w-full md:w-1/2 h-full flex flex-col justify-center p-6 md:p-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="px-2.5 py-1 bg-smash-purple text-white text-[9px] font-display font-semibold rounded-sm uppercase tracking-widest shadow-sm">
                    Featured
                  </div>
                  {featured.profiles?.artist_tier === 'Elite' && (
                    <div className="px-2.5 py-1 bg-smash-orange/20 text-smash-orange text-[9px] font-display font-semibold rounded-sm uppercase tracking-widest border border-smash-orange/30">
                      Elite
                    </div>
                  )}
                </div>
                <h1 className="text-[28px] md:text-[44px] font-studio font-extrabold tracking-tight leading-[1.1] mb-2 text-white line-clamp-2 uppercase">
                  {featured.title}
                </h1>
                <p className="text-[13px] md:text-[14px] font-display text-text-muted mb-6 md:mb-8 line-clamp-1 uppercase tracking-wider">
                  {featured.featured_artist
                    ? `${featured.artist_name} ft. ${featured.featured_artist}`
                    : featured.artist_name}
                </p>
                <div className="flex">
                  <button
                    onClick={(e) => { e.stopPropagation(); playSong(featured, featuredItems); }}
                    className="px-5 md:px-6 py-2.5 md:py-3 bg-white text-black text-[11px] md:text-[12px] font-display font-bold uppercase tracking-widest rounded-full hover:bg-white/90 transition-all flex items-center gap-2"
                  >
                    <Flame size={16} /> Play Now
                  </button>
                </div>
              </div>
            </motion.section>

            {/* Carousel dots */}
            {featuredItems.length > 1 && (
              <div className="flex justify-center gap-2 mt-3">
                {featuredItems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFeaturedIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === featuredIndex
                        ? 'w-6 bg-smash-purple'
                        : 'w-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}
      
      {/* Quick Picks */}
      {trendingSongs.length > 0 && (
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[13px] font-display font-medium text-text-muted mb-1">Start radio from a song</p>
              <h2 className="text-[26px] font-studio font-bold tracking-tight text-white leading-none">Quick picks</h2>
            </div>
            <button onClick={() => playQueue(trendingSongs)} className="px-4 py-1.5 border border-white/20 text-white font-display font-semibold text-[12px] rounded-full hover:bg-white/10 transition-all flex items-center gap-2">
               <Play size={12} className="fill-white" /> Play all
            </button>
          </div>
          
          <div className="grid grid-rows-4 grid-flow-col gap-x-6 gap-y-2 overflow-x-auto snap-x no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0 auto-cols-[85vw] md:auto-cols-[340px]">
            {trendingSongs.map((song) => (
              <div key={`quick-${song.id}`} className="flex items-center gap-3 p-2 rounded-[10px] hover:bg-white/5 snap-start group cursor-pointer transition-colors" onClick={() => playSong(song)}>
                <div className="relative w-[48px] h-[48px] md:w-[54px] md:h-[54px] rounded-[6px] overflow-hidden flex-shrink-0">
                   <img src={optimizeImage(song.cover_url, 120, 120)} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={20} className="fill-white text-white ml-0.5" />
                   </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] md:text-[15px] font-sans font-bold text-white truncate mb-0.5 group-hover:text-smash-orange transition-colors">{song.title}</h4>
                  <div className="flex items-center gap-1.5">
                    {(song as any).is_explicit && <span className="px-1 bg-white/20 text-white rounded-[2px] text-[8px] font-bold">E</span>}
                    <span className="text-[13px] font-sans text-text-muted truncate">{song.artist_name}</span>
                  </div>
                </div>
                <button className="p-2 text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); }}>
                  <MoreVertical size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
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

      <HomeSection title="Albums & EPs" subtitle="Dive deeper into complete projects.">
         <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {albums.length > 0 ? albums.map((al: any) => (
               <div key={al.id} className="min-w-[140px] md:min-w-[170px] snap-start group cursor-pointer flex flex-col" onClick={() => navigate(`/album/${al.id}`)}>
                  <div className="aspect-square rounded-[10px] overflow-hidden mb-3 relative shadow-sm border border-border-default">
                     <img src={optimizeImage(al.cover_url, 300, 300)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h4 className="font-sans font-bold text-white text-[14px] truncate group-hover:text-smash-purple transition-colors mb-0.5">{al.title}</h4>
                  <div className="flex items-center gap-1.5 opacity-80">
                     <span className="font-display font-black text-[9px] uppercase tracking-widest text-text-muted">{al.release_year} • Album</span>
                  </div>
                  <p className="font-sans text-[12px] text-text-muted truncate mt-0.5">{al.profiles?.stage_name || al.profiles?.full_name}</p>
               </div>
            )) : (
              <div className="w-full py-8 text-center text-[13px] font-sans text-text-muted bg-white/5 border border-white/5 rounded-[16px]">No albums yet</div>
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

      {/* Featured Charts Section */}
      <HomeSection title="Featured Charts" subtitle="Your daily and weekly update of the most played local and global hits.">
         <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {FEATURED_CHARTS.map((chart) => (
               <div 
                  key={chart.id}
                  onClick={() => navigate(`/playlist/${chart.id}`)}
                  className={`min-w-[145px] max-w-[145px] md:min-w-[180px] md:max-w-[180px] aspect-square rounded-2xl bg-gradient-to-br ${chart.style} shadow-lg relative p-4 flex flex-col justify-between cursor-pointer border border-white/10 group hover:scale-[1.03] transition-all shrink-0 snap-start`}
               >
                  <div className="flex justify-between items-start">
                     <div className="w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
                        <Headphones size={11} className="text-smash-cyan animate-pulse" />
                     </div>
                     <span className="text-[8px] font-display font-black tracking-widest text-white/40 uppercase">
                        {chart.type}
                     </span>
                  </div>
                  
                  <div>
                     <h3 className="text-lg md:text-xl font-studio font-black italic tracking-tighter leading-none mb-0.5 text-white">
                        {chart.cardTitle}
                     </h3>
                     <h4 className="text-xs font-display font-black tracking-widest text-[#1db954] uppercase leading-none">
                        {chart.cardSub}
                     </h4>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                     <div className="flex items-center gap-1">
                        <TrendingUp size={10} className="text-white/60" />
                        <span className="text-[8px] font-sans font-black tracking-widest uppercase text-white/50">
                           {chart.iconText}
                        </span>
                     </div>
                     <ArrowUpRight size={14} className="text-white/40 opacity-0 group-hover:opacity-100 group-hover:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
               </div>
            ))}
         </div>
      </HomeSection>

      {/* Support Artists Banner */}
      <div className="mt-12 bg-gradient-to-r from-[#1E1E24] to-[#111118] border border-white/5 rounded-[20px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-smash-orange/5 rounded-full blur-[60px] -mt-10 -mr-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
         <div className="relative z-10 flex-1 text-center md:text-left flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 mx-auto md:mx-0 border border-yellow-500/30 shadow-sm">
               <Trophy className="text-yellow-500" size={24} />
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

      <AnimatePresence>
        {showNotifications && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[#111] border-l border-white/10 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                <h2 className="text-lg font-black uppercase tracking-widest text-white">Notifications</h2>
                <button onClick={() => setShowNotifications(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <X size={16} className="text-white" />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                    <Bell size={40} className="text-white/10" />
                    <p className="text-smash-gray font-bold text-sm uppercase tracking-widest">No notifications yet</p>
                    <p className="text-white/20 text-xs">When artists you follow drop new music or you get updates, they'll appear here.</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { if (n.link) navigate(n.link); setShowNotifications(false); }}
                      className={`flex items-start gap-4 px-6 py-4 transition-colors cursor-pointer hover:bg-white/5 ${!n.read ? 'bg-smash-orange/5 border-l-2 border-smash-orange' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-smash-orange' : 'bg-white/10'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold leading-snug">{n.message}</p>
                        <p className="text-white/30 text-[11px] font-bold mt-1 uppercase tracking-widest">
                          {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-6 py-4 border-t border-white/10">
                  <button
                    onClick={() => setNotifications([])}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 text-xs font-black uppercase tracking-widest transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
