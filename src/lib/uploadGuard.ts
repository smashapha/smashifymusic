import { supabase } from './supabase';

export interface UploadGuardResult {
  allowed: boolean;
  message: string;
  slotsUsed?: number;
  slotsMax?: number;
  slotsRemaining?: number;
  subscriptionEnds?: string | null;
  daysRemaining?: number | null;
}

const TIER_LIMITS: Record<string, number> = {
  free: 3,
  risingstar: 10,
  standard: 15,
  elite: 25,
};

export async function checkCanUpload(artistId: string, fileSize?: number): Promise<UploadGuardResult> {
  try {
    // 1. Fetch artist profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('artist_tier, subscription_ends, extra_track_slots')
      .eq('id', artistId)
      .single();

    if (error || !profile) {
      return { allowed: false, message: "Could not retrieve artist profile." };
    }

    const currentTier = (profile.artist_tier || 'Free').toLowerCase();
    const isFree = currentTier === 'free';
    
    if (fileSize && isFree && fileSize > 8 * 1024 * 1024) {
      return { allowed: false, message: 'Free tier supports files up to 8MB. Upgrade to Rising Star for up to 50MB uploads.' };
    }
    
    // 2. Check if subscription_ends has passed
    let daysRemaining: number | null = null;
    let isExpired = false;
    
    if (!isFree && profile.subscription_ends) {
      const endsDate = new Date(profile.subscription_ends);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((endsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      if (endsDate < now) {
        isExpired = true;
      }
    }

    // 3. Count active songs that are NOT archived
    const { count, error: countError } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artistId)
      .eq('is_active', true)
      .neq('slot_mode', 'archive');

    if (countError) {
      return { allowed: false, message: "Could not count current active tracks." };
    }

    const activeCount = count || 0;

    // 4. Get max slots
    let baseSlots = TIER_LIMITS[currentTier] || 3;
    let extraSlots = (profile.extra_track_slots || 0) * 10;
    const maxSlots = baseSlots + extraSlots;
    const slotsRemaining = Math.max(0, maxSlots - activeCount);

    if (isExpired) {
       return { 
         allowed: false, 
         message: "Your 6-month hosting window has expired or you have reached your slot limit. Please renew or upgrade to continue.",
         slotsUsed: activeCount,
         slotsMax: maxSlots,
         slotsRemaining: 0,
         subscriptionEnds: profile.subscription_ends,
         daysRemaining: 0
       };
    }

    if (slotsRemaining <= 0) {
      return {
         allowed: false,
         message: "Your 6-month hosting window has expired or you have reached your slot limit. Please renew or upgrade to continue.",
         slotsUsed: activeCount,
         slotsMax: maxSlots,
         slotsRemaining: 0,
         subscriptionEnds: profile.subscription_ends,
         daysRemaining
      };
    }

    return {
      allowed: true,
      message: "Ready to upload.",
      slotsUsed: activeCount,
      slotsMax: maxSlots,
      slotsRemaining,
      subscriptionEnds: profile.subscription_ends,
      daysRemaining
    };

  } catch (err: any) {
    return { allowed: false, message: "An unexpected error occurred while checking upload limits." };
  }
}

export async function checkCanPlaySong(songId: string): Promise<{
  canPlay: boolean;
  reason?: 'vaulted' | 'subscription_expired' | 'not_found';
  message?: string;
}> {
  try {
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('is_active, artist_id')
      .eq('id', songId)
      .single();

    if (songError || !song) {
      return { canPlay: false, reason: 'not_found', message: 'Song not found.' };
    }

    // Fast path: if active, it's playable. Vaulted songs might still be in top 3 or have expired limits.
    // Wait, the specification says:
    // "This checks songs.is_active and profiles.subscription_ends for the song's artist before allowing playback. 
    // If the artist subscription has expired and the song is not in the top 3 active songs, return canPlay: false."
    // By the time it has expired, vault_expired_artist_tracks sets is_active = false for non-top 3.
    // So we just need to check is_active? The instructions say "This checks songs.is_active and profiles.subscription_ends for the song's artist..."
    
    if (song.is_active) {
      return { canPlay: true };
    }

    // If it's not active, let's fetch the artist's profile to see why.
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_ends, artist_tier')
      .eq('id', song.artist_id)
      .single();

    if (profile && (profile.artist_tier || 'Free').toLowerCase() !== 'free' && profile.subscription_ends) {
      const endsDate = new Date(profile.subscription_ends);
      if (endsDate < new Date()) {
         return {
           canPlay: false,
           reason: 'subscription_expired',
           message: "The artist's hosting subscription has expired. This track is temporarily vaulted."
         };
      }
    }

    return {
      canPlay: false,
      reason: 'vaulted',
      message: "This track has been vaulted and is currently unavailable."
    };

  } catch (err) {
    return { canPlay: false, reason: 'not_found', message: 'Error checking playback status.' };
  }
}

export async function renewArtistSubscription(
  artistId: string,
  newTier: 'RisingStar' | 'Standard' | 'Elite',
  billingCycle: 'monthly' | '6month' = '6month'
): Promise<{ success: boolean; newExpiry: string; restoredTracks: number }> {
  try {
    const now = new Date();
    const expiry = new Date();
    const monthsToAdd = billingCycle === 'monthly' ? 1 : 6;
    expiry.setMonth(expiry.getMonth() + monthsToAdd);
    
    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_starts_at: now.toISOString(),
        subscription_ends: expiry.toISOString(),
        artist_tier: newTier,
        is_paused: false,
      })
      .eq('id', artistId);

    if (profileError) {
      console.error(profileError);
      return { success: false, newExpiry: '', restoredTracks: 0 };
    }

    // Now restore vaulted songs up to slot limit
    const tierLimit = TIER_LIMITS[newTier.toLowerCase()] || 3;
    
    // Get extra_track_slots
    const { data: profile } = await supabase.from('profiles').select('extra_track_slots').eq('id', artistId).single();
    const extraSlots = (profile?.extra_track_slots || 0) * 10;
    const maxSlots = tierLimit + extraSlots;

    // First, count currently active songs that are NOT archived
    const { count: activeCount } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artistId)
      .eq('is_active', true)
      .neq('slot_mode', 'archive');
      
    const currentActiveCount = activeCount || 0;
    let restoredTracks = 0;

    if (currentActiveCount > maxSlots) {
      const excessCount = currentActiveCount - maxSlots;
      // Vault excess songs ordered by plays ASC
      const { data: songsToVault } = await supabase
        .from('songs')
        .select('id')
        .eq('artist_id', artistId)
        .eq('is_active', true)
        .order('plays', { ascending: true })
        .limit(excessCount);

      if (songsToVault && songsToVault.length > 0) {
        const idsToVault = songsToVault.map(s => s.id);
        await supabase
          .from('songs')
          .update({
            is_active: false,
            vaulted_at: new Date().toISOString(),
            vaulted_reason: 'tier_downgrade'
          })
          .in('id', idsToVault);
          
        await supabase.from('notifications').insert({
          profile_id: artistId,
          user_type: 'artist',
          type: 'tier_downgrade_vault',
          message: `You downgraded to ${newTier}. Your top ${maxSlots} tracks are live. ${excessCount} tracks have been vaulted. Upgrade anytime to restore them.`,
          link: '/artist-hub#songs',
        });
      }
    } else if (currentActiveCount < maxSlots) {
      const slotsRemaining = maxSlots - currentActiveCount;
      // Find vaulted songs to restore, ordered by plays DESC
      const { data: vaultedSongs } = await supabase
        .from('songs')
        .select('id')
        .eq('artist_id', artistId)
        .eq('is_active', false)
        .order('plays', { ascending: false })
        .limit(slotsRemaining);

      if (vaultedSongs && vaultedSongs.length > 0) {
        const idsToRestore = vaultedSongs.map(s => s.id);
        const { error: restoreError } = await supabase
          .from('songs')
          .update({
            is_active: true,
            vaulted_at: null,
            vaulted_reason: null
          })
          .in('id', idsToRestore);
          
        if (!restoreError) {
          restoredTracks = idsToRestore.length;
        }
      }
    }

    return {
      success: true,
      newExpiry: expiry.toISOString(),
      restoredTracks
    };
  } catch (err) {
    console.error(err);
    return { success: false, newExpiry: '', restoredTracks: 0 };
  }
}
