import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, 
  ChevronDown, ListMusic, Heart, Shuffle, Repeat, Info, Zap, 
  Wifi, WifiOff, Clock, Headphones, Music2, Gauge, X, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { EQPreset } from '../../types';
import { buyTrack } from '../../lib/paychangu';
import toast from 'react-hot-toast';
import { Share2, Trash2 } from 'lucide-react';

const ExpandedPlayer = ({ onClose }: { onClose: () => void }) => {
  const { 
    currentSong, isPlaying, togglePlay, currentTime, duration, 
    seek, volume, setVolume, nextTrack, previousTrack, 
    eqPreset, setEQPreset,
    playbackRate, setPlaybackRate,
    sleepTimerRemaining, setSleepTimer,
    pauseSong,
    radioMode, toggleRadioMode, adPlaying,
    isShuffle, toggleShuffle, repeatMode, toggleRepeat
  } = usePlayer();
  const { role } = useAuth();
  const accentColor = role === 'artist' ? 'smash-purple' : 'smash-orange';
  const [showQueue, setShowQueue] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  
  // Lyrics State
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  const ProgressBar = ({ current, total, onSeek }: { current: number, total: number, onSeek: (time: number) => void }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragWidth, setDragWidth] = useState(0);

    const handleInteract = (e: React.MouseEvent | React.TouchEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = x / rect.width;
      onSeek(percent * total);
    };

    return (
      <div 
        className="group relative h-2.5 bg-white/10 rounded-full cursor-pointer touch-none"
        onMouseDown={(e) => { setIsDragging(true); handleInteract(e); }}
        onMouseMove={(e) => { if (isDragging) handleInteract(e); }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={(e) => { setIsDragging(true); handleInteract(e); }}
        onTouchMove={(e) => { if (isDragging) handleInteract(e); }}
        onTouchEnd={() => setIsDragging(false)}
      >
        <motion.div 
          className="h-full bg-gradient-to-r from-smash-orange to-smash-red relative rounded-full"
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
    
    // Only allow download if free or purchased
    if (currentSong.is_for_sale && !currentSong.is_purchased) {
      toast.error("Please purchase the track to download.");
      return;
    }

    const toastId = toast.loading('Preparing download...');
    try {
      const response = await fetch(currentSong.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentSong.title} - ${currentSong.artist_name}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Download started!', { id: toastId });
      let downloads: string[] = [];
      try {
        downloads = JSON.parse(localStorage.getItem('smash_downloads') || '[]');
      } catch (e) {
        console.error('Error parsing downloads:', e);
      }
      
      if (!downloads.includes(currentSong.id)) {
        localStorage.setItem('smash_downloads', JSON.stringify([...downloads, currentSong.id]));
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download track.');
    }
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
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[100] bg-smash-black flex flex-col md:flex-row touch-none"
    >
      {/* Drag Handle for Mobile */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full z-[110] md:hidden" />

      {/* Background Blur */}
      <div className="absolute inset-0 z-0">
        <img 
          src={currentSong?.cover_url} 
          className="w-full h-full object-cover blur-[80px] opacity-30" 
          alt="" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-smash-black via-smash-black/40 to-transparent" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col p-6 md:p-12 overflow-y-auto no-scrollbar">
         <div className="flex items-center justify-between mb-8 md:mb-12">
            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
               <ChevronDown size={28} />
            </button>
            <div className="text-center flex-1">
              <p className="text-[10px] font-black text-smash-gray uppercase tracking-[0.4em] mb-1">{adPlaying ? 'SPONSORED' : 'Now Playing'}</p>
              <h4 className="font-display font-black italic text-lg uppercase tracking-tight">{adPlaying ? 'ADVERTISEMENT' : currentSong?.genre}</h4>
           </div>
           <button className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <Info size={24} />
           </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-4">
           <motion.div 
             animate={{ rotate: isPlaying ? 360 : 0 }}
             transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
             className="relative aspect-square w-full max-w-[280px] sm:max-w-[320px] md:max-w-[480px] rounded-full overflow-hidden shadow-[0_0_100px_rgba(255,95,0,0.2)] border-8 border-white/5 cursor-pointer"
             onClick={togglePlay}
           >
              <img src={currentSong?.cover_url} className="w-full h-full object-cover" alt={currentSong?.title} />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                 <div className="w-12 h-12 md:w-20 md:h-20 bg-smash-black border-4 border-white/10 rounded-full flex items-center justify-center">
                    {isPlaying ? <Music2 size={32} className="text-smash-orange opacity-50" /> : <Play size={32} className="text-white ml-1" />}
                 </div>
              </div>
           </motion.div>

           <div className="mt-8 md:mt-12 text-center max-w-2xl px-4">
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-3xl sm:text-4xl md:text-6xl font-black font-display tracking-tighter italic uppercase mb-2 md:mb-4 leading-none"
              >
                {currentSong?.title}
              </motion.h1>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-lg md:text-2xl text-smash-gray font-bold"
              >
                {currentSong?.profiles?.stage_name || currentSong?.artist_name}
              </motion.p>
           </div>
        </div>

         <div className="mt-auto w-full max-w-4xl mx-auto pt-6 pb-2">
           {/* Progress Bar */}
           <div className="space-y-3 mb-6 md:mb-8">
              <ProgressBar current={currentTime} total={duration} onSeek={seek} />
              <div className="flex justify-between text-xs font-black text-smash-gray tracking-widest uppercase">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
           </div>

           {/* Controls */}
           <div className="flex flex-col gap-6 md:gap-8">
              <div className="flex items-center justify-between">
                <button 
                  onClick={toggleShuffle}
                  disabled={adPlaying} 
                  className={`transition-all p-2 rounded-full ${adPlaying ? 'opacity-20 cursor-not-allowed' : isShuffle ? `text-${accentColor} bg-${accentColor}/10 shadow-lg` : `text-smash-gray hover:text-${accentColor}`}`}
                >
                  <Shuffle size={24} />
                </button>
                
                <div className="flex items-center gap-6 md:gap-10">
                   <button onClick={previousTrack} disabled={adPlaying} className={`transition-colors active:scale-90 ${adPlaying ? 'opacity-20 cursor-not-allowed' : `text-white hover:text-${accentColor}`}`}>
                     <SkipBack size={32} md:size={40} fill="white" />
                   </button>
                   <button onClick={togglePlay} className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white text-smash-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-white/20">
                      {isPlaying ? <Pause size={40} md:size={48} fill="currentColor" /> : <Play size={40} md:size={48} fill="currentColor" className="ml-2" />}
                   </button>
                   <button onClick={nextTrack} disabled={adPlaying} className={`transition-colors active:scale-90 ${adPlaying ? 'opacity-20 cursor-not-allowed' : `text-white hover:text-${accentColor}`}`}>
                     <SkipForward size={32} md:size={40} fill="white" />
                   </button>
                </div>

                <button 
                  onClick={toggleRepeat}
                  disabled={adPlaying} 
                  className={`transition-all p-2 rounded-full relative ${adPlaying ? 'opacity-20 cursor-not-allowed' : repeatMode !== 'off' ? `text-${accentColor} bg-${accentColor}/10 shadow-lg` : 'text-smash-gray hover:text-white'}`}
                >
                  <Repeat size={24} />
                  {repeatMode === 'one' && (
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-black pointer-events-none mt-0.5">1</span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 overflow-x-auto no-scrollbar py-2">
                 {presets.map(p => (
                   <button 
                     key={p}
                     onClick={() => setEQPreset(p)}
                     className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${eqPreset === p ? `bg-${accentColor} text-white` : 'bg-white/5 text-smash-gray hover:text-white'}`}
                   >
                     {p}
                   </button>
                 ))}
              </div>
           </div>
           
           {/* Bottom Toolbar */}
           <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-white/5 relative">
              <div className="flex items-center gap-3 md:gap-4 flex-1">
                 <button 
                   onClick={() => setIsLiked(!isLiked)}
                   className={`transition-colors ${isLiked ? 'text-smash-red' : 'text-smash-gray hover:text-white'}`}
                 >
                   <Heart size={24} md:size={28} fill={isLiked ? "currentColor" : "none"} />
                 </button>
                 <div className="flex items-center gap-3 flex-1 max-w-[120px] md:max-w-[200px]">
                   <Volume2 size={20} className="text-smash-gray" />
                   <input 
                     type="range" 
                     min="0" max="1" step="0.01" value={volume}
                     onChange={(e) => setVolume(parseFloat(e.target.value))}
                     className={`w-full accent-${accentColor} bg-white/10 h-1.5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-${accentColor}`}
                   />
                 </div>
              </div>

              <div className="flex text-xs items-center gap-4 md:gap-6">
                 {/* Speed Selector */}
                 <div className="relative">
                   <button 
                     onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                     className={`flex items-center gap-2 font-black uppercase transition-colors ${playbackRate !== 1 || showSpeedMenu ? `text-${accentColor}` : 'text-smash-gray hover:text-white'}`}
                   >
                     <Gauge size={18} /> {playbackRate}x
                   </button>
                   {showSpeedMenu && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full mb-4 right-0 bg-smash-dark border border-white/10 rounded-xl p-2 w-32 shadow-2xl z-[150]">
                       {speeds.map(s => (
                         <button key={s} onClick={() => { setPlaybackRate(s); setShowSpeedMenu(false); }} className={`w-full p-3 text-left font-bold rounded-lg transition-colors ${playbackRate === s ? `bg-${accentColor} text-white` : 'text-smash-gray hover:bg-white/10 hover:text-white'}`}>
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
                     className={`flex items-center gap-2 font-black uppercase transition-colors ${sleepTimerRemaining || showSleepMenu ? `text-${accentColor}` : 'text-smash-gray hover:text-white'}`}
                   >
                     <Clock size={18} /> {sleepTimerRemaining ? `${sleepTimerRemaining}m` : 'Timer'}
                   </button>
                   {showSleepMenu && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full mb-4 right-0 bg-smash-dark border border-white/10 rounded-xl p-2 w-40 shadow-2xl z-[150]">
                       {sleepIntervals.map(t => (
                         <button key={t} onClick={() => { setSleepTimer(t); setShowSleepMenu(false); }} className="w-full p-3 text-left font-bold text-smash-gray hover:bg-white/10 hover:text-white rounded-lg transition-colors">
                           {t} mins
                         </button>
                       ))}
                       {sleepTimerRemaining && (
                         <button onClick={() => { setSleepTimer(null); setShowSleepMenu(false); }} className="w-full mt-2 p-3 text-center font-bold text-smash-red bg-smash-red/10 hover:bg-smash-red hover:text-white rounded-lg transition-colors">
                           Cancel Timer
                         </button>
                       )}
                     </motion.div>
                   )}
                 </div>

                 <button 
                   onClick={fetchLyrics} 
                   className="flex items-center gap-2 font-black uppercase text-smash-gray hover:text-white transition-colors"
                 >
                   <Zap size={18} /> Lyrics
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Side Panel (Desktop Only) */}
      <div className="hidden md:block w-96 bg-smash-black/40 backdrop-blur-xl border-l border-white/5 relative z-20">
         <div className="p-8 h-full flex flex-col">
            <h3 className="text-2xl font-black font-display italic uppercase mb-8">Up Next</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
               {usePlayer().queue.slice(0, 10).map((song, i) => (
                 <div key={`${song.id}-${i}`} className={`p-4 rounded-2xl ${currentSong?.id === song.id ? `bg-${accentColor}/10 border border-${accentColor}/20` : 'bg-white/5 border border-white/10'} flex items-center gap-4`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                       <img src={song.cover_url} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="min-w-0">
                       <p className="font-bold text-sm truncate uppercase tracking-tight italic">{song.title}</p>
                       <p className="text-xs text-smash-gray font-bold truncate">{song.artist_name}</p>
                    </div>
                 </div>
               ))}
               {usePlayer().queue.length === 0 && (
                 <p className="text-smash-gray text-center text-sm font-bold uppercase py-8">Queue is empty</p>
               )}
            </div>
         </div>
      </div>

      {/* Lyrics Modal */}
      <AnimatePresence>
        {showLyricsModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/80 backdrop-blur-md"
               onClick={() => setShowLyricsModal(false)}
             />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative z-10 w-full max-w-lg bg-smash-dark border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col max-h-[80vh]"
             >
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-2xl font-black font-display uppercase italic tracking-tighter">Lyrics</h3>
                   <button onClick={() => setShowLyricsModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-smash-gray hover:text-white">
                     <X size={20} />
                   </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                  {loadingLyrics ? (
                    <div className="flex items-center justify-center h-40">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                         <Zap size={32} className={`text-${accentColor} opacity-50`} />
                      </motion.div>
                    </div>
                  ) : (
                    <p className="text-lg text-white/90 font-medium whitespace-pre-line leading-relaxed pb-8">
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
    queue, nextTrack, previousTrack, radioMode, toggleRadioMode, playSong, adPlaying,
    isShuffle, toggleShuffle, repeatMode, toggleRepeat, seek, removeFromQueue
  } = usePlayer();
  const { role } = useAuth();
  const accentColor = role === 'artist' ? 'smash-purple' : 'smash-orange';

  const [localVolume, setLocalVolume] = useState(volume);
  const [lastVolume, setLastVolume] = useState(volume || 0.8);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const currentSongRef = React.useRef<HTMLDivElement>(null);

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

  if (!currentSong) return null;

  return (
    <>
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-[60] px-2 pb-2 md:px-8 md:pb-6 pointer-events-none">
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="max-w-7xl mx-auto glass-morphism rounded-[24px] md:rounded-[40px] border border-white/10 shadow-2xl overflow-hidden pointer-events-auto group/player"
        >
          {/* Top Progress Line - Interactive */}
          <div 
            className="absolute top-0 left-0 right-0 h-[3px] md:h-1 bg-white/10 cursor-pointer group-hover/player:h-1.5 transition-all z-10 touch-none"
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              seek(percent * duration);
            }}
          >
            <motion.div 
              className={`h-full bg-${accentColor} shadow-[0_0_10px_var(--color-${accentColor})] opacity-80`}
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          <div className="px-3 py-2 md:px-8 md:py-4 flex items-center justify-between gap-3 md:gap-4 mt-[3px] md:mt-0">
            {/* Song Info */}
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0" onClick={() => setIsExpanded(true)}>
              <div className="relative group cursor-pointer flex-shrink-0">
                <motion.div 
                  animate={{ scale: isPlaying ? [1, 1.05, 1] : 1 }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden shadow-lg border border-white/10"
                >
                  <img src={currentSong.cover_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                </motion.div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl md:rounded-2xl transition-opacity">
                  <Maximize2 size={16} md:size={20} className="text-white" />
                </div>
              </div>
              <div className="min-w-0 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-display font-black text-sm md:text-xl italic uppercase tracking-tighter truncate leading-none group-hover:text-${accentColor} transition-colors`}>
                    {currentSong.title}
                  </h3>
                  {adPlaying && (
                    <span className={`bg-${accentColor} text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest`}>AD</span>
                  )}
                </div>
                <p className="text-[10px] md:text-sm text-smash-gray font-bold truncate tracking-tight">
                  {currentSong.profiles?.stage_name || currentSong.artist_name}
                </p>
              </div>
            </div>

            {/* Mobile/Tablet Controls */}
            <div className="flex items-center gap-2 md:hidden">
               <button 
                  onClick={(e) => { e.stopPropagation(); previousTrack(); }}
                  disabled={adPlaying}
                  className={`p-2 transition-colors ${adPlaying ? 'opacity-20 cursor-not-allowed' : 'text-white hover:text-smash-orange'}`}
                >
                  <SkipBack size={20} fill="currentColor" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-10 h-10 rounded-full bg-white text-smash-black flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                  disabled={adPlaying}
                  className={`p-2 transition-colors ${adPlaying ? 'opacity-20 cursor-not-allowed' : 'text-white hover:text-smash-orange'}`}
                >
                  <SkipForward size={20} fill="currentColor" />
                </button>
            </div>

            {/* Desktop Controls */}
            <div className="hidden md:flex items-center gap-4 md:gap-8">
              <div className="flex items-center gap-3">
                 <button 
                   onClick={toggleShuffle}
                   disabled={adPlaying}
                   className={`p-2 transition-all ${adPlaying ? 'opacity-20' : isShuffle ? `text-${accentColor}` : 'text-smash-gray hover:text-white'}`}
                   title="Shuffle"
                 >
                    <Shuffle size={18} />
                 </button>
                 <button 
                   onClick={toggleRepeat}
                   disabled={adPlaying}
                   className={`p-2 transition-all relative ${adPlaying ? 'opacity-20' : repeatMode !== 'off' ? `text-${accentColor}` : 'text-smash-gray hover:text-white'}`}
                   title="Repeat"
                 >
                    <Repeat size={18} />
                    {repeatMode === 'one' && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-black mt-0.5">1</span>}
                 </button>
              </div>

              <button 
                onClick={togglePlay}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white text-smash-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 w-24 lg:w-32 group">
                  <button onClick={toggleMute}>
                    {volume === 0 ? <VolumeX size={18} className="text-smash-red" /> : <Volume2 size={18} className="text-smash-gray group-hover:text-white transition-colors" />}
                  </button>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.01" value={localVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setLocalVolume(val);
                      setVolume(val);
                    }}
                    className={`flex-1 accent-${accentColor} h-1 opacity-50 group-hover:opacity-100 transition-opacity cursor-pointer`}
                  />
                </div>

                <button 
                  onClick={() => setShowQueueModal(true)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-smash-gray hover:text-white transition-all relative"
                  title="Queue"
                >
                  <ListMusic size={20} />
                  {queue.length > 0 && (
                    <span className={`absolute -top-1 -right-1 w-5 h-5 bg-${accentColor} text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border border-smash-black`}>
                      {queue.length}
                    </span>
                  )}
                </button>
                
                <button 
                  onClick={toggleDataSaver}
                  className={`p-2 rounded-xl border transition-all ${dataSaver ? 'bg-smash-green/10 border-smash-green text-smash-green' : 'border-white/10 text-smash-gray hover:text-white'}`}
                  title="Data Saver"
                >
                  <motion.div animate={{ opacity: dataSaver ? [1, 0.5, 1] : 1 }} transition={{ duration: 2, repeat: Infinity }}>
                    {dataSaver ? <Wifi size={18} /> : <WifiOff size={18} />}
                  </motion.div>
                </button>

                <button 
                  onClick={toggleRadioMode}
                  className={`p-3 rounded-2xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${radioMode ? `bg-${accentColor}/10 border-${accentColor} text-${accentColor} shadow-lg shadow-${accentColor}/10` : 'bg-white/5 border-white/10 text-smash-gray hover:text-white'}`}
                  title="Endless Radio"
                >
                   <Zap size={18} fill={radioMode ? "currentColor" : "none"} />
                   {radioMode ? 'Radio ON' : 'Radio OFF'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && <ExpandedPlayer onClose={() => setIsExpanded(false)} />}
      </AnimatePresence>

      {/* Preview Limit Modal Overlay */}
      <PreviewModal />

      {/* Queue Modal */}
      <AnimatePresence>
        {showQueueModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowQueueModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-lg bg-smash-dark border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-black font-display uppercase italic tracking-tighter">Queue</h3>
                <button onClick={() => setShowQueueModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-smash-gray hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {queue.length > 0 ? queue.map((song, i) => (
                  <div 
                    key={`${song.id}-${i}`}
                    ref={currentSong?.id === song.id ? currentSongRef : null}
                    className={`p-4 rounded-2xl flex items-center gap-4 group transition-colors cursor-pointer ${currentSong?.id === song.id ? `bg-${accentColor}/10 border border-${accentColor}/20` : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}
                    onClick={() => playSong(song)}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
                       <img src={song.cover_url} className="w-full h-full object-cover" alt="" />
                       {currentSong?.id === song.id && (
                         <div className={`absolute inset-0 bg-${accentColor}/40 flex items-center justify-center`}>
                           <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                             <Play size={16} fill="white" />
                           </motion.div>
                         </div>
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate uppercase tracking-tight italic ${currentSong?.id === song.id ? `text-${accentColor}` : 'text-white'}`}>{song.title}</p>
                      <p className="text-xs text-smash-gray font-bold">{song.artist_name}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFromQueue(song.id); }}
                        className="p-2 hover:bg-white/10 rounded-full text-smash-red"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center opacity-30 italic text-sm uppercase font-black tracking-widest">Queue is empty</div>
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
      buyTrack({
         song,
         user: userProfile,
         onSuccess: () => {
            toast.success('Track purchased successfully!');
            setSong(null);
            setTimeout(() => window.location.reload(), 1500);
         }
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
            <p className="text-smash-gray text-lg mb-10 font-medium tracking-tight">Buy the full track to support the artist and hear the rest of this anthem.</p>
            
            <div className="space-y-4">
               <button onClick={handleBuy} className="w-full py-6 bg-smash-orange text-white rounded-[24px] font-black text-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-smash-orange/20">
                  BUY NOW MK {song.price || 2500}
               </button>
               <button onClick={handleDismiss} className="w-full py-4 text-smash-gray font-black uppercase text-xs tracking-widest hover:text-white transition-colors">
                  Maybe Later
               </button>
            </div>
         </motion.div>
      </div>
   );
};

export default GlobalPlayer;
