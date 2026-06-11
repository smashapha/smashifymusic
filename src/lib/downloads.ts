import { supabase } from './supabase';

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

    // Verify artist tier
    const { data: artist } = await supabase
      .from('profiles')
      .select('artist_tier')
      .eq('id', song.artist_id)
      .single();

    const eliteTiers = ['Elite', 'elite', 'Label', 'label'];
    if (!artist || !eliteTiers.includes(artist.artist_tier)) {
      throw new Error('This track is no longer available for download. The artist has changed their plan.');
    }

    // 3. Fetch the file as a blob to force browser download
    //    (prevents browser from just navigating to the URL)
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
