export interface Album {
  id: string;
  artist_id: string;
  title: string;
  cover_url: string;
  release_year: number;
}

export interface Song {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  audio_url: string;
  cover_url: string;
  price: number;
  duration?: number;
  trending?: boolean;
  is_purchased?: boolean;
  snippet_url?: string;
  is_unreleased?: boolean;
  genre?: string;
  region?: string;
  lyrics?: string;
  featured_artist?: string;
  plays?: number;
  approved?: boolean;
  status?: 'pending' | 'approved';
  is_for_sale?: boolean;
  album_id?: string;
  supporter_only?: boolean;
  created_at?: string;
  profiles?: { 
    full_name: string; 
    stage_name?: string;
    avatar_url: string; 
    verified: boolean; 
  };
}

export interface Artist {
  id: string;
  name: string;
  stage_name?: string;
  bio: string;
  avatar_url: string;
  banner_url?: string;
  verified: boolean;
  followers_count?: number;
  total_plays?: number;
  genre?: string;
  location?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  artist_tier?: 'Free' | 'RisingStar' | 'Standard' | 'Elite';
  tier_expires_at?: string;
  custom_url?: string;
  wallet_balance?: number;
  total_earned?: number;
  withdrawal_limit?: number;
  payout_speed?: string;
  label_id?: string;
  approved?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  stage_name?: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  instagram?: string;
  twitter?: string;
  city?: string;
  location?: string;
  genre?: string;
  is_artist: boolean;
  is_admin?: boolean;
  verified?: boolean;
  followers_count?: number;
  total_plays?: number;
  subscription_tier?: string;
  subscription_ends?: string;
  subscription_price?: number;
  wallet_balance?: number;
  phone?: string;
  phone_verified?: boolean;
  family_plan_id?: string;
  approved?: boolean;
  agent_reference?: string;
}

export interface Transaction {
  id: string;
  fan_id: string;
  artist_id: string;
  song_id?: string;
  type: 'tip' | 'sale' | 'subscription' | 'featured' | 'tier_upgrade';
  gross_amount: number;
  platform_fee: number;
  artist_payout: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paychangu_reference?: string;
  created_at: string;
}

export interface FanPurchase {
  id: string;
  fan_id: string;
  song_id: string;
  transaction_id: string;
  purchased_at: string;
}

export interface FanSubscription {
  id: string;
  fan_id: string;
  artist_id: string;
  amount: number;
  status: 'active' | 'cancelled' | 'expired';
  started_at: string;
  renews_at: string;
  transaction_id: string;
}

export interface FamilyPlan {
  id: string;
  owner_id: string;
  member_ids: string[];
  expires_at: string;
  created_at: string;
}

export interface FeaturedPlacement {
  id: string;
  artist_id: string;
  placement_type: 'homepage' | 'discover' | 'genre' | 'push';
  starts_at: string;
  ends_at: string;
  amount_paid: number;
  status: 'pending_approval' | 'active' | 'expired' | 'rejected';
  admin_note?: string;
}

export interface AudioAd {
  id: string;
  artist_id?: string;
  type: 'platform' | 'promo';
  title: string;
  advertiser_name: string;
  audio_url: string;
  duration_seconds: number;
  target_city?: string;
  target_genre?: string;
  plays_purchased: number;
  plays_used: number;
  active: boolean;
  created_at: string;
  expires_at?: string;
}

export interface PayoutRequest {
  id: string;
  artist_id: string;
  amount: number;
  mobile_number: string;
  network: 'Airtel' | 'TNM';
  status: 'pending' | 'processing' | 'paid' | 'failed';
  paychangu_reference?: string;
  requested_at: string;
  paid_at?: string;
}

export interface Playlist {
  id: string;
  profile_id: string;
  name: string;
  description?: string;
  cover_url?: string;
  created_at: string;
  is_public: boolean;
  songs_count?: number;
}

export type EQPreset = 'normal' | 'bass' | 'treble' | 'vocal' | 'club';
