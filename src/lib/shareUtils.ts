import toast from 'react-hot-toast';
import { Song } from '../types';
import { formatArtistName } from './formatting';
import { supabase } from './supabase';

/**
 * Robust clipboard copy function with fallback for restricted iframes / insecure contexts
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try standard Navigator Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, falling back to execCommand:', err);
    }
  }

  // 2. Fallback to textarea + execCommand for iframes / older environments
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);

    // iOS and Safari focus/select support
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return Boolean(successful);
  } catch (err) {
    console.error('execCommand copy fallback failed:', err);
    return false;
  }
}

/**
 * Share or copy link to a song
 */
export async function shareSong(song: Song, options?: { showToast?: boolean }): Promise<void> {
  const showToast = options?.showToast ?? true;
  const displayArtist = formatArtistName(song.artist_name, (song as any).featured_artist);
  const shareUrl = song.artist_id
    ? `${window.location.origin}/artist/${song.artist_id}`
    : `${window.location.origin}/home`;

  const shareData = {
    title: `${song.title} - ${displayArtist}`,
    text: `🎵 Stream "${song.title}" by ${displayArtist} on Smashify!`,
    url: shareUrl,
  };

  // Best-effort share metric increment
  try {
    if (song.id) {
      void supabase.rpc('increment_shares', { song_id: song.id });
    }
  } catch {}

  // 1. Try native Web Share API if supported
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData);
      return;
    } catch (err: any) {
      // If user deliberately dismissed/aborted the share sheet, exit cleanly
      if (err?.name === 'AbortError') {
        return;
      }
      console.warn('Native share failed, falling back to copy:', err);
    }
  }

  // 2. Fallback to copy link to clipboard
  const copied = await copyToClipboard(shareUrl);
  if (copied) {
    if (showToast) {
      toast.success('Song link copied to clipboard!');
    }
  } else if (showToast) {
    toast.error('Could not copy link to clipboard');
  }
}
