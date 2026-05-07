import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, Music2, Upload, Wallet, UserCircle, Settings, 
  TrendingUp, Users, Play, DollarSign, Plus, Trash2, 
  Edit3, CheckCircle2, AlertCircle, Sparkles, ChevronRight,
  Smartphone, Image as ImageIcon, FileAudio, Info, Flame
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Song, Artist, Transaction } from '../types';

type TabType = 'overview' | 'music' | 'upload' | 'analytics' | 'wallet' | 'profile' | 'subscription' | 'settings';

const ArtistHub: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState({ streams: 0, revenue: 0, followers: 0, songs: 0 });
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.id) fetchData();
  }, [userProfile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!userProfile?.id) return;
      
      // Fetch songs
      const { data: songsData } = await supabase
        .from('songs')
        .select('*')
        .eq('artist_id', userProfile.id)
        .order('created_at', { ascending: false });
      
      setSongs(songsData || []);

      // Fetch followers count
      const { count: followersCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', userProfile.id);
      
      let totalStreams = 0;
      let totalRevenue = 0;
      
      if (songsData) {
         songsData.forEach((s: any) => {
            totalStreams += s.plays || 0;
            totalRevenue += s.revenue || 0;
         });
      }

      setStats({
        streams: totalStreams,
        revenue: totalRevenue,
        followers: followersCount || 0, 
        songs: songsData?.length || 0
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'music', label: 'My Music', icon: Music2 },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'wallet', label: 'Earnings', icon: Wallet },
    { id: 'profile', label: 'Edit Profile', icon: UserCircle },
    { id: 'subscription', label: 'Subscription', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-smash-black flex flex-col md:flex-row pb-24 md:pb-0">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-smash-dark/50 border-r border-white/5 p-6 md:p-8 flex flex-col gap-10">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-smash-orange flex items-center justify-center text-white shadow-lg">
               <Music2 size={28} />
            </div>
            <div>
               <h2 className="font-display font-black text-xl italic uppercase tracking-tighter">ARTIST<br/><span className="text-smash-orange">STUDIO</span></h2>
            </div>
         </div>

         <nav className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar">
            {navItems.map((item) => (
               <button
                 key={item.id}
                 onClick={() => setActiveTab(item.id)}
                 className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all min-w-max md:min-w-0 ${activeTab === item.id ? 'bg-smash-orange text-white shadow-xl shadow-smash-orange/20' : 'text-smash-gray hover:text-white hover:bg-white/5'}`}
               >
                 <item.icon size={20} />
                 <span className="hidden md:inline">{item.label}</span>
               </button>
            ))}
         </nav>

         <div className="mt-auto hidden md:block">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 text-center">
               <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest mb-2">Current Plan</p>
               <p className="text-sm font-black text-white uppercase italic mb-4">{userProfile?.subscription_tier || 'Free Artist'}</p>
               <button onClick={() => setActiveTab('subscription')} className="text-[10px] font-black text-smash-orange uppercase tracking-widest hover:text-white transition-colors">Upgrade Plan →</button>
            </div>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
         <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
               {activeTab === 'overview' && <OverviewTab stats={stats} userProfile={userProfile} />}
               {activeTab === 'music' && <MusicTab songs={songs} onRefresh={fetchData} />}
               {activeTab === 'upload' && <UploadTab onComplete={fetchData} />}
               {activeTab === 'wallet' && <WalletTab balance={userProfile?.wallet_balance || 0} userProfile={userProfile} />}
               {activeTab === 'profile' && <ProfileTab userProfile={userProfile} />}
               {activeTab === 'subscription' && <SubscriptionTab />}
               {activeTab === 'analytics' && <AnalyticsTab />}
               {activeTab === 'settings' && <SettingsTab />}
            </motion.div>
         </AnimatePresence>
      </main>
    </div>
  );
};

const OverviewTab = ({ stats, userProfile }: any) => (
  <div className="space-y-12">
     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h1 className="text-4xl md:text-6xl font-black font-display italic uppercase tracking-tighter leading-none mb-2">
              Good morning, <span className="text-smash-orange">{userProfile?.full_name?.split(' ')[0] || 'Artist'}</span>
           </h1>
           <p className="text-smash-gray text-lg font-medium tracking-tight">Here's how your music is performing today.</p>
        </div>
        <div className="flex gap-4">
           <button className="px-6 py-3 bg-white text-smash-black rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-smash-orange hover:text-white transition-all">Quick Payout</button>
        </div>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Total Streams" value={stats.streams} icon={<Play size={20} />} trend={stats.streams > 0 ? "+0%" : null} />
        <MetricCard label="Total Revenue" value={`MK ${stats.revenue.toLocaleString()}`} icon={<DollarSign size={20} />} trend={stats.revenue > 0 ? "+0%" : null} color="text-smash-green" />
        <MetricCard label="Followers" value={stats.followers} icon={<Users size={20} />} trend={stats.followers > 0 ? "+0%" : null} />
        <MetricCard label="Songs Uploaded" value={stats.songs} icon={<Music2 size={20} />} />
     </div>

     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="bento-card p-12 text-center items-center flex flex-col justify-center h-80">
              <BarChart3 size={48} className="text-smash-gray/30 mb-6" />
              <h3 className="text-xl font-black font-display italic uppercase mb-2">No Streaming Data Yet</h3>
              <p className="text-smash-gray font-bold text-sm max-w-sm mx-auto">Upload more songs and share your profile to start seeing streaming growth charts.</p>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bento-card p-8 bg-gradient-to-br from-smash-purple/20 to-smash-black border-smash-purple/20">
              <h3 className="text-xl font-black font-display italic uppercase mb-4 flex items-center gap-3">
                 <Sparkles className="text-smash-purple" /> Growth Insight
              </h3>
              <p className="text-white/80 font-medium leading-relaxed mb-8 italic">Share your tracks directly to WhatsApp to get your first listeners.</p>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                 <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mb-2">Pro Tip</p>
                 <p className="text-sm font-bold text-white leading-relaxed">Artists with 10+ songs get 4x more engagement. Upload a new track this week.</p>
              </div>
           </div>
        </div>
     </div>
  </div>
);

const MetricCard = ({ label, value, icon, trend, color = 'text-white' }: any) => (
  <div className="bento-card p-8 group hover:bg-white/5 transition-all">
     <div className="flex items-center justify-between mb-6">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-smash-gray group-hover:text-smash-orange transition-colors">
           {icon}
        </div>
        {trend && <span className="text-[10px] font-black text-smash-green bg-smash-green/10 px-3 py-1 rounded-full uppercase tracking-widest italic">{trend}</span>}
     </div>
     <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest mb-1">{label}</p>
     <p className={`text-4xl font-black font-display italic tracking-tight uppercase leading-none ${color}`}>{value}</p>
  </div>
);

const CityStat = ({ name, percent, color }: any) => (
  <div className="space-y-2">
     <div className="flex justify-between text-xs font-black uppercase tracking-widest">
        <span>{name}</span>
        <span className="text-smash-gray">{percent}%</span>
     </div>
     <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className={`h-full ${color}`} />
     </div>
  </div>
);

const MusicTab = ({ songs, onRefresh }: { songs: Song[], onRefresh: () => void }) => {
   const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to delete this track?')) return;
      const { error } = await supabase.from('songs').delete().eq('id', id);
      if (error) alert(error.message);
      else onRefresh();
   };

   return (
      <div className="space-y-12">
         <div className="flex justify-between items-center">
            <h1 className="text-5xl font-black font-display italic uppercase tracking-tighter">MY <span className="text-smash-orange">MUSIC</span></h1>
            <div className="flex gap-4">
               <div className="relative">
                  <select className="h-12 bg-white/5 border border-white/10 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:border-smash-orange cursor-pointer">
                     <option>All Genres</option>
                  </select>
               </div>
            </div>
         </div>

         {songs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
               {songs.map((song, i) => (
                  <div key={song.id} className="bento-card p-4 flex items-center justify-between gap-6 hover:bg-white/5">
                     <div className="flex items-center gap-6 flex-1 min-w-0">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                           <img src={song.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop"} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="min-w-0">
                           <h4 className="text-xl font-black font-display italic uppercase tracking-tight truncate leading-none mb-1">{song.title}</h4>
                           <p className="text-[10px] font-black text-smash-gray uppercase tracking-[0.2em]">{song.genre || 'Various'} • {song.duration || '3:30'}</p>
                        </div>
                     </div>

                     <div className="hidden md:flex items-center gap-12 text-center">
                        <div>
                           <p className="text-xs font-black uppercase text-smash-gray mb-1 tracking-widest">Price</p>
                           <p className="text-lg font-black font-display italic">MK {song.price?.toLocaleString() || 'Free'}</p>
                        </div>
                        <div>
                           <p className="text-xs font-black uppercase text-smash-gray mb-1 tracking-widest">Plays</p>
                           <p className="text-lg font-black font-display italic">{song.plays || 0}</p>
                        </div>
                        <div>
                           <p className="text-xs font-black uppercase text-smash-gray mb-1 tracking-widest">Status</p>
                           <span className={`px-3 py-1 ${song.approved ? 'bg-smash-green' : 'bg-smash-orange'} text-black text-[8px] font-black rounded-full uppercase tracking-widest`}>
                              {song.approved ? 'Live' : 'Pending'}
                           </span>
                        </div>
                     </div>

                     <div className="flex items-center gap-2">
                        <button className="p-3 bg-white/5 rounded-2xl text-smash-gray hover:text-white transition-all"><Edit3 size={18} /></button>
                        <button onClick={() => handleDelete(song.id)} className="p-3 bg-white/5 rounded-2xl text-smash-red/60 hover:text-smash-red hover:bg-smash-red/10 transition-all"><Trash2 size={18} /></button>
                     </div>
                  </div>
               ))}
            </div>
         ) : (
            <div className="bento-card p-20 text-center opacity-50 border-dashed">
               <Music2 size={48} className="mx-auto mb-4 text-smash-gray" />
               <p className="font-black uppercase tracking-widest text-xs">No music uploaded yet</p>
            </div>
         )}
      </div>
   );
};

const UploadTab = () => {
   const [uploadMode, setUploadMode] = useState<'single' | 'album' | 'snippet'>('single');
   const [progress, setProgress] = useState(0);
   const [step, setStep] = useState(1);
   
   // Form state
   const [tracks, setTracks] = useState([{ id: 1, title: '', file: null as File | null }]);

   const addTrack = () => setTracks([...tracks, { id: tracks.length + 1, title: '', file: null }]);
   const removeTrack = (id: number) => setTracks(tracks.filter(t => t.id !== id));

   const handleUpload = () => {
      // In a production environment, you would use Supabase Storage 
      // to upload files and then save the URLs in the 'songs' table.
      let interval = setInterval(() => {
         setProgress(prev => {
            if (prev >= 100) {
               clearInterval(interval);
               setStep(3);
               return 100;
            }
            return prev + 5;
         });
      }, 100);
   };

   return (
      <div className="max-w-4xl mx-auto space-y-12">
         <div className="text-center">
            <h1 className="text-5xl font-black font-display italic uppercase tracking-tighter mb-4">RELEASE <span className="text-smash-orange">MOTO</span></h1>
            <p className="text-smash-gray text-lg font-medium tracking-tight">Your music deserves the spotlight. Let's make it official.</p>
         </div>

         <div className="flex p-2 bg-smash-dark rounded-3xl border border-white/5 w-fit mx-auto mb-12 flex-wrap justify-center gap-2">
            <button onClick={() => setUploadMode('single')} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest-xl transition-all ${uploadMode === 'single' ? 'bg-white text-smash-black' : 'text-smash-gray hover:text-white'}`}>Single Song</button>
            <button onClick={() => setUploadMode('album')} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest-xl transition-all ${uploadMode === 'album' ? 'bg-white text-smash-black' : 'text-smash-gray hover:text-white'}`}>Full Album</button>
            <button onClick={() => setUploadMode('snippet')} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest-xl transition-all ${uploadMode === 'snippet' ? 'bg-smash-orange text-white shadow-lg shadow-smash-orange/20' : 'text-smash-gray hover:text-white'} flex items-center gap-2`}>
               <Flame size={16} className={uploadMode === 'snippet' ? 'text-white' : 'text-smash-orange'} /> Snippet
            </button>
         </div>

         <div className="bento-card p-12 bg-white/5 border-white/5">
            <AnimatePresence mode="wait">
               {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">{uploadMode === 'album' ? 'Album Title' : 'Title'}</label>
                              <input type="text" placeholder={uploadMode === 'album' ? "e.g. The Malawian Dream" : "e.g. Blantyre Anthem"} className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-5 text-lg font-bold focus:outline-none focus:border-smash-orange transition-all placeholder:text-smash-gray/30" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Genre</label>
                              <select className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-5 text-lg font-bold appearance-none outline-none focus:border-smash-orange transition-all uppercase italic tracking-tighter">
                                 <option>Afropop</option>
                                 <option>Hip Hop</option>
                                 <option>Gospel</option>
                                 <option>Reggae</option>
                                 <option>Dancehall</option>
                              </select>
                           </div>
                           {uploadMode === 'album' && (
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Release Date</label>
                                 <input type="date" className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-5 text-lg font-bold focus:outline-none focus:border-smash-orange transition-all text-white/80" />
                              </div>
                           )}
                           {uploadMode === 'snippet' && (
                              <div className="space-y-4 pt-4">
                                 <label className="flex flex-row items-center gap-4 cursor-pointer">
                                    <input type="checkbox" className="w-6 h-6 rounded bg-smash-dark border-white/10 text-smash-orange focus:ring-smash-orange" defaultChecked />
                                    <div>
                                       <p className="text-sm font-black uppercase tracking-widest italic text-white flex items-center gap-2"><Flame size={16} className="text-smash-orange" /> Unreleased</p>
                                       <p className="text-[10px] text-smash-gray tracking-widest uppercase">Mark this as an unreleased sneak peek.</p>
                                    </div>
                                 </label>
                              </div>
                           )}
                        </div>
                        <div className="space-y-8">
                           {uploadMode !== 'snippet' && (
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">{uploadMode === 'album' ? 'Full Album Price' : 'Is for sale?'}</label>
                                 <div className="flex gap-4">
                                    <input type="number" placeholder="Price (MWK)" className="flex-1 bg-white/5 border border-white/10 rounded-[20px] px-8 py-5 text-lg font-bold focus:outline-none focus:border-smash-orange transition-all placeholder:text-smash-gray/30" />
                                    <div className="w-20 bg-smash-orange/10 border border-smash-orange/20 rounded-[20px] flex items-center justify-center text-smash-orange font-black italic">MWK</div>
                                 </div>
                              </div>
                           )}
                           {(uploadMode === 'single' || uploadMode === 'snippet') && (
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Lyrics (Optional)</label>
                                 <textarea rows={2} placeholder="Write or paste your lyrics here..." className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-5 text-sm font-medium focus:outline-none focus:border-smash-orange transition-all placeholder:text-smash-gray/30 resize-none" />
                              </div>
                           )}
                           {uploadMode === 'snippet' && (
                              <div className="space-y-2">
                                 <div className="flex items-center gap-3 p-4 bg-smash-orange/5 border border-smash-orange/20 rounded-[20px]">
                                    <Info size={24} className="text-smash-orange flex-shrink-0" />
                                    <p className="text-[10px] text-smash-gray font-black uppercase tracking-widest leading-relaxed">Snippets appear in the Moto Feed to build hype. They are limited to 30s-60s max.</p>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>

                     <div className={`grid grid-cols-1 md:grid-cols-2 gap-10`}>
                        <div className="relative group border-2 border-dashed border-white/10 hover:border-smash-orange transition-all rounded-[32px] p-12 text-center bg-white/5">
                           <ImageIcon size={48} className="mx-auto mb-6 text-smash-gray group-hover:text-smash-orange transition-colors" />
                           <h4 className="text-xl font-black font-display italic uppercase mb-2 group-hover:text-white transition-colors">{uploadMode === 'album' ? 'Album Cover Art' : 'Cover Art'}</h4>
                           <p className="text-xs text-smash-gray font-bold tracking-tight">JPG or PNG, max 10MB (Square 1:1 recommended)</p>
                           <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        {uploadMode !== 'album' && (
                           <div className="relative group border-2 border-dashed border-white/10 hover:border-smash-cyan transition-all rounded-[32px] p-12 text-center bg-white/5 overflow-hidden">
                              {uploadMode === 'snippet' ? (
                                 <>
                                    <div className="absolute inset-0 bg-gradient-to-br from-smash-purple/5 to-smash-orange/5" />
                                    <div className="relative">
                                       <FileAudio size={48} className="mx-auto mb-6 text-smash-purple group-hover:text-smash-orange transition-colors" />
                                       <h4 className="text-xl font-black font-display italic uppercase mb-2 group-hover:text-white transition-colors">Audio Snippet</h4>
                                       <p className="text-xs text-smash-gray font-bold tracking-tight">MP3, WAV or FLAC, max 60s</p>
                                    </div>
                                 </>
                              ) : (
                                 <>
                                    <FileAudio size={48} className="mx-auto mb-6 text-smash-gray group-hover:text-smash-cyan transition-colors" />
                                    <h4 className="text-xl font-black font-display italic uppercase mb-2 group-hover:text-white transition-colors">Audio File</h4>
                                    <p className="text-xs text-smash-gray font-bold tracking-tight">MP3, WAV or FLAC, max 50MB</p>
                                 </>
                              )}
                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                           </div>
                        )}
                     </div>

                     {uploadMode === 'album' && (
                        <div className="space-y-6 pt-6 border-t border-white/5">
                           <div className="flex items-center justify-between">
                              <h4 className="text-2xl font-black font-display uppercase italic">Album Tracks</h4>
                              <button onClick={addTrack} className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-xs font-black uppercase tracking-widest transition-colors">
                                 <Plus size={16} /> Add Track
                              </button>
                           </div>
                           <div className="space-y-4">
                              {tracks.map((track, idx) => (
                                 <div key={track.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
                                    <div className="hidden sm:flex w-10 h-10 flex-shrink-0 items-center justify-center bg-black/20 rounded-full font-black text-smash-gray">
                                       {idx + 1}
                                    </div>
                                    <input type="text" placeholder="Track Title" className="flex-1 w-full sm:w-auto bg-transparent border-none text-lg font-bold focus:outline-none placeholder:text-smash-gray/30 px-2" />
                                    <div className="flex w-full sm:w-auto items-center gap-2 justify-between">
                                       <div className="relative overflow-hidden group">
                                          <button className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-smash-cyan/20 text-smash-cyan rounded-full text-xs font-black uppercase tracking-widest transition-colors">
                                             <FileAudio size={16} /> Audio
                                          </button>
                                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                                       </div>
                                       {tracks.length > 1 && (
                                          <button onClick={() => removeTrack(track.id)} className="p-3 text-smash-red hover:bg-smash-red/20 rounded-full transition-colors">
                                             <Trash2 size={18} />
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     <button 
                       onClick={() => { setStep(2); handleUpload(); }}
                       className="w-full py-8 bg-smash-orange text-white rounded-[32px] font-black text-2xl uppercase tracking-widest shadow-2xl shadow-smash-orange/20 hover:scale-[1.02] active:scale-95 transition-all"
                     >
                        START UPLOAD
                     </button>
                  </motion.div>
               )}

               {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center space-y-12">
                     <div className="relative w-40 h-40 mx-auto">
                        <svg className="w-full h-full transform -rotate-90">
                           <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                           <motion.circle 
                              cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" 
                              strokeDasharray="440" strokeDashoffset={440 - (440 * progress) / 100}
                              className="text-smash-orange" 
                           />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                           <span className="text-4xl font-black font-display italic uppercase tracking-tighter">{progress}%</span>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <h3 className="text-3xl font-black font-display italic uppercase">Uploading Anthem...</h3>
                        <p className="text-smash-gray font-bold italic tracking-widest uppercase text-xs">Don't close this tab until we're finished.</p>
                     </div>
                     <div className="max-w-md mx-auto space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-smash-gray px-2">
                           <span>Audio File</span>
                           <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                     </div>
                  </motion.div>
               )}

               {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20 text-center space-y-10">
                     <div className="w-32 h-32 bg-smash-green rounded-full flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(0,214,143,0.3)]">
                        <CheckCircle2 size={64} className="text-black" />
                     </div>
                     <div>
                        <h3 className="text-5xl font-black font-display italic uppercase tracking-tighter leading-none mb-4">MOTO <span className="text-smash-green">UPLOADED!</span></h3>
                        <p className="text-smash-gray text-xl font-medium tracking-tight">Your release is being reviewed and will be live shortly.</p>
                     </div>
                     <div className="flex flex-wrap gap-4 justify-center">
                        <button onClick={() => setStep(1)} className="px-10 py-5 bg-white text-smash-black rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl">Upload More</button>
                        <button onClick={() => setStep(1)} className="px-10 py-5 bg-white/5 border border-white/10 rounded-3xl font-black text-sm uppercase tracking-widest text-smash-gray hover:text-white transition-all">Go to Hub</button>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>
   );
};

const WalletTab = ({ balance, userProfile }: any) => {
   const [amount, setAmount] = useState(5000);
   const [withdrawalLoading, setWithdrawalLoading] = useState(false);
   const [history, setHistory] = useState<any[]>([]);

   useEffect(() => {
     const fetchHistory = async () => {
       const { data } = await supabase
         .from('transactions')
         .select('*')
         .eq('user_id', userProfile?.id)
         .order('created_at', { ascending: false });
       if (data) setHistory(data);
     };
     if (userProfile?.id) fetchHistory();
   }, [userProfile]);

   const handleWithdrawal = async () => {
      if (!userProfile) return;
      if (amount < 5000) {
         alert("Minimum withdrawal is MK 5,000");
         return;
      }
      if (amount > (userProfile.wallet_balance || 0)) {
         alert("Insufficient balance.");
         return;
      }

      setWithdrawalLoading(true);
      try {
         const { error } = await supabase.from('transactions').insert({
            user_id: userProfile.id,
            type: 'withdrawal',
            amount: amount,
            status: 'pending',
            details: { phone: userProfile.phone }
         });

         if (error) throw error;
         
         alert("Withdrawal request sent! Your funds will be processed within 24 hours.");
         // In a real app, we'd also subtract from wallet_balance here or via a DB trigger
      } catch (err) {
         console.error('Withdrawal error:', err);
         alert("Failed to process withdrawal.");
      } finally {
         setWithdrawalLoading(false);
      }
   };
   return (
      <div className="space-y-12">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <h1 className="text-5xl font-black font-display italic uppercase tracking-tighter">EARNINGS & <span className="text-smash-orange">WALLET</span></h1>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
               <div className="bento-card p-12 bg-gradient-to-br from-smash-orange to-smash-red text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[80px] -mr-48 -mt-48 group-hover:scale-110 transition-transform duration-1000" />
                  <div className="relative z-10">
                     <p className="text-xs font-black uppercase tracking-[0.4em] mb-4 opacity-80">Available Balance</p>
                     <p className="text-7xl md:text-8xl font-black font-display italic uppercase tracking-tighter mb-12">MK {balance.toLocaleString()}</p>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total Earned</p>
                           <p className="text-2xl font-black font-display italic mb-1 uppercase tracking-tight">MK {balance.toLocaleString()}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Withdrawn</p>
                           <p className="text-2xl font-black font-display italic mb-1 uppercase tracking-tight">MK 0</p>
                        </div>
                        <div className="hidden md:block">
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Pending</p>
                           <p className="text-2xl font-black font-display italic mb-1 uppercase tracking-tight">MK 0</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bento-card p-8">
                  <h3 className="text-xl font-black font-display italic uppercase mb-8">Payout History</h3>
                  <div className="space-y-4">
                     {history.length > 0 ? history.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-smash-purple/10 text-smash-purple flex items-center justify-center">
                                 <ChevronRight size={24} className="rotate-90 md:rotate-0" />
                              </div>
                              <div>
                                 <p className="font-bold text-sm uppercase tracking-tight italic">{tx.type} Request</p>
                                 <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Oct 12, 2026</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="font-black font-display italic text-lg">-MK {tx.amount.toLocaleString()}</p>
                              <span className={`px-3 py-1 ${tx.status === 'success' ? 'bg-smash-green' : 'bg-smash-orange'} text-black text-[8px] font-black rounded-full uppercase tracking-widest`}>
                                 {tx.status}
                              </span>
                           </div>
                        </div>
                     )) : (
                        <div className="py-12 text-center opacity-30 italic text-xs uppercase font-black tracking-widest">No payout history yet</div>
                     )}
                  </div>
               </div>
            </div>

            <div className="space-y-8">
               <div className="bento-card p-10 space-y-10 border-smash-orange/20 shadow-[0_0_80px_rgba(255,95,0,0.1)]">
                  <div>
                     <h3 className="text-2xl font-black font-display italic uppercase mb-2 leading-none">WITHDRAW <span className="text-smash-orange">FUNDS</span></h3>
                     <p className="text-smash-gray text-xs font-bold tracking-widest uppercase">Direct to Mobile Money</p>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Amount (MWK)</label>
                        <input 
                           type="number" 
                           value={amount}
                           onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                           className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-5 text-2xl font-black font-display italic italic outline-none focus:border-smash-orange transition-all" 
                        />
                        <div className="flex gap-2 pt-2">
                           {[5000, 10000, 25000, 50000].map(v => (
                              <button key={v} onClick={() => setAmount(v)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${amount === v ? 'bg-smash-orange text-white' : 'bg-white/5 text-smash-gray hover:text-white'}`}>MK {v/1000}K</button>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Recipient Phone</label>
                        <input type="text" value={userProfile?.phone || ""} readOnly className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-4 font-bold text-smash-gray opacity-60" />
                     </div>

                     <div className="p-6 rounded-2xl bg-smash-orange/5 border border-smash-orange/10 space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                           <span className="text-smash-gray">Request Amount</span>
                           <span>MK {amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                           <span className="text-smash-gray">Processing Fee (3%)</span>
                           <span className="text-smash-red">-MK {(amount * 0.03).toLocaleString()}</span>
                        </div>
                        <div className="border-t border-white/5 pt-3 flex justify-between text-xs font-black uppercase tracking-widest">
                           <span className="text-white">You'll Receive</span>
                           <span className="text-smash-green">MK {(amount * 0.97).toLocaleString()}</span>
                        </div>
                     </div>

                     <button 
                        onClick={handleWithdrawal}
                        disabled={withdrawalLoading}
                        className="w-full py-6 bg-smash-orange text-white rounded-[24px] font-black text-xl uppercase tracking-widest shadow-xl shadow-smash-orange/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {withdrawalLoading ? 'PROCESSING...' : 'CONFIRM WITHDRAWAL'}
                     </button>
                  </div>
               </div>

               <div className="bento-card p-8 bg-white/5 flex items-center gap-4 border-white/10">
                  <AlertCircle className="text-smash-orange flex-shrink-0" />
                  <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest leading-relaxed">Minimum payout is <span className="text-white">MK 5,000</span>. Withdrawals are processed 24/7 via PayChangu.</p>
               </div>
            </div>
         </div>
      </div>
   );
};

// ... other tabs (profile, subscription, etc.) implemented similarly ...

const AnalyticsTab = () => (
   <div className="py-20 text-center opacity-40">
      <h2 className="text-6xl font-black font-display italic uppercase mb-4 tracking-tighter">FULL ANALYTICS</h2>
      <p className="text-xl font-bold uppercase tracking-[0.2em]">Crafting your data dashboard... coming soon.</p>
   </div>
);

const SubscriptionTab = () => (
   <div className="space-y-12">
      <h1 className="text-5xl font-black font-display italic uppercase tracking-tighter">CHOOSE YOUR <span className="text-smash-orange">POWER TIER</span></h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <ArtistPlanCard title="Free Artist" price="0" features={["3 Songs Limit", "Basic Profile", "Accept Donations", "Basic Analytics"]} />
         <ArtistPlanCard title="Rising Star" price="15,000" features={["10 Songs/mo", "Earnings Dashboard", "Album Creation", "Accept Donations", "Song Sales"]} />
         <ArtistPlanCard title="Standard" price="25,000" badge="RECOMMENDED" features={["Unlimited Songs", "Full Analytics", "Priority Approval", "Featured Placement", "Fan Messaging"]} />
         <ArtistPlanCard title="Elite/Label" price="45,000" features={["Manage Multiple Artists", "Label Branding", "Dedicated Manager", "Verified Priority", "Custom Profile URL"]} />
      </div>
   </div>
);

const ArtistPlanCard = ({ title, price, features, badge }: any) => (
   <div className={`bento-card p-8 bg-white/5 border-white/5 flex flex-col relative overflow-hidden group hover:border-smash-orange/30 transition-all ${badge ? 'ring-2 ring-smash-orange' : ''}`}>
      {badge && <div className="absolute top-4 right-0 bg-smash-orange text-white text-[8px] font-black px-3 py-1.5 rounded-l-full uppercase tracking-widest shadow-lg">{badge}</div>}
      <h4 className="text-lg font-black font-display italic uppercase mb-2 tracking-tight">{title}</h4>
      <div className="flex items-baseline gap-1 mb-8">
         <p className="text-sm font-black text-smash-gray uppercase tracking-widest leading-none">MK</p>
         <p className="text-4xl font-black font-display italic">{price}</p>
         <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-1">/yr</p>
      </div>
      <ul className="space-y-3 mb-10 flex-1">
         {features.map((f: string, i: number) => (
            <li key={i} className="flex gap-2 text-[10px] font-black text-smash-gray uppercase tracking-widest leading-relaxed">
               <CheckCircle2 size={12} className="text-smash-orange flex-shrink-0 mt-0.5" /> {f}
            </li>
         ))}
      </ul>
      <button className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${badge ? 'bg-smash-orange text-white' : 'bg-white text-smash-black hover:bg-smash-orange hover:text-white shadow-xl'}`}>Choose Plan</button>
   </div>
);

const ProfileTab = ({ userProfile }: any) => {
   const { refreshProfile } = useAuth();
   const [saving, setSaving] = useState(false);

   const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSaving(true);
      const formData = new FormData(e.currentTarget);
      const updates = {
         full_name: formData.get('full_name'),
         genre: formData.get('genre'),
         bio: formData.get('bio'),
         instagram: formData.get('instagram'),
         twitter: formData.get('twitter'),
         avatar_url: formData.get('avatar_url')
      };

      try {
         const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userProfile?.id);
         
         if (error) throw error;
         
         alert('Profile saved successfully!');
         if(refreshProfile) refreshProfile();
      } catch (err: any) {
         console.error(err);
         alert('Failed to save profile: ' + err.message);
      } finally {
         setSaving(false);
      }
   };

   return (
   <div className="max-w-3xl mx-auto space-y-12 pb-12">
      <div className="text-center">
         <h1 className="text-5xl font-black font-display italic uppercase tracking-tighter">EDIT <span className="text-smash-orange">PROFILE</span></h1>
      </div>

      <form onSubmit={handleSave} className="bento-card p-12 bg-white/5 space-y-12">
         <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="relative group">
               <div className="w-40 h-40 rounded-full border-4 border-smash-gray/20 overflow-hidden relative group">
                  <img src={userProfile?.avatar_url || "https://i.pravatar.cc/200"} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform" alt="" />
               </div>
               <p className="text-center text-[10px] font-black text-smash-gray uppercase tracking-widest mt-4">Avatar Image</p>
            </div>
            <div className="flex-1 space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Avatar Image URL</label>
                  <input name="avatar_url" type="text" defaultValue={userProfile?.avatar_url || "https://i.pravatar.cc/200"} className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-4 text-sm font-medium outline-none focus:border-smash-orange transition-all" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Stage Name</label>
                  <input name="full_name" type="text" defaultValue={userProfile?.full_name} className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-4 text-xl font-black font-display italic outline-none focus:border-smash-orange transition-all" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Genre</label>
                  <select name="genre" defaultValue={userProfile?.genre || "Afropop"} className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-4 text-xs font-black uppercase tracking-widest outline-none focus:border-smash-orange transition-all italic">
                     <option>Afropop</option>
                     <option>Hip Hop</option>
                     <option>Gospel</option>
                  </select>
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Bio (Limit 500 characters)</label>
               <textarea name="bio" defaultValue={userProfile?.bio} maxLength={500} rows={4} className="w-full bg-white/5 border border-white/10 rounded-[24px] px-8 py-6 text-sm font-medium focus:outline-none focus:border-smash-orange transition-all resize-none" placeholder="Tell your fans who you are..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Instagram URL</label>
                  <input name="instagram" type="text" defaultValue={userProfile?.instagram} placeholder="https://instagram.com/yourhandle" className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-4 text-sm font-medium outline-none focus:border-smash-orange transition-all" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Twitter/X URL</label>
                  <input name="twitter" type="text" defaultValue={userProfile?.twitter} placeholder="https://x.com/yourhandle" className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-4 text-sm font-medium outline-none focus:border-smash-orange transition-all" />
               </div>
            </div>
         </div>

         <button type="submit" disabled={saving} className="w-full py-8 bg-white text-smash-black rounded-[32px] font-black text-2xl uppercase tracking-widest hover:bg-smash-orange hover:text-white transition-all shadow-2xl disabled:opacity-50">
            {saving ? 'SAVING...' : 'SAVE PROFILE'}
         </button>
      </form>
   </div>
   );
};

const SettingsTab = () => (
   <div className="py-20 text-center opacity-40">
      <Settings size={80} className="mx-auto mb-8 animate-spin-slow" />
      <h2 className="text-6xl font-black font-display italic uppercase mb-4 tracking-tighter">APP SETTINGS</h2>
      <p className="text-xl font-bold uppercase tracking-[0.2em]">Under fine-tuning... please wait.</p>
   </div>
);

const Compass = ({ size, className }: any) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
   </svg>
);

export default ArtistHub;
