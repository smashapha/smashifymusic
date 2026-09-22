import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music2, Search, Filter, Play, Pause, ShieldAlert, ShieldCheck, 
  Trash2, ExternalLink, RefreshCw, AlertTriangle, CheckCircle2, 
  DollarSign, Disc, Radio, Eye, Copy, Check, FileAudio, 
  Volume2, VolumeX, Sparkles, ChevronDown, SlidersHorizontal, Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { optimizeImage } from '../../lib/imageUtils';
import { CopyrightTakedownModal } from './CopyrightTakedownModal';
import { SongReviewModal } from './SongReviewModal';
import toast from 'react-hot-toast';

interface AdminCatalogProps {
  allSongs: any[];
  onRefresh: () => void;
  onOpenPerson360?: (profileId: string) => void;
}

export const AdminCatalog: React.FC<AdminCatalogProps> = ({
  allSongs,
  onRefresh,
  onOpenPerson360
}) => {
  // Search & Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'copyright' | 'vaulted'>('all');
  const [monetizationFilter, setMonetizationFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'plays' | 'price' | 'title'>('newest');

  // Modals state
  const [takedownSong, setTakedownSong] = useState<any | null>(null);
  const [reviewSong, setReviewSong] = useState<any | null>(null);
  const [viewingClaimSong, setViewingClaimSong] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Audio preview player state
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const handlePlayToggle = (song: any) => {
    if (!song.audio_url) {
      toast.error('No audio source file attached to this song');
      return;
    }

    if (playingSongId === song.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(song.audio_url);
      audioRef.current.muted = isMuted;

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setAudioProgress(audioRef.current.currentTime);
          setAudioDuration(audioRef.current.duration || 0);
        }
      };

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setAudioProgress(0);
      };

      audioRef.current.play()
        .then(() => {
          setPlayingSongId(song.id);
          setIsPlaying(true);
        })
        .catch(err => {
          console.warn('Playback error:', err);
          toast.error('Could not play audio track');
          setIsPlaying(false);
        });
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Song status toggle / release
  const handleApproveSong = async (song: any) => {
    try {
      const { error } = await supabase
        .from('songs')
        .update({ approved: true, status: 'approved', is_active: true })
        .eq('id', song.id);

      if (error) throw error;
      toast.success(`"${song.title}" released for broadcast!`);
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to release song: ' + err.message);
    }
  };

  // Reinstate a copyright-takedown song
  const handleReinstateSong = async (song: any) => {
    if (!confirm(`Reinstate "${song.title}"? This clears the copyright takedown status and restores broadcast streaming.`)) return;

    try {
      const { error } = await supabase
        .from('songs')
        .update({
          approved: true,
          status: 'approved',
          is_active: true,
          vaulted_at: null,
          vaulted_reason: null
        })
        .eq('id', song.id);

      if (error) throw error;

      // Notify artist of reinstatement
      if (song.artist_id) {
        try {
          await supabase.from('notifications').insert({
            profile_id: song.artist_id,
            user_type: 'artist',
            type: 'system_alert',
            message: `Your track "${song.title}" has been cleared and reinstated to Smashify! Distribution and streaming are now fully active.`,
            link: '/artist-hub'
          });
        } catch (e) {
          console.warn('Could not send reinstatement notification:', e);
        }
      }

      toast.success(`"${song.title}" successfully reinstated to broadcast.`);
      onRefresh();
    } catch (err: any) {
      toast.error('Reinstatement failed: ' + err.message);
    }
  };

  // Permanent Delete
  const handleDeleteSong = async (song: any) => {
    if (!confirm(`PERMANENT ACTION: Delete "${song.title}" by ${song.profiles?.stage_name || 'artist'} permanently from database?`)) return;

    try {
      const { error } = await supabase.from('songs').delete().eq('id', song.id);
      if (error) throw error;
      toast.success(`"${song.title}" removed permanently.`);
      if (playingSongId === song.id && audioRef.current) {
        audioRef.current.pause();
        setPlayingSongId(null);
        setIsPlaying(false);
      }
      onRefresh();
    } catch (err: any) {
      toast.error('Deletion failed: ' + err.message);
    }
  };

  // Extract distinct genres
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    allSongs.forEach(s => {
      if (s.genre) set.add(s.genre);
    });
    return Array.from(set).sort();
  }, [allSongs]);

  // Statistics
  const stats = useMemo(() => {
    const total = allSongs.length;
    const broadcasting = allSongs.filter(s => s.approved && s.status !== 'copyright_takedown').length;
    const pending = allSongs.filter(s => !s.approved && s.status !== 'copyright_takedown').length;
    const copyrightTakedowns = allSongs.filter(s => s.status === 'copyright_takedown' || (s.vaulted_reason && s.vaulted_reason.toLowerCase().includes('copyright'))).length;
    const commercial = allSongs.filter(s => s.is_for_sale || (s.price && s.price > 0)).length;
    const totalPlays = allSongs.reduce((acc, s) => acc + (s.plays || 0), 0);
    return { total, broadcasting, pending, copyrightTakedowns, commercial, totalPlays };
  }, [allSongs]);

  // Filtered and sorted songs
  const filteredSongs = useMemo(() => {
    return allSongs.filter(s => {
      const isCopyrightTakedown = s.status === 'copyright_takedown' || (s.vaulted_reason && s.vaulted_reason.toLowerCase().includes('copyright'));

      // Status Filter
      if (statusFilter === 'approved' && (!s.approved || isCopyrightTakedown)) return false;
      if (statusFilter === 'pending' && (s.approved || isCopyrightTakedown)) return false;
      if (statusFilter === 'copyright' && !isCopyrightTakedown) return false;
      if (statusFilter === 'vaulted' && s.status !== 'vaulted') return false;

      // Monetization Filter
      if (monetizationFilter === 'paid' && !(s.is_for_sale || (s.price && s.price > 0))) return false;
      if (monetizationFilter === 'free' && (s.is_for_sale || (s.price && s.price > 0))) return false;

      // Genre Filter
      if (genreFilter !== 'all' && s.genre !== genreFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (s.title || '').toLowerCase().includes(q);
        const artistMatch = (s.profiles?.stage_name || '').toLowerCase().includes(q);
        const realNameMatch = (s.profiles?.full_name || '').toLowerCase().includes(q);
        const genreMatch = (s.genre || '').toLowerCase().includes(q);
        const idMatch = (s.id || '').toLowerCase().includes(q);
        if (!titleMatch && !artistMatch && !realNameMatch && !genreMatch && !idMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (sortBy === 'plays') {
        return (b.plays || 0) - (a.plays || 0);
      }
      if (sortBy === 'price') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });
  }, [allSongs, statusFilter, monetizationFilter, genreFilter, searchQuery, sortBy]);

  const currentlyPlayingSong = allSongs.find(s => s.id === playingSongId);

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Total Assets</p>
          <p className="text-2xl font-bold font-studio text-white mt-1">{stats.total}</p>
          <p className="text-[11px] text-white/50 mt-0.5">Master sound recordings</p>
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-emerald-500/20 rounded-2xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Broadcasting
          </p>
          <p className="text-2xl font-bold font-studio text-emerald-400 mt-1">{stats.broadcasting}</p>
          <p className="text-[11px] text-white/50 mt-0.5">Live on public stream</p>
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-amber-500/20 rounded-2xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80">Pending Review</p>
          <p className="text-2xl font-bold font-studio text-amber-400 mt-1">{stats.pending}</p>
          <p className="text-[11px] text-white/50 mt-0.5">Awaiting release check</p>
        </div>

        <div 
          onClick={() => setStatusFilter('copyright')}
          className="p-4 bg-[#0A0A0A] border border-red-500/30 rounded-2xl cursor-pointer hover:border-red-500/60 transition-all group"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
            <ShieldAlert size={12} />
            Copyright Takedowns
          </p>
          <p className="text-2xl font-bold font-studio text-red-400 mt-1 group-hover:scale-105 transition-transform">
            {stats.copyrightTakedowns}
          </p>
          <p className="text-[11px] text-red-400/60 mt-0.5 underline">Filter takedowns →</p>
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-blue-500/20 rounded-2xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400/80">Commercial Releases</p>
          <p className="text-2xl font-bold font-studio text-blue-400 mt-1">{stats.commercial}</p>
          <p className="text-[11px] text-white/50 mt-0.5">Available for direct sale</p>
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Total Streams</p>
          <p className="text-2xl font-bold font-studio text-white mt-1">{stats.totalPlays.toLocaleString()}</p>
          <p className="text-[11px] text-white/50 mt-0.5">Global catalog plays</p>
        </div>
      </div>

      {/* Floating Audio Preview Player Bar (When Active) */}
      <AnimatePresence>
        {currentlyPlayingSong && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-gradient-to-r from-[#00A3FF]/20 via-[#0A0A0A] to-purple-900/20 border border-[#00A3FF]/40 rounded-2xl flex items-center justify-between gap-4 shadow-xl"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/10 overflow-hidden shrink-0 border border-white/20">
                <img 
                  src={optimizeImage(currentlyPlayingSong.cover_url, 80, 80)} 
                  alt="" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-[13px] truncate">{currentlyPlayingSong.title}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00A3FF]/20 text-[#00A3FF] border border-[#00A3FF]/30 font-mono">
                    Audio Preview
                  </span>
                </div>
                <p className="text-white/60 text-[11px] truncate">
                  {currentlyPlayingSong.profiles?.stage_name || 'Artist'} • {currentlyPlayingSong.genre || 'General'}
                </p>
              </div>
            </div>

            {/* Playback Controls & Progress */}
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <button
                type="button"
                onClick={() => handlePlayToggle(currentlyPlayingSong)}
                className="w-9 h-9 rounded-full bg-[#00A3FF] hover:bg-[#0084D6] text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-md"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>

              <div className="flex-1 space-y-1">
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden cursor-pointer" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  if (audioRef.current && audioDuration) {
                    audioRef.current.currentTime = pos * audioDuration;
                  }
                }}>
                  <div 
                    className="bg-[#00A3FF] h-full transition-all duration-100" 
                    style={{ width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-white/40">
                  <span>{Math.floor(audioProgress / 60)}:{String(Math.floor(audioProgress % 60)).padStart(2, '0')}</span>
                  <span>{Math.floor(audioDuration / 60)}:{String(Math.floor(audioDuration % 60)).padStart(2, '0')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setPlayingSongId(null);
                  setIsPlaying(false);
                }}
                className="text-white/40 hover:text-white transition-colors text-[11px] font-semibold"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Catalog Management Card */}
      <div className="bg-[#0A0A0A] rounded-[20px] border border-white/10 overflow-hidden shadow-2xl">
        {/* Card Header & Controls */}
        <div className="p-5 border-b border-white/10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-studio font-bold text-[18px] text-white flex items-center gap-2.5">
                <Music2 size={20} className="text-[#00A3FF]" />
                Main Catalogue Governance
              </h3>
              <p className="text-[13px] text-white/50 mt-0.5">
                Track monitoring, audio inspection, copyright infringement takedowns, and commercial licensing
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className="h-9 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-[12px] font-semibold flex items-center gap-1.5 transition-all"
              >
                <RefreshCw size={14} /> Refresh Catalog
              </button>
            </div>
          </div>

          {/* Search Bar + Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search track, artist stage name, real name, genre, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-white/30 text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-[11px]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-[13px] focus:outline-none focus:border-[#00A3FF]/50"
              >
                <option value="all" className="bg-[#141414]">All Network Statuses</option>
                <option value="approved" className="bg-[#141414]">Broadcasting (Live Only)</option>
                <option value="pending" className="bg-[#141414]">Pending Review / Hold</option>
                <option value="copyright" className="bg-[#141414]">Copyright Takedowns (DMCA)</option>
                <option value="vaulted" className="bg-[#141414]">Vaulted / Inactive</option>
              </select>
            </div>

            {/* Genre Filter */}
            <div className="md:col-span-2">
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-[13px] focus:outline-none focus:border-[#00A3FF]/50"
              >
                <option value="all" className="bg-[#141414]">All Genres ({availableGenres.length})</option>
                {availableGenres.map(g => (
                  <option key={g} value={g} className="bg-[#141414]">{g}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="md:col-span-2">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-[13px] focus:outline-none focus:border-[#00A3FF]/50 font-medium"
              >
                <option value="newest" className="bg-[#141414]">Newest Uploads</option>
                <option value="oldest" className="bg-[#141414]">Oldest Uploads</option>
                <option value="plays" className="bg-[#141414]">Highest Streams</option>
                <option value="price" className="bg-[#141414]">Price: High to Low</option>
                <option value="title" className="bg-[#141414]">Title (A - Z)</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px]">
            <span className="text-white/40 text-[11px] uppercase tracking-wider font-semibold mr-1">Quick Filters:</span>
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setMonetizationFilter('all'); setGenreFilter('all'); }}
              className={`px-3 py-1 rounded-lg border transition-all ${
                statusFilter === 'all' && monetizationFilter === 'all' && genreFilter === 'all'
                  ? 'bg-white/15 text-white border-white/30 font-bold'
                  : 'bg-white/[0.02] text-white/50 border-white/5 hover:text-white'
              }`}
            >
              All Assets ({allSongs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('copyright')}
              className={`px-3 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                statusFilter === 'copyright'
                  ? 'bg-red-500/20 text-red-400 border-red-500/50 font-bold'
                  : 'bg-red-500/5 text-red-400/70 border-red-500/20 hover:text-red-400'
              }`}
            >
              <ShieldAlert size={12} />
              Copyright Takedowns ({stats.copyrightTakedowns})
            </button>
            <button
              type="button"
              onClick={() => setMonetizationFilter(monetizationFilter === 'paid' ? 'all' : 'paid')}
              className={`px-3 py-1 rounded-lg border transition-all ${
                monetizationFilter === 'paid'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 font-bold'
                  : 'bg-white/[0.02] text-white/50 border-white/5 hover:text-white'
              }`}
            >
              For Sale Only ({stats.commercial})
            </button>
            <button
              type="button"
              onClick={() => setMonetizationFilter(monetizationFilter === 'free' ? 'all' : 'free')}
              className={`px-3 py-1 rounded-lg border transition-all ${
                monetizationFilter === 'free'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 font-bold'
                  : 'bg-white/[0.02] text-white/50 border-white/5 hover:text-white'
              }`}
            >
              Free Streams
            </button>

            <span className="ml-auto text-white/40 text-[11px] font-mono">
              Showing {filteredSongs.length} of {allSongs.length} releases
            </span>
          </div>
        </div>

        {/* Master Catalog Table */}
        <div className="overflow-x-auto">
          {filteredSongs.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30">
                <Music2 size={24} />
              </div>
              <p className="text-white font-bold text-[15px]">No songs match your filter criteria</p>
              <p className="text-white/40 text-[12px] max-w-md mx-auto">
                Try clearing your search query or switching to "All Network Statuses" to view the complete catalog.
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); setMonetizationFilter('all'); setGenreFilter('all'); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[12px] font-bold transition-all"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-[#0A0A0A] border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-white/40 sticky top-0 z-10">
                <tr>
                  <th className="py-3.5 px-4 w-[320px]">Sound Recording & Audio</th>
                  <th className="py-3.5 px-4">Artist / Master Rights</th>
                  <th className="py-3.5 px-4">Commercials & Plays</th>
                  <th className="py-3.5 px-4">Broadcast & Legal Status</th>
                  <th className="py-3.5 px-4 text-right">Moderation & Enforcement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSongs.map((song) => {
                  const isThisPlaying = playingSongId === song.id && isPlaying;
                  const isCopyrightTakedown = song.status === 'copyright_takedown' || 
                    (song.vaulted_reason && song.vaulted_reason.toLowerCase().includes('copyright'));

                  return (
                    <tr key={song.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Column 1: Track & Audio */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {/* Cover Artwork with Hover Audio Play Button */}
                          <div className="relative w-12 h-12 rounded-xl bg-white/5 overflow-hidden border border-white/10 shrink-0 group/cover">
                            {song.cover_url ? (
                              <img 
                                src={optimizeImage(song.cover_url, 100, 100)} 
                                alt="" 
                                className="w-full h-full object-cover" 
                                loading="lazy" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/30">
                                <Music2 size={20} />
                              </div>
                            )}

                            {/* Play Button Overlay */}
                            <button
                              type="button"
                              onClick={() => handlePlayToggle(song)}
                              title={isThisPlaying ? 'Pause Audio' : 'Preview Audio'}
                              className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-all ${
                                isThisPlaying ? 'opacity-100 bg-[#00A3FF]/80 text-white' : 'opacity-0 group-hover/cover:opacity-100 text-white'
                              }`}
                            >
                              {isThisPlaying ? (
                                <Pause size={18} className="text-white" />
                              ) : (
                                <Play size={18} className="text-white ml-0.5" />
                              )}
                            </button>
                          </div>

                          {/* Track Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-white text-[13px] leading-tight truncate group-hover:text-[#00A3FF] transition-colors">
                                {song.title}
                              </p>
                              {song.is_explicit && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30 uppercase">
                                  E
                                </span>
                              )}
                            </div>

                            <p className="text-[12px] text-white/50 mt-0.5 truncate flex items-center gap-1.5">
                              <span className="text-white/70 font-medium">{song.genre || 'General'}</span>
                              <span>•</span>
                              <span>{song.type || 'Single'}</span>
                              <span>•</span>
                              <span>{new Date(song.created_at).toLocaleDateString()}</span>
                            </p>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-white/30 font-mono">
                                ID: {song.id.split('-')[0]}...
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(song.id, song.id)}
                                title="Copy Song ID"
                                className="text-white/30 hover:text-white transition-colors"
                              >
                                {copiedId === song.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Artist & Signature */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p 
                              onClick={() => song.artist_id && onOpenPerson360 && onOpenPerson360(song.artist_id)}
                              className="font-semibold text-white/90 hover:text-[#00A3FF] transition-colors cursor-pointer truncate max-w-[180px]"
                            >
                              {song.profiles?.stage_name || 'Unknown Entity'}
                            </p>
                            <ShieldCheck size={13} className="text-[#00A3FF] shrink-0" />
                          </div>

                          {song.profiles?.full_name && (
                            <p className="text-[11px] text-white/40 truncate max-w-[180px]">
                              Legal: {song.profiles.full_name}
                            </p>
                          )}

                          {song.profiles?.email && (
                            <p className="text-[11px] text-[#00A3FF]/70 truncate max-w-[180px] font-mono">
                              {song.profiles.email}
                            </p>
                          )}

                          {song.featured_artist && (
                            <p className="text-[11px] text-amber-400/80 mt-0.5 truncate">
                              feat. {song.featured_artist}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Commercials & Plays */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {song.is_for_sale || (song.price && song.price > 0) ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold font-mono">
                                MK {Number(song.price || 0).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-white/60 border border-white/10 font-bold">
                                Free Stream
                              </span>
                            )}
                          </div>

                          <p className="text-[12px] text-white/60 font-mono">
                            <span className="font-bold text-white">{(song.plays || 0).toLocaleString()}</span> streams
                          </p>
                          
                          {(song.sales_count > 0 || song.sales > 0) && (
                            <p className="text-[11px] text-emerald-400 font-mono">
                              {(song.sales_count || song.sales || 0)} digital copies sold
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Broadcast & Legal Status */}
                      <td className="py-3.5 px-4">
                        {isCopyrightTakedown ? (
                          <div className="space-y-1.5">
                            <div 
                              onClick={() => setViewingClaimSong(song)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/40 font-bold text-[11px] cursor-pointer hover:bg-red-500/30 transition-all"
                            >
                              <ShieldAlert size={13} className="shrink-0" />
                              <span>Copyright Takedown</span>
                            </div>
                            {song.vaulted_reason && (
                              <p 
                                onClick={() => setViewingClaimSong(song)}
                                className="text-[11px] text-red-400/80 max-w-[200px] truncate cursor-pointer hover:underline"
                                title={song.vaulted_reason}
                              >
                                {song.vaulted_reason.replace('Copyright Infringement: ', '')}
                              </p>
                            )}
                          </div>
                        ) : song.approved ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <div>
                              <span className="text-emerald-400 font-bold text-[12px]">Broadcasting</span>
                              <p className="text-[10px] text-white/40">Publicly available</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <div>
                              <span className="text-amber-400 font-bold text-[12px]">Hold / In Review</span>
                              <p className="text-[10px] text-white/40">Unapproved draft</p>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 5: Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Audio Preview Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handlePlayToggle(song)}
                            title={isThisPlaying ? 'Pause Audio' : 'Preview Audio'}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              isThisPlaying 
                                ? 'bg-[#00A3FF] text-white' 
                                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                            }`}
                          >
                            {isThisPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                          </button>

                          {/* Full Studio Inspection Modal */}
                          <button
                            type="button"
                            onClick={() => setReviewSong(song)}
                            title="Open A&R Studio Review"
                            className="h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-[12px] font-semibold flex items-center gap-1 transition-all"
                          >
                            <SlidersHorizontal size={13} />
                            <span className="hidden xl:inline">Studio</span>
                          </button>

                          {/* Quick Release (if not approved) */}
                          {!song.approved && !isCopyrightTakedown && (
                            <button
                              type="button"
                              onClick={() => handleApproveSong(song)}
                              className="h-8 px-3 rounded-lg bg-[#0084D6] hover:bg-[#00A3FF] text-white text-[12px] font-bold transition-all shadow-md"
                            >
                              Release
                            </button>
                          )}

                          {/* Reinstate (if under copyright takedown) */}
                          {isCopyrightTakedown ? (
                            <button
                              type="button"
                              onClick={() => handleReinstateSong(song)}
                              title="Reinstate track to broadcast"
                              className="h-8 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[12px] font-bold transition-all flex items-center gap-1"
                            >
                              <CheckCircle2 size={13} /> Reinstate
                            </button>
                          ) : (
                            /* Take Down Under Copyright Issues Button */
                            <button
                              type="button"
                              onClick={() => setTakedownSong(song)}
                              title="Take Down under Copyright / DMCA Violation"
                              className="h-8 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/60 text-[12px] font-bold transition-all flex items-center gap-1"
                            >
                              <ShieldAlert size={14} />
                              <span className="hidden lg:inline">Takedown</span>
                            </button>
                          )}

                          {/* Permanent Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteSong(song)}
                            title="Delete Permanently"
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-600 text-white/40 hover:text-white flex items-center justify-center transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Copyright Takedown Execution Modal */}
      {takedownSong && (
        <CopyrightTakedownModal
          song={takedownSong}
          onClose={() => setTakedownSong(null)}
          onSuccess={() => {
            onRefresh();
            if (playingSongId === takedownSong.id && audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
            }
          }}
        />
      )}

      {/* Full Song Studio Review Modal */}
      {reviewSong && (
        <SongReviewModal
          song={reviewSong}
          onClose={() => setReviewSong(null)}
          onApprove={async (id) => {
            await handleApproveSong(reviewSong);
            setReviewSong(null);
          }}
          onReject={async (id, reason) => {
            setTakedownSong(reviewSong);
            setReviewSong(null);
          }}
          onRequestRevision={async (id, note) => {
            // Send revision note
            if (reviewSong.artist_id) {
              await supabase.from('notifications').insert({
                profile_id: reviewSong.artist_id,
                user_type: 'artist',
                type: 'system_alert',
                message: `Action Required for "${reviewSong.title}": ${note}`,
                link: '/artist-hub'
              });
              toast.success('Revision request sent to artist');
            }
            setReviewSong(null);
          }}
        />
      )}

      {/* Copyright Claim Inspection Modal */}
      {viewingClaimSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-[#141414] border border-red-500/30 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5 text-red-400 font-bold text-[15px]">
                <ShieldAlert size={20} />
                Copyright Takedown Record
              </div>
              <button 
                onClick={() => setViewingClaimSong(null)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[13px]">
              <div>
                <p className="text-white/40 text-[11px] uppercase tracking-wider font-semibold">Track</p>
                <p className="font-bold text-white text-[14px]">{viewingClaimSong.title}</p>
                <p className="text-white/60 text-[12px]">{viewingClaimSong.profiles?.stage_name || 'Unknown Artist'}</p>
              </div>

              <div>
                <p className="text-white/40 text-[11px] uppercase tracking-wider font-semibold">Takedown Timestamp</p>
                <p className="font-mono text-white/90">
                  {viewingClaimSong.vaulted_at ? new Date(viewingClaimSong.vaulted_at).toLocaleString() : 'Date recorded on server'}
                </p>
              </div>

              <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-xl space-y-1">
                <p className="text-red-400 font-semibold text-[12px] uppercase tracking-wider">Recorded Infringement Note</p>
                <p className="text-white/90 leading-relaxed text-[13px]">
                  {viewingClaimSong.vaulted_reason || 'Taken down due to copyright infringement violation.'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  const song = viewingClaimSong;
                  setViewingClaimSong(null);
                  handleReinstateSong(song);
                }}
                className="flex-1 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} /> Reinstate Song
              </button>
              <button
                type="button"
                onClick={() => setViewingClaimSong(null)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[13px] font-medium transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
