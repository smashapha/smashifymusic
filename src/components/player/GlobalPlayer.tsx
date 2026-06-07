import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, 
  ChevronDown, ListMusic, Heart, Shuffle, Repeat, Info, Zap, 
  Wifi, WifiOff, Clock, Headphones, Music2, Gauge, X, Download, Lock as AppLockIcon,
  ShoppingBag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { EQPreset } from '../../types';
import { purchaseTrack } from '../../lib/paychangu';
import toast from 'react-hot-toast';
import { Share2, Trash2 } from 'lucide-react';

import { getListenerTier, getListenerLimits } from '../../lib/tierUtils';

const ExpandedPlayer = ({ onClose, isLiked, handleLike }: { onClose: () => void, isLiked: boolean, handleLike: () => void }) => {
  const { 
    currentSong, isPlaying, togglePlay, currentTime, duration, 
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
    const [dragWidth, setDragWidth] = useState(0);

    const handleInteract = (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = x / rect.width;
      onSeek(percent * total);
    };

    return (
      <div 
        className={`group relative h-2.5 bg-white/10 rounded-full flex-1 md:flex-none cursor-pointer touch-none ${disabled ? 'pointer-events-none opacity-80' : ''}`}
        onMouseDown={(e) => { if (disabled) return; setIsDragging(true); handleInteract(e); }}
        onMouseMove={(e) => { if (!disabled && isDragging) handleInteract(e); }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={(e) => { if (disabled) return; setIsDragging(true); handleInteract(e); }}
        onTouchMove={(e) => { if (!disabled && isDragging) handleInteract(e); }}
        onTouchEnd={() => setIsDragging(false)}
      >
        <motion.div 
          className="h-full bg-gradient-to-r from-smash-orange to-red-500 relative rounded-full"
          style={{ width: `${(current / total) * 100}%` }}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity border-4 border-smash-black" 
          style={{ left: `calc(${(current / total) * 100}% - 10px)` }} 
        />
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
      link.download = `${currentSong.title} - ${displayArtist}.mp3`;
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
    if (!userProfile) {
      toast.error('Please sign in to buy tracks');
      return;
    }
    purchaseTrack({
      song: currentSong,
      user: userProfile
    });
  };

  const presets: EQPreset[] = ['normal', 'bass', 'treble', 'vocal', 'club'];
  const speeds = [0.75, 1, 1.25, 1.5];
  const sleepIntervals = [15, 30, 45, 60];

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-[100] bg-bg-page flex flex-col md:flex-row touch-none"
    >
      {/* Drag Handle for Mobile */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border-default rounded-full z-[110] md:hidden" />

      {/* Background Blur */}
      <div className="absolute inset-0 z-0 overflow-hidden hidden md:block">
        <img 
          src={currentSong?.cover_url} 
          className="w-full h-full object-cover blur-[100px] opacity-20" 
          alt="" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-page via-bg-page/60 to-transparent" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col p-6 md:p-12 overflow-y-auto no-scrollbar pt-12 md:pt-12">
         <div className="flex items-center justify-between mb-8 md:mb-12">
            <button onClick={onClose} className="p-3 bg-bg-surface hover:bg-bg-elevated rounded-full transition-colors text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-page focus:ring-border-default">
               <ChevronDown size={28} />
            </button>
            <div className="text-center flex-1">
              <p className="text-[10px] font-display font-medium text-text-muted uppercase tracking-widest mb-1">{adPlaying ? 'SPONSORED' : 'Now Playing'}</p>
              <h4 className="font-studio font-bold text-sm text-text-primary tracking-tight">{adPlaying ? 'AUDIO ADVERTISEMENT' : currentSong?.genre || 'Album'}</h4>
           </div>
           {adPlaying ? (
             <button 
               onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
               className="p-3 bg-bg-surface hover:bg-bg-elevated rounded-full transition-colors flex items-center gap-2 text-text-secondary hover:text-text-primary focus:outline-none"
             >
               {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
             </button>
           ) : (
             <button className="p-3 bg-bg-surface hover:bg-bg-elevated rounded-full transition-colors text-text-secondary hover:text-text-primary focus:outline-none shadow-[0px_2px_8px_rgba(0,0,0,0.05)]">
               <Info size={24} />
             </button>
           )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-4">
           <motion.div 
             animate={{ scale: isPlaying ? [1, 1.02, 1] : 1 }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
             className={`relative aspect-square w-full max-w-[280px] sm:max-w-[300px] md:max-w-[380px] rounded-[24px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-border-subtle cursor-pointer ${isPlaying ? `shadow-[0_0_80px_rgba(var(--color-${accentColor.replace('text-', '')}),0.2)]` : ''}`}
             onClick={togglePlay}
           >
              <img src={currentSong?.cover_url} className="w-full h-full object-cover" alt={currentSong?.title} />
              {!isPlaying && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-sm">
                   <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                      <Play size={32} className="text-white ml-2" />
                   </div>
                </div>
              )}
           </motion.div>

           <div className="mt-8 md:mt-12 text-center max-w-2xl px-4 flex flex-col items-center">
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl sm:text-3xl md:text-5xl font-studio font-bold tracking-tight text-text-primary mb-1 md:mb-2 line-clamp-2"
              >
                {adPlaying ? currentSong?.artist_name : currentSong?.title}
              </motion.h1>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-lg md:text-xl text-text-secondary font-sans font-medium"
              >
                {adPlaying ? currentSong?.title : (((currentSong as any)?.featured_artist ? `${currentSong?.profiles?.stage_name || currentSong?.artist_name} ft. ${(currentSong as any)?.featured_artist}` : (currentSong?.profiles?.stage_name || currentSong?.artist_name)))}
              </motion.p>
              {adPlaying && (
                 <div className="mt-8">
                   <p className="text-xs font-display font-semibold uppercase tracking-widest text-text-muted mb-4">Malaŵi's No.1 Music Platform</p>
                   <a 
                     href="/pricing"
                     className={`inline-block px-8 py-4 bg-gradient-to-r ${accentColor.replace('text-', 'from-')} to-red-500 text-white rounded-full font-display font-bold uppercase text-sm tracking-widest shadow-xl hover:scale-105 transition-transform`}
                   >
                     Remove ads — Premium MK 2,000/month
                   </a>
                 </div>
              )}
           </div>
        </div>

         <div className="mt-auto w-full max-w-4xl mx-auto pt-6 pb-2">
           {/* Progress Bar */}
           <div className="space-y-3 mb-6 md:mb-8 relative">
              <ProgressBar 
                current={currentTime} 
                total={displayDuration} 
                onSeek={seek} 
                disabled={adPlaying} 
              />
              <div className="flex justify-between text-xs font-display font-medium text-text-muted uppercase">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(displayDuration)}</span>
              </div>
           </div>

           {/* Controls */}
           <div className="flex flex-col gap-6 md:gap-8">
              <div className="flex items-center justify-between">
                <button 
                  onClick={toggleShuffle}
                  disabled={adPlaying} 
                  className={`transition-all p-3 rounded-full ${adPlaying ? 'opacity-20 cursor-not-allowed' : isShuffle ? `${accentColor} bg-${accentColor.replace('text-', 'bg-')}/10` : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'}`}
                >
                  <Shuffle size={20} />
                </button>
                
                <div className="flex items-center gap-6 md:gap-10">
                   <button onClick={previousTrack} disabled={adPlaying} className={`transition-colors active:scale-95 ${adPlaying ? 'opacity-20 cursor-not-allowed' : `text-text-secondary hover:text-text-primary`}`}>
                     <SkipBack className="w-8 h-8 md:w-10 md:h-10" fill="currentColor" />
                   </button>
                   <button onClick={togglePlay} className={`w-16 h-16 md:w-20 md:h-20 rounded-full text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0px_4px_16px_rgba(0,0,0,0.2)] ${accentColor.replace('text-', 'bg-')}`}>
                      {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10" fill="currentColor" /> : <Play className="w-8 h-8 md:w-10 md:h-10 ml-1.5" fill="currentColor" />}
                   </button>
                   <button onClick={nextTrack} disabled={adPlaying} className={`transition-colors active:scale-95 ${adPlaying ? 'opacity-20 cursor-not-allowed' : `text-text-secondary hover:text-text-primary`}`}>
                     <SkipForward className="w-8 h-8 md:w-10 md:h-10" fill="currentColor" />
                   </button>
                </div>

                <button 
                  onClick={toggleRepeat}
                  disabled={adPlaying} 
                  className={`transition-all p-3 rounded-full relative ${adPlaying ? 'opacity-20 cursor-not-allowed' : repeatMode !== 'off' ? `${accentColor} bg-${accentColor.replace('text-', 'bg-')}/10` : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'}`}
                >
                  <Repeat size={20} />
                  {repeatMode === 'one' && (
                    <span className="absolute top-2.5 right-2 text-[8px] font-bold">1</span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 overflow-x-auto no-scrollbar py-2">
                 {presets.map(p => (
                   <button 
                     key={p}
                     onClick={() => setEQPreset(p)}
                     className={`px-4 py-1.5 rounded-full text-[11px] font-display font-medium uppercase tracking-wider transition-all flex-shrink-0 border ${eqPreset === p ? `border-transparent ${accentColor.replace('text-', 'bg-')} text-white` : 'border-border-default bg-transparent text-text-secondary hover:text-text-primary'}`}
                   >
                     {p}
                   </button>
                 ))}
              </div>
           </div>
                     {/* Bottom Toolbar */}
           <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-border-default relative">
              <div className="flex items-center gap-3 md:gap-4 flex-1">
                 {!currentSong?.is_purchased && !purchasedIds.has(currentSong?.id || '') && currentSong?.is_for_sale && (
                   <button 
                     onClick={(e: any) => handleBuy(e)}
                     className={`flex items-center gap-2 px-6 py-3 text-white rounded-full font-display font-bold uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-transform shadow-md mr-4 ${accentColor.replace('text-', 'bg-')}`}
                   >
                     <ShoppingBag size={20} />
                     Buy MK {currentSong.price}
                   </button>
                 )}
                 <button 
                   onClick={handleLike}
                   className={`transition-colors p-2 rounded-full hover:bg-bg-elevated ${isLiked ? 'text-red-400' : 'text-text-muted hover:text-text-primary'}`}
                 >
                   <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
                 </button>
                 <div className="flex items-center gap-3 flex-1 max-w-[120px] md:max-w-[200px]">
                   <button onClick={toggleMute} className="text-text-muted hover:text-text-primary transition-colors">
                      {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                   </button>
                   <input 
                     type="range" 
                     min="0" max="1" step="0.01" value={volume}
                     onChange={(e) => setVolume(parseFloat(e.target.value))}
                     className={`w-full accent-${accentColor.replace('text-', '')} bg-border-default h-1.5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-${accentColor.replace('text-', '')}`}
                   />
                 </div>
              </div>

              <div className="flex text-xs font-display font-medium items-center gap-4 md:gap-6">
                 {/* Speed Selector */}
                 <div className="relative">
                   <button 
                     onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                     className={`flex items-center gap-2 uppercase transition-colors px-2 py-1.5 rounded-md hover:bg-bg-elevated ${playbackRate !== 1 || showSpeedMenu ? accentColor : 'text-text-secondary hover:text-text-primary'}`}
                   >
                     <Gauge size={18} /> {playbackRate}x
                   </button>
                   {showSpeedMenu && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full mb-2 right-0 bg-bg-modal border border-border-default rounded-xl p-2 w-32 shadow-xl z-[150]">
                       {speeds.map(s => (
                         <button key={s} onClick={() => { setPlaybackRate(s); setShowSpeedMenu(false); }} className={`w-full p-2 text-left font-medium rounded-lg transition-colors ${playbackRate === s ? `${accentColor.replace('text-', 'bg-')} text-white` : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}`}>
                           {s}x
                         </button>
                       ))}
                     </motion.div>
                   )}
                 </div>

                 {/* Sleep Timer */}
                 <div className="relative">
                   <button 
                     onClick={() => setShowSleepMenu(!showSleepMenu)} 
                     className={`flex items-center gap-2 uppercase transition-colors px-2 py-1.5 rounded-md hover:bg-bg-elevated ${sleepTimerRemaining || showSleepMenu ? accentColor : 'text-text-secondary hover:text-text-primary'}`}
                   >
                     <Clock size={18} /> {sleepTimerRemaining ? `${sleepTimerRemaining}m` : 'Timer'}
                   </button>
                   {showSleepMenu && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full mb-2 right-0 bg-bg-modal border border-border-default rounded-xl p-2 w-40 shadow-xl z-[150]">
                       {sleepIntervals.map(t => (
                         <button key={t} onClick={() => { setSleepTimer(t); setShowSleepMenu(false); }} className="w-full p-2 text-left font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary rounded-lg transition-colors">
                           {t} mins
                         </button>
                       ))}
                       {sleepTimerRemaining && (
                         <button onClick={() => { setSleepTimer(null); setShowSleepMenu(false); }} className="w-full mt-1.5 p-2 text-center font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                           Cancel Timer
                         </button>
                       )}
                     </motion.div>
                   )}
                 </div>

                 <button 
                   onClick={fetchLyrics} 
                   className="flex items-center gap-2 uppercase text-text-secondary hover:text-text-primary hover:bg-bg-elevated px-2 py-1.5 rounded-md transition-colors"
                 >
                   <Zap size={18} /> Lyrics
                 </button>
                 
                 <button 
                   onClick={() => {
                     const limits = getListenerLimits(userProfile);
                     if (!limits.canDownload) {
                       toast.error("Downloads are for Premium and Family plans only.");
                       return;
                     }
                     handleDownload();
                   }} 
                   className={`flex items-center gap-2 uppercase transition-colors px-2 py-1.5 rounded-md hover:bg-bg-elevated ${!getListenerLimits(userProfile).canDownload ? 'text-red-400/80' : 'text-text-secondary hover:text-text-primary'}`}
                 >
                   {!getListenerLimits(userProfile).canDownload ? <AppLockIcon size={15} className="mr-1" /> : <Download size={18} />} Download
                 </button>
              </div>
          </div>
        </div>
      </div>

      {/* Side Panel (Desktop Only) */}
      <div className="hidden md:flex w-[320px] lg:w-[400px] bg-bg-surface border-l border-border-default relative z-20 flex-col">
         <div className="p-8 h-full flex flex-col">
            <h3 className="text-xl font-studio font-bold tracking-tight mb-6">Up Next</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
               {usePlayer().queue.slice(0, 50).map((song, i) => (
                 <div key={`${song.id}-${i}`} onClick={() => playSong(song)} className={`p-3 rounded-[12px] cursor-pointer transition-colors ${currentSong?.id === song.id ? `${accentColor.replace('text-', 'bg-')}/10 border border-${accentColor.replace('text-', '')}/20` : 'hover:bg-bg-hover'} flex items-center gap-3`}>
                    <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                       <img src={song.cover_url} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="min-w-0 flex-1">
                       <p className={`font-studio font-semibold text-sm truncate ${currentSong?.id === song.id ? accentColor : 'text-text-primary'}`}>{song.title}</p>
                       <p className="text-xs text-text-secondary font-medium truncate">{(song as any).featured_artist ? `${song.artist_name} ft. ${(song as any).featured_artist}` : song.artist_name}</p>
                    </div>
                 </div>
               ))}
               {usePlayer().queue.length === 0 && (
                 <p className="text-text-muted text-center text-sm font-medium py-8">Queue is empty</p>
               )}
            </div>
         </div>
      </div>

      {/* Lyrics Modal */}
      <AnimatePresence>
        {showLyricsModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               onClick={() => setShowLyricsModal(false)}
             />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 w-full max-w-lg bg-bg-modal border border-border-default rounded-[24px] p-6 sm:p-8 shadow-2xl flex flex-col max-h-[85vh]"
             >
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-xl sm:text-2xl font-studio font-bold tracking-tight text-text-primary">Lyrics</h3>
                   <button onClick={() => setShowLyricsModal(false)} className="p-2 bg-bg-surface hover:bg-bg-elevated rounded-full transition-colors text-text-secondary hover:text-text-primary">
                     <X size={20} />
                   </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                  {loadingLyrics ? (
                    <div className="flex items-center justify-center h-40">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                         <Zap size={32} className={`${accentColor} opacity-50`} />
                      </motion.div>
                    </div>
                  ) : (
                    <p className="text-base sm:text-lg text-text-primary font-medium whitespace-pre-line leading-relaxed pb-8">
                      {lyrics}
                    </p>
                  )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

const GlobalPlayer: React.FC = () => {
  const { 
    currentSong, isPlaying, togglePlay, currentTime, duration, 
    volume, setVolume, dataSaver, toggleDataSaver, isExpanded, setIsExpanded,
    queue, nextTrack, previousTrack, radioMode, toggleRadioMode, playSong, adPlaying, adSkipAvailable, skipAd,
    isShuffle, toggleShuffle, repeatMode, toggleRepeat, seek, removeFromQueue, purchasedIds
  } = usePlayer();
  const { role, userProfile } = useAuth();
  const accentColor = role === 'artist' ? 'smash-purple' : 'smash-orange';
  const displayDuration = adPlaying ? Math.min(30, duration || 30) : duration;

  const [localVolume, setLocalVolume] = useState(volume);
  const [lastVolume, setLastVolume] = useState(volume || 0.8);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const currentSongRef = React.useRef<HTMLDivElement>(null);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Sync liked state with localStorage and DB
  useEffect(() => {
    if (!currentSong) return;
    
    // Check localStorage first for speed
    const liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
    setIsLiked(Array.isArray(liked) && liked.includes(currentSong.id));

    // Then check DB if user is logged in for accuracy
    const checkLikeStatus = async () => {
      if (!userProfile) return;
      const { data } = await supabase
        .from('likes')
        .select('*')
        .eq('profile_id', userProfile.id)
        .eq('song_id', currentSong.id)
        .maybeSingle();
      
      if (data) {
        setIsLiked(true);
        // Sync back to localStorage if missing
        if (!liked.includes(currentSong.id)) {
           localStorage.setItem('smash_liked_songs', JSON.stringify([...liked, currentSong.id]));
        }
      } else {
        setIsLiked(false);
        // Remove from localStorage if found there but not in DB
        if (liked.includes(currentSong.id)) {
           localStorage.setItem('smash_liked_songs', JSON.stringify(liked.filter((id: string) => id !== currentSong.id)));
        }
      }
    };

    checkLikeStatus();
  }, [currentSong?.id, userProfile?.id]);

  useEffect(() => {
    const handleLikesUpdate = (e: any) => {
      if (currentSong && e.detail.songId === currentSong.id) {
        setIsLiked(e.detail.isLiked);
      }
    };
    window.addEventListener('smash_likes_updated', handleLikesUpdate);
    return () => window.removeEventListener('smash_likes_updated', handleLikesUpdate);
  }, [currentSong?.id]);

  const handleLike = async () => {
    if (!currentSong) return;
    
    const previouslyLiked = isLiked;
    setIsLiked(!previouslyLiked);
    
    try {
      let liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
      if (!Array.isArray(liked)) liked = [];

      if (previouslyLiked) {
        // Unlike
        const newLiked = liked.filter((id: string) => id !== currentSong.id);
        localStorage.setItem('smash_liked_songs', JSON.stringify(newLiked));
        
        if (userProfile) {
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('profile_id', userProfile.id)
            .eq('song_id', currentSong.id);
          if (error) throw error;
        }
      } else {
        // Like
        const newLiked = [...liked, currentSong.id];
        localStorage.setItem('smash_liked_songs', JSON.stringify(newLiked));
        
        if (userProfile) {
          const { error } = await supabase
            .from('likes')
            .insert({ profile_id: userProfile.id, song_id: currentSong.id });
          if (error) throw error;
        }
      }
      // Broadcast event so other components (like SongCard) can update
      window.dispatchEvent(new CustomEvent('smash_likes_updated', { 
        detail: { songId: currentSong.id, isLiked: !previouslyLiked } 
      }));
    } catch (err) {
      console.error('Like error:', err);
      setIsLiked(previouslyLiked);
      toast.error('Failed to update like status');
    }
  };

  useEffect(() => {
    if (showQueueModal && currentSongRef.current) {
      currentSongRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSong, showQueueModal]);

  useEffect(() => {
    setLocalVolume(volume);
    if (volume > 0) {
      setLastVolume(volume);
    }
  }, [volume]);

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
    } else {
      setVolume(lastVolume);
    }
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSong) return;
    if (!userProfile) {
      toast.error('Please sign in to buy tracks');
      return;
    }
    purchaseTrack({
      song: currentSong,
      user: userProfile
    });
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
                  <h3 className="font-studio font-bold text-sm text-text-primary truncate">{currentSong.title}</h3>
                  {currentSong.is_for_sale && !currentSong.is_purchased && !purchasedIds.has(currentSong.id) && (
                    <span className={`px-1.5 py-0.5 rounded-full ${accentColor.replace('text-', 'bg-')}/10 ${accentColor} text-[8px] font-display font-semibold uppercase tracking-wide`}>MK {currentSong.price}</span>
                  )}
                </div>
                <p className="font-sans text-xs text-text-secondary truncate">{((currentSong as any).featured_artist ? `${currentSong.profiles?.stage_name || currentSong.artist_name} ft. ${(currentSong as any).featured_artist}` : (currentSong.profiles?.stage_name || currentSong.artist_name))}</p>
              </div>
            </div>

            {/* Mobile Actions: Like & Play */}
            <div className="flex items-center gap-4 md:hidden">
              <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="text-text-muted hover:text-text-primary focus:outline-none">
                <motion.div whileTap={{ scale: 0.8 }}>
                  <Heart size={20} fill={isLiked ? "currentColor" : "none"} className={isLiked ? 'text-red-400' : ''} />
                </motion.div>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className={`w-[44px] h-[44px] rounded-full flex items-center justify-center text-white ${accentColor.replace('text-', 'bg-')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-surface focus:ring-${accentColor.replace('text-', '')}`}
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
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
                <button onClick={previousTrack} disabled={adPlaying} className="text-text-muted hover:text-text-primary focus:outline-none rounded-sm">
                  <SkipBack size={20} fill="currentColor" />
                </button>
                <button 
                  onClick={togglePlay}
                  className={`w-[44px] h-[44px] rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-surface focus:ring-${accentColor.replace('text-', '')} ${accentColor.replace('text-', 'bg-')}`}
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>
                <button onClick={nextTrack} disabled={adPlaying} className="text-text-muted hover:text-text-primary focus:outline-none rounded-sm">
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
               <button onClick={handleLike} className={`${isLiked ? 'text-red-400' : 'text-text-muted hover:text-text-primary'} transition-colors focus:outline-none`}>
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
                 <button onClick={toggleMute} className="text-text-muted hover:text-text-primary focus:outline-none">
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
               <button onClick={() => setIsExpanded(true)} className="text-text-muted hover:text-text-primary p-2 focus:outline-none rounded-lg hover:bg-bg-elevated transition-colors">
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
                <button onClick={() => setShowQueueModal(false)} className="p-2 bg-bg-surface hover:bg-bg-elevated rounded-full transition-colors text-text-secondary hover:text-text-primary">
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
                      <p className={`font-studio font-semibold text-sm truncate ${currentSong?.id === song.id ? accentColor : 'text-text-primary'}`}>{song.title}</p>
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
      if (!userProfile) {
         toast.error('Please sign in to purchase tracks.');
         return;
      }
      purchaseTrack({
         song,
         user: userProfile
      });
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
               <button onClick={handleBuy} className="w-full py-6 bg-smash-orange text-white rounded-[24px] font-black text-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-smash-orange/20">
                  BUY NOW MK {song.price || 2500}
               </button>
               <button onClick={handleDismiss} className="w-full py-4 text-text-secondary font-display font-bold uppercase text-sm tracking-widest hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-colors">
                  Maybe Later
               </button>
            </div>
         </motion.div>
      </div>
   );
};

export default GlobalPlayer;
