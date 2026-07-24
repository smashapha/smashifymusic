import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Lock as AppLockIcon, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, Maximize2, Minimize2, Radio, Heart, Mic2, X, Share2, AlertCircle, Coins, Gift, RefreshCw, Crown, Info, Lock, ChevronDown, ListMusic, MoreVertical, Search, Plus, Trash2, CheckCircle, Loader2, ShoppingBag, Gauge, Clock, Zap, Download, Headphones, SlidersHorizontal, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/AuthGateContext';
import { EQPreset } from '../../types';
import { purchaseTrack } from '../../lib/paychangu';
import { getEffectivePrice, isOnSale, getSaleTimeRemaining } from '../../lib/pricing';
import { downloadPurchasedSong, handleTrackDownload, checkDownloadPermission } from '../../lib/downloads';
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
    adPlaying, isShuffle, toggleShuffle, repeatMode, toggleRepeat,
    purchasedIds, queue, playSong,
    crossfadeEnabled, toggleCrossfade, crossfadeDuration, setCrossfadeDuration,
    dataSaver, toggleDataSaver, eqPreset, setEQPreset, playbackRate, setPlaybackRate,
    sleepTimerRemaining, setSleepTimer
  } = usePlayer();
  const { role, userProfile } = useAuth();
  const requireAuth = useRequireAuth();
  
  const accentBg = role === 'artist' ? 'bg-smash-purple' : 'bg-blue-600';
  const displayDuration = adPlaying ? Math.min(30, duration || 30) : duration;
  const [showQueue, setShowQueue] = useState(false);
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);
  
  // Lyrics Drawer State
  const [showLyricsDrawer, setShowLyricsDrawer] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  const formatTime = (time: number) => {
    if (isNaN(time) || !time) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    if (!currentSong) return;
    const toastId = toast.loading('Preparing download...');
    try {
      await handleTrackDownload(
        currentSong,
        userProfile,
        purchasedIds,
        () => requireAuth(() => {}, 'Sign in to download music')
      );
      toast.success('Download started!', { id: toastId });
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error(err?.message || 'Failed to download track.', { id: toastId });
    }
  };

  const fetchLyrics = async () => {
    if (!currentSong) return;
    setLoadingLyrics(true);
    setShowLyricsDrawer(true);
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('lyrics')
        .eq('id', currentSong.id)
        .maybeSingle();
      
      if (data?.lyrics) {
        setLyrics(data.lyrics);
      } else {
        setLyrics("No lyrics found for this song.\n\nEnjoy the music!");
      }
    } catch (err) {
      setLyrics("Error loading lyrics.");
    }
    setLoadingLyrics(false);
  };

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="fixed inset-0 z-[100] bg-[#0E0E12] text-white flex flex-col justify-between overflow-hidden selection:bg-blue-500/30"
    >
      {/* Background ambient glow matching current artwork */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <img 
          src={currentSong.cover_url} 
          className="w-full h-full object-cover blur-[120px] scale-125" 
          alt="" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E0E12]/80 via-[#0E0E12]/90 to-[#0E0E12]" />
      </div>

      {/* Top Header Row */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6 sm:pt-8 pb-4">
        <button 
          onClick={onClose} 
          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-white/80 hover:text-white"
          aria-label="Minimize player"
        >
          <ChevronDown size={22} />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display font-medium text-xs sm:text-sm tracking-wide text-white/70">
            Now Playing
          </span>
        </div>

        <button 
          onClick={handleLike} 
          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all"
          aria-label={isLiked ? "Unlike song" : "Like song"}
        >
          <Heart 
            size={20} 
            className={isLiked ? "text-blue-500 fill-blue-500" : "text-white/70 hover:text-white"} 
          />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-12 max-w-lg mx-auto w-full my-auto">
        {/* Large Artwork */}
        <div className="w-full max-w-[320px] sm:max-w-[360px] aspect-square rounded-[32px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border border-white/10 relative group mb-6 transition-transform duration-500 hover:scale-[1.02]">
          <img 
            src={currentSong.cover_url} 
            className="w-full h-full object-cover" 
            alt={currentSong.title} 
            referrerPolicy="no-referrer" 
          />
        </div>

        {/* Title & Artist & Sale Status */}
        <div className="w-full text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-studio font-bold tracking-tight text-white mb-1 truncate">
            {formatDisplayTitle(currentSong.title)}
          </h2>
          <p className="text-white/60 text-base sm:text-lg font-medium truncate mb-2">
            {(currentSong as any).featured_artist ? `${currentSong.artist_name} ft. ${(currentSong as any).featured_artist}` : currentSong.artist_name}
          </p>

          {/* Sale / Pricing / Purchase Status Banner */}
          {currentSong.is_for_sale && !currentSong.is_purchased && !purchasedIds.has(currentSong.id) ? (
            <div className="inline-flex flex-col items-center gap-1.5 mt-1">
              {isOnSale(currentSong) && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-red-500/20 via-amber-500/20 to-red-500/20 border border-red-500/40 text-red-400 text-[11px] font-black uppercase tracking-wider animate-pulse shadow-lg shadow-red-500/20">
                  <Zap size={13} className="text-amber-400 fill-amber-400" />
                  <span>ON SALE! {currentSong.discount_percent}% OFF</span>
                  {getSaleTimeRemaining(currentSong) && (
                    <span className="opacity-80 font-mono">({getSaleTimeRemaining(currentSong)})</span>
                  )}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  requireAuth(() => {
                    purchaseTrack({ song: currentSong, user: userProfile });
                  }, 'Sign in to buy this track');
                }}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 via-sky-600 to-blue-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all border border-blue-400/30"
              >
                <ShoppingBag size={15} />
                <span>Buy Track • </span>
                <FormattedPrice song={currentSong} />
              </button>
            </div>
          ) : currentSong.is_for_sale ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle size={14} />
              <span>Purchased Track</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 border border-white/10 text-white/70 text-xs font-semibold">
              <span>Free Track</span>
            </div>
          )}
        </div>

        {/* Progress Bar & Timestamps */}
        <div className="w-full mb-8">
          <div 
            className="group relative h-2 bg-white/15 rounded-full cursor-pointer touch-none"
            onMouseDown={(e) => {
              if (adPlaying) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              seek(percent * displayDuration);
            }}
          >
            <div 
              className="h-full bg-blue-500 rounded-full relative"
              style={{ width: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%` }}
            >
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-600 scale-100 group-hover:scale-125 transition-transform"
                style={{ right: '-8px' }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs font-mono font-medium text-white/50 mt-2.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(displayDuration)}</span>
          </div>
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between w-full max-w-[340px] mb-6">
          <button 
            onClick={toggleShuffle} 
            className={`p-3 rounded-full transition-all ${isShuffle ? 'text-blue-400 bg-blue-500/20' : 'text-white/60 hover:text-white'}`}
            disabled={adPlaying}
            aria-label="Toggle shuffle"
          >
            <Shuffle size={20} />
          </button>

          <button 
            onClick={previousTrack} 
            className="p-3 text-white/80 hover:text-white transition-transform active:scale-90 disabled:opacity-50" 
            disabled={adPlaying}
            aria-label="Previous track"
          >
            <SkipBack size={26} fill="currentColor" />
          </button>

          <button 
            onClick={togglePlay} 
            className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isBuffering ? (
              <Loader2 size={30} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={30} fill="currentColor" />
            ) : (
              <Play size={30} fill="currentColor" className="ml-1" />
            )}
          </button>

          <button 
            onClick={nextTrack} 
            className="p-3 text-white/80 hover:text-white transition-transform active:scale-90 disabled:opacity-50" 
            disabled={adPlaying}
            aria-label="Next track"
          >
            <SkipForward size={26} fill="currentColor" />
          </button>

          <button 
            onClick={toggleRepeat} 
            className={`p-3 rounded-full transition-all relative ${repeatMode !== 'off' ? 'text-blue-400 bg-blue-500/20' : 'text-white/60 hover:text-white'}`}
            disabled={adPlaying}
            aria-label="Toggle repeat"
          >
            <Repeat size={20} />
            {repeatMode === 'one' && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-blue-500 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                1
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Audio Device & Swipe Up Lyrics Footer */}
      <div className="relative z-10 px-6 pb-6 pt-2 max-w-lg mx-auto w-full flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-4">
          {/* Audio & Playback Options Menu Button */}
          <div className="relative">
            <button 
              onClick={() => setShowPlayerMenu(!showPlayerMenu)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold transition-all shadow-lg shadow-black/40 hover:scale-105 active:scale-95"
              aria-label="Player Settings Menu"
            >
              <SlidersHorizontal size={15} className="text-blue-400" />
              <span>Menu</span>
              {crossfadeEnabled ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Crossfade Active" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-white/30" title="Crossfade Inactive" />
              )}
            </button>

            {/* Audio Settings Popover */}
            <AnimatePresence>
              {showPlayerMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-12 left-0 z-50 w-80 sm:w-88 bg-[#16161D] border border-white/15 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl text-left"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <SlidersHorizontal size={16} className="text-blue-400" />
                      <span>Audio & Playback Settings</span>
                    </div>
                    <button 
                      onClick={() => setShowPlayerMenu(false)}
                      className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                      aria-label="Close menu"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
                    {/* Crossfade Section */}
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className={crossfadeEnabled ? "text-emerald-400" : "text-white/40"} />
                          <div>
                            <p className="text-xs font-bold text-white leading-tight">Crossfade Tracks</p>
                            <p className="text-[10px] text-white/50 leading-tight">Seamless song transitions</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            toggleCrossfade();
                            toast.success(!crossfadeEnabled ? 'Crossfade activated' : 'Crossfade deactivated');
                          }}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all flex items-center gap-1.5 ${
                            crossfadeEnabled 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' 
                              : 'bg-white/10 text-white/50 border border-white/10 hover:text-white'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${crossfadeEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
                          {crossfadeEnabled ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </div>

                      {crossfadeEnabled && (
                        <div className="pt-2 border-t border-white/5">
                          <p className="text-[10px] text-white/60 mb-2 font-semibold">Transition Blend Time:</p>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[2, 3, 5, 8, 12].map((sec) => (
                              <button
                                key={sec}
                                onClick={() => {
                                  setCrossfadeDuration(sec);
                                  toast.success(`Crossfade set to ${sec}s`);
                                }}
                                className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  crossfadeDuration === sec 
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 scale-105' 
                                    : 'bg-white/5 hover:bg-white/10 text-white/70'
                                }`}
                              >
                                {sec}s
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Audio Quality Section */}
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gauge size={16} className="text-blue-400" />
                          <span className="text-xs font-bold text-white">Audio Stream Quality</span>
                        </div>
                        <button
                          onClick={() => {
                            toggleDataSaver();
                            toast.success(dataSaver ? 'Switched to 320kbps HD Audio' : 'Data Saver enabled');
                          }}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                            !dataSaver
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {!dataSaver ? '320kbps HD' : 'Data Saver'}
                        </button>
                      </div>
                    </div>

                    {/* Equalizer Presets */}
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Volume2 size={16} className="text-purple-400" />
                        <span className="text-xs font-bold text-white">Equalizer Preset</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'normal', name: 'Normal' },
                          { id: 'bass-boost', name: 'Bass' },
                          { id: 'vocal', name: 'Vocal' },
                          { id: 'electronic', name: 'Electronic' },
                          { id: 'acoustic', name: 'Acoustic' },
                          { id: 'pop', name: 'Pop' },
                          { id: 'rock', name: 'Rock' }
                        ].map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setEQPreset(p.id as EQPreset);
                              toast.success(`EQ set to ${p.name}`);
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                              eqPreset === p.id 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-white/5 hover:bg-white/10 text-white/60'
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Playback Speed */}
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={16} className="text-amber-400" />
                        <span className="text-xs font-bold text-white">Playback Speed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => {
                              setPlaybackRate(rate);
                              toast.success(`Speed: ${rate}x`);
                            }}
                            className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                              playbackRate === rate 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-white/5 hover:bg-white/10 text-white/60'
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sleep Timer */}
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={16} className="text-sky-400" />
                        <span className="text-xs font-bold text-white">
                          Sleep Timer {sleepTimerRemaining ? `(${sleepTimerRemaining}m left)` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[
                          { mins: null, label: 'Off' },
                          { mins: 15, label: '15m' },
                          { mins: 30, label: '30m' },
                          { mins: 45, label: '45m' },
                          { mins: 60, label: '60m' }
                        ].map((timer) => (
                          <button
                            key={timer.label}
                            onClick={() => {
                              setSleepTimer(timer.mins);
                              toast.success(timer.mins ? `Sleep timer set for ${timer.mins}m` : 'Sleep timer turned off');
                            }}
                            className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                              sleepTimerRemaining === timer.mins || (sleepTimerRemaining === null && timer.mins === null)
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-white/5 hover:bg-white/10 text-white/60'
                            }`}
                          >
                            {timer.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>


          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownload} 
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-white/80 hover:text-white text-xs font-semibold shadow-sm"
              title="Download Track"
              aria-label="Download Track"
            >
              <Download size={15} className="text-blue-400" />
              <span>Download</span>
            </button>

            <button 
              onClick={() => setShowQueue(true)} 
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white relative"
              aria-label="Queue"
            >
              <ListMusic size={18} />
              {queue.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {queue.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Swipe up for lyrics Trigger Handle */}
        <motion.div 
          onClick={fetchLyrics}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full cursor-pointer flex flex-col items-center group py-2"
        >
          <div className="w-12 h-1 bg-white/20 rounded-full mb-2.5 group-hover:bg-blue-400 transition-colors" />
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-300/80 group-hover:text-blue-300 transition-colors">
            <span>Swipe up for lyrics</span>
            <Mic2 size={14} className="text-blue-400 animate-bounce" />
          </div>
        </motion.div>
      </div>

      {/* Lyrics Drawer Sheet Overlay */}
      <AnimatePresence>
        {showLyricsDrawer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex flex-col justify-end"
            onClick={() => setShowLyricsDrawer(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl mx-auto h-[85vh] bg-[#14141B] border-t border-white/10 rounded-t-[36px] flex flex-col overflow-hidden shadow-2xl relative"
            >
              {/* Drawer Top Handle */}
              <div className="p-4 flex flex-col items-center border-b border-white/5 relative">
                <div className="w-12 h-1.5 bg-white/20 rounded-full mb-3" />
                <div className="flex items-center justify-between w-full px-4">
                  <div className="flex items-center gap-3">
                    <img src={currentSong.cover_url} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    <div>
                      <h4 className="font-studio font-bold text-sm text-white">{formatDisplayTitle(currentSong.title)}</h4>
                      <p className="text-xs text-white/50">{currentSong.artist_name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowLyricsDrawer(false)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Lyrics Content Container */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 custom-scrollbar text-center">
                {loadingLyrics ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/50 gap-3">
                    <Loader2 size={32} className="animate-spin text-blue-400" />
                    <p className="text-sm font-medium">Fetching lyrics...</p>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-sans text-lg sm:text-xl font-medium leading-relaxed text-white/90 space-y-4">
                    {lyrics}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Queue Drawer Overlay */}
      <AnimatePresence>
        {showQueue && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex flex-col justify-end"
            onClick={() => setShowQueue(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl mx-auto h-[80vh] bg-[#14141B] border-t border-white/10 rounded-t-[36px] flex flex-col overflow-hidden shadow-2xl relative p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <h3 className="text-xl font-studio font-bold text-white">Playback Queue ({queue.length})</h3>
                <button 
                  onClick={() => setShowQueue(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {queue.length > 0 ? (
                  queue.map((song, i) => (
                    <div 
                      key={`${song.id}-${i}`}
                      onClick={() => playSong(song)}
                      className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors ${currentSong.id === song.id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-white/5'}`}
                    >
                      <img src={song.cover_url} className="w-12 h-12 rounded-xl object-cover" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className={`font-studio font-bold text-sm truncate ${currentSong.id === song.id ? 'text-blue-400' : 'text-white'}`}>
                          {formatDisplayTitle(song.title)}
                        </p>
                        <p className="text-xs text-white/50 truncate">{song.artist_name}</p>
                      </div>
                      {currentSong.id === song.id && (
                        <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
                          Playing
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-white/40 font-medium text-sm">Queue is empty</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

  const handleDownloadTrack = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentSong) return;

    const toastId = toast.loading('Preparing download...');
    try {
      await handleTrackDownload(
        currentSong,
        userProfile,
        purchasedIds,
        () => requireAuth(() => {}, 'Sign in to download music')
      );
      toast.success('Download started!', { id: toastId });
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error(err?.message || 'Failed to download track.', { id: toastId });
    }
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
                    <button
                      onClick={handleBuy}
                      className={`px-2 py-0.5 rounded-full ${isOnSale(currentSong) ? 'bg-gradient-to-r from-red-500/20 to-amber-500/20 text-red-400 border border-red-500/30 animate-pulse' : `${accentColor.replace('text-', 'bg-')}/10 ${accentColor}`} text-[9px] font-display font-bold uppercase tracking-wide flex items-center gap-1 hover:scale-105 transition-transform`}
                    >
                      {isOnSale(currentSong) && <Zap size={10} className="text-amber-400 fill-amber-400" />}
                      <FormattedPrice song={currentSong} />
                    </button>
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
               <button 
                 onClick={handleDownloadTrack} 
                 aria-label="Download track" 
                 title="Download track"
                 className="text-text-muted hover:text-text-primary p-2 focus:outline-none rounded-lg hover:bg-bg-elevated transition-colors"
               >
                 <Download size={16} />
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
