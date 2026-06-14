import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, Heart, Share2, Clock, Music, Headphones, TrendingUp, MoreVertical, PlayCircle, PauseCircle, Trash2, Shuffle, Pencil, Settings, ChevronUp, ChevronDown, Globe, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { musicService } from '../services/musicService';
import { Song } from '../types';
import toast from 'react-hot-toast';

// Chart Metadata matching the visual screenshots
const FEATURED_CHARTS = [
  {
    id: 'top-songs-global',
    title: 'Top Songs Global',
    subtitle: 'Your weekly update of the most played tracks right now - Global.',
    style: 'from-purple-800 to-indigo-950',
    type: 'weekly',
    cardTitle: 'Top Songs',
    cardSub: 'Global',
    iconText: 'Weekly Music Charts',
    baseSaves: 154200
  },
  {
    id: 'top-songs-malawi',
    title: 'Top Songs Malawi',
    subtitle: 'Your weekly update of the most played tracks right now - Malawi.',
    style: 'from-orange-850 to-red-950',
    type: 'weekly',
    cardTitle: 'Top Songs',
    cardSub: 'Malawi',
    iconText: 'Weekly Music Charts',
    baseSaves: 48300
  },
  {
    id: 'top-50-global',
    title: 'Top 50 - Global',
    subtitle: 'Your daily update of the most played tracks right now - Global.',
    style: 'from-teal-800 to-cyan-950',
    type: 'daily',
    cardTitle: 'Top 50',
    cardSub: 'GLOBAL',
    iconText: 'Daily Music Charts',
    baseSaves: 289500
  },
  {
    id: 'top-50-malawi',
    title: 'Top 50 - Malawi',
    subtitle: 'Your daily update of the most played tracks right now - Malawi.',
    style: 'from-pink-800 to-rose-950',
    type: 'daily',
    cardTitle: 'Top 50',
    cardSub: 'MALAŴI',
    iconText: 'Daily Music Charts',
    baseSaves: 67100
  }
];

const PlaylistDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { playSong, playQueue, currentSong, isPlaying, togglePlay } = usePlayer();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savesCount, setSavesCount] = useState<number>(0);
  const [customPlaylistInfo, setCustomPlaylistInfo] = useState<{
    title: string;
    description: string;
    style: string;
    cover_url?: string;
    isCustom?: boolean;
    profile_id?: string;
    is_public?: boolean;
  } | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPublic, setEditPublic] = useState(false);
  const [reordering, setReordering] = useState(false);
  const isOwner = customPlaylistInfo?.isCustom && customPlaylistInfo?.profile_id === userProfile?.id;

  const chartInfo = FEATURED_CHARTS.find(c => c.id === id) || FEATURED_CHARTS[0];
  const displayInfo = customPlaylistInfo || {
    title: chartInfo.title,
    description: chartInfo.subtitle,
    style: chartInfo.style,
    cover_url: undefined,
    isCustom: false
  };

  const totalDurationSecs = songs.reduce((sum, s) => sum + (s.duration || 215), 0); // fallback to 3:35 per song if duration is undefined
  const totalHours = Math.floor(totalDurationSecs / 3600);
  const totalMinutes = Math.floor((totalDurationSecs % 3600) / 60);
  const durationText = totalHours > 0 
    ? `${totalHours} hr ${totalMinutes} min` 
    : `${totalMinutes} min`;

  useEffect(() => {
    fetchSongs();
  }, [id, userProfile]);

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const isCurated = FEATURED_CHARTS.some(c => c.id === id);

      if (!isCurated && id) {
        // Fetch custom playlist details
        const { data: customPlaylist, error: plError } = await supabase
          .from('playlists')
          .select('*, playlist_songs(id, position, songs(*, profiles:artist_id(full_name, stage_name, avatar_url, verified)))')
          .eq('id', id)
          .maybeSingle();

        if (plError) throw plError;

        if (customPlaylist) {
          setCustomPlaylistInfo({
            title: customPlaylist.name,
            description: customPlaylist.description || 'A custom playlist created in your Library.',
            style: 'from-purple-900/40 to-[#0b0a0e]',
            cover_url: customPlaylist.cover_url,
            isCustom: true,
            profile_id: customPlaylist.profile_id,
            is_public: customPlaylist.is_public
          });
          setEditName(customPlaylist.name);
          setEditPublic(customPlaylist.is_public);

          const sortedPlaylistSongs = (customPlaylist.playlist_songs || [])
            .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
          const playlistSongs = sortedPlaylistSongs.map((ps: any) => ps.songs ? ({ ...ps.songs, _playlistSongId: ps.id }) : null).filter(Boolean);
          const formatted = playlistSongs.map((s: any) => ({
            ...s,
            artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Unknown Artist',
            cover_url: s.cover_url || customPlaylist.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
            url: s.audio_url
          }));

          const enrichedSongs = await musicService.enrichSongsWithPurchases(formatted as any, userProfile?.id);
          setSongs(enrichedSongs);
          setIsSaved(true); // Always considered saved/created
          setSavesCount(1);
          setLoading(false);
          return;
        } else {
          // If custom playlist doesn't exist, go to home or set fallback
          setCustomPlaylistInfo(null);
        }
      }

      // Default: load curated chart songs
      setCustomPlaylistInfo(null);
      const today = new Date().toISOString().split('T')[0];
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select(`
          *,
          profiles:artist_id (
            full_name,
            stage_name,
            avatar_url,
            verified
          )
        `)
        .eq('approved', true)
        .lte('release_date', today);

      if (songsError) throw songsError;

      let formatted = (songsData || []).map((s: any) => ({
        ...s,
        artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Unknown Artist',
        cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
        url: s.audio_url
      }));

      // Apply Region-specific filtering (Malawi)
      if (id === 'top-songs-malawi' || id === 'top-50-malawi') {
        const malawiSongs = formatted.filter(s => 
          s.region?.toLowerCase().includes('malawi') || 
          s.genre?.toLowerCase().includes('malawi') || 
          s.artist_name?.toLowerCase().includes('malawi') ||
          s.title?.toLowerCase().includes('malawi') ||
          s.region?.toLowerCase().includes('malawi')
        );
        if (malawiSongs.length > 0) {
          formatted = malawiSongs;
        }
      }

      // Sort by plays descending (Top Ranked)
      formatted.sort((a, b) => (b.plays || 0) - (a.plays || 0));

      // Limit based on playlist type
      if (id === 'top-50-global' || id === 'top-50-malawi') {
        formatted = formatted.slice(0, 50);
      } else {
        formatted = formatted.slice(0, 30);
      }

      // Enrich with purchase statuses
      const enrichedSongs = await musicService.enrichSongsWithPurchases(formatted as any, userProfile?.id);
      setSongs(enrichedSongs);

      // Query real saves count from playlists table matching this chart name
      const { count: realSavesCount, error: countError } = await supabase
        .from('playlists')
        .select('id', { count: 'exact', head: true })
        .eq('name', chartInfo.title);

      if (!countError) {
        setSavesCount(realSavesCount || 0);
      }

      // Query if current user has saved this playlist
      if (userProfile?.id) {
        const { data: userSaves, error: saveError } = await supabase
          .from('playlists')
          .select('id')
          .eq('profile_id', userProfile.id)
          .eq('name', chartInfo.title)
          .maybeSingle();

        if (!saveError) {
          setIsSaved(!!userSaves);
        }
      } else {
        setIsSaved(false);
      }

    } catch (err) {
      console.error('Error fetching playlist songs:', err);
      toast.error('Failed to load chart songs');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (val: any) => {
    if (!val) return "3:15";
    if (typeof val === 'string') {
      if (val.includes(':')) return val;
      const num = parseInt(val, 10);
      if (isNaN(num)) return "3:15";
      val = num;
    }
    const mins = Math.floor(val / 60);
    const secs = Math.floor(val % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleShufflePlay = () => {
    if (songs.length === 0) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playQueue(shuffled, 0);
  };

  const handleRemoveSong = async (song: any) => {
    if (!isOwner) return;
    try {
      await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', id)
        .eq('song_id', song.id);
      setSongs(prev => prev.filter(s => s.id !== song.id));
      toast.success('Removed from playlist');
    } catch (err: any) {
      toast.error('Failed to remove: ' + err.message);
    }
  };

  const moveSong = async (index: number, direction: 'up' | 'down') => {
    if (!isOwner) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= songs.length) return;

    const newSongs = [...songs];
    [newSongs[index], newSongs[newIndex]] = [newSongs[newIndex], newSongs[index]];
    setSongs(newSongs);

    // Persist new positions
    try {
      await Promise.all(newSongs.map((s, i) =>
        supabase
          .from('playlist_songs')
          .update({ position: i })
          .eq('playlist_id', id)
          .eq('song_id', s.id)
      ));
    } catch (err) {
      console.error('Failed to save order:', err);
    }
  };

  const handleSavePlaylistSettings = async () => {
    if (!editName.trim()) {
      toast.error('Playlist name cannot be empty');
      return;
    }
    try {
      await supabase
        .from('playlists')
        .update({ name: editName.trim(), is_public: editPublic })
        .eq('id', id);
      toast.success('Playlist updated');
      setShowSettings(false);
      fetchSongs(); // Refresh
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!confirm('Delete this playlist permanently? This cannot be undone.')) return;
    try {
      await supabase.from('playlists').delete().eq('id', id);
      toast.success('Playlist deleted');
      navigate('/library');
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playQueue(songs, 0);
    } else {
      toast.error('No songs available in this playlist');
    }
  };

  const checkCurrentlyPlaying = (songId: string) => {
    return currentSong?.id === songId;
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: displayInfo.title,
          text: `Check out the ${displayInfo.title} on Smashify!`,
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Playlist link copied to clipboard!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="pb-32 min-h-screen bg-bg-page flex items-center justify-center">
        <div className="w-[48px] h-[48px] border-4 border-smash-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-32 min-h-screen bg-bg-page select-none text-white overflow-x-hidden">
      {/* Dynamic Glowing Header Background */}
      <div className={`h-[42vh] min-h-[340px] relative bg-gradient-to-b ${displayInfo.style} to-[#0b0a0e] pt-12`}>
        <div className="absolute inset-0 bg-[#0b0a0e]/60" />
        
        <div className="relative h-full max-w-[1400px] mx-auto px-6 md:px-12 flex items-end pb-12 z-10">
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-6 left-6 md:left-12 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all active:scale-95 border border-white/5"
            id="back_button_playlist"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8 w-full">
            {/* Playlist Dynamic Cover Design (Spotify/Smashify styled) */}
            {displayInfo.cover_url ? (
              <div className="w-40 h-40 md:w-52 md:h-52 shrink-0 rounded-2xl overflow-hidden shadow-[0_16px_32px_rgba(0,0,0,0.6)] relative border border-white/10 group">
                <img src={displayInfo.cover_url} className="w-full h-full object-cover" alt={displayInfo.title} />
              </div>
            ) : (
              <div className={`w-40 h-40 md:w-52 md:h-52 shrink-0 rounded-2xl bg-gradient-to-br ${displayInfo.style} shadow-[0_16px_32px_rgba(0,0,0,0.6)] relative flex flex-col justify-between p-5 border border-white/10 group`}>
                <div className="flex justify-between items-start">
                  <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                    <Headphones size={13} className="text-smash-cyan animate-pulse" />
                  </div>
                  <div className="text-[9px] font-display font-black tracking-widest text-white/50 uppercase">
                    {chartInfo.type}
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl md:text-3xl font-studio font-black italic tracking-tighter leading-none mb-1 text-white">
                    {chartInfo.cardTitle}
                  </h2>
                  <h3 className="text-lg font-display font-black tracking-widest text-[#1db954] uppercase leading-none">
                    {chartInfo.cardSub}
                  </h3>
                </div>
                
                <div className="flex items-center gap-1.5 mt-2">
                  <TrendingUp size={11} className="text-white/70" />
                  <span className="text-[9px] font-sans font-black tracking-widest uppercase text-white/60">
                    {chartInfo.iconText}
                  </span>
                </div>
              </div>
            )}

            {/* Title / Meta */}
            <div className="flex-1">
              <span className="font-display font-extrabold uppercase tracking-[0.2em] text-[11px] text-[#1db954] bg-[#1db954]/10 px-2.5 py-1 rounded-full">
                {displayInfo.isCustom ? 'My Library Playlist' : 'Public Playlist'}
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-studio font-black italic uppercase tracking-tighter text-white mt-4 mb-3 leading-none drop-shadow-md">
                {displayInfo.title}
              </h1>
              <p className="font-sans text-sm md:text-base text-text-secondary max-w-2xl font-medium leading-relaxed mb-4">
                {displayInfo.description}
              </p>
              
              <div className="flex items-center gap-2 text-xs text-text-muted font-sans flex-wrap">
                <span className="font-black text-white hover:underline cursor-pointer">Smashify</span>
                <span className="text-white/30">•</span>
                <span className="text-white/80 font-bold">{savesCount.toLocaleString()} saves</span>
                <span className="text-white/30">•</span>
                <span className="text-white/80 font-bold">{songs.length} songs, about {durationText}</span>
                <span className="text-white/30">•</span>
                <span className="text-[#1db954] font-black">{songs.length > 10 ? '2 new entries' : 'Updated daily'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist Actions Row */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8">
        <div className="flex items-center gap-6 mb-10">
          <button 
            onClick={handlePlayAll} 
            className="h-14 px-8 bg-[#1db954] rounded-full flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#1db954]/20 text-black font-display font-black uppercase tracking-widest text-xs"
            id="play_all_playlist"
          >
            <Play fill="black" size={18} /> Play Playlist
          </button>
          
          <button
            onClick={handleShufflePlay}
            disabled={songs.length === 0}
            className="h-14 px-6 border border-white/10 rounded-full flex items-center justify-center gap-2 text-white/80 hover:border-white/30 hover:text-white transition-all active:scale-95 font-display font-black uppercase tracking-widest text-xs disabled:opacity-30"
          >
            <Shuffle size={16} /> Shuffle
          </button>
          
          <button 
            onClick={async () => {
              if (!userProfile?.id) {
                toast.error('Log in to save playlists to your Library!');
                return;
              }

              try {
                const isCurated = FEATURED_CHARTS.some(c => c.id === id);
                if (!isCurated) {
                  // Custom dynamic playlist: delete on Heart click
                  if (confirm('Are you sure you want to remove this playlist from your Library?')) {
                    const { error: deleteError } = await supabase
                      .from('playlists')
                      .delete()
                      .eq('id', id);

                    if (deleteError) throw deleteError;
                    toast.success('Removed playlist from Library');
                    navigate('/library');
                  }
                  return;
                }

                if (isSaved) {
                  // Delete the saved playlist for this user
                  const { error: deleteError } = await supabase
                    .from('playlists')
                    .delete()
                    .eq('profile_id', userProfile.id)
                    .eq('name', chartInfo.title);

                  if (deleteError) throw deleteError;

                  setIsSaved(false);
                  setSavesCount(prev => Math.max(0, prev - 1));
                  toast.success('Removed from your Library');
                } else {
                  // Insert a new playlist record
                  const { data: newPlaylist, error: insertError } = await supabase
                    .from('playlists')
                    .insert({
                      profile_id: userProfile.id,
                      name: chartInfo.title,
                      is_public: false,
                      cover_url: songs[0]?.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'
                    })
                    .select('id')
                    .single();

                  if (insertError) throw insertError;

                  // Add all current songs to the playlist_songs table
                  if (songs.length > 0) {
                    const songsToInsert = songs.map(s => ({
                      playlist_id: newPlaylist.id,
                      song_id: s.id
                    }));
                    await supabase.from('playlist_songs').insert(songsToInsert);
                  }

                  setIsSaved(true);
                  setSavesCount(prev => prev + 1);
                  toast.success('Added to your Library under Playlists!');
                }
              } catch (err: any) {
                console.error('Error toggling playlist save:', err);
                toast.error('Failed to update playlist: ' + err.message);
              }
            }}
            className={`w-12 h-12 border ${isSaved ? 'border-[#1db954] bg-[#1db954]/5 text-[#1db954]' : 'border-white/10 text-white/70 hover:border-white/30 hover:text-white'} rounded-full flex items-center justify-center transition-all active:scale-90`}
            id="save_playlist"
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          
          <button 
            onClick={handleShare}
            className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:border-white/30 hover:text-white transition-all active:scale-90"
            id="share_playlist"
          >
            <Share2 size={19} />
          </button>

          {isOwner && (
            <button
              onClick={() => setShowSettings(true)}
              className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:border-white/30 hover:text-white transition-all active:scale-90"
            >
              <Settings size={19} />
            </button>
          )}
        </div>

        {/* Dynamic Songs Table in Spotify Grid Line-item layout */}
        <div className="space-y-1">
          {/* Table Header */}
          <div className="hidden md:flex items-center gap-4 px-4 py-2 border-b border-white/5 text-xs text-text-muted font-display font-black uppercase tracking-widest mb-3">
            <span className="w-10 text-center">#</span>
            <span className="flex-1">Title</span>
            <span className="w-32 text-right">Plays</span>
            <span className="w-16 text-right pr-4"><Clock size={14} className="inline ml-auto" /></span>
          </div>

          {songs.length === 0 ? (
            customPlaylistInfo?.isCustom ? (
              <div className="text-center py-20 bg-white/2 p-8 rounded-2xl border border-white/5">
                <Music size={40} className="mx-auto text-white/10 mb-4" />
                <p className="text-sm font-semibold text-text-muted mb-1">This playlist is empty</p>
                <p className="text-xs text-white/30">Add songs using the "Add to Playlist" option on any track.</p>
              </div>
            ) : (
              <div className="text-center py-20 bg-white/2 p-8 rounded-2xl border border-white/5">
                <Music size={40} className="mx-auto text-white/10 mb-4 animate-bounce" />
                <p className="text-sm font-semibold text-text-muted mb-1">No tracks found in database yet</p>
                <p className="text-xs text-white/10">Keep uploading great local hits to populate charts!</p>
              </div>
            )
          ) : (
            songs.map((song, index) => {
              const isCurrent = checkCurrentlyPlaying(song.id);
              const displayArtist = (song as any).featured_artist ? `${song.artist_name} ft. ${(song as any).featured_artist}` : song.artist_name;

              return (
                <div 
                  key={song.id} 
                  onClick={() => playQueue(songs, index)}
                  className={`flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 group cursor-pointer border border-transparent hover:border-white/5 transition-all duration-200 ${isCurrent ? 'bg-white/5 border-white/10' : ''}`}
                >
                  {/* Rank / Play Icon State */}
                  <div className="w-10 text-center shrink-0 flex items-center justify-center">
                    <span className="group-hover:hidden font-mono font-bold text-sm text-text-muted">
                      {isCurrent && isPlaying ? (
                        <div className="flex items-end justify-center gap-0.5 h-3.5 w-3.5">
                          <div className="bg-[#1db954] w-[3px] rounded-full animate-[bounce_0.8s_infinite_-0.2s]" />
                          <div className="bg-[#1db954] w-[3px] rounded-full animate-[bounce_0.8s_infinite_-0.4s]" />
                          <div className="bg-[#1db954] w-[3px] rounded-full animate-[bounce_0.8s_infinite_0s]" />
                        </div>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="hidden group-hover:inline text-[#1db954]">
                      {isCurrent && isPlaying ? (
                        <PauseCircle size={18} fill="currentColor" className="text-black" />
                      ) : (
                        <PlayCircle size={18} fill="currentColor" className="text-black" />
                      )}
                    </span>
                  </div>

                  {/* Thumbnail / Title & Artist */}
                  <div className="flex-1 flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden relative shadow-md shrink-0 bg-white/5">
                      <img src={song.cover_url} className="w-full h-full object-cover" alt={song.title} />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play fill="white" size={14} className="text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-sans font-bold text-[14px] md:text-[15px] truncate transition-colors ${isCurrent ? 'text-[#1db954]' : 'text-white group-hover:text-[#1db954]'}`}>
                          {song.title}
                        </h4>
                        {(song as any).is_explicit && (
                          <span className="px-1.5 py-0.5 bg-white/10 text-text-muted rounded-[3px] text-[8.5px] font-display font-black uppercase tracking-widest mt-0.5 shrink-0">
                            E
                          </span>
                        )}
                        {song.is_for_sale && (
                          <span className="px-1.5 py-0.5 bg-smash-purple/25 text-smash-purple text-[8.5px] font-display font-black uppercase tracking-widest rounded-[3px] mt-0.5 shrink-0">
                            MK {song.price}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-text-muted font-sans font-medium truncate mt-0.5">
                        {displayArtist}
                      </p>
                    </div>
                  </div>

                  {/* Play count */}
                  <div className="hidden md:block w-32 text-right font-mono text-[13px] text-text-secondary font-semibold">
                    {Number(song.plays || 0).toLocaleString()}
                  </div>

                  {/* Duration Time / Options */}
                  <div className="w-16 shrink-0 text-right pr-2 flex items-center justify-end gap-2 text-xs font-mono font-semibold text-text-muted">
                    <span className="group-hover:hidden">{formatDuration(song.duration)}</span>
                    {isOwner && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); moveSong(index, 'up'); }} disabled={index === 0} className="p-1 text-smash-gray hover:text-white disabled:opacity-20">
                          <ChevronUp size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveSong(index, 'down'); }} disabled={index === songs.length - 1} className="p-1 text-smash-gray hover:text-white disabled:opacity-20">
                          <ChevronDown size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveSong(song); }} className="p-1 text-smash-gray hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); }}
                      className="hidden group-hover:flex w-8 h-8 items-center justify-center hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all ml-auto"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setShowSettings(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-smash-dark border border-white/10 p-6 md:p-8 rounded-[32px] max-w-md w-full shadow-2xl space-y-5 transform scale-100 opacity-100" // simpler since animate isn't strictly imported per user instruct but motion might be
          >
            <h3 className="text-xl font-studio font-bold uppercase tracking-tight text-white">Playlist Settings</h3>

            <div>
              <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest block mb-2">Playlist Name</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 outline-none focus:border-smash-orange transition-all font-bold text-white"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                {editPublic ? <Globe size={18} className="text-smash-orange" /> : <Lock size={18} className="text-smash-gray" />}
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-white">Public Playlist</p>
                  <p className="text-[10px] text-smash-gray font-medium">Anyone can find and play this</p>
                </div>
              </div>
              <button
                onClick={() => setEditPublic(!editPublic)}
                className={`w-12 h-6 rounded-full transition-all relative ${editPublic ? 'bg-smash-orange' : 'bg-white/10'}`}
              >
                <div 
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg transition-transform ${editPublic ? 'translate-x-7' : 'translate-x-1'}`} 
                />
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs text-smash-gray hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlaylistSettings}
                className="flex-1 py-3.5 bg-white text-smash-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-smash-orange hover:text-white transition-all"
              >
                Save Changes
              </button>
            </div>

            <button
              onClick={handleDeletePlaylist}
              className="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> Delete Playlist
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistDetails;
