import { optimizeImage } from "../lib/imageUtils";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Music2,
  Disc,
  Sparkles,
  ChevronRight,
  X,
  LayoutGrid,
  List,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { Song, UserProfile } from "../types";
import SongCard from "../components/common/SongCard";
import Avatar from "../components/common/Avatar";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { getAiRecommendations } from "../services/aiService";
import { musicService } from "../services/musicService";
import SEO from "../components/common/SEO";
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING, GRID_SONG_CARDS, GRID_ARTIST_CARDS, GRID_LIST_CARDS } from "../lib/layout";
import { Skeleton, SongCardSkeleton, ListRowSkeleton, SectionHeaderSkeleton } from "../components/common/Skeleton";

const GENRES = [
  { name: "Afropop", icon: Music2 },
  { name: "Hip Hop", icon: Sparkles },
  { name: "Amapiano", icon: Disc },
  { name: "Gospel", icon: Music2 },
  { name: "Reggae", icon: Music2 },
  { name: "R&B", icon: Music2 },
];

const Discover: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile } = useAuth();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const initialQuery = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [results, setResults] = useState<{
    songs: Song[];
    artists: UserProfile[];
  }>({ songs: [], artists: [] });
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<Song[]>([]);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [isRefreshingRecs, setIsRefreshingRecs] = useState(false);
  const [publicPlaylists, setPublicPlaylists] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"songs" | "artists">("songs");

  // Pagination state for all songs
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsPage, setSongsPage] = useState(0);
  const [hasMoreSongs, setHasMoreSongs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - startY.current;
    if (deltaY > 80 && window.scrollY === 0) {
      setRefreshing(true);
      await Promise.all([
        fetchTrending(),
        fetchRecommendations(),
        fetchAllSongs(),
        handleSearch(),
      ]);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTrending();
    fetchRecommendations();
    fetchAllSongs();

    const fetchPublicPlaylists = async () => {
      try {
        const { data: playlistsData, error } = await supabase
          .from('playlists')
          .select('id, name, cover_url, profile_id, is_public, playlist_songs(song_id)')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(12);

        if (error || !playlistsData) {
          console.error('Error fetching public playlists in Discover:', error);
          setPublicPlaylists([]);
          return;
        }

        const allSongIds = new Set<string>();
        const allProfileIds = new Set<string>();

        playlistsData.forEach((pl: any) => {
          if (pl.profile_id) allProfileIds.add(pl.profile_id);
          (pl.playlist_songs || []).forEach((ps: any) => {
            if (ps.song_id) allSongIds.add(ps.song_id);
          });
        });

        let songsLookup: Record<string, any> = {};
        if (allSongIds.size > 0) {
          const { data: sData } = await supabase
            .from('songs')
            .select('id, cover_url')
            .in('id', Array.from(allSongIds));
          (sData || []).forEach(s => { songsLookup[s.id] = s; });
        }

        let profilesLookup: Record<string, any> = {};
        if (allProfileIds.size > 0) {
          const { data: pData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', Array.from(allProfileIds));
          (pData || []).forEach(p => { profilesLookup[p.id] = p; });
        }

        const resultData = playlistsData.map((pl: any) => ({
          ...pl,
          profiles: pl.profile_id ? (profilesLookup[pl.profile_id] || null) : null,
          playlist_songs: (pl.playlist_songs || []).map((ps: any) => ({
            ...ps,
            songs: songsLookup[ps.song_id] || null
          }))
        }));

        setPublicPlaylists(resultData);
      } catch (err) {
        console.error('Error in fetchPublicPlaylists:', err);
        setPublicPlaylists([]);
      }
    };
    fetchPublicPlaylists();
  }, [userProfile]);

  const fetchAllSongs = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: allSongs } = await supabase
        .from("songs")
        .select("*, profiles!artist_id(full_name, stage_name, avatar_url)")
        .eq("approved", true)
        .lte("release_date", today)
        .order("plays", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (allSongs) {
        const formatted = allSongs.map((s: any) => ({
          ...s,
          artist_name:
            s.profiles?.stage_name || s.profiles?.full_name || "Artist",
          cover_url:
            s.cover_url ||
            "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop",
          url: s.audio_url,
          profiles: s.profiles,
        }));

        const enriched = await musicService.enrichSongsWithPurchases(
          formatted as any,
          userProfile?.id,
        );
        setSongs(enriched as any);
        setHasMoreSongs(allSongs.length === PAGE_SIZE);
        setSongsPage(1);
      }
    } catch (err) {
      console.error("Error fetching all songs:", err);
    }
  };

  const loadMoreSongs = async () => {
    if (loadingMore || !hasMoreSongs) return;
    setLoadingMore(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const from = songsPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data } = await supabase
        .from("songs")
        .select("*, profiles!artist_id(full_name, stage_name, avatar_url)")
        .eq("approved", true)
        .lte("release_date", today)
        .order("plays", { ascending: false })
        .range(from, to);

      if (data && data.length > 0) {
        const formatted = data.map((s: any) => ({
          ...s,
          artist_name:
            s.profiles?.stage_name || s.profiles?.full_name || "Artist",
          cover_url:
            s.cover_url ||
            "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop",
          url: s.audio_url,
          profiles: s.profiles,
        }));
        const enriched = await musicService.enrichSongsWithPurchases(
          formatted as any,
          userProfile?.id,
        );
        setSongs((prev) => [...prev, ...(enriched as any)]);
        setSongsPage((prev) => prev + 1);
        setHasMoreSongs(data.length === PAGE_SIZE);
      } else {
        setHasMoreSongs(false);
      }
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchRecommendations = async () => {
    setIsRefreshingRecs(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: allSongs } = await supabase
        .from("songs")
        .select("*, profiles!artist_id(full_name, stage_name, avatar_url)")
        .eq("approved", true)
        .lte("release_date", today)
        .order("plays", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (allSongs) {
        const formatted = allSongs.map((s: any) => ({
          ...s,
          artist_name:
            s.profiles?.stage_name || s.profiles?.full_name || "Artist",
          cover_url:
            s.cover_url ||
            "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop",
          url: s.audio_url,
          profiles: s.profiles,
        }));

        let likedSongs: string[] = [];
        try {
          const likedIds = JSON.parse(
            localStorage.getItem("smash_liked_songs") || "[]",
          );
          likedSongs = formatted
            .filter((s) => likedIds.includes(s.id))
            .map((s) => s.title);
        } catch (e) {
          console.error("Error parsing likes:", e);
        }

        const recommendations = await getAiRecommendations(
          likedSongs,
          formatted as Song[],
        );
        setRecommendedSongs(recommendations);
      }
    } catch (err) {
      console.error("Recommendations error:", err);
    } finally {
      setIsRefreshingRecs(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery || selectedGenre) {
        handleSearch();
      } else {
        setResults({ songs: [], artists: [] });
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedGenre]);

  const fetchTrending = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("songs")
        .select("*, profiles!artist_id(full_name, stage_name, avatar_url)")
        .eq("approved", true)
        .lte("release_date", today)
        .order("plays", { ascending: false })
        .limit(6);
      if (data) {
        const baseSongs = data.map((s) => ({
          ...s,
          artist_name:
            s.profiles?.stage_name || s.profiles?.full_name || "Artist",
          cover_url:
            s.cover_url ||
            "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop",
          url: s.audio_url,
          profiles: s.profiles,
        }));

        const enriched = await musicService.enrichSongsWithPurchases(
          baseSongs as any,
          userProfile?.id,
        );
        setTrending(enriched as any);
      }
    } catch (err) {
      console.error("Error fetching trending:", err);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      let songsQuery = supabase
        .from("songs")
        .select("*, profiles!artist_id(full_name, stage_name, avatar_url)")
        .eq("approved", true)
        .lte("release_date", today);

      if (searchQuery) {
        songsQuery = songsQuery.ilike("title", `%${searchQuery}%`);
      }
      if (selectedGenre) {
        songsQuery = songsQuery.eq("genre", selectedGenre);
      }

      const { data: songsData } = await songsQuery.limit(20);

      const baseSongs = (songsData || []).map((s) => ({
        ...s,
        artist_name:
          s.profiles?.stage_name || s.profiles?.full_name || "Artist",
        cover_url:
          s.cover_url ||
          "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop",
        url: s.audio_url,
      }));

      const enrichedSongs = await musicService.enrichSongsWithPurchases(
        baseSongs as any,
        userProfile?.id,
      );

      let artistsQuery = supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "artist")
        .not("stage_name", "is", null);

      if (searchQuery) {
        artistsQuery = artistsQuery.ilike("stage_name", `%${searchQuery}%`);
      }
      if (selectedGenre) {
        artistsQuery = artistsQuery.eq("genre", selectedGenre);
      }

      const { data: artistsData } = await artistsQuery.limit(10);

      setResults({
        songs: enrichedSongs as any,
        artists: (artistsData || []).map((a) => ({
          ...a,
          display_name: a.stage_name || a.full_name,
        })) as any,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isSearchActive = Boolean(searchQuery || selectedGenre);

  return (
    <div
      className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} space-y-8 md:space-y-10 pt-4 md:pt-6`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <SEO 
        title="Discover New African Music | Smashify Music" 
        description="Explore the latest African sounds, new music releases, and diverse genres from across the continent." 
      />

      {refreshing && (
        <div className="flex justify-center -mt-6 pt-2">
          <div className="w-5 h-5 border-2 border-[#00A3FF] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* a) PAGE HERO */}
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] mb-1.5">
            EXPLORE THE CATALOGUE
          </p>
          <h1 className="text-4xl md:text-[56px] font-studio font-bold text-white tracking-tight leading-none">
            Discover<span className="text-[#00A3FF]">.</span>
          </h1>
          <p className="text-[13px] md:text-[14px] text-[#B0B0B0] mt-2">
            The latest African sounds, charting anthems, and personalized selections.
          </p>
        </div>

        {/* Full-width search command bar */}
        <div className="relative w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B0B0] transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search artists, tracks or genres…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 bg-[#1A1A1A] border border-white/10 rounded-[12px] pl-11 pr-10 text-[14px] text-white placeholder:text-[#737373] focus:outline-none focus:border-[#00A3FF] focus:ring-1 focus:ring-[#00A3FF] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#B0B0B0] hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* b) STICKY FILTER ROW */}
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md py-2.5 -mx-4 px-4 md:-mx-0 md:px-0 border-b border-white/5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedGenre(null)}
            className={`h-8 px-4 rounded-full text-[13px] font-medium transition-all whitespace-nowrap border shrink-0 flex items-center ${
              !selectedGenre
                ? "bg-[#00A3FF]/15 text-[#00A3FF] border-[#00A3FF]/40 font-semibold"
                : "bg-[#1A1A1A] text-[#B0B0B0] border-white/10 hover:text-white hover:border-white/20"
            }`}
          >
            All
          </button>
          {GENRES.map((genre) => {
            const Icon = genre.icon;
            const isSelected = selectedGenre === genre.name;
            return (
              <button
                key={genre.name}
                onClick={() =>
                  setSelectedGenre(isSelected ? null : genre.name)
                }
                className={`h-8 px-3.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap border shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#00A3FF]/15 text-[#00A3FF] border-[#00A3FF]/40 font-semibold"
                    : "bg-[#1A1A1A] text-[#B0B0B0] border-white/10 hover:text-white hover:border-white/20"
                }`}
              >
                <Icon size={14} className={isSelected ? "text-[#00A3FF]" : "text-[#B0B0B0]"} />
                <span>{genre.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
            className="space-y-8 mt-4"
          >
            <span className="sr-only">Loading discover music...</span>
            {/* Chip row skeleton */}
            <div className="flex items-center gap-2 overflow-x-hidden no-scrollbar py-1">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Skeleton key={n} className="h-8 w-20 rounded-full shrink-0" />
              ))}
            </div>

            {/* Trending chart skeleton: 5 ListRowSkeletons with ghost numeral */}
            <div className="space-y-3">
              <SectionHeaderSkeleton />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <ListRowSkeleton key={n} showGhostNumber={true} />
                ))}
              </div>
            </div>

            {/* Section header skeleton + grid of 6 SongCardSkeleton */}
            <div className="space-y-4 pt-4">
              <SectionHeaderSkeleton />
              <div className={GRID_SONG_CARDS}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SongCardSkeleton key={n} />
                ))}
              </div>
            </div>
          </motion.div>
        ) : isSearchActive ? (
          /* c) SEARCH RESULTS VIEW */
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A3FF] mb-1">
                  RESULTS
                </p>
                <h2 className="text-2xl font-studio font-bold text-white">
                  {selectedGenre ? selectedGenre : `“${searchQuery}”`}
                </h2>
                <p className="text-[13px] text-[#B0B0B0] mt-0.5">
                  {activeTab === "songs"
                    ? `${results.songs.length} track${results.songs.length === 1 ? "" : "s"} found`
                    : `${results.artists.length} artist${results.artists.length === 1 ? "" : "s"} found`}
                </p>
              </div>

              {/* Segmented control: Songs / Artists */}
              <div className="flex p-1 bg-white/5 rounded-full border border-white/10 w-fit">
                <button
                  onClick={() => setActiveTab("songs")}
                  className={`text-[13px] font-semibold py-1.5 px-4 rounded-full transition-all ${
                    activeTab === "songs"
                      ? "bg-white text-black shadow-sm"
                      : "text-[#B0B0B0] hover:text-white"
                  }`}
                >
                  Songs ({results.songs.length})
                </button>
                <button
                  onClick={() => setActiveTab("artists")}
                  className={`text-[13px] font-semibold py-1.5 px-4 rounded-full transition-all ${
                    activeTab === "artists"
                      ? "bg-white text-black shadow-sm"
                      : "text-[#B0B0B0] hover:text-white"
                  }`}
                >
                  Artists ({results.artists.length})
                </button>
              </div>
            </div>

            {activeTab === "songs" ? (
              results.songs.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {results.songs.map((song, i) => (
                    <SongCard
                      key={`search-song-${song.id}-${i}`}
                      song={song}
                      queue={results.songs}
                      layout="list"
                    />
                  ))}
                </div>
              ) : (
                <div className="p-12 bg-[#1A1A1A] rounded-[16px] border border-white/10 text-center">
                  <Music2 size={32} className="mx-auto mb-3 text-[#737373]" />
                  <h3 className="text-white font-semibold text-[15px]">No tracks found</h3>
                  <p className="text-[#B0B0B0] text-[13px] mt-1">
                    Try searching for a different keyword or genre.
                  </p>
                </div>
              )
            ) : (
              results.artists.length > 0 ? (
                <div className={GRID_LIST_CARDS}>
                  {results.artists.map((artist, i) => (
                    <div
                      key={`search-artist-${artist.id}-${i}`}
                      onClick={() => navigate(`/artist/${artist.id}`)}
                      className="p-3.5 bg-[#1A1A1A] border border-white/10 rounded-[14px] flex items-center justify-between cursor-pointer hover:border-white/20 transition-all group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white/10">
                          <Avatar
                            src={artist.avatar_url}
                            name={artist.stage_name || artist.full_name}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-[14px] text-white truncate">
                            {artist.stage_name || artist.full_name}
                          </h4>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] mt-0.5">
                            {artist.genre || "Artist"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-[#00A3FF] opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 ml-2"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 bg-[#1A1A1A] rounded-[16px] border border-white/10 text-center">
                  <Avatar name="Artist" className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <h3 className="text-white font-semibold text-[15px]">No artists found</h3>
                  <p className="text-[#B0B0B0] text-[13px] mt-1">
                    Try checking the spelling or browse all artists.
                  </p>
                </div>
              )
            )}
          </motion.div>
        ) : (
          /* DEFAULT DISCOVER VIEW */
          <motion.div
            key="initial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            {/* d) TRENDING NOW — Flagship Section */}
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A3FF] mb-1">
                    TRENDING
                  </p>
                  <h2 className="text-2xl md:text-3xl font-studio font-bold text-white tracking-tight">
                    Trending Now
                  </h2>
                  <p className="text-[13px] text-[#B0B0B0] mt-0.5">
                    The most played anthems lighting up the streets this week.
                  </p>
                </div>

                {/* List / Grid toggle ONLY in this section header */}
                <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-[10px] shrink-0">
                  <button
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                    className={`p-1.5 rounded-[8px] transition-colors ${
                      viewMode === "list"
                        ? "bg-[#00A3FF]/20 text-[#00A3FF] border border-[#00A3FF]/30"
                        : "text-[#B0B0B0] hover:text-white"
                    }`}
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                    className={`p-1.5 rounded-[8px] transition-colors ${
                      viewMode === "grid"
                        ? "bg-[#00A3FF]/20 text-[#00A3FF] border border-[#00A3FF]/30"
                        : "text-[#B0B0B0] hover:text-white"
                    }`}
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </div>

              {viewMode === "grid" ? (
                <div className={GRID_SONG_CARDS}>
                  {trending.map((song, i) => (
                    <SongCard
                      key={`grid-trending-${song.id}-${i}`}
                      song={song}
                      queue={trending}
                      layout="grid"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {trending.slice(0, 5).map((song, i) => {
                    const isCurrent = currentSong?.id === song.id;
                    const isTrackPlaying = isCurrent && isPlaying;
                    const rankNum = i + 1;
                    return (
                      <div
                        key={`trending-chart-row-${song.id}`}
                        onClick={() => {
                          if (isCurrent) {
                            togglePlay();
                          } else {
                            playSong(song, trending);
                          }
                        }}
                        className="group bg-[#1A1A1A] border border-white/10 hover:border-[#00A3FF]/30 rounded-[14px] p-3 flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Big Ghost Numeral */}
                          <span
                            className={`font-studio text-[28px] md:text-[36px] font-bold w-8 text-center shrink-0 leading-none select-none ${
                              rankNum === 1 ? "text-[#00A3FF]" : "text-white/20"
                            }`}
                          >
                            {rankNum}
                          </span>

                          {/* 56px Cover with Play Hover */}
                          <div className="relative w-14 h-14 rounded-[10px] overflow-hidden shrink-0 bg-black/40 border border-white/10">
                            <img
                              src={optimizeImage(song.cover_url, 120, 120)}
                              alt={song.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                              decoding="async"
                            />
                            <div
                              className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                                isCurrent ? "opacity-100 bg-[#00A3FF]/40" : "opacity-0 group-hover:opacity-100"
                              }`}
                            >
                              {isTrackPlaying ? (
                                <Pause size={18} fill="white" className="text-white" />
                              ) : (
                                <Play size={18} fill="white" className="text-white ml-0.5" />
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1 pr-3">
                            <h4 className={`text-[14px] font-semibold truncate ${isCurrent ? "text-[#00A3FF]" : "text-white"}`}>
                              {song.title}
                            </h4>
                            <p className="text-[12px] text-[#B0B0B0] truncate mt-0.5">
                              {song.artist_name}
                            </p>
                          </div>
                        </div>

                        {/* Play count & Trend indicator */}
                        <div className="flex items-center gap-4 shrink-0 pr-2">
                          <div className="text-right hidden sm:block">
                            <p className="text-[12px] font-medium text-white font-mono">
                              {Number(song.plays || 0) > 1000
                                ? `${(Number(song.plays || 0) / 1000).toFixed(1)}K plays`
                                : `${Number(song.plays || 0)} plays`}
                            </p>
                            <p className="text-[11px] text-[#B0B0B0]">This week</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCurrent) {
                                togglePlay();
                              } else {
                                playSong(song, trending);
                              }
                            }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                              isCurrent
                                ? "bg-[#00A3FF] text-white"
                                : "bg-white/5 group-hover:bg-[#00A3FF] text-white/60 group-hover:text-white"
                            }`}
                            aria-label="Play song"
                          >
                            {isTrackPlaying ? (
                              <Pause size={15} fill="currentColor" />
                            ) : (
                              <Play size={15} fill="currentColor" className="ml-0.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* e) FOR YOU — Personalized Section */}
            {recommendedSongs.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] mb-1">
                      PERSONALIZED
                    </p>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-2xl font-studio font-bold text-white tracking-tight">
                        For You
                      </h2>
                      <span className="bg-[#00A3FF]/15 text-[#00A3FF] border border-[#00A3FF]/30 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                        AI Pick
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={fetchRecommendations}
                    disabled={isRefreshingRecs}
                    className="text-[13px] font-semibold text-[#B0B0B0] hover:text-[#00A3FF] transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-md hover:bg-white/5 disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isRefreshingRecs ? "animate-spin" : ""} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Horizontal snap rail of SongCards */}
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 -mx-4 px-4 md:-mx-0 md:px-0 snap-x">
                  {recommendedSongs.map((song, i) => (
                    <div
                      key={`snap-rec-${song.id}-${i}`}
                      className="w-[180px] md:w-[200px] shrink-0 snap-start"
                    >
                      <SongCard
                        song={song}
                        queue={recommendedSongs}
                        layout="grid"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* f) BROWSE GENRES — 6 Editorial Tiles */}
            <section className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] mb-1">
                  CATEGORIES
                </p>
                <h2 className="text-2xl font-studio font-bold text-white tracking-tight">
                  Browse Genres
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {GENRES.map((genre) => {
                  const Icon = genre.icon;
                  // Find first song matching this genre from songs list
                  const genreSong = songs.find(
                    (s) => s.genre?.toLowerCase() === genre.name.toLowerCase(),
                  );
                  const coverUrl = genreSong?.cover_url;

                  return (
                    <div
                      key={`genre-tile-${genre.name}`}
                      onClick={() => setSelectedGenre(genre.name)}
                      className="group relative aspect-[2/1] bg-[#1A1A1A] border border-white/10 rounded-[16px] overflow-hidden cursor-pointer hover:border-[#00A3FF]/40 transition-all p-4 flex flex-col justify-end"
                    >
                      {coverUrl ? (
                        <img
                          src={optimizeImage(coverUrl, 400, 200)}
                          alt={genre.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[#1A1A1A] flex items-center justify-center">
                          <Icon size={32} className="text-[#00A3FF]/40" />
                        </div>
                      )}

                      {/* 65% Scrim Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/90 via-[#0A0A0A]/60 to-transparent" />

                      <div className="relative z-10">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] mb-0.5">
                          GENRE
                        </p>
                        <h3 className="text-lg font-bold text-white leading-tight group-hover:text-[#00A3FF] transition-colors">
                          {genre.name}
                        </h3>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* g) COMMUNITY PLAYLISTS */}
            {publicPlaylists.length > 0 && (
              <section className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] mb-1">
                    CURATED
                  </p>
                  <h2 className="text-2xl font-studio font-bold text-white tracking-tight">
                    Community Playlists
                  </h2>
                </div>
                <div className={GRID_SONG_CARDS}>
                  {publicPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => navigate(`/playlist/${pl.id}`)}
                      className="group cursor-pointer bg-[#1A1A1A] border border-white/10 hover:border-white/20 rounded-[16px] p-3 transition-all"
                    >
                      <div className="aspect-square bg-black/40 rounded-[12px] overflow-hidden border border-white/5 relative mb-2.5">
                        {pl.cover_url ? (
                          <img
                            src={optimizeImage(pl.cover_url, 300, 300)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            alt={pl.name}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="grid grid-cols-2 h-full w-full">
                            {(pl.playlist_songs || [])
                              .slice(0, 4)
                              .map((ps: any, i: number) => (
                                <img
                                  key={i}
                                  src={optimizeImage(
                                    ps.songs?.cover_url ||
                                      "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&h=200&fit=crop",
                                    150,
                                    150,
                                  )}
                                  className="w-full h-full object-cover"
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                />
                              ))}
                          </div>
                        )}
                      </div>
                      <p className="text-[14px] font-semibold text-white truncate">
                        {pl.name}
                      </p>
                      <p className="text-[12px] text-[#B0B0B0] truncate mt-0.5">
                        By {pl.profiles?.full_name || "Smashify User"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* h) ALL SONGS */}
            {songs.length > 0 && (
              <section className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] mb-1">
                    ALL TRACKS
                  </p>
                  <h2 className="text-2xl font-studio font-bold text-white tracking-tight">
                    Full Catalogue
                  </h2>
                </div>
                {viewMode === "grid" ? (
                  <div className={GRID_SONG_CARDS}>
                    {songs.map((song, i) => (
                      <SongCard
                        key={`all-songs-grid-${song.id}-${i}`}
                        song={song}
                        queue={songs}
                        layout="grid"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {songs.map((song, i) => (
                      <SongCard
                        key={`all-songs-row-${song.id}-${i}`}
                        song={song}
                        queue={songs}
                        layout="list"
                      />
                    ))}
                  </div>
                )}
                {hasMoreSongs && (
                  <div className="pt-2">
                    <button
                      onClick={loadMoreSongs}
                      disabled={loadingMore}
                      className="w-full py-3.5 bg-[#1A1A1A] hover:bg-white/5 border border-white/10 rounded-[12px] text-white text-[13px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#00A3FF] border-t-transparent rounded-full animate-spin" />
                          <span>Loading more tracks…</span>
                        </>
                      ) : (
                        "Load More"
                      )}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* i) BOTTOM CTA */}
            <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div>
                <h4 className="text-lg font-bold text-white mb-1">
                  Looking for more?
                </h4>
                <p className="text-[13px] text-[#B0B0B0]">
                  Explore our registered artists or dive into the hottest trending chart.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to="/artists"
                  className="px-5 py-2.5 bg-white/5 border border-white/10 hover:border-[#00A3FF]/40 hover:text-[#00A3FF] text-white rounded-[10px] text-[13px] font-semibold transition-all"
                >
                  Browse Artists
                </Link>
                <Link
                  to="/trending"
                  className="px-5 py-2.5 bg-white/5 border border-white/10 hover:border-[#00A3FF]/40 hover:text-[#00A3FF] text-white rounded-[10px] text-[13px] font-semibold transition-all"
                >
                  Trending Hits
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Discover;
