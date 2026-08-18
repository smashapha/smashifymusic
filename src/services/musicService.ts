import { supabase } from '../lib/supabase';
import { attachArtistProfilesToSongs } from '../lib/publicCatalog';
import { Song, Artist } from '../types';

export const musicService = {
  /**
   * Enriches a list of songs with purchase status for a specific user
   */
  async enrichSongsWithPurchases(songs: Song[], userId?: string): Promise<Song[]> {
    if (!userId || songs.length === 0) return songs;
    try {
      const { data: userPurchases } = await supabase
        .from('fan_purchases')
        .select('song_id')
        .eq('fan_id', userId);

      const purchasedIds = new Set((userPurchases || []).map(p => p.song_id));

      return songs.map(song => ({
        ...song,
        is_purchased: purchasedIds.has(song.id)
      }));
    } catch (err) {
      console.warn('Failed to enrich songs with purchases', err);
      return songs;
    }
  },

  /**
   * Fetches the latest trending songs from Malawi
   */
  async getTrendingSongs(userId?: string): Promise<Song[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('public_songs')
        .select('*')
        .eq('approved', true)
        .lte('release_date', today)
        .order('plays', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
          throw new Error('No songs found');
      }

      const withProfiles = await attachArtistProfilesToSongs(data);
      const formatted = withProfiles.map((s: any) => ({
        ...s,
        artist_name: s.profiles?.stage_name || s.profiles?.full_name || s.artist_name || 'The Great Artist',
        cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&h=300&fit=crop',
        url: s.audio_url
      }));

      const songs = formatted as unknown as Song[];
      return this.enrichSongsWithPurchases(songs, userId);
    } catch (error) {
      console.warn('Supabase fetch failed, using fallback trending data');
      return [
        {
          id: '1',
          title: 'Malawi Gold',
          artist_id: 'a1',
          artist_name: 'The Great Artist',
          audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          cover_url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&h=300&fit=crop',
          price: 500,
          trending: true,
          is_purchased: false
        },
        // ... in a real app, more items would be here or loaded from a local constant
      ];
    }
  },



  /**
   * Checks if user has already bought the track
   */
  async checkIfSongPurchased(userId: string, songId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('fan_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('fan_id', userId)
      .eq('song_id', songId);

    if (error) throw error;
    return count ? count > 0 : false;
  },

  /**
   * Increments the play count for a song with anti-chart-gaming throttle
   */
  async incrementPlays(songId: string) {
    try {
      // 1. Check anti-chart-gaming throttle RPC before proceeding
      let allowed = true;
      try {
        const { data, error } = await supabase
          .rpc('record_play_throttled', { p_song_id: songId });
        
        if (error) {
          console.warn('record_play_throttled error, falling back to increment:', error.message);
          allowed = true;
        } else if (typeof data === 'boolean') {
          allowed = data;
        }
      } catch (throttleErr) {
        console.warn('record_play_throttled exception, falling back to increment:', throttleErr);
        allowed = true;
      }

      // 2. Only proceed with increments when allowed === true
      if (!allowed) {
        return;
      }

      // Record play for current month
      await supabase.rpc('increment_plays_this_month', { song_id: songId });

      // First try using the RPC function if it exists
      const { error: rpcError } = await supabase.rpc('increment_song_plays', { song_id: songId });
      
      if (rpcError) {
        // Fallback: Fetch, increment, and update (less efficient but works if RPC is missing)
        const { data: song } = await supabase
          .from('songs')
          .select('plays')
          .eq('id', songId)
          .single();
        
        if (song) {
          await supabase
            .from('songs')
            .update({ plays: (song.plays || 0) + 1 })
            .eq('id', songId);
        }
      }
    } catch (err) {
      console.error('Error incrementing play count:', err);
    }
  }
};
