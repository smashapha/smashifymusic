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
          .from('fan_purchases')
          .select('*, songs(*, profiles!artist_id(full_name, stage_name))')
          .eq('fan_id', userProfile?.id)
          .order('purchased_at', { ascending: false });

        if (pError) throw pError;

        const formatted = (purchases || []).map((p: any) => ({
          ...p.songs,
          id: p.song_id,
          artist_name: p.songs?.profiles?.stage_name || p.songs?.profiles?.full_name || 'Artist',
          cover_url: p.songs?.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
          url: p.songs?.audio_url,
          purchased_at: p.purchased_at,
          is_purchased: true,
          is_for_sale: false,
        }));
        setSongs(formatted as any);
      } else if (activeTab === 'likes') {
        const { data: likes, error: lError } = await supabase
          .from('likes')
          .select('*, songs(*, profiles!artist_id(full_name, stage_name))')
          .eq('profile_id', userProfile?.id);

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
          .eq('profile_id', userProfile?.id);
        
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
        profile_id: userProfile?.id,
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
              <h1 className="text-[28px] font-studio font-bold uppercase tracking-tight text-text-primary">Your Collection</h1>
              <p className="max-w-md text-smash-gray font-medium">Elevate your experience. Sign in to access your purchased beats and favorite slaps.</p>
           </div>
           <button onClick={() => window.location.href = '/auth'} className="px-12 py-5 bg-smash-orange text-white rounded-full font-black uppercase tracking-widest text-sm shadow-xl shadow-smash-orange/20 hover:scale-105 transition-all">
              Sign In To Access
           </button>
        </div>
     );
  }

  return (
    <div className="space-y-8 md:space-y-12 pb-24 px-4 md:px-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
        <div className="space-y-4 md:space-y-6">
           <h1 className="text-[32px] md:text-[64px] font-studio font-black uppercase tracking-tighter leading-none text-text-primary">
             YOUR <span className="text-smash-orange">LIBRARY</span>
           </h1>
           {/* Horizontally Scrollable Tabs */}
           <div className="flex items-center gap-5 md:gap-6 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:-mx-0 md:px-0">
              <button 
                onClick={() => setActiveTab('purchased')}
                className={`flex items-center gap-2 md:gap-3 text-[10px] md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${activeTab === 'purchased' ? 'text-smash-orange' : 'text-smash-gray hover:text-white'}`}
              >
                <ShoppingBag size={16} className="md:w-[18px] md:h-[18px]" /> Purchased ({songs.length})
              </button>
              <button 
                onClick={() => setActiveTab('likes')}
                className={`flex items-center gap-2 md:gap-3 text-[10px] md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${activeTab === 'likes' ? 'text-smash-orange' : 'text-smash-gray hover:text-white'}`}
              >
                <Heart size={16} className="md:w-[18px] md:h-[18px]" /> Liked
              </button>
              <button 
                onClick={() => setActiveTab('downloads')}
                className={`flex items-center gap-2 md:gap-3 text-[10px] md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${activeTab === 'downloads' ? 'text-smash-orange' : 'text-smash-gray hover:text-white'}`}
              >
                <Download size={16} className="md:w-[18px] md:h-[18px]" /> Offline
              </button>
              <button 
                onClick={() => setActiveTab('playlists')}
                className={`flex items-center gap-2 md:gap-3 text-[10px] md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${activeTab === 'playlists' ? 'text-smash-orange' : 'text-smash-gray hover:text-white'}`}
              >
                <Music2 size={16} className="md:w-[18px] md:h-[18px]" /> Playlists
              </button>
           </div>
        </div>

        <div className="relative w-full md:w-80 group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-smash-gray group-focus-within:text-smash-orange transition-colors" size={18} />
           <input 
             type="text" 
             placeholder="Find in library..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-white/5 border border-white/10 rounded-full md:rounded-[24px] pl-14 pr-6 py-3 md:py-4 text-xs md:text-sm font-medium outline-none focus:border-smash-orange transition-all"
           />
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-0 right-0 -translate-y-1/2 opacity-10 pointer-events-none hidden md:block">
           <Disc size={300} strokeWidth={0.5} className="animate-spin-slow" />
        </div>

        {loading ? (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="aspect-square bg-white/5 rounded-[20px] md:rounded-[24px] animate-pulse" />
             ))}
           </div>
        ) : activeTab === 'playlists' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
               <motion.div 
                 whileHover={{ y: -5 }}
                 onClick={() => {
                   if (playlists.length >= limits.maxPlaylists) {
                     toast.error(`Free tier allows up to ${limits.maxPlaylists} playlists. Upgrade to Premium for units.`);
                     return;
                   }
                   setShowCreatePlaylist(true);
                 }}
                 className="aspect-square bg-white/5 border-2 border-dashed border-white/10 rounded-[24px] md:rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-smash-orange transition-all group relative"
               >
                  <Plus size={32} className="text-white/20 group-hover:text-smash-orange transition-colors md:w-10 md:h-10" />
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-3 md:mt-4">Create New</p>
                  {playlists.length >= limits.maxPlaylists && (
                     <div className="absolute top-3 right-3 md:top-4 md:right-4 text-smash-red"><AppLockIcon size={14} className="md:w-4 md:h-4" /></div>
                  )}
               </motion.div>

               {playlists.map(pl => (
                 <motion.div 
                   key={pl.id}
                   whileHover={{ y: -5 }}
                   className="flex flex-col gap-2 md:gap-3 group cursor-pointer"
                 >
                    <div className="aspect-square bg-smash-dark rounded-[24px] md:rounded-[32px] overflow-hidden border border-white/5 relative shadow-lg md:shadow-xl">
                       <div className="grid grid-cols-2 h-full w-full opacity-40">
                          {pl.playlist_songs?.slice(0, 4).map((ps: any, i: number) => (
                             <img key={i} src={ps.songs?.cover_url} className="w-full h-full object-cover" />
                          ))}
                       </div>
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                       <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 p-2 bg-white/10 backdrop-blur-md rounded-lg">
                          <Music2 size={14} className="md:w-4 md:h-4" />
                       </div>
                    </div>
                    <div>
                       <h4 className="font-studio font-bold uppercase text-sm md:text-[18px] truncate tracking-tight text-white">{pl.name}</h4>
                       <p className="text-[8px] md:text-[10px] font-black text-smash-gray uppercase tracking-widest">{pl.playlist_songs?.length || 0} Tracks</p>
                    </div>
                 </motion.div>
               ))}
            </div>

            {showCreatePlaylist && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                 <motion.div 
                   initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                   className="bg-smash-dark border border-white/10 p-6 md:p-8 rounded-[32px] md:rounded-[40px] max-w-md w-full shadow-2xl"
                 >
                    <h3 className="text-xl md:text-[24px] font-studio font-bold uppercase tracking-tight text-text-primary mb-5 md:mb-6">NEW PLAYLIST</h3>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="My Summer Mix 24"
                      value={newPlaylistName}
                      onChange={e => setNewPlaylistName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl font-bold mb-5 md:mb-6 focus:border-smash-orange outline-none text-sm"
                    />
                    <div className="flex gap-3 md:gap-4">
                       <button onClick={() => setShowCreatePlaylist(false)} className="flex-1 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-smash-gray">Cancel</button>
                       <button onClick={createPlaylist} className="flex-1 py-3 md:py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] md:text-xs rounded-xl md:rounded-2xl hover:bg-smash-orange hover:text-white transition-all">Create</button>
                    </div>
                 </motion.div>
              </div>
            )}
          </div>
        ) : filteredSongs.length > 0 ? (
           <div className="space-y-3 md:space-y-4">
              {filteredSongs.map((song, i) => (
                 <SongCard key={`library-${song.id}-${i}`} song={song} queue={filteredSongs} />
              ))}
           </div>
        ) : (
           <div className="bento-card p-12 md:p-20 text-center space-y-5 md:space-y-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 border border-white/10">
                 {activeTab === 'purchased' ? <ShoppingBag size={32} className="text-smash-gray md:w-10 md:h-10" /> : <Heart size={32} className="text-smash-gray md:w-10 md:h-10" />}
              </div>
              <div className="space-y-2">
                 <h3 className="text-xl md:text-[24px] font-studio font-bold uppercase tracking-tight text-text-primary">Nothing Here Yet</h3>
                 <p className="text-smash-gray text-xs md:text-base font-medium max-w-sm mx-auto">
                    {activeTab === 'purchased' 
                       ? "You haven't purchased any tracks yet. Support artists and own your favorite slaps!" 
                       : "Save your favorite tracks to access them quickly later."}
                 </p>
              </div>
              <button 
                onClick={() => window.location.href = '/discover'}
                className="px-6 py-3 md:px-8 md:py-4 bg-white text-smash-black rounded-full font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-smash-orange hover:text-white transition-all shadow-xl"
              >
                Go Exploring
              </button>
           </div>
        )}
      </div>

      {/* Suggested for You Column (Only if space allows or at bottom) */}
      <div className="pt-12 md:pt-20 border-t border-white/5 p-6 md:p-8 bg-gradient-to-r from-smash-orange/5 to-transparent rounded-[32px] md:rounded-[40px]">
         <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <PlayCircle className="text-smash-orange w-6 h-6 md:w-7 md:h-7" />
            <h2 className="text-lg md:text-[22px] font-studio font-bold uppercase tracking-tight text-text-primary">Quick Play</h2>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="flex items-center gap-3 md:gap-4 bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
               <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-smash-orange flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Clock size={20} fill="white" className="md:w-6 md:h-6" />
               </div>
               <div>
                  <h4 className="font-studio font-bold uppercase text-sm md:text-[16px] leading-none mb-1 text-white">Recently Played</h4>
                  <p className="text-[8px] md:text-[10px] text-smash-gray font-black uppercase tracking-widest leading-none">Jump back in</p>
               </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4 bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group" onClick={() => setActiveTab('playlists')}>
               <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-smash-purple flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Music2 size={20} fill="white" className="md:w-6 md:h-6" />
               </div>
               <div>
                  <h4 className="font-studio font-bold uppercase text-sm md:text-[16px] leading-none mb-1 text-white">Playlists</h4>
                  <p className="text-[8px] md:text-[10px] text-smash-gray font-black uppercase tracking-widest leading-none">Collections you love</p>
               </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4 bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
               <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-smash-gray flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Info size={20} fill="white" className="md:w-6 md:h-6" />
               </div>
               <div>
                  <h4 className="font-studio font-bold uppercase text-sm md:text-[16px] leading-none mb-1 text-white">Library Help</h4>
                  <p className="text-[8px] md:text-[10px] text-smash-gray font-black uppercase tracking-widest leading-none">Learn to manage</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Library;
