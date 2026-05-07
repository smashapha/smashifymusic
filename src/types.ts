export interface Song {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  url: string;          // audio_url from DB
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
  plays?: number;
  approved?: boolean;
  is_for_sale?: boolean;
  album_id?: string;
  profiles?: { 
    full_name: string; 
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
  subscription_tier?: string;
  wallet_balance?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  stage_name?: string;
  avatar_url?: string;
  bio?: string;
  instagram?: string;
  twitter?: string;
  city?: string;
  genre?: string;
  is_artist: boolean;
  subscription_tier?: string;
  subscription_ends?: string;
  wallet_balance?: number;
  phone?: string;
}

export interface Transaction {
  id: string;
  type: 'sale' | 'donation' | 'withdrawal';
  amount: number;
  net_amount?: number;
  created_at: string;
  status: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_url?: string;
  created_at: string;
  is_public: boolean;
  songs_count?: number;
}

export type EQPreset = 'normal' | 'bass' | 'treble' | 'vocal' | 'club';
