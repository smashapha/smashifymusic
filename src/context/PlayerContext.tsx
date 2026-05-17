import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { Song, EQPreset } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { musicService } from '../services/musicService';
import { getRadioNextSong } from '../services/aiService';
import { getListenerLimits } from '../lib/tierUtils';

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
  adSkipAvailable: boolean;
  skipAd: () => void;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  toggleRadioMode: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playSong: (song: Song, newQueue?: Song[]) => void;
  playQueue: (songs: Song[], startIndex?: number) => void;
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
  purchasedIds: Set<string>;
  refreshPurchasedIds: (userId: string) => Promise<void>;
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
  const [adSkipAvailable, setAdSkipAvailable] = useState(false);
  const [currentAd, setCurrentAd] = useState<any>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [shuffledQueue, setShuffledQueue] = useState<Song[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const { userProfile } = useAuth();
  const lastIncrementedSongId = useRef<string | null>(null);

  const refreshPurchasedIds = async (userId: string) => {
    try {
      const { data: userPurchases } = await supabase
        .from('fan_purchases')
        .select('song_id')
        .eq('fan_id', userId);
      const ids = new Set((userPurchases || []).map(p => p.song_id as string));
      setPurchasedIds(ids);
    } catch (err) {
      console.warn('Could not refresh purchased IDs:', err);
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      if (userProfile?.id) {
        refreshPurchasedIds(userProfile.id);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [userProfile?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.has('tx_ref') ||
      window.location.pathname.includes('success')
    ) {
      if (userProfile?.id) {
        refreshPurchasedIds(userProfile.id);
      }
    }
  }, [window.location.pathname, userProfile?.id]);

  const skipAd = async () => {
    if (adPlaying) {
      // In the new system, we don't actually skip, but we might need this for cleanup
      // Or if we implement a "Skip with Premium" later.
      // For now, let's keep it but it won't be used by the UI as per requirements.
      setAdPlaying(false);
      setCurrentAd(null);
      nextTrack();
    }
  };
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('smash_datasaver') === 'true';
      if (userProfile && userProfile.user_type === 'listener') {
         const limits = getListenerLimits(userProfile);
         if (!limits.hdAudio) {
            setDataSaver(true);
         } else {
            setDataSaver(saved);
         }
      } else {
         setDataSaver(saved);
      }
    } catch(e) {}
  }, [userProfile]);

  // Restore session
  useEffect(() => {
    try {
      const lastSong = localStorage.getItem('smash_last_song');
      const lastTime = localStorage.getItem('smash_last_time');
      if (lastSong) {
        const song = JSON.parse(lastSong);
        setCurrentSong(song);
        if (lastTime) {
           setTimeout(() => {
             if(audioRef.current) audioRef.current.currentTime = parseFloat(lastTime);
           }, 500);
        }
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Save session
  useEffect(() => {
    if (currentSong) {
      localStorage.setItem('smash_last_song', JSON.stringify(currentSong));
    }
  }, [currentSong?.id]);

  useEffect(() => {
    if (currentSong && currentTime > 0) {
      localStorage.setItem('smash_last_time', String(currentTime));
    }
  }, [currentSong?.id, Math.floor(currentTime / 5)]);

  // Record recently played
  const recordRecentlyPlayed = async (song: Song) => {
    if (!userProfile) return;
    try {
      await supabase.from('recently_played').upsert({
        profile_id: userProfile.id,
        song_id: song.id,
        played_at: new Date().toISOString()
      }, { onConflict: 'profile_id,song_id' });
    } catch(err) { console.error(err); }
  };

  useEffect(() => {
    if (currentSong && isPlaying) {
      recordRecentlyPlayed(currentSong);
    }
  }, [currentSong?.id]);

  // Tab Title
  useEffect(() => {
    if (currentSong && isPlaying) {
      document.title = `▶ ${currentSong.title} — ${currentSong.artist_name} | Smashify`;
    } else if (currentSong) {
      document.title = `⏸ ${currentSong.title} | Smashify`;
    } else {
      document.title = 'Smashify — Malawi Music';
    }
  }, [currentSong, isPlaying]);

  // Media Session API
  useEffect(() => {
    if (!currentSong || !('mediaSession' in navigator)) {
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
      return;
    }

    try {
      const cover = currentSong.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=1024&h=1024&fit=crop';
      
      const metadata: any = {
        title: currentSong.title,
        artist: currentSong.artist_name,
        album: 'Smashify',
        artwork: [
          { src: cover, sizes: '96x96', type: 'image/jpeg' },
          { src: cover, sizes: '128x128', type: 'image/jpeg' },
          { src: cover, sizes: '192x192', type: 'image/jpeg' },
          { src: cover, sizes: '256x256', type: 'image/jpeg' },
          { src: cover, sizes: '384x384', type: 'image/jpeg' },
          { src: cover, sizes: '512x512', type: 'image/jpeg' },
        ]
      };

      if (typeof (window as any).MediaMetadata === 'function') {
        navigator.mediaSession.metadata = new (window as any).MediaMetadata(metadata);
      }
    } catch (err) {
      console.warn('MediaMetadata failed:', err);
    }

    const handlers: [MediaSessionAction, (details: MediaSessionActionDetails) => void][] = [
      ['play', () => setIsPlaying(true)],
      ['pause', () => setIsPlaying(false)],
      ['nexttrack', () => nextTrack()],
      ['previoustrack', () => previousTrack()],
      ['seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (audioRef.current) seek(Math.max(0, audioRef.current.currentTime - skipTime));
      }],
      ['seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (audioRef.current) seek(Math.min(duration, audioRef.current.currentTime + skipTime));
      }],
      ['seekto', (details) => { if (details.seekTime !== undefined) seek(details.seekTime); }],
      ['stop', () => { setIsPlaying(false); if (audioRef.current) audioRef.current.currentTime = 0; }]
    ];

    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.warn(`Media session action "${action}" not supported.`);
      }
    });

    return () => {
      handlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (error) {}
      });
    };
  }, [currentSong?.id, duration]);

  // Sync playback state to media session
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Sync position state to media session
  useEffect(() => {
    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: playbackRate,
          position: Math.min(currentTime, duration)
        });
      } catch (err) {
        console.warn('setPositionState failed:', err);
      }
    }
  }, [currentTime, duration, playbackRate]);
  
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
  
  // Lazy initialize audio element on first render in browser
  if (!audioRef.current && typeof document !== 'undefined') {
    audioRef.current = document.createElement('audio');
  }
  const audio = audioRef.current as HTMLAudioElement;

  useEffect(() => {
    localStorage.setItem('smash_datasaver', String(dataSaver));
  }, [dataSaver]);

  useEffect(() => {
    localStorage.setItem('smash_radio_mode', String(radioMode));
  }, [radioMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Reset limit reached ref when song changes
    previewLimitReached.current = false;
    
    // Only set src if we have a current song and it differs from the current audio src
    const srcToUse = dataSaver && currentSong?.snippet_url 
      ? currentSong.snippet_url 
      : currentSong?.audio_url;

    if (currentSong && srcToUse && audio.src !== srcToUse) {
      audio.src = srcToUse;
      audio.load();
    }

    audio.volume = volume;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      if (adPlaying) {
        // Ads are unskippable in the new system
        if (audio.currentTime >= 30) {
          audio.pause();
          audio.currentTime = 30;
          setAdPlaying(false);
          setCurrentAd(null);
          nextTrack();
          return;
        }
      }
      
      // 30-second preview logic - ONLY for songs on sale and NOT purchased
      const tier = (userProfile?.subscription_tier || 'free').toLowerCase();
      const isUnlockablePremium = tier === 'premium' || tier === 'family' || userProfile?.user_type === 'artist';
      
      if (!adPlaying && currentSong && currentSong.is_for_sale && !currentSong.is_purchased && !isUnlockablePremium && audio.currentTime >= 30) {
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
    const handleEnded = async () => {
      const limits = getListenerLimits(userProfile);
      
      if (adPlaying) {
        if (currentAd) {
          try {
            // Track play completion
            await supabase.from('audio_ad_plays').insert({
              ad_id: currentAd.id,
              listener_id: userProfile?.id,
              listener_city: userProfile?.city,
              source: 'player',
              completed: true
            });

            // Increment plays_used
            await supabase.rpc('increment_ad_plays', { ad_id: currentAd.id });
          } catch (e) {}
        }
        setAdPlaying(false);
        setCurrentAd(null);
        nextTrack();
        return;
      }
      
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

      if (limits.hasAds && !adPlaying) {
        const nextCount = songsPlayed + 1;
        if (nextCount >= 3) {
          setSongsPlayed(0);
          playAd();
        } else {
          setSongsPlayed(nextCount);
          nextTrack();
        }
      } else {
        nextTrack();
      }
    };

    const playAd = async () => {
      try {
        const limits = getListenerLimits(userProfile);
        if (!limits.hasAds) {
          nextTrack();
          return;
        }

        // Fetch ad
        let query = supabase
          .from('audio_ads')
          .select('*')
          .eq('active', true)
          .order('type', { ascending: false }); // promo (artist) first

        if (userProfile?.city) {
          query = query.or(`target_city.eq.${userProfile.city},target_city.is.null`);
        }

        const { data: ads, error } = await query.limit(10);
        
        if (error || !ads || ads.length === 0) {
          nextTrack();
          return;
        }

        // Filter valid ads (plays_used < plays_purchased)
        const validAds = ads.filter(a => a.plays_used < a.plays_purchased);
        if (validAds.length === 0) {
          nextTrack();
          return;
        }

        const ad = validAds[Math.floor(Math.random() * validAds.length)];
        
        setAdPlaying(true);
        setAdSkipAvailable(false);
        setCurrentAd(ad);
        
        // Use a dummy Song object for the player state to show ad info
        const adSong: Song = {
          id: ad.id,
          title: ad.title,
          artist_id: ad.artist_id || 'platform',
          artist_name: ad.advertiser_name,
          audio_url: ad.audio_url,
          cover_url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
          price: 0,
          duration: ad.duration_seconds || 30,
          is_for_sale: false,
          genre: 'AD'
        } as any;

        setCurrentSong(adSong);
        setIsPlaying(true);
        if (audioRef.current) {
            audioRef.current.src = ad.audio_url;
            audioRef.current.load();
        }
      } catch (err) {
        nextTrack();
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
          let formatted = data.map((s: any) => ({
             ...s,
             artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
             cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
             audio_url: s.audio_url,
             profiles: s.profiles
          }));

          // Check which songs the user has purchased
          if (userProfile?.id) {
            const { data: userPurchases } = await supabase
              .from('fan_purchases')
              .select('song_id')
              .eq('fan_id', userProfile.id);

            const fetchedIds = new Set(
              (userPurchases || []).map(p => p.song_id as string)
            );
            // Update state so SongCard BUY buttons update immediately
            setPurchasedIds(fetchedIds);
            formatted = formatted.map(song => ({
              ...song,
              is_purchased: fetchedIds.has(song.id)
            }));
          }

          if (currentSong) {
            const next = await getRadioNextSong(currentSong, formatted);
            if (next) {
              playSong(next, [next]);
            } else {
              nextTrack();
            }
          } else {
            const next = formatted[Math.floor(Math.random() * formatted.length)];
            if (next) playSong(next, [next]);
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
  }, [currentSong, userProfile?.subscription_tier, userProfile?.user_type]);

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
          e.preventDefault();
          seek(Math.min(duration, currentTime + 10));
          break;
        case 'ArrowLeft':
          e.preventDefault();
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
        case 'KeyN':
          nextTrack();
          break;
        case 'KeyP':
          previousTrack();
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
        audioRef.current.src = song.audio_url;
        audioRef.current.load();
      }
    }
  };

  const playQueue = (songs: Song[], startIndex = 0) => {
    if (songs.length === 0) return;
    setQueue(songs);
    const songToPlay = songs[startIndex] || songs[0];
    
    lastIncrementedSongId.current = null;
    setCurrentSong(songToPlay);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = songToPlay.audio_url;
      audioRef.current.load();
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
      if (adPlaying) return;
      
      // Respect preview limit
      const tier = (userProfile?.subscription_tier || 'free').toLowerCase();
      const isUnlockablePremium = tier === 'premium' || tier === 'family' || userProfile?.user_type === 'artist';
      if (currentSong && !currentSong.is_purchased && !isUnlockablePremium && time >= 30) {
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

  const fetchPurchasedSongs = async () => {
    if (!userProfile?.id) {
       setPurchasedIds(new Set());
       return;
    }
    try {
       const { data } = await supabase
          .from('fan_purchases')
          .select('song_id')
          .eq('fan_id', userProfile.id);
       
       if (data) {
          setPurchasedIds(new Set(data.map(p => p.song_id)));
       }
    } catch (e) {
       console.error('Error fetching purchases:', e);
    }
  };

  useEffect(() => {
    fetchPurchasedSongs();
  }, [userProfile?.id]);

  // Derived currentSong with latest purchase status
  const currentSongWithStats = useMemo(() => {
    if (!currentSong) return null;
    return {
      ...currentSong,
      is_purchased: currentSong.is_purchased || purchasedIds.has(currentSong.id)
    };
  }, [currentSong, purchasedIds]);

  const value = useMemo(() => ({
    currentSong: currentSongWithStats,
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
    adSkipAvailable,
    skipAd,
    isShuffle,
    repeatMode,
    toggleRadioMode,
    toggleShuffle,
    toggleRepeat,
    playSong,
    playQueue,
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
    removeFromQueue,
    purchasedIds,
    refreshPurchasedIds
  }), [
    currentSong, isPlaying, currentTime, duration, volume, queue, dataSaver,
    eqPreset, playbackRate, sleepTimerRemaining, isExpanded, radioMode,
    adPlaying, adSkipAvailable, isShuffle, repeatMode, purchasedIds
  ]);

  return (
    <PlayerContext.Provider value={value}>
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
