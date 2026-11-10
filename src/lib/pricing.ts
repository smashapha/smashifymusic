import { Song } from '../types';

/**
 * Returns the price a fan actually pays right now, accounting for an active
 * promotional discount. Falls back to the full listed price if there is no
 * discount, the discount is 0, or the sale has expired.
 */
export function getEffectivePrice(song: Pick<Song, 'price' | 'discount_percent' | 'sale_ends_at'>): number {
  if (!song || !song.price) return song?.price || 0;

  const pct = song.discount_percent || 0;
  if (pct <= 0) return song.price;

  if (song.sale_ends_at && new Date(song.sale_ends_at).getTime() < Date.now()) {
    return song.price; // sale expired — full price
  }

  const discounted = Math.round(song.price * (1 - pct / 100));
  return Math.max(discounted, 1); // never let it round down to 0
}

/** True if the track currently has an active, non-expired discount. */
export function isOnSale(song: Pick<Song, 'price' | 'discount_percent' | 'sale_ends_at'>): boolean {
  return getEffectivePrice(song) < (song?.price || 0);
}

/** Human-readable time remaining, e.g. "2d 4h left" — for UI badges. Returns null if no active sale. */
export function getSaleTimeRemaining(song: Pick<Song, 'discount_percent' | 'sale_ends_at'>): string | null {
  if (!song?.discount_percent || !song?.sale_ends_at) return null;
  const msLeft = new Date(song.sale_ends_at).getTime() - Date.now();
  if (msLeft <= 0) return null;
  const hours = Math.floor(msLeft / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m left`;
}

/**
 * Returns effective price for an album considering active promotions.
 */
export function getEffectiveAlbumPrice(album: { price?: number; discount_percent?: number; sale_ends_at?: string }): number {
  if (!album || !album.price) return album?.price || 0;

  const pct = album.discount_percent || 0;
  if (pct <= 0) return album.price;

  if (album.sale_ends_at && new Date(album.sale_ends_at).getTime() < Date.now()) {
    return album.price;
  }

  const discounted = Math.round(album.price * (1 - pct / 100));
  return Math.max(discounted, 1);
}

/** True if the album currently has an active, non-expired discount. */
export function isAlbumOnSale(album: { price?: number; discount_percent?: number; sale_ends_at?: string }): boolean {
  return getEffectiveAlbumPrice(album) < (album?.price || 0);
}

/** Time remaining for album promotion. */
export function getAlbumSaleTimeRemaining(album: { discount_percent?: number; sale_ends_at?: string }): string | null {
  return getSaleTimeRemaining(album as any);
}

