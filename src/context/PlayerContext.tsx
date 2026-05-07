import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Song, EQPreset } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { musicService } from '../services/musicService';

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Song[];
  dataSaver: boolean;
  eqPreset: EQPreset;
  playbackRate: number;
  sleepTimerRemaining: number | null;
  isExpanded: boolean;
  radioMode: boolean;
  adPlaying: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  toggleRadioMode: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playSong: (song: Song, newQueue?: Song[]) => void;
  togglePlay: () => void;
  pauseSong: () => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  seek: (time: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleDataSaver: () => void;
  setEQPreset: (preset: EQPreset) => void;
  setIsExpanded: (expanded: boolean) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (songId: string) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [queue, setQueue] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem('smash_queue');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error parsing queue:', e);
      return [];
    }
  });
  const [dataSaver, setDataSaver] = useState(() => {
    try {
      return localStorage.getItem('smash_datasaver') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [eqPreset, setEQPreset] = useState<EQPreset>('normal');
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [radioMode, setRadioMode] = useState(() => {
    try {
      return localStorage.getItem('smash_radio_mode') === 'true';
    } catch (e) {
      return false;
    }
  });
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previewLimitReached = useRef(false);
  const [songsPlayed, setSongsPlayed] = useState(0);
  const [adPlaying, setAdPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [shuffledQueue, setShuffledQueue] = useState<Song[]>([]);
  const { userProfile } = useAuth();
  const lastIncrementedSongId = useRef<string | null>(null);
  
  useEffect(() => {
    if (isShuffle) {
      const shuffled = [...queue].sort(() => Math.random() - 0.5);
      setShuffledQueue(shuffled);
    } else {
      setShuffledQueue([]);
    }
  }, [isShuffle, queue.length]);

  useEffect(() => {
    if (sleepTimerRemaining !== null && sleepTimerRemaining > 0) {
      const interval = setInterval(() => {
        setSleepTimerRemaining(prev => {
          if (prev && prev > 1) return prev - 1;
          pauseSong();
          return null;
        });
      }, 60000); // Decrement every minute
      return () => clearInterval(interval);
    }
  }, [sleepTimerRemaining]);

  const setSleepTimer = (minutes: number | null) => {
    setSleepTimerRemaining(minutes);
  };
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem('smash_datasaver', String(dataSaver));
  }, [dataSaver]);

  useEffect(() => {
    localStorage.setItem('smash_radio_mode', String(radioMode));
  }, [radioMode]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    
    // Reset limit reached ref when song changes
    previewLimitReached.current = false;
    
    // Only set src if we have a current song and it differs from the current audio src
    if (currentSong && currentSong.url && audio.src !== currentSong.url) {
      audio.src = currentSong.url;
      audio.load();
    }

    audio.volume = volume;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // 30-second preview logic - ONLY for songs on sale and NOT purchased
      if (currentSong && currentSong.is_for_sale && !currentSong.is_purchased && audio.currentTime >= 30) {
        // Force pause the audio
        audio.pause();
        audio.currentTime = 30;
        if (isPlaying) setIsPlaying(false);
        
        // Only dispatch the limit event once per song load
        if (!previewLimitReached.current) {
          previewLimitReached.current = true;
          // Dispatch custom event for preview limit reached
          document.dispatchEvent(new CustomEvent('smash_preview_limit', { detail: currentSong }));
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      previewLimitReached.current = false;
      
      // Increment play count only if it hasn't been done for this song in this play session
      if (currentSong && !adPlaying && lastIncrementedSongId.current !== currentSong.id) {
        lastIncrementedSongId.current = currentSong.id;
        musicService.incrementPlays(currentSong.id);
      }
    };
    const handleEnded = () => {
      const isFreeUser = !userProfile || (userProfile.subscription_tier !== 'premium' && userProfile.subscription_tier !== 'family');
      
      if (repeatMode === 'one' && currentSong) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        }
        return;
      }

      if (radioMode && currentSong) {
        handleRadioNext();
        return;
      }

      if (isFreeUser && !adPlaying) {
        const nextCount = songsPlayed + 1;
        if (nextCount >= 3) {
          setSongsPlayed(0);
          playAd();
        } else {
          setSongsPlayed(nextCount);
          nextTrack();
        }
      } else if (adPlaying) {
        setAdPlaying(false);
        nextTrack();
      } else {
        nextTrack();
      }
    };

    const playAd = () => {
      const adSong: Song = {
        id: 'ad-' + Date.now(),
        title: 'Advertisement',
        artist_id: 'system-ad',
        artist_name: 'Smashify Ad',
        url: 'https://cdn.pixabay.com/download/audio/2022/10/30/audio_f535f21226.mp3?filename=advertisement-124434.mp3',
        cover_url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
        price: 0,
        duration: 30,
        is_for_sale: false,
      };
      setAdPlaying(true);
      setCurrentSong(adSong);
      setIsPlaying(true);
      if (audioRef.current) {
          audioRef.current.src = adSong.url;
          audioRef.current.load();
      }
    };

    const handleRadioNext = async () => {
      try {
        // Fetch some available songs to pick from
        const { data } = await supabase
          .from('songs')
          .select('*, profiles!artist_id(full_name, stage_name)')
          .eq('approved', true)
          .limit(50);
        
        if (data) {
          const formatted = data.map((s: any) => ({
             ...s,
             artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
             cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
             url: s.audio_url,
             profiles: s.profiles
          }));

          // Use the prompt from aiService if it was exported, or just pick similar genre
          const currentGenre = currentSong?.genre;
          const similarSongs = formatted.filter(s => s.genre === currentGenre && s.id !== currentSong?.id);
          const next = similarSongs.length > 0 
            ? similarSongs[Math.floor(Math.random() * similarSongs.length)]
            : formatted[Math.floor(Math.random() * formatted.length)];
          
          if (next) {
            playSong(next, [next]);
          }
        }
      } catch (err) {
        console.error('Radio next track error:', err);
        nextTrack();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.play().catch(err => {
          if (err.name !== 'AbortError') console.error('Playback error:', err);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong, playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          seek(Math.min(duration, currentTime + 10));
          break;
        case 'ArrowLeft':
          seek(Math.max(0, currentTime - 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case 'KeyM':
          setVolume(volume === 0 ? 0.8 : 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, volume, currentSong]);

  const toggleRadioMode = () => setRadioMode(prev => !prev);
  const toggleShuffle = () => setIsShuffle(prev => !prev);
  const toggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const playSong = (song: Song, newQueue?: Song[]) => {
    if (newQueue) setQueue(newQueue);
    else if (!queue.find(s => s.id === song.id)) {
      setQueue(prev => [...prev, song]);
    }

    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      lastIncrementedSongId.current = null; // Reset for new song
      setCurrentSong(song);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = song.url;
        audioRef.current.load();
      }
    }
  };

  const togglePlay = () => {
    if (!currentSong) return;
    setIsPlaying(!isPlaying);
  };
  
  const pauseSong = () => {
    setIsPlaying(false);
  };

  const setPlaybackRate = (rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };
  
  const seek = (time: number) => {
    if (audioRef.current && !isNaN(time)) {
      // Respect preview limit
      if (currentSong && !currentSong.is_purchased && time >= 30) {
        audioRef.current.currentTime = 29.9;
      } else {
        audioRef.current.currentTime = time;
      }
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const nextTrack = () => {
    const activeQueue = isShuffle && shuffledQueue.length > 0 ? shuffledQueue : queue;
    if (activeQueue.length === 0 || !currentSong) return;
    
    const currentIndex = activeQueue.findIndex(s => s.id === currentSong.id);
    
    if (currentIndex < activeQueue.length - 1) {
      playSong(activeQueue[currentIndex + 1]);
    } else if (repeatMode === 'all') {
      playSong(activeQueue[0]); // Loop back to start
    } else if (repeatMode === 'off') {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  };

  const previousTrack = () => {
    const activeQueue = isShuffle && shuffledQueue.length > 0 ? shuffledQueue : queue;
    if (activeQueue.length === 0 || !currentSong) return;
    
    const currentIndex = activeQueue.findIndex(s => s.id === currentSong.id);
    
    if (currentIndex > 0) {
      playSong(activeQueue[currentIndex - 1]);
    } else if (repeatMode === 'all') {
      playSong(activeQueue[activeQueue.length - 1]);
    } else {
      // Just restart current song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    }
  };

  const toggleDataSaver = () => setDataSaver(prev => !prev);

  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev.filter(s => s.id !== song.id), song]);
  };

  const removeFromQueue = (songId: string) => {
    setQueue(prev => prev.filter(s => s.id !== songId));
  };

  return (
    <PlayerContext.Provider value={{
      currentSong,
      isPlaying,
      currentTime,
      duration,
      volume,
      queue,
      dataSaver,
      eqPreset,
      playbackRate,
      sleepTimerRemaining,
      isExpanded,
      radioMode,
      adPlaying,
      isShuffle,
      repeatMode,
      toggleRadioMode,
      toggleShuffle,
      toggleRepeat,
      playSong,
      togglePlay,
      pauseSong,
      setVolume,
      setPlaybackRate,
      setSleepTimer,
      seek,
      nextTrack,
      previousTrack,
      toggleDataSaver,
      setEQPreset,
      setIsExpanded,
      addToQueue,
      removeFromQueue
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
