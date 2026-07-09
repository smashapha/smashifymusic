import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, Heart, Share2, Clock, Music, Headphones, TrendingUp, MoreVertical, PlayCircle, PauseCircle, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { musicService } from '../services/musicService';
import { Song, Album, Artist } from '../types';
import { getEffectivePrice, isOnSale } from '../lib/pricing';
import { formatDisplayTitle } from '../lib/formatting';
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING, SECTION_SPACING } from '../lib/layout';
import toast from 'react-hot-toast';

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
        .from('profiles')
        .select('*')
        .eq('id', albumData.artist_id)
        .single();
        
      setArtist(artistData);

      const { data: songsData } = await supabase
        .from('songs')
        .select('*, profiles!artist_id(stage_name, full_name)')
        .eq('album_id', id)
        .order('created_at', { ascending: true }); 
        
      if (songsData) {
        let formatted = (songsData || []).map((s: any) => ({
          ...s,
          artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Unknown Artist',
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
    try {
      if (navigator.share) {
        await navigator.share({
          title: album?.title,
          text: `Check out the album ${album?.title} by ${artist?.stage_name || artist?.full_name} on Smashify!`,
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Album link copied to clipboard!');
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

  if (!album) {
    return (
      <div className="pb-32 min-h-screen bg-bg-page flex flex-col items-center justify-center text-white">
        <HelpCircle size={48} className="text-text-muted mb-4" />
        <h3 className="text-xl font-bold">Album not found</h3>
        <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-smash-purple rounded-full text-sm font-bold">Back Home</button>
      </div>
    );
  }

  return (
    <div className="pb-32 min-h-screen bg-bg-page select-none text-white overflow-x-hidden">
      {/* Dynamic Glowing Banner Header - Matching Playlist Layout */}
      <div className="h-[42vh] min-h-[340px] relative bg-gradient-to-b from-[#9B5DE5]/20 to-[#0b0a0e] pt-12">
        <img src={album.cover_url} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20 pointer-events-none" alt="" />
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
              <img src={album.cover_url} className="w-full h-full object-cover" alt={album.title} />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <PlayCircle size={48} className="text-white drop-shadow-md" />
              </div>
            </div>

            {/* Title / Meta */}
            <div className="flex-1">
              <span className="font-display font-extrabold uppercase tracking-[0.2em] text-[11px] text-smash-purple bg-smash-purple/10 px-2.5 py-1 rounded-full border border-smash-purple/20">
                Album
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-studio font-black italic uppercase tracking-tighter text-white mt-4 mb-3 leading-none drop-shadow-md line-clamp-2">
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
                    />
                    <span className="font-black text-white">{artist.stage_name || artist.full_name}</span>
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
            className="h-14 px-8 bg-smash-purple rounded-full flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-smash-purple/20 text-white font-display font-black uppercase tracking-widest text-xs"
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
            className={`w-12 h-12 border ${isSaved ? 'border-smash-purple bg-smash-purple/5 text-smash-purple' : 'border-white/10 text-white/70 hover:border-white/30 hover:text-white'} rounded-full flex items-center justify-center transition-all active:scale-90`}
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
          <div className="hidden md:flex items-center gap-4 px-4 py-2 border-b border-white/5 text-xs text-text-muted font-display font-black uppercase tracking-widest mb-3">
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
                          <div className="bg-smash-purple w-[3px] rounded-full animate-[bounce_0.8s_infinite_-0.2s]" />
                          <div className="bg-smash-purple w-[3px] rounded-full animate-[bounce_0.8s_infinite_-0.4s]" />
                          <div className="bg-smash-purple w-[3px] rounded-full animate-[bounce_0.8s_infinite_0s]" />
                        </div>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="hidden group-hover:inline text-smash-purple">
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
                      <img src={song.cover_url} className="w-full h-full object-cover" alt={formatDisplayTitle(song.title)} />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play fill="white" size={14} className="text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-sans font-bold text-[14px] md:text-[15px] truncate transition-colors ${isCurrent ? 'text-smash-purple' : 'text-white group-hover:text-smash-purple'}`}>
                          {formatDisplayTitle(song.title)}
                        </h4>
                        {(song as any).is_explicit && (
                          <span className="px-1.5 py-0.5 bg-white/10 text-text-muted rounded-[3px] text-[8.5px] font-display font-black uppercase tracking-widest mt-0.5 shrink-0">
                            E
                          </span>
                        )}
                        {song.is_for_sale && !song.is_purchased && !purchasedIds?.has(song.id) && (
                          <span className="px-1.5 py-0.5 bg-smash-purple/25 text-smash-purple text-[8.5px] font-display font-black uppercase tracking-widest rounded-[3px] mt-0.5 shrink-0 flex items-center gap-1">
                            {isOnSale(song) ? (
                              <>
                                <span className="line-through opacity-50">MK {song.price}</span>
                                <span>MK {getEffectivePrice(song)}</span>
                              </>
                            ) : (
                              <span>MK {song.price}</span>
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-text-muted font-sans font-medium truncate mt-0.5">
                        {displayArtist}
                      </p>
                    </div>
                  </div>

                  {/* Plays count column */}
                  <div className="hidden md:block w-32 text-right font-mono text-[13px] text-text-secondary font-semibold">
                    {Number(song.plays || 0).toLocaleString()}
                  </div>

                  {/* Duration segment */}
                  <div className="w-16 shrink-0 text-right pr-2 flex items-center justify-end gap-2 text-xs font-mono font-semibold text-text-muted">
                    <span className="group-hover:hidden">{formatDuration(song.duration)}</span>
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
    </div>
  );
};

export default AlbumDetails;
