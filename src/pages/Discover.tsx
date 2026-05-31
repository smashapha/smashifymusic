import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Music2,
  Disc,
  User,
  Sparkles,
  Filter,
  ChevronRight,
  X,
  Zap,
  LayoutGrid,
  List,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { Song, UserProfile } from "../types";
import SongCard from "../components/common/SongCard";
import Avatar from "../components/common/Avatar";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAiRecommendations } from "../services/aiService";
import { musicService } from "../services/musicService";

const GENRES = [
  { name: "Afropop", icon: Music2, color: "text-smash-orange" },
  { name: "Hip Hop", icon: Sparkles, color: "text-smash-purple" },
  { name: "Amapiano", icon: Disc, color: "text-smash-green" },
  { name: "Gospel", icon: Music2, color: "text-text-primary" },
  { name: "Reggae", icon: Music2, color: "text-text-primary" },
  { name: "R&B", icon: Music2, color: "text-text-primary" },
];

const Discover: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile } = useAuth();
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
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery || selectedGenre) {
        handleSearch();
      } else {
        setResults({ songs: [], artists: [] });
      }
    }, 500);

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
        .eq("approved", true);

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

  return (
    <div
      className="space-y-6 md:space-y-8 pb-32 pt-4 md:pt-6 px-4 md:px-8 max-w-7xl mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {refreshing && (
        <div className="flex justify-center -mt-8 pt-8">
          <div className="w-6 h-6 border-2 border-smash-orange border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative group flex-1 max-w-2xl">
          <Search
            className="absolute left-[16px] top-1/2 -translate-y-1/2 text-text-muted transition-colors opacity-70"
            size={16}
            strokeWidth={2.5}
          />
          <input
            type="text"
            placeholder="Artists, tracks, genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[40px] md:h-[44px] bg-white/5 border border-white/10 rounded-full md:rounded-[14px] pl-11 pr-10 text-[13px] md:text-[14px] font-display text-text-primary placeholder:text-text-muted focus:outline-none focus:border-smash-orange/40 transition-all focus:bg-white/10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-[14px] top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${viewMode === "grid" ? "bg-smash-orange text-white" : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${viewMode === "list" ? "bg-smash-orange text-white" : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Genres Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 md:-mx-0 md:px-0">
        <button
          onClick={() => setSelectedGenre(null)}
          className={`px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-[11px] font-display font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${!selectedGenre ? "bg-smash-purple text-white border-transparent" : "bg-white/5 text-text-muted hover:text-white border-white/10 hover:bg-white/10"}`}
        >
          All
        </button>
        {GENRES.map((genre) => (
          <button
            key={genre.name}
            onClick={() =>
              setSelectedGenre(genre.name === selectedGenre ? null : genre.name)
            }
            className={`px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-[11px] font-display font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${selectedGenre === genre.name ? "bg-smash-purple text-white border-transparent" : "bg-white/5 text-text-muted hover:text-white border-white/10 hover:bg-white/10"}`}
          >
            {genre.name}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse mt-8"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="flex flex-col gap-3">
                <div className="w-full aspect-square bg-white/5 rounded-[16px]"></div>
                <div className="h-4 w-3/4 bg-white/5 rounded-md"></div>
                <div className="h-3 w-1/2 bg-white/5 rounded-md"></div>
              </div>
            ))}
          </motion.div>
        ) : searchQuery || selectedGenre ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* iOS Segmented Control equivalent */}
            <div className="flex p-1 bg-white/5 rounded-full max-w-[240px]">
              <button
                onClick={() => setActiveTab("songs")}
                className={`flex-1 text-[11px] font-display font-semibold uppercase tracking-widest py-2 rounded-full transition-all ${activeTab === "songs" ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"}`}
              >
                Songs
              </button>
              <button
                onClick={() => setActiveTab("artists")}
                className={`flex-1 text-[11px] font-display font-semibold uppercase tracking-widest py-2 rounded-full transition-all ${activeTab === "artists" ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"}`}
              >
                Artists
              </button>
            </div>

            {activeTab === "songs" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[20px] font-studio font-bold text-text-primary">
                    Tracks Found
                  </h2>
                  <p className="text-[12px] font-display font-medium text-text-muted">
                    {results.songs.length} results
                  </p>
                </div>
                {results.songs.length > 0 ? (
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                        : "flex flex-col gap-2"
                    }
                  >
                    {results.songs.map((song, i) => (
                      <SongCard
                        key={`discover-song-${song.id}-${i}`}
                        song={song}
                        queue={results.songs}
                        layout={viewMode}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-10 bg-white/5 rounded-[24px] border border-white/5 text-center">
                    <Music2
                      size={32}
                      className="mx-auto mb-3 text-text-muted/40"
                    />
                    <p className="text-text-muted font-display font-medium text-[13px]">
                      No tracks match your search
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[20px] font-studio font-bold text-text-primary">
                    Artists Found
                  </h2>
                  <p className="text-[12px] font-display font-medium text-text-muted">
                    {results.artists.length} results
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {results.artists.map((artist, i) => (
                    <motion.div
                      key={`discover-artist-${artist.id}-${i}`}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => navigate(`/artist/${artist.id}`)}
                      className="p-3 bg-bg-surface border border-white/5 rounded-[16px] flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all shadow-sm"
                    >
                      <Avatar
                        src={artist.avatar_url}
                        name={artist.stage_name || artist.full_name}
                        className="w-12 h-12 rounded-full border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-bold text-[14px] text-text-primary truncate mb-0.5">
                          {artist.stage_name || artist.full_name}
                        </h4>
                        <p className="text-[11px] text-text-muted font-display font-medium uppercase tracking-wider">
                          {artist.genre || "Artist"}
                        </p>
                      </div>
                      <ChevronRight
                        className="text-smash-purple/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        size={16}
                      />
                    </motion.div>
                  ))}
                  {results.artists.length === 0 && (
                    <div className="col-span-full p-10 bg-white/5 rounded-[24px] border border-white/5 text-center">
                      <User
                        size={32}
                        className="mx-auto mb-3 text-text-muted/40"
                      />
                      <p className="text-text-muted font-display font-medium text-[13px]">
                        No artists match your search
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="initial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            {/* Featured / Trending Section */}
            <div className="space-y-5">
              <h2 className="text-[20px] font-studio font-bold text-text-primary">
                Trending Hits
              </h2>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                    : "flex flex-col gap-2"
                }
              >
                {trending.map((song, i) => (
                  <SongCard
                    key={`discover-trending-${song.id}-${i}`}
                    song={song}
                    queue={trending}
                    layout={viewMode}
                  />
                ))}
              </div>
            </div>

            {/* AI Recommendations Section */}
            {recommendedSongs.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[20px] font-studio font-bold text-text-primary">
                      For You
                    </h2>
                    <span className="bg-smash-orange/10 text-smash-orange text-[10px] font-display font-bold px-2 py-0.5 rounded-[6px] uppercase tracking-wider">
                      AI Pick
                    </span>
                  </div>
                  <button
                    onClick={fetchRecommendations}
                    className="text-[11px] font-display font-semibold uppercase tracking-widest text-text-muted hover:text-smash-orange transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                      : "flex flex-col gap-2"
                  }
                >
                  {recommendedSongs.map((song, i) => (
                    <SongCard
                      key={`discover-rec-${song.id}-${i}`}
                      song={song}
                      queue={recommendedSongs}
                      layout={viewMode}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Browse Categories */}
            <div className="space-y-5">
              {songs.length > 0 && (
                <div className="space-y-5 mb-12">
                  <h2 className="text-[20px] font-studio font-bold text-text-primary">
                    All Songs
                  </h2>
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                        : "flex flex-col gap-2"
                    }
                  >
                    {songs.map((song, i) => (
                      <SongCard
                        key={`discover-all-${song.id}-${i}`}
                        song={song}
                        queue={songs}
                        layout={viewMode}
                      />
                    ))}
                  </div>
                  {hasMoreSongs && (
                    <div className="flex justify-center pt-6">
                      <button
                        onClick={loadMoreSongs}
                        disabled={loadingMore}
                        className="px-6 py-2.5 bg-white/5 border border-white/10 text-[12px] font-display font-medium text-white transition-all uppercase tracking-widest rounded-full hover:bg-white/10 hover:border-white/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {loadingMore ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Load More"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <h2 className="text-[20px] font-studio font-bold text-text-primary">
                Browse Categories
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {GENRES.map((cat) => (
                  <div
                    key={`cat-grid-${cat.name}`}
                    onClick={() => setSelectedGenre(cat.name)}
                    className="bg-bg-surface border border-white/5 rounded-[16px] p-5 cursor-pointer hover:border-white/10 hover:bg-white/5 transition-all flex flex-col items-start gap-4 shadow-sm"
                  >
                    <div
                      className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${cat.color}`}
                    >
                      {React.createElement(cat.icon, { size: 20 })}
                    </div>
                    <h3 className="text-[14px] font-display font-bold text-text-primary">
                      {cat.name}
                    </h3>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Discover;
