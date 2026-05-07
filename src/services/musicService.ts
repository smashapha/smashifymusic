import { supabase } from '../lib/supabase';
import { Song, Artist } from '../types';

export const musicService = {
  /**
   * Fetches the latest trending songs from Malawi
   */
  async getTrendingSongs(): Promise<Song[]> {
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

      return data as Song[];
    } catch (error) {
      console.warn('Supabase fetch failed, using fallback trending data');
      return [
        {
          id: '1',
          title: 'Malawi Gold',
          artist_id: 'a1',
          artist_name: 'The Great Artist',
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
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
      .from('purchases')
      .insert({
        user_id: userId,
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
      .from('purchases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
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
