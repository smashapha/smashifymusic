import { optimizeImage } from './imageUtils';
import { getListenerLimits } from './tierUtils';
import { supabase } from './supabase';

export interface OfflineSong {
  songId: string;
  title: string;
  artist_name: string;
  coverUrl: string;
  size: number;
  addedAt: string;
}

const DB_NAME = 'smashify-offline';
const STORE_NAME = 'manifest';
const CACHE_NAME = 'smashify-audio-v1';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'songId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function getManifest(): Promise<OfflineSong[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function isCached(songId: string): Promise<boolean> {
  const manifest = await getManifest();
  const entry = manifest.find((item) => item.songId === songId);
  if (!entry) return false;
  
  // Actually verify it's in the cache API too just in case
  const cache = await caches.open(CACHE_NAME);
  // We don't have the original URL easily here, so we rely on the manifest existence,
  // but to be safe we can let player fallback if cache match fails later.
  return true;
}

export function getOfflineLimit(userProfile?: any): number {
  const limits = getListenerLimits(userProfile);
  return limits.maxOfflineSongs || 5;
}

export async function cacheSong(
  song: { id: string; url?: string; audio_url?: string; title: string; artist_name: string; cover_url?: string },
  userProfile: any,
  onProgress?: (percent: number) => void
): Promise<void> {
  const limit = getOfflineLimit(userProfile);
  const manifest = await getManifest();
  
  if (!manifest.find((item) => item.songId === song.id) && manifest.length >= limit) {
    throw new Error('limit');
  }

  const audioUrl = song.url || song.audio_url;
  if (!audioUrl) throw new Error('No audio URL provided');

  const cache = await caches.open(CACHE_NAME);
  
  const response = await fetch(audioUrl, { mode: 'cors' });
  if (!response.ok || !response.body) throw new Error('Failed to fetch audio');

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
  let loadedBytes = 0;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loadedBytes += value.length;
      if (totalBytes > 0) {
        const percent = Math.round((loadedBytes / totalBytes) * 100);
        if (onProgress) onProgress(percent);
        window.dispatchEvent(
          new CustomEvent('smashify_offline_progress', { detail: { songId: song.id, percent } })
        );
      }
    }
  }

  const blob = new Blob(chunks, { type: 'audio/mpeg' });
  const finalSize = totalBytes > 0 ? totalBytes : blob.size;

  const cacheResponse = new Response(blob, {
    headers: { 'Content-Type': 'audio/mpeg' }
  });

  await cache.put(audioUrl, cacheResponse);

  const coverUrl = song.cover_url ? optimizeImage(song.cover_url, 300) : '';
  if (coverUrl) {
    try {
      const coverRes = await fetch(coverUrl, { mode: 'cors' });
      if (coverRes.ok) {
        await cache.put(coverUrl, coverRes);
      }
    } catch (e) {
      console.warn('Failed to cache cover image', e);
    }
  }

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      songId: song.id,
      title: song.title,
      artist_name: song.artist_name,
      coverUrl: coverUrl,
      size: finalSize,
      addedAt: new Date().toISOString()
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

export async function removeCachedSong(song: { id: string; url?: string; audio_url?: string; cover_url?: string }): Promise<void> {
  const audioUrl = song.url || song.audio_url;
  const coverUrl = song.cover_url ? optimizeImage(song.cover_url, 300) : '';
  
  const cache = await caches.open(CACHE_NAME);
  if (audioUrl) await cache.delete(audioUrl);
  if (coverUrl) await cache.delete(coverUrl);
  
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(song.id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllCached(): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  for (const request of keys) {
    await cache.delete(request);
  }
  
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getStorageInfo(): Promise<{ usage: number; quota: number; persisted: boolean }> {
  let usage = 0;
  let quota = 0;
  let persisted = false;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usage = estimate.usage || 0;
      quota = estimate.quota || 0;
    } catch (e) {
      // Ignore
    }
  }

  if (navigator.storage && navigator.storage.persisted) {
    try {
      persisted = await navigator.storage.persisted();
    } catch (e) {
      // Ignore
    }
  }

  return { usage, quota, persisted };
}

let objectUrlMap: Record<string, string> = {};

export async function getBlobUrlForSong(songId: string, originalUrl: string): Promise<string | null> {
  const cache = await caches.open(CACHE_NAME);
  const match = await cache.match(originalUrl);
  if (!match) return null;
  
  const blob = await match.blob();
  if (objectUrlMap[songId]) {
    URL.revokeObjectURL(objectUrlMap[songId]);
  }
  
  const newUrl = URL.createObjectURL(blob);
  objectUrlMap[songId] = newUrl;
  return newUrl;
}

export async function migrateLegacyDownloads(userId: string | undefined): Promise<void> {
  if (!userId) return;
  const legacyDownloads = localStorage.getItem('smash_downloads');
  if (legacyDownloads) {
    try {
      const savedIds = JSON.parse(legacyDownloads) as string[];
      if (Array.isArray(savedIds) && savedIds.length > 0) {
        for (const id of savedIds) {
          await supabase.from('offline_saves').insert({ profile_id: userId, song_id: id }).select().maybeSingle();
        }
      }
      localStorage.removeItem('smash_downloads');
    } catch (e) {
      console.error('Migration failed', e);
    }
  }
}
