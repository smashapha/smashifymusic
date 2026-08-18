import { supabase } from './supabase';

export interface PublicArtistCatalogItem {
  id: string;
  full_name: string | null;
  stage_name: string | null;
  genre: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  followers_count: number | null;
  total_plays: number | null;
  user_type: string | null;
  verified: boolean | null;
  artist_tier: string | null;
}

/**
 * Manually merges songs fetched from `public_songs` (or `songs`) with corresponding artist profiles
 * fetched from `artist_catalog`, matching by `artist_id === id`.
 * Keeps the exact shape expected by components: `song.profiles.stage_name`, `song.profiles.artist_tier`, etc.
 */
export async function attachArtistProfilesToSongs<T extends { artist_id?: string; profiles?: any; artist_name?: string }>(
  songs: T[]
): Promise<T[]> {
  if (!songs || songs.length === 0) return [];

  const artistIds = Array.from(new Set(songs.map(s => s.artist_id).filter(Boolean))) as string[];
  if (artistIds.length === 0) return songs;

  const { data: artists } = await supabase
    .from('artist_catalog')
    .select('id, full_name, stage_name, genre, location, bio, avatar_url, banner_url, followers_count, total_plays, user_type, verified, artist_tier')
    .in('id', artistIds);

  const artistsMap = new Map<string, PublicArtistCatalogItem>();
  (artists || []).forEach((a: any) => {
    artistsMap.set(a.id, a);
  });

  return songs.map(song => {
    const profile = song.artist_id ? artistsMap.get(song.artist_id) || null : null;
    return {
      ...song,
      profiles: profile,
      artist_name: profile?.stage_name || profile?.full_name || song.artist_name || 'Artist'
    };
  });
}
