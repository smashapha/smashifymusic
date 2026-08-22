import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  ArrowLeft, 
  Heart, 
  Share2, 
  ShoppingBag, 
  Gift, 
  Download, 
  ListMusic, 
  Music2, 
  Headphones, 
  Clock, 
  Calendar, 
  Check, 
  Loader2, 
  Sparkles,
  Compass
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Song, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useRequireAuth } from '../context/AuthGateContext';
import { purchaseTrack } from '../lib/paychangu';
import { getEffectivePrice, isOnSale } from '../lib/pricing';
import { handleTrackDownload } from '../lib/downloads';
import { useOfflineSong } from '../lib/offlineSync';
import { OfflineTrackButton } from '../components/common/OfflineTrackButton';
import { attachArtistProfilesToSongs } from '../lib/publicCatalog';
import { musicService } from '../services/musicService';
import { optimizeImage } from '../lib/imageUtils';
import { formatDisplayTitle, formatArtistName } from '../lib/formatting';
import { copyToClipboard } from '../lib/shareUtils';
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING, GRID_SONG_CARDS, SECTION_SPACING } from '../lib/layout';
import SEO from '../components/common/SEO';
import SongCard from '../components/common/SongCard';
import Avatar from '../components/common/Avatar';
import AddToPlaylistModal from '../components/common/AddToPlaylistModal';
import SupportArtistModal from '../components/common/SupportArtistModal';
import Reveal from '../components/common/Reveal';

const SongDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const requireAuth = useRequireAuth();
  const { currentSong, isPlaying, playSong, playQueue, purchasedIds } = usePlayer();

  const [song, setSong] = useState<Song | null>(null);
  const [artistProfile, setArtistProfile] = useState<UserProfile | null>(null);
  const [artistTier, setArtistTier] = useState<string | null>(null);
  const [moreSongs, setMoreSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  // Offline status hook for this song
  const { isSaved, isCachedLocal, cacheProgress, toggleOffline } = useOfflineSong(song?.id || '', userProfile);

  // Like state with optimistic sync
  const [isLiked, setIsLiked] = useState<boolean>(() => {
    if (!id) return false;
    try {
      const liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
      return Array.isArray(liked) && liked.includes(id);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      fetchSongDetails(id);
    }
  }, [id, userProfile?.id]);

  // Sync like updates across components
  useEffect(() => {
    if (!song?.id) return;
    const handleLikesUpdate = (e: any) => {
      if (e.detail?.songId === song.id) {
        setIsLiked(e.detail.isLiked);
      }
    };
    window.addEventListener('smash_likes_updated', handleLikesUpdate);

    // Initial check from Supabase
    if (userProfile?.id) {
      supabase
        .from('likes')
        .select('id')
        .eq('profile_id', userProfile.id)
        .eq('song_id', song.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setIsLiked(true);
            try {
              const liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
              if (Array.isArray(liked) && !liked.includes(song.id)) {
                localStorage.setItem('smash_liked_songs', JSON.stringify([...liked, song.id]));
              }
            } catch (_) {}
          }
        });
    }

    return () => {
      window.removeEventListener('smash_likes_updated', handleLikesUpdate);
    };
  }, [song?.id, userProfile?.id]);

  const fetchSongDetails = async (songId: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      // 1. Fetch song record
      const { data: songData, error: songErr } = await supabase
        .from('public_songs')
        .select('*')
        .eq('id', songId)
        .single();

      if (songErr || !songData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // 2. Fetch artist record from artist_catalog (or profiles)
      let artistData: any = null;
      if (songData.artist_id) {
        const { data: catArtist } = await supabase
          .from('artist_catalog')
          .select('id, full_name, stage_name, genre, location, bio, avatar_url, banner_url, followers_count, total_plays, verified, artist_tier')
          .eq('id', songData.artist_id)
          .single();

        artistData = catArtist;

        // Also fetch profile for tier info if needed
        const { data: pData } = await supabase
          .from('profiles')
          .select('id, full_name, stage_name, avatar_url, artist_tier, subscription_tier, user_type')
          .eq('id', songData.artist_id)
          .maybeSingle();

        if (pData) {
          setArtistProfile(pData as any);
          setArtistTier(pData.artist_tier || pData.subscription_tier || catArtist?.artist_tier || 'Free');
        } else if (catArtist) {
          setArtistProfile(catArtist as any);
          setArtistTier(catArtist.artist_tier || 'Free');
        }
      }

      const formattedSong: Song = {
        ...songData,
        artist_name: songData.artist_name || artistData?.stage_name || artistData?.full_name || 'Unknown Artist',
        cover_url: songData.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
        url: songData.audio_url,
        profiles: artistData || undefined
      };

      // Enrich single song with user purchases
      const [enrichedSong] = await musicService.enrichSongsWithPurchases([formattedSong] as any, userProfile?.id);
      setSong(enrichedSong || formattedSong);

      // 3. Fetch "More from {artist}"
      if (songData.artist_id) {
        const { data: moreData } = await supabase
          .from('public_songs')
          .select('*')
          .eq('artist_id', songData.artist_id)
          .eq('approved', true)
          .neq('id', songId)
          .order('plays', { ascending: false })
          .limit(8);

        if (moreData && moreData.length > 0) {
          const withProfiles = await attachArtistProfilesToSongs(moreData);
          const formattedMore = withProfiles.map((s: any) => ({
            ...s,
            artist_name: s.profiles?.stage_name || s.profiles?.full_name || formattedSong.artist_name,
            cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
            url: s.audio_url
          }));
          const enrichedMore = await musicService.enrichSongsWithPurchases(formattedMore as any, userProfile?.id);
          setMoreSongs(enrichedMore);
        } else {
          setMoreSongs([]);
        }
      }
    } catch (err) {
      console.error('Error fetching song details:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const isCurrent = song ? currentSong?.id === song.id : false;
  const isTrackPlaying = isCurrent && isPlaying;
  const artistCanSell = ['Elite', 'elite', 'Label', 'label'].includes(artistTier || '');
  const isPurchased = song ? (song.is_purchased || purchasedIds?.has(song.id)) : false;

  const handlePlayToggle = () => {
    if (!song) return;
    if (isCurrent) {
      playSong(song);
    } else {
      const fullQueue = [song, ...moreSongs.filter(s => s.id !== song.id)];
      playQueue(fullQueue);
    }
  };

  const handleBuy = () => {
    if (!song) return;
    requireAuth(() => {
      purchaseTrack({
        song,
        user: userProfile
      });
    }, 'Sign in to buy this track');
  };

  const handleSupport = () => {
    if (!artistProfile) {
      toast.error('Artist profile not available.');
      return;
    }
    requireAuth(() => {
      setShowSupportModal(true);
    }, 'Sign in to send a tip to this artist');
  };

  const handleDownload = async () => {
    if (!song) return;
    setIsDownloading(true);
    const toastId = toast.loading('Preparing download...');
    try {
      await handleTrackDownload(
        song,
        userProfile,
        purchasedIds,
        () => requireAuth(() => {}, 'Sign in to download music')
      );
      toast.success('Download started!', { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || 'Download failed', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLike = async () => {
    if (!song || isLikeLoading) return;

    let liked: string[] = [];
    try {
      liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
      if (!Array.isArray(liked)) liked = [];
    } catch {
      liked = [];
    }

    const previouslyLiked = isLiked;
    setIsLiked(!previouslyLiked);
    setIsLikeLoading(true);

    try {
      let newLiked: string[];
      if (previouslyLiked) {
        newLiked = liked.filter((sid: string) => sid !== song.id);
        if (userProfile) {
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('profile_id', userProfile.id)
            .eq('song_id', song.id);
          if (error) throw error;
        }
      } else {
        newLiked = [...liked, song.id];
        if (userProfile) {
          const { error } = await supabase
            .from('likes')
            .insert({
              profile_id: userProfile.id,
              song_id: song.id
            });
          if (error) throw error;
        }
      }
      localStorage.setItem('smash_liked_songs', JSON.stringify(newLiked));
      window.dispatchEvent(new CustomEvent('smash_likes_updated', {
        detail: { songId: song.id, isLiked: !previouslyLiked }
      }));
    } catch (err) {
      console.error('Like error:', err);
      setIsLiked(previouslyLiked);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleShare = async () => {
    if (!song) return;
    const artistName = formatArtistName(song.artist_name, song.featured_artist);
    const songUrl = `https://smashifymusic.vercel.app/song/${song.id}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${song.title} - ${artistName}`,
          text: `Stream "${song.title}" by ${artistName} on Smashify!`,
          url: songUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('Share aborted or failed, falling back to copy:', err);
      }
    }

    const copied = await copyToClipboard(songUrl);
    if (copied) {
      toast.success('Song link copied');
    } else {
      toast.error('Could not copy link');
    }
  };

  const formatDuration = (val: any) => {
    if (!val) return '3:15';
    if (typeof val === 'string') {
      if (val.includes(':')) return val;
      const num = parseInt(val, 10);
      if (isNaN(num)) return '3:15';
      val = num;
    }
    const mins = Math.floor(val / 60);
    const secs = Math.floor(val % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <div className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} pt-6 space-y-8`}>
        {/* Back navigation skeleton */}
        <div className="h-6 w-24 bg-white/5 rounded-md animate-pulse" />

        {/* Hero Card skeleton */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[20px] p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start animate-pulse">
          <div className="w-40 h-40 md:w-56 md:h-56 rounded-[14px] bg-white/5 shrink-0" />
          <div className="flex-1 w-full space-y-4 text-center md:text-left">
            <div className="h-4 w-20 bg-white/10 rounded-full mx-auto md:mx-0" />
            <div className="h-8 w-3/4 bg-white/10 rounded-lg mx-auto md:mx-0" />
            <div className="h-5 w-1/3 bg-white/5 rounded mx-auto md:mx-0" />
            <div className="h-4 w-1/2 bg-white/5 rounded mx-auto md:mx-0" />
            <div className="flex gap-3 pt-4 justify-center md:justify-start">
              <div className="h-11 w-32 bg-[#00A3FF]/20 rounded-full" />
              <div className="h-11 w-11 bg-white/5 rounded-full" />
              <div className="h-11 w-11 bg-white/5 rounded-full" />
            </div>
          </div>
        </div>

        {/* More songs skeleton */}
        <div className="space-y-4 pt-4">
          <div className="h-6 w-48 bg-white/10 rounded" />
          <div className={GRID_SONG_CARDS}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="aspect-square bg-white/5 rounded-[12px] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !song) {
    return (
      <div className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} pt-12 text-center`}>
        <SEO 
          title="Track Not Found | Smashify Music" 
          description="The requested song could not be found on Smashify Music." 
        />
        <div className="max-w-md mx-auto bg-[#1A1A1A] border border-white/10 rounded-[20px] p-8 md:p-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#00A3FF] mb-4">
            <Music2 size={32} />
          </div>
          <h2 className="text-2xl font-studio font-bold text-white mb-2">Track Not Found</h2>
          <p className="text-[13px] text-[#B0B0B0] leading-relaxed mb-6">
            This track might have been removed, made private, or the link is incorrect.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-[10px] text-[13px] font-semibold transition-all"
            >
              Go Back
            </button>
            <Link
              to="/discover"
              className="px-5 py-2.5 bg-[#00A3FF] hover:bg-[#0084D6] text-white rounded-[10px] text-[13px] font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Compass size={15} /> Discover Music
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const artistDisplayName = formatArtistName(song.artist_name, song.featured_artist);
  const displayTitle = formatDisplayTitle(song.title);

  return (
    <div className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} pt-4 md:pt-6 space-y-8 md:space-y-10`}>
      <SEO 
        title={`${displayTitle} by ${artistDisplayName} | Smashify Music`}
        description={`Stream, download, and support "${displayTitle}" by ${artistDisplayName} on Smashify Music.`}
      />

      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-[#B0B0B0] hover:text-white transition-colors group cursor-pointer"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>
      </div>

      {/* Hero Card */}
      <Reveal duration={0.4} yOffset={10}>
        <div className="relative bg-[#1A1A1A] border border-white/10 rounded-[20px] p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start shadow-xl overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#00A3FF]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Cover Art */}
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-[16px] overflow-hidden bg-black/50 border border-white/10 shrink-0 shadow-2xl group">
            <img
              src={optimizeImage(song.cover_url, 400, 400)}
              alt={displayTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="eager"
            />
            {/* Play Overlay */}
            <div 
              onClick={handlePlayToggle}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-[#00A3FF] text-white flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                {isTrackPlaying ? (
                  <Pause size={24} fill="currentColor" />
                ) : (
                  <Play size={24} fill="currentColor" className="ml-1" />
                )}
              </div>
            </div>
          </div>

          {/* Details & Actions */}
          <div className="flex-1 min-w-0 flex flex-col justify-between w-full text-center md:text-left z-10">
            <div>
              {/* Overline */}
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A3FF]">
                  TRACK
                </span>
                {song.is_unreleased && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                    Unreleased
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-studio font-bold text-white tracking-tight leading-tight mb-2">
                {displayTitle}
              </h1>

              {/* Artist Name */}
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <Link
                  to={`/artist/${song.artist_id}`}
                  className="inline-flex items-center gap-2 group/artist"
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-white/15 shrink-0">
                    <Avatar 
                      src={song.profiles?.avatar_url || artistProfile?.avatar_url} 
                      name={artistDisplayName} 
                      className="w-full h-full"
                    />
                  </div>
                  <span className="text-[15px] md:text-[16px] font-medium text-[#B0B0B0] group-hover/artist:text-white transition-colors">
                    {artistDisplayName}
                  </span>
                  {(song.profiles?.verified || artistProfile?.verified) && (
                    <div className="w-4 h-4 bg-[#00A3FF] rounded-full flex items-center justify-center" title="Verified Artist">
                      <Check size={10} className="text-white stroke-[3]" />
                    </div>
                  )}
                </Link>
              </div>

              {/* Meta Tags: Genre, Release Date, Plays */}
              <div className="flex items-center justify-center md:justify-start gap-3 text-[13px] text-[#737373] flex-wrap mb-6">
                {song.genre && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#B0B0B0] font-medium text-[12px]">
                    {song.genre}
                  </span>
                )}
                {song.duration && (
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-[#737373]" />
                    {formatDuration(song.duration)}
                  </span>
                )}
                {song.release_date && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-[#737373]" />
                    {new Date(song.release_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                )}
                {song.plays != null && (
                  <span className="flex items-center gap-1 font-mono text-white/90">
                    <Headphones size={13} className="text-[#00A3FF]" />
                    {Number(song.plays || 0).toLocaleString()} plays
                  </span>
                )}
              </div>
            </div>

            {/* Action Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
              {/* Play / Pause button */}
              <button
                onClick={handlePlayToggle}
                className="h-11 px-6 bg-[#00A3FF] hover:bg-[#0084D6] text-white font-semibold text-[13px] rounded-full flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(0,163,255,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
              >
                {isTrackPlaying ? (
                  <>
                    <Pause size={16} fill="currentColor" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                    <span>Play Track</span>
                  </>
                )}
              </button>

              {/* Buy Button */}
              {!isPurchased && song.is_for_sale && song.price > 0 && artistCanSell && (
                <button
                  onClick={handleBuy}
                  className="h-11 px-5 bg-gradient-to-r from-smash-green to-emerald-600 hover:brightness-110 text-white font-semibold text-[13px] rounded-full flex items-center gap-2 transition-all shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:scale-105 active:scale-95 cursor-pointer"
                  title={`Buy track for MK ${getEffectivePrice(song)}`}
                >
                  <ShoppingBag size={15} />
                  {isOnSale(song) ? (
                    <>
                      <span className="line-through opacity-60 text-[11px]">MK {song.price}</span>
                      <span>MK {getEffectivePrice(song)}</span>
                    </>
                  ) : (
                    <span>Buy MK {song.price}</span>
                  )}
                </button>
              )}

              {/* Tip / Support Artist Button */}
              <button
                onClick={handleSupport}
                className="h-11 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-[13px] rounded-full flex items-center gap-2 transition-colors cursor-pointer"
                title="Send a tip to support this creator"
              >
                <Gift size={15} className="text-[#00A3FF]" />
                <span className="hidden sm:inline">Tip Artist</span>
              </button>

              {/* Download Button (for purchased songs or downloadable content) */}
              {(isPurchased || !song.is_for_sale) && (
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="h-11 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-[13px] rounded-full flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Download Track"
                >
                  {isDownloading ? (
                    <Loader2 size={15} className="animate-spin text-[#00A3FF]" />
                  ) : (
                    <Download size={15} className="text-[#00A3FF]" />
                  )}
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}

              {/* Offline Track Button */}
              <OfflineTrackButton
                isSaved={isSaved}
                isCachedLocal={isCachedLocal}
                cacheProgress={cacheProgress}
                toggleOffline={toggleOffline}
                song={song}
                navigate={navigate}
              />

              {/* Like Button */}
              <button
                onClick={handleLike}
                aria-label={isLiked ? 'Unlike song' : 'Like song'}
                className={`h-11 w-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all cursor-pointer ${
                  isLiked ? 'text-red-500 border-red-500/30 bg-red-500/10' : 'text-[#B0B0B0] hover:text-white'
                }`}
              >
                <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
              </button>

              {/* Add to Playlist Button */}
              <button
                onClick={() => setShowPlaylistModal(true)}
                aria-label="Add to playlist"
                className="h-11 w-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#B0B0B0] hover:text-white transition-colors cursor-pointer"
                title="Add to Playlist"
              >
                <ListMusic size={16} />
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                aria-label="Share song link"
                className="h-11 w-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#B0B0B0] hover:text-[#00A3FF] transition-colors cursor-pointer"
                title="Share Song"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* More from this Artist Section */}
      {moreSongs.length > 0 && (
        <Reveal delay={0.1} duration={0.4} yOffset={10}>
          <section className={SECTION_SPACING}>
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold text-[#00A3FF] uppercase tracking-[0.18em] mb-1">
                  DISCOGRAPHY
                </p>
                <h2 className="text-xl md:text-2xl font-studio font-bold text-white tracking-tight">
                  More from {artistDisplayName}
                </h2>
              </div>
              <Link
                to={`/artist/${song.artist_id}`}
                className="text-[13px] font-semibold text-[#B0B0B0] hover:text-[#00A3FF] transition-colors"
              >
                View Artist Profile →
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              {moreSongs.map((s, i) => (
                <SongCard
                  key={`more-song-${s.id}-${i}`}
                  song={s}
                  queue={[song, ...moreSongs]}
                  layout="list"
                />
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showPlaylistModal && song && (
          <AddToPlaylistModal 
            song={song} 
            onClose={() => setShowPlaylistModal(false)} 
          />
        )}
        {showSupportModal && artistProfile && (
          <SupportArtistModal 
            artist={artistProfile} 
            onClose={() => setShowSupportModal(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SongDetails;
