export type ArtistTier =
  | 'Free' | 'free'
  | 'RisingStar' | 'risingstar' | 'rising_star'
  | 'Standard' | 'standard'
  | 'Elite' | 'elite'
  | 'Label' | 'label';

export type ListenerTier =
  | 'Free' | 'free'
  | 'DailyPass' | 'dailypass'
  | 'WeeklyPass' | 'weeklypass'
  | 'Premium' | 'premium'
  | 'Family' | 'family';

export const getListenerTier = (user: any): ListenerTier => {
  if (!user) return 'Free';
  const tier = user.subscription_tier || 'Free';
  if (tier.toLowerCase() !== 'free') {
     const expiresAt = user.subscription_expires_at || user.subscription_ends;
     if (expiresAt && new Date(expiresAt) < new Date()) {
         return 'Free';
     }
  }
  return tier as ListenerTier;
};

export const getListenerLimits = (user: any) => {
  const tier = (getListenerTier(user) || 'free').toLowerCase();
  const artistTier = (user?.artist_tier || '').toLowerCase();
  const hasPaidArtistTier = ['risingstar', 'rising_star', 'standard', 'elite', 'label'].includes(artistTier);
  const effectiveTier = hasPaidArtistTier ? 'premium' : tier;

  switch (effectiveTier) {
    case 'family':
      return {
        hdAudio: true,
        hasAds: false,
        canDownload: true,
        maxOfflineSongs: Infinity,
        maxSkipsPerHour: Infinity,
        maxPlaylists: Infinity,
        canAccessSnippets: true,
        unlimitedSkips: true,
        hasLyrics: true,
        hasStats: true,
        accountCount: 5,
      };

    case 'premium':
      return {
        hdAudio: true,
        hasAds: false,
        canDownload: true,
        maxOfflineSongs: 50,
        maxSkipsPerHour: Infinity,
        maxPlaylists: Infinity,
        canAccessSnippets: true,
        unlimitedSkips: true,
        hasLyrics: true,
        hasStats: true,
        accountCount: 1,
      };

    case 'weeklypass':
      return {
        hdAudio: true,
        hasAds: false,
        canDownload: true,
        maxOfflineSongs: 15,
        maxSkipsPerHour: Infinity,
        maxPlaylists: Infinity,
        canAccessSnippets: true,
        unlimitedSkips: true,
        hasLyrics: true,
        hasStats: false,
        accountCount: 1,
      };

    case 'dailypass':
      return {
        hdAudio: true,
        hasAds: false,
        canDownload: false,
        maxOfflineSongs: 0,
        maxSkipsPerHour: Infinity,
        maxPlaylists: Infinity,
        canAccessSnippets: true,
        unlimitedSkips: true,
        hasLyrics: true,
        hasStats: false,
        accountCount: 1,
      };

    case 'free':
    default:
      return {
        hdAudio: false,
        hasAds: true,
        canDownload: false,
        maxOfflineSongs: 0,
        maxSkipsPerHour: 6,
        maxPlaylists: 3,
        canAccessSnippets: false,
        unlimitedSkips: false,
        hasLyrics: false,
        hasStats: false,
        accountCount: 1,
      };
  }
};

export const getArtistTier = (artist: any): ArtistTier => {
  if (!artist) return 'free';
  const tier = artist.subscription_tier || artist.artist_tier || 'free';
  if (tier.toLowerCase() !== 'free') {
    const expiresAt =
      artist.subscription_ends ||
      artist.subscription_expires_at ||
      artist.tier_expires_at;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return 'free';
    }
  }
  return tier as ArtistTier;
};

export const getTrackLimit = (tier: string): number => {
  const trackLimits: Record<string, number> = {
    free: 3,
    Free: 3,
    RisingStar: 10,
    risingstar: 10,
    rising_star: 10,
    Standard: 15,
    standard: 15,
    Elite: 25,
    elite: 25,
    Label: 150,
    label: 150,
  };
  return trackLimits[tier] || 3;
};

