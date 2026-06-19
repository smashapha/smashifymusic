import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Share2, Instagram, Twitter, Music2, MapPin, Users, Check, 
  Trophy, Heart, CircleCheck, Disc, Sparkles, TrendingUp,
  Calendar, Info, Plus, UserPlus, Share, MessageSquare, Flame,
  ShieldCheck, ArrowUpRight, Zap, MessageCircle, Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Song, UserProfile, Album } from '../types';
import SongCard from '../components/common/SongCard';
import Avatar from '../components/common/Avatar';
import SupportArtistModal from '../components/common/SupportArtistModal';
import { usePlayer } from '../context/PlayerContext';
import { musicService } from '../services/musicService';

const ArtistProfile: React.FC = () => {
   const { id: paramId } = useParams<{ id: string }>();
   const navigate = useNavigate();
   const { userProfile } = useAuth();
   const { playQueue } = usePlayer();
   
   const [resolvedId, setResolvedId] = useState<string | null>(null);

   useEffect(() => {
     const resolveArtistId = async () => {
       if (!paramId) return;
       const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);
       if (isUUID) {
         setResolvedId(paramId);
         return;
       }
       
       const { data, error } = await supabase
         .from('profiles')
         .select('id')
         .ilike('stage_name', decodeURIComponent(paramId))
         .maybeSingle();

       if (data && data.id) {
         setResolvedId(data.id);
       } else {
         toast.error('Artist not found');
         navigate('/home');
       }
     };

     resolveArtistId();
   }, [paramId, navigate]);

   const id = resolvedId;
   
   const [artist, setArtist] = useState<UserProfile | null>(null);
   const [songs, setSongs] = useState<Song[]>([]);
   const [albums, setAlbums] = useState<Album[]>([]);
   const [loading, setLoading] = useState(true);

   const [isFollowing, setIsFollowing] = useState(false);
   const [followLoading, setFollowLoading] = useState(false);
   const [copied, setCopied] = useState(false);
   const [showSupportModal, setShowSupportModal] = useState(false);
   const [activeTab, setActiveTab] = useState<'tracks' | 'albums' | 'community' | 'about'>('tracks');
   const [isSubscribed, setIsSubscribed] = useState(false);
   const [exclusiveContent, setExclusiveContent] = useState<any[]>([]);
   const [subscribing, setSubscribing] = useState(false);
   const [topSupporters, setTopSupporters] = useState<any[]>([]);

   const [communityData, setCommunityData] = useState<{
     topSupporters: any[]
     recentTips: any[]
     recentComments: any[]
   }>({ topSupporters: [], recentTips: [], recentComments: [] });
   const [communityLoading, setCommunityLoading] = useState(false);

   const [discoFilter, setDiscoFilter] = useState<'popular' | 'albums' | 'singles'>('popular');
   const [discoLimit, setDiscoLimit] = useState(5);
   
   const [fansAlsoLike, setFansAlsoLike] = useState<UserProfile[]>([]);
   const [appearsOn, setAppearsOn] = useState<Song[]>([]);


   const handleSubscribe = async () => {
      if (!userProfile) {
         toast.error('Please sign in to subscribe.');
         return;
      }
      if (isSubscribed) {
         toast.success('You are already subscribed!');
         return;
      }
      setSubscribing(true);
      try {
         const { startFanSubscription } = await import('../lib/paychangu');
         await startFanSubscription({ artist: artist!, fan: userProfile });
      } catch (err: any) {
         toast.error(err.message);
         setSubscribing(false);
      }
   };

   const handleShare = () => {
      const shareUrl = `${window.location.origin}/artist/${encodeURIComponent(artist?.stage_name || id || '')}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Profile link copied!');
      setTimeout(() => setCopied(false), 2000);
   };

   const handleWhatsAppShare = () => {
      const shareUrl = `${window.location.origin}/artist/${encodeURIComponent(artist?.stage_name || id || '')}`;
      const text = encodeURIComponent(
         `🎵 Check out ${artist?.stage_name} on Smashify!\n` +
         `Stream their music and support them directly.\n\n` +
         `${shareUrl}`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank');
   };
 
   useEffect(() => {
      const fetchCommunityData = async () => {
        if (!id) return
        setCommunityLoading(true)
        try {
          // Top supporters by total tips
          const { data: tips } = await supabase
            .from('transactions')
            .select('gross_amount, fan_id, user_profiles!fan_id(full_name, avatar_url)')
            .eq('artist_id', id)
            .eq('type', 'donation')
            .eq('status', 'completed')
            .order('gross_amount', { ascending: false })
            .limit(5)

          // Recent comments on artist songs from moto_comments
          const { data: songIds } = await supabase
            .from('songs')
            .select('id')
            .eq('artist_id', id)

          let comments: any[] = []
          if (songIds && songIds.length > 0) {
            const ids = songIds.map(s => s.id)
            const { data: c } = await supabase
              .from('moto_comments')
              .select('*, user_profiles!profile_id(full_name, avatar_url)')
              .in('song_id', ids)
              .order('created_at', { ascending: false })
              .limit(10)
            if (c) comments = c
          }

          setCommunityData({
            topSupporters: tips || [],
            recentTips: tips || [],
            recentComments: comments
          })
        } catch (err) {
          console.error(err)
        } finally {
          setCommunityLoading(false)
        }
      }

      const checkFollow = async () => {
         if (!userProfile || !id) return;
         const { data } = await supabase
            .from('followers')
            .select('*')
            .eq('follower_id', userProfile.id)
            .eq('artist_id', id)
            .maybeSingle();
         if (data) setIsFollowing(true);
      };

      const checkSubscription = async () => {
         if (!userProfile || !id) return;
         const { data } = await supabase
            .from('fan_subscriptions')
            .select('id, status, next_billing_at')
            .eq('fan_id', userProfile.id)
            .eq('artist_id', id)
            .maybeSingle();
         if (data && data.status === 'active' && new Date(data.next_billing_at) > new Date()) {
            setIsSubscribed(true);
         }

         if (data && data.status === 'active' && new Date(data.next_billing_at) > new Date()) {
            // Fetch songs marked as exclusive
            const { data: exclusiveSongs } = await supabase
               .from('songs')
               .select('*')
               .eq('artist_id', id)
               .eq('is_exclusive', true)
               .eq('is_active', true);
            setExclusiveContent(exclusiveSongs || []);
         }
      };
      
      const fetchTopSupporters = async () => {
         if (!id) return;
         const { data } = await supabase
            .from('transactions')
            .select('fan_id, net_amount, user_profiles:fan_id(full_name, avatar_url)')
            .eq('artist_id', id)
            .in('type', ['donation', 'sale', 'subscription'])
            .eq('status', 'completed');
         
         if (data) {
            const supportersMap = data.reduce((acc: any, curr: any) => {
               if (!acc[curr.fan_id]) {
                  const profile = Array.isArray(curr.user_profiles) ? curr.user_profiles[0] : curr.user_profiles;
                  acc[curr.fan_id] = { 
                     name: profile?.full_name || 'Fan', 
                     avatar_url: profile?.avatar_url,
                     total: 0 
                  };
               }
               acc[curr.fan_id].total += curr.net_amount;
               return acc;
            }, {});
            
            const sorted = Object.values(supportersMap)
               .sort((a: any, b: any) => b.total - a.total)
               .slice(0, 10);
            setTopSupporters(sorted);
         }
      };

      const fetchArtist = async () => {
         if (!id) return;
         setLoading(true);
         try {
            const { data: artistData, error: artistError } = await supabase
               .from('profiles')
               .select('*')
               .eq('id', id)
               .single();
            
            if (artistError) throw artistError;
            const { count: followersCount } = await supabase
               .from('followers')
               .select('*', { count: 'exact', head: true })
               .eq('artist_id', id);

            setArtist({ ...artistData, followers_count: followersCount || 0 });
            checkFollow();
            checkSubscription();
            fetchTopSupporters();
            fetchCommunityData();

            const today = new Date().toISOString().split('T')[0];
            const { data: songsData, error: songsError } = await supabase
               .from('songs')
               .select('*')
               .eq('artist_id', id)
               .eq('approved', true)
               .lte('release_date', today)
               .order('created_at', { ascending: false });

            if (songsError) throw songsError;

            const validAlbumIds = Array.from(new Set((songsData || []).map(s => s.album_id).filter(Boolean)));
            if (validAlbumIds.length > 0) {
               const { data: albumsData } = await supabase
                  .from('albums')
                  .select('*')
                  .in('id', validAlbumIds)
                  .order('release_year', { ascending: false });
               setAlbums(albumsData || []);
            } else {
               setAlbums([]);
            }

            const formattedSongs = (songsData || []).map((s: any) => ({
               ...s,
               artist_name: artistData.stage_name || artistData.full_name || 'Artist',
               cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
               url: s.audio_url,
               profiles: artistData
             }));
            
            const enriched = await musicService.enrichSongsWithPurchases(formattedSongs as any, userProfile?.id);
            setSongs(enriched);

            // Fetch fans also like (other users who are artists)
            const { data: otherArtists } = await supabase
               .from('profiles')
               .select('*')
               .neq('id', id)
               .eq('is_artist', true)
               .limit(5);
            if (otherArtists) setFansAlsoLike(otherArtists);

            // Fetch appears on (songs from other artists)
            const searchName = artistData.stage_name || artistData.full_name || '';
            const { data: otherSongs } = await supabase
               .from('songs')
               .select('*, profiles!artist_id(*)')
               .neq('artist_id', id)
               .ilike('featured_artist', `%${searchName}%`)
               .eq('approved', true)
               .lte('release_date', today)
               .limit(5);
            if (otherSongs) {
               const formattedOther = otherSongs.map((s: any) => ({
                  ...s,
                  artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
                  cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
                  url: s.audio_url,
               }));
               setAppearsOn(await musicService.enrichSongsWithPurchases(formattedOther as any, userProfile?.id));
            }


         } catch (err) {
            console.error('Error fetching artist:', err);
         } finally {
            setLoading(false);
         }
      };

      fetchArtist();
   }, [id, userProfile]);

   const handleFollow = async () => {
      if (!userProfile) {
         toast.error('Please sign in to follow artists.');
         return;
      }
      setFollowLoading(true);
      try {
         if (isFollowing) {
            await supabase.from('followers').delete().eq('follower_id', userProfile.id).eq('artist_id', id);
            setIsFollowing(false);
            setArtist(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) } : null);
            toast.success(`Unfollowed ${artist?.stage_name}`);
         } else {
            await supabase.from('followers').insert({ follower_id: userProfile.id, artist_id: id });
            setIsFollowing(true);
            setArtist(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : null);
            toast.success(`Following ${artist?.stage_name}!`);
         }
      } catch (err: any) {
         toast.error(err.message);
      } finally {
         setFollowLoading(false);
      }
   };
 
   if (loading) return (
      <div className="min-h-screen bg-smash-black flex justify-center items-center">
         <div className="w-10 h-10 border-4 border-smash-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
   );

    if (!artist) return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center p-8 text-center">
         <Users size={48} className="text-text-muted/30 mb-6" />
         <h1 className="text-2xl font-bold font-display uppercase tracking-tight text-text-primary mb-4">Artist Vault Empty</h1>
         <button onClick={() => navigate(-1)} className="h-[44px] px-6 bg-smash-purple text-white rounded-[10px] font-display font-semibold uppercase tracking-widest text-[11px] hover:bg-smash-purple/90 transition-colors">Back to Discover</button>
      </div>
   );

   const isOwner = userProfile?.id === artist.id;
   const popularTracks = [...songs].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 5);
   const latestRelease = songs[0];

   return (
  <div className="min-h-screen pb-32">

    {/* ── HERO ── */}
    <div className="relative h-[280px] md:h-[380px] overflow-hidden">
      {/* Blurred background */}
      <img
        src={artist.banner_url || artist.avatar_url || 'https://images.unsplash.com/photo-1493225457124-a1a2a5f5f92e?w=1200&h=800&fit=crop'}
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm opacity-40"
        alt=""
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

      {/* Artist info pinned to bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-6 flex items-end gap-5">
        {/* Avatar */}
        <div className="w-24 h-24 md:w-36 md:h-36 rounded-full border-4 border-white/10 overflow-hidden shrink-0 shadow-2xl">
          <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-full h-full object-cover" />
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0 pb-1">
          {artist.verified && (
            <div className="flex items-center gap-1 mb-1">
              <CircleCheck size={13} className="text-smash-cyan" />
              <span className="text-smash-cyan text-[10px] font-black uppercase tracking-widest">Verified Artist</span>
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white truncate leading-none">
            {artist.stage_name || artist.full_name}
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-white/50 text-xs font-bold">
              {(artist.followers_count || 0).toLocaleString()} followers
            </span>
            <span className="text-white/20">·</span>
            <span className="text-white/50 text-xs font-bold">
              {songs.length} tracks
            </span>
            {artist.genre && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-white/50 text-xs font-bold">{artist.genre}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* ── ACTION BAR ── */}
    <div className="px-4 md:px-8 py-4 flex items-center gap-3 border-b border-white/5">
      {/* Play button */}
      <button
        onClick={() => playQueue(songs, 0)}
        className="w-12 h-12 bg-smash-orange rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-smash-orange/30 shrink-0"
      >
        <Play size={20} fill="white" className="text-white ml-0.5" />
      </button>

      {/* Follow */}
      <button
        onClick={handleFollow}
        disabled={followLoading}
        className={`h-9 px-5 rounded-full font-black text-xs uppercase tracking-widest transition-all border ${
          isFollowing
            ? 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
            : 'border-smash-orange text-smash-orange hover:bg-smash-orange hover:text-white'
        }`}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>

      {/* Support */}
      <button
        onClick={() => setShowSupportModal(true)}
        className="h-9 px-5 rounded-full font-black text-xs uppercase tracking-widest border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all"
      >
        Support
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all ml-auto"
      >
        <Share size={15} />
      </button>

      {/* WhatsApp */}
      <button
        onClick={handleWhatsAppShare}
        className="w-9 h-9 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-all"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </button>

      {/* Owner shortcut */}
      {isOwner && (
        <button
          onClick={() => navigate('/artist-hub')}
          className="h-9 px-4 rounded-full border border-smash-purple/30 text-smash-purple text-xs font-black uppercase tracking-widest hover:bg-smash-purple/10 transition-all"
        >
          Edit Profile
        </button>
      )}
    </div>

    {/* ── TABS ── */}
    <div className="flex border-b border-white/5 px-4 md:px-8">
      {[
        { key: 'tracks', label: 'Music' },
        { key: 'albums', label: 'Discography' },
        { key: 'community', label: 'Community' },
      ].map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key as any)}
          className={`relative py-4 px-4 text-xs font-black uppercase tracking-widest transition-colors ${
            activeTab === tab.key ? 'text-white' : 'text-white/30 hover:text-white/60'
          }`}
        >
          {tab.label}
          {activeTab === tab.key && (
            <motion.div layoutId="artistTabLine" className="absolute bottom-0 left-0 right-0 h-[2px] bg-smash-orange" />
          )}
        </button>
      ))}
    </div>

    {/* ── TAB CONTENT ── */}
    <div className="px-4 md:px-8 py-6">
      <AnimatePresence mode="wait">

        {/* MUSIC TAB */}
        {activeTab === 'tracks' && (
          <motion.div key="tracks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

            {/* Popular — Spotify-style numbered list */}
            {popularTracks.length > 0 && (
              <section>
                <h2 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4">Popular</h2>
                <div className="space-y-1">
                  {popularTracks.map((song, i) => (
                    <div
                      key={`pop-${song.id}`}
                      className="group flex items-center gap-4 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => playQueue(popularTracks, i)}
                    >
                      {/* Number / play icon */}
                      <div className="w-5 flex items-center justify-center shrink-0">
                        <span className="text-white/30 text-sm font-bold group-hover:hidden">{i + 1}</span>
                        <Play size={14} fill="white" className="text-white hidden group-hover:block" />
                      </div>
                      {/* Cover */}
                      <img
                        src={song.cover_url}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                        alt={song.title}
                      />
                      {/* Title + genre */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold truncate">{song.title}</p>
                        <p className="text-white/40 text-xs truncate">{song.genre}</p>
                      </div>
                      {/* Plays */}
                      <span className="text-white/30 text-xs font-bold tabular-nums shrink-0">
                        {(song.plays || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Exclusive Content Section */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Crown size={16} className="text-smash-orange" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                  Exclusive Content
                </h3>
                {isSubscribed && (
                  <span className="text-[9px] font-black bg-smash-orange/20 text-smash-orange px-2 py-0.5 rounded-full">
                    SUBSCRIBER ACCESS
                  </span>
                )}
              </div>

              {!isSubscribed ? (
                <div className="p-6 bg-white/5 border border-smash-orange/20 rounded-2xl text-center mb-8">
                  <Crown size={32} className="text-smash-orange mx-auto mb-3" />
                  <p className="text-sm font-bold text-white mb-1">Subscriber Only Content</p>
                  <p className="text-xs text-smash-gray mb-4">
                    Subscribe to {artist?.stage_name || artist?.full_name} for MK {(artist?.subscription_price || 1500).toLocaleString()}/month to unlock exclusive tracks, early releases, and behind-the-scenes content.
                  </p>
                  <button
                    onClick={() => handleSubscribe()}
                    className="px-6 py-2 bg-smash-orange text-white rounded-full font-black text-xs uppercase tracking-widest"
                  >
                    Subscribe · MK {(artist?.subscription_price || 1500).toLocaleString()}/mo
                  </button>
                </div>
              ) : exclusiveContent.length === 0 ? (
                <p className="text-xs text-smash-gray text-center py-4 mb-8">
                  No exclusive content yet. Check back soon!
                </p>
              ) : (
                <div className="space-y-2 mb-8">
                  {exclusiveContent.map(song => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </div>
              )}
            </div>

            {/* Discography */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 mt-8">
                <h2 className="text-xl md:text-2xl font-bold text-white">Discography</h2>
                <button
                  onClick={() => setDiscoLimit(0)}
                  className="text-xs text-white/50 font-bold uppercase hover:underline"
                >
                  Show all
                </button>
              </div>
              
              <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-2">
                <button onClick={() => { setDiscoFilter('popular'); setDiscoLimit(5); }} className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${discoFilter === 'popular' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>Popular releases</button>
                <button onClick={() => { setDiscoFilter('albums'); setDiscoLimit(5); }} className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${discoFilter === 'albums' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>Albums</button>
                <button onClick={() => { setDiscoFilter('singles'); setDiscoLimit(5); }} className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${discoFilter === 'singles' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>Singles and EPs</button>
              </div>

              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6 snap-x">
                {(() => {
                  let items: any[] = [];
                  if (discoFilter === 'albums') {
                    items = albums.map(a => ({ type: 'album', data: a }));
                  } else if (discoFilter === 'singles') {
                    items = songs.filter(s => !s.album_id).map(s => ({ type: 'single', data: s }));
                  } else {
                    items = [
                      ...albums.map(a => ({ type: 'album', data: a })),
                      ...songs.filter(s => !s.album_id).map(s => ({ type: 'single', data: s }))
                    ];
                  }
                  return (discoLimit ? items.slice(0, discoLimit) : items).map((item, i) => {
                    if (item.type === 'single') {
                       return (
                         <div key={`s-${item.data.id}`} className="min-w-[140px] max-w-[140px] md:min-w-[180px] md:max-w-[180px] snap-start flex-shrink-0">
                           <SongCard song={item.data} queue={songs} layout="grid" className="!p-0 hover:bg-transparent" />
                         </div>
                       );
                    } else {
                       return (
                         <div key={`a-${item.data.id}`} className="min-w-[140px] max-w-[140px] md:min-w-[180px] md:max-w-[180px] snap-start flex-shrink-0 group cursor-pointer" onClick={() => navigate(`/album/${item.data.id}`)}>
                            <div className="aspect-square rounded-xl overflow-hidden mb-3 relative shadow-lg">
                               <img src={item.data.cover_url || 'https://placehold.co/400'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <div className="w-12 h-12 bg-smash-orange rounded-full flex items-center justify-center shadow-lg">
                                   <Play size={18} fill="white" className="text-white ml-0.5" />
                                 </div>
                               </div>
                            </div>
                            <p className="text-white text-sm font-bold truncate">{item.data.title}</p>
                            <p className="text-white/40 text-xs mt-0.5">{item.data.release_year} · Album</p>
                         </div>
                       );
                    }
                  });
                })()}
              </div>
            </section>

            {/* Appears On */}
            {appearsOn.length > 0 && (
               <section className="mb-8 pt-4">
                 <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl md:text-2xl font-bold text-white">Appears On</h2>
                   <button className="text-xs text-white/50 font-bold uppercase hover:underline">Show all</button>
                 </div>
                 <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6 snap-x">
                   {appearsOn.map(song => (
                     <div key={`appear-${song.id}`} className="min-w-[140px] max-w-[140px] md:min-w-[180px] md:max-w-[180px] snap-start flex-shrink-0">
                       <SongCard song={song} queue={appearsOn} layout="grid" className="!p-0 hover:bg-transparent" />
                     </div>
                   ))}
                 </div>
               </section>
            )}

            {/* Fans also like */}
            {fansAlsoLike.length > 0 && (
               <section className="mb-8 pt-4">
                 <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl md:text-2xl font-bold text-white">Fans also like</h2>
                   <button className="text-xs text-white/50 font-bold uppercase hover:underline">Show all</button>
                 </div>
                 <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6 snap-x">
                   {fansAlsoLike.map(fanArtist => (
                     <div key={`fan-${fanArtist.id}`} className="min-w-[140px] max-w-[140px] md:min-w-[180px] md:max-w-[180px] snap-start flex-shrink-0 group cursor-pointer text-center" onClick={() => navigate(`/artist/${fanArtist.id}`)}>
                       <div className="aspect-[1/1] w-full rounded-full overflow-hidden mb-3 relative shadow-lg mx-auto">
                          <img src={fanArtist.avatar_url || 'https://placehold.co/400'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                       </div>
                       <p className="text-white text-sm font-bold truncate">{fanArtist.stage_name || fanArtist.full_name}</p>
                       <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mt-1">Artist</p>
                     </div>
                   ))}
                 </div>
               </section>
            )}

            {/* About Spotify style */}
            <section className="mb-8 pt-4">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4">About</h2>
              <div className="relative aspect-[4/3] md:aspect-[2/1] rounded-3xl overflow-hidden group cursor-pointer">
                 <img src={artist.banner_url || artist.avatar_url || 'https://images.unsplash.com/photo-1493225457124-a1a2a5f5f92e?w=1200&h=800&fit=crop'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="About" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                 <div className="absolute bottom-0 left-0 p-6 w-full">
                    <p className="text-white font-bold text-lg mb-2">{(artist.followers_count || 0).toLocaleString()} followers</p>
                    {artist.bio && (
                      <p className="text-white/80 text-sm md:text-base line-clamp-3 mb-4 max-w-2xl">{artist.bio}</p>
                    )}
                    <div className="flex gap-3 flex-wrap">
                      {artist.instagram && <SocialLink href={artist.instagram} icon={<Instagram size={14} />} label="Instagram" />}
                      {artist.twitter && <SocialLink href={artist.twitter} icon={<Twitter size={14} />} label="X" />}
                    </div>
                 </div>
              </div>
            </section>
          </motion.div>
        )}

        {/* DISCOGRAPHY TAB */}
        {activeTab === 'albums' && (
          <motion.div key="albums" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Disc size={40} className="text-white/10 mb-4" />
                <p className="text-white/30 text-sm font-bold">No albums yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {albums.map(al => (
                  <div
                    key={al.id}
                    className="group cursor-pointer"
                    onClick={() => navigate(`/album/${al.id}`)}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden mb-3 relative shadow-lg">
                      <img
                        src={al.cover_url || 'https://placehold.co/400'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 bg-smash-orange rounded-full flex items-center justify-center shadow-lg">
                          <Play size={18} fill="white" className="text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p className="text-white text-sm font-bold truncate">{al.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{al.release_year} · Album</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* COMMUNITY TAB — keep existing JSX unchanged */}
        {activeTab === 'community' && (
          <motion.div key="community" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {communityLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-smash-orange border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                    <Trophy size={14} className="text-smash-orange" /> Top Supporters
                  </h3>
                  {communityData.topSupporters.length === 0 ? (
                    <p className="text-white/20 text-sm italic">No tips yet — be the first!</p>
                  ) : (
                    <div className="space-y-2">
                      {communityData.topSupporters.map((t, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                          <span className="text-smash-orange font-black text-sm w-5">#{i + 1}</span>
                          <Avatar src={t.user_profiles?.avatar_url} name={t.user_profiles?.full_name} className="w-9 h-9" />
                          <p className="text-white font-bold text-sm flex-1">{t.user_profiles?.full_name || 'Anonymous'}</p>
                          <p className="text-smash-orange font-black text-sm">MK {Number(t.gross_amount).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                    <MessageCircle size={14} className="text-smash-cyan" /> Fan Comments
                  </h3>
                  {communityData.recentComments.length === 0 ? (
                    <p className="text-white/20 text-sm italic">No comments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {communityData.recentComments.map(c => (
                        <div key={c.id} className="p-4 bg-white/5 rounded-xl">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar src={c.user_profiles?.avatar_url} name={c.user_profiles?.full_name} className="w-8 h-8" />
                            <p className="text-white font-bold text-sm">{c.user_profiles?.full_name || 'Listener'}</p>
                            <p className="text-white/30 text-xs ml-auto">
                              {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <p className="text-white/60 text-sm leading-relaxed">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    <AnimatePresence>
      {showSupportModal && artist && (
        <SupportArtistModal artist={artist} onClose={() => setShowSupportModal(false)} />
      )}
    </AnimatePresence>
  </div>
)
};

const SocialLink = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-black uppercase tracking-widest text-white/50 hover:text-white transition-all"
  >
    {icon} {label}
  </a>
)

export default ArtistProfile;

