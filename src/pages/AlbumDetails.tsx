import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, MoreVertical, Heart, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePlayer } from '../context/PlayerContext';
import { Song, Album, Artist } from '../types';

const AlbumDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, playQueue } = usePlayer();
  
  const [album, setAlbum] = useState<Album | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchAlbum();
  }, [id]);

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
         setSongs(songsData as unknown as Song[]);
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;
  if (!album) return <div className="p-8 text-white">Album not found</div>;

  return (
    <div className="pb-32 min-h-screen">
      <div className="h-[40vh] min-h-[300px] relative">
         <img src={album.cover_url} className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30" />
         <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/80 to-transparent" />
         
         <div className="relative h-full max-w-[1400px] mx-auto px-6 md:px-12 flex items-end pb-12">
            <button onClick={() => navigate(-1)} className="absolute top-8 left-6 md:left-12 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
              <ArrowLeft size={20} />
            </button>
            
            <div className="flex flex-col md:flex-row items-end md:items-center gap-8 w-full">
               <div className="w-40 h-40 md:w-56 md:h-56 shrink-0 rounded-2xl overflow-hidden shadow-2xl mt-12 md:mt-0">
                  <img src={album.cover_url} className="w-full h-full object-cover" />
               </div>
               <div className="flex-1 w-full relative z-10">
                  <p className="font-display font-black uppercase tracking-widest text-[12px] text-smash-purple mb-2 md:mb-3 opacity-90 drop-shadow-md">Album</p>
                  <h1 className="text-4xl md:text-5xl lg:text-7xl font-studio font-black italic uppercase tracking-tighter text-white mb-2 md:mb-4 drop-shadow-lg leading-tight line-clamp-2">{album.title}</h1>
                  <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                     {artist && (
                        <div className="flex items-center gap-2 cursor-pointer hover:bg-white/5 pr-3 py-1 rounded-full transition-colors" onClick={() => navigate(`/artist/${artist.id}`)}>
                           <img src={artist.avatar_url || `https://ui-avatars.com/api/?name=${artist.stage_name || artist.full_name}&background=18162C&color=9B5DE5`} className="w-6 h-6 rounded-full" />
                           <span className="font-sans font-bold text-white text-[14px] md:text-[16px]">{artist.stage_name || artist.full_name}</span>
                        </div>
                     )}
                     <span className="text-text-muted hidden md:inline">•</span>
                     <span className="font-sans text-[13px] md:text-[14px] text-text-muted">{album.release_year}</span>
                     <span className="text-text-muted hidden md:inline">•</span>
                     <span className="font-sans text-[13px] md:text-[14px] text-text-muted">{songs.length} songs</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8">
         <div className="flex items-center gap-4 mb-10">
            <button onClick={() => playQueue(songs)} className="w-14 h-14 bg-smash-purple rounded-full flex items-center justify-center pl-1 hover:scale-105 transition-transform shadow-lg shadow-smash-purple/20 text-white">
               <Play fill="currentColor" size={24} />
            </button>
            <button className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/5 hover:text-white transition-colors">
               <Heart size={20} />
            </button>
            <button className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/5 hover:text-white transition-colors">
               <Share2 size={20} />
            </button>
         </div>

         <div className="space-y-2">
            {songs.length === 0 && <p className="text-text-muted text-sm px-4">No songs found for this album.</p>}
            {songs.map((song, index) => (
               <div key={song.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 group cursor-pointer" onClick={() => playSong(song, songs)}>
                  <div className="w-8 text-center text-text-muted font-mono">{index + 1}</div>
                  <div className="w-10 h-10 rounded-md overflow-hidden relative shadow-sm">
                     <img src={song.cover_url} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play fill="white" size={16} />
                     </div>
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2">
                        <h4 className="font-sans font-bold text-white text-[15px] truncate group-hover:text-smash-cyan transition-colors">{song.title}</h4>
                        {(song as any).is_explicit && <span className="px-1.5 py-0.5 bg-white/20 text-white rounded-[3px] text-[8px] font-black uppercase tracking-widest mt-0.5">E</span>}
                     </div>
                     <p className="text-[13px] text-text-muted truncate mt-0.5">{(song as any).featured_artist ? `${artist?.stage_name || artist?.full_name} ft. ${(song as any).featured_artist}` : (artist?.stage_name || artist?.full_name || 'Unknown')}</p>
                  </div>
                  <button className="w-10 h-10 flex items-center justify-center text-white/50 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10 rounded-full transition-all" onClick={(e) => e.stopPropagation()}>
                     <MoreVertical size={20} />
                  </button>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default AlbumDetails;
