import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Lock as AppLockIcon, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, Maximize2, Minimize2, Radio, Heart, Mic2, X, Share2, AlertCircle, Coins, Gift, RefreshCw, Crown, Info, Lock, ChevronDown, ListMusic, MoreVertical, Search, Plus, Trash2, CheckCircle, Loader2, ShoppingBag, Gauge, Clock, Zap, Download, Headphones } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/AuthGateContext';
import { EQPreset } from '../../types';
import { purchaseTrack } from '../../lib/paychangu';
import { getEffectivePrice, isOnSale } from '../../lib/pricing';
import { formatDisplayTitle } from '../../lib/formatting';
import toast from 'react-hot-toast';

import { getListenerTier, getListenerLimits } from '../../lib/tierUtils';

const FormattedPrice = ({ song }: { song: any }) => {
  if (!song) return null;
  const originalPrice = song.price || 2500;
  const saleActive = isOnSale(song);
  const effectivePrice = getEffectivePrice(song);

  if (saleActive) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-bold">
        <span className="line-through opacity-50 font-normal text-[11px]">MK {originalPrice}</span>
        <span className="text-white">MK {effectivePrice}</span>
      </span>
    );
  }
  return <span className="font-bold text-white whitespace-nowrap">MK {originalPrice}</span>;
};

