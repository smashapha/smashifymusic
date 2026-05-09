import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music2, Heart, ShoppingBag, Clock, Disc, PlayCircle, Search, Info, Download, Plus, Lock as AppLockIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Song } from '../types';
import SongCard from '../components/common/SongCard';

import { getListenerLimits, getListenerTier } from '../lib/tierUtils';

const Library: React.FC = () => {
  const { userProfile } = useAuth();
  const limits = getListenerLimits(userProfile);
  const isPremium = getListenerTier(userProfile) !== 'free';
  const [activeTab, setActiveTab] = useState<'purchased' | 'likes' | 'downloads' | 'playlists'>('purchased');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

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
          // If unliked, remove from library list
          setSongs(prev => prev.filter(s => s.id !== e.detail.songId));
        } else {
          // If liked, we might want to refresh to get the full song data, 
          // but usually likes are added from other screens, so an optimistic local add is hard without the full song object.
          // For now, let's just re-fetch if they are on the likes tab and something was liked.
          fetchLibrary();
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
          .from('purchases')
          .select('*, songs(*, profiles!artist_id(full_name))')
          .eq('user_id', userProfile?.id);

        if (pError) throw pError;

        const formatted = (purchases || []).map((p: any) => ({
          ...p.songs,
          artist_name: p.songs?.profiles?.stage_name || p.songs?.profiles?.full_name || 'Artist',
          cover_url: p.songs?.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
          url: p.songs?.audio_url,
          is_purchased: true
        }));
        setSongs(formatted as any);
      } else if (activeTab === 'likes') {
        const { data: likes, error: lError } = await supabase
          .from('likes')
          .select('*, songs(*, profiles!artist_id(full_name, stage_name))')
          .eq('user_id', userProfile?.id);

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
        const { data: playlistsData, error: plError } = await supabase
          .from('playlists')
          .select('*, playlist_songs(songs(*, profiles!artist_id(full_name, stage_name)))')
          .eq('user_id', userProfile?.id);
        
        if (plError) throw plError;
        setPlaylists(playlistsData || []);
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

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const { error } = await supabase.from('playlists').insert({
        user_id: userProfile?.id,
        name: newPlaylistName,
        is_public: false
      });
      if (error) throw error;
      toast.success('Playlist created!');
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
      fetchLibrary();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  if (!userProfile) {
     return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 p-12 text-center">
           <div className="relative">
              <div className="absolute inset-0 bg-smash-orange/20 blur-3xl rounded-full" />
              <div className="relative w-32 h-32 rounded-full border-4 border-dashed border-smash-gray/30 flex items-center justify-center">
                 <ShoppingBag size={48} className="text-smash-gray/30" />
              </div>
           </div>
           <div className="space-y-4">
              <h1 className="text-4xl font-black font-display italic uppercase tracking-tighter">Your Collection</h1>
              <p className="max-w-md text-smash-gray font-medium">Elevate your experience. Sign in to access your purchased beats and favorite slaps.</p>
           </div>
           <button onClick={() => window.location.href = '/auth'} className="px-12 py-5 bg-smash-orange text-white rounded-full font-black uppercase tracking-widest text-sm shadow-xl shadow-smash-orange/20 hover:scale-105 transition-all">
              Sign In To Access
           </button>
        </div>
     );
  }

  return (
    <div className="space-y-12 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
           <h1 className="text-5xl md:text-7xl font-black font-display italic uppercase tracking-tighter leading-none">
             YOUR <span className="text-smash-orange">LIBRARY</span>
           </h1>
           <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveTab('purchased')}
                className={`flex items-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'purchased' ? 'text-smash-orange' : 'text-smash-gray hover:text-white'}`}
              >
                <ShoppingBag size={18} /> Purchased ({songs.length})
              </button>
              <button 
                onClick={() => setActiveTab('likes')}
                className={`flex items-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'likes' ? 'text-smash-orange' : 'text-smash-gray hover:text-white'}`}
              >
                <Heart size={18} /> Liked Tracks
              </button>
              <button 
                onClick={() => setActiveTab('downloads')}
                className={`flex items-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'downloads' ? 'text-smash-orange' : 'text-smash-gray hover:text-white'}`}
              >
                <Download size={18} /> Downloads
              </button>
              <button 
                onClick={() => setActiveTab('playlists')}
                className={`flex items-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'playlists' ? 'text-smash-orange' : 'text-smash-gray hover:text-white'}`}
              >
                <Music2 size={18} /> Playlists
              </button>
           </div>
        </div>

        <div className="relative w-full md:w-80 group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-smash-gray group-focus-within:text-smash-orange transition-colors" size={20} />
           <input 
             type="text" 
             placeholder="Search library..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-white/5 border border-white/10 rounded-[24px] pl-14 pr-6 py-4 text-sm font-medium outline-none focus:border-smash-orange transition-all"
           />
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-0 right-0 -translate-y-1/2 opacity-10 pointer-events-none">
           <Disc size={300} strokeWidth={0.5} className="animate-spin-slow" />
        </div>

        {loading ? (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="aspect-square bg-white/5 rounded-[24px] animate-pulse" />
             ))}
           </div>
        ) : activeTab === 'playlists' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
               <motion.div 
                 whileHover={{ y: -5 }}
                 onClick={() => {
                   if (playlists.length >= limits.maxPlaylists) {
                     toast.error(`Free tier allows up to ${limits.maxPlaylists} playlists. Upgrade to Premium for unlimited playlists.`);
                     return;
                   }
                   setShowCreatePlaylist(true);
                 }}
                 className="aspect-square bg-white/5 border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-smash-orange transition-all group relative"
               >
                  <Plus size={40} className="text-white/20 group-hover:text-smash-orange transition-colors" />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">Create New</p>
                  {playlists.length >= limits.maxPlaylists && (
                     <div className="absolute top-4 right-4 text-smash-red"><AppLockIcon size={16} /></div>
                  )}
               </motion.div>

               {playlists.map(pl => (
                 <motion.div 
                   key={pl.id}
                   whileHover={{ y: -5 }}
                   className="flex flex-col gap-3 group cursor-pointer"
                 >
                    <div className="aspect-square bg-smash-dark rounded-[32px] overflow-hidden border border-white/5 relative shadow-xl">
                       <div className="grid grid-cols-2 h-full w-full opacity-40">
                          {pl.playlist_songs?.slice(0, 4).map((ps: any, i: number) => (
                             <img key={i} src={ps.songs?.cover_url} className="w-full h-full object-cover" />
                          ))}
                       </div>
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                       <div className="absolute bottom-4 left-4 p-2 bg-white/10 backdrop-blur-md rounded-lg">
                          <Music2 size={16} />
                       </div>
                    </div>
                    <div>
                       <h4 className="font-display font-black italic uppercase text-lg truncate tracking-tight">{pl.name}</h4>
                       <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">{pl.playlist_songs?.length || 0} Tracks</p>
                    </div>
                 </motion.div>
               ))}
            </div>

            {showCreatePlaylist && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                 <motion.div 
                   initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                   className="bg-smash-dark border border-white/10 p-8 rounded-[40px] max-w-md w-full shadow-2xl"
                 >
                    <h3 className="text-3xl font-black font-display italic uppercase mb-6">NEW PLAYLIST</h3>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="My Summer Mix 24"
                      value={newPlaylistName}
                      onChange={e => setNewPlaylistName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold mb-6 focus:border-smash-orange outline-none"
                    />
                    <div className="flex gap-4">
                       <button onClick={() => setShowCreatePlaylist(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-smash-gray">Cancel</button>
                       <button onClick={createPlaylist} className="flex-1 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-smash-orange hover:text-white transition-all">Create</button>
                    </div>
                 </motion.div>
              </div>
            )}
          </div>
        ) : filteredSongs.length > 0 ? (
           <div className="space-y-4">
              {filteredSongs.map((song, i) => (
                 <SongCard key={`library-${song.id}-${i}`} song={song} queue={filteredSongs} variant="list" />
              ))}
           </div>
        ) : (
           <div className="bento-card p-20 text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                 {activeTab === 'purchased' ? <ShoppingBag size={40} className="text-smash-gray" /> : <Heart size={40} className="text-smash-gray" />}
              </div>
              <div className="space-y-2">
                 <h3 className="text-3xl font-black font-display italic uppercase tracking-tighter">Nothing Here Yet</h3>
                 <p className="text-smash-gray font-medium max-w-sm mx-auto">
                    {activeTab === 'purchased' 
                       ? "You haven't purchased any tracks yet. Support artists and own your favorite slaps!" 
                       : "Save your favorite tracks to access them quickly later."}
                 </p>
              </div>
              <button 
                onClick={() => window.location.href = '/discover'}
                className="px-8 py-4 bg-white text-smash-black rounded-full font-black uppercase tracking-widest text-xs hover:bg-smash-orange hover:text-white transition-all shadow-xl"
              >
                Go Exploring
              </button>
           </div>
        )}
      </div>

      {/* Suggested for You Column (Only if space allows or at bottom) */}
      <div className="pt-20 border-t border-white/5 p-8 bg-gradient-to-r from-smash-orange/5 to-transparent rounded-[40px]">
         <div className="flex items-center gap-4 mb-8">
            <PlayCircle className="text-smash-orange" size={28} />
            <h2 className="text-2xl font-black font-display italic uppercase tracking-tighter">Quick Play Suggestions</h2>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
               <div className="w-14 h-14 rounded-xl bg-smash-orange flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Clock size={24} fill="white" />
               </div>
               <div>
                  <h4 className="font-display font-black italic uppercase text-lg leading-none mb-1">Recently Played</h4>
                  <p className="text-[10px] text-smash-gray font-black uppercase tracking-widest">Jump back in</p>
               </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group" onClick={() => setActiveTab('playlists')}>
               <div className="w-14 h-14 rounded-xl bg-smash-purple flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Music2 size={24} fill="white" />
               </div>
               <div>
                  <h4 className="font-display font-black italic uppercase text-lg leading-none mb-1">Playlists</h4>
                  <p className="text-[10px] text-smash-gray font-black uppercase tracking-widest">Collections you love</p>
               </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
               <div className="w-14 h-14 rounded-xl bg-smash-gray flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Info size={24} fill="white" />
               </div>
               <div>
                  <h4 className="font-display font-black italic uppercase text-lg leading-none mb-1">Library Help</h4>
                  <p className="text-[10px] text-smash-gray font-black uppercase tracking-widest">Learn how to manage</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Library;
