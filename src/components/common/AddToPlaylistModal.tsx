import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Plus, Music2, Check, Lock as AppLockIcon, Globe, Loader2, Library
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Playlist, Song } from '../../types';

interface AddToPlaylistModalProps {
  song: Song;
  onClose: () => void;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ song, onClose }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addedPlaylists, setAddedPlaylists] = useState<string[]>([]);

  useEffect(() => {
    if (userProfile?.id) {
      fetchPlaylists();
      checkIfAdded();
    } else {
      setLoading(false);
    }
  }, [userProfile?.id]);

  const fetchPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('profile_id', userProfile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (err) {
      console.error('Error fetching playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkIfAdded = async () => {
    if (!userProfile?.id) return;
    try {
      const { data: userPlaylists } = await supabase
        .from('playlists')
        .select('id')
        .eq('profile_id', userProfile.id);

      if (userPlaylists && userPlaylists.length > 0) {
        const playlistIds = userPlaylists.map(p => p.id);
        const { data, error } = await supabase
          .from('playlist_songs')
          .select('playlist_id')
          .eq('song_id', song.id)
          .in('playlist_id', playlistIds);

        if (!error && data) {
          setAddedPlaylists(data.map(d => d.playlist_id));
        }
      }
    } catch (err) {
      console.error('Error checking added playlists:', err);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newName.trim()) return;
    if (!userProfile?.id) {
      toast.error('Please log in to create playlists');
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          name: newName.trim(),
          profile_id: userProfile.id,
          is_public: isPublic,
          cover_url: song.cover_url
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically add the song to the new playlist
      const { error: songError } = await supabase
        .from('playlist_songs')
        .insert({
          playlist_id: data.id,
          song_id: song.id
        });

      if (songError && songError.code !== '23505') {
        console.error('Error attaching song to new playlist:', songError);
      }

      setAddedPlaylists(prev => [...prev, data.id]);
      toast.success(`Created "${newName.trim()}" and added song!`);
      setNewName('');
      setShowCreate(false);
      fetchPlaylists();
    } catch (err: any) {
      console.error('Error creating playlist:', err);
      toast.error(err.message || 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (addedPlaylists.includes(playlistId)) return;
    if (!userProfile?.id) {
      toast.error('Please log in to save to playlist');
      return;
    }
    setAddingTo(playlistId);

    try {
      const { error } = await supabase
        .from('playlist_songs')
        .insert({
          playlist_id: playlistId,
          song_id: song.id
        });

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - already added
        } else {
          throw error;
        }
      }

      setAddedPlaylists(prev => [...prev, playlistId]);
      toast.success('Added song to playlist!');
      
      // Update playlist cover if it's empty
      await supabase
        .from('playlists')
        .update({ cover_url: song.cover_url })
        .eq('id', playlistId)
        .is('cover_url', null);

    } catch (err: any) {
      console.error('Error adding to playlist:', err);
      toast.error(err.message || 'Failed to add to playlist');
    } finally {
      setAddingTo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0A0A0A]/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md glass-morphism border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold font-display uppercase tracking-tighter">Add to Playlist</h2>
            <p className="text-xs font-semibold text-[#B0B0B0] uppercase tracking-widest mt-1">Select or create a new library</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-[#B0B0B0] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
          {/* Song Preview */}
          <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
            <img src={song.cover_url} alt={song.title} className="w-12 h-12 rounded-lg object-cover" loading="lazy" decoding="async" />
            <div className="min-w-0">
              <p className="font-display font-semibold uppercase text-sm truncate leading-none mb-1">{song.title}</p>
              <p className="text-[10px] text-[#B0B0B0] font-semibold uppercase tracking-widest truncate">{song.artist_name}</p>
            </div>
          </div>

          {!showCreate ? (
            <div className="space-y-4">
              <button 
                onClick={() => setShowCreate(true)}
                className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-3 text-sm font-semibold uppercase tracking-widest text-[#B0B0B0] hover:text-white hover:border-[#00A3FF]/50 transition-all group"
              >
                <Plus size={20} className="group-hover:text-[#00A3FF] transition-colors" /> Create New Playlist
              </button>

              <div className="space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-[#00A3FF]" size={24} />
                  </div>
                ) : playlists.length > 0 ? (
                  playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      disabled={addingTo === playlist.id || addedPlaylists.includes(playlist.id)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                          {playlist.cover_url ? (
                            <img src={playlist.cover_url} className="w-full h-full object-cover" alt="" loading="lazy" decoding="async" />
                          ) : (
                            <Music2 size={24} className="text-[#B0B0B0]" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-display font-semibold uppercase text-sm group-hover:text-[#00A3FF] transition-colors">{playlist.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {playlist.is_public ? <Globe size={10} className="text-[#B0B0B0]" /> : <AppLockIcon size={10} className="text-[#B0B0B0]" />}
                            <p className="text-[10px] text-[#B0B0B0] font-semibold uppercase tracking-widest">{playlist.is_public ? 'Public' : 'Private'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {addedPlaylists.includes(playlist.id) ? (
                        <div className="w-8 h-8 rounded-full bg-smash-green/20 text-smash-green flex items-center justify-center">
                          <Check size={16} />
                        </div>
                      ) : addingTo === playlist.id ? (
                        <Loader2 className="animate-spin text-[#00A3FF]" size={20} />
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-white/10 group-hover:border-[#00A3FF]/50 flex items-center justify-center transition-all">
                          <Plus size={16} className="text-[#B0B0B0] group-hover:text-[#00A3FF]" />
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-center py-8 text-sm text-[#B0B0B0] font-medium">You don't have any playlists yet.</p>
                )}
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/library?tab=playlists');
                    onClose();
                  }}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#00A3FF] hover:underline py-2"
                >
                  <Library size={14} /> View All Playlists in Library
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-[#B0B0B0] uppercase tracking-widest ml-1">Playlist Name</label>
                <input 
                  type="text"
                  autoFocus
                  placeholder="E.g. Summer Anthems"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-[#00A3FF] transition-all font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  {isPublic ? <Globe size={18} className="text-[#00A3FF]" /> : <AppLockIcon size={18} className="text-[#B0B0B0]" />}
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-widest">Public Playlist</p>
                    <p className="text-[10px] text-[#B0B0B0] font-medium">Anyone can see this playlist</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-12 h-6 rounded-full transition-all relative ${isPublic ? 'bg-[#0084D6]' : 'bg-white/10'}`}
                >
                  <motion.div 
                    animate={{ x: isPublic ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
                  />
                </button>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-4 rounded-2xl font-semibold uppercase tracking-widest text-xs hover:bg-white/5 transition-all text-[#B0B0B0]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreatePlaylist}
                  disabled={!newName.trim() || loading}
                  className="flex-1 py-4 bg-white text-[#0A0A0A] rounded-2xl font-semibold uppercase tracking-widest text-xs hover:bg-[#0084D6] hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-[#0A0A0A] shadow-xl"
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Create & Add'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AddToPlaylistModal;