const ExpandedPlayer = ({ onClose, isLiked, handleLike }: { onClose: () => void, isLiked: boolean, handleLike: () => void }) => {
  const { 
    currentSong, isPlaying, isBuffering, togglePlay, currentTime, duration, 
    seek, volume, setVolume, nextTrack, previousTrack, 
    eqPreset, setEQPreset,
    playbackRate, setPlaybackRate,
    sleepTimerRemaining, setSleepTimer,
    pauseSong, playSong,
    radioMode, toggleRadioMode, adPlaying, adSkipAvailable, skipAd,
    isShuffle, toggleShuffle, repeatMode, toggleRepeat,
    purchasedIds
  } = usePlayer();
  const { role, userProfile } = useAuth();
  const playerLimits = useMemo(() => getListenerLimits(userProfile), [
    userProfile?.subscription_tier,
    userProfile?.subscription_expires_at,
    userProfile?.artist_tier,
  ]);
  const accentColor = role === 'artist' ? 'smash-purple' : 'smash-orange';
  const displayDuration = adPlaying ? Math.min(30, duration || 30) : duration;
  const [showQueue, setShowQueue] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Local helper
  const toggleMute = () => {
    setVolume(volume === 0 ? 0.8 : 0);
  };
  
  // Lyrics State
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  const ProgressBar = ({ current, total, onSeek, disabled = false }: { current: number, total: number, onSeek: (time: number) => void, disabled?: boolean }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);

  const getPercent = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return x / rect.width;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    setDragPercent(getPercent(e));
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || !isDragging) return;
    setDragPercent(getPercent(e));
  };

  const commit = () => {
    if (isDragging && dragPercent !== null) {
      onSeek(dragPercent * total);
    }
    setIsDragging(false);
    setDragPercent(null);
  };

  const displayPercent = isDragging && dragPercent !== null ? dragPercent : (total > 0 ? current / total : 0);

  return (
    <div
      className={`group relative h-2.5 bg-white/10 rounded-full flex-1 md:flex-none cursor-pointer touch-none ${disabled ? 'pointer-events-none opacity-80' : ''}`}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={commit}
      onMouseLeave={() => { if (isDragging) commit(); }}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={commit}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-smash-orange to-red-500 relative rounded-full"
        style={{ width: `${displayPercent * 100}%` }}
        transition={isDragging ? { duration: 0 } : undefined}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity border-4 border-smash-black"
        style={{ left: `calc(${displayPercent * 100}% - 10px)`, opacity: isDragging ? 1 : undefined }}
      />
      {isDragging && (
        <div
          className="absolute -top-8 -translate-x-1/2 px-2 py-1 bg-black/80 rounded-md text-[10px] font-mono text-white pointer-events-none"
          style={{ left: `${displayPercent * 100}%` }}
        >
          {formatTime(displayPercent * total)}
        </div>
      )}
    </div>
  );
};

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.y > 100) {
      onClose();
    }
  };

  const fetchLyrics = async () => {
    if (!currentSong) return;
    setShowLyricsModal(true);
    setLoadingLyrics(true);
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('lyrics')
        .eq('id', currentSong.id)
        .single();
      if (error) throw error;
      
      if (data?.lyrics) {
        setLyrics(data.lyrics);
      } else {
        setLyrics("No lyrics found for this song.");
      }
    } catch (err) {
      setLyrics("Error loading lyrics.");
    }
    setLoadingLyrics(false);
  };

  const handleDownload = async () => {
    if (!currentSong) return;
    
    const isPurchased = currentSong.is_purchased || purchasedIds.has(currentSong.id);
    const isFree = !currentSong.is_for_sale;

    if (!isFree && !isPurchased) {
      toast.error("This track is not purchased. Downloads are only available for purchased tracks.");
      return;
    }

    const toastId = toast.loading('Preparing download...');
    try {
      const response = await fetch(currentSong.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const displayArtist = (currentSong as any).featured_artist ? `${currentSong.artist_name} ft. ${(currentSong as any).featured_artist}` : currentSong.artist_name;
      link.download = `${formatDisplayTitle(currentSong.title)} - ${displayArtist}.mp3`;
      link.style.display = 'none';
      if (document.body) {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      toast.success('Download started!', { id: toastId });
      let downloads: string[] = [];
      try {
        const stored = localStorage.getItem('smash_downloads');
        downloads = JSON.parse(stored || '[]');
      } catch (e) {
        console.error('Error parsing downloads:', e);
      }
      
      if (!downloads.includes(currentSong.id)) {
        localStorage.setItem('smash_downloads', JSON.stringify([...downloads, currentSong.id]));
      }
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download track.', { id: toastId });
    }
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSong) return;
    
    // NOTE: using a generic requireAuth logic to buy
    purchaseTrack({
      song: currentSong,
      user: userProfile
    });
  };

  // We need to provide the UI for ExpandedPlayer here!
  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-bg-screen flex flex-col"
    >
      <div className="flex items-center justify-between p-4 sm:p-6 pb-2">
        <button onClick={onClose} className="p-2 bg-bg-surface hover:bg-bg-elevated rounded-full transition-colors text-text-secondary hover:text-text-primary">
          <ChevronDown size={24} />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleLike} className="p-2 bg-bg-surface hover:bg-bg-elevated rounded-full transition-colors">
            <Heart size={20} className={isLiked ? accentColor : "text-text-secondary"} fill={isLiked ? "currentColor" : "none"} />
          </button>
          <button onClick={() => setShowQueue(true)} className="p-2 bg-bg-surface hover:bg-bg-elevated rounded-full transition-colors text-text-secondary hover:text-text-primary">
            <ListMusic size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 custom-scrollbar">
        <div className="max-w-md mx-auto w-full flex flex-col items-center">
          <div className="w-full aspect-square rounded-[24px] overflow-hidden shadow-2xl mb-8 relative group">
            <img src={currentSong.cover_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
          </div>
          <div className="w-full text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-studio font-bold tracking-tight mb-2 truncate">{formatDisplayTitle(currentSong.title)}</h2>
            <p className="text-text-secondary text-lg font-medium truncate">{(currentSong as any).featured_artist ? `${currentSong.artist_name} ft. ${(currentSong as any).featured_artist}` : currentSong.artist_name}</p>
          </div>
          <div className="w-full mb-8">
             <ProgressBar current={currentTime} total={displayDuration} onSeek={seek} disabled={adPlaying} />
             <div className="flex justify-between text-xs font-medium text-text-muted mt-2 tracking-widest uppercase">
               <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}</span>
               <span>{Math.floor(displayDuration / 60)}:{(Math.floor(displayDuration) % 60).toString().padStart(2, '0')}</span>
             </div>
          </div>
          <div className="flex items-center justify-center gap-6 sm:gap-8 w-full mb-8">
             <button onClick={toggleShuffle} className={`p-2 rounded-full transition-colors ${isShuffle ? accentColor : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`} disabled={adPlaying}><Shuffle size={20} /></button>
             <button onClick={previousTrack} className="p-3 bg-bg-surface hover:bg-bg-elevated text-text-primary rounded-full transition-colors disabled:opacity-50" disabled={adPlaying}><SkipBack size={24} fill="currentColor" /></button>
             <button onClick={togglePlay} className={`w-20 h-20 flex items-center justify-center rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition-all ${accentColor.replace('text-', 'bg-')}`}>
               {isBuffering ? <Loader2 size={32} className="animate-spin" /> : (isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-2" />)}
             </button>
             <button onClick={nextTrack} className="p-3 bg-bg-surface hover:bg-bg-elevated text-text-primary rounded-full transition-colors disabled:opacity-50" disabled={adPlaying}><SkipForward size={24} fill="currentColor" /></button>
             <button onClick={toggleRepeat} className={`p-2 rounded-full transition-colors ${repeatMode !== 'none' ? accentColor : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`} disabled={adPlaying}><Repeat size={20} /></button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const GlobalPlayer = () => {
  const { 
    currentSong, isPlaying, isBuffering, togglePlay, currentTime, duration, 
    seek, volume, setVolume, nextTrack, previousTrack, 
    eqPreset, setEQPreset, playbackRate, setPlaybackRate,
    sleepTimerRemaining, setSleepTimer, pauseSong, playSong,
    radioMode, toggleRadioMode, adPlaying, adSkipAvailable, skipAd,
    isShuffle, toggleShuffle, repeatMode, toggleRepeat,
    purchasedIds, queue, removeFromQueue
  } = usePlayer();
  const { role, userProfile } = useAuth();
  const requireAuth = useRequireAuth();
  
  const accentColor = role === 'artist' ? 'smash-purple' : 'smash-orange';
  const displayDuration = adPlaying ? Math.min(30, duration || 30) : duration;
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  const currentSongRef = React.useRef<HTMLDivElement>(null);

  const toggleMute = () => {
    setVolume(volume === 0 ? 1 : 0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!userProfile?.id || !currentSong?.id) return;
    const checkLike = async () => {
      const { data } = await supabase.from('likes').select('id').eq('profile_id', userProfile.id).eq('song_id', currentSong.id).maybeSingle();
      setIsLiked(!!data);
    };
    checkLike();
  }, [currentSong?.id, userProfile?.id]);

  const handleLike = async () => {
    if (!userProfile || !currentSong) {
      requireAuth(() => {}, 'Sign in to like this track');
      return;
    }
    const previouslyLiked = isLiked;
    setIsLiked(!previouslyLiked);
    if (previouslyLiked) {
      await supabase.from('likes').delete().eq('profile_id', userProfile.id).eq('song_id', currentSong.id);
    } else {
      await supabase.from('likes').insert({ profile_id: userProfile.id, song_id: currentSong.id });
    }
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSong) return;
    requireAuth(() => {
      purchaseTrack({ song: currentSong, user: userProfile });
    }, 'Sign in to buy this track');
  };

  if (!currentSong) return null;

  return (
    <>
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 z-[60] px-2 md:px-0 md:pb-0 md:pl-[var(--sidebar-width,240px)] pointer-events-none transition-all duration-300">
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-bg-surface/90 backdrop-blur-[12px] rounded-[14px] md:rounded-none border border-border-subtle md:border-x-0 md:border-b-0 md:border-t-border-default h-[64px] md:h-[80px] w-full flex items-center px-3 md:px-6 pointer-events-auto shadow-[0px_4px_24px_rgba(0,0,0,0.1)] md:shadow-none"
        >
          {/* Top Progress Line for Mobile (Desktop uses different layout) */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-border-default md:hidden touch-none"
             onMouseDown={(e) => {
               if (adPlaying) return;
               const rect = e.currentTarget.getBoundingClientRect();
               const percent = (e.clientX - rect.left) / rect.width;
               seek(percent * displayDuration);
             }}
          >
            <motion.div 
              className={`h-full ${accentColor.replace('text-', 'bg-')} opacity-80`}
              style={{ width: `${(currentTime / displayDuration) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between w-full gap-4 relative">
            {/* [art 48px | title+artist flex] */}
            <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer w-auto lg:w-1/4" onClick={() => setIsExpanded(true)}>
              <div className="relative w-[48px] h-[48px] rounded-[10px] overflow-hidden flex-shrink-0 group">
                <img src={currentSong.cover_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <Maximize2 size={16} />
                </div>
              </div>
              <div className="flex flex-col min-w-0 justify-center">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-studio font-bold text-sm text-text-primary truncate">{formatDisplayTitle(currentSong.title)}</h3>
                  {currentSong.is_for_sale && !currentSong.is_purchased && !purchasedIds.has(currentSong.id) && (
                    <span className={`px-1.5 py-0.5 rounded-full ${accentColor.replace('text-', 'bg-')}/10 ${accentColor} text-[8px] font-display font-semibold uppercase tracking-wide`}><FormattedPrice song={currentSong} /></span>
                  )}
                </div>
                <p className="font-sans text-xs text-text-secondary truncate">{((currentSong as any).featured_artist ? `${currentSong.profiles?.stage_name || currentSong.artist_name} ft. ${(currentSong as any).featured_artist}` : (currentSong.profiles?.stage_name || currentSong.artist_name))}</p>
              </div>
            </div>

            {/* Mobile Actions: Like & Play */}
            <div className="flex items-center gap-4 md:hidden">
              <button onClick={(e) => { e.stopPropagation(); handleLike(); }} aria-label={isLiked ? "Unlike" : "Like"} className="text-text-muted hover:text-text-primary focus:outline-none">
                <motion.div whileTap={{ scale: 0.8 }}>
                  <Heart size={20} fill={isLiked ? "currentColor" : "none"} className={isLiked ? 'text-red-400' : ''} />
                </motion.div>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className={`w-[44px] h-[44px] rounded-full flex items-center justify-center text-white ${accentColor.replace('text-', 'bg-')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-surface focus:ring-${accentColor.replace('text-', '')}`}
              >
                {isBuffering && isPlaying ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" className="ml-1" />
                )}
              </button>
            </div>

            {/* [prev · PLAY · next · progress] (Desktop) */}
            <div className="hidden md:flex flex-col flex-1 items-center max-w-[500px]">
              <div className="flex items-center gap-5">
                <button 
                  onClick={toggleShuffle} 
                  disabled={adPlaying}
                  className={`text-text-muted hover:text-text-primary focus:outline-none rounded-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-surface focus:ring-border-default ${isShuffle ? accentColor : ''}`}
                >
                  <Shuffle size={18} />
                </button>
                <button onClick={previousTrack} aria-label="Previous track" disabled={adPlaying} className="text-text-muted hover:text-text-primary focus:outline-none rounded-sm">
                  <SkipBack size={20} fill="currentColor" />
                </button>
                <button 
                  onClick={togglePlay}
                  className={`w-[44px] h-[44px] rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-surface focus:ring-${accentColor.replace('text-', '')} ${accentColor.replace('text-', 'bg-')}`}
                >
                  {isBuffering && isPlaying ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={20} fill="currentColor" />
                ) : (
                  <Play size={20} fill="currentColor" className="ml-1" />
                )}
                </button>
                <button onClick={nextTrack} aria-label="Next track" disabled={adPlaying} className="text-text-muted hover:text-text-primary focus:outline-none rounded-sm">
                  <SkipForward size={20} fill="currentColor" />
                </button>
                <button 
                  onClick={toggleRepeat} 
                  disabled={adPlaying}
                  className={`text-text-muted hover:text-text-primary relative focus:outline-none rounded-sm ${repeatMode !== 'off' ? accentColor : ''}`}
                >
                  <Repeat size={18} />
                  {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-display font-bold">1</span>}
                </button>
              </div>

              {/* Progress Bar (Desktop) */}
              <div className="flex items-center gap-2 w-full mt-1.5 group cursor-pointer"
                 onMouseDown={(e) => {
                   if (adPlaying) return;
                   const rect = e.currentTarget.getBoundingClientRect();
                   const percent = (e.clientX - rect.left) / rect.width;
                   seek(percent * displayDuration);
                 }}
              >
                <span className="text-[10px] font-display text-text-muted w-8 text-right">{formatTime(currentTime)}</span>
                <div className="flex-1 h-1 bg-border-default rounded-full relative overflow-visible flex items-center">
                   <motion.div 
                     className={`h-full ${accentColor.replace('text-', 'bg-')} rounded-full`}
                     style={{ width: `${(currentTime / displayDuration) * 100}%` }}
                   />
                   <div className="absolute w-3 h-3 bg-white rounded-full shadow border border-border-default opacity-0 group-hover:opacity-100 transition-opacity -ml-1.5" style={{ left: `${(currentTime / displayDuration) * 100}%` }} />
                </div>
                <span className="text-[10px] font-display text-text-muted w-8">{formatTime(displayDuration)}</span>
              </div>
            </div>

            {/* [vol · like · expand] (Desktop) */}
            <div className="hidden md:flex flex-row items-center justify-end gap-4 lg:w-1/4">
               <button onClick={handleLike} aria-label={isLiked ? "Unlike" : "Like"} className={`${isLiked ? 'text-red-400' : 'text-text-muted hover:text-text-primary'} transition-colors focus:outline-none`}>
                 <motion.div whileTap={{ scale: 0.8 }}>
                   <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                 </motion.div>
               </button>
               <div className="flex items-center gap-2 w-[100px] group cursor-pointer"
                   onWheel={(e) => {
                      const newVol = Math.max(0, Math.min(1, volume - Math.sign(e.deltaY) * 0.05));
                      setVolume(newVol);
                   }}
               >
                 <button onClick={toggleMute} aria-label={volume === 0 ? "Unmute" : "Mute"} className="text-text-muted hover:text-text-primary focus:outline-none">
                    {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                 </button>
                 <div className="flex-1 h-1 bg-border-default rounded-full relative overflow-visible flex items-center">
                   <div 
                     className={`absolute left-0 top-0 bottom-0 ${accentColor.replace('text-', 'bg-')} rounded-full transition-all group-hover:opacity-100 opacity-80`}
                     style={{ width: `${volume * 100}%` }}
                   />
                   <div className="absolute w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity -ml-1" style={{ left: `${volume * 100}%` }} />
                 </div>
               </div>
               <button onClick={() => setIsExpanded(true)} aria-label="Expand player" className="text-text-muted hover:text-text-primary p-2 focus:outline-none rounded-lg hover:bg-bg-elevated transition-colors">
                 <Maximize2 size={16} />
               </button>
               <button 
                  onClick={() => setShowQueueModal(true)}
                  className="text-text-muted hover:text-text-primary p-2 focus:outline-none rounded-lg hover:bg-bg-elevated transition-colors relative"
                >
                  <ListMusic size={16} />
                  {queue.length > 0 && (
                    <span className={`absolute top-0 right-0 w-3.5 h-3.5 ${accentColor.replace('text-', 'bg-')} text-white text-[8px] font-bold rounded-full flex items-center justify-center`}>
                      {queue.length}
                    </span>
                  )}
                </button>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && <ExpandedPlayer onClose={() => setIsExpanded(false)} isLiked={isLiked} handleLike={handleLike} />}
      </AnimatePresence>

      {/* Preview Limit Modal Overlay */}
      <PreviewModal />

      {/* Queue Modal */}
      <AnimatePresence>
        {showQueueModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowQueueModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-lg bg-bg-modal border border-border-default rounded-[24px] p-6 sm:p-8 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl sm:text-2xl font-studio font-bold tracking-tight">Queue</h3>
                <button onClick={() => setShowQueueModal(false)} aria-label="Close queue" className="p-2 bg-bg-surface hover:bg-bg-elevated rounded-full transition-colors text-text-secondary hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {queue.length > 0 ? queue.map((song, i) => (
                  <div 
                    key={`${song.id}-${i}`}
                    ref={currentSong?.id === song.id ? currentSongRef : null}
                    className={`p-3 rounded-[12px] flex items-center gap-3 group transition-colors cursor-pointer ${currentSong?.id === song.id ? `${accentColor.replace('text-', 'bg-')}/10 border border-${accentColor.replace('text-', '')}/20` : 'hover:bg-bg-hover'}`}
                    onClick={() => playSong(song)}
                  >
                    <div className="w-10 h-10 rounded-[8px] overflow-hidden flex-shrink-0 relative">
                       <img src={song.cover_url} className="w-full h-full object-cover" alt="" />
                       {currentSong?.id === song.id && (
                         <div className={`absolute inset-0 ${accentColor.replace('text-', 'bg-')}/40 flex items-center justify-center`}>
                           <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                             <Play size={16} fill="white" />
                           </motion.div>
                         </div>
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-studio font-semibold text-sm truncate ${currentSong?.id === song.id ? accentColor : 'text-text-primary'}`}>{formatDisplayTitle(song.title)}</p>
                      <p className="text-xs text-text-secondary font-medium truncate">{(song as any).featured_artist ? `${song.artist_name} ft. ${(song as any).featured_artist}` : song.artist_name}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFromQueue(song.id); }}
                        className="p-2 hover:bg-bg-elevated rounded-full text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center opacity-50 font-medium text-sm text-text-muted">Queue is empty</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const PreviewModal = () => {
   const { userProfile } = useAuth();
  const requireAuth = useRequireAuth();
   const [song, setSong] = useState<any>(null);

   useEffect(() => {
      const handler = (e: any) => {
         const currentSongId = e.detail?.id;
         let dismissedSongs: string[] = [];
         try {
            dismissedSongs = JSON.parse(sessionStorage.getItem('smash_dismissed_previews') || '[]');
         } catch (e) {
            dismissedSongs = [];
         }
         if (!dismissedSongs.includes(currentSongId)) {
            setSong(e.detail);
         }
      };
      document.addEventListener('smash_preview_limit', handler);
      return () => document.removeEventListener('smash_preview_limit', handler);
   }, []);

   const handleDismiss = () => {
      if (song) {
         let dismissedSongs: string[] = [];
         try {
            dismissedSongs = JSON.parse(sessionStorage.getItem('smash_dismissed_previews') || '[]');
         } catch (e) {
            dismissedSongs = [];
         }
         sessionStorage.setItem('smash_dismissed_previews', JSON.stringify([...dismissedSongs, song.id]));
         setSong(null);
      }
   };

   const handleBuy = () => {
      
      requireAuth(() => {
      purchaseTrack({
        song,
        user: userProfile
      });
    }, 'Sign in to buy this track');
   };

   if (!song) return null;

   return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
         <motion.div 
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
           className="absolute inset-0 bg-black/90 backdrop-blur-xl"
           onClick={() => setSong(null)}
         />
         <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="relative z-10 bento-card max-w-md w-full bg-smash-dark p-12 text-center border-smash-orange/20 shadow-[0_0_100px_rgba(255,95,0,0.2)]"
         >
            <div className="w-20 h-20 bg-smash-orange/10 rounded-full flex items-center justify-center mx-auto mb-8">
               <Headphones size={40} className="text-smash-orange" />
            </div>
            <h2 className="text-4xl font-black font-display italic uppercase tracking-tighter mb-4 leading-none">Enjoying the <span className="text-smash-orange">vibe?</span></h2>
            <p className="text-text-secondary text-lg mb-10 font-medium tracking-tight">Buy the full track to support the artist and hear the rest of this anthem.</p>
            
            <div className="space-y-4">
               <button onClick={handleBuy} aria-label="Buy song" className="w-full py-6 bg-smash-orange text-white rounded-[24px] font-black text-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-smash-orange/20">
                  BUY NOW <FormattedPrice song={song} />
               </button>
               <button onClick={handleDismiss} aria-label="Dismiss ad" className="w-full py-4 text-text-secondary font-display font-bold uppercase text-sm tracking-widest hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-colors">
                  Maybe Later
               </button>
            </div>
         </motion.div>
      </div>
   );
};

export default GlobalPlayer;
