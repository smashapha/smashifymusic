import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, Music2, Upload, Wallet, UserCircle, Settings, 
  TrendingUp, Users, Play, DollarSign, Plus, Trash2, 
  Edit3, CheckCircle2, AlertCircle, Sparkles, ChevronRight,
  Smartphone, Image as ImageIcon, FileAudio, Info, Flame,
  Disc, LogOut, ArrowLeft, ArrowRight, Menu, Clock, ExternalLink, ShieldCheck,
  ShoppingBag, Heart, Lock as AppLockIcon, X, Bell, Rocket, Star,
  Calendar, Globe2, UserPlus, Info as InfoIcon, UploadCloud
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Song, Album } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getArtistTier, getTierLimits, getSongsUploadedThisMonth } from '../lib/tierUtils';
import { requestPayout, upgradeArtistTier, payForAdCampaign } from '../lib/paychangu';

type TabType = 'dashboard' | 'music' | 'promotion' | 'profile' | 'subscription' | 'notifications';

const NotificationsTab = ({ userProfile }: any) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [userProfile]);

  const fetchNotifications = async () => {
    if (!userProfile?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <h2 className="text-3xl font-studio font-black flex items-center gap-3 uppercase italic"><Bell className="text-smash-purple" /> Notifications</h2>
      
      <div className="bg-white/5 border border-white/5 rounded-[40px] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-smash-gray font-bold uppercase tracking-widest animate-pulse italic">Loading alerts...</div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-white/5">
            {notifications.map(n => (
              <div key={n.id} className={`p-6 flex items-start gap-4 hover:bg-white/5 transition-colors ${!n.read ? 'bg-smash-purple/5' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!n.read ? 'bg-smash-purple text-white' : 'bg-white/5 text-smash-gray'}`}>
                  <Bell size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-sm font-bold ${!n.read ? 'text-white' : 'text-white/60'}`}>{n.message}</p>
                    <span className="text-[10px] text-smash-gray font-bold uppercase tracking-widest">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  {n.link && (
                    <Link to={n.link} className="text-[10px] font-black uppercase tracking-widest text-smash-purple hover:text-white transition-colors">View Details →</Link>
                  )}
                </div>
                {!n.read && (
                  <button onClick={() => markAsRead(n.id)} className="w-2 h-2 rounded-full bg-smash-purple mt-2" title="Mark as read" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center text-smash-gray font-bold uppercase tracking-widest italic opacity-50">No notifications yet.</div>
        )}
      </div>
    </div>
  );
};

export default function ArtistHub() {
  const { userProfile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const isAdmin = userProfile?.is_admin || false;
  const isPending = role === 'pending';
  const songLimit = 3;
  const [songs, setSongs] = useState<Song[]>([]);
  const hasReachedLimit = isPending && songs.length >= songLimit;
  const [stats, setStats] = useState({ streams: 0, revenue: 0, followers: 0, songs: 0 });
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.id) fetchData();
  }, [userProfile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!userProfile?.id) return;
      
      const { data: songsData } = await supabase
        .from('songs')
        .select('*')
        .eq('artist_id', userProfile.id)
        .order('created_at', { ascending: false });
      setSongs(songsData || []);

      const { data: albumsData } = await supabase
        .from('albums')
        .select('*')
        .eq('artist_id', userProfile.id)
        .order('created_at', { ascending: false });
      setAlbums(albumsData || []);

      // Real stats calculation
      const { data: allPlays } = await supabase
        .from('songs')
        .select('plays, price, is_for_sale')
        .eq('artist_id', userProfile.id);
      
      const { count: followersCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', userProfile.id);

      const totalStreams = allPlays?.reduce((acc, s) => acc + (s.plays || 0), 0) || 0;
      
      const { data: totalSales } = await supabase
        .from('purchases')
        .select('amount')
        .in('song_id', songsData?.map(s => s.id) || []);
      
      const totalRevenue = totalSales?.reduce((acc, s) => acc + (s.amount || 0), 0) || 0;

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

  const navGroups = [
    {
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
        { id: 'music', label: 'Music & Upload', icon: Music2 },
        { id: 'promotion', label: 'Promote', icon: Flame },
        { id: 'notifications', label: 'Notifications', icon: Bell },
      ]
    },
    {
      items: [
        { id: 'profile', label: 'Edit Profile', icon: UserCircle },
        { id: 'subscription', label: 'Subscription', icon: Sparkles },
      ]
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getTierLabel = (tier: string) => {
    switch(tier) {
      case 'rising_star': return '🌟 Rising Star';
      case 'standard': return '🚀 Standard';
      case 'elite': return '👑 Elite / Label';
      default: return role === 'pending' ? '⏳ Pending Review' : '🎵 Free Artist';
    }
  };

  const isApproved = userProfile?.approved ?? true; // Temporary fallback to true for UI testing

  const getPageTitle = () => {
    const allItems = navGroups.flatMap(g => g.items);
    const item = allItems.find(i => i.id === activeTab);
    return item ? item.label : 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex overflow-hidden font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-[#111111] border-r border-white/5 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 flex flex-col`}>
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-white/5 gap-3">
          <div className="w-8 h-8 rounded-full bg-smash-purple flex items-center justify-center text-white shadow-lg shadow-smash-purple/20">
            <Disc size={18} />
          </div>
          <div className="leading-tight">
            <h1 className="font-studio font-black text-lg tracking-tight uppercase">Smashify</h1>
            <p className="text-[10px] text-smash-purple uppercase tracking-widest font-black">Artist Studio</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 flex flex-col hide-scrollbar">
          {/* Artist Card */}
          <div className="px-6 mb-6">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5 border border-white/5 transition-all hover:border-smash-purple/30 group">
              <img 
                src={userProfile?.avatar_url || "https://placehold.co/42x42/18162C/9B5DE5?text=♪"} 
                className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-smash-purple/50 transition-colors" 
              />
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{userProfile?.stage_name || userProfile?.full_name || 'Artist'}</p>
                <p className="text-[10px] text-smash-purple uppercase tracking-widest font-bold">{getTierLabel(userProfile?.subscription_tier)}</p>
                {getArtistTier(userProfile) !== 'elite' && (
                  <button
                    onClick={() => { setActiveTab('subscription'); setSidebarOpen(false); }}
                    className="mt-1 w-full text-[9px] font-black uppercase tracking-widest text-smash-purple hover:text-white transition-colors text-left"
                  >
                    ↑ Upgrade plan
                  </button>
                )}
              </div>
            </div>
            
            {/* Wallet Quick View */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-smash-purple/10 to-transparent border border-smash-purple/20 shadow-inner">
              <div className="flex items-center gap-2 text-smash-purple text-[10px] font-bold uppercase tracking-widest mb-1">
                <Wallet size={12} /> Wallet Balance
              </div>
              <div className="text-xl font-studio font-black text-white truncate italic">
                MK {(userProfile?.wallet_balance || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-4 px-3">
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="flex flex-col gap-1 relative">
                {groupIdx > 0 && <div className="h-px bg-white/5 mx-3 mb-3 mt-1" />}
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as TabType); setSidebarOpen(false); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === item.id 
                        ? 'bg-smash-purple/10 text-smash-purple shadow-sm' 
                        : 'text-smash-gray hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={18} className={activeTab === item.id ? 'text-smash-purple' : 'text-smash-gray'} />
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
            
            <div className="h-px bg-white/5 mx-3 mb-3 mt-1" />
            
            {isAdmin && (
              <Link 
                to="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-smash-red hover:text-white hover:bg-smash-red/10 transition-all mb-2 border border-smash-red/20 border-dashed"
              >
                <ShieldCheck size={18} /> Admin Dashboard
              </Link>
            )}

            <Link 
              to={`/artist/${userProfile?.id}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-smash-gray hover:text-smash-purple hover:bg-smash-purple/5 transition-all"
            >
              <ExternalLink size={18} /> My Public Page
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-smash-gray hover:text-smash-red hover:bg-smash-red/5 transition-all text-left"
            >
              <LogOut size={18} /> Log Out
            </button>
          </nav>
        </div>
        
        <div className="p-4 text-center text-[10px] uppercase font-black tracking-widest text-smash-gray border-t border-white/5">
          © {new Date().getFullYear()} Smashify Studio
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/5 bg-[#111111]/80 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 lg:hidden text-smash-gray hover:text-white">
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-studio font-black uppercase italic tracking-tight">{getPageTitle()}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link 
                to="/admin" 
                className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-smash-red/10 text-smash-red border border-smash-red/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-smash-red hover:text-white transition-all shadow-lg shadow-smash-red/10"
              >
                <ShieldCheck size={14} /> Admin Access
              </Link>
            )}
            {isApproved ? (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-smash-green/10 text-smash-green border border-smash-green/20 rounded-full text-xs font-bold uppercase tracking-widest">
                <CheckCircle2 size={12} /> Approved
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-smash-orange/10 text-smash-orange border border-smash-orange/20 rounded-full text-xs font-bold uppercase tracking-widest">
                <Clock size={12} /> Pending
              </div>
            )}
            
            <Link to="/artist-hub" onClick={() => setActiveTab('profile')}>
              <img 
                src={userProfile?.avatar_url || "https://placehold.co/34x34/18162C/9B5DE5?text=♪"} 
                className="w-8 h-8 rounded-full border-2 border-smash-purple object-cover hover:opacity-80 transition-opacity shadow-lg shadow-smash-purple/20"
              />
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto pb-24 md:pb-0">
            {isPending && (
              <div className="mb-6 p-4 bg-smash-orange/10 border border-smash-orange/20 rounded-2xl flex items-start gap-4 text-smash-orange">
                <Clock className="shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold">Your application is under review (24–48 hrs).</p>
                  <p className="text-sm opacity-80 mt-1">
                    You can upload up to {songLimit} songs while you wait. [{Math.min(songs.length, songLimit)}/{songLimit} slots used] — Once approved, upgrade your plan to unlock unlimited uploads.
                  </p>
                </div>
              </div>
            )}
            <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'dashboard' && <DashboardTab stats={stats} balance={userProfile?.wallet_balance || 0} userProfile={userProfile} setActiveTab={setActiveTab} />}
                  {activeTab === 'music' && (
                    <div className="space-y-12">
                      <SongsTab songs={songs} onRefresh={fetchData} setActiveTab={setActiveTab} />
                      <div className="h-px w-full bg-white/5 my-8" />
                      <AlbumsTab albums={albums} songs={songs} onRefresh={fetchData} setActiveTab={setActiveTab} userProfile={userProfile} />
                      <div className="h-px w-full bg-white/5 my-8" />
                      <UploadTab onComplete={fetchData} albums={albums} songs={songs} setActiveTab={setActiveTab} role={role} />
                    </div>
                  )}
                  {activeTab === 'promotion' && <PromotionTab userProfile={userProfile} />}
                  {activeTab === 'profile' && <ProfileTab userProfile={userProfile} />}
                  {activeTab === 'subscription' && <SubscriptionTab userProfile={userProfile} role={role} />}
                  {activeTab === 'notifications' && <NotificationsTab userProfile={userProfile} />}
                </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

const MotoAnalytics = ({ limits }: { limits: any }) => {
  const [stats, setStats] = useState({ plays: 0, completions: 0, likes: 0, skips: 0, revenue: 0 });

  useEffect(() => {
    const fetchA = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: songsData } = await supabase.from('songs').select('id').eq('artist_id', user.id);
      const songIds = songsData?.map(s => s.id) || [];
      
      const { data: snippets } = await supabase.from('moto_feed').select('id').eq('artist_id', user.id);
      const snippetIds = snippets?.map(s => s.id) || [];
      const allIds = [...songIds, ...snippetIds];

      if (allIds.length > 0) {
        const { data: events } = await supabase.from('moto_events').select('*').in('song_id', allIds);
        const { data: revData } = await supabase.from('transactions')
           .select('net_amount')
           .eq('artist_id', user.id)
           .eq('source', 'moto_feed')
           .eq('status', 'success');

        if (events) {
           setStats({
              plays: events.filter(e => e.event_type === 'play').length,
              completions: events.filter(e => e.event_type === 'complete').length,
              likes: events.filter(e => e.event_type === 'like').length,
              skips: events.filter(e => e.event_type === 'skip').length,
              revenue: revData ? revData.reduce((acc, curr) => acc + (Number(curr.net_amount) || 0), 0) : 0
           });
        }
      }
    };
    fetchA();
  }, []);

  const completionRate = stats.plays > 0 ? (stats.completions / stats.plays * 100).toFixed(1) : '0.0';
  const likeRate = stats.plays > 0 ? (stats.likes / stats.plays * 100).toFixed(1) : '0.0';
  const skipRate = stats.plays > 0 ? (stats.skips / stats.plays * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-bg-surface border border-border-default rounded-[14px] overflow-hidden p-6 md:p-8 text-left col-span-1 md:col-span-2 relative mt-4 shadow-sm">
       {!limits.hasFullAnalytics && (
         <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-page/80 backdrop-blur-md px-6 text-center">
           <div className="bg-bg-elevated p-3 rounded-[10px] border border-border-default mb-4 shadow-sm"><AppLockIcon size={24} className="text-smash-purple" /></div>
           <p className="font-display font-semibold text-text-primary uppercase tracking-widest text-[14px] mb-2">Advanced Moto Stats</p>
           <p className="text-text-secondary text-[13px] font-sans">Engagement metrics locked to Standard tier.</p>
         </div>
       )}
       <h3 className="font-studio font-bold uppercase tracking-tight flex items-center gap-3 mb-6 text-[22px] text-text-primary">
           <Flame className="text-smash-orange" /> MotoFeed Performance
       </h3>
       
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Total Plays" value={stats.plays} icon={<Music2 size={16} />} />
          <MetricCard label="Completion" value={`${completionRate}%`} icon={<CheckCircle2 size={16} />} />
          <MetricCard label="Like Rate" value={`${likeRate}%`} icon={<Heart size={16} />} />
          <MetricCard label="Revenue" value={`MK ${stats.revenue.toLocaleString()}`} icon={<Wallet size={16} />} />
       </div>

       {Number(skipRate) > 50 && (
          <div className="bg-smash-red/10 border border-smash-red/20 rounded-[10px] p-5 flex items-start gap-4">
             <AlertCircle className="text-smash-red shrink-0 mt-1" size={24} />
             <div>
                <p className="text-smash-red font-display font-semibold uppercase tracking-widest text-[11px] mb-2">Low Hook Score Warning</p>
                <p className="text-smash-red/80 text-[13px] font-sans leading-relaxed">Your tracks have a skip rate of {skipRate}%. Try uploading snippets with stronger intros or engaging captions to capture listeners in the first 5 seconds.</p>
             </div>
          </div>
       )}
    </div>
  );
};

const DashboardTab = ({ stats, balance, userProfile, setActiveTab }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(0);
  const [requesting, setRequesting] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [network, setNetwork] = useState<'AIRTEL'|'TNM'>('AIRTEL');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const limits = getTierLimits(userProfile);

  useEffect(() => {
    const fetchHist = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('artist_id', userProfile?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setHistory(data);
    };
    fetchHist();
  }, [userProfile]);

  const handleInitiateWithdraw = () => {
    if (balance <= 0) return toast.error('No funds to withdraw.');
    if (withdrawalAmount < 5000) return toast.error('Minimum withdrawal is MK 5,000.');
    if (withdrawalAmount > balance) return toast.error('Amount exceeds available balance.');
    setShowWithdrawForm(true);
  };

  const handleWithdrawConfirm = async () => {
    if (!phone) return toast.error('Please enter a phone number.');
    setRequesting(true);
    try {
      await requestPayout({ amount: withdrawalAmount, phone, network });
      setWithdrawalAmount(0);
      setShowWithdrawForm(false);
      toast.success('Withdrawal request submitted!');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-10 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="flex-1 min-w-0">
           <h2 className="text-[24px] md:text-[32px] font-studio font-bold flex items-center gap-3 uppercase text-text-primary leading-tight"><TrendingUp className="text-smash-purple shrink-0" /> Artist <span className="text-smash-purple">Growth</span></h2>
           <p className="text-text-secondary text-[12px] md:text-[14px] font-sans mt-1 md:mt-2">Real-time performance metrics</p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => setActiveTab('music')} className="h-[44px] px-6 bg-border-default hover:bg-border-subtle text-text-primary rounded-[10px] font-display font-semibold uppercase text-[11px] tracking-widest transition-all inline-flex items-center justify-center">New Upload</button>
           <button onClick={() => setActiveTab('promotion')} className="h-[44px] px-6 bg-smash-purple text-white font-display font-semibold uppercase tracking-widest text-[11px] rounded-[10px] hover:bg-smash-purple/90 transition-all inline-flex items-center justify-center">Promote Track</button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {userProfile?.is_admin && (
           <Link 
             to="/admin" 
             className="col-span-full p-6 bg-gradient-to-r from-smash-red/20 via-smash-purple/20 to-transparent border border-smash-red/30 rounded-[30px] flex items-center justify-between group hover:border-smash-red transition-all shadow-2xl shadow-smash-red/10"
           >
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-2xl bg-smash-red flex items-center justify-center text-white shadow-lg shadow-smash-red/20 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={32} />
                 </div>
                 <div>
                    <h3 className="text-xl font-studio font-black uppercase italic text-white leading-tight">Terminal Control</h3>
                    <p className="text-[10px] text-smash-red font-black uppercase tracking-[0.3em] mt-1">Platform Moderation & Payout Engine</p>
                 </div>
              </div>
              <div className="flex items-center gap-3 pr-4">
                 <span className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-white transition-colors">Enter System</span>
                 <ArrowRight className="text-smash-red group-hover:translate-x-2 transition-transform" />
              </div>
           </Link>
        )}
         <MetricCard
            label="TOTAL PLAYS"
            value={stats.streams.toLocaleString()}
            icon={<Play size={20} />}
            color="text-smash-cyan"
            sub="This is play count only — NOT tied to earnings"
         />
         <MetricCard
            label="THIS MONTH"
            value={`MK ${(stats.revenue || 0).toLocaleString()}`}
            icon={<DollarSign size={20} />}
            color="text-smash-green"
            sub="Tips + Sales + Subscriptions"
         />
         <MetricCard
            label="SUPPORTERS"
            value={(stats.followers || 0).toLocaleString()}
            icon={<Heart size={20} />}
            color="text-smash-purple"
            sub="Active monthly fans"
         />
         <MetricCard
            label="TRACKS"
            value={stats.songs || 0}
            icon={<Music2 size={20} />}
            color="text-white"
            sub="Uploaded"
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Wallet Control */}
         <div className="lg:col-span-2 space-y-8">
            <div className="bg-bg-surface border border-border-default rounded-[14px] p-8 md:p-10 relative overflow-hidden group shadow-sm min-h-[300px]">
               <div className="absolute top-0 right-0 w-64 h-64 bg-smash-purple/10 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="flex-1 text-center md:text-left">
                     <p className="text-[11px] font-display font-medium uppercase tracking-wider text-smash-purple mb-4">Withdrawable Profit</p>
                     <h3 className="text-[clamp(1.8rem,7vw,4.5rem)] font-studio font-bold text-text-primary leading-none">
                        MK {balance.toLocaleString()}
                     </h3>
                     <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
                        <div className="px-3 py-1 bg-smash-green/10 text-smash-green border border-smash-green/20 rounded-full text-[10px] font-display font-semibold uppercase tracking-wider">Payout Valid</div>
                        <div className="px-3 py-1 bg-bg-elevated text-text-muted border border-border-default rounded-full text-[10px] font-display font-semibold uppercase tracking-wider">3% Network Fee</div>
                     </div>
                  </div>
                  <div className="w-full md:w-[300px]">
                     {showWithdrawForm ? (
                       <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
                          <label className="text-[11px] text-text-muted font-display font-medium uppercase tracking-wider block text-left">Select Network</label>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <button onClick={()=>setNetwork('AIRTEL')} className={`p-4 rounded-[10px] border flex flex-col items-center gap-2 transition-all ${network==='AIRTEL' ? 'bg-smash-red/10 border-smash-red text-smash-red' : 'bg-bg-elevated border-border-default text-text-secondary hover:border-text-muted'}`}>
                               <div className="font-display font-bold text-[14px]">AIRTEL</div>
                            </button>
                            <button onClick={()=>setNetwork('TNM')} className={`p-4 rounded-[10px] border flex flex-col items-center gap-2 transition-all ${network==='TNM' ? 'bg-smash-green/10 border-smash-green text-smash-green' : 'bg-bg-elevated border-border-default text-text-secondary hover:border-text-muted'}`}>
                               <div className="font-display font-bold text-[14px]">TNM</div>
                            </button>
                          </div>
                          <div className="text-left">
                            <label className="text-[11px] text-text-muted font-display font-medium uppercase tracking-wider block mb-2">Phone Number</label>
                            <input 
                              value={phone}
                              onChange={e=>setPhone(e.target.value)}
                              placeholder="099..."
                              className="w-full h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 font-display text-[14px] text-text-primary focus:border-smash-purple focus:ring-[3px] focus:ring-smash-purple/15 outline-none transition-all"
                            />
                          </div>
                          <div className="flex gap-3 pt-2">
                             <button onClick={()=>setShowWithdrawForm(false)} className="flex-1 h-[44px] bg-bg-elevated border border-border-default text-text-primary font-display font-semibold uppercase tracking-widest text-[11px] rounded-[10px] hover:bg-border-default transition-colors">Cancel</button>
                             <button onClick={handleWithdrawConfirm} disabled={requesting} className="flex-1 h-[44px] bg-smash-purple text-white font-display font-semibold uppercase tracking-widest text-[11px] rounded-[10px] hover:bg-smash-purple/90 transition-colors">{requesting?'Processing...':'Confirm'}</button>
                          </div>
                       </div>
                     ) : (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                             <div className="relative">
                                <input 
                                   type="number" 
                                   value={withdrawalAmount || ''} 
                                   onChange={e => setWithdrawalAmount(Number(e.target.value))}
                                   placeholder="0"
                                   className="w-full bg-bg-elevated border border-border-default rounded-[14px] px-6 py-4 font-studio font-bold text-[32px] outline-none focus:border-smash-purple focus:border-b-smash-purple focus:bg-bg-elevated transition-all text-text-primary placeholder:text-text-muted text-center"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[12px] font-display font-semibold uppercase tracking-widest text-text-muted">MK</div>
                             </div>
                             <button 
                                onClick={handleInitiateWithdraw} 
                                disabled={!limits.canWithdraw || requesting || balance < 5000 || withdrawalAmount < 5000 || withdrawalAmount > balance}
                                className="w-full h-[48px] bg-smash-purple text-white rounded-[10px] font-display font-semibold uppercase tracking-widest text-[12px] shadow-sm hover:bg-smash-purple/90 transition-all disabled:opacity-50 flex items-center justify-center flex-shrink-0"
                             >
                                REQUEST WITHDRAWAL
                             </button>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            <div className="bg-bg-surface border border-border-default rounded-[14px] p-6 lg:p-8 shadow-sm">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-[20px] font-studio font-bold uppercase tracking-tight text-text-primary">Recent <span className="text-smash-purple">Activity</span></h3>
                  <button className="text-[11px] font-display font-medium uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors">See Ledger &rarr;</button>
               </div>
               <div className="space-y-3">
                  {history.length > 0 ? history.map((t, i) => (
                     <div key={t.id} className="flex items-center gap-5 p-4 md:p-5 bg-bg-elevated rounded-[10px] group transition-colors cursor-default border border-transparent hover:border-border-default hover:bg-bg-elevated/80 h-[60px]">
                        <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 border ${t.type === 'withdrawal' ? 'bg-smash-orange/10 text-smash-orange border-smash-orange/20' : 'bg-smash-green/10 text-smash-green border-smash-green/20'}`}>
                           {t.type === 'withdrawal' ? <Wallet size={16} /> : <DollarSign size={16} />}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                           <p className="font-display font-medium text-[13px] text-text-primary uppercase tracking-wide truncate">{t.type} {t.status === 'pending' && <span className="text-[10px] text-[#eab308] opacity-80 normal-case ml-1 font-sans font-semibold">(Pending)</span>}</p>
                           <p className="text-[11px] text-text-muted font-sans mt-0.5">{new Date(t.created_at).toLocaleString('en-MW', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                        <div className="text-right flex items-center h-full">
                           <p className={`text-[14px] font-sans font-semibold ${t.type === 'withdrawal' ? 'text-smash-orange' : 'text-smash-green'}`}>
                              {t.type === 'withdrawal' ? '-' : '+'}MK {Number(t.net_amount || t.amount || 0).toLocaleString()}
                           </p>
                        </div>
                     </div>
                  )) : (
                     <div className="p-16 text-center text-text-muted/50 font-display font-medium uppercase tracking-widest border border-dashed border-border-default rounded-[10px]">No activity recorded</div>
                  )}
               </div>
            </div>
         </div>

         {/* Analytics Sidebar */}
         <div className="space-y-8">
            <MotoAnalytics limits={limits} />
            
            <div className="bg-bg-surface border border-smash-orange/30 rounded-[14px] p-8 space-y-5 shadow-sm text-center md:text-left">
               <Sparkles className="text-smash-orange mx-auto md:mx-0" size={28} />
               <h3 className="text-[20px] font-studio font-bold uppercase text-text-primary">Premium Access</h3>
               <p className="text-[14px] font-sans text-text-secondary leading-relaxed">"Verified artists receive 15% higher discoverability in MotoFeed algorythms. Complete your profile to qualify."</p>
               <button onClick={() => setActiveTab('subscription')} className="w-full h-[44px] bg-bg-elevated border border-border-default text-text-primary rounded-[10px] font-display font-semibold uppercase tracking-widest text-[11px] hover:bg-border-default transition-all shadow-sm">Upgrade to Elite</button>
            </div>
         </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon, sub, color }: any) => (
  <div className="bg-bg-surface border border-border-default rounded-[14px] p-6 hover:border-smash-purple/50 transition-colors group shadow-sm flex flex-col justify-between">
     <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-[10px] bg-bg-elevated border border-border-default flex items-center justify-center ${color || 'text-text-muted'} group-hover:text-smash-purple transition-colors`}>
           {icon}
        </div>
        <svg className="w-16 h-6 text-smash-purple/10 group-hover:text-smash-purple transition-colors opacity-50 relative top-1" viewBox="0 0 100 25" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M0 25L20 15L40 20L60 5L75 10L100 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
     </div>
     <div className="space-y-1">
        <div className="text-[28px] font-studio font-bold text-text-primary leading-none mb-2">{value}</div>
        <div className="text-[11px] text-text-muted font-display font-medium uppercase tracking-wider">
           {label}
        </div>
        {sub && <div className="text-[11px] text-text-secondary font-sans leading-tight mt-2">{sub}</div>}
     </div>
  </div>
);

const PromotionTab = ({ userProfile }: { userProfile: any }) => {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [advertiserName, setAdvertiserName] = useState(userProfile?.stage_name || '');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [targetCity, setTargetCity] = useState('');
  const [targetGenre, setTargetGenre] = useState('');
  const [playsPurchased, setPlaysPurchased] = useState(1000);

  const pricePerPlay = 5; // 1000 plays = 5000 MK
  const totalCost = playsPurchased * pricePerPlay;

  useEffect(() => {
    fetchAds();
  }, [userProfile]);

  const fetchAds = async () => {
    if (!userProfile?.id) return;
    const { data } = await supabase
      .from('audio_ads')
      .select('*')
      .eq('artist_id', userProfile.id)
      .order('created_at', { ascending: false });
    setAds(data || []);
    setLoading(false);
  };

  const handleCreateAds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) return toast.error('Please upload an audio ad file.');
    
    setUploading(true);
    const toastId = toast.loading('Preparing your campaign...');

    try {
      // 1. Upload Audio to audio-ads bucket
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `${userProfile.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('audio-ads')
        .upload(fileName, audioFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-ads')
        .getPublicUrl(fileName);

      // 2. Clear toast before redirecting
      toast.dismiss(toastId);

      // 3. Initiate PayChangu Payment
      await payForAdCampaign({
        artist: userProfile,
        plays: playsPurchased,
        amount: totalCost
      });

    } catch (err: any) {
      toast.error(err.message, { id: toastId });
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-[24px] md:text-[32px] font-studio font-bold flex items-center gap-3 uppercase text-text-primary leading-tight">
            <Flame className="text-smash-orange shrink-0" /> Promote Music
          </h2>
          <p className="text-text-secondary text-[12px] md:text-[14px] font-sans mt-1 md:mt-2">Audio ads play between songs. Radio-style promotion for Malawian artists.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="h-[44px] px-6 bg-smash-orange text-white font-display font-semibold text-[11px] uppercase tracking-widest rounded-[10px] flex items-center justify-center gap-2 hover:bg-smash-orange/90 transition-all"
          >
            <Plus size={18} /> New Campaign
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleCreateAds} className="bg-bg-surface border border-border-default rounded-[14px] p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm">
           <div className="flex items-center justify-between mb-2">
             <h3 className="text-[22px] font-studio font-bold uppercase text-text-primary">Create Ad Campaign</h3>
             <button type="button" onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary transition-colors">
               <X size={24} />
             </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[11px] font-display font-medium uppercase tracking-wider text-smash-purple flex items-center gap-2">
                      <Music2 size={12} /> Campaign Name
                   </label>
                   <input 
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. New Single Promo - Summer 2024"
                      className="w-full h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 font-display text-[14px] outline-none focus:border-smash-purple focus:ring-[3px] focus:ring-smash-purple/15 transition-all text-text-primary placeholder:text-text-muted"
                   />
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[11px] font-display font-medium uppercase tracking-wider text-smash-orange">Target City (Optional)</label>
                      <select 
                        value={targetCity}
                        onChange={e => setTargetCity(e.target.value)}
                        className="w-full h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 font-display text-[14px] outline-none focus:border-smash-orange focus:ring-[3px] focus:ring-smash-orange/15 text-text-primary"
                      >
                        <option value="">All Malaŵi</option>
                        <option value="Lilongwe">Lilongwe</option>
                        <option value="Blantyre">Blantyre</option>
                        <option value="Mzuzu">Mzuzu</option>
                        <option value="Zomba">Zomba</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[11px] font-display font-medium uppercase tracking-wider text-smash-orange">Target Genre</label>
                      <select 
                        value={targetGenre}
                        onChange={e => setTargetGenre(e.target.value)}
                        className="w-full h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 font-display text-[14px] outline-none focus:border-smash-orange focus:ring-[3px] focus:ring-smash-orange/15 text-text-primary"
                      >
                        <option value="">All Genres</option>
                        <option value="Afrobeat">Afrobeat</option>
                        <option value="Hip Hop">Hip Hop</option>
                        <option value="Gospel">Gospel</option>
                        <option value="Reggae">Reggae</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[11px] font-display font-medium uppercase tracking-wider text-smash-purple">Ad Audio (Max 30s)</label>
                   <div 
                     onClick={() => document.getElementById('ad-audio-input')?.click()}
                     className="w-full h-32 border border-dashed border-border-default rounded-[10px] flex flex-col items-center justify-center cursor-pointer hover:border-smash-purple/50 transition-all bg-bg-elevated group"
                   >
                      <input 
                        id="ad-audio-input"
                        type="file" 
                        accept="audio/*" 
                        className="hidden" 
                        onChange={e => setAudioFile(e.target.files?.[0] || null)}
                      />
                      {audioFile ? (
                        <>
                          <CheckCircle2 className="text-smash-green mb-2" size={24} />
                          <p className="text-[14px] font-display font-medium text-text-primary truncate max-w-[200px]">{audioFile.name}</p>
                        </>
                      ) : (
                        <>
                          <FileAudio className="text-text-muted group-hover:text-smash-purple transition-colors mb-2" size={24} />
                          <p className="text-[13px] font-display font-medium text-text-secondary">Click to upload ad audio</p>
                        </>
                      )}
                   </div>
                </div>
             </div>

             <div className="space-y-6">
                <div className="bg-bg-elevated border border-smash-purple/20 rounded-[14px] p-6 shadow-sm">
                   <h4 className="text-[11px] font-display font-medium uppercase tracking-wider text-smash-purple mb-4">Campaign Budget</h4>
                   
                   <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                          <p className="text-[28px] font-studio font-bold text-text-primary">
                            {playsPurchased.toLocaleString()}
                          </p>
                          <p className="text-[11px] font-display font-medium text-text-muted uppercase tracking-wider">Guaranteed Plays</p>
                        </div>
                        <div className="text-right flex flex-col gap-1">
                          <p className="text-[28px] font-studio font-bold text-smash-green">
                            MK {totalCost.toLocaleString()}
                          </p>
                          <p className="text-[11px] font-display font-medium text-text-muted uppercase tracking-wider">Total Cost</p>
                        </div>
                      </div>

                      <input 
                        type="range"
                        min="500"
                        max="50000"
                        step="500"
                        value={playsPurchased}
                        onChange={e => setPlaysPurchased(Number(e.target.value))}
                        className="w-full accent-smash-purple bg-border-default h-2 rounded-full appearance-none slider-custom-thumb"
                      />
                      
                      <div className="flex justify-between text-[10px] font-display font-medium text-text-muted uppercase tracking-wider">
                        <span>500 plays</span>
                        <span>50,000 plays</span>
                      </div>
                   </div>
                </div>

                <div className="bg-bg-elevated border border-border-default rounded-[10px] p-5">
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-smash-orange/10 rounded-full flex items-center justify-center text-smash-orange flex-shrink-0">
                         <Info size={18} />
                      </div>
                      <p className="text-[13px] text-text-secondary font-sans leading-relaxed">
                         Audio ads should be professional, short (max 30s), and engaging. Use voiceovers and background music to capture attention. Campaigns run until purchased plays are exhausted.
                      </p>
                   </div>
                </div>

                <button 
                  type="submit"
                  disabled={uploading}
                  className="w-full h-[48px] bg-smash-purple text-white font-display font-semibold uppercase tracking-widest text-[12px] rounded-[10px] hover:bg-smash-purple/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {uploading ? (
                    <>Processing...</>
                  ) : (
                    <>Launch Campaign • MK {totalCost.toLocaleString()}</>
                  )}
                </button>
             </div>
           </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             [...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-bg-surface animate-pulse rounded-[14px]" />
             ))
          ) : ads.length > 0 ? (
            ads.map(ad => (
              <div key={ad.id} className="group relative bg-bg-surface border border-border-default rounded-[14px] overflow-hidden p-6 hover:border-smash-purple/50 transition-all flex flex-col shadow-sm">
                 <div className="absolute top-6 right-6">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-display font-semibold uppercase tracking-wider ${ad.active ? 'bg-smash-green/10 text-smash-green border border-smash-green/20' : 'bg-smash-red/10 text-smash-red border border-smash-red/20'}`}>
                       {ad.active ? 'Active' : 'Expired'}
                    </span>
                 </div>

                 <div className="w-12 h-12 bg-smash-purple/10 rounded-[10px] flex items-center justify-center text-smash-purple mb-4 group-hover:-translate-y-1 transition-transform">
                    <FileAudio size={20} />
                 </div>

                 <h3 className="text-[20px] font-studio font-bold uppercase text-text-primary mb-1 truncate group-hover:text-smash-purple transition-colors">
                    {ad.title}
                 </h3>
                 <p className="text-[11px] text-text-muted font-display font-medium uppercase tracking-wider mb-6">
                    {ad.target_city || 'Nationwide'} • {ad.target_genre || 'All Genres'}
                 </p>

                 <div className="flex-1 space-y-4 mb-6">
                    <div className="space-y-2">
                       <div className="flex justify-between text-[11px] font-display font-medium uppercase tracking-wider">
                          <span className="text-text-muted">Reach</span>
                          <span className="text-text-primary">{ad.plays_used.toLocaleString()} / {ad.plays_purchased.toLocaleString()}</span>
                       </div>
                       <div className="h-2 bg-bg-elevated rounded-full overflow-hidden border border-border-default">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(ad.plays_used / ad.plays_purchased) * 100}%` }}
                            className="h-full bg-smash-purple rounded-full"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center justify-between pt-4 border-t border-border-default">
                    <div className="flex items-center gap-2">
                       <Play size={14} className="text-smash-purple" />
                       <span className="text-[20px] font-studio font-bold text-text-primary">{ad.plays_used.toLocaleString()}</span>
                    </div>
                    <button className="p-2 bg-bg-elevated hover:bg-border-default rounded-[10px] transition-colors text-text-muted hover:text-text-primary">
                       <ExternalLink size={16} />
                    </button>
                 </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center bg-bg-surface rounded-[14px] border border-border-default border-dashed">
               <Flame size={40} className="text-text-muted/50 mx-auto mb-4" />
               <h4 className="text-[20px] font-studio font-bold uppercase text-text-primary mb-2">No active campaigns</h4>
               <p className="text-text-secondary text-[14px] font-sans mb-6">Boost your streams by reaching targeted Malawian listeners.</p>
               <button onClick={() => setShowForm(true)} className="h-[44px] px-6 bg-border-default hover:bg-border-subtle text-text-primary rounded-[10px] font-display font-semibold uppercase text-[11px] tracking-widest transition-all inline-flex items-center justify-center">
                  Get Started
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SongsTab = ({ songs, onRefresh, setActiveTab }: any) => {
  const [filter, setFilter] = useState<'all' | 'live' | 'pending' | 'for_sale'>('all');
  
  const extractStoragePath = (url: string, bucket: string) => {
    if(!url) return null;
    try {
      const parts = url.split(`/public/${bucket}/`);
      return parts.length > 1 ? parts[1] : null;
    } catch(e) { return null; }
  };

  const handleDelete = async (song: any) => {
    if(!confirm('Are you sure you want to delete this track?')) return;
    try {
      const audioPath = extractStoragePath(song.audio_url, 'songs');
      if (audioPath) await supabase.storage.from('songs').remove([audioPath]);
      const coverPath = extractStoragePath(song.cover_url, 'covers');
      if (coverPath) await supabase.storage.from('covers').remove([coverPath]);

      const { error } = await supabase.from('songs').delete().eq('id', song.id);
      if(error) throw error;
      toast.success('Track deleted.');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredSongs = songs.filter((s: any) => {
    if (filter === 'live') return s.approved;
    if (filter === 'pending') return !s.approved;
    if (filter === 'for_sale') return s.is_for_sale;
    return true;
  });

  const formatCount = (count: number) => {
    if (!count) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex-1 min-w-0">
           <h2 className="text-[24px] md:text-[32px] font-studio font-bold flex items-center gap-3 uppercase text-text-primary leading-tight"><Music2 className="text-smash-purple shrink-0" /> Track <span className="text-smash-purple">Inventory</span></h2>
           <p className="text-text-secondary text-[12px] md:text-[14px] font-sans mt-1 md:mt-2">Manage your distributed catalog</p>
        </div>
        <button onClick={() => setActiveTab('upload')} className="h-[44px] px-6 bg-smash-purple text-white font-display font-semibold text-[11px] uppercase tracking-widest rounded-[10px] flex items-center justify-center gap-2 hover:bg-smash-purple/90 transition-all shadow-sm">
          <Plus size={18} /> New Release
        </button>
      </div>

      <div className="bg-bg-surface border border-border-default rounded-[14px] overflow-hidden shadow-sm">
        <div className="p-4 md:p-6 border-b border-border-default flex gap-2 overflow-x-auto no-scrollbar">
           {[
             { id: 'all', label: 'All Catalog' },
             { id: 'live', label: 'Live Tracks' },
             { id: 'pending', label: 'Reviewing' },
             { id: 'for_sale', label: 'Premium' }
           ].map(t => (
             <button 
               key={t.id}
               onClick={() => setFilter(t.id as any)}
               className={`px-6 py-[10px] rounded-full text-[11px] font-display font-semibold uppercase tracking-widest transition-all whitespace-nowrap ${
                 filter === t.id ? 'bg-smash-purple text-white' : 'bg-bg-elevated text-text-secondary border border-border-default hover:text-text-primary'
               }`}
             >
               {t.label}
             </button>
           ))}
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          {filteredSongs.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-elevated text-text-muted text-[11px] font-display font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3 first:pl-6 last:pr-6 whitespace-nowrap">Track Asset</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Engagement</th>
                  <th className="px-4 py-3 whitespace-nowrap">Monetization</th>
                  <th className="px-4 py-3 text-right last:pr-6 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredSongs.map((song: any) => (
                  <tr key={song.id} className="hover:bg-bg-elevated transition-colors group">
                    <td className="px-4 py-3 first:pl-6">
                      <div className="flex items-center gap-4">
                        <img src={song.cover_url || "https://placehold.co/80"} className="w-[40px] h-[40px] rounded-[10px] object-cover" />
                        <div>
                          <p className="text-[14px] font-display font-semibold text-text-primary group-hover:text-smash-purple transition-colors truncate max-w-[200px]">{song.title}</p>
                          <p className="text-[12px] text-text-muted font-sans">{song.genre || 'Afro'} • {new Date(song.created_at).getFullYear()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                       <div className="flex items-center gap-2">
                          <div className={`w-[6px] h-[6px] rounded-full ${song.approved ? 'bg-smash-green' : 'bg-[#eab308] animate-pulse'}`} />
                          <span className={`text-[12px] font-display font-medium ${song.approved ? 'text-smash-green' : 'text-[#eab308]'}`}>
                             {song.approved ? 'Distributed' : 'Reviewing'}
                          </span>
                       </div>
                    </td>
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-4">
                           <div className="flex flex-col">
                              <p className="text-[14px] font-display font-semibold text-text-primary">{formatCount(song.plays)}</p>
                              <p className="text-[11px] text-text-muted font-sans font-medium">Streams</p>
                           </div>
                           <div className="flex flex-col">
                              <p className="text-[14px] font-display font-semibold text-text-primary">{formatCount(song.likes)}</p>
                              <p className="text-[11px] text-text-muted font-sans font-medium">Likes</p>
                           </div>
                        </div>
                    </td>
                    <td className="px-4 py-3">
                       <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${song.is_for_sale ? 'bg-smash-green/10 text-smash-green border border-smash-green/20' : 'bg-bg-surface text-text-secondary border border-border-default'}`}>
                         {song.is_for_sale ? `MK ${song.price?.toLocaleString()}` : 'Free Feed'}
                       </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 last:pr-6">
                       <button className="w-8 h-8 inline-flex items-center justify-center bg-bg-surface border border-border-default text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-[8px] transition-all" onClick={() => toast('Edit feature coming soon')}><Edit3 size={14} /></button>
                       <button onClick={() => handleDelete(song)} className="w-8 h-8 inline-flex items-center justify-center bg-smash-red/10 border border-smash-red/20 text-smash-red hover:bg-smash-red hover:text-white rounded-[8px] transition-all"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center">
              <Music2 className="mx-auto text-text-muted/30 mb-4" size={48} />
              <p className="text-[15px] font-display font-medium text-text-secondary mb-4">No assets found in this segment.</p>
              <button onClick={() => setFilter('all')} className="text-smash-purple font-display font-semibold uppercase tracking-widest text-[11px] hover:underline">Show all tracks &rarr;</button>
            </div>
          )}
        </div>

        {/* Mobile List */}
        <div className="md:hidden flex flex-col divide-y divide-border-default">
          {filteredSongs.length > 0 ? (
            filteredSongs.map((song: any) => (
              <div key={song.id} className="flex items-center gap-3 p-4 hover:bg-bg-elevated transition-colors min-h-[72px]">
                <img src={song.cover_url || "https://placehold.co/80"} className="w-[40px] h-[40px] rounded-[10px] object-cover shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-[14px] font-display font-semibold text-text-primary truncate">{song.title}</p>
                  <p className="text-[12px] text-text-muted font-sans truncate">{song.genre || 'Afro'} • {formatCount(song.plays)} plays</p>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-2">
                   <div className="flex items-center gap-1.5">
                      <div className={`w-[6px] h-[6px] rounded-full ${song.approved ? 'bg-smash-green' : 'bg-[#eab308] animate-pulse'}`} />
                      <span className={`text-[10px] font-display font-medium ${song.approved ? 'text-smash-green' : 'text-[#eab308]'}`}>
                         {song.approved ? 'Live' : 'Rev'}
                      </span>
                   </div>
                   <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(song)} className="w-6 h-6 inline-flex items-center justify-center bg-smash-red/10 text-smash-red rounded disabled:opacity-50 transition-colors"><Trash2 size={12} /></button>
                   </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
               <Music2 className="mx-auto text-text-muted/30 mb-3" size={32} />
               <p className="text-[13px] font-sans text-text-secondary">No tracks found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AlbumsTab = ({ albums, songs, onRefresh, setActiveTab, userProfile }: any) => {
  const limits = getTierLimits(userProfile);

  return (
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-[24px] md:text-[32px] font-studio font-bold flex items-center gap-3 uppercase text-text-primary"><Disc className="text-smash-purple shrink-0" /> Albums</h2>
        {limits.canCreateAlbums ? (
          <button onClick={() => setActiveTab('upload')} className="h-[44px] px-6 bg-smash-purple text-white font-display font-semibold text-[11px] uppercase tracking-widest rounded-[10px] flex items-center justify-center gap-2 hover:bg-smash-purple/90 transition-all shadow-sm">
            <Plus size={16} /> New Album
          </button>
        ) : (
          <button onClick={() => setActiveTab('subscription')} className="h-[44px] px-6 bg-bg-surface border border-border-default text-text-secondary font-display font-semibold text-[11px] uppercase tracking-widest rounded-[10px] flex items-center justify-center gap-2 hover:text-text-primary transition-all shadow-sm">
            <AppLockIcon size={14} /> Unlock Albums
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {albums.map((al:any) => (
          <div key={al.id} className="bg-bg-surface border border-border-default rounded-[14px] p-4 hover:border-smash-purple/50 transition-all group shadow-sm flex flex-col">
            <div className="aspect-square rounded-[10px] overflow-hidden relative mb-4">
              <img src={al.cover_url || "https://placehold.co/300x300/18162C/9B5DE5"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                <button className="px-4 py-2 bg-smash-purple text-white text-[11px] font-display font-semibold uppercase tracking-widest rounded-[8px] hover:bg-smash-purple/90 transition-all">View Songs</button>
              </div>
            </div>
            <h4 className="font-display font-semibold text-[14px] text-text-primary mb-1 truncate">{al.title}</h4>
            <p className="text-[12px] font-sans text-text-muted">{al.release_year || '—'}</p>
          </div>
        ))}
        {albums.length === 0 && (
          <div className="col-span-full p-12 text-center bg-bg-surface border border-border-default border-dashed rounded-[14px]">
             <Disc className="mx-auto mb-3 text-text-muted/50" size={32} />
             <p className="text-[14px] font-sans text-text-secondary mb-4">
               {limits.canCreateAlbums ? "No albums created yet." : "Albums unlock with Rising Star plan."}
             </p>
             <button onClick={() => setActiveTab(limits.canCreateAlbums ? 'upload' : 'subscription')} className="h-[36px] px-4 border border-border-default text-text-primary rounded-[10px] text-[11px] font-display font-semibold hover:bg-bg-elevated mx-auto inline-flex items-center justify-center uppercase tracking-widest transition-all">
               {limits.canCreateAlbums ? "Create First Album" : "Upgrade to Unlock"}
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

const UploadTab = ({ onComplete, albums, songs, setActiveTab, role }: any) => {
  const [mode, setMode] = useState<'single' | 'album' | 'snippet'>('single');
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [songFile, setSongFile] = useState<File | null>(null);
  const [albumFiles, setAlbumFiles] = useState<File[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [genre, setGenre] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [isExplicit, setIsExplicit] = useState(false);
  const [featuredArtist, setFeaturedArtist] = useState('');
  const [language, setLanguage] = useState('Chichewa');
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [price, setPrice] = useState(2500);
  const [isForSale, setIsForSale] = useState(false);

  const { userProfile } = useAuth();
  const limits = getTierLimits(userProfile);

  const isFree = getArtistTier(userProfile) === 'free';
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const songsUploadedThisMonth = songs.filter((s: any) => {
    const createdDate = new Date(s.created_at);
    return createdDate >= startOfMonth;
  }).length;
  const totalSongsUploaded = songs.length;
  const hasReachedLimit = (limits.songLimit !== null && totalSongsUploaded >= limits.songLimit) || 
                          (limits.monthlyLimit !== null && songsUploadedThisMonth >= limits.monthlyLimit);

  const handleUploadSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songFile || !coverFile || !title) return toast.error('Please fill all fields');
    
    setUploading(true);
    setUploadProgress(10);
    
    try {
      setUploadProgress(20);
      const coverExt = coverFile.name.split('.').pop();
      const coverPath = `covers/${userProfile?.id}/cover-${Date.now()}.${coverExt}`;
      const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, coverFile);
      if (coverErr) throw coverErr;
      const { data: { publicUrl: coverUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath);

      setUploadProgress(40);
      const audioExt = songFile.name.split('.').pop();
      const audioPath = `songs/${userProfile?.id}/song-${Date.now()}.${audioExt}`;
      const { error: audioErr } = await supabase.storage.from('songs').upload(audioPath, songFile);
      if (audioErr) throw audioErr;
      const { data: { publicUrl: audioUrl } } = supabase.storage.from('songs').getPublicUrl(audioPath);

      setUploadProgress(70);
      const { error: dbErr } = await supabase.from('songs').insert({
        title,
        artist_id: userProfile?.id,
        audio_url: audioUrl,
        cover_url: coverUrl,
        is_explicit: isExplicit,
        release_date: releaseDate,
        featured_artist: featuredArtist,
        language: language,
        lyrics: lyrics,
        genre: genre,
        album_id: albumId || null,
        price: isForSale ? price : 0,
        is_for_sale: isForSale,
        approved: false,
        type: mode === 'snippet' ? 'snippet' : 'single',
        plays: 0
      });

      if (dbErr) throw dbErr;
      
      setUploadProgress(100);
      setIsSuccess(true);
      if (onComplete) onComplete();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (albumFiles.length === 0 || !coverFile) return toast.error('Check files');
    handleUploadSingle(e); 
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-bg-surface border border-white/5 rounded-[40px] p-12 text-center shadow-2xl">
          <div className="w-24 h-24 bg-smash-purple/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={48} className="text-smash-purple" />
          </div>
          <h2 className="text-4xl font-studio font-black italic uppercase text-white mb-4">Submission Sent!</h2>
          <p className="text-text-secondary font-medium mb-12">Your music is headed to the Smashify review team. This usually takes 2-4 hours.</p>
          <div className="space-y-4">
            <button onClick={() => { setIsSuccess(false); setUploadStep(1); setTitle(''); setSongFile(null); setCoverFile(null); }} className="w-full h-16 bg-smash-purple text-white font-display font-black uppercase tracking-widest rounded-2xl hover:brightness-110 transition-all">Submit Another</button>
            <button onClick={() => window.location.reload()} className="w-full h-16 bg-white/5 border border-white/10 text-white font-display font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all">Back to Studio</button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (hasReachedLimit && mode === 'single') {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6">
        <div className="bg-bg-surface border border-smash-orange/20 rounded-[40px] p-16 text-center shadow-2xl">
          <AlertCircle size={64} className="text-smash-orange mx-auto mb-8" />
          <h2 className="text-3xl font-studio font-black uppercase italic text-white mb-4">Uploader Locked</h2>
          <p className="text-text-secondary font-medium mb-12 max-w-md mx-auto">
            {isFree 
              ? "You've reached the 3-song limit. Upgrade to unlock unlimited uploads."
              : `You've reached your monthly allowance of ${limits.monthlyLimit} songs.`}
          </p>
          <button onClick={() => setActiveTab('subscription')} className="h-16 px-12 bg-smash-purple text-white font-display font-black uppercase tracking-widest rounded-2xl hover:brightness-110">View Plans</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 mt-6 px-4">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-[28px] md:text-[36px] font-studio font-black flex items-center justify-center md:justify-start gap-4 uppercase italic text-white mb-2 tracking-tighter">
           <Upload className="text-smash-purple animate-bounce" size={32} /> Studio Uploader
        </h2>
        <p className="text-text-secondary font-medium font-sans">Sync your sounds with thousands of Malawian fans.</p>
      </div>

      <div className="bg-bg-surface border border-white/5 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="grid grid-cols-3 border-b border-white/5 bg-white/[0.02]">
           {[
             { step: 1, label: 'Metadata', icon: Music2 },
             { step: 2, label: 'Media Info', icon: FileAudio },
             { step: 3, label: 'Submission', icon: Rocket }
           ].map((s) => (
             <div 
               key={s.step}
               className={`flex flex-col items-center py-6 transition-all relative ${uploadStep === s.step ? 'text-smash-purple bg-smash-purple/5' : 'text-text-muted opacity-30'}`}
             >
                <s.icon size={20} className={`mb-2 ${uploadStep === s.step ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] font-display font-black uppercase tracking-[0.2em]">{s.label}</span>
                {uploadStep === s.step && <motion.div layoutId="step-indicator" className="absolute bottom-0 left-6 right-6 h-1 bg-smash-purple rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]" />}
             </div>
           ))}
        </div>

        <div className="p-8 md:p-12">
           <AnimatePresence mode="wait">
           {uploadStep === 1 && (
             <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                <div className="flex bg-bg-elevated p-1.5 rounded-full w-fit mx-auto md:mx-0 mb-10 gap-1 border border-white/5 shadow-inner">
                  {['single', 'album', 'snippet'].map((m) => (
                    <button key={m} onClick={() => {
                      if (m === 'album' && !limits.canCreateAlbums) return toast.error('Standard Plan required');
                      if (m === 'snippet' && !limits.canPostSnippets) return toast.error('Rising Star Plan required');
                      setMode(m as any);
                    }} className={`px-8 py-3 rounded-full text-[11px] font-display font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-smash-purple text-white shadow-xl scale-105' : 'text-text-secondary hover:text-text-primary'}`}>
                      {m}
                    </button>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="group">
                      <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-3 group-focus-within:text-smash-purple transition-colors">Release Title *</label>
                      <input 
                        value={title} 
                        onChange={e=>setTitle(e.target.value)}
                        placeholder={mode === 'album' ? "e.g. The Recovery" : "e.g. Mapulani"} 
                        className="w-full h-14 bg-bg-elevated border border-white/5 rounded-2xl px-6 text-[15px] font-display font-bold focus:border-smash-purple transition-all outline-none text-white placeholder:text-white/20" 
                      />
                    </div>
                    <div className="group">
                      <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-3 group-focus-within:text-smash-purple transition-colors">Primary Genre *</label>
                      <select 
                        value={genre} 
                        onChange={e=>setGenre(e.target.value)}
                        className="w-full h-14 bg-bg-elevated border border-white/5 rounded-2xl px-6 text-[15px] font-display font-bold focus:border-smash-purple transition-all appearance-none text-white outline-none"
                      >
                        <option value="">Select genre</option>
                        <option value="Afropop">Afropop</option>
                        <option value="Gospel">Gospel</option>
                        <option value="Hip Hop">Hip Hop</option>
                        <option value="R&B">R&B</option>
                        <option value="Amapiano">Amapiano</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className="group">
                      <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-3 group-focus-within:text-smash-purple transition-colors">Featured Artist</label>
                      <input value={featuredArtist} onChange={e=>setFeaturedArtist(e.target.value)} placeholder="e.g. Namadingo" className="w-full h-14 bg-bg-elevated border border-white/5 rounded-2xl px-6 text-[15px] font-display font-bold focus:border-smash-purple transition-all outline-none text-white placeholder:text-white/20" />
                    </div>
                    <div className="group">
                      <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-3 group-focus-within:text-smash-purple transition-colors">Release Date</label>
                      <input type="date" value={releaseDate} onChange={e=>setReleaseDate(e.target.value)} className="w-full h-14 bg-bg-elevated border border-white/5 rounded-2xl px-6 text-[15px] font-display font-bold focus:border-smash-purple transition-all outline-none text-white" />
                    </div>
                  </div>
                </div>

                {mode !== 'snippet' && (
                  <div className="grid md:grid-cols-2 gap-10 pt-10 border-t border-white/5">
                    <div className="group">
                      <div className="flex justify-between items-center mb-3">
                         <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block transition-colors group-focus-within:text-smash-purple">Distribution Mode</label>
                         {!limits.canSellSongs && <span className="text-[9px] font-display font-bold bg-smash-orange/10 text-smash-orange px-2 py-0.5 rounded-full uppercase">Premium Feature</span>}
                      </div>
                      <div className="flex gap-2 p-1.5 bg-bg-elevated border border-white/5 rounded-2xl">
                         <button 
                           onClick={() => setIsForSale(false)} 
                           className={`flex-1 h-12 rounded-xl text-[11px] font-display font-black uppercase tracking-widest transition-all ${!isForSale ? 'bg-white/10 text-white shadow-lg' : 'text-text-muted hover:text-white'}`}
                         >
                            Free Stream
                         </button>
                         <button 
                           disabled={!limits.canSellSongs}
                           onClick={() => setIsForSale(true)} 
                           className={`flex-1 h-12 rounded-xl text-[11px] font-display font-black uppercase tracking-widest transition-all ${isForSale ? 'bg-smash-purple text-white shadow-lg shadow-smash-purple/20' : 'text-text-muted hover:text-white'} disabled:opacity-30 disabled:cursor-not-allowed`}
                         >
                            Paid Download
                         </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isForSale && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: 10 }}
                          className="group"
                        >
                          <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-3 group-focus-within:text-smash-purple transition-colors">Download Price (MWK)</label>
                          <div className="relative">
                             <input 
                               type="number" 
                               value={price} 
                               onChange={e => setPrice(Number(e.target.value))}
                               min="100"
                               step="500"
                               className="w-full h-14 bg-bg-elevated border border-white/5 rounded-2xl px-6 text-[15px] font-display font-bold focus:border-smash-purple transition-all outline-none text-white pr-20" 
                             />
                             <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[11px] font-display font-black text-text-muted uppercase">MWK</div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="pt-10 border-t border-white/5 flex justify-end">
                   <button onClick={() => title && genre ? setUploadStep(2) : toast.error('Fill required fields')} className="h-16 px-12 bg-white text-black font-display font-black uppercase tracking-[0.2em] text-[13px] rounded-2xl hover:scale-105 transition-all flex items-center gap-4">Next Step <ArrowRight size={20} /></button>
                </div>
             </motion.div>
           )}
            {uploadStep === 2 && (
             <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                <div className="grid md:grid-cols-2 gap-12">
                   <div className="aspect-square bg-bg-elevated border-2 border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center p-12 text-center cursor-pointer hover:border-smash-purple transition-all relative overflow-hidden group shadow-inner" onClick={() => document.getElementById('cover-file')?.click()}>
                      {coverFile ? <img src={URL.createObjectURL(coverFile)} className="absolute inset-0 w-full h-full object-cover shadow-2xl" /> : (
                        <>
                          <ImageIcon size={48} className="text-smash-purple mb-4" />
                          <p className="text-white font-display font-black uppercase tracking-[0.2em] text-[12px]">Master Artwork</p>
                        </>
                      )}
                      <input id="cover-file" type="file" accept="image/*" onChange={e=>setCoverFile(e.target.files?.[0]||null)} className="hidden" />
                   </div>
                   <div className="aspect-square bg-bg-elevated border-2 border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center p-12 text-center cursor-pointer hover:border-smash-orange transition-all relative overflow-hidden group shadow-inner" onClick={() => document.getElementById('audio-file')?.click()}>
                      {(mode === 'album' ? albumFiles.length > 0 : songFile) ? (
                        <div className="text-center animate-pulse">
                          <Music2 size={64} className="text-smash-green mx-auto mb-4" />
                          <p className="text-white font-display font-black uppercase tracking-[0.2em] text-[12px]">{mode === 'album' ? `${albumFiles.length} Tracks` : 'Audio Verified'}</p>
                        </div>
                      ) : (
                        <>
                          <UploadCloud size={48} className="text-smash-orange mb-4" />
                          <p className="text-white font-display font-black uppercase tracking-[0.2em] text-[12px]">Select Audio</p>
                        </>
                      )}
                      <input id="audio-file" type="file" multiple={mode === 'album'} accept="audio/*" onChange={e=> mode === 'album' ? setAlbumFiles(Array.from(e.target.files || [])) : setSongFile(e.target.files?.[0]||null)} className="hidden" />
                   </div>
                </div>
                <div className="pt-10 border-t border-white/5 flex justify-between items-center">
                   <button onClick={()=>setUploadStep(1)} className="h-14 px-10 border border-white/10 text-text-secondary font-display font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-white/5 transition-all">Back</button>
                   <button disabled={!coverFile || (mode==='album'?albumFiles.length===0:!songFile)} onClick={()=>setUploadStep(3)} className="h-16 px-12 bg-white text-black font-display font-black uppercase tracking-widest text-[13px] rounded-2xl hover:scale-105 disabled:opacity-20 flex items-center gap-4 transition-all">Review & Launch <ArrowRight size={20}/></button>
                </div>
             </motion.div>
           )}

           {uploadStep === 3 && (
             <motion.div key="step3" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12 py-10 text-center">
                <div className="relative w-56 h-56 mx-auto">
                   <div className={`w-full h-full rounded-full border-4 border-smash-purple border-t-transparent ${uploading?'animate-spin':''}`} />
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-6xl font-studio font-black text-white">{uploadProgress}%</span>
                      <span className="text-[10px] font-display font-black uppercase tracking-[0.3em] text-smash-purple mt-3 animate-pulse">Syncing</span>
                   </div>
                </div>
                <div className="max-w-md mx-auto space-y-8">
                   <h3 className="text-3xl font-studio font-black uppercase italic text-white tracking-widest">Engine Processing</h3>
                   <p className="text-text-secondary font-sans leading-relaxed text-[15px]">Optimization complete. "{title}" is ready for distribution to Smashify nodes across Malawi.</p>
                   {!uploading && (
                     <div className="space-y-6">
                        <button 
                          onClick={mode === 'album' ? handleUploadAlbum : handleUploadSingle} 
                          className="h-20 w-full bg-smash-purple text-white font-display font-black uppercase tracking-[0.4em] text-[15px] rounded-3xl hover:brightness-110 shadow-[0_20px_50px_rgba(168,85,247,0.3)] transition-all flex items-center justify-center gap-6 group"
                        >
                           {mode === 'snippet' ? 'POST TO FEED' : 'PUBLISH TO SMASHIFY'} <Rocket size={28} className="group-hover:-translate-y-2 group-hover:translate-x-2 transition-transform duration-500" />
                        </button>

                        <div className="bg-white/5 border border-white/5 rounded-[20px] p-6 flex gap-4 text-left">
                           <Info size={18} className="text-smash-purple shrink-0 mt-1" />
                           <p className="text-[12px] font-sans font-medium text-text-secondary leading-relaxed">
                              Your track will be reviewed by the <span className="text-white font-bold">Smashify Team</span> within 24–48 hours. You'll receive a notification once approved. <span className="text-smash-purple">High-quality files distribute faster.</span>
                           </p>
                        </div>
                     </div>
                   )}
                </div>
             </motion.div>
           )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const ProfileTab = ({ userProfile }: any) => {
  const { refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File|null>(null);
  const [bannerFile, setBannerFile] = useState<File|null>(null);

  const handleSave = async(e:React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    
    try {
      let avatarUrl = userProfile?.avatar_url;
      let bannerUrl = userProfile?.banner_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userProfile.id}/avatar-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
        if (!uploadError) {
          avatarUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
        }
      }

      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${userProfile.id}/banner-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('banners').upload(fileName, bannerFile, { upsert: true });
        if (!uploadError) {
          bannerUrl = supabase.storage.from('banners').getPublicUrl(fileName).data.publicUrl;
        }
      }

      const { error } = await supabase.from('profiles').update({
        full_name: fd.get('full_name'),
        stage_name: fd.get('stage_name'),
        genre: fd.get('genre'),
        location: fd.get('location'),
        bio: fd.get('bio'),
        instagram: fd.get('instagram'),
        twitter: fd.get('twitter'),
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        // Phone is not updated if it already exists to protect withdrawal routing
        ...(userProfile?.phone ? {} : { phone: fd.get('phone') })
      }).eq('id', userProfile?.id);

      if(error) throw error;
      toast.success('Studio Profile Updated!');
      setAvatarFile(null);
      setBannerFile(null);
      if(refreshProfile) refreshProfile();
    } catch(err:any) { 
      toast.error(err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="space-y-8 max-w-4xl text-left">
      <h2 className="text-[32px] font-studio font-bold flex items-center justify-start gap-4 uppercase text-text-primary"><UserCircle className="text-smash-purple" /> Studio Settings</h2>
      <form onSubmit={handleSave} className="bg-bg-surface border border-border-default rounded-[14px] p-6 md:p-8 space-y-6 shadow-sm">
         <div className="flex flex-col gap-6">
            <div className="space-y-2 relative">
              <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Studio Banner</label>
              <div 
                className="w-full aspect-[4/1] rounded-[14px] border border-border-default flex flex-col items-center justify-center cursor-pointer hover:border-smash-purple/50 transition-all relative overflow-hidden group shadow-sm bg-bg-elevated"
                onClick={() => document.getElementById('artist-banner-input')?.click()}
              >
                <img 
                  src={bannerFile ? URL.createObjectURL(bannerFile) : (userProfile?.banner_url || "https://placehold.co/1200x300")} 
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload size={24} className="text-white mb-2" />
                  <span className="text-[11px] font-display font-semibold uppercase tracking-widest text-white">Change Banner</span>
                </div>
                <input id="artist-banner-input" type="file" accept="image/*" onChange={e => setBannerFile(e.target.files?.[0] || null)} className="hidden" />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Studio Avatar</label>
              <div 
                className="w-24 h-24 rounded-full border border-border-default flex flex-col items-center justify-center cursor-pointer hover:border-smash-purple/50 transition-all relative overflow-hidden group shadow-sm bg-bg-elevated"
                onClick={() => document.getElementById('artist-avatar-input')?.click()}
              >
                <img 
                  src={avatarFile ? URL.createObjectURL(avatarFile) : (userProfile?.avatar_url || "https://placehold.co/160")} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload size={20} className="text-white" />
                </div>
                <input id="artist-avatar-input" type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] || null)} className="hidden" />
              </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
               <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Full Legal Name</label>
               <input name="full_name" defaultValue={userProfile?.full_name} className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-purple focus:ring-[3px] focus:ring-smash-purple/15 transition-all text-text-primary" />
            </div>
            <div>
               <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Stage/Artist Name</label>
               <input name="stage_name" defaultValue={userProfile?.stage_name} className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-purple focus:ring-[3px] focus:ring-smash-purple/15 transition-all text-text-primary" />
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
               <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2 gap-1 flex items-center">
                  Phone Number (Withdrawals)
               </label>
               <div className="relative group">
                 <input 
                   name="phone" 
                   defaultValue={userProfile?.phone} 
                   disabled={!!userProfile?.phone}
                   placeholder="+265..."
                   title={userProfile?.phone ? "Locked for withdrawal security" : ""}
                   className={`w-full h-[44px] bg-bg-elevated border px-4 pr-10 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-purple focus:ring-[3px] focus:ring-smash-purple/15 transition-all text-text-primary ${userProfile?.phone ? 'border-dashed border-border-default opacity-60 cursor-not-allowed' : 'border-border-default'}`} 
                 />
                 {userProfile?.phone && (
                   <AppLockIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-smash-orange opacity-80" />
                 )}
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Core Genre</label>
                  <select name="genre" defaultValue={userProfile?.genre} className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-purple focus:ring-[3px] focus:ring-smash-purple/15 transition-all text-text-primary">
                    <option>Afropop</option><option>Gospel</option><option>Hip Hop</option><option>R&B</option>
                  </select>
               </div>
               <div>
                  <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Location</label>
                  <input name="location" defaultValue={userProfile?.location} className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-purple focus:ring-[3px] focus:ring-smash-purple/15 transition-all text-text-primary" />
               </div>
            </div>
         </div>
         <div>
            <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Artist Bio</label>
            <textarea name="bio" rows={4} defaultValue={userProfile?.bio} className="w-full bg-bg-elevated border border-border-default py-3 px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-purple focus:ring-[3px] focus:ring-smash-purple/15 transition-all resize-none placeholder:opacity-50 text-text-primary" placeholder="Tell your fans about yourself..." />
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
               <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">IG Handle</label>
               <input name="instagram" defaultValue={userProfile?.instagram} className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-purple focus:ring-[3px] focus:ring-smash-purple/15 transition-all placeholder:opacity-50 text-text-primary" placeholder="@handle" />
            </div>
            <div>
               <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">X / Twitter Handle</label>
               <input name="twitter" defaultValue={userProfile?.twitter} className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-purple focus:ring-[3px] focus:ring-smash-purple/15 transition-all placeholder:opacity-50 text-text-primary" placeholder="@handle" />
            </div>
         </div>
         <button disabled={saving} type="submit" className="w-full h-[48px] bg-smash-purple text-white font-display font-semibold uppercase tracking-widest rounded-[10px] mt-4 hover:bg-smash-purple/90 transition-colors disabled:opacity-50 text-[13px]">
            {saving ? 'SYNCING...' : 'UPDATE STUDIO PROFILE'}
         </button>
      </form>
    </div>
  );
};



const SubscriptionTab = ({ userProfile, role }: any) => {
  const currentTier = userProfile?.subscription_tier || 'free';
  const isPending = role === 'pending';
  const { refreshProfile } = useAuth();
  
  const handleSubscribe = async (tier: 'RisingStar' | 'Standard' | 'Elite') => {
    try {
      await upgradeArtistTier({ artist: userProfile, tier });
    } catch (err) {
      // Error handled by helper
    }
  };

  return (
    <div className={`space-y-12 max-w-5xl mx-auto`}>
      <div className="text-center">
        <h2 className="text-[32px] font-studio font-bold mb-4 uppercase text-text-primary"><Sparkles className="inline text-smash-purple mr-3 mb-2"/> Studio Access</h2>
        <p className="text-text-secondary text-[16px] font-sans">Choose a level that matches your career goals.</p>
        {isPending && (
          <div className="mt-6 p-6 bg-smash-purple/10 border border-smash-purple/20 rounded-[14px] max-w-2xl mx-auto">
             <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-[10px] bg-smash-purple/20 flex items-center justify-center shrink-0">
                   <ShieldCheck className="text-smash-purple" />
                </div>
                <div>
                   <p className="text-[14px] font-display font-semibold uppercase tracking-widest text-text-primary mb-1">Pending Application</p>
                   <p className="text-[13px] font-sans text-text-secondary leading-relaxed text-left">You can still subscribe to unlock Studio features! <span className="text-smash-purple font-semibold">Subscribing while pending grants instant approval</span> so you can start distributing your music immediately.</p>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-bg-surface border border-border-default rounded-[14px] text-center shadow-sm">
         <p className="text-[12px] font-display font-semibold uppercase tracking-widest text-text-primary">Current Status: <strong className={currentTier === 'free' && isPending ? 'text-smash-orange' : 'text-smash-green'}>{currentTier === 'free' ? (isPending ? 'PENDING' : 'FREE') : currentTier.replace('_', ' ').toUpperCase()}</strong></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
         <div className="bg-bg-surface border border-border-subtle rounded-[14px] p-6 flex flex-col group relative overflow-hidden">
            {currentTier === 'rising_star' && <div className="mb-4"><span className="px-3 py-1 bg-smash-green/10 text-smash-green rounded-full text-[10px] font-display font-bold uppercase tracking-widest">Current Plan</span></div>}
            <h4 className="font-studio font-bold text-[18px] mb-4 text-text-primary flex items-center gap-2"><Rocket className="text-smash-orange" size={20} /> Rising Star</h4>
            <div className="flex items-baseline gap-1 mb-8">
               <span className="text-[32px] font-studio font-bold text-text-primary">15,000</span>
               <span className="text-[11px] font-display font-medium text-text-muted uppercase tracking-widest">MWK / YR</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CheckCircle2 size={18} className="text-smash-purple shrink-0 mt-0.5" /> Upload up to 10 songs/month</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CheckCircle2 size={18} className="text-smash-purple shrink-0 mt-0.5" /> Basic analytics</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CheckCircle2 size={18} className="text-smash-purple shrink-0 mt-0.5" /> Airtel/TNM withdrawals</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('RisingStar')} 
              disabled={currentTier === 'rising_star'}
              className="w-full h-[44px] bg-transparent border border-border-default text-text-primary font-display font-semibold uppercase tracking-widest text-xs rounded-[10px] hover:border-smash-orange hover:text-smash-orange transition-colors disabled:opacity-50 disabled:border-border-default disabled:text-text-muted"
            >
              Subscribe
            </button>
         </div>
         
         <div className="bg-bg-surface border-2 border-smash-orange rounded-[14px] p-6 relative flex flex-col">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-smash-orange text-white text-[10px] font-display font-semibold uppercase tracking-widest py-1 px-3 rounded-[6px]">Most Popular</div>
            {currentTier === 'standard' && <div className="mb-4"><span className="px-3 py-1 bg-smash-green/10 text-smash-green rounded-full text-[10px] font-display font-bold uppercase tracking-widest">Current Plan</span></div>}
            <h4 className="font-studio font-bold text-[18px] mb-4 text-text-primary flex items-center gap-2"><Star className="text-smash-orange" size={20} /> Standard</h4>
            <div className="flex items-baseline gap-1 mb-8">
               <span className="text-[32px] font-studio font-bold text-text-primary">25,000</span>
               <span className="text-[11px] font-display font-medium text-text-muted uppercase tracking-widest">MWK / YR</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CheckCircle2 size={18} className="text-smash-orange shrink-0 mt-0.5" /> Unlimited uploads</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CheckCircle2 size={18} className="text-smash-orange shrink-0 mt-0.5" /> Full analytics dashboard</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CheckCircle2 size={18} className="text-smash-orange shrink-0 mt-0.5" /> Priority support</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CheckCircle2 size={18} className="text-smash-orange shrink-0 mt-0.5" /> Album creation</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('Standard')}
              disabled={currentTier === 'standard'}
              className="w-full h-[44px] bg-smash-orange text-white font-display font-semibold uppercase tracking-widest text-xs rounded-[10px] hover:bg-smash-orange/90 transition-colors disabled:opacity-50"
            >
              Subscribe
            </button>
         </div>

         <div className="bg-bg-surface border border-border-subtle rounded-[14px] p-6 flex flex-col">
            {currentTier === 'elite' && <div className="mb-4"><span className="px-3 py-1 bg-smash-green/10 text-smash-green rounded-full text-[10px] font-display font-bold uppercase tracking-widest">Current Plan</span></div>}
            <h4 className="font-studio font-bold text-[18px] mb-4 text-text-primary flex items-center gap-2"><ShieldCheck className="text-smash-purple" size={20} /> Elite / Label</h4>
            <div className="flex items-baseline gap-1 mb-8">
               <span className="text-[32px] font-studio font-bold text-text-primary">45,000</span>
               <span className="text-[11px] font-display font-medium text-text-muted uppercase tracking-widest">MWK / YR</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CheckCircle2 size={18} className="text-smash-purple shrink-0 mt-0.5" /> Everything in Standard</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CheckCircle2 size={18} className="text-smash-purple shrink-0 mt-0.5" /> Multiple artist management</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CheckCircle2 size={18} className="text-smash-purple shrink-0 mt-0.5" /> Dedicated account manager</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('Elite')}
              disabled={currentTier === 'elite'}
              className="w-full h-[44px] bg-transparent border border-border-default text-text-primary font-display font-semibold uppercase tracking-widest text-xs rounded-[10px] hover:border-smash-purple hover:text-smash-purple transition-colors disabled:opacity-50 disabled:border-border-default disabled:text-text-muted"
            >
              Subscribe
            </button>
         </div>
      </div>
    </div>
  );
};

