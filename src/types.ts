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
  audio_url: string;          // Renamed from url
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
  subscription_tier?: string;
  wallet_balance?: number;
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
  genre?: string;
  is_artist: boolean;
  is_admin?: boolean;
  verified?: boolean;
  followers_count?: number;
  total_plays?: number;
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
