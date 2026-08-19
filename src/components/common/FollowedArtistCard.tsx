import React from 'react';
import { Song } from '../../types';
import { usePlayer } from '../../context/PlayerContext';
import { Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FollowedArtistCard({ song, queue }: { song: Song, queue: Song[]; key?: React.Key }) {
  const { currentSong, isPlaying, playSong, playQueue, togglePlay } = usePlayer();
  const navigate = useNavigate();

  const isCurrent = currentSong?.id === song.id;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      // Reorder queue so this song is first
      const newQueue = [song, ...queue.filter(s => s.id !== song.id)];
      playQueue(newQueue);
    }
  };

  const artistName = song.profiles?.stage_name || song.profiles?.full_name || song.artist_name || 'Unknown Artist';
  const coverUrl = song.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop';
  const avatarUrl = song.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(artistName);

  return (
    <div 
      onClick={() => navigate(`/song/${song.id}`)}
      className="relative w-[260px] md:w-[300px] h-[160px] md:h-[180px] rounded-[20px] overflow-hidden group cursor-pointer border border-white/10 shrink-0 snap-start"
    >
      {/* Background Cover */}
      <img 
        src={coverUrl} 
        alt={song.title} 
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 group-hover:bg-black/40 transition-colors duration-500" />

      {/* Content */}
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div 
            onClick={(e) => { e.stopPropagation(); navigate(`/artist/${song.artist_id}`); }}
            className="flex items-center gap-2 bg-black/40 backdrop-blur-md pr-3 pl-1 py-1 rounded-full border border-white/10 hover:bg-black/60 transition-colors"
          >
            <img src={avatarUrl} alt={artistName} className="w-6 h-6 rounded-full object-cover border border-white/20" />
            <span className="text-[11px] font-bold text-white max-w-[120px] truncate">{artistName}</span>
          </div>
          
          <button 
            onClick={handlePlay}
            className="w-10 h-10 rounded-full bg-[#00A3FF] flex items-center justify-center text-white shadow-[0_4px_20px_rgba(0,163,255,0.4)] hover:scale-105 active:scale-95 transition-all z-10"
          >
            {isCurrent && isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-1" />}
          </button>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#00A3FF] mb-1">New Release</p>
          <h3 className="text-[16px] md:text-[18px] font-bold text-white truncate drop-shadow-md">{song.title}</h3>
        </div>
      </div>
    </div>
  );
}
