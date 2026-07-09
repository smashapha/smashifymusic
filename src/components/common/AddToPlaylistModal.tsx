import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Plus, Music2, Check, Lock as AppLockIcon, Globe, Loader2 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Playlist, Song } from '../../types';

interface AddToPlaylistModalProps {
  song: Song;
  onClose: () => void;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ song, onClose }) => {
  const { userProfile } = useAuth();
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
    }
  }, [userProfile]);

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
    try {
      const { data, error } = await supabase
        .from('playlist_songs')
        .select('playlist_id')
        .eq('song_id', song.id);

      if (error) throw error;
      if (data) {
        setAddedPlaylists(data.map(d => d.playlist_id));
      }
    } catch (err) {
      console.error('Error checking added playlists:', err);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newName.trim() || !userProfile?.id) return;
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
      await handleAddToPlaylist(data.id);
      
      setNewName('');
      setShowCreate(false);
      fetchPlaylists();
    } catch (err) {
      console.error('Error creating playlist:', err);
      alert('Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (addedPlaylists.includes(playlistId)) return;
    setAddingTo(playlistId);

    try {
      const { error } = await supabase
        .from('playlist_songs')
        .insert({
          playlist_id: playlistId,
          song_id: song.id,
          profile_id: userProfile?.id
        });

      if (error) {
          if (error.code === '23505') { // Unique constraint violation
              // Already added
          } else {
              throw error;
          }
      }

      setAddedPlaylists(prev => [...prev, playlistId]);
      
      // Update playlist cover if it's the first song or just because
      await supabase
        .from('playlists')
        .update({ cover_url: song.cover_url })
        .eq('id', playlistId)
        .is('cover_url', null);

    } catch (err) {
      console.error('Error adding to playlist:', err);
      alert('Failed to add to playlist');
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
        className="absolute inset-0 bg-smash-black/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md glass-morphism border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black font-display italic uppercase tracking-tighter">Add to Playlist</h2>
            <p className="text-xs font-black text-smash-gray uppercase tracking-widest mt-1">Select or create a new library</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-smash-gray hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
          {/* Song Preview */}
          <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
            <img src={song.cover_url} alt={song.title} className="w-12 h-12 rounded-lg object-cover" />
            <div className="min-w-0">
              <p className="font-display font-black italic uppercase text-sm truncate leading-none mb-1">{song.title}</p>
              <p className="text-[10px] text-smash-gray font-black uppercase tracking-widest truncate">{song.artist_name}</p>
            </div>
          </div>

          {!showCreate ? (
            <div className="space-y-4">
              <button 
                onClick={() => setShowCreate(true)}
                className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest text-smash-gray hover:text-white hover:border-smash-orange/50 transition-all group"
              >
                <Plus size={20} className="group-hover:text-smash-orange transition-colors" /> Create New Playlist
              </button>

              <div className="space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-smash-orange" size={24} />
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
                            <img src={playlist.cover_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <Music2 size={24} className="text-smash-gray" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-display font-black italic uppercase text-sm group-hover:text-smash-orange transition-colors">{playlist.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {playlist.is_public ? <Globe size={10} className="text-smash-gray" /> : <AppLockIcon size={10} className="text-smash-gray" />}
                            <p className="text-[10px] text-smash-gray font-black uppercase tracking-widest">{playlist.is_public ? 'Public' : 'Private'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {addedPlaylists.includes(playlist.id) ? (
                        <div className="w-8 h-8 rounded-full bg-smash-green/20 text-smash-green flex items-center justify-center">
                          <Check size={16} />
                        </div>
                      ) : addingTo === playlist.id ? (
                        <Loader2 className="animate-spin text-smash-orange" size={20} />
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-white/10 group-hover:border-smash-orange/50 flex items-center justify-center transition-all">
                          <Plus size={16} className="text-smash-gray group-hover:text-smash-orange" />
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-center py-8 text-sm text-smash-gray font-medium">You don't have any playlists yet.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-1">Playlist Name</label>
                <input 
                  type="text"
                  autoFocus
                  placeholder="E.g. Summer Anthems"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-smash-orange transition-all font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  {isPublic ? <Globe size={18} className="text-smash-orange" /> : <AppLockIcon size={18} className="text-smash-gray" />}
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest">Public Playlist</p>
                    <p className="text-[10px] text-smash-gray font-medium">Anyone can see this playlist</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-12 h-6 rounded-full transition-all relative ${isPublic ? 'bg-smash-orange' : 'bg-white/10'}`}
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
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all text-smash-gray"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreatePlaylist}
                  disabled={!newName.trim() || loading}
                  className="flex-1 py-4 bg-white text-smash-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-smash-orange hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-smash-black shadow-xl"
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
