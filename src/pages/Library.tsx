import { optimizeImage } from "../lib/imageUtils";
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Music2,
  Heart,
  ShoppingBag,
  Clock,
  Search,
  Info,
  Download,
  Plus,
  Lock as AppLockIcon,
  Loader2,
  Trash2,
  Globe,
  Lock,
  Pencil,
  Crown,
  ChevronRight,
  X,
  Compass,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Song } from '../types';
import SongCard from '../components/common/SongCard';
import { handleTrackDownload } from '../lib/downloads';
import { getListenerLimits, getListenerTier } from '../lib/tierUtils';
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING, GRID_SONG_CARDS } from '../lib/layout';

const Library: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'purchased' | 'likes' | 'downloads' | 'playlists';
  
  const limits = useMemo(() => getListenerLimits(userProfile), [
    userProfile?.subscription_tier,
    userProfile?.subscription_expires_at,
    userProfile?.artist_tier,
  ]);
  const isPremium = useMemo(() => getListenerTier(userProfile) !== 'free', [
    userProfile?.subscription_tier,
    userProfile?.subscription_expires_at,
  ]);
  const [activeTab, setActiveTab] = useState<'purchased' | 'likes' | 'downloads' | 'playlists'>(
    tabParam && ['purchased', 'likes', 'downloads', 'playlists'].includes(tabParam) ? tabParam : 'purchased'
  );
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPublic, setEditPublic] = useState(false);
  const [purchasedSongs, setPurchasedSongs] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState<number>(0);

  useEffect(() => {
    if (tabParam && ['purchased', 'likes', 'downloads', 'playlists'].includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'purchased' | 'likes' | 'downloads' | 'playlists') => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // Fetch count of likes for stats strip
  useEffect(() => {
    const fetchLikesCount = async () => {
      if (!userProfile?.id) return;
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userProfile.id);
      setLikesCount(count || 0);
    };
    fetchLikesCount();
  }, [userProfile?.id]);

  useEffect(() => {
    const fetchPurchased = async () => {
      if (!userProfile?.id) return;
      const { data } = await supabase
        .from('fan_purchases')
        .select('song_id, purchased_at, songs(id, title, artist_name, cover_url, audio_url, duration_seconds)')
        .eq('fan_id', userProfile.id)
        .eq('status', 'completed')
        .order('purchased_at', { ascending: false });
      setPurchasedSongs(data?.map(p => ({ ...(p.songs as any), purchasedAt: p.purchased_at })) || []);
    };
    fetchPurchased();
  }, [userProfile?.id]);

  const handlePlaylistClick = async (pl: any) => {
    try {
      const { data: albumData, error } = await supabase
        .from('albums')
        .select('id')
        .eq('title', pl.name)
        .maybeSingle();

      if (!error && albumData) {
        navigate(`/album/${albumData.id}`);
      } else {
        navigate(`/playlist/${pl.id}`);
      }
    } catch (err) {
      console.error('Error identifying playlist/album:', err);
      navigate(`/playlist/${pl.id}`);
    }
  };

  useEffect(() => {
    if (userProfile?.id) {
      fetchLibrary();
    } else {
      setLoading(false);
    }
  }, [userProfile, activeTab]);

  useEffect(() => {
    const handleLikesUpdate = (e: any) => {
      if (activeTab === 'likes') {
        if (!e.detail.isLiked) {
          setSongs(prev => prev.filter(s => s.id !== e.detail.songId));
          setLikesCount(prev => Math.max(0, prev - 1));
        } else {
          fetchLibrary();
          setLikesCount(prev => prev + 1);
        }
      }
    };
    window.addEventListener('smash_likes_updated', handleLikesUpdate);
    return () => window.removeEventListener('smash_likes_updated', handleLikesUpdate);
  }, [activeTab, userProfile?.id]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      if (activeTab === 'purchased') {
        const { data: purchases, error: pError } = await supabase
          .from('fan_purchases')
          .select('*, songs(*, profiles!artist_id(full_name, stage_name))')
          .eq('fan_id', userProfile?.id)
          .order('purchased_at', { ascending: false });

        if (pError) throw pError;

        const formatted = (purchases || []).map((p: any) => ({
          ...p.songs,
          id: p.song_id,
          artist_name: p.songs?.profiles?.stage_name || p.songs?.profiles?.full_name || 'Artist',
          cover_url: p.songs?.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
          url: p.songs?.audio_url,
          purchased_at: p.purchased_at,
          is_purchased: true,
          is_for_sale: false,
        }));
        setSongs(formatted as any);
      } else if (activeTab === 'likes') {
        const { data: likes, error: lError } = await supabase
          .from('likes')
          .select('*, songs(*, profiles!artist_id(full_name, stage_name))')
          .eq('profile_id', userProfile?.id);

        if (lError) {
           setSongs([]); 
        } else {
           const formatted = (likes || []).map((l: any) => ({
              ...l.songs,
              artist_name: l.songs?.profiles?.stage_name || l.songs?.profiles?.full_name || 'Artist',
              cover_url: l.songs?.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
              url: l.songs?.audio_url
           }));
           setSongs(formatted as any);
           setLikesCount(formatted.length);
        }
      } else if (activeTab === 'downloads') {
        let downloadIds: string[] = [];
        try {
          downloadIds = JSON.parse(localStorage.getItem('smash_downloads') || '[]');
        } catch (e) {
          console.error('Error parsing downloads:', e);
        }
        if (downloadIds.length > 0) {
           const { data: downloadSongs, error: dError } = await supabase
              .from('songs')
              .select('*, profiles!artist_id(full_name, stage_name)')
              .in('id', downloadIds);
           
           if (!dError && downloadSongs) {
              const formatted = downloadSongs.map((s: any) => ({
                 ...s,
                 artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
                 cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
                 url: s.audio_url
              }));
              setSongs(formatted as any);
           } else {
              setSongs([]);
           }
        } else {
           setSongs([]);
        }
      } else if (activeTab === 'playlists') {
        let playlistsResult: any[] = [];
        try {
          const { data: playlistsData, error: plError } = await supabase
            .from('playlists')
            .select('*, playlist_songs(id, songs(*, profiles:artist_id(full_name, stage_name)))')
            .eq('profile_id', userProfile?.id)
            .order('created_at', { ascending: false });
          
          if (!plError && playlistsData) {
            playlistsResult = playlistsData;
          } else {
            console.warn('Nested query failed, attempting simple playlist query:', plError);
            const { data: simpleData, error: simpleErr } = await supabase
              .from('playlists')
              .select('*, playlist_songs(id, song_id)')
              .eq('profile_id', userProfile?.id)
              .order('created_at', { ascending: false });

            if (!simpleErr && simpleData) {
              const allSongIds = new Set<string>();
              simpleData.forEach((pl: any) => {
                (pl.playlist_songs || []).forEach((ps: any) => {
                  if (ps.song_id) allSongIds.add(ps.song_id);
                });
              });
              
              let fetchedSongs: Record<string, any> = {};
              if (allSongIds.size > 0) {
                const { data: sData } = await supabase
                  .from('songs')
                  .select('id, cover_url')
                  .in('id', Array.from(allSongIds));
                (sData || []).forEach(s => fetchedSongs[s.id] = s);
              }
              
              playlistsResult = simpleData.map((pl: any) => ({
                ...pl,
                playlist_songs: (pl.playlist_songs || []).map((ps: any) => ({
                  ...ps,
                  songs: fetchedSongs[ps.song_id] || null
                }))
              }));
            }
          }
        } catch (e) {
          console.error('Error fetching playlists tab:', e);
        }
        setPlaylists(playlistsResult);
      }
    } catch (err) {
      console.error('Error fetching library:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = songs.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.artist_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPlaylists = playlists.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', id);
      if (error) throw error;
      toast.success('Playlist deleted');
      setPlaylists(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      toast.error('Failed to delete playlist: ' + err.message);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const { error } = await supabase.from('playlists').insert({
        profile_id: userProfile?.id,
        name: newPlaylistName.trim(),
        is_public: newPlaylistIsPublic
      });
      if (error) throw error;
      toast.success(newPlaylistIsPublic ? 'Public playlist created' : 'Private playlist created');
      setNewPlaylistName('');
      setNewPlaylistIsPublic(false);
      setShowCreatePlaylist(false);
      fetchLibrary();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleSaveEditPlaylist = async () => {
    if (!editingPlaylist) return;
    if (!editName.trim()) {
      toast.error('Playlist name cannot be empty');
      return;
    }
    try {
      const { error } = await supabase
        .from('playlists')
        .update({ name: editName.trim(), is_public: editPublic })
        .eq('id', editingPlaylist.id);

      if (error) throw error;
      toast.success(`Playlist updated to ${editPublic ? 'Public' : 'Private'}`);
      setPlaylists(prev => prev.map(p => p.id === editingPlaylist.id ? { ...p, name: editName.trim(), is_public: editPublic } : p));
      setEditingPlaylist(null);
    } catch (err: any) {
      toast.error('Failed to update playlist: ' + err.message);
    }
  };

  // g) SIGN-IN GATE (no user logged in)
  if (!userProfile) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-[#00A3FF]/10 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF] mb-6 shadow-xl shadow-[#00A3FF]/10">
          <ShoppingBag size={32} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A3FF] mb-1.5">
          YOUR COLLECTION
        </p>
        <h1 className="text-3xl font-studio font-bold text-white tracking-tight mb-2">
          Your Library<span className="text-[#00A3FF]">.</span>
        </h1>
        <p className="text-[#B0B0B0] text-[14px] leading-relaxed mb-8">
          Sign in to access your purchased tracks, favorites, offline downloads, and custom playlists.
        </p>
        <button
          onClick={() => navigate('/auth/listener')}
          className="w-full max-w-xs h-12 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] text-white rounded-[10px] font-semibold text-[14px] shadow-lg shadow-[#00A3FF]/20 hover:brightness-110 active:scale-98 transition-all"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} space-y-8 md:space-y-10 pt-4 md:pt-6`}>
      {/* a) HEADER & STATS STRIP */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] mb-1.5">
            YOUR COLLECTION
          </p>
          <h1 className="text-3xl md:text-[48px] font-studio font-bold text-white tracking-tight leading-none">
            Your Library<span className="text-[#00A3FF]">.</span>
          </h1>
          <p className="text-[13px] md:text-[14px] text-[#B0B0B0] mt-2">
            Manage your purchased tracks, saved favorites, and playlists.
          </p>
        </div>

        {/* Small stats strip — hairline divided */}
        <div className="flex items-center divide-x divide-white/10 bg-[#1A1A1A] border border-white/10 rounded-[14px] p-2 md:p-2.5 self-start md:self-auto shrink-0">
          <div className="px-3 md:px-4 text-center">
            <p className="font-bold text-white text-[16px] md:text-[18px] font-mono leading-none">
              {purchasedSongs.length}
            </p>
            <p className="text-[#B0B0B0] text-[11px] font-medium mt-1">
              Purchased
            </p>
          </div>
          <div className="px-3 md:px-4 text-center">
            <p className="font-bold text-white text-[16px] md:text-[18px] font-mono leading-none">
              {likesCount}
            </p>
            <p className="text-[#B0B0B0] text-[11px] font-medium mt-1">
              Liked
            </p>
          </div>
          <div className="px-3 md:px-4 text-center">
            <p className="font-bold text-white text-[16px] md:text-[18px] font-mono leading-none">
              {playlists.length}
            </p>
            <p className="text-[#B0B0B0] text-[11px] font-medium mt-1">
              Playlists
            </p>
          </div>
        </div>
      </div>

      {/* b) SEARCH + TABS */}
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B0B0] transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search within your library…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 md:h-12 bg-[#1A1A1A] border border-white/10 rounded-[12px] pl-11 pr-10 text-[14px] text-white placeholder:text-[#737373] focus:outline-none focus:border-[#00A3FF] focus:ring-1 focus:ring-[#00A3FF] transition-all"
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

        {/* Segmented Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-full w-full sm:w-fit overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleTabChange('purchased')}
            className={`flex items-center gap-2 text-[13px] font-semibold py-1.5 px-4 rounded-full transition-all whitespace-nowrap ${
              activeTab === 'purchased'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#B0B0B0] hover:text-white'
            }`}
          >
            <ShoppingBag size={14} />
            <span>Purchased</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'purchased' ? 'bg-black/10 text-black' : 'bg-white/10 text-[#B0B0B0]'
            }`}>
              {purchasedSongs.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('likes')}
            className={`flex items-center gap-2 text-[13px] font-semibold py-1.5 px-4 rounded-full transition-all whitespace-nowrap ${
              activeTab === 'likes'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#B0B0B0] hover:text-white'
            }`}
          >
            <Heart size={14} />
            <span>Liked</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'likes' ? 'bg-black/10 text-black' : 'bg-white/10 text-[#B0B0B0]'
            }`}>
              {likesCount}
            </span>
          </button>

          <button
            onClick={() => {
              if (!limits.canDownload && purchasedSongs.length === 0) {
                toast.error('Offline saves require Weekly Pass or higher. Buy tracks to access your purchases here.');
                return;
              }
              handleTabChange('downloads');
            }}
            className={`flex items-center gap-2 text-[13px] font-semibold py-1.5 px-4 rounded-full transition-all whitespace-nowrap ${
              activeTab === 'downloads'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#B0B0B0] hover:text-white'
            }`}
          >
            <Download size={14} />
            <span>Offline</span>
          </button>

          <button
            onClick={() => handleTabChange('playlists')}
            className={`flex items-center gap-2 text-[13px] font-semibold py-1.5 px-4 rounded-full transition-all whitespace-nowrap ${
              activeTab === 'playlists'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#B0B0B0] hover:text-white'
            }`}
          >
            <Music2 size={14} />
            <span>Playlists</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'playlists' ? 'bg-black/10 text-black' : 'bg-white/10 text-[#B0B0B0]'
            }`}>
              {playlists.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div>
        {loading ? (
          <div className={GRID_SONG_CARDS}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-[#1A1A1A] rounded-[16px] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'playlists' ? (
          /* c) PLAYLISTS TAB */
          <div className="space-y-6">
            <div className={GRID_SONG_CARDS}>
              {/* New Playlist Tile */}
              <div
                onClick={() => {
                  if (playlists.length >= limits.maxPlaylists) {
                    toast.error(`Free tier allows up to ${limits.maxPlaylists} playlists. Upgrade to Premium for unlimited playlists.`);
                    return;
                  }
                  setShowCreatePlaylist(true);
                }}
                className="aspect-square bg-[#1A1A1A] border-2 border-dashed border-white/15 hover:border-[#00A3FF]/60 rounded-[16px] flex flex-col items-center justify-center cursor-pointer transition-all group relative p-4"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-[#00A3FF] group-hover:bg-[#00A3FF]/15 transition-all">
                  <Plus size={24} />
                </div>
                <p className="text-[13px] font-semibold text-white mt-3">
                  New Playlist
                </p>
                {playlists.length >= limits.maxPlaylists && (
                  <div className="absolute top-3.5 right-3.5 text-red-400">
                    <AppLockIcon size={14} />
                  </div>
                )}
              </div>

              {/* Playlist Cards */}
              {filteredPlaylists.map(pl => (
                <div
                  key={pl.id}
                  onClick={() => handlePlaylistClick(pl)}
                  className="bg-[#1A1A1A] border border-white/10 hover:border-white/20 rounded-[16px] p-3 transition-all cursor-pointer group flex flex-col gap-2.5 relative"
                >
                  <div className="aspect-square bg-black/40 rounded-[12px] overflow-hidden border border-white/5 relative">
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
                        {pl.playlist_songs?.slice(0, 4).map((ps: any, i: number) => (
                          <img
                            key={i}
                            src={optimizeImage(
                              ps.songs?.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&h=200&fit=crop',
                              150,
                              150
                            )}
                            className="w-full h-full object-cover"
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ))}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Public / Private Chip Top-Left */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-full flex items-center gap-1 text-[10px] font-semibold border border-white/10 z-10">
                      {pl.is_public ? (
                        <Globe size={10} className="text-[#00A3FF]" />
                      ) : (
                        <Lock size={10} className="text-[#B0B0B0]" />
                      )}
                      <span className={pl.is_public ? 'text-[#00A3FF]' : 'text-[#B0B0B0]'}>
                        {pl.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPlaylist(pl);
                          setEditName(pl.name);
                          setEditPublic(!!pl.is_public);
                        }}
                        title="Edit playlist"
                        className="w-7 h-7 bg-black/70 hover:bg-[#00A3FF] rounded-full text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => deletePlaylist(pl.id, e)}
                        title="Delete playlist"
                        className="w-7 h-7 bg-black/70 hover:bg-red-600 rounded-full text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-[14px] text-white truncate">
                      {pl.name}
                    </h4>
                    <p className="text-[12px] text-[#B0B0B0] mt-0.5">
                      {pl.playlist_songs?.length || 0} track{pl.playlist_songs?.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* h) Create Playlist Modal */}
            {showCreatePlaylist && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="bg-[#1A1A1A] border border-white/10 p-6 md:p-8 rounded-[24px] max-w-md w-full shadow-2xl space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-studio font-bold text-white">
                      Create playlist
                    </h3>
                    <button
                      onClick={() => setShowCreatePlaylist(false)}
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#B0B0B0] hover:text-white flex items-center justify-center transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] block">
                      Playlist Name
                    </label>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="My Summer Anthems"
                      value={newPlaylistName}
                      onChange={e => setNewPlaylistName(e.target.value)}
                      className="w-full h-11 bg-[#0A0A0A] border border-white/10 px-4 rounded-[12px] text-[14px] text-white focus:border-[#00A3FF] focus:ring-1 focus:ring-[#00A3FF] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-[#0A0A0A] border border-white/5 rounded-[12px]">
                    <div className="flex items-center gap-3">
                      {newPlaylistIsPublic ? (
                        <Globe size={18} className="text-[#00A3FF]" />
                      ) : (
                        <Lock size={18} className="text-[#B0B0B0]" />
                      )}
                      <div>
                        <p className="text-[13px] font-semibold text-white">
                          {newPlaylistIsPublic ? 'Public playlist' : 'Private playlist'}
                        </p>
                        <p className="text-[11px] text-[#B0B0B0]">
                          {newPlaylistIsPublic ? 'Visible to everyone on Discover' : 'Only visible to you in your Library'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewPlaylistIsPublic(!newPlaylistIsPublic)}
                      className={`w-11 h-6 rounded-full transition-all relative ${newPlaylistIsPublic ? 'bg-[#00A3FF]' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${newPlaylistIsPublic ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={() => setShowCreatePlaylist(false)}
                      className="flex-1 h-11 bg-white/5 border border-white/10 text-[#B0B0B0] hover:text-white rounded-[10px] font-medium text-[13px] hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createPlaylist}
                      className="flex-1 h-11 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] text-white font-semibold text-[13px] rounded-[10px] shadow-lg shadow-[#00A3FF]/20 hover:brightness-110 active:scale-98 transition-all"
                    >
                      Create
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Edit Playlist Modal */}
            {editingPlaylist && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setEditingPlaylist(null)}>
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#1A1A1A] border border-white/10 p-6 md:p-8 rounded-[24px] max-w-md w-full shadow-2xl space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-studio font-bold text-white">
                      Edit playlist
                    </h3>
                    <button
                      onClick={() => setEditingPlaylist(null)}
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#B0B0B0] hover:text-white flex items-center justify-center transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] block">
                      Playlist Name
                    </label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full h-11 bg-[#0A0A0A] border border-white/10 px-4 rounded-[12px] text-[14px] text-white focus:border-[#00A3FF] focus:ring-1 focus:ring-[#00A3FF] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-[#0A0A0A] border border-white/5 rounded-[12px]">
                    <div className="flex items-center gap-3">
                      {editPublic ? (
                        <Globe size={18} className="text-[#00A3FF]" />
                      ) : (
                        <Lock size={18} className="text-[#B0B0B0]" />
                      )}
                      <div>
                        <p className="text-[13px] font-semibold text-white">
                          {editPublic ? 'Public playlist' : 'Private playlist'}
                        </p>
                        <p className="text-[11px] text-[#B0B0B0]">
                          {editPublic ? 'Visible to everyone on Discover' : 'Only visible to you in your Library'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditPublic(!editPublic)}
                      className={`w-11 h-6 rounded-full transition-all relative ${editPublic ? 'bg-[#00A3FF]' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${editPublic ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={() => setEditingPlaylist(null)}
                      className="flex-1 h-11 bg-white/5 border border-white/10 text-[#B0B0B0] hover:text-white rounded-[10px] font-medium text-[13px] hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEditPlaylist}
                      className="flex-1 h-11 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] text-white font-semibold text-[13px] rounded-[10px] shadow-lg shadow-[#00A3FF]/20 hover:brightness-110 active:scale-98 transition-all"
                    >
                      Save changes
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        ) : activeTab === 'downloads' ? (
          /* e) OFFLINE TAB */
          <div className="space-y-8">
            {/* 1. Purchased Songs (always downloadable with green button) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A3FF] mb-0.5">
                    PURCHASED
                  </p>
                  <h3 className="text-xl font-studio font-bold text-white">
                    Direct Downloads
                  </h3>
                </div>
                <span className="text-[12px] font-mono text-[#B0B0B0] bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                  {purchasedSongs.length} track{purchasedSongs.length === 1 ? '' : 's'}
                </span>
              </div>

              {purchasedSongs.length === 0 ? (
                <div className="p-8 bg-[#1A1A1A] rounded-[16px] border border-white/10 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-[#B0B0B0]">
                    <ShoppingBag size={22} />
                  </div>
                  <h4 className="text-white font-semibold text-[15px]">No purchased songs yet</h4>
                  <p className="text-[#B0B0B0] text-[13px] mt-1 max-w-sm mx-auto">
                    Buy tracks directly from creators to own them permanently and download anytime.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {purchasedSongs.map(song => (
                    <div
                      key={song.id}
                      className="flex items-center justify-between gap-3 p-3 bg-[#1A1A1A] border border-white/10 rounded-[14px]"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={optimizeImage(song.cover_url, 120, 120)}
                          className="w-12 h-12 rounded-[10px] object-cover shrink-0 border border-white/10"
                          alt={song.title}
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-[14px] font-semibold text-white truncate">{song.title}</p>
                          <p className="text-[12px] text-[#B0B0B0] truncate mt-0.5">{song.artist_name}</p>
                          <p className="text-[10px] text-[#737373] mt-0.5 font-mono">
                            Purchased {new Date(song.purchasedAt).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          setDownloadingId(song.id);
                          try {
                            await handleTrackDownload(song, userProfile);
                            toast.success('Download started');
                          } catch (err: any) {
                            toast.error(err.message);
                          } finally {
                            setDownloadingId(null);
                          }
                        }}
                        disabled={downloadingId === song.id}
                        className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/25 rounded-[10px] font-semibold text-[12px] transition-all disabled:opacity-50"
                      >
                        {downloadingId === song.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                        <span>{downloadingId === song.id ? 'Downloading…' : 'Download'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Premium Offline Saves Upgrade Card (if non-premium) */}
            {!limits.canDownload && (
              <div className="p-6 bg-[#1A1A1A] border border-white/10 rounded-[16px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#00A3FF]/15 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF] shrink-0">
                    <Crown size={24} />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-[15px]">
                      Offline saves are a Premium feature
                    </h4>
                    <p className="text-[#B0B0B0] text-[13px] mt-0.5">
                      Upgrade to Weekly Pass or Premium to cache unlimited songs for offline playback.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/pricing')}
                  className="h-10 px-5 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] text-white rounded-[10px] font-semibold text-[13px] shadow-md shadow-[#00A3FF]/20 hover:brightness-110 active:scale-98 transition-all shrink-0"
                >
                  Upgrade
                </button>
              </div>
            )}

            {/* 3. Saved Offline Tracks list */}
            {limits.canDownload && (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A3FF] mb-0.5">
                    CACHED
                  </p>
                  <h3 className="text-xl font-studio font-bold text-white">
                    Saved Offline
                  </h3>
                </div>
                {filteredSongs.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {filteredSongs.map((song, i) => (
                      <SongCard key={`library-offline-${song.id}-${i}`} song={song} queue={filteredSongs} layout="list" />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-[#1A1A1A] rounded-[16px] border border-white/10 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-[#B0B0B0]">
                      <Download size={22} />
                    </div>
                    <h4 className="text-white font-semibold text-[15px]">No offline saved songs</h4>
                    <p className="text-[#B0B0B0] text-[13px] mt-1">
                      Download songs using the download button on track menus to listen offline without internet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : filteredSongs.length > 0 ? (
          /* d) PURCHASED / LIKED TABS — List Rows */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A3FF] mb-0.5">
                  {activeTab === 'purchased' ? 'PURCHASED' : 'LIKES'}
                </p>
                <h3 className="text-xl font-studio font-bold text-white">
                  {activeTab === 'purchased' ? 'Purchased Tracks' : 'Liked Songs'}
                </h3>
              </div>
              <span className="text-[12px] font-mono text-[#B0B0B0] bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                {filteredSongs.length} track{filteredSongs.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {filteredSongs.map((song, i) => (
                <SongCard key={`library-song-${song.id}-${i}`} song={song} queue={filteredSongs} layout="list" />
              ))}
            </div>
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="p-12 md:p-16 bg-[#1A1A1A] border border-white/10 rounded-[16px] text-center space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#B0B0B0]">
              {activeTab === 'purchased' ? <ShoppingBag size={28} /> : <Heart size={28} />}
            </div>
            <div>
              <h3 className="text-xl font-studio font-bold text-white">
                {activeTab === 'purchased' ? 'No purchases yet' : 'No liked songs yet'}
              </h3>
              <p className="text-[#B0B0B0] text-[13px] mt-1.5 leading-relaxed">
                {activeTab === 'purchased'
                  ? 'You have not purchased any tracks yet. Support African creators and own your favorite tracks permanently.'
                  : 'Tap the heart icon on any song to save it to your collection for quick access.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate('/discover')}
                className="px-6 py-2.5 bg-white/5 border border-white/10 hover:border-[#00A3FF]/40 text-white hover:text-[#00A3FF] rounded-[10px] text-[13px] font-semibold transition-all inline-flex items-center gap-2"
              >
                <Compass size={15} />
                <span>Explore catalogue</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* f) QUICK PLAY — Single "Recently Played" Hairline Panel */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Clock className="text-[#00A3FF]" size={18} />
          <h3 className="text-base font-studio font-bold text-white">
            Quick Navigation
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => navigate('/discover')}
            className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#00A3FF]/40 rounded-[12px] transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#00A3FF]/15 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF] shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-[13px] text-white">Recently Played</h4>
                <p className="text-[11px] text-[#B0B0B0]">Resume where you left off</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-[#B0B0B0] group-hover:text-[#00A3FF] group-hover:translate-x-0.5 transition-all" />
          </div>

          <div
            onClick={() => handleTabChange('playlists')}
            className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#00A3FF]/40 rounded-[12px] transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#00A3FF]/15 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF] shrink-0">
                <Music2 size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-[13px] text-white">Your Playlists</h4>
                <p className="text-[11px] text-[#B0B0B0]">Browse custom collections</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-[#B0B0B0] group-hover:text-[#00A3FF] group-hover:translate-x-0.5 transition-all" />
          </div>

          <div
            onClick={() => navigate('/pricing')}
            className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#00A3FF]/40 rounded-[12px] transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#00A3FF]/15 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF] shrink-0">
                <Info size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-[13px] text-white">Library Guide</h4>
                <p className="text-[11px] text-[#B0B0B0]">Learn how downloads work</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-[#B0B0B0] group-hover:text-[#00A3FF] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Library;
