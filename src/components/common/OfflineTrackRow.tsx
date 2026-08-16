import React, { useState } from 'react';
import { Download, Trash2, Loader2, Check } from 'lucide-react';
import { optimizeImage } from '../../lib/imageUtils';
import { formatArtistName } from '../../lib/formatting';
import { useOfflineSong, removeSavedSong } from '../../lib/offlineSync';
import { removeCachedSong } from '../../lib/offlineCache';
import { usePlayer } from '../../context/PlayerContext';
import toast from 'react-hot-toast';

interface Props {
  song: any;
  userProfile: any;
  queue: any[];
}

export const OfflineTrackRow: React.FC<Props> = ({ song, userProfile, queue }) => {
  const { playSong } = usePlayer();
  const { isCachedLocal, cacheProgress, toggleOffline } = useOfflineSong(song.id, userProfile);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayArtist = formatArtistName(song.artist_name, song.featured_artist);

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-[#1A1A1A] border border-white/10 rounded-[14px] hover:bg-white/5 transition-colors group">
      <div 
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
        onClick={() => playSong(song, queue)}
      >
        <img
          src={optimizeImage(song.cover_url, 120, 120)}
          className="w-12 h-12 rounded-[10px] object-cover shrink-0 border border-white/10"
          alt={song.title}
          loading="lazy"
          decoding="async"
        />
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[14px] font-semibold text-white truncate">{song.title}</p>
          <p className="text-[12px] text-[#B0B0B0] truncate mt-0.5">{displayArtist}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isCachedLocal ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#00A3FF]/15 border border-[#00A3FF]/30 text-[#00A3FF] rounded-[8px] font-semibold text-[11px] uppercase tracking-wider">
            <Check size={12} /> Cached
          </span>
        ) : (
          <button
            onClick={() => toggleOffline(song)}
            disabled={cacheProgress !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 text-white hover:border-white/40 rounded-[10px] font-semibold text-[12px] transition-all disabled:opacity-50"
          >
            {cacheProgress !== null ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span className="hidden sm:inline">{Math.round(cacheProgress)}%</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span className="hidden sm:inline">Download</span>
              </>
            )}
          </button>
        )}
        
        <button
          onClick={async (e) => {
            e.stopPropagation();
            setIsDeleting(true);
            try {
              await removeCachedSong(song);
              await removeSavedSong(userProfile?.id, song.id);
              toast.success('Removed from offline saves');
              // Trigger a global refresh so Library removes the item
              window.dispatchEvent(new CustomEvent('smash_offline_updated', { detail: { songId: song.id, isSaved: false } }));
            } catch (err) {
              toast.error('Failed to remove');
            } finally {
              setIsDeleting(false);
            }
          }}
          disabled={isDeleting}
          className="p-2 text-[#B0B0B0] hover:text-[#FF453A] hover:bg-[#FF453A]/10 rounded-xl transition-all disabled:opacity-50"
        >
          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>
    </div>
  );
};
