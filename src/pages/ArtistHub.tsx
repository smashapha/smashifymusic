import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, Music2, Upload, Wallet, UserCircle, Settings, 
  TrendingUp, Users, Play, DollarSign, Plus, Trash2, 
  Edit3, CheckCircle2, AlertCircle, Sparkles, ChevronRight,
  Smartphone, Image as ImageIcon, FileAudio, Info, Flame,
  Disc, LogOut, ArrowLeft, Menu, Clock, ExternalLink, ShieldCheck,
  ShoppingBag, Heart, Lock as AppLockIcon, X, Bell
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
    <div className="bg-white/5 border border-white/5 rounded-[40px] overflow-hidden p-8 text-left col-span-1 md:col-span-2 relative mt-4">
       {!limits.hasFullAnalytics && (
         <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-smash-black/80 backdrop-blur-sm px-6 text-center">
           <AppLockIcon size={32} className="text-smash-purple mb-3" />
           <p className="font-black text-white uppercase tracking-widest text-sm mb-2">Advanced Moto Stats</p>
           <p className="text-smash-gray text-xs font-bold mb-4">Engagement metrics locked to Standard tier.</p>
         </div>
       )}
       <h3 className="font-studio font-black uppercase italic tracking-tight flex items-center gap-2 mb-6 text-xl">
           <Flame className="text-smash-orange" /> MotoFeed Performance
       </h3>
       
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Total Plays" value={stats.plays} icon={<Music2 size={14} />} />
          <MetricCard label="Completion" value={`${completionRate}%`} icon={<CheckCircle2 size={14} />} />
          <MetricCard label="Like Rate" value={`${likeRate}%`} icon={<Heart size={14} />} />
          <MetricCard label="Revenue" value={`MK ${stats.revenue.toLocaleString()}`} icon={<Wallet size={14} />} />
       </div>

       {Number(skipRate) > 50 && (
          <div className="bg-smash-red/10 border border-smash-red/20 rounded-xl p-4 flex items-start gap-4">
             <AlertCircle className="text-smash-red shrink-0 mt-1" size={24} />
             <div>
                <p className="text-smash-red font-black uppercase tracking-widest text-xs mb-1">Low Hook Score Warning</p>
                <p className="text-white/70 text-xs font-bold leading-relaxed">Your tracks have a skip rate of {skipRate}%. Try uploading snippets with stronger intros or engaging captions to capture listeners in the first 5 seconds.</p>
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
  const limits = getTierLimits(userProfile);

  useEffect(() => {
    const fetchHist = async () => {
      const { data } = await supabase.from('transactions').select('*').eq('artist_id', userProfile?.id).order('created_at', { ascending: false }).limit(5);
      if (data) setHistory(data);
    };
    fetchHist();
  }, [userProfile]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (balance <= 0) return toast.error('No funds to withdraw.');
    if (withdrawalAmount < 2000) return toast.error('Minimum withdrawal is MK 2,000.');
    if (withdrawalAmount > balance) return toast.error('Amount exceeds available balance.');

    const networkInput = prompt('Enter network (AIRTEL or TNM)?', 'AIRTEL');
    if (!networkInput) return;
    const network = networkInput.toUpperCase() as 'AIRTEL' | 'TNM';
    if (network !== 'AIRTEL' && network !== 'TNM') return toast.error('Invalid network. Use AIRTEL or TNM.');

    const phone = prompt('Enter mobile number for payment?', userProfile?.phone || '');
    if (!phone) return;

    const confirmed = window.confirm(
      `Withdrawal Summary:\n\nAmount: MWK ${withdrawalAmount.toLocaleString()}\nNetwork: ${network}\nNumber: ${phone}\n\nConfirm withdrawal?`
    );
    if (!confirmed) return;

    setRequesting(true);
    try {
      await requestPayout({
        amount: withdrawalAmount,
        phone,
        network
      });
      setWithdrawalAmount(0);
      // Wait a bit for the balance to update or just refresh
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      // Error handled by helper
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-studio font-black flex items-center gap-3 uppercase italic"><TrendingUp className="text-smash-purple" /> Dashboard</h2>
      </div>

      <div className="bg-gradient-to-br from-smash-purple/10 to-transparent border border-smash-purple/20 rounded-[40px] p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1 w-full text-center md:text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-smash-purple mb-3">Available Balance</p>
          <h3 className="text-5xl md:text-6xl font-black font-studio text-white uppercase italic leading-none mb-4">
            MK {balance.toLocaleString()}
          </h3>
          <p className="text-[10px] text-smash-gray font-bold uppercase tracking-widest italic">
             +12% vs last month
          </p>
        </div>

        <div className="w-full md:w-[360px] bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-6 text-left">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-smash-gray flex items-center gap-2">
             <DollarSign size={14} className="text-smash-green" /> Withdraw Funds
          </h4>
          <div className="relative">
             <input type="number" value={withdrawalAmount || ''} onChange={(e) => setWithdrawalAmount(Number(e.target.value))} placeholder="Amount..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-studio font-black text-2xl italic outline-none focus:border-smash-purple transition-all"/>
             <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-smash-gray">MWK</span>
          </div>
          <button onClick={limits.canWithdraw ? handleWithdraw : () => { toast.error('Withdrawals require Standard plan.'); setActiveTab('subscription'); }} disabled={!limits.canWithdraw || requesting || balance < 5000 || withdrawalAmount < 5000 || withdrawalAmount > balance} className={`w-full py-4 bg-smash-purple text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-full hover:bg-white hover:text-smash-purple transition-all shadow-xl shadow-smash-purple/30 active:scale-95 disabled:opacity-50 ${!limits.canWithdraw ? 'cursor-not-allowed opacity-50' : ''}`}>
            {!limits.canWithdraw ? 'Requires Upgrade' : requesting ? 'Processing...' : 'Request Payout'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/5 border border-white/5 rounded-[40px] overflow-hidden p-8 text-left">
           <h3 className="font-studio font-black uppercase italic tracking-tight flex items-center gap-2 mb-6 text-xl">
               Recent Transactions
           </h3>
           <div className="space-y-4">
             {history.length > 0 ? history.map((t: any) => (
                <div key={t.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                   <div>
                     <p className="font-bold text-sm uppercase tracking-widest">{t.type}</p>
                     <p className="text-[10px] text-smash-gray">{new Date(t.created_at).toLocaleDateString()}</p>
                   </div>
                   <p className={`font-studio font-black italic ${t.type === 'withdrawal' ? 'text-smash-orange' : 'text-smash-green'}`}>
                     {t.type === 'withdrawal' ? '-' : '+'}MK {Number(t.net_amount || t.amount || 0).toLocaleString()}
                   </p>
                </div>
             )) : (
                <p className="text-smash-gray text-xs font-bold uppercase tracking-widest opacity-50">No recent transactions.</p>
             )}
           </div>
        </div>

        <div className="relative bg-white/5 border border-white/5 rounded-[40px] overflow-hidden p-8 text-left flex flex-col items-center justify-center min-h-[300px]">
           {!limits.hasFullAnalytics && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-smash-black/80 backdrop-blur-sm px-6 text-center">
               <AppLockIcon size={32} className="text-smash-purple mb-3" />
               <p className="font-black text-white uppercase tracking-widest text-sm mb-2">Advanced Analytics</p>
               <p className="text-smash-gray text-xs font-bold mb-4">Earnings details & demographic data locked to Standard tier.</p>
               <button onClick={() => setActiveTab('subscription')} className="px-5 py-2 bg-smash-purple text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-white hover:text-smash-purple transition-all">Upgrade →</button>
             </div>
           )}
           <BarChart3 size={40} className="text-smash-gray/20 mb-4" />
           <p className="font-black text-white/50 uppercase tracking-widest text-sm mb-2">Analytics Data</p>
        </div>
        
        <MotoAnalytics limits={limits} />
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon }: any) => (
  <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors">
     <div className="flex items-center gap-2 text-smash-gray text-xs font-bold uppercase tracking-widest mb-3">
        {icon} {label}
     </div>
     <div className="text-2xl md:text-3xl font-display font-black tracking-tight">{value}</div>
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
        <div>
          <h2 className="text-3xl font-studio font-black flex items-center gap-3 uppercase italic">
            <Flame className="text-smash-orange" /> Promote Your Music
          </h2>
          <p className="text-smash-gray text-sm font-bold mt-1 tracking-tight">Audio ads play between songs. Radio-style promotion for Malawian artists.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="px-8 py-3 bg-smash-purple text-white font-black text-xs uppercase tracking-widest rounded-full flex items-center gap-2 hover:bg-white hover:text-smash-purple transition-all shadow-xl active:scale-95"
          >
            <Plus size={18} /> New Campaign
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleCreateAds} className="bg-white/5 border border-white/10 rounded-[40px] p-8 md:p-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center justify-between mb-2">
             <h3 className="text-2xl font-black font-studio uppercase italic tracking-tight">Create Ad Campaign</h3>
             <button type="button" onClick={() => setShowForm(false)} className="text-smash-gray hover:text-white transition-colors">
               <X size={24} />
             </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <div className="space-y-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-smash-purple flex items-center gap-2">
                      <Music2 size={12} /> Campaign Name
                   </label>
                   <input 
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. New Single Promo - Summer 2024"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold outline-none focus:border-smash-purple transition-all"
                   />
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-smash-orange">Target City (Optional)</label>
                      <select 
                        value={targetCity}
                        onChange={e => setTargetCity(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 font-bold outline-none focus:border-smash-orange"
                      >
                        <option value="">All Malaŵi</option>
                        <option value="Lilongwe">Lilongwe</option>
                        <option value="Blantyre">Blantyre</option>
                        <option value="Mzuzu">Mzuzu</option>
                        <option value="Zomba">Zomba</option>
                      </select>
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-smash-orange">Target Genre</label>
                      <select 
                        value={targetGenre}
                        onChange={e => setTargetGenre(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 font-bold outline-none focus:border-smash-orange"
                      >
                        <option value="">All Genres</option>
                        <option value="Afrobeat">Afrobeat</option>
                        <option value="Hip Hop">Hip Hop</option>
                        <option value="Gospel">Gospel</option>
                        <option value="Reggae">Reggae</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-smash-purple">Ad Audio (Max 30s)</label>
                   <div 
                     onClick={() => document.getElementById('ad-audio-input')?.click()}
                     className="w-full h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-smash-purple/50 transition-all bg-white/5 group"
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
                          <p className="text-sm font-bold text-white truncate max-w-[200px]">{audioFile.name}</p>
                        </>
                      ) : (
                        <>
                          <FileAudio className="text-smash-gray group-hover:text-smash-purple transition-colors mb-2" size={32} />
                          <p className="text-xs font-bold text-smash-gray">Click to upload ad audio</p>
                        </>
                      )}
                   </div>
                </div>
             </div>

             <div className="space-y-8">
                <div className="bg-gradient-to-br from-smash-purple/10 to-transparent border border-smash-purple/20 rounded-[32px] p-8">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-smash-purple mb-6">Campaign Budget</h4>
                   
                   <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-3xl font-black font-studio italic">
                            {playsPurchased.toLocaleString()}
                          </p>
                          <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Guaranteed Plays</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black font-studio italic text-smash-green">
                            MK {totalCost.toLocaleString()}
                          </p>
                          <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Total Cost</p>
                        </div>
                      </div>

                      <input 
                        type="range"
                        min="500"
                        max="50000"
                        step="500"
                        value={playsPurchased}
                        onChange={e => setPlaysPurchased(Number(e.target.value))}
                        className="w-full accent-smash-purple bg-white/10 h-2 rounded-full appearance-none"
                      />
                      
                      <div className="flex justify-between text-[8px] font-black text-white/20 uppercase tracking-widest">
                        <span>500 plays</span>
                        <span>50,000 plays</span>
                      </div>
                   </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-smash-orange/10 rounded-xl flex items-center justify-center text-smash-orange flex-shrink-0">
                         <Info size={20} />
                      </div>
                      <p className="text-xs text-smash-gray font-bold leading-relaxed">
                         Audio ads should be professional, short (max 30s), and engaging. Use voiceovers and background music to capture attention. Campaigns run until purchased plays are exhausted.
                      </p>
                   </div>
                </div>

                <button 
                  type="submit"
                  disabled={uploading}
                  className="w-full py-5 bg-smash-purple text-white font-black uppercase tracking-[0.3em] text-xs rounded-full hover:scale-105 transition-transform shadow-2xl shadow-smash-purple/30 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
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
                <div key={i} className="h-64 bg-white/5 animate-pulse rounded-[40px]" />
             ))
          ) : ads.length > 0 ? (
            ads.map(ad => (
              <div key={ad.id} className="group relative bg-[#111111] border border-white/5 rounded-[40px] overflow-hidden p-8 hover:border-smash-purple/30 transition-all flex flex-col">
                 <div className="absolute top-6 right-6">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ad.active ? 'bg-smash-green/10 text-smash-green border border-smash-green/20' : 'bg-smash-red/10 text-smash-red border border-smash-red/20'}`}>
                       {ad.active ? 'Active' : 'Expired'}
                    </span>
                 </div>

                 <div className="w-12 h-12 bg-smash-purple/10 rounded-2xl flex items-center justify-center text-smash-purple mb-6 group-hover:scale-110 transition-transform">
                    <FileAudio size={24} />
                 </div>

                 <h3 className="text-xl font-studio font-black uppercase italic tracking-tight mb-2 truncate group-hover:text-smash-purple transition-colors">
                    {ad.title}
                 </h3>
                 <p className="text-[10px] text-smash-gray font-black uppercase tracking-[0.2em] mb-6">
                    {ad.target_city || 'Nationwide'} • {ad.target_genre || 'All Genres'}
                 </p>

                 <div className="flex-1 space-y-4 mb-8">
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-smash-gray">Reach</span>
                          <span className="text-white">{ad.plays_used.toLocaleString()} / {ad.plays_purchased.toLocaleString()}</span>
                       </div>
                       <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(ad.plays_used / ad.plays_purchased) * 100}%` }}
                            className="h-full bg-gradient-to-r from-smash-purple to-smash-pink rounded-full"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2">
                       <Play size={12} className="text-smash-purple" />
                       <span className="text-lg font-studio font-black italic">{ad.plays_used.toLocaleString()}</span>
                    </div>
                    <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-smash-gray hover:text-white">
                       <ExternalLink size={16} />
                    </button>
                 </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white/5 rounded-[40px] border border-white/5 border-dashed">
               <Flame size={48} className="text-smash-gray/20 mx-auto mb-6" />
               <h4 className="text-xl font-studio font-black uppercase italic tracking-tight text-white/40 mb-2">No active campaigns</h4>
               <p className="text-smash-gray text-xs font-bold mb-8">Boost your streams by reaching targeted Malawian listeners.</p>
               <button onClick={() => setShowForm(true)} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full font-black uppercase text-[10px] tracking-widest transition-all">
                  Get Started →
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SongsTab = ({ songs, onRefresh, setActiveTab }: any) => {
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-studio font-black flex items-center gap-3 uppercase italic"><Music2 className="text-smash-purple" /> My Songs</h2>
        <button onClick={() => setActiveTab('upload')} className="px-6 py-2.5 bg-smash-purple text-white font-black text-xs uppercase tracking-widest rounded-full flex items-center gap-2 hover:bg-white hover:text-smash-purple transition-all shadow-lg active:scale-95">
          <Plus size={16} /> Upload Song
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <MetricCard label="Total Songs" value={songs.length} icon={<Music2 size={16}/>} />
         <MetricCard label="Approved" value={songs.filter((s:any)=>s.approved).length} icon={<CheckCircle2 size={16}/>} />
         <MetricCard label="Total Plays" value={songs.reduce((a:number,s:any)=>a+(s.plays||0),0)} icon={<Play size={16}/>} />
         <MetricCard label="Revenue" value={`MK 0`} icon={<DollarSign size={16}/>} />
      </div>

      <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex gap-2">
          <button className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-smash-purple/10 text-smash-purple border border-smash-purple">All</button>
          <button className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-transparent text-smash-gray border border-white/10 hover:border-white/30 transition-colors">Approved</button>
          <button className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-transparent text-smash-gray border border-white/10 hover:border-white/30 transition-colors">Pending</button>
          <button className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-transparent text-smash-gray border border-white/10 hover:border-white/30 transition-colors">For Sale</button>
        </div>
        <div className="w-full overflow-x-auto">
          {songs.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-smash-gray text-xs uppercase tracking-widest font-bold">
                <tr>
                  <th className="p-4 rounded-tl-xl font-medium">#</th>
                  <th className="p-4 font-medium">Song</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Plays</th>
                  <th className="p-4 rounded-tr-xl font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song:any, i:number) => (
                  <tr key={song.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-smash-gray">{i+1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={song.cover_url || "https://placehold.co/44x44/18162C/9B5DE5"} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold">{song.title}</p>
                          <p className="text-xs text-smash-gray">{song.genre || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${song.approved ? 'bg-smash-green/20 text-smash-green' : 'bg-smash-purple/20 text-smash-purple'}`}>
                        {song.approved ? 'Live' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-smash-gray font-medium">{song.is_for_sale && song.price ? `MK ${song.price.toLocaleString()}` : 'Free'}</td>
                    <td className="p-4 font-bold">{song.plays || 0}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                       <button className="p-2 bg-white/5 rounded-lg text-smash-gray hover:text-white transition-colors" title="Edit"><Edit3 size={16} /></button>
                       <button onClick={()=>handleDelete(song)} className="p-2 bg-white/5 rounded-lg text-smash-red/60 hover:text-smash-red hover:bg-smash-red/10 transition-colors" title="Delete"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              <Music2 className="mx-auto mb-3 text-smash-gray/50" size={32} />
              <p className="text-sm font-medium text-smash-gray">No songs uploaded yet.</p>
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
        <h2 className="text-3xl font-studio font-black flex items-center gap-3 uppercase italic"><Disc className="text-smash-purple" /> Albums</h2>
        {limits.canCreateAlbums ? (
          <button onClick={() => setActiveTab('upload')} className="px-6 py-2.5 bg-smash-purple text-white font-black text-xs uppercase tracking-widest rounded-full flex items-center gap-2 hover:bg-white hover:text-smash-purple transition-all shadow-lg active:scale-95">
            <Plus size={16} /> New Album
          </button>
        ) : (
          <button onClick={() => setActiveTab('subscription')} className="px-6 py-2.5 bg-smash-purple/50 border border-smash-purple/30 text-white/50 font-black text-xs uppercase tracking-widest rounded-full flex items-center gap-2 hover:bg-smash-purple hover:text-white transition-all shadow-lg">
            <AppLockIcon size={14} /> Unlock Albums
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {albums.map((al:any) => (
          <div key={al.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-smash-purple/20 transition-all group">
            <div className="aspect-square rounded-xl overflow-hidden relative mb-3">
              <img src={al.cover_url || "https://placehold.co/300x300/18162C/9B5DE5"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                <button className="px-4 py-2 bg-smash-purple text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white hover:text-smash-purple transition-all">View Songs</button>
              </div>
            </div>
            <h4 className="font-bold text-sm mb-1 truncate">{al.title}</h4>
            <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray">{al.release_year || '—'}</p>
          </div>
        ))}
        {albums.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white/5 border border-white/5 rounded-3xl">
             <Disc className="mx-auto mb-3 text-smash-gray/50" size={32} />
             <p className="text-sm font-medium text-smash-gray mb-3">
               {limits.canCreateAlbums ? "No albums created yet." : "Albums unlock with Rising Star plan."}
             </p>
             <button onClick={() => setActiveTab(limits.canCreateAlbums ? 'upload' : 'subscription')} className="px-4 py-2 border border-white/10 rounded-full text-xs font-bold hover:bg-white/5 mx-auto">
               {limits.canCreateAlbums ? "Create First Album" : "Upgrade to Unlock"}
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

const UploadTab = ({ onComplete, albums, songs, setActiveTab, role }: any) => {
  const [mode, setMode] = useState<'single'|'album'|'snippet'>('single');
  const [uploading, setUploading] = useState(false);
  const [songFile, setSongFile] = useState<File|null>(null);
  const [albumFiles, setAlbumFiles] = useState<File[]>([]);
  const [coverFile, setCoverFile] = useState<File|null>(null);
  const { userProfile } = useAuth();
  
  const limits = getTierLimits(userProfile);
  const isPending = role === 'pending';
  const isFree = getArtistTier(userProfile) === 'free';
  
  // Calculate songs uploaded this month locally since we have all songs
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
  
  const handleUploadSingle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if(!songFile) return toast.error('Audio/Video file required');
    setUploading(true);
    const fd = new FormData(e.currentTarget);
    const title = fd.get('title') as string;
    const genre = fd.get('genre') as string;
    const is_for_sale = fd.get('forsale') === 'true';
    const price = is_for_sale ? parseFloat(fd.get('price') as string) : null;
    const album_id = fd.get('album_id') as string || null;
    const lyrics = fd.get('lyrics') as string;
    
    try {
      const audioExt = songFile.name.split('.').pop();
      const audioPath = `songs/${userProfile?.id}/${Date.now()}.${audioExt}`;
      const { error:ae } = await supabase.storage.from('songs').upload(audioPath, songFile);
      if(ae) throw ae;
      const { data: { publicUrl: audioUrl } } = supabase.storage.from('songs').getPublicUrl(audioPath);

      let coverUrl = null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverPath = `covers/${userProfile?.id}/${Date.now()}.${coverExt}`;
        const { error:ce } = await supabase.storage.from('covers').upload(coverPath, coverFile);
        if(!ce) {
          coverUrl = supabase.storage.from('covers').getPublicUrl(coverPath).data.publicUrl;
        }
      }

      if (mode === 'snippet') {
        const { error } = await supabase.from('moto_feed').insert({
          artist_id: userProfile?.id,
          title, caption: lyrics, media_url: audioUrl, is_video: songFile.type.startsWith('video/'),
          cover_url: coverUrl
        });
        if(error) throw error;
      } else {
        const { error } = await supabase.from('songs').insert({
          artist_id: userProfile?.id,
          title, genre, lyrics, audio_url: audioUrl, cover_url: coverUrl,
          is_for_sale, price, album_id, approved: false, plays: 0
        });
        if(error) throw error;
      }
      
      toast.success(mode === 'snippet' ? 'Moto Feed snippet uploaded!' : 'Upload complete! Under review.');
      setMode('single');
      setSongFile(null);
      setCoverFile(null);
      onComplete();
    } catch(err:any) {
      toast.error("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAlbum = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if(albumFiles.length === 0) return toast.error('At least one track required for an album.');
    if(!coverFile) return toast.error('Album cover art required.');
    
    setUploading(true);
    const fd = new FormData(e.currentTarget);
    const title = fd.get('title') as string;
    const genre = fd.get('genre') as string;
    
    try {
      // 1. Upload Album Cover
      const coverExt = coverFile.name.split('.').pop();
      const coverPath = `covers/${userProfile?.id}/album-${Date.now()}.${coverExt}`;
      const { error:ce } = await supabase.storage.from('covers').upload(coverPath, coverFile);
      if(ce) throw ce;
      const { data: { publicUrl: coverUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath);

      // 2. Create Album Record
      const { data: albumData, error: albumError } = await supabase.from('albums').insert({
        artist_id: userProfile?.id,
        title, cover_url: coverUrl, release_year: new Date().getFullYear(),
        genre
      }).select().single();
      
      if(albumError) throw albumError;

      // 3. Upload Songs in parallel
      toast.loading(`Uploading ${albumFiles.length} tracks...`);
      const songUploads = albumFiles.map(async (file, index) => {
        const audioExt = file.name.split('.').pop();
        const audioPath = `songs/${userProfile?.id}/alb-${albumData.id}-${index}-${Date.now()}.${audioExt}`;
        const { error:ae } = await supabase.storage.from('songs').upload(audioPath, file);
        if(ae) throw ae;
        
        const { data: { publicUrl: audioUrl } } = supabase.storage.from('songs').getPublicUrl(audioPath);
        
        return {
          artist_id: userProfile?.id,
          album_id: albumData.id,
          title: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' '), // fallback title from filename
          audio_url: audioUrl,
          cover_url: coverUrl,
          genre: genre,
          approved: false,
          plays: 0
        };
      });

      const songsToInsert = await Promise.all(songUploads);
      const { error: insertError } = await supabase.from('songs').insert(songsToInsert);
      if(insertError) throw insertError;
      
      toast.dismiss();
      toast.success('Album and all tracks uploaded successfully!');
      setMode('single');
      setAlbumFiles([]);
      setCoverFile(null);
      onComplete();
    } catch(err:any) {
      toast.dismiss();
      toast.error("Album Upload Failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-4 text-center md:text-left">
        <h2 className="text-3xl font-studio font-black flex items-center justify-center md:justify-start gap-3 mb-2 uppercase italic"><Upload className="text-smash-purple" /> Upload Music</h2>
        <p className="text-smash-gray text-sm font-medium">Distribute your sounds to the world. High quality files only.</p>
      </div>

      <div className="flex flex-wrap bg-white/5 p-1 rounded-full w-fit mx-auto md:mx-0 mb-6 gap-1 border border-white/5">
        <button onClick={()=>setMode('single')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mode==='single'?'bg-smash-purple text-white shadow-lg':'text-smash-gray hover:text-white'}`}>Single Track</button>
        <button onClick={()=>{
          if (!limits.canCreateAlbums) {
            toast.error('Album uploads are available on Rising Star plan and above.');
            return;
          }
          setMode('album');
        }} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode==='album'?'bg-smash-purple text-white shadow-lg':'text-smash-gray hover:text-white'} ${!limits.canCreateAlbums ? 'opacity-50 cursor-not-allowed' : ''}`}>
           {!limits.canCreateAlbums && <AppLockIcon size={12}/>} Full Album
        </button>
        <button onClick={()=>{
          if (!limits.canPostSnippets) {
            toast.error('Moto Feed snippets are available on Rising Star plan and above.');
            return;
          }
          setMode('snippet');
        }} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode==='snippet'?'bg-smash-purple text-white shadow-lg':'text-smash-gray hover:text-white'} ${!limits.canPostSnippets ? 'opacity-50 cursor-not-allowed' : ''}`}>
           {!limits.canPostSnippets ? <AppLockIcon size={12}/> : <Flame size={14}/>} Feed Snippet
        </button>
      </div>

      <div className="bg-white/5 border border-white/5 rounded-[40px] p-6 md:p-10 shadow-2xl">
         {hasReachedLimit && mode === 'single' ? (
           <div className="text-center p-10 bg-smash-red/10 border border-smash-red/20 rounded-3xl">
             <AlertCircle className="mx-auto mb-4 text-smash-red" size={40} />
             <h3 className="text-xl font-bold text-white mb-2">Upload Limit Reached</h3>
             <p className="text-sm text-smash-gray mb-6 max-w-md mx-auto">
              {isFree 
                ? "You've used all 3 free upload slots. Subscribe to Rising Star or higher to unlock more uploads and premium features."
                : `You've reached your monthly limit of ${limits.monthlyLimit} songs for the Rising Star plan.`}
             </p>
             <button onClick={() => setActiveTab('subscription')} className="px-6 py-3 bg-smash-purple text-white font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-white hover:text-smash-purple transition-colors">
               View Subscription Plans
             </button>
           </div>
         ) : mode === 'album' ? (
           <form onSubmit={handleUploadAlbum} className="space-y-6 grid md:grid-cols-5 gap-10 text-left">
              <div className="md:col-span-3 space-y-6">
                 <div>
                    <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-3">Album Title *</label>
                    <input name="title" required placeholder="THE RECOVERY" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-smash-purple transition-all placeholder:text-white/20" />
                 </div>
                 <div>
                    <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-3">Album Genre *</label>
                    <select name="genre" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-smash-purple transition-all appearance-none cursor-pointer">
                      <option value="">Select album genre</option>
                      <option value="Afropop">Afropop</option>
                      <option value="Gospel">Gospel</option>
                      <option value="Hip Hop">Hip Hop</option>
                      <option value="R&B">R&B</option>
                      <option value="Compilation">Compilation</option>
                    </select>
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-3">Select All Tracks (Multiple MP3s) *</label>
                    <div className="relative">
                       <input 
                         type="file" 
                         required 
                         multiple
                         accept="audio/*" 
                         onChange={e=>setAlbumFiles(Array.from(e.target.files || []))} 
                         className="w-full text-xs font-black text-smash-gray file:mr-6 file:py-3 file:px-8 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-smash-purple file:text-white hover:file:bg-white hover:file:text-smash-purple transition-all cursor-pointer bg-white/5 border border-white/10 rounded-2xl p-2" 
                       />
                    </div>
                    {albumFiles.length > 0 && (
                      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mb-3">{albumFiles.length} Tracks Selected:</p>
                        {albumFiles.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-xs font-bold text-white/60">
                             <Music2 size={12} className="text-smash-purple" /> {f.name}
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
              <div className="md:col-span-2 space-y-6">
                 <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-1">Album Art *</label>
                 <div className="aspect-square bg-white/5 border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-smash-purple transition-all relative overflow-hidden group" onClick={()=>document.getElementById('cover-file')?.click()}>
                   {coverFile ? (
                      <img src={URL.createObjectURL(coverFile)} className="absolute inset-0 w-full h-full object-cover" />
                   ):(
                      <>
                        <ImageIcon size={40} className="text-white/20 mb-4 group-hover:text-smash-purple transition-colors" />
                        <p className="text-xs font-black uppercase tracking-widest text-white">Select Cover</p>
                        <p className="text-[10px] text-smash-gray mt-2 uppercase tracking-widest font-bold">1:1 High Res</p>
                      </>
                   )}
                   <input required id="cover-file" type="file" accept="image/*" onChange={e=>setCoverFile(e.target.files?.[0]||null)} className="hidden" />
                 </div>

                 <button disabled={uploading || albumFiles.length === 0} type="submit" className="w-full py-5 bg-smash-purple text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white hover:text-smash-purple active:scale-95 transition-all text-xs disabled:opacity-50 shadow-xl shadow-smash-purple/20">
                    {uploading ? 'UPLOADING ALBUM...' : 'UPLOAD FULL ALBUM'}
                 </button>
                 <p className="text-[10px] text-center text-smash-gray font-bold italic uppercase tracking-widest leading-relaxed">Tracks will be named after file names. You can edit them later in the Songs tab.</p>
              </div>
           </form>
         ) : (
           <form onSubmit={handleUploadSingle} className="space-y-6 grid md:grid-cols-5 gap-10 text-left">
              <div className="md:col-span-3 space-y-6">
                 <div>
                    <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-3">{mode === 'snippet' ? 'Snippet Title *' : 'Track Title *'}</label>
                    <input name="title" required placeholder="Enter track name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-smash-purple transition-all placeholder:text-white/20" />
                 </div>
                 {mode === 'single' && (
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-3">Genre *</label>
                      <select name="genre" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-smash-purple transition-all appearance-none cursor-pointer">
                        <option value="">Select genre</option>
                        <option value="Afropop">Afropop</option>
                        <option value="Gospel">Gospel</option>
                        <option value="Hip Hop">Hip Hop</option>
                        <option value="R&B">R&B</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-3">Add to Album</label>
                      <select name="album_id" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-smash-purple transition-all appearance-none cursor-pointer">
                        <option value="">No album (Single)</option>
                        {albums.map((al:any)=><option key={al.id} value={al.id}>{al.title}</option>)}
                      </select>
                    </div>
                 </div>
                 )}
                 {mode === 'single' && (
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-3">Release Type</label>
                      <select name="forsale" 
                              className={`w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer ${!limits.canSellSongs ? 'opacity-50 border-smash-red/30 cursor-not-allowed' : 'focus:border-smash-purple'}`}
                              disabled={!limits.canSellSongs}
                              onChange={(e) => {
                                if (e.target.value === 'true' && !limits.canSellSongs) {
                                  toast.error('Selling songs is available on Rising Star plan and above.');
                                }
                              }}
                      >
                        <option value="false">Free Stream Only</option>
                        {limits.canSellSongs && <option value="true">Paid Download (Buy)</option>}
                      </select>
                      {!limits.canSellSongs && <p className="text-[10px] text-smash-red/70 mt-2 font-bold uppercase tracking-widest"><AppLockIcon size={10} className="inline mr-1"/> Unlock paid downloads</p>}
                    </div>
                    <div>
                      <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-3">Set Price (MWK)</label>
                      <input name="price" type="number" placeholder="2500" min="100" disabled={!limits.canSellSongs} className={`w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none transition-all placeholder:text-white/20 ${!limits.canSellSongs ? 'opacity-50 cursor-not-allowed' : 'focus:border-smash-purple'}`} />
                    </div>
                 </div>
                 )}
                 <div>
                    <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-3">{mode === 'snippet' ? 'Post Caption' : 'Lyrics'}</label>
                    <textarea name="lyrics" rows={3} placeholder={mode==='snippet'?"Say something about this snippet...":"Paste your lyrics here..."} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-smash-purple transition-all resize-none placeholder:text-white/20" />
                 </div>
                 <div>
                    <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-3">{mode === 'snippet' ? 'Select Media *' : 'Audio (MP3 Only) *'}</label>
                    <div className="relative">
                      <input type="file" required accept={mode === 'snippet' ? "audio/*,video/*" : "audio/*"} onChange={e=>setSongFile(e.target.files?.[0]||null)} className="w-full text-xs font-black text-smash-gray file:mr-6 file:py-3 file:px-8 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-smash-purple file:text-white hover:file:bg-white hover:file:text-smash-purple transition-all cursor-pointer bg-white/5 border border-white/10 rounded-2xl p-2" />
                    </div>
                 </div>
              </div>
              
              <div className="md:col-span-2 space-y-6">
                 {mode !== 'album' && (
                 <>
                 <label className="text-[10px] text-smash-purple font-black uppercase tracking-[0.2em] block mb-1">Track Artwork</label>
                 <div className="aspect-square bg-white/5 border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-smash-purple transition-all relative overflow-hidden group shadow-inner" onClick={()=>document.getElementById('cover-file')?.click()}>
                   {coverFile ? (
                      <img src={URL.createObjectURL(coverFile)} className="absolute inset-0 w-full h-full object-cover" />
                   ):(
                      <>
                        <ImageIcon size={40} className="text-white/20 mb-4 group-hover:text-smash-purple transition-colors" />
                        <p className="text-xs font-black uppercase tracking-widest">Select Artwork</p>
                        <p className="text-[10px] text-smash-gray mt-2 uppercase tracking-widest font-bold">Square Image</p>
                      </>
                   )}
                   <input id="cover-file" type="file" accept="image/*" onChange={e=>setCoverFile(e.target.files?.[0]||null)} className="hidden" />
                 </div>
                 </>
                 )}

                 <button disabled={uploading} type="submit" className="w-full py-5 bg-smash-purple text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white hover:text-smash-purple active:scale-95 transition-all text-xs disabled:opacity-50 shadow-xl shadow-smash-purple/20">
                    {uploading ? 'PROCESSING...' : (mode === 'snippet' ? 'POST TO FEED' : 'UPLOAD TO STUDIO')}
                 </button>
              </div>
           </form>
         )}
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
      <h2 className="text-3xl font-studio font-black flex items-center justify-start gap-4 uppercase italic"><UserCircle className="text-smash-purple" /> Studio Settings</h2>
      <form onSubmit={handleSave} className="bg-white/5 border border-white/5 rounded-[40px] p-8 md:p-12 space-y-8 shadow-2xl">
         <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black text-smash-purple tracking-[0.2em] block ml-2">Studio Avatar</label>
              <div 
                className="aspect-square w-40 rounded-full border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-2 cursor-pointer hover:border-smash-purple transition-all relative overflow-hidden group shadow-2xl mx-auto md:mx-0"
                onClick={() => document.getElementById('artist-avatar-input')?.click()}
              >
                <img 
                  src={avatarFile ? URL.createObjectURL(avatarFile) : (userProfile?.avatar_url || "https://placehold.co/160")} 
                  className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform" 
                />
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload size={24} className="text-white mb-1" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Change</span>
                </div>
                <input id="artist-avatar-input" type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] || null)} className="hidden" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black text-smash-purple tracking-[0.2em] block ml-2">Studio Banner</label>
              <div 
                className="h-40 w-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-2 cursor-pointer hover:border-smash-purple transition-all relative overflow-hidden group shadow-2xl"
                onClick={() => document.getElementById('artist-banner-input')?.click()}
              >
                <img 
                  src={bannerFile ? URL.createObjectURL(bannerFile) : (userProfile?.banner_url || "https://placehold.co/800x200")} 
                  className="w-full h-full rounded-xl object-cover group-hover:scale-105 transition-transform" 
                />
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload size={24} className="text-white mb-1" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Upload Banner</span>
                </div>
                <input id="artist-banner-input" type="file" accept="image/*" onChange={e => setBannerFile(e.target.files?.[0] || null)} className="hidden" />
              </div>
            </div>
         </div>
         <div className="grid grid-cols-2 gap-6">
            <div>
               <label className="text-[10px] uppercase font-black text-smash-purple tracking-[0.2em] mb-3 block">Full Legal Name</label>
               <input name="full_name" defaultValue={userProfile?.full_name} className="w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-sm font-bold outline-none focus:border-smash-purple transition-all" />
            </div>
            <div>
               <label className="text-[10px] uppercase font-black text-smash-purple tracking-[0.2em] mb-3 block">Stage/Artist Name</label>
               <input name="stage_name" defaultValue={userProfile?.stage_name} className="w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-sm font-bold outline-none focus:border-smash-purple transition-all" />
            </div>
         </div>
         <div className="grid grid-cols-2 gap-6">
            <div>
               <label className="text-[10px] uppercase font-black text-smash-purple tracking-[0.2em] mb-3 block">Phone Number (Withdrawals)</label>
               <input 
                 name="phone" 
                 defaultValue={userProfile?.phone} 
                 disabled={!!userProfile?.phone}
                 placeholder="+265..."
                 className={`w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-sm font-bold outline-none focus:border-smash-purple transition-all ${userProfile?.phone ? 'opacity-50 cursor-not-allowed' : ''}`} 
               />
               {userProfile?.phone && (
                 <p className="text-[9px] text-smash-gray mt-2 font-bold uppercase tracking-widest italic">Locked for security. Contact support to change.</p>
               )}
            </div>
            <div>
               <label className="text-[10px] uppercase font-black text-smash-purple tracking-[0.2em] mb-3 block">Core Genre</label>
               <select name="genre" defaultValue={userProfile?.genre} className="w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-sm font-bold outline-none focus:border-smash-purple transition-all appearance-none cursor-pointer">
                 <option>Afropop</option><option>Gospel</option><option>Hip Hop</option><option>R&B</option>
               </select>
            </div>
            <div>
               <label className="text-[10px] uppercase font-black text-smash-purple tracking-[0.2em] mb-3 block">City / Location</label>
               <input name="location" defaultValue={userProfile?.location} className="w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-sm font-bold outline-none focus:border-smash-purple transition-all" />
            </div>
         </div>
         <div>
            <label className="text-[10px] uppercase font-black text-smash-purple tracking-[0.2em] mb-3 block">Artist Bio</label>
            <textarea name="bio" rows={4} defaultValue={userProfile?.bio} className="w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-sm font-bold outline-none focus:border-smash-purple transition-all resize-none placeholder:text-white/20" placeholder="Tell your fans about yourself..." />
         </div>
         <div className="grid grid-cols-2 gap-6">
            <div>
               <label className="text-[10px] uppercase font-black text-smash-purple tracking-[0.2em] mb-3 block">IG Handle</label>
               <input name="instagram" defaultValue={userProfile?.instagram} className="w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-sm font-bold outline-none focus:border-smash-purple transition-all placeholder:text-white/20" placeholder="@handle" />
            </div>
            <div>
               <label className="text-[10px] uppercase font-black text-smash-purple tracking-[0.2em] mb-3 block">X / Twitter Handle</label>
               <input name="twitter" defaultValue={userProfile?.twitter} className="w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-sm font-bold outline-none focus:border-smash-purple transition-all placeholder:text-white/20" placeholder="@handle" />
            </div>
         </div>
         <button disabled={saving} type="submit" className="w-full py-5 bg-smash-purple text-white font-black uppercase tracking-[0.2em] rounded-2xl mt-4 hover:bg-white hover:text-smash-purple transition-all shadow-xl shadow-smash-purple/20 active:scale-95">
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
        <h2 className="text-4xl font-studio font-black mb-4 uppercase italic"><Sparkles className="inline text-smash-purple mr-3 mb-2"/> Studio Access</h2>
        <p className="text-smash-gray text-lg font-medium">Choose a level that matches your career goals.</p>
        {isPending && (
          <div className="mt-6 p-6 bg-smash-purple/10 border border-smash-purple/20 rounded-[32px] max-w-2xl mx-auto">
             <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-full bg-smash-purple/20 flex items-center justify-center shrink-0">
                   <ShieldCheck className="text-smash-purple" />
                </div>
                <div>
                   <p className="text-sm font-black uppercase tracking-widest text-white mb-1">Pending Application</p>
                   <p className="text-xs font-medium text-smash-gray leading-relaxed text-left">You can still subscribe to unlock Studio features! <span className="text-smash-purple font-bold">Subscribing while pending grants instant approval</span> so you can start distributing your music immediately.</p>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="p-5 bg-smash-green/10 border border-smash-green/20 rounded-2xl text-center shadow-inner">
         <p className="text-xs font-black uppercase tracking-[0.2em] text-smash-green"><i className="fas fa-check-circle mr-2"></i> Current Status: <strong>{currentTier === 'free' ? (isPending ? 'PENDING' : 'FREE') : currentTier.replace('_', ' ').toUpperCase()}</strong></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
         <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 hover:border-smash-purple/30 transition-all flex flex-col group relative overflow-hidden">
            <h4 className="font-studio font-black text-xl mb-4 italic uppercase tracking-tight group-hover:text-smash-purple transition-colors text-left">🚀 RISING STAR</h4>
            <div className="flex items-baseline gap-1 mb-8">
               <span className="text-[10px] font-black text-smash-gray uppercase tracking-widest">MWK</span>
               <span className="text-5xl font-studio font-black italic">15,000</span>
               <span className="text-[10px] font-black text-smash-gray uppercase tracking-widest">/YR</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-start gap-2 text-sm text-smash-gray"><CheckCircle2 size={16} className="text-smash-orange mt-0.5" /> Upload up to 10 songs/month</li>
               <li className="flex items-start gap-2 text-sm text-smash-gray"><CheckCircle2 size={16} className="text-smash-orange mt-0.5" /> Basic analytics</li>
               <li className="flex items-start gap-2 text-sm text-smash-gray"><CheckCircle2 size={16} className="text-smash-orange mt-0.5" /> Airtel/TNM withdrawals</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('RisingStar')} 
              disabled={currentTier === 'rising_star'}
              className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-smash-orange hover:text-white transition-colors disabled:opacity-50 disabled:bg-white/10 disabled:text-white/50"
            >
              {currentTier === 'rising_star' ? 'Current Plan' : 'Subscribe — MWK 15,000/yr'}
            </button>
         </div>
         
         <div className="bg-white/5 border-2 border-smash-orange rounded-3xl p-10 relative flex flex-col">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-smash-orange text-white text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full">Most Popular</div>
            <h4 className="font-display font-black text-lg mb-2">⭐ Standard</h4>
            <div className="flex items-baseline gap-1 mb-6">
               <span className="text-sm font-bold text-smash-gray">MK</span>
               <span className="text-4xl font-display font-black">25,000</span>
               <span className="text-xs font-bold text-smash-gray">/yr</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-start gap-2 text-sm text-smash-gray"><CheckCircle2 size={16} className="text-smash-orange mt-0.5" /> Unlimited uploads</li>
               <li className="flex items-start gap-2 text-sm text-smash-gray"><CheckCircle2 size={16} className="text-smash-orange mt-0.5" /> Full analytics dashboard</li>
               <li className="flex items-start gap-2 text-sm text-smash-gray"><CheckCircle2 size={16} className="text-smash-orange mt-0.5" /> Priority support</li>
               <li className="flex items-start gap-2 text-sm text-smash-gray"><CheckCircle2 size={16} className="text-smash-orange mt-0.5" /> Album creation</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('Standard')}
              disabled={currentTier === 'standard'}
              className="w-full py-3 bg-smash-orange text-white font-bold uppercase tracking-widest text-xs rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-smash-orange/20 disabled:opacity-50 disabled:bg-smash-orange/50"
            >
              {currentTier === 'standard' ? 'Current Plan' : 'Subscribe — MWK 25,000/yr'}
            </button>
         </div>

         <div className="bg-white/5 border border-white/10 rounded-3xl p-10 hover:border-white/30 transition-colors flex flex-col">
            <h4 className="font-display font-black text-lg mb-2">👑 Elite/Label</h4>
            <div className="flex items-baseline gap-1 mb-6">
               <span className="text-sm font-bold text-smash-gray">MK</span>
               <span className="text-4xl font-display font-black">45,000</span>
               <span className="text-xs font-bold text-smash-gray">/yr</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-start gap-2 text-sm text-smash-gray"><CheckCircle2 size={16} className="text-smash-orange mt-0.5" /> Everything in Standard</li>
               <li className="flex items-start gap-2 text-sm text-smash-gray"><CheckCircle2 size={16} className="text-smash-orange mt-0.5" /> Multiple artist management</li>
               <li className="flex items-start gap-2 text-sm text-smash-gray"><CheckCircle2 size={16} className="text-smash-orange mt-0.5" /> Dedicated account manager</li>
            </ul>
            <button 
              onClick={() => handleSubscribe('Elite')}
              disabled={currentTier === 'elite'}
              className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-smash-orange hover:text-white transition-colors disabled:opacity-50 disabled:bg-white/10 disabled:text-white/50"
            >
              {currentTier === 'elite' ? 'Current Plan' : 'Subscribe — MWK 45,000/yr'}
            </button>
         </div>
      </div>
    </div>
  );
};

