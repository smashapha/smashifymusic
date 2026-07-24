import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Mic2, CheckCircle, Sparkles, Filter, Music, 
  ChevronRight, Play, ArrowUpRight, Crown, Star, UserCheck, 
  Radio, TrendingUp, Sparkle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import SEO from '../components/common/SEO';
import Avatar from '../components/common/Avatar';
import { usePlayer } from '../context/PlayerContext';
import { Song } from '../types';
import toast from 'react-hot-toast';

interface ArtistProfileData {
  id: string;
  stage_name?: string;
  full_name?: string;
  avatar_url?: string;
  cover_url?: string;
  genre?: string;
  bio?: string;
  verified?: boolean;
  artist_tier?: string;
  user_type?: string;
  role?: string;
  monthly_listeners?: number;
  created_at?: string;
  song_count?: number;
  sample_song?: Song | null;
}

const GENRES = [
  'All',
  'Afrobeat',
  'Hip Hop',
  'Amapiano',
  'Dancehall',
  'Gospel',
  'R&B',
  'Reggae',
  'Pop',
  'Highlife',
  'Traditional'
];

export const ArtistsPage: React.FC = () => {
  const navigate = useNavigate();
  const { playSong } = usePlayer();

  const [artists, setArtists] = useState<ArtistProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [sortBy, setSortBy] = useState<'popular' | 'alpha' | 'newest' | 'verified'>('popular');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // Reset pagination when filter criteria changes
  useEffect(() => {
    setVisibleCount(10);
  }, [searchQuery, selectedGenre, sortBy, onlyVerified]);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    setLoading(true);
    try {
      // Query profiles for signed up artists
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .or('user_type.eq.artist,role.eq.artist');

      if (error) {
        console.error('Error fetching artists:', error);
        toast.error('Failed to load artists list');
        setLoading(false);
        return;
      }

      let artistList: ArtistProfileData[] = profiles || [];

      // If no artists found with explicit user_type/role, fallback to query profiles that have uploaded songs
      if (artistList.length === 0) {
        const { data: songProfiles } = await supabase
          .from('songs')
          .select('artist_id, profiles!artist_id(*)');
        if (songProfiles) {
          const uniqueProfiles = Array.from(
            new Map(
              songProfiles
                .filter((s: any) => s.profiles)
                .map((s: any) => [s.profiles.id, s.profiles])
            ).values()
          );
          artistList = uniqueProfiles as any[];
        }
      }

      // Fetch top sample songs & track count for quick preview
      const { data: songsData } = await supabase
        .from('songs')
        .select('*, profiles:artist_id(id, stage_name, full_name, avatar_url, verified)')
        .eq('approved', true)
        .order('plays', { ascending: false });

      const artistSongMap = new Map<string, { count: number; sample: any }>();
      if (songsData) {
        songsData.forEach((song: any) => {
          const aId = song.artist_id;
          if (!artistSongMap.has(aId)) {
            artistSongMap.set(aId, { count: 1, sample: song });
          } else {
            const current = artistSongMap.get(aId)!;
            artistSongMap.set(aId, { count: current.count + 1, sample: current.sample });
          }
        });
      }

      const enrichedList = artistList.map((artist) => {
        const stats = artistSongMap.get(artist.id);
        return {
          ...artist,
          song_count: stats?.count || 0,
          sample_song: stats?.sample || null,
        };
      });

      setArtists(enrichedList);
    } catch (err) {
      console.error('Error loading artists directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArtists = useMemo(() => {
    return artists
      .filter((artist) => {
        const name = (artist.stage_name || artist.full_name || '').toLowerCase();
        const matchesQuery = name.includes(searchQuery.toLowerCase()) || 
                             (artist.genre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (artist.bio || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesGenre = selectedGenre === 'All' || 
                             (artist.genre && artist.genre.toLowerCase() === selectedGenre.toLowerCase());

        const matchesVerified = !onlyVerified || artist.verified || artist.artist_tier === 'Elite' || artist.artist_tier === 'Label';

        return matchesQuery && matchesGenre && matchesVerified;
      })
      .sort((a, b) => {
        if (sortBy === 'alpha') {
          const nameA = (a.stage_name || a.full_name || '').toLowerCase();
          const nameB = (b.stage_name || b.full_name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        } else if (sortBy === 'newest') {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        } else if (sortBy === 'verified') {
          const scoreA = (a.verified ? 2 : 0) + (a.artist_tier === 'Elite' ? 1 : 0);
          const scoreB = (b.verified ? 2 : 0) + (b.artist_tier === 'Elite' ? 1 : 0);
          return scoreB - scoreA;
        } else {
          // 'popular'
          return (b.song_count || 0) - (a.song_count || 0);
        }
      });
  }, [artists, searchQuery, selectedGenre, sortBy, onlyVerified]);

  const handlePlaySample = (e: React.MouseEvent, song: Song | null) => {
    e.stopPropagation();
    if (!song) {
      toast.error('No tracks available for this artist yet.');
      return;
    }
    playSong(song, [song]);
    toast.success(`Playing ${song.title}`);
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary pb-24 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <SEO 
        title="Artists | Smashify Music" 
        description="Browse all registered African artists signed up on Smashify. Discover talent, stream top tracks, and support creators directly." 
      />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-smash-purple/20 via-bg-surface to-smash-orange/15 border border-white/10 p-6 sm:p-10 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-smash-purple/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-smash-orange/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-smash-purple/20 border border-smash-purple/30 text-smash-purple text-xs font-bold uppercase tracking-widest mb-3">
              <Mic2 size={14} />
              <span>Artist Directory</span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight mb-2">
              Registered Artists on Platform
            </h1>
            <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
              Explore signed-up musicians, singers, producers, and bands. Stream their catalog and buy tracks directly.
            </p>
          </div>

          <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link 
              to="/artists/join" 
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-black font-display font-bold text-xs uppercase tracking-wider hover:bg-smash-orange hover:text-white transition-all shadow-lg active:scale-95"
            >
              <Sparkles size={16} />
              <span>Are You an Artist? Join Studio</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Search & Filtering Controls */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by artist stage name, full name, or genre..."
              className="w-full bg-bg-surface border border-border-default rounded-full pl-11 pr-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-smash-purple transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-bg-surface border border-border-default rounded-full px-4 py-2 text-xs text-text-secondary">
              <Filter size={14} className="text-smash-orange" />
              <span className="font-medium hidden sm:inline">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-text-primary font-bold focus:outline-none cursor-pointer"
              >
                <option value="popular" className="bg-bg-surface text-text-primary">Most Popular</option>
                <option value="verified" className="bg-bg-surface text-text-primary">Verified First</option>
                <option value="alpha" className="bg-bg-surface text-text-primary">A-Z Name</option>
                <option value="newest" className="bg-bg-surface text-text-primary">Newest Joined</option>
              </select>
            </div>

            {/* Verified Only Toggle */}
            <button
              onClick={() => setOnlyVerified(!onlyVerified)}
              className={`px-4 py-2.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                onlyVerified 
                  ? 'bg-smash-purple/20 text-smash-purple border-smash-purple/40' 
                  : 'bg-bg-surface text-text-muted border-border-default hover:text-text-primary'
              }`}
            >
              <CheckCircle size={14} className={onlyVerified ? 'text-smash-purple' : 'opacity-50'} />
              <span>Verified Only</span>
            </button>
          </div>
        </div>

        {/* Genre Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none custom-scrollbar">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedGenre === genre
                  ? 'bg-smash-purple text-white shadow-lg shadow-smash-purple/30 scale-105'
                  : 'bg-bg-surface border border-border-default text-text-secondary hover:text-text-primary hover:border-white/20'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Count Header */}
      <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
          Showing {Math.min(visibleCount, filteredArtists.length)} of {filteredArtists.length} {filteredArtists.length === 1 ? 'Artist' : 'Artists'}
        </p>
        {selectedGenre !== 'All' && (
          <span className="text-xs text-smash-orange font-medium">Filtered by: {selectedGenre}</span>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`artist-skeleton-${i}`} className="bg-bg-surface/50 border border-border-default/50 rounded-2xl p-4 flex flex-col items-center animate-pulse space-y-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/10" />
              <div className="w-3/4 h-4 bg-white/10 rounded-full" />
              <div className="w-1/2 h-3 bg-white/5 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredArtists.length === 0 && (
        <div className="bg-bg-surface border border-border-default rounded-3xl p-12 text-center max-w-lg mx-auto my-12">
          <div className="w-16 h-16 rounded-full bg-smash-purple/10 border border-smash-purple/20 flex items-center justify-center mx-auto mb-4 text-smash-purple">
            <UserCheck size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">No Artists Found</h3>
          <p className="text-xs text-text-muted mb-6 leading-relaxed">
            We couldn't find any artists matching "{searchQuery || selectedGenre}". Try searching with a different term or filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedGenre('All');
              setOnlyVerified(false);
            }}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-text-primary rounded-full text-xs font-bold uppercase tracking-wider transition-all"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Artists Grid */}
      {!loading && filteredArtists.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {filteredArtists.slice(0, visibleCount).map((artist) => {
              const displayName = artist.stage_name || artist.full_name || 'Artist';
              const isElite = artist.artist_tier === 'Elite' || artist.artist_tier === 'Label';

              return (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/artist/${artist.id}`)}
                  className="group relative bg-bg-surface hover:bg-bg-surface-hover border border-border-default hover:border-smash-purple/40 rounded-2xl p-4 flex flex-col items-center text-center transition-all cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-smash-purple/10 overflow-hidden"
                >
                  {/* Elite/Verified Badge Banner */}
                  {isElite && (
                    <div className="absolute top-3 right-3 z-10 p-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400" title="Elite Creator">
                      <Crown size={12} />
                    </div>
                  )}

                  {/* Artist Avatar Container */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-3 rounded-full overflow-hidden shadow-xl border-2 border-white/10 group-hover:border-smash-purple/50 transition-all">
                    <Avatar
                      src={artist.avatar_url}
                      name={displayName}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Play Sample Overlay Button */}
                    {artist.sample_song && (
                      <button
                        onClick={(e) => handlePlaySample(e, artist.sample_song)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-xs"
                        title={`Play ${artist.sample_song.title}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-smash-orange text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                          <Play size={18} fill="currentColor" className="ml-0.5" />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Artist Name & Badge */}
                  <div className="flex items-center gap-1.5 max-w-full mb-1 px-1">
                    <h3 className="font-display font-bold text-sm sm:text-base text-text-primary group-hover:text-smash-orange transition-colors truncate">
                      {displayName}
                    </h3>
                    {(artist.verified || isElite) && (
                      <CheckCircle size={15} className="text-smash-purple shrink-0 fill-smash-purple/20" />
                    )}
                  </div>

                  {/* Genre or Tag */}
                  <span className="text-[11px] font-medium text-text-muted bg-white/5 border border-white/5 rounded-full px-2.5 py-0.5 mb-2 truncate max-w-full">
                    {artist.genre || 'Malawian Artist'}
                  </span>

                  {/* Song Count & Action */}
                  <div className="mt-auto w-full pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-text-muted">
                    <span className="flex items-center gap-1">
                      <Music size={12} className="text-smash-purple" />
                      {artist.song_count} {artist.song_count === 1 ? 'track' : 'tracks'}
                    </span>
                    <span className="text-smash-orange font-bold flex items-center group-hover:translate-x-0.5 transition-transform">
                      View <ChevronRight size={12} />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Load More Button */}
          {visibleCount < filteredArtists.length && (
            <div className="mt-10 text-center flex flex-col items-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 10)}
                className="px-8 py-3 bg-gradient-to-r from-smash-purple to-smash-orange hover:brightness-110 text-white font-display font-bold text-xs uppercase tracking-wider rounded-full shadow-lg shadow-smash-purple/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <span>Load More Artists</span>
                <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px]">
                  +{filteredArtists.length - visibleCount} remaining
                </span>
              </button>
              <p className="text-[11px] text-text-muted mt-2">
                Showing {visibleCount} of {filteredArtists.length} artists
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ArtistsPage;
