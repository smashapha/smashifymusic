import { optimizeImage } from "../lib/imageUtils";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, Heart, Share2, Clock, Music, Headphones, TrendingUp, MoreVertical, PlayCircle, PauseCircle, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { musicService } from '../services/musicService';
import { attachArtistProfilesToSongs } from '../lib/publicCatalog';
import { Song, Album, Artist } from '../types';
import { getEffectivePrice, isOnSale } from '../lib/pricing';
import { formatDisplayTitle, formatArtistName } from '../lib/formatting';
import { copyToClipboard } from '../lib/shareUtils';
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING, SECTION_SPACING } from '../lib/layout';
import toast from 'react-hot-toast';
import SongCard from "../components/common/SongCard";
import SEO from '../components/common/SEO';
import BrandLoader from '../components/common/BrandLoader';

const AlbumDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { playSong, playQueue, currentSong, isPlaying, togglePlay, purchasedIds } = usePlayer();
  
  const [album, setAlbum] = useState<Album | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (id) fetchAlbum();
  }, [id, userProfile]);

  const fetchAlbum = async () => {
    setLoading(true);
    try {
      const { data: albumData, error: albumErr } = await supabase
        .from('albums')
        .select('*')
        .eq('id', id)
        .single();
        
      if (albumErr) throw albumErr;
      setAlbum(albumData);

      const { data: artistData } = await supabase
        .from('artist_catalog')
        .select('*')
        .eq('id', albumData.artist_id)
        .single();
        
      setArtist(artistData);

      const { data: songsData } = await supabase
        .from('public_songs')
        .select('*')
        .eq('album_id', id)
        .order('created_at', { ascending: true }); 
        
      if (songsData) {
        const withProfiles = await attachArtistProfilesToSongs(songsData);
        let formatted = withProfiles.map((s: any) => ({
          ...s,
          artist_name: s.profiles?.stage_name || s.profiles?.full_name || artistData?.stage_name || artistData?.full_name || 'Unknown Artist',
          cover_url: s.cover_url || albumData.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
          url: s.audio_url
        }));

        // Enrich with purchase statuses
        const enrichedSongs = await musicService.enrichSongsWithPurchases(formatted as any, userProfile?.id);
        setSongs(enrichedSongs);
      }

      // Check if user has saved this album in their playlists
      if (userProfile?.id && albumData) {
        const { data: userSaves, error: saveError } = await supabase
          .from('playlists')
          .select('id')
          .eq('profile_id', userProfile.id)
          .eq('name', albumData.title)
          .maybeSingle();

        if (!saveError) {
          setIsSaved(!!userSaves);
        }
      }
      
    } catch (err) {
      console.error('Error fetching album details:', err);
      toast.error('Failed to load album details');
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

  const totalDurationSecs = songs.reduce((sum, s) => sum + (s.duration || 215), 0);
  const totalHours = Math.floor(totalDurationSecs / 3600);
  const totalMinutes = Math.floor((totalDurationSecs % 3600) / 60);
  const durationText = totalHours > 0 
    ? `${totalHours} hr ${totalMinutes} min` 
    : `${totalMinutes} min`;

  const totalPlays = songs.reduce((sum, s) => sum + (s.plays || 0), 0);

  const checkCurrentlyPlaying = (songId: string) => {
    return currentSong?.id === songId;
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playQueue(songs, 0);
    } else {
      toast.error('No songs available in this album');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: album?.title,
          text: `Check out the album ${album?.title} by ${artist?.stage_name || artist?.full_name} on Smashify!`,
          url
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('Native share failed, falling back to copy:', err);
      }
    }
    const copied = await copyToClipboard(url);
    if (copied) {
      toast.success('Album link copied to clipboard!');
    } else {
      toast.error('Could not copy link to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="pb-32 min-h-screen bg-bg-page flex items-center justify-center">
        <BrandLoader label="Loading album" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="pb-32 min-h-screen bg-bg-page flex flex-col items-center justify-center text-white">
        <HelpCircle size={48} className="text-text-muted mb-4" />
        <h3 className="text-xl font-bold">Album not found</h3>
        <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-[#0084D6] hover:bg-[#0084D6]/90 text-white rounded-[10px] text-sm font-semibold">Back Home</button>
      </div>
    );
  }

  return (
    <div className="pb-32 min-h-screen bg-bg-page select-none text-white overflow-x-hidden">
      <SEO 
        title={`${album.title} — ${artist?.stage_name || 'Smashify'}`}
        description={`Listen to the album "${album.title}" by ${artist?.stage_name || 'artist'} on Smashify. Stream free or buy tracks directly.`}
        image={album.cover_url || '/og-image.png'}
        url={window.location.href}
      />
      {/* Dynamic Glowing Banner Header - Matching Playlist Layout */}
      <div className="h-[42vh] min-h-[340px] relative bg-gradient-to-b from-[#9B5DE5]/20 to-[#0b0a0e] pt-12">
        <img src={optimizeImage(album.cover_url, 400, 400)} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20 pointer-events-none" alt="" loading="lazy" decoding="async" />
        <div className="absolute inset-0 bg-[#0b0a0e]/60" />
        
        <div className="relative h-full max-w-[1400px] mx-auto px-6 md:px-12 flex items-end pb-12 z-10">
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-6 left-6 md:left-12 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all active:scale-95 border border-white/5"
            id="back_button_album"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex flex-col md:flex-row items-start md:items-end gap-8 w-full mt-10 md:mt-0">
            {/* Album Artwork Cover */}
            <div className="w-40 h-40 md:w-52 md:h-52 shrink-0 rounded-2xl overflow-hidden shadow-[0_16px_32px_rgba(0,0,0,0.6)] relative border border-white/10 group">
              <img src={optimizeImage(album.cover_url, 400, 400)} className="w-full h-full object-cover" alt={album.title} loading="lazy" decoding="async" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <PlayCircle size={48} className="text-white drop-shadow-md" />
              </div>
            </div>

            {/* Title / Meta */}
            <div className="flex-1">
              <span className="font-display font-extrabold uppercase tracking-[0.2em] text-[11px] text-[#00A3FF] bg-[#0084D6]/10 px-2.5 py-1 rounded-full border border-[#00A3FF]/20">
                Album
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mt-4 mb-3 leading-tight line-clamp-2">
                {album.title}
              </h1>
              
              <div className="flex items-center gap-2 text-xs text-text-muted font-sans flex-wrap">
                {artist && (
                  <div 
                    onClick={() => navigate(`/artist/${artist.id}`)}
                    className="flex items-center gap-2 hover:underline cursor-pointer group"
                  >
                    <img 
                      src={artist.avatar_url || `https://ui-avatars.com/api/?name=${artist.stage_name || artist.full_name}&background=18162C&color=current`} 
                      className="w-5 h-5 rounded-full object-cover border border-white/10" 
                      alt="" 
                    loading="lazy" decoding="async" />
                    <span className="font-semibold text-white">{artist.stage_name || artist.full_name}</span>
                  </div>
                )}
                <span className="text-white/30">•</span>
                <span className="text-white/80 font-bold">{album.release_year || '2026'}</span>
                <span className="text-white/30">•</span>
                <span className="text-white/80 font-bold">{songs.length} songs, {durationText}</span>
                <span className="text-white/30">•</span>
                <span className="text-text-muted">{totalPlays.toLocaleString()} total streams</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Album Actions Row */}
      <div className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} py-8`}>
        <div className={`flex items-center gap-6 ${SECTION_SPACING}`}>
          <button 
            onClick={handlePlayAll} 
            className="h-11 px-6 bg-[#0084D6] hover:bg-[#0084D6]/90 text-white rounded-[10px] flex items-center justify-center gap-2 font-semibold text-sm shadow-md transition-all"
            id="play_all_album"
          >
            <Play fill="white" size={18} /> Play Album
          </button>
          
          <button 
            onClick={async () => {
              if (!userProfile?.id) {
                toast.error('Log in to save albums to your Library!');
                return;
              }

              try {
                if (isSaved) {
                  // Delete the playlist entry matching this album title
                  const { error: deleteError } = await supabase
                    .from('playlists')
                    .delete()
                    .eq('profile_id', userProfile.id)
                    .eq('name', album.title);

                  if (deleteError) throw deleteError;
                  setIsSaved(false);
                  toast.success('Removed album from your Library');
                } else {
                  // Create a new playlist for this album
                  const { data: newPlaylist, error: insertError } = await supabase
                    .from('playlists')
                    .insert({
                      profile_id: userProfile.id,
                      name: album.title,
                      is_public: false,
                      cover_url: album.cover_url || (songs[0] && songs[0].cover_url) || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
                      description: `Album by ${artist?.stage_name || artist?.full_name || 'Artist'}`
                    })
                    .select('id')
                    .single();

                  if (insertError) throw insertError;

                  // Insert songs into playlist_songs
                  if (songs.length > 0) {
                    const songsToInsert = songs.map(s => ({
                      playlist_id: newPlaylist.id,
                      song_id: s.id
                    }));
                    await supabase.from('playlist_songs').insert(songsToInsert);
                  }

                  setIsSaved(true);
                  toast.success('Added album to your Library!');
                }
              } catch (err: any) {
                console.error('Error toggling album save:', err);
                toast.error('Failed to update album: ' + err.message);
              }
            }}
            className={`w-12 h-12 border ${isSaved ? 'border-[#00A3FF] bg-[#0084D6]/5 text-[#00A3FF]' : 'border-white/10 text-white/70 hover:border-white/30 hover:text-white'} rounded-full flex items-center justify-center transition-all active:scale-90`}
            id="save_album"
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          
          <button 
            onClick={handleShare}
            className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:border-white/30 hover:text-white transition-all active:scale-90"
            id="share_album"
          >
            <Share2 size={19} />
          </button>
        </div>

        {/* Songs Grid List */}
        <div className="space-y-1">
          {/* Table Header */}
          <div className="hidden md:flex items-center gap-4 px-4 py-2 border-b border-white/5 text-[11px] text-[#737373] font-semibold uppercase tracking-[0.18em] mb-3">
            <span className="w-10 text-center">#</span>
            <span className="flex-1">Title</span>
            <span className="w-32 text-right">Plays</span>
            <span className="w-16 text-right pr-4"><Clock size={14} className="inline ml-auto" /></span>
          </div>

          {songs.length === 0 ? (
            <div className="text-center py-20 bg-white/2 p-8 rounded-2xl border border-white/5">
              <Music size={40} className="mx-auto text-white/10 mb-4" />
              <p className="text-sm font-semibold text-text-muted">No tracks listed in this album yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {songs.map((song, index) => (
                <SongCard key={song.id} song={song} queue={songs} layout="list" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumDetails;
