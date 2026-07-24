import { supabase } from './supabase';
import { getListenerLimits } from './tierUtils';

export interface DownloadPermissionResult {
  canDownload: boolean;
  reason?: string;
  code?: 'GUEST' | 'NO_SUBSCRIPTION' | 'OK';
}

/**
 * Checks if the user is authorized to download a given song.
 * Rules:
 * - Guests (unauthenticated): No download access.
 * - Songs on sale (is_for_sale): MUST be purchased by the user to download. Active subscription does NOT bypass track purchase!
 * - Non-sale songs: Available if purchased OR if the user has an active listener subscription.
 */
export function checkDownloadPermission(
  userProfile: any | null,
  song: any,
  purchasedIds?: Set<string>
): DownloadPermissionResult {
  // 1. Guest user check
  if (!userProfile || !userProfile.id) {
    return {
      canDownload: false,
      reason: 'Guests cannot download songs. Please sign in or purchase this song.',
      code: 'GUEST'
    };
  }

  // 2. Purchased song check or track owner check
  const isOwner = userProfile?.id && song?.artist_id === userProfile.id;
  const isPurchased = Boolean(song?.is_purchased || (purchasedIds && purchasedIds.has(song?.id)) || isOwner);

  // 3. Songs on Sale check
  const isForSale = Boolean(song?.is_for_sale);
  if (isForSale) {
    if (isPurchased) {
      return { canDownload: true, code: 'OK' };
    }
    return {
      canDownload: false,
      reason: 'This song is on sale. You must purchase the song to download it.',
      code: 'NO_SUBSCRIPTION'
    };
  }

  // 4. Non-sale songs
  if (isPurchased) {
    return { canDownload: true, code: 'OK' };
  }

  // Active subscription check for non-sale tracks
  const limits = getListenerLimits(userProfile);
  if (limits.canDownload) {
    return { canDownload: true, code: 'OK' };
  }

  // Free user without purchase or active subscription
  return {
    canDownload: false,
    reason: 'Downloads are not available for free users without an active subscription. Upgrade your plan or purchase the song to download.',
    code: 'NO_SUBSCRIPTION'
  };
}

export async function handleTrackDownload(
  song: any,
  userProfile: any | null,
  purchasedIds?: Set<string>,
  onAuthRequired?: () => void
): Promise<void> {
  const perm = checkDownloadPermission(userProfile, song, purchasedIds);
  if (!perm.canDownload) {
    if (perm.code === 'GUEST' && onAuthRequired) {
      onAuthRequired();
    }
    throw new Error(perm.reason || 'Download not allowed');
  }

  if (!song?.audio_url && !song?.id) {
    throw new Error('Song audio file not available for download.');
  }

  const isPurchased = song.is_purchased || (purchasedIds && purchasedIds.has(song.id));
  if (isPurchased && userProfile?.id) {
    try {
      await downloadPurchasedSong(song.id, userProfile.id);
      return;
    } catch (err: any) {
      console.warn('downloadPurchasedSong failed, attempting direct fetch download:', err?.message);
    }
  }

  if (!song.audio_url) {
    throw new Error('Song audio URL is missing.');
  }

  const response = await fetch(song.audio_url);
  if (!response.ok) {
    throw new Error('Failed to fetch audio file for download.');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  const artistName = song.artist_name || song.profiles?.stage_name || song.profiles?.full_name || 'Artist';
  const displayArtist = song.featured_artist ? `${artistName} ft. ${song.featured_artist}` : artistName;
  const displayTitle = song.title || 'Track';
  link.download = `${displayTitle} - ${displayArtist}.mp3`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}

export async function downloadPurchasedSong(
  songId: string,
  userId: string
): Promise<void> {
  try {
    // 1. Verify purchase exists
    const { data: purchase, error: purchaseError } = await supabase
      .from('fan_purchases')
      .select('id')
      .eq('fan_id', userId)
      .eq('song_id', songId)
      .maybeSingle();

    if (purchaseError || !purchase) {
      throw new Error('Purchase not found. Please contact support.');
    }

    // 2. Get song details
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('audio_url, title, artist_name, artist_id')
      .eq('id', songId)
      .single();

    if (songError || !song?.audio_url) {
      throw new Error('Song file not available for download.');
    }

    // 3. Fetch the file as a blob to force browser download
    const response = await fetch(song.audio_url);
    if (!response.ok) throw new Error('Failed to fetch audio file.');

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${song.artist_name || 'Artist'} - ${song.title || 'Track'}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL after download starts
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  } catch (err: any) {
    throw new Error(err.message || 'Download failed. Please try again.');
  }
}

export async function checkSongPurchased(
  songId: string,
  userId: string | undefined
): Promise<boolean> {
  if (!userId || !songId) return false;
  try {
    const { data } = await supabase
      .from('fan_purchases')
      .select('id')
      .eq('fan_id', userId)
      .eq('song_id', songId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}
