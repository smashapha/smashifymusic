import { supabase } from './supabase';
import { useState, useEffect } from 'react';
import { isCached, cacheSong, removeCachedSong, getOfflineLimit } from './offlineCache';
import toast from 'react-hot-toast';

const LOCAL_KEY = 'smash_downloads';

export async function fetchSavedSongIds(userId: string | undefined): Promise<Set<string>> {
  if (!userId) {
    try {
      const local = localStorage.getItem(LOCAL_KEY);
      if (local) {
        return new Set(JSON.parse(local));
      }
    } catch (e) {
      // Ignore
    }
    return new Set();
  }

  const { data, error } = await supabase
    .from('offline_saves')
    .select('song_id')
    .eq('profile_id', userId);

  if (error || !data) {
    return new Set();
  }

  return new Set(data.map((row) => row.song_id));
}

export async function addSavedSong(userId: string | undefined, songId: string): Promise<void> {
  if (!userId) {
    try {
      const local = localStorage.getItem(LOCAL_KEY);
      const set = local ? new Set<string>(JSON.parse(local)) : new Set<string>();
      set.add(songId);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {
      // Ignore
    }
    window.dispatchEvent(new CustomEvent('smash_offline_updated', { detail: { songId, isSaved: true } }));
    return;
  }

  await supabase
    .from('offline_saves')
    .insert({ profile_id: userId, song_id: songId })
    .select()
    .maybeSingle(); 

  window.dispatchEvent(new CustomEvent('smash_offline_updated', { detail: { songId, isSaved: true } }));
}

export async function removeSavedSong(userId: string | undefined, songId: string): Promise<void> {
  if (!userId) {
    try {
      const local = localStorage.getItem(LOCAL_KEY);
      if (local) {
        const set = new Set<string>(JSON.parse(local));
        set.delete(songId);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.from(set)));
      }
    } catch (e) {
      // Ignore
    }
    window.dispatchEvent(new CustomEvent('smash_offline_updated', { detail: { songId, isSaved: false } }));
    return;
  }

  await supabase
    .from('offline_saves')
    .delete()
    .eq('profile_id', userId)
    .eq('song_id', songId);

  window.dispatchEvent(new CustomEvent('smash_offline_updated', { detail: { songId, isSaved: false } }));
}

export function useOfflineSong(songId: string, userProfile: any | undefined) {
  const [isSaved, setIsSaved] = useState(false);
  const [isCachedLocal, setIsCachedLocal] = useState(false);
  const [cacheProgress, setCacheProgress] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        const cached = await isCached(songId);
        if (mounted) setIsCachedLocal(cached);

        const savedIds = await fetchSavedSongIds(userProfile?.id);
        if (mounted) setIsSaved(savedIds.has(songId));
      } catch (e) {
        console.error(e);
      }
    };
    checkStatus();

    const handleUpdate = (e: any) => {
      if (e.detail.songId === songId) {
        setIsSaved(e.detail.isSaved);
        if (e.detail.isCached !== undefined) {
          setIsCachedLocal(e.detail.isCached);
        }
      }
    };

    const handleProgress = (e: any) => {
      if (e.detail.songId === songId) {
        setCacheProgress(e.detail.percent);
        if (e.detail.percent === 100) {
          setTimeout(() => {
            setCacheProgress(null);
            setIsCachedLocal(true);
          }, 500);
        }
      }
    };

    window.addEventListener('smash_offline_updated', handleUpdate);
    window.addEventListener('smashify_offline_progress', handleProgress);

    return () => {
      mounted = false;
      window.removeEventListener('smash_offline_updated', handleUpdate);
      window.removeEventListener('smashify_offline_progress', handleProgress);
    };
  }, [songId, userProfile?.id]);

  const toggleOffline = async (song: any, navigate?: any) => {
    if (isCachedLocal) {
      // Remove
      try {
        await removeCachedSong(song);
        await removeSavedSong(userProfile?.id, song.id);
        setIsCachedLocal(false);
        setIsSaved(false);
        toast.success('Removed from offline downloads');
      } catch (e) {
        toast.error('Failed to remove download');
      }
      return;
    }

    if (isSaved && !isCachedLocal) {
      // Download now
      try {
        setCacheProgress(0);
        await cacheSong(song, userProfile);
        setIsCachedLocal(true);
        toast.success('Downloaded for offline listening');
      } catch (e: any) {
        setCacheProgress(null);
        if (e.message === 'limit') {
           const limit = getOfflineLimit(userProfile);
           toast.error(limit === 5 ? 'Free plan includes 5 offline songs. Upgrade for 50.' : 'Offline limit reached.');
           if (limit === 5 && navigate) navigate('/pricing');
        } else {
           toast.error('Failed to download');
        }
      }
      return;
    }

    // Save and download
    try {
      setCacheProgress(0);
      await cacheSong(song, userProfile);
      setIsCachedLocal(true);
      await addSavedSong(userProfile?.id, song.id);
      setIsSaved(true);
      toast.success('Saved for offline listening');
    } catch (e: any) {
      setCacheProgress(null);
      if (e.message === 'limit') {
         const limit = getOfflineLimit(userProfile);
         toast.error(limit === 5 ? 'Free plan includes 5 offline songs. Upgrade for 50.' : 'Offline limit reached.');
         if (limit === 5 && navigate) navigate('/pricing');
      } else {
         toast.error('Failed to save');
      }
    }
  };

  return { isSaved, isCachedLocal, cacheProgress, toggleOffline };
}

