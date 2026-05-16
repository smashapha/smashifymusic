import { supabase } from '../lib/supabase';
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
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('trending', true)
        .limit(10);
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
          throw new Error('No songs found');
      }

      const songs = data as Song[];
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
   * Records a successful purchase in Database
   */
  async recordPurchase(userId: string, songId: string, amount: number, tx_ref: string) {
    const { data, error } = await supabase
      .from('fan_purchases')
      .insert({
        fan_id: userId,
        song_id: songId,
        amount,
        transaction_id: tx_ref,
        status: 'completed'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
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
   * Increments the play count for a song
   */
  async incrementPlays(songId: string) {
    try {
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
