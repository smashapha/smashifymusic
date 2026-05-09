import { supabase } from './supabase';

export type ArtistTier = 'free' | 'rising_star' | 'standard' | 'elite';

export const ARTIST_TIER_LIMITS = {
  free: {
    songLimit: 3,
    monthlyLimit: null,
    canSellSongs: false,
    canCreateAlbums: false,
    canPostSnippets: false,
    canWithdraw: false,
    hasFullAnalytics: false,
    hasVerifiedBadge: false,
    canManageMultiple: false,
    featuredInFeed: false,
    priorityApproval: false,
  },
  rising_star: {
    songLimit: null,
    monthlyLimit: 10,
    canSellSongs: true,
    canCreateAlbums: true,
    canPostSnippets: true,
    canWithdraw: true,
    hasFullAnalytics: false,
    hasVerifiedBadge: false,
    canManageMultiple: false,
    featuredInFeed: false,
    priorityApproval: false,
  },
  standard: {
    songLimit: null,
    monthlyLimit: null,
    canSellSongs: true,
    canCreateAlbums: true,
    canPostSnippets: true,
    canWithdraw: true,
    hasFullAnalytics: true,
    hasVerifiedBadge: false,
    canManageMultiple: false,
    featuredInFeed: true,
    priorityApproval: true,
  },
  elite: {
    songLimit: null,
    monthlyLimit: null,
    canSellSongs: true,
    canCreateAlbums: true,
    canPostSnippets: true,
    canWithdraw: true,
    hasFullAnalytics: true,
    hasVerifiedBadge: true,
    canManageMultiple: true,
    featuredInFeed: true,
    priorityApproval: true,
  },
} as const;

export function getArtistTier(profile: any): ArtistTier {
  if (!profile?.approved) return 'free'; // pending = free tier
  const tier = profile?.subscription_tier?.toLowerCase();
  if (tier === 'rising_star') return 'rising_star';
  if (tier === 'standard') return 'standard';
  if (tier === 'elite') return 'elite';
  return 'free';
}

export function getTierLimits(profile: any) {
  return ARTIST_TIER_LIMITS[getArtistTier(profile)];
}

// Returns how many songs this artist uploaded THIS calendar month
export async function getSongsUploadedThisMonth(supabaseClient: any, artistId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabaseClient
    .from('songs')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artistId)
    .gte('created_at', startOfMonth.toISOString());

  return count || 0;
}

export type ListenerTier = 'free' | 'premium' | 'family';

export const LISTENER_TIER_LIMITS = {
  free: {
    hasAds: true,
    maxPlaylists: 3,
    canDownload: false,
    hdAudio: false,
    canAccessSnippets: false,
    familyAccounts: 1,
    parentalControls: false,
  },
  premium: {
    hasAds: false,
    maxPlaylists: Infinity,
    canDownload: true,
    hdAudio: true,
    canAccessSnippets: true,
    familyAccounts: 1,
    parentalControls: false,
  },
  family: {
    hasAds: false,
    maxPlaylists: Infinity,
    canDownload: true,
    hdAudio: true,
    canAccessSnippets: true,
    familyAccounts: 5,
    parentalControls: true,
  },
} as const;

export function getListenerTier(profile: any): ListenerTier {
  const tier = profile?.subscription_tier?.toLowerCase();
  if (tier === 'premium') return 'premium';
  if (tier === 'family') return 'family';
  return 'free';
}

export function getListenerLimits(profile: any) {
  return LISTENER_TIER_LIMITS[getListenerTier(profile)];
}
