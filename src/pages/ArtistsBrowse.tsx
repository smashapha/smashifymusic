import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, BadgeCheck, Users, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { optimizeImage } from '../lib/imageUtils';
import SEO from '../components/common/SEO';
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING } from '../lib/layout';
import { Skeleton } from '../components/common/Skeleton';

interface ArtistProfile {
  id: string;
  stage_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  genre: string | null;
  verified: boolean | null;
  artist_tier: string | null;
  approved: boolean | null;
}

const ArtistsBrowse: React.FC = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [songCounts, setSongCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtistsData = async () => {
      setLoading(true);
      try {
        const { data: artistsData, error: artistsErr } = await supabase
          .from('profiles')
          .select('id, stage_name, full_name, avatar_url, genre, verified, artist_tier, approved')
          .eq('user_type', 'artist')
          .not('stage_name', 'is', null)
          .eq('approved', true)
          .order('created_at', { ascending: false })
          .limit(60);

        if (artistsErr) {
          console.error('Error fetching artists in directory:', artistsErr);
        }

        const { data: songsData, error: songsErr } = await supabase
          .from('songs')
          .select('artist_id')
          .eq('approved', true);

        if (songsErr) {
          console.error('Error fetching songs for artist counts:', songsErr);
        }

        const counts: Record<string, number> = {};
        (songsData || []).forEach((s: any) => {
          if (s.artist_id) {
            counts[s.artist_id] = (counts[s.artist_id] || 0) + 1;
          }
        });

        setArtists(artistsData || []);
        setSongCounts(counts);
      } catch (err) {
        console.error('Error in ArtistsBrowse data load:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtistsData();
  }, []);

  // Dynamically derive unique non-null genres from the artists list (max 8)
  const genres = useMemo(() => {
    const set = new Set<string>();
    artists.forEach((a) => {
      if (a.genre && a.genre.trim()) {
        set.add(a.genre.trim());
      }
    });
    return Array.from(set).slice(0, 8);
  }, [artists]);

  // Filter artists by search query (stage_name, full_name, genre) and selected genre
  const filteredArtists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return artists.filter((a) => {
      const stageName = (a.stage_name || '').toLowerCase();
      const fullName = (a.full_name || '').toLowerCase();
      const genre = (a.genre || '').toLowerCase();

      const matchesSearch =
        !q ||
        stageName.includes(q) ||
        fullName.includes(q) ||
        genre.includes(q);

      const matchesGenre =
        !selectedGenre ||
        (a.genre && a.genre.toLowerCase() === selectedGenre.toLowerCase());

      return matchesSearch && matchesGenre;
    });
  }, [artists, searchQuery, selectedGenre]);

  return (
    <div className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} space-y-8 md:space-y-10 pt-4 md:pt-6`}>
      <SEO
        title="Browse African Artists | Smashify Music"
        description="Browse African creators, stream their music, and support them directly."
      />

      {/* Header */}
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] mb-1.5">
            ARTIST DIRECTORY
          </p>
          <h1 className="text-4xl md:text-[56px] font-studio font-bold text-white tracking-tight leading-none">
            Artists<span className="text-[#00A3FF]">.</span>
          </h1>
          <p className="text-[13px] md:text-[14px] text-[#B0B0B0] mt-2">
            Browse African creators, stream their music, and support them directly.
          </p>
        </div>

        {/* Search Command Bar */}
        <div className="relative w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B0B0] transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search artists or genres…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 bg-[#1A1A1A] border border-white/10 rounded-[12px] pl-11 pr-10 text-[14px] text-white placeholder:text-[#737373] focus:outline-none focus:border-[#00A3FF] focus:ring-1 focus:ring-[#00A3FF] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#B0B0B0] hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Genre Chips Row & Results Count */}
      <div className="space-y-3">
        {genres.length > 0 && (
          <div className="sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md py-2.5 -mx-4 px-4 md:-mx-0 md:px-0 border-b border-white/5">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedGenre(null)}
                className={`h-8 px-4 rounded-full text-[13px] font-medium transition-all whitespace-nowrap border shrink-0 flex items-center ${
                  !selectedGenre
                    ? 'bg-[#00A3FF]/15 text-[#00A3FF] border-[#00A3FF]/40 font-semibold'
                    : 'bg-[#1A1A1A] text-[#B0B0B0] border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                All
              </button>
              {genres.map((genre) => {
                const isSelected = selectedGenre === genre;
                return (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(isSelected ? null : genre)}
                    className={`h-8 px-3.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap border shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#00A3FF]/15 text-[#00A3FF] border-[#00A3FF]/40 font-semibold'
                        : 'bg-[#1A1A1A] text-[#B0B0B0] border-white/10 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span>{genre}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!loading && (
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[12px] font-mono text-[#737373]">
              {filteredArtists.length} {filteredArtists.length === 1 ? 'artist' : 'artists'}
              {selectedGenre ? ` in ${selectedGenre}` : ''}
            </p>
          </div>
        )}
      </div>

      {/* Content Section */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <span className="sr-only">Loading artists...</span>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="bg-[#1A1A1A] border border-white/5 rounded-[16px] p-3 md:p-4 flex flex-col"
              >
                <div className="aspect-square w-full rounded-[12px] skeleton-shimmer mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2 rounded" />
                <div className="flex justify-between items-center mt-auto pt-1">
                  <Skeleton className="h-3 w-1/3 rounded" />
                  <Skeleton className="h-3 w-1/4 rounded" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : filteredArtists.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#B0B0B0] mb-4">
              <Users size={28} />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No artists found</h3>
            <p className="text-[13px] text-[#B0B0B0] max-w-sm">
              Try adjusting your search query or choosing a different genre filter.
            </p>
            {(searchQuery || selectedGenre) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGenre(null);
                }}
                className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-[10px] text-[13px] font-medium border border-white/10 transition-all"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="artists-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredArtists.map((artist) => {
              const count = songCounts[artist.id] || 0;
              const displayName = artist.stage_name || artist.full_name || 'Artist';
              const genreLabel = artist.genre || 'Afrobeats';
              const isElite = artist.artist_tier === 'Elite' || artist.artist_tier === 'Label';
              const songCountLabel = count === 0 ? 'New artist' : `${count} ${count === 1 ? 'song' : 'songs'}`;

              return (
                <div
                  key={artist.id}
                  onClick={() => navigate(`/artist/${artist.id}`)}
                  className="group bg-[#1A1A1A] border border-white/8 hover:border-[#00A3FF]/40 rounded-[16px] overflow-hidden p-3 md:p-4 flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
                >
                  {/* Full-bleed Avatar square */}
                  <div className="relative aspect-square w-full rounded-[12px] overflow-hidden bg-[#0A0A0A] border border-white/8 mb-3">
                    <img
                      src={optimizeImage(artist.avatar_url, 300, 300)}
                      alt={displayName}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                      loading="lazy"
                      decoding="async"
                    />

                    {/* Verified badge top-right */}
                    {artist.verified && (
                      <div
                        className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur-md rounded-full shadow flex items-center justify-center"
                        title="Verified Artist"
                      >
                        <BadgeCheck size={16} className="text-[#00A3FF] fill-[#00A3FF]/20" />
                      </div>
                    )}

                    {/* Elite badge top-left (purple chip ONLY for artist_tier Elite/Label) */}
                    {isElite && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#8B5CF6]/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow flex items-center gap-1">
                        <Sparkles size={10} />
                        <span>Elite</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <h3 className="text-[14px] font-semibold text-white truncate w-full group-hover:text-[#00A3FF] transition-colors">
                    {displayName}
                  </h3>

                  <div className="flex items-center justify-between gap-2 mt-1 w-full">
                    <p className="text-[12px] text-[#B0B0B0] truncate">
                      {genreLabel}
                    </p>
                    <span className="text-[12px] text-[#737373] font-mono shrink-0">
                      {songCountLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArtistsBrowse;
