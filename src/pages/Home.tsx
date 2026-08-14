import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Search, Flame, Sparkles, DollarSign, Clock, Trophy, Heart, Play, MoreVertical, Bell, X, Headphones, TrendingUp, ArrowUpRight, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Song, Artist, Album } from '../types';
import SongCard from '../components/common/SongCard';
import Avatar from '../components/common/Avatar';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { getAiRecommendations } from '../services/aiService';
import { musicService } from '../services/musicService';
import { optimizeImage } from '../lib/imageUtils';
import SEO from '../components/common/SEO';
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING, SECTION_SPACING } from '../lib/layout';

const FEATURED_CHARTS = [
  {
    id: 'top-songs-global',
    title: 'Top Songs Global',
    subtitle: 'Your weekly update of the most played tracks right now - Global.',
    type: 'Weekly',
    cardTitle: 'Top Songs',
    cardSub: 'Global',
    iconText: 'Weekly Music Charts'
  },
  {
    id: 'top-songs-malawi',
    title: 'Top Songs Malawi',
    subtitle: 'Your weekly update of the most played tracks right now - Malawi.',
    type: 'Weekly',
    cardTitle: 'Top Songs',
    cardSub: 'Malawi',
    iconText: 'Weekly Music Charts'
  },
  {
    id: 'top-50-global',
    title: 'Top 50 - Global',
    subtitle: 'Your daily update of the most played tracks right now - Global.',
    type: 'Daily',
    cardTitle: 'Top 50',
    cardSub: 'Global',
    iconText: 'Daily Music Charts'
  },
  {
    id: 'top-50-malawi',
    title: 'Top 50 - Malawi',
    subtitle: 'Your daily update of the most played tracks right now - Malawi.',
    type: 'Daily',
    cardTitle: 'Top 50',
    cardSub: 'Malawi',
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
  const [publicPlaylists, setPublicPlaylists] = useState<any[]>([]);
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
          toast(payload.new.message, { duration: 4000 });
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

      // Fetch Public Playlists
      let resultData: any[] = [];
      const { data: plData, error: plError } = await supabase
        .from('playlists')
        .select('id, name, cover_url, profile_id, is_public, playlist_songs(songs(cover_url)), profiles:profile_id(full_name, avatar_url)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (plError) {
        console.warn('Nested query failed in Home, attempting manual join', plError);
        const { data: fallbackData } = await supabase
          .from('playlists')
          .select('id, name, cover_url, profile_id, is_public, playlist_songs(song_id), profiles:profile_id(full_name, avatar_url)')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (fallbackData) {
          const allSongIds = new Set<string>();
          fallbackData.forEach(pl => {
            (pl.playlist_songs || []).forEach((ps: any) => {
              if (ps.song_id) allSongIds.add(ps.song_id);
            });
          });
          
          let fetchedSongs: Record<string, any> = {};
          if (allSongIds.size > 0) {
            const { data: sData } = await supabase
              .from('songs')
              .select('id, cover_url')
              .in('id', Array.from(allSongIds));
            (sData || []).forEach(s => fetchedSongs[s.id] = s);
          }
          
          resultData = fallbackData.map(pl => ({
            ...pl,
            playlist_songs: (pl.playlist_songs || []).map((ps: any) => ({
              songs: fetchedSongs[ps.song_id] || null
            }))
          }));
        }
      } else {
        resultData = plData || [];
      }
      setPublicPlaylists(resultData);

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
      className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} pt-6`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <SEO 
        title="Smashify Music | Stream & Support African Artists" 
        description="Stream, download, and buy original music from talented African artists. Support creators directly using local mobile payment systems." 
      />

      {refreshing && (
        <div className="flex justify-center -mt-4 mb-4">
          <div className="w-6 h-6 border-2 border-[#00A3FF] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Welcome Message & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          {userProfile ? (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
               <h1 className="text-[28px] md:text-[34px] font-studio font-bold text-white mb-0 leading-tight tracking-[-0.01em]">
                  {getGreeting()}, <span className="text-[#00A3FF]">{userProfile.full_name?.split(' ')[0] || 'Listener'}</span>
               </h1>
               <p className="text-[13px] text-[#B0B0B0] mt-1 font-sans">Ready for today's top music and freshest drops?</p>
            </motion.div>
          ) : (
            <div>
               <h1 className="text-[28px] md:text-[34px] font-studio font-bold text-white mb-0 leading-tight tracking-[-0.01em]">
                  Welcome to <span className="text-[#00A3FF]">Smashify</span>
               </h1>
               <p className="text-[13px] text-[#B0B0B0] mt-1 font-sans">Discover, stream, and support African music creators.</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-[380px] group">
            <Search size={16} className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#B0B0B0] transition-colors" strokeWidth={2} />
            <input 
              type="text" 
              placeholder="Search artists, tracks, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim().length > 0) {
                  navigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchQuery('');
                }
              }}
              className="w-full h-[44px] bg-[#1A1A1A] border border-white/10 rounded-[12px] pl-10 pr-12 text-[14px] text-white placeholder:text-[#B0B0B0] focus:outline-none focus:border-[#00A3FF]/50 transition-all"
            />
            <button
              onClick={() => {
                if (searchQuery.trim().length > 0) {
                  navigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchQuery('');
                }
              }}
              aria-label="Search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#0084D6] hover:brightness-110 rounded-[8px] flex items-center justify-center transition-all shadow-sm"
            >
              <Search size={14} className="text-white" />
            </button>
          </div>
          <button
            onClick={() => { setShowNotifications(true); markAllRead(); }}
            aria-label="Notifications"
            className="relative w-11 h-11 rounded-[12px] bg-[#1A1A1A] border border-white/10 flex items-center justify-center shrink-0 hover:border-white/20 transition-colors"
          >
            <Bell size={18} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#00A3FF] rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-sm">
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
              transition={{ duration: 0.4 }}
              className="relative min-h-[280px] md:h-[300px] bg-[#1A1A1A] rounded-[24px] overflow-hidden group cursor-pointer border border-white/10 flex flex-col md:flex-row shadow-xl"
              onClick={() => navigate(`/artist/${featured.artist_id}`)}
            >
              {/* Image */}
              <div className="absolute inset-0 md:left-1/2">
                <img
                  src={optimizeImage(featured.cover_url, 600, 600)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt=""
                  referrerPolicy="no-referrer"
                  loading="lazy" 
                  decoding="async" 
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#1A1A1A] via-[#1A1A1A]/85 to-transparent" />
              </div>

              {/* Content */}
              <div className="relative z-10 w-full md:w-1/2 h-full flex flex-col justify-center p-6 md:p-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="px-2.5 py-0.5 bg-[#00A3FF]/15 border border-[#00A3FF]/30 text-[#00A3FF] text-[10px] font-semibold rounded-full uppercase tracking-wider">
                    Featured
                  </div>
                  {featured.profiles?.artist_tier === 'Elite' && (
                    <div className="px-2.5 py-0.5 bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] text-[10px] font-semibold rounded-full uppercase tracking-wider">
                      Elite
                    </div>
                  )}
                </div>
                <h2 className="text-[26px] md:text-[38px] font-studio font-bold tracking-[-0.01em] leading-[1.15] mb-2 text-white line-clamp-2">
                  {featured.title}
                </h2>
                <p className="text-[14px] text-[#B0B0B0] mb-6 line-clamp-1">
                  {featured.featured_artist
                    ? `${featured.artist_name} ft. ${featured.featured_artist}`
                    : featured.artist_name}
                </p>
                <div className="flex">
                  <button
                    onClick={(e) => { e.stopPropagation(); playSong(featured, featuredItems); }}
                    className="h-10 px-6 bg-white hover:bg-white/90 text-black text-[13px] font-semibold rounded-[10px] transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Play size={15} className="fill-current" /> Play Now
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
                    aria-label={`Slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === featuredIndex
                        ? 'w-6 bg-[#00A3FF]'
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
        <section className={SECTION_SPACING}>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold text-[#00A3FF] uppercase tracking-[0.18em] mb-1">RECOMMENDED</p>
              <h2 className="text-[22px] font-studio font-bold tracking-[-0.01em] text-white leading-none">Quick Picks</h2>
            </div>
            <button 
              onClick={() => playQueue(trendingSongs)} 
              className="h-9 px-4 border border-white/10 hover:border-white/30 text-white font-semibold text-[12px] rounded-[10px] transition-all flex items-center gap-2"
            >
               <Play size={12} className="fill-white" /> Play All
            </button>
          </div>
          
          <div className="grid grid-rows-4 grid-flow-col gap-x-6 gap-y-2 overflow-x-auto snap-x no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0 auto-cols-[85vw] md:auto-cols-[340px]">
            {trendingSongs.map((song) => (
              <div 
                key={`quick-${song.id}`} 
                className="flex items-center gap-3 p-2 rounded-[12px] bg-[#1A1A1A]/40 border border-white/5 hover:border-white/15 hover:bg-[#1A1A1A] snap-start group cursor-pointer transition-colors" 
                onClick={() => playSong(song)}
              >
                <div className="relative w-[48px] h-[48px] md:w-[52px] md:h-[52px] rounded-[8px] overflow-hidden flex-shrink-0 bg-black/40">
                   <img src={optimizeImage(song.cover_url, 120, 120)} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={18} className="fill-white text-white ml-0.5" />
                   </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-semibold text-white truncate mb-0.5 group-hover:text-[#00A3FF] transition-colors">{song.title}</h4>
                  <div className="flex items-center gap-1.5">
                    {(song as any).is_explicit && <span className="px-1 bg-white/10 text-white rounded-[3px] text-[8px] font-bold">E</span>}
                    <span className="text-[12px] text-[#B0B0B0] truncate">{song.artist_name}</span>
                  </div>
                </div>
                <button className="p-2 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); }}>
                  <MoreVertical size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sections */}
      {recentSongs.length > 0 && (
        <HomeSection 
          title="Recently Played" 
          subtitle="Jump back into your recent listens."
          onViewAll={() => navigate('/library?tab=recent')}
        >
           <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {recentSongs.map((song, i) => (
                <SongCard key={`recent-${song.id}-${i}`} song={song} queue={recentSongs} layout="grid" className="min-w-[140px] md:min-w-[170px] snap-start" />
              ))}
           </div>
        </HomeSection>
      )}

      {aiPicks.length > 0 && (
        <HomeSection 
          title="AI Picks For You" 
          subtitle="Tracks tailored to your listening history."
          onViewAll={() => navigate('/discover?filter=ai')}
        >
           <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {aiPicks.map((song, i) => (
                <SongCard key={`aipicks-${song.id}-${i}`} song={song} queue={aiPicks} layout="grid" className="min-w-[140px] md:min-w-[170px] snap-start" />
              ))}
           </div>
        </HomeSection>
      )}

      <HomeSection 
        title="Trending Hits" 
        subtitle="The most popular songs across the platform right now."
        onViewAll={() => navigate('/discover?filter=trending')}
      >
         <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {trendingSongs.length > 0 ? trendingSongs.map((song, i) => (
              <SongCard key={`trending-${song.id}-${i}`} song={song} queue={trendingSongs} layout="grid" className="min-w-[140px] md:min-w-[170px] snap-start" />
            )) : (
              <div className="w-full py-8 text-center text-[13px] text-[#B0B0B0] bg-[#1A1A1A] border border-white/8 rounded-[16px]">No trending tracks yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection 
        title="New Releases" 
        subtitle="Fresh drops from your favorite African artists."
        onViewAll={() => navigate('/discover?filter=new')}
      >
         <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {newReleases.length > 0 ? newReleases.map((song, i) => (
              <SongCard key={`new-${song.id}-${i}`} song={song} queue={newReleases} layout="grid" className="min-w-[140px] md:min-w-[170px] snap-start" />
            )) : (
              <div className="w-full py-8 text-center text-[13px] text-[#B0B0B0] bg-[#1A1A1A] border border-white/8 rounded-[16px]">No new releases yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection 
        title="Albums & EPs" 
        subtitle="Dive deeper into full-length projects and compilations."
        onViewAll={() => navigate('/discover?filter=albums')}
      >
         <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {albums.length > 0 ? albums.map((al: any) => (
               <div key={al.id} className="min-w-[140px] md:min-w-[170px] snap-start group cursor-pointer flex flex-col" onClick={() => navigate(`/album/${al.id}`)}>
                  <div className="aspect-square rounded-[12px] overflow-hidden mb-3 relative shadow-sm border border-white/8 bg-[#1A1A1A]">
                     <img src={optimizeImage(al.cover_url, 300, 300)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h4 className="font-semibold text-white text-[14px] truncate group-hover:text-[#00A3FF] transition-colors mb-0.5">{al.title}</h4>
                  <div className="flex items-center gap-1.5">
                     <span className="text-[11px] text-[#B0B0B0]">{al.release_year ? `${al.release_year} • ` : ''}Album</span>
                  </div>
                  <p className="text-[12px] text-[#B0B0B0] truncate mt-0.5">{al.profiles?.stage_name || al.profiles?.full_name}</p>
               </div>
            )) : (
              <div className="w-full py-8 text-center text-[13px] text-[#B0B0B0] bg-[#1A1A1A] border border-white/8 rounded-[16px]">No albums yet</div>
            )}
         </div>
      </HomeSection>

      {publicPlaylists.length > 0 && (
        <HomeSection 
          title="Public Playlists" 
          subtitle="Curated collections from creators and music lovers."
          onViewAll={() => navigate('/discover?filter=playlists')}
        >
           <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {publicPlaylists.map((pl: any) => (
                 <div key={pl.id} className="min-w-[140px] md:min-w-[170px] snap-start group cursor-pointer flex flex-col" onClick={() => navigate(`/playlist/${pl.id}`)}>
                    <div className="aspect-square rounded-[12px] overflow-hidden mb-3 relative shadow-sm border border-white/8 bg-[#1A1A1A]">
                       {pl.cover_url && !pl.cover_url.includes('images.unsplash.com') ? (
                          <img src={optimizeImage(pl.cover_url, 300, 300)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                       ) : (
                          <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                             {(pl.playlist_songs || []).slice(0, 4).map((ps: any, i: number) => (
                                <img key={i} src={optimizeImage(ps.songs?.cover_url || pl.cover_url, 150, 150)} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                             ))}
                             {Array.from({ length: Math.max(0, 4 - (pl.playlist_songs?.length || 0)) }).map((_, i) => (
                                <div key={`empty-${i}`} className="w-full h-full bg-white/5" />
                             ))}
                          </div>
                       )}
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-[#00A3FF] flex items-center justify-center text-white shadow-lg">
                             <Play size={16} className="ml-0.5 fill-current" />
                          </div>
                       </div>
                    </div>
                    <h4 className="font-semibold text-white text-[14px] truncate group-hover:text-[#00A3FF] transition-colors mb-0.5">{pl.name}</h4>
                    <div className="flex items-center gap-1.5">
                       <span className="text-[11px] text-[#B0B0B0]">By {pl.profiles?.full_name || 'User'}</span>
                    </div>
                 </div>
              ))}
           </div>
        </HomeSection>
      )}

      <HomeSection 
        title="For Sale" 
        subtitle="Support artists directly by purchasing and owning their music."
        onViewAll={() => navigate('/discover?filter=sale')}
      >
         <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {forSaleSongs.length > 0 ? forSaleSongs.map((song, i) => (
              <SongCard key={`sale-${song.id}-${i}`} song={song} queue={forSaleSongs} layout="grid" className="min-w-[140px] md:min-w-[170px] snap-start" />
            )) : (
              <div className="w-full py-8 text-center text-[13px] text-[#B0B0B0] bg-[#1A1A1A] border border-white/8 rounded-[16px]">No tracks for sale yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection 
        title="Featured Artists" 
        subtitle="Visionary artists shaping African music culture."
        onViewAll={() => navigate('/discover?filter=artists')}
      >
         <div className="flex overflow-x-auto gap-6 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {topArtists.length > 0 ? topArtists.map((artist, i) => (
              <div 
                key={`artist-${artist.id}-${i}`}
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="flex flex-col items-center gap-3 min-w-[120px] cursor-pointer snap-start group"
              >
                 <div className="relative p-[2px] rounded-full border border-white/15 group-hover:border-[#00A3FF] transition-all">
                    <div className="w-[96px] h-[96px] rounded-full overflow-hidden border-2 border-[#0A0A0A]">
                       <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-full h-full group-hover:scale-105 transition-transform" />
                    </div>
                    {artist.verified && (
                       <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#00A3FF] rounded-full border-2 border-[#0A0A0A] flex items-center justify-center shadow-sm">
                          <Check className="text-white w-2.5 h-2.5" />
                       </div>
                    )}
                 </div>
                 <div className="text-center">
                    <p className="font-semibold text-[14px] truncate text-white group-hover:text-[#00A3FF] transition-colors">{artist.stage_name || (artist as any).full_name || artist.name}</p>
                    <p className="text-[12px] text-[#B0B0B0] truncate mt-0.5">{artist.genre || 'Artist'}</p>
                 </div>
              </div>
            )) : (
              <div className="w-full py-8 text-center text-[13px] text-[#B0B0B0] bg-[#1A1A1A] border border-white/8 rounded-[16px]">No featured artists yet</div>
            )}
         </div>
      </HomeSection>

      {/* Featured Charts Section */}
      <HomeSection 
        title="Featured Charts" 
        subtitle="Daily and weekly updates of top streaming music."
        onViewAll={() => navigate('/discover?filter=charts')}
      >
         <div className="flex overflow-x-auto gap-4 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {FEATURED_CHARTS.map((chart) => (
               <div 
                  key={chart.id}
                  onClick={() => navigate(`/playlist/${chart.id}`)}
                  className="min-w-[150px] max-w-[150px] md:min-w-[180px] md:max-w-[180px] aspect-square rounded-[16px] bg-[#1A1A1A] border border-white/8 hover:border-white/20 p-4 flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all duration-200 shrink-0 snap-start"
               >
                  <div className="flex justify-between items-start">
                     <div className="w-7 h-7 rounded-[8px] bg-white/[0.04] border border-white/8 flex items-center justify-center">
                        <Headphones size={13} className="text-[#00A3FF]" />
                     </div>
                     <span className="text-[10px] font-semibold text-[#00A3FF] uppercase tracking-wider">
                        {chart.type}
                     </span>
                  </div>
                  
                  <div>
                     <h3 className="text-[17px] font-bold text-white mb-0.5 leading-tight font-studio">
                        {chart.cardTitle}
                     </h3>
                     <h4 className="text-[12px] font-medium text-[#B0B0B0]">
                        {chart.cardSub}
                     </h4>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                     <div className="flex items-center gap-1.5">
                        <TrendingUp size={11} className="text-[#B0B0B0]" />
                        <span className="text-[10px] text-[#B0B0B0]">
                           {chart.iconText}
                        </span>
                     </div>
                     <ArrowUpRight size={14} className="text-[#B0B0B0] group-hover:text-[#00A3FF] transition-colors" />
                  </div>
               </div>
            ))}
         </div>
      </HomeSection>

      {/* Support Artists Banner */}
      <div className="mt-12 bg-[#1A1A1A] border border-white/8 rounded-[20px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden group">
         <div className="relative z-10 flex-1 text-center md:text-left flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-12 h-12 rounded-[12px] bg-white/[0.04] border border-white/8 flex items-center justify-center shrink-0 mx-auto md:mx-0 text-[#00A3FF]">
               <Trophy size={22} />
            </div>
            <div>
               <h3 className="text-[18px] md:text-[20px] font-bold text-white mb-1 font-studio">
                  Support Local Creators
               </h3>
               <p className="text-[14px] text-[#B0B0B0] max-w-lg leading-relaxed">
                  Direct purchases go straight to artist wallets via mobile money. Buy tracks and empower African talent.
               </p>
            </div>
         </div>
         <div className="relative z-10">
            <button 
              onClick={() => navigate('/pricing')} 
              className="h-11 px-6 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] hover:brightness-110 text-white font-semibold text-[13px] rounded-[10px] transition-all shadow-[0_4px_16px_rgba(0,163,255,0.25)]"
            >
               Support Artists Directly
            </button>
         </div>
      </div>

      {/* Notification Drawer with 200ms ease */}
      <AnimatePresence>
        {showNotifications && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[#0A0A0A] border-l border-white/10 flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
                <div>
                  <h2 className="text-[16px] font-bold text-white">Notifications</h2>
                  <p className="text-[12px] text-[#B0B0B0]">Updates and new release alerts</p>
                </div>
                <button 
                  onClick={() => setShowNotifications(false)} 
                  aria-label="Close notifications"
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-[#B0B0B0] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/8 flex items-center justify-center text-[#B0B0B0]">
                      <Bell size={24} />
                    </div>
                    <p className="text-white font-semibold text-[14px]">No notifications yet</p>
                    <p className="text-[#B0B0B0] text-[12px] max-w-xs leading-relaxed">When artists you follow drop new music or send updates, you will see them here.</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { if (n.link) navigate(n.link); setShowNotifications(false); }}
                      className={`flex items-start gap-3.5 px-6 py-4 transition-colors cursor-pointer hover:bg-white/5 ${!n.read ? 'bg-[#00A3FF]/5 border-l-2 border-[#00A3FF]' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-[#00A3FF]' : 'bg-white/20'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[13px] font-medium leading-snug">{n.message}</p>
                        <p className="text-[#B0B0B0] text-[11px] mt-1">
                          {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-6 py-4 border-t border-white/8">
                  <button
                    onClick={() => setNotifications([])}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-[10px] text-[#B0B0B0] hover:text-white text-[12px] font-semibold transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* App Download Banner */}
      <div className="bg-[#1A1A1A] border border-white/8 rounded-[20px] p-6 md:p-8 mt-16 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm">
        <div>
          <h3 className="font-bold text-[18px] text-white mb-1 font-studio">Get the Smashify App</h3>
          <p className="text-[13px] text-[#B0B0B0]">Download the official Android APK for the best streaming and offline listening experience.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <a 
            href="/downloads/Smashify.apk" 
            download="Smashify.apk" 
            className="w-full md:w-auto h-11 px-6 bg-white hover:bg-white/90 text-black rounded-[10px] text-[13px] font-semibold transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Download APK
          </a>
        </div>
      </div>

    </div>
  );
};

const HomeSection = ({ 
  title, 
  subtitle, 
  onViewAll, 
  children 
}: { 
  title: string; 
  subtitle: string; 
  onViewAll?: () => void; 
  children: React.ReactNode; 
}) => (
  <section className={SECTION_SPACING}>
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-[20px] md:text-[22px] font-studio font-bold tracking-[-0.01em] text-white leading-none mb-1">{title}</h2>
        <p className="text-[13px] text-[#B0B0B0]">{subtitle}</p>
      </div>
      {onViewAll && (
        <button 
          onClick={onViewAll}
          className="text-[12px] font-semibold text-[#00A3FF] hover:underline transition-all"
        >
           View All
        </button>
      )}
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