export const getTierLimits = (artist: any) => {
  const tier = (getArtistTier(artist) || 'free');
  const normalizedTier = tier.toLowerCase().replace('-', '_');
  const maxTracks = getTrackLimit(tier);

  switch (normalizedTier) {
    case 'label':
      return {
        maxUploads: maxTracks,
        yearlyUploads: maxTracks,
        canWithdraw: true,
        platformFee: 0.05,
        subscriptionFee: 0.05,
        analytics: 'full',
        hasFullAnalytics: true,
        canCreateAlbums: true,
        songLimit: maxTracks,
        monthlyLimit: maxTracks,
        canPostSnippets: true,
        canSellSongs: true,
        canReceiveSubs: true,
        hasFanMessaging: true,
        hasVerifiedBadge: true,
        hasGoldBadge: true,
        hasCustomUrl: true,
        maxWithdrawal: Infinity,
        payoutSpeed: 'Instant',
        freeFeaturements: 5,
        maxManagedArtists: 3,
      };
    case 'elite':
      return {
        maxUploads: maxTracks,
        yearlyUploads: maxTracks,
        canWithdraw: true,
        platformFee: 0.05,
        subscriptionFee: 0.05,
        analytics: 'full',
        hasFullAnalytics: true,
        canCreateAlbums: true,
        songLimit: maxTracks,
        monthlyLimit: maxTracks,
        canPostSnippets: true,
        canSellSongs: true,
        canReceiveSubs: true,
        hasFanMessaging: true,
        hasVerifiedBadge: true,
        hasGoldBadge: true,
        hasCustomUrl: true,
        maxWithdrawal: Infinity,
        payoutSpeed: 'Instant',
        freeFeaturements: 3,
        maxManagedArtists: 1,
      };

    case 'standard':
      return {
        maxUploads: maxTracks,
        yearlyUploads: maxTracks,
        canWithdraw: true,
        platformFee: 0.07,
        subscriptionFee: 0.07,
        analytics: 'advanced',
        hasFullAnalytics: true,
        canCreateAlbums: true,
        songLimit: maxTracks,
        monthlyLimit: maxTracks,
        canPostSnippets: true,
        canSellSongs: true,
        canReceiveSubs: true,
        hasFanMessaging: true,
        hasVerifiedBadge: true,
        hasGoldBadge: false,
        hasCustomUrl: true,
        maxWithdrawal: 500000,
        payoutSpeed: '24 hours',
        freeFeaturements: 1,
        maxManagedArtists: 1,
      };

    case 'risingstar':
    case 'rising_star':
      return {
        maxUploads: maxTracks,
        yearlyUploads: maxTracks,
        canWithdraw: true,
        platformFee: 0.10,
        subscriptionFee: 0.10,
        analytics: 'standard',
        hasFullAnalytics: false,
        canCreateAlbums: true,
        songLimit: maxTracks,
        monthlyLimit: maxTracks,
        canPostSnippets: true,
        canSellSongs: true,
        canReceiveSubs: true,
        hasFanMessaging: true,
        hasVerifiedBadge: false,
        hasGoldBadge: false,
        hasCustomUrl: false,
        maxWithdrawal: 200000,
        payoutSpeed: '3 days',
        freeFeaturements: 0,
        maxManagedArtists: 1,
      };

    case 'free':
    default:
      return {
        maxUploads: maxTracks,
        yearlyUploads: maxTracks,
        canWithdraw: false,
        platformFee: 0.15,
        subscriptionFee: 0.15,
        analytics: 'basic',
        hasFullAnalytics: false,
        canCreateAlbums: false,
        songLimit: maxTracks,
        monthlyLimit: maxTracks,
        canPostSnippets: false,
        canSellSongs: false,
        canReceiveSubs: false,
        hasFanMessaging: false,
        hasVerifiedBadge: false,
        hasGoldBadge: false,
        hasCustomUrl: false,
        maxWithdrawal: 50000,
        payoutSpeed: '7 days',
        freeFeaturements: 0,
        maxManagedArtists: 1,
      };
  }
};

export const getSongsUploadedThisMonth = async (userProfile: any, supabaseClient: any) => {
  // Logic to query supabase for songs uploaded
  // This is a stub for synchronous operations; real check done in backend or skipped for MVP
  // The UI doesn't strictly depend on this to compile, we just need it exported if imported
  return 0;
};

export const canUploadTrack = async (artist: any, supabaseClient: any): Promise<boolean> => {
  if (!artist || !artist.id) return false;
  const tier: ArtistTier = artist.artist_tier || artist.subscription_tier || 'Free';
  const limits = getTierLimits(artist);

  const { count, error } = await supabaseClient
    .from('songs')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artist.id);

  if (error) {
    console.error("Error checking upload limits:", error);
    return false;
  }

  return (count || 0) < limits.maxUploads;
};

export const canWithdrawalFunds = (artist: any): boolean => {
  if (!artist) return false;
  const limits = getTierLimits(artist);
  return limits.canWithdraw;
};

export const canReceiveFanSubscriptions = (artist: any): boolean => {
  if (!artist) return false;
  const tier = (getArtistTier(artist) || 'free').toLowerCase();
  return tier !== 'free';
};

export const canAccessAdvancedAnalytics = (artist: any): boolean => {
  if (!artist) return false;
  const tier = (getArtistTier(artist) || 'free').toLowerCase();
  return tier === 'standard' || tier === 'elite';
};

export const canSetExclusiveContent = (artist: any): boolean => {
  if (!artist) return false;
  const tier = (getArtistTier(artist) || 'free').toLowerCase();
  return tier !== 'free';
};

export const getWithdrawalLimit = (artist: any): number => {
  if (!artist) return 50000;
  const tier = (getArtistTier(artist) || 'free').toLowerCase();
  switch (tier) {
    case 'free': return 50000;
    case 'risingstar':
    case 'rising_star': return 200000;
    case 'standard': return 500000;
    case 'elite': return Infinity;
    default: return 50000;
  }
};

export const getPlatformFee = (
  artist: any,
  type: 'tip' | 'sale' | 'subscription'
): number => {
  const limits = getTierLimits(artist);
  if (type === 'subscription') {
    return limits.subscriptionFee ?? 0.20;
  }
  return limits.platformFee ?? 0.15;
};

export const isFeatureAvailable = (feature: string, tier: string | undefined): boolean => {
  const currentTier = (tier || 'free').toLowerCase();
  
  const featureRequirements: Record<string, string[]> = {
    'advancedAnalytics': ['standard', 'elite'],
    'exclusiveContent': ['risingstar', 'rising_star', 'standard', 'elite'],
    'fanSubscriptions': ['risingstar', 'rising_star', 'standard', 'elite'],
    'verifiedBadge': ['standard', 'elite'],
    'customUrl': ['standard', 'elite'],
    'fanMessaging': ['risingstar', 'rising_star', 'standard', 'elite'],
  };
  
  const allowedTiers = featureRequirements[feature];
  if (!allowedTiers) return true;
  
  return allowedTiers.includes(currentTier);
};

