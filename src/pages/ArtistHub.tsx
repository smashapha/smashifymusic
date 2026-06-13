import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, BarChart2, Music2, Upload, Wallet, UserCircle, Settings, 
  TrendingUp, Users, Play, DollarSign, Plus, Trash2, 
  Edit3, CircleCheck, AlertCircle, AlertTriangle, Sparkles, ChevronRight,
  Smartphone, Image as ImageIcon, FileAudio, Info, Flame,
  Disc, LogOut, ArrowLeft, ArrowRight, Menu, Clock, ExternalLink, ShieldCheck,
  ShoppingBag, Heart, Lock as AppLockIcon, X, Bell, Rocket, Star,
  Calendar, Globe2, UserPlus, Info as InfoIcon, UploadCloud, Receipt, BookOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Song, Album } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { BottomNav } from '../components/common/MainLayout';
import { useUploadGuard } from '../hooks/useUploadGuard';
import { getArtistTier, getTierLimits, getSongsUploadedThisMonth } from '../lib/tierUtils';
import { requestPayout, upgradeArtistTier, payForAdCampaign } from '../lib/paychangu';

type TabType = 'dashboard' | 'music' | 'upload' | 'promotion' | 'profile' | 'subscription' | 'notifications' | 'transactions' | 'withdraw' | 'analytics' | 'fans';

const NotificationsTab = ({ userProfile }: any) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const markAllRead = async () => {
    if (!userProfile?.id) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('profile_id', userProfile.id)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    fetchNotifications().then(() => {
      // Mark all as read after fetching
      markAllRead();
    });
  }, [userProfile?.id]);

  useEffect(() => {
    if (!userProfile?.id) return;
    const channel = supabase
      .channel(`artist-notifs-${userProfile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `profile_id=eq.${userProfile.id}`
      }, (payload) => {
        setNotifications(prev =>
          prev.some(n => n.id === payload.new.id)
            ? prev
            : [payload.new, ...prev]
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfile?.id]);

  const fetchNotifications = async () => {
    if (!userProfile?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', userProfile.id)
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

import { TransactionsTab } from '../components/artist/TransactionsTab';
import { WithdrawTab } from '../components/artist/WithdrawTab';

export default function ArtistHub() {
  const { userProfile, role, signOut } = useAuth();
  
  const canSellTracks = ['Elite', 'elite', 'Label', 'label'].includes(
    userProfile?.artist_tier || ''
  );

  const artistTier = useMemo(() => getArtistTier(userProfile), [
    userProfile?.artist_tier,
    userProfile?.subscription_tier,
    userProfile?.subscription_ends,
  ]);
  const artistLimits = useMemo(() => getTierLimits(userProfile), [
    userProfile?.artist_tier,
    userProfile?.subscription_tier,
    userProfile?.subscription_ends,
    userProfile?.extra_track_slots,
  ]);
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

  const [artistNotifications, setArtistNotifications] = useState<any[]>([]);
  const unreadNotifCount = artistNotifications.filter(n => !n.read).length;

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'notifications') {
      setArtistNotifications([]); // Clear badge count
      supabase
        .from('notifications')
        .update({ read: true })
        .eq('profile_id', userProfile?.id)
        .eq('read', false)
        .then(() => {});
    }
  };

  const expiresAt = userProfile?.subscription_ends || userProfile?.subscription_expires_at || userProfile?.tier_expires_at;
  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const daysRemaining = expiresDate ? Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
  const isExpiringSoon = expiresDate && 
    (userProfile?.subscription_tier || userProfile?.artist_tier || 'free').toLowerCase() !== 'free' &&
    daysRemaining > 0 && 
    daysRemaining <= 7;

  useEffect(() => {
    if (userProfile?.id) fetchData();
  }, [userProfile]);

  useEffect(() => {
    const update = () => {
      document.documentElement.style.setProperty(
        '--sidebar-width',
        window.innerWidth >= 1024 ? '256px' : '0px'
      );
      document.documentElement.style.setProperty(
        '--content-margin',
        window.innerWidth >= 1024 ? '256px' : '0px'
      );
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      // Reset to MainLayout defaults when leaving ArtistHub
      document.documentElement.style.setProperty('--sidebar-width', '240px');
      document.documentElement.style.setProperty('--content-margin', '240px');
    };
  }, []);

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
        .from('fan_purchases')
        .select('amount')
        .in('song_id', songsData?.map(s => s.id) || []);
      
      const totalRevenue = totalSales?.reduce((acc, s) => acc + (s.amount || 0), 0) || 0;

      const { data: notifData } = await supabase
        .from('notifications')
        .select('id, read')
        .eq('profile_id', userProfile.id)
        .eq('read', false);
      setArtistNotifications(notifData || []);

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

  useEffect(() => {
    if (!userProfile?.id) return;
    const channel = supabase
      .channel(`artist-hub-notifs-${userProfile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `profile_id=eq.${userProfile.id}`
      }, (payload) => {
        setArtistNotifications(prev => [...prev, payload.new]);
        toast(`🔔 ${payload.new.message}`, { duration: 4000 });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfile?.id]);

  const navGroups = [
    {
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
        { id: 'music', label: 'Music', icon: Music2 },
        { id: 'analytics', label: 'Analytics', icon: BarChart2 },
        { id: 'fans', label: 'Fans', icon: Users },
        { id: 'upload', label: 'Upload', icon: UploadCloud },
        { id: 'withdraw', label: 'Withdrawal', icon: Wallet },
        { id: 'promotion', label: 'Promote', icon: Flame },
        { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadNotifCount },
        { id: 'transactions', label: 'History', icon: Receipt },
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
    const t = (tier || 'free').toLowerCase();
    if (t.includes('rising')) return '🌟 Rising Star';
    if (t.includes('standard')) return '🚀 Standard';
    if (t.includes('elite')) return '👑 Elite / Label';
    return role === 'pending' ? '⏳ Pending Review' : '🎵 Free Artist';
  };

  const isApproved = userProfile?.approved ?? true; // Temporary fallback to true for UI testing

  const getPageTitle = () => {
    const allItems = navGroups.flatMap(g => g.items);
    const item = allItems.find(i => i.id === activeTab);
    return item ? item.label : 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-bg-page text-white flex overflow-hidden font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-bg-surface border-r border-white/5 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 flex flex-col`}>
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
                {artistTier !== 'elite' && (
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
                    onClick={() => { handleTabChange(item.id as TabType); setSidebarOpen(false); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === item.id 
                        ? 'bg-smash-purple/10 text-smash-purple shadow-sm' 
                        : 'text-smash-gray hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={18} className={activeTab === item.id ? 'text-smash-purple' : 'text-smash-gray'} />
                    {item.label}
                    {(item as any).count > 0 && (
                      <span className="ml-auto w-5 h-5 bg-smash-orange rounded-full text-[9px] font-black text-white flex items-center justify-center shrink-0">
                        {(item as any).count > 9 ? '9+' : (item as any).count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
            
            <div className="h-px bg-white/5 mx-3 mb-3 mt-1" />
            
            {isAdmin && (
              <Link 
                to="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/10 transition-all mb-2 border border-red-500/20 border-dashed"
              >
                <ShieldCheck size={18} /> Admin Dashboard
              </Link>
            )}

            <a 
              href="/artist-guide"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-bold text-smash-orange hover:text-white hover:bg-smash-orange/10 transition-all"
            >
              <BookOpen size={16} /> Creator Guide & Tips
            </a>

            <Link 
              to={`/artist/${userProfile?.id}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-smash-gray hover:text-smash-purple hover:bg-smash-purple/5 transition-all"
            >
              <ExternalLink size={18} /> My Public Page
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-smash-gray hover:text-red-400 hover:bg-red-500/5 transition-all text-left"
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
      <main className="flex-1 flex flex-col h-[100dvh] overflow-y-auto w-full min-w-0">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/5 bg-bg-surface/80 backdrop-blur-md z-30 shrink-0">
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
                className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
              >
                <ShieldCheck size={14} /> Admin Access
              </Link>
            )}
            {isApproved ? (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-smash-green/10 text-smash-green border border-smash-green/20 rounded-full text-xs font-bold uppercase tracking-widest">
                <CircleCheck size={12} /> Approved
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
                    You can upload up to {songLimit} songs while you wait. [{Math.min(songs.length, songLimit)}/{songLimit} slots used] — Once approved, upgrade your plan to increase your upload limits.
                  </p>
                </div>
              </div>
            )}

            {isExpiringSoon && (
              <div className="mb-6 p-4 bg-smash-orange/15 border border-smash-orange/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-smash-orange animate-pulse">
                <div className="flex items-start gap-4 flex-1">
                  <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-bold font-display uppercase tracking-wider text-[14px]">Plan Expiration Notice</p>
                    <p className="text-sm opacity-90 mt-1 font-sans">
                      Your premium artist plan is expiring in {daysRemaining} day{daysRemaining > 1 ? 's' : ''} on {new Date(expiresAt).toLocaleDateString()}. Renew or upgrade your tier to keep your verification status, exclusive analytical insights, and expanded track inventory slots active.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('subscription')}
                  className="px-5 py-2.5 bg-smash-orange text-white font-display font-semibold text-[11px] uppercase tracking-widest rounded-[10px] hover:bg-smash-orange/90 transition-all font-bold shrink-0 self-end md:self-center"
                >
                  Renew Subscription
                </button>
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
                  {activeTab === 'dashboard' && <DashboardTab stats={stats} balance={userProfile?.wallet_balance || 0} userProfile={userProfile} setActiveTab={handleTabChange} />}
                  {activeTab === 'analytics' && <AnalyticsTab userProfile={userProfile} />}
                  {activeTab === 'fans' && <FansTab userProfile={userProfile} />}
                  {activeTab === 'withdraw' && <WithdrawTab setActiveTab={handleTabChange} />}
                  {activeTab === 'music' && (
                    <div className="space-y-12">
                      <SongsTab songs={songs} onRefresh={fetchData} setActiveTab={handleTabChange} userProfile={userProfile} />
                      <div className="h-px w-full bg-white/5 my-8" />
                      <AlbumsTab albums={albums} songs={songs} onRefresh={fetchData} setActiveTab={handleTabChange} userProfile={userProfile} />
                    </div>
                  )}
                  {activeTab === 'upload' && (
                    <UploadTab onComplete={fetchData} albums={albums} songs={songs} setActiveTab={handleTabChange} role={role} />
                  )}
                  {activeTab === 'promotion' && <PromotionTab userProfile={userProfile} />}
                  {activeTab === 'profile' && <ProfileTab userProfile={userProfile} />}
                  {activeTab === 'subscription' && <SubscriptionTab userProfile={userProfile} role={role} />}
                  {activeTab === 'notifications' && <NotificationsTab userProfile={userProfile} />}
                  {activeTab === 'transactions' && <TransactionsTab userProfile={userProfile} />}
                </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
      <BottomNav />
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
          <MetricCard label="Completion" value={`${completionRate}%`} icon={<CircleCheck size={16} />} />
          <MetricCard label="Like Rate" value={`${likeRate}%`} icon={<Heart size={16} />} />
          <MetricCard label="Revenue" value={`MK ${stats.revenue.toLocaleString()}`} icon={<Wallet size={16} />} />
       </div>

       {Number(skipRate) > 50 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-[10px] p-5 flex items-start gap-4">
             <AlertCircle className="text-red-400 shrink-0 mt-1" size={24} />
             <div>
                <p className="text-red-400 font-display font-semibold uppercase tracking-widest text-[11px] mb-2">Low Hook Score Warning</p>
                <p className="text-red-400/80 text-[13px] font-sans leading-relaxed">Your tracks have a skip rate of {skipRate}%. Try uploading snippets with stronger intros or engaging captions to capture listeners in the first 5 seconds.</p>
             </div>
          </div>
           )}
     </div>
  );
};

const DashboardTab = ({ stats, balance, userProfile, setActiveTab }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const limits = useMemo(() => getTierLimits(userProfile), [
    userProfile?.artist_tier,
    userProfile?.subscription_tier,
    userProfile?.subscription_ends,
    userProfile?.extra_track_slots,
  ]);

  useEffect(() => {
    const fetchHist = async () => {
      const { data } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('artist_id', userProfile?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setHistory(data);
    };
    fetchHist();
  }, [userProfile]);

  return (
    <div className="space-y-10 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="flex-1 min-w-0">
           <h2 className="text-[24px] md:text-[32px] font-studio font-bold flex items-center gap-3 uppercase text-text-primary leading-tight"><TrendingUp className="text-smash-purple shrink-0" /> Artist <span className="text-smash-purple">Growth</span></h2>
           <p className="text-text-secondary text-[12px] md:text-[14px] font-sans mt-1 md:mt-2">Real-time performance metrics</p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => setActiveTab('upload')} className="h-[44px] px-6 bg-border-default hover:bg-border-subtle text-text-primary rounded-[10px] font-display font-semibold uppercase text-[11px] tracking-widest transition-all inline-flex items-center justify-center">New Upload</button>
           <button onClick={() => setActiveTab('promotion')} className="h-[44px] px-6 bg-smash-purple text-white font-display font-semibold uppercase tracking-widest text-[11px] rounded-[10px] hover:bg-smash-purple/90 transition-all inline-flex items-center justify-center">Promote Track</button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {userProfile?.is_admin && (
           <Link 
             to="/admin" 
             className="col-span-full p-6 bg-gradient-to-r from-red-500/20 via-smash-purple/20 to-transparent border border-red-500/30 rounded-[30px] flex items-center justify-between group hover:border-red-500 transition-all shadow-2xl shadow-red-500/10"
           >
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={32} />
                 </div>
                 <div>
                    <h3 className="text-xl font-studio font-black uppercase italic text-white leading-tight">Terminal Control</h3>
                    <p className="text-[10px] text-red-400 font-black uppercase tracking-[0.3em] mt-1">Platform Moderation & Payout Engine</p>
                 </div>
              </div>
              <div className="flex items-center gap-3 pr-4">
                 <span className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-white transition-colors">Enter System</span>
                 <ArrowRight className="text-red-400 group-hover:translate-x-2 transition-transform" />
              </div>
           </Link>
        )}
         <MetricCard
            label="TOTAL STREAMS"
            value={stats.streams.toLocaleString()}
            icon={<Play size={20} />}
            color="text-smash-cyan"
            sub="NOT tied to earnings"
         />
         <MetricCard
            label="TOTAL EARNINGS"
            value={`MK ${(stats.revenue || 0).toLocaleString()}`}
            icon={<DollarSign size={20} />}
            color="text-smash-green"
            sub="Lifetime earnings"
         />
         <MetricCard
            label="TOTAL FANS"
            value={(stats.followers || 0).toLocaleString()}
            icon={<Heart size={20} />}
            color="text-smash-purple"
            sub="Followers on Smashify"
         />
         <MetricCard
            label="ACTIVE TRACKS"
            value={stats.songs || 0}
            icon={<Music2 size={20} />}
            color="text-white"
            sub="Currently distributed"
         />
      </div>

      <div className="bg-bg-surface border border-border-default rounded-[14px] p-6 lg:p-8 shadow-sm">
        <h3 className="font-bold text-white mb-4">Catalog Health</h3>
        <CatalogHealthWidget artistId={userProfile?.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Wallet Control */}
         <div className="lg:col-span-2 space-y-8">
            <div className="bg-bg-surface border border-border-default rounded-[14px] p-8 md:p-10 relative overflow-hidden group shadow-sm min-h-[300px]">
               {stats.revenue === 0 ? (
                  <div className="relative z-10 flex flex-col items-center justify-center text-center h-full space-y-4 py-8">
                    <div className="w-16 h-16 bg-smash-purple/10 rounded-full flex items-center justify-center mb-2">
                       <DollarSign className="w-8 h-8 text-smash-purple" />
                    </div>
                    <h3 className="text-2xl font-bold text-text-primary">No earnings yet</h3>
                    <p className="text-text-secondary max-w-sm mx-auto">
                      Start promoting your tracks and engage with your fans to earn from tips, purchases, and subscriptions. Your withdrawable balance will appear here.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-center">
                       <button onClick={() => setActiveTab('promotion')} className="px-6 py-3 bg-smash-purple text-white font-bold text-sm uppercase tracking-widest rounded-[10px] hover:bg-smash-purple/90 transition-colors">
                          Promote Your Music
                       </button>
                       <button onClick={() => setActiveTab('withdraw')} className="px-6 py-3 bg-bg-elevated border border-border-default text-text-primary font-bold text-sm uppercase tracking-widest rounded-[10px] hover:bg-border-default transition-colors">
                          View Wallet Tab &rarr;
                       </button>
                    </div>
                  </div>
               ) : (
                 <>
                   <div className="absolute top-0 right-0 w-64 h-64 bg-smash-purple/10 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
                   <div className="relative z-10 flex flex-col items-center justify-center gap-4 py-4">
                     <div className="text-center">
                       <p className="text-[clamp(1.8rem,7vw,4.5rem)] font-studio font-bold text-smash-green leading-none">
                         MK {balance.toLocaleString()}
                       </p>
                       <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mt-2">
                         Available Balance
                       </p>
                     </div>
                     <button
                       onClick={() => setActiveTab('withdraw')}
                       disabled={balance < 2000}
                       className="w-full max-w-sm h-12 bg-smash-green text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 hover:brightness-110 transition-all shadow-lg shadow-smash-green/20 mt-4"
                     >
                       {balance < 2000 ? `Min MK 2,000 required` : `Withdraw Earnings`}
                     </button>
                   </div>
                 </>
               )}
            </div>

            <div className="bg-bg-surface border border-border-default rounded-[14px] p-6 lg:p-8 shadow-sm">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-[20px] font-studio font-bold uppercase tracking-tight text-text-primary">Recent <span className="text-smash-purple">Payouts</span></h3>
                  <button className="text-[11px] font-display font-medium uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors">See Ledger &rarr;</button>
               </div>
               <div className="space-y-3">
                  {history.length > 0 ? history.map((payout, i) => {
                     const statusBadge = (status: string) => {
                         const styles: Record<string, string> = {
                           pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                           approved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                           paid: 'bg-smash-green/10 text-smash-green border-smash-green/20',
                           rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
                         };
                         const labels: Record<string, string> = {
                           pending: '⏳ Pending',
                           approved: '✓ Approved',
                           paid: '✅ Paid — Check your phone',
                           rejected: '✗ Rejected',
                         };
                         return (
                           <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${styles[status] || styles.pending}`}>
                             {labels[status] || status}
                           </span>
                         );
                     };

                     return (
                     <div key={payout.id} className="flex items-center gap-5 p-4 md:p-5 bg-bg-elevated rounded-[10px] group transition-colors cursor-default border border-transparent hover:border-border-default hover:bg-bg-elevated/80 h-auto min-h-[60px]">
                        <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 border bg-smash-orange/10 text-smash-orange border-smash-orange/20">
                           <Wallet size={16} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                           <div className="flex items-center gap-2">
                             <p className="font-display font-medium text-[13px] text-text-primary uppercase tracking-wide truncate">WITHDRAWAL</p>
                             {statusBadge(payout.status)}
                           </div>
                           <p className="text-[11px] text-text-muted font-sans mt-0.5">{new Date(payout.created_at).toLocaleString('en-MW', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                           {payout.status === 'rejected' && payout.admin_note && (
                             <p className="text-xs text-red-400 mt-1">Reason: {payout.admin_note}</p>
                           )}
                           {payout.status === 'paid' && payout.admin_note && (
                             <p className="text-xs text-smash-green/80 mt-1">Note: {payout.admin_note}</p>
                           )}
                        </div>
                        <div className="text-right flex flex-col justify-center h-full">
                           <p className="text-[14px] font-sans font-black text-white/80">
                              -MK {Number(payout.amount || payout.requested_amount || 0).toLocaleString()}
                           </p>
                           <p className="text-[11px] font-sans text-smash-orange mt-0.5">
                              Fee: MK {Math.round(Number(payout.amount || payout.requested_amount || 0) * 0.03).toLocaleString()}
                           </p>
                           <p className="text-[12px] font-display font-bold text-smash-green mt-0.5 uppercase tracking-widest">
                              Net: MK {Math.round(Number(payout.amount || payout.requested_amount || 0) * 0.97).toLocaleString()}
                           </p>
                        </div>
                     </div>
                  )}) : (
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
  const [useFreePlacement, setUseFreePlacement] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [advertiserName, setAdvertiserName] = useState(userProfile?.stage_name || '');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [targetCity, setTargetCity] = useState('');
  const [targetGenre, setTargetGenre] = useState('');
  const [playsPurchased, setPlaysPurchased] = useState(1000);

  const limits = useMemo(() => getTierLimits(userProfile), [
    userProfile?.artist_tier,
    userProfile?.subscription_tier,
    userProfile?.subscription_ends,
    userProfile?.extra_track_slots,
  ]);
  const freeLimit = limits?.freeFeaturements || 0;

  const currentMonthCampaigns = ads.filter(ad => {
    if (!ad.created_at) return false;
    const d = new Date(ad.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const remainingFreePlacements = Math.max(0, freeLimit - currentMonthCampaigns.length);

  const pricePerPlay = 5; // 1000 plays = 5000 MK
  const totalCost = useFreePlacement ? 0 : playsPurchased * pricePerPlay;

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

      // 2. Clear toast before redirecting or saving
      toast.dismiss(toastId);

      // 3. Initiate PayChangu Payment or Save directly if Free Placement
      if (useFreePlacement) {
        const { error: insertError } = await supabase
          .from('audio_ads')
          .insert({
            artist_id: userProfile.id,
            type: 'promo',
            title: title,
            advertiser_name: advertiserName,
            audio_url: publicUrl,
            plays_purchased: 1000,
            plays_used: 0,
            active: false,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });

        if (insertError) throw insertError;

        toast.success('Campaign launched using your free placement slot! Pending admin review.');
        setShowForm(false);
        setAudioFile(null);
        setTitle('');
        setUseFreePlacement(false);
        fetchAds();
        setUploading(false);
        return;
      }

      await payForAdCampaign({
        artist: userProfile,
        plays: playsPurchased,
        amount: totalCost,
        audioUrl: publicUrl,
        title: title,
        advertiserName: advertiserName,
        targetCity: targetCity,
        targetGenre: targetGenre,
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
            onClick={() => {
              const artistTier = (userProfile?.artist_tier || 'Free').toLowerCase();
              if (artistTier === 'free') {
                toast.error('Ad campaigns and promotion features require a paid subscription. Please upgrade on the subscription tab.');
                return;
              }
              setUseFreePlacement(false);
              setShowForm(true);
            }}
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
                          <CircleCheck className="text-smash-green mb-2" size={24} />
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
                    
                    {remainingFreePlacements > 0 && (
                      <div className="mt-4 mb-6 flex items-center gap-3 p-3 bg-smash-purple/10 border border-smash-purple/20 rounded-[10px]">
                        <input
                          type="checkbox"
                          id="use-free-placement"
                          checked={useFreePlacement}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUseFreePlacement(checked);
                            if (checked) {
                              setPlaysPurchased(1000);
                            }
                          }}
                          className="w-4 h-4 accent-smash-purple rounded cursor-pointer"
                        />
                        <label htmlFor="use-free-placement" className="text-[12px] font-display font-semibold text-white cursor-pointer select-none">
                          🎁 Use Free Monthly Slot ({remainingFreePlacements} remaining)
                        </label>
                      </div>
                    )}
                   
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
                            {totalCost === 0 ? "FREE" : `MK ${totalCost.toLocaleString()}`}
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
                        disabled={useFreePlacement}
                        className="w-full accent-smash-purple bg-border-default h-2 rounded-full appearance-none slider-custom-thumb disabled:opacity-50"
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
                    <span className={`px-2 py-1 rounded-full text-[10px] font-display font-semibold uppercase tracking-wider ${ad.active ? 'bg-smash-green/10 text-smash-green border border-smash-green/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
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
               <p className="text-text-secondary text-[14px] font-sans mb-6">Reach more fans and grow your audience.</p>
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

const SongsTab = ({ songs, onRefresh, setActiveTab, userProfile }: any) => {
  const [filter, setFilter] = useState<'all' | 'live' | 'pending' | 'for_sale' | 'draft'>('all');
  const [catalogStats, setCatalogStats] = useState<any[] | null>(null);
  const { checkUpload, setGuardResult } = useUploadGuard();

  useEffect(() => {
    if (userProfile?.id) {
       (async () => {
         const { data } = await supabase
           .from('songs')
           .select('slot_mode, plays_this_month')
           .eq('artist_id', userProfile.id)
           .eq('is_active', true);
         setCatalogStats(data || []);
       })();
    }
  }, [userProfile?.id]);

  const extractStoragePath = (url: string, bucket: string) => {
    if(!url) return null;
    try {
      const parts = url.split(`/public/${bucket}/`);
      return parts.length > 1 ? parts[1] : null;
    } catch(e) { return null; }
  };

  const toggleSongArchive = async (songId: string, currentMode: string) => {
    const isArchived = currentMode === 'archive';
    const newMode = isArchived ? 'cold' : 'archive';
    const confirmMsg = isArchived
      ? 'Restore this song to your active slots? It will count toward your slot limit again.'
      : 'Move this song to Archive? It will no longer consume a slot. Fans can still find and play it. You can restore it anytime.';

    if (!window.confirm(confirmMsg)) return;

    const { error } = await supabase
      .from('songs')
      .update({
        slot_mode: newMode,
        vaulted_at: isArchived ? null : new Date().toISOString(),
        vaulted_reason: isArchived ? null : 'manual_archive'
      })
      .eq('id', songId);

    if (error) {
      toast.error('Failed to update song. Please try again.');
    } else {
      toast.success(isArchived ? 'Song restored to active slots.' : 'Song archived. Slot freed up.');
      onRefresh(); // Refresh song list
      // Also refresh upload guard so slot count updates immediately
      if (userProfile?.id) {
        checkUpload(userProfile.id).then(result => {
          if (setGuardResult) setGuardResult(result);
        });
      }
    }
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
    if (filter === 'draft') return s.status === 'draft';
    if (filter === 'live') return s.approved && s.status !== 'draft';
    if (filter === 'pending') return !s.approved && s.status !== 'draft';
    if (filter === 'for_sale') return s.is_for_sale && s.status !== 'draft';
    if (filter === 'all') return s.status !== 'draft';
    return true;
  });

  const formatCount = (count: number) => {
    if (!count) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  const hotCount      = catalogStats?.filter(s => s.slot_mode === 'hot').length || 0;
  const activeCount   = catalogStats?.filter(s => s.slot_mode === 'active').length || 0;
  const coldCount     = catalogStats?.filter(s => s.slot_mode === 'cold').length || 0;
  const archiveCount  = catalogStats?.filter(s => s.slot_mode === 'archive').length || 0;
  const totalSlotted  = hotCount + activeCount + coldCount;
  const efficiencyPct = totalSlotted > 0 ? Math.round(((hotCount + activeCount) / totalSlotted) * 100) : 0;

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

      {catalogStats && totalSlotted > 0 && (
        <div className="bg-bg-surface border border-border-default rounded-[14px] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">Catalog Efficiency</span>
            <span className={`text-2xl font-studio font-black ${
              efficiencyPct >= 60 ? 'text-smash-green' :
              efficiencyPct >= 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {efficiencyPct}%
            </span>
          </div>
          <div className="flex gap-4 text-[11px] font-display font-semibold uppercase tracking-widest mb-4">
             <span className="text-orange-400">🔥 {hotCount} Hot</span>
             <span className="text-smash-green">✅ {activeCount} Active</span>
             <span className="text-blue-400">🧊 {coldCount} Cold</span>
             <span className="text-text-muted">📦 {archiveCount} Archive ( free )</span>
          </div>
          {efficiencyPct < 30 && totalSlotted >= 10 && (
            <div className="bg-text-muted/10 px-4 py-3 rounded-xl border border-text-muted/20">
              <p className="text-[12px] text-text-secondary font-sans leading-relaxed">
                💡 Most of your slots have low activity. Consider a lower tier at renewal to save on costs.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-bg-surface border border-border-default rounded-[14px] overflow-hidden shadow-sm">
        <div className="p-4 md:p-6 border-b border-border-default flex gap-2 overflow-x-auto no-scrollbar">
           {[
             { id: 'all', label: 'All Catalog' },
             { id: 'live', label: 'Live Tracks' },
             { id: 'pending', label: 'Reviewing' },
             { id: 'for_sale', label: 'Premium' },
             { id: 'draft', label: 'Drafts' }
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
                  <th className="px-4 py-3 first:pl-6 last:pr-6 whitespace-nowrap">Song</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Fans</th>
                  <th className="px-4 py-3 whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 whitespace-nowrap">Earnings</th>
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
                          <div className={`w-[6px] h-[6px] rounded-full ${song.status === 'draft' ? 'bg-text-muted' : song.approved ? 'bg-smash-green' : 'bg-[#eab308] animate-pulse'}`} />
                          <span className={`text-[12px] font-display font-medium ${song.status === 'draft' ? 'text-text-muted' : song.approved ? 'text-smash-green' : 'text-[#eab308]'}`}>
                             {song.status === 'draft' ? 'Draft' : song.approved ? 'Distributed' : 'Reviewing'}
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
                       <span className={`inline-flex items-center px-2 py-1 rounded-[6px] text-[10px] font-display font-bold uppercase tracking-wider border ${song.is_for_sale ? 'bg-smash-green/10 text-smash-green border-smash-green/20' : 'bg-bg-surface text-text-secondary border-border-default'}`}>
                         {song.is_for_sale ? `MK ${song.price?.toLocaleString()}` : 'Free Feed'}
                       </span>
                       {song.slot_mode === 'archive' && (
                         <span className="text-[9px] text-text-muted block mt-1 font-display uppercase tracking-widest">
                           Free slot · Playable
                         </span>
                       )}
                       {song.slot_mode === 'cold' && (
                         <span className="text-[9px] text-text-muted block mt-1 font-display uppercase tracking-widest">
                           Auto-archives soon
                         </span>
                       )}
                    </td>
                    <td className="px-4 py-3">
                       <span className="text-[14px] font-display font-semibold text-text-primary">
                         {song.is_for_sale ? 'Processing' : '—'}
                       </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 last:pr-6 cursor-default whitespace-nowrap">
                       <button
                         onClick={(e) => { e.stopPropagation(); toggleSongArchive(song.id, song.slot_mode); }}
                         title={song.slot_mode === 'archive' ? 'Restore from Archive' : 'Move to Archive'}
                         className={`px-3 py-1.5 rounded-[8px] text-[10px] font-display font-bold uppercase tracking-wider transition-all border shrink-0 ${
                           song.slot_mode === 'archive'
                             ? 'bg-smash-green/10 text-smash-green hover:bg-smash-green/20 border-smash-green/20'
                             : 'bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-border-default border-border-default'
                         }`}
                       >
                         {song.slot_mode === 'archive' ? '↑ Restore' : '📦 Archive'}
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); toast('Edit feature coming soon'); }} className="w-8 h-8 inline-flex items-center justify-center bg-bg-surface border border-border-default text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-[8px] transition-all"><Edit3 size={14} /></button>
                       <button onClick={(e) => { e.stopPropagation(); handleDelete(song); }} className="w-8 h-8 inline-flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-[8px] transition-all"><Trash2 size={14} /></button>
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
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSongArchive(song.id, song.slot_mode); }}
                        title={song.slot_mode === 'archive' ? 'Restore' : 'Archive'}
                        className={`w-6 h-6 inline-flex items-center justify-center rounded transition-colors ${
                          song.slot_mode === 'archive'
                            ? 'bg-smash-green/10 text-smash-green'
                            : 'bg-bg-elevated text-text-secondary hover:bg-border-default'
                        }`}
                      >
                        {song.slot_mode === 'archive' ? '↑' : '📦'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(song); }} className="w-6 h-6 inline-flex items-center justify-center bg-red-500/10 text-red-400 rounded disabled:opacity-50 transition-colors"><Trash2 size={12} /></button>
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
  const limits = useMemo(() => getTierLimits(userProfile), [
    userProfile?.artist_tier,
    userProfile?.subscription_tier,
    userProfile?.subscription_ends,
    userProfile?.extra_track_slots,
  ]);

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
  const [isDrafting, setIsDrafting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [currentStep, setCurrentStep] = useState<1|2|3>(1);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string|null>(null);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [audioduration, setAudioDuration] = useState<string>('');
  const [audioFileSize, setAudioFileSize] = useState<string>('');

  const [songFile, setSongFile] = useState<File | null>(null);
  const [albumTracks, setAlbumTracks] = useState<{file: File, title: string, price: number, lyrics?: string, is_explicit?: boolean, featured_artist?: string}[]>([]);
  const [albumPricingMode, setAlbumPricingMode] = useState<'album' | 'individual'>('album');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [genre, setGenre] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [isExplicit, setIsExplicit] = useState(false);
  const [language, setLanguage] = useState('Chichewa');
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [price, setPrice] = useState(2500);
  const [isForSale, setIsForSale] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);

  const [featuredArtists, setFeaturedArtists] = useState<{
    name: string;
    profileId: string | null;
    avatarUrl: string | null;
  }[]>([]);
  const [featuredInput, setFeaturedInput] = useState('');
  const [featuredSuggestions, setFeaturedSuggestions] = useState<any[]>([]);
  const [featuredSearching, setFeaturedSearching] = useState(false);

  const searchFeaturedArtists = async (query: string) => {
    setFeaturedInput(query);
    if (query.trim().length < 2) {
      setFeaturedSuggestions([]);
      return;
    }
    setFeaturedSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, stage_name, full_name, avatar_url, artist_tier, verified')
        .or(`stage_name.ilike.%${query}%,full_name.ilike.%${query}%`)
        .eq('approved', true)
        .neq('id', userProfile?.id) // exclude self
        .limit(5);
      setFeaturedSuggestions(data || []);
    } catch {
      setFeaturedSuggestions([]);
    } finally {
      setFeaturedSearching(false);
    }
  };

  const addFeaturedArtist = (artist?: any) => {
    const name = artist?.stage_name || artist?.full_name || featuredInput.trim();
    if (!name) return;
    if (featuredArtists.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`${name} is already added`);
      return;
    }
    setFeaturedArtists(prev => [...prev, {
      name,
      profileId: artist?.id || null,
      avatarUrl: artist?.avatar_url || null,
    }]);
    setFeaturedInput('');
    setFeaturedSuggestions([]);
  };

  const removeFeaturedArtist = (name: string) => {
    setFeaturedArtists(prev => prev.filter(f => f.name !== name));
  };


  const { userProfile } = useAuth();
  const { guardResult, checking, checkUpload } = useUploadGuard();

  const canSellTracks = ['Elite', 'elite', 'Label', 'label'].includes(
    userProfile?.artist_tier || ''
  );

  useEffect(() => {
    if (userProfile?.id) {
      checkUpload(userProfile.id);
    }
  }, [userProfile?.id, checkUpload]);

  const limits = useMemo(() => getTierLimits(userProfile), [
    userProfile?.artist_tier,
    userProfile?.subscription_tier,
    userProfile?.subscription_ends,
    userProfile?.extra_track_slots,
  ]);

  const isFree = useMemo(() => getArtistTier(userProfile) === 'free', [
    userProfile?.artist_tier,
    userProfile?.subscription_tier,
    userProfile?.subscription_ends,
  ]);
  const startOfPeriod = new Date();
  startOfPeriod.setMonth(startOfPeriod.getMonth() - 6);
  startOfPeriod.setHours(0, 0, 0, 0);
  const songsUploadedThisPeriod = songs.filter((s: any) => {
    const createdDate = new Date(s.created_at);
    return createdDate >= startOfPeriod;
  }).length;
  const totalSongsUploaded = songs.length;
  // Enforce 6 month uploads strictly
  const canUploadMore = (limits as any).yearlyUploads === Infinity ? true : songsUploadedThisPeriod < (limits as any).yearlyUploads;

  // ── Image compression utility ─────────────────────────────
  const compressCoverImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          0.82   // 82% quality — good balance of size vs quality
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  // ── Audio compression utility ─────────────────────────────
  // Converts any audio file to a compressed version using
  // Web Audio API offline rendering + MediaRecorder
  const compressAudio = (file: File): Promise<Blob> => {
    return new Promise(async (resolve) => {
      try {
        // Skip if already a small MP3 (< 8MB) — no point recompressing
        if (file.type === 'audio/mpeg' && file.size < 8 * 1024 * 1024) {
          resolve(file);
          return;
        }

        const arrayBuffer = await file.arrayBuffer();
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        ctx.close();

        // Render at same sample rate — we'll compress via MediaRecorder
        const offlineCtx = new OfflineAudioContext(
          Math.min(decoded.numberOfChannels, 2), // max stereo
          decoded.length,
          Math.min(decoded.sampleRate, 44100)    // max 44.1kHz
        );
        const source = offlineCtx.createBufferSource();
        source.buffer = decoded;
        source.connect(offlineCtx.destination);
        source.start(0);
        const rendered = await offlineCtx.startRendering();

        // Convert AudioBuffer → WAV Blob → MediaRecorder compression
        // Use a smaller channel to reduce size
        const numChannels = rendered.numberOfChannels;
        const sampleRate = rendered.sampleRate;
        const length = rendered.length;

        // Build WAV from rendered buffer (needed for MediaRecorder input)
        const wavBuffer = audioBufferToWav(rendered);
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

        // If browser supports MediaRecorder with audio/webm (most do)
        // encode to webm/opus which is ~50-70% smaller than WAV
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          const audioEl = new Audio();
          audioEl.src = URL.createObjectURL(wavBlob);
          
          const stream = (audioEl as any).captureStream 
            ? (audioEl as any).captureStream()
            : null;
          
          if (stream) {
            const chunks: BlobPart[] = [];
            const recorder = new MediaRecorder(stream, { 
              mimeType: 'audio/webm;codecs=opus',
              audioBitsPerSecond: 128000  // 128kbps
            });
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = () => {
              URL.revokeObjectURL(audioEl.src);
              const compressed = new Blob(chunks, { type: 'audio/webm' });
              // Only use compressed if it's actually smaller
              resolve(compressed.size < file.size ? compressed : file);
            };
            recorder.start();
            audioEl.play();
            audioEl.onended = () => recorder.stop();
            // Safety timeout: stop after duration + 2s
            setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 
              (decoded.duration + 2) * 1000);
            return;
          }
        }

        // Fallback: return the WAV (at least it's been decoded and re-encoded cleanly)
        // If WAV is larger than original, just return original
        resolve(wavBlob.size < file.size ? wavBlob : file);

      } catch (err) {
        // If anything fails, upload original — never block the artist
        console.warn('Audio compression failed, using original:', err);
        resolve(file);
      }
    });
  };

  // WAV encoder helper (pure JS, no deps)
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const numChannels = Math.min(buffer.numberOfChannels, 2);
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const arrayBuf = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuf);
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    return arrayBuf;
  };

  const handleUploadSingle = async (e: React.FormEvent, asDraft: boolean = false) => {
    e.preventDefault();
    if (!songFile || !coverFile || !title) return toast.error('Please fill all fields');
    if (userProfile?.id) {
       const guardCheck = await checkUpload(userProfile.id, songFile.size);
       if (!guardCheck.allowed) return toast.error(guardCheck.message);
    }
    
    setUploading(true);
    setUploadProgress(10);
    
    try {
      setUploadProgress(15);
      toast.loading('Optimising cover art...', { id: 'compress' });
      const compressedCover = await compressCoverImage(coverFile);
      toast.dismiss('compress');

      setUploadProgress(20);
      const coverExt = 'jpg'; // always JPEG after compression
      const coverPath = `covers/${userProfile?.id}/cover-${Date.now()}.${coverExt}`;
      const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, compressedCover, { contentType: 'image/jpeg' });
      if (coverErr) throw coverErr;
      const { data: { publicUrl: coverUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath);

      setUploadProgress(30);
      toast.loading('Compressing audio (saves storage)...', { id: 'audiocompress' });
      const compressedAudio = await compressAudio(songFile);
      toast.dismiss('audiocompress');

      setUploadProgress(45);
      const isWebm = compressedAudio.type === 'audio/webm';
      const audioExt = isWebm ? 'webm' : songFile.name.split('.').pop();
      const audioPath = `songs/${userProfile?.id}/song-${Date.now()}.${audioExt}`;
      const { error: audioErr } = await supabase.storage.from('songs').upload(audioPath, compressedAudio, { contentType: compressedAudio.type || 'audio/mpeg' });
      if (audioErr) throw audioErr;
      const { data: { publicUrl: audioUrl } } = supabase.storage.from('songs').getPublicUrl(audioPath);

      setUploadProgress(70);
      const { data: songData, error: dbErr } = await supabase.from('songs').insert({
        title,
        artist_id: userProfile?.id,
        audio_url: audioUrl,
        cover_url: coverUrl,
        is_explicit: isExplicit,
        release_date: releaseDate,
        featured_artist: featuredArtists.map(f => f.name).join(', '),
        featured_artist_ids: featuredArtists
          .filter(f => f.profileId)
          .map(f => f.profileId),
        language: language,
        lyrics: lyrics,
        genre: genre,
        album_id: albumId || null,
        price: isForSale ? price : 0,
        is_for_sale: isForSale,
        is_exclusive: isExclusive,
        approved: false,
        status: asDraft ? 'draft' : 'pending',
        type: mode === 'snippet' ? 'snippet' : 'single',
        plays: 0
      }).select().single();

      if (dbErr) throw dbErr;
      
      // After successful songs insert, if mode is snippet also create moto_feed entry
      if (mode === 'snippet' && songData?.id) {
        const { error: motoError } = await supabase.from('moto_feed').insert({
          song_id:    songData.id,
          artist_id:  userProfile?.id,
          title:      title,
          caption:    title,
          audio_url:  audioUrl,
          cover_url:  coverUrl,
          genre:      genre,
          is_active:  false, // Pending admin review
          approved:   false,
          status:     'pending',
          plays:      0,
          likes:      0,
        });
        if (motoError) console.error('moto_feed insert error:', motoError);
        else console.log('MotoFeed entry created for snippet:', songData.id);
      }
      
      setUploadProgress(100);
      setIsSuccess(true);
      if (onComplete) onComplete();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAlbum = async (e: React.FormEvent, asDraft: boolean = false) => {
    e.preventDefault();
    if (albumTracks.length === 0 || !coverFile || !title) return toast.error('Check files and fields');
    if (userProfile?.id) {
       const maxTrackSize = Math.max(...albumTracks.map(t => t.file.size));
       const guardCheck = await checkUpload(userProfile.id, maxTrackSize);
       if (!guardCheck.allowed) return toast.error(guardCheck.message);
    }
    
    setUploading(true);
    setUploadProgress(5);
    
    try {
      // 1. Upload Cover
      toast.loading('Optimising album artwork...', { id: 'covercomp' });
      const compressedAlbumCover = await compressCoverImage(coverFile);
      toast.dismiss('covercomp');
      const coverExt = 'jpg';
      const coverPath = `covers/${userProfile?.id}/cover-${Date.now()}.${coverExt}`;
      const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, compressedAlbumCover, { contentType: 'image/jpeg' });
      if (coverErr) throw coverErr;
      const { data: { publicUrl: coverUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath);

      setUploadProgress(15);
      
      // 2. Create Album Record
      const { data: newAlbum, error: albumErr } = await supabase.from('albums').insert({
        artist_id: userProfile?.id,
        title,
        cover_url: coverUrl,
        release_year: new Date(releaseDate).getFullYear()
      }).select().single();

      if (albumErr) throw albumErr;

      // 3. Upload Tracks
      const totalTracks = albumTracks.length;
      let completed = 0;

      for (const track of albumTracks) {
        const compressedTrack = await compressAudio(track.file);
        const isTrackWebm = compressedTrack.type === 'audio/webm';
        const audioExt = isTrackWebm ? 'webm' : track.file.name.split('.').pop();
        const audioPath = `songs/${userProfile?.id}/song-${Date.now()}-${Math.random().toString(36).substring(7)}.${audioExt}`;
        const { error: audioErr } = await supabase.storage.from('songs').upload(audioPath, compressedTrack, { contentType: compressedTrack.type || 'audio/mpeg' });
        if (audioErr) throw audioErr;
        
        const { data: { publicUrl: audioUrl } } = supabase.storage.from('songs').getPublicUrl(audioPath);

        const trackPrice = isForSale 
          ? (albumPricingMode === 'album' ? Math.floor(price / totalTracks) : track.price) 
          : 0;

        const { error: dbErr } = await supabase.from('songs').insert({
          title: track.title,
          artist_id: userProfile?.id,
          audio_url: audioUrl,
          cover_url: coverUrl,
          is_explicit: track.is_explicit || false,
          release_date: releaseDate,
          featured_artist: track.featured_artist || '',
          language: language,
          lyrics: track.lyrics || '',
          genre: genre,
          album_id: newAlbum.id,
          price: trackPrice,
          is_for_sale: isForSale,
          is_exclusive: isExclusive,
          approved: false,
          status: asDraft ? 'draft' : 'pending',
          type: 'single',
          plays: 0
        });

        if (dbErr) throw dbErr;

        completed++;
        setUploadProgress(15 + Math.floor((completed / totalTracks) * 85));
      }

      setUploadProgress(100);
      setIsSuccess(true);
      if (onComplete) onComplete();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-bg-surface border border-white/5 rounded-[40px] p-12 text-center shadow-2xl">
          <div className="w-24 h-24 bg-smash-purple/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <CircleCheck size={48} className="text-smash-purple" />
          </div>
          <h2 className="text-4xl font-studio font-black italic uppercase text-white mb-4">
            {isDrafting ? 'Draft Saved!' : 'Submission Sent!'}
          </h2>
          <p className="text-text-secondary font-medium mb-12">
            {isDrafting ? 'Your music has been saved as a draft. You can publish it anytime from your inventory.' : 'Your music is headed to the Smashify review team. This usually takes 2-4 hours.'}
          </p>
          <div className="space-y-4">
            <button onClick={() => { setIsSuccess(false); setUploadStep(1); setTitle(''); setSongFile(null); setCoverFile(null); setFeaturedArtists([]); setFeaturedInput(''); }} className="w-full h-16 bg-smash-purple text-white font-display font-black uppercase tracking-widest rounded-2xl hover:brightness-110 transition-all">{isDrafting ? 'Upload Another' : 'Submit Another'}</button>
            <button onClick={() => window.location.reload()} className="w-full h-16 bg-white/5 border border-white/10 text-white font-display font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all">Back to Studio</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 mt-6 px-4 md:px-8">
      {/* STEP INDICATOR */}
      <div className="flex items-center justify-center max-w-lg mx-auto mb-10">
        <div className="flex items-center w-full">
           <div className="relative flex flex-col items-center group cursor-pointer" onClick={() => currentStep > 1 && setCurrentStep(1)}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-[14px] transition-all relative z-10 ${currentStep === 1 ? 'bg-smash-purple text-white ring-4 ring-smash-purple/30' : currentStep > 1 ? 'bg-smash-green/20 text-smash-green' : 'bg-white/5 text-text-muted'}`}>
                {currentStep > 1 ? <CircleCheck size={20} /> : '1'}
              </div>
              <div className="absolute top-12 whitespace-nowrap text-[10px] font-display font-black uppercase tracking-widest text-text-muted group-hover:text-white transition-colors">Sound</div>
           </div>
           
           <div className={`flex-1 h-[2px] transition-all relative z-0 -mx-1 ${currentStep > 1 ? 'bg-smash-purple/60' : 'bg-white/10'}`} />
           
           <div className="relative flex flex-col items-center group cursor-pointer" onClick={() => currentStep > 2 && setCurrentStep(2)}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-[14px] transition-all relative z-10 ${currentStep === 2 ? 'bg-smash-purple text-white ring-4 ring-smash-purple/30' : currentStep > 2 ? 'bg-smash-green/20 text-smash-green' : 'bg-white/5 text-text-muted'}`}>
                {currentStep > 2 ? <CircleCheck size={20} /> : '2'}
              </div>
              <div className="absolute top-12 whitespace-nowrap text-[10px] font-display font-black uppercase tracking-widest text-text-muted group-hover:text-white transition-colors">Visual</div>
           </div>
           
           <div className={`flex-1 h-[2px] transition-all relative z-0 -mx-1 ${currentStep > 2 ? 'bg-smash-purple/60' : 'bg-white/10'}`} />

           <div className="relative flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-[14px] transition-all relative z-10 ${currentStep === 3 ? 'bg-smash-purple text-white ring-4 ring-smash-purple/30' : 'bg-white/5 text-text-muted'}`}>
                3
              </div>
              <div className="absolute top-12 whitespace-nowrap text-[10px] font-display font-black uppercase tracking-widest text-text-muted">Publish</div>
           </div>
        </div>
      </div>

      <div className="bg-bg-surface border border-white/5 rounded-[40px] overflow-hidden shadow-2xl backdrop-blur-md transition-all duration-500">
         {uploading ? (
             <motion.div key="uploading" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12 py-20 px-6 max-w-2xl mx-auto">
                <div className="space-y-8 bg-bg-elevated p-8 rounded-[24px] border border-white/5 shadow-inner">
                   <div className="flex flex-col gap-2">
                     <div className="flex justify-between text-[11px] font-display font-black uppercase tracking-widest text-text-muted">
                        <span>Syncing {mode === 'album' ? 'Album' : 'Track'}</span>
                        <span className="text-smash-purple">{uploadProgress}%</span>
                     </div>
                     <div className="w-full h-3 bg-bg-surface rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${uploadProgress}%` }} 
                          transition={{ ease: "linear" }}
                          className="h-full bg-gradient-to-r from-smash-purple to-smash-pink rounded-full relative" 
                        />
                     </div>
                   </div>
                   <div className="text-center space-y-2">
                     <h3 className="text-xl font-studio font-black uppercase italic text-white tracking-widest animate-pulse">Engine Processing</h3>
                     <p className="text-[13px] font-sans text-text-muted">
                        Compressing &amp; distributing "{title}" to the nodes.<br/>
                        <span className="text-smash-purple text-[11px]">Audio is being optimised to save storage. Please don't close this page.</span>
                     </p>
                   </div>
                </div>
             </motion.div>         
         ) : (
             <form onSubmit={(e) => {
               if (mode === 'album') handleUploadAlbum(e, isDrafting);
               else handleUploadSingle(e, isDrafting);
             }}>
                
                {guardResult && (
                  <div className={`mx-6 md:mx-12 mt-6 p-4 rounded-xl border font-sans text-[13px] ${
                    guardResult.allowed 
                      ? (guardResult.daysRemaining !== null && guardResult.daysRemaining <= 7)
                        ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                        : 'bg-smash-green/10 border-smash-green/20 text-smash-green'
                      : 'bg-red-500/10 border-red-500/20 text-red-500'
                  }`}>
                    {guardResult.allowed ? (
                      (guardResult.daysRemaining !== null && guardResult.daysRemaining <= 7) 
                        ? `⚠️ Expiring in ${guardResult.daysRemaining} days — renew to keep all tracks live`
                        : `🟢 ${guardResult.slotsUsed} of ${guardResult.slotsMax} slots used${guardResult.subscriptionEnds ? ` · Subscription active until ${new Date(guardResult.subscriptionEnds).toLocaleDateString()}` : ''}`
                    ) : (
                      guardResult.daysRemaining === 0 
                        ? `🔴 Subscription expired — your tracks beyond top 3 are hidden. Renew to restore.`
                        : `🔴 ${guardResult.message}`
                    )}
                  </div>
                )}
                
                {currentStep === 1 && (
                  <div className={`p-6 md:p-12 transition-all ${isDraggingAudio ? 'ring-2 ring-smash-orange bg-smash-orange/5' : ''}`}>
                    <div className="flex bg-bg-elevated p-1.5 rounded-full w-fit mx-auto md:mx-0 gap-1 border border-white/5 shadow-inner mb-8">
                       {['single', 'album', 'snippet'].map((m) => (
                         <button type="button" key={m} onClick={() => {
                           if (m === 'album' && !limits.canCreateAlbums) return toast.error('Standard Plan required');
                           if (m === 'snippet' && !limits.canPostSnippets) return toast.error('Rising Star plan required to post MotoFeed snippets');
                           setMode(m as any);
                         }} className={`px-8 py-3 rounded-full text-[11px] font-display font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-smash-purple text-white shadow-xl scale-105' : 'text-text-secondary hover:text-text-primary'}`}>
                           {m}
                         </button>
                       ))}
                    </div>

                    <div 
                      className={`min-h-[320px] rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all relative overflow-hidden group shadow-inner ${isDraggingAudio ? 'border-smash-orange bg-smash-orange/5' : 'border-white/10 bg-bg-elevated hover:border-smash-orange/50'}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingAudio(true) }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDraggingAudio(false) }}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDraggingAudio(false)
                        const files = Array.from(e.dataTransfer.files).filter((f: any) => f.type.startsWith('audio/'));
                        if (files.length === 0) return toast.error('Please drop valid audio files');
                        
                        if (mode === 'album') {
                           setAlbumTracks(files.map((f: any) => ({ file: f as File, title: f.name.replace(/\.[^/.]+$/, ""), price: 2500, lyrics: '', is_explicit: false, featured_artist: '' })));
                        } else {
                           const file = files[0] as File;
                           setSongFile(file);
                           setTitle(file.name.replace(/\.[^/.]+$/, ""));
                           const audio = new Audio();
                           audio.src = URL.createObjectURL(file);
                           setAudioPreviewUrl(audio.src);
                           audio.onloadedmetadata = () => {
                             const mins = Math.floor(audio.duration / 60);
                             const secs = Math.floor(audio.duration % 60);
                             setAudioDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
                           };
                           setAudioFileSize((file.size / (1024*1024)).toFixed(1) + ' MB');

                           const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                           const cleanName = nameWithoutExt.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
                           if (!title) setTitle(cleanName);
                        }
                      }}
                      onClick={() => document.getElementById('audio-file-wizard')?.click()}
                    >
                       {(mode === 'album' ? albumTracks.length > 0 : songFile) ? (
                         <div className="w-full relative z-10">
                            {coverFile && (
                              <img src={URL.createObjectURL(coverFile)} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-3xl pointer-events-none -z-10" />
                            )}
                            
                            <div className="flex flex-col items-center max-w-xl mx-auto space-y-6">
                               <CircleCheck size={56} className="text-smash-green mx-auto bg-smash-green/10 p-3 rounded-full" />
                               
                               {mode === 'album' ? (
                                  <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/10 space-y-2">
                                     <h3 className="font-studio font-black text-xl text-white mb-2">{albumTracks.length} Tracks Selected</h3>
                                     <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2 custom-scrollbar pointer-events-auto">
                                        {albumTracks.map((track, idx) => (
                                           <div key={idx} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2">
                                              <span className="text-[14px] font-display font-medium text-white truncate max-w-[200px] text-left">{track.file.name}</span>
                                              <span className="text-[12px] font-mono text-text-muted">{(track.file.size / (1024*1024)).toFixed(1)} MB</span>
                                           </div>
                                        ))}
                                     </div>
                                  </div>
                               ) : (
                                  <div className="space-y-4 w-full pointer-events-auto">
                                    <h3 className="text-2xl font-studio font-black text-white truncate px-4">{title || songFile?.name}</h3>
                                    <div className="flex items-center justify-center gap-3">
                                       <div className="px-3 py-1 bg-white/10 rounded-lg text-[12px] font-mono font-medium text-text-secondary">{audioduration}</div>
                                       <div className="px-3 py-1 bg-white/10 rounded-lg text-[12px] font-mono font-medium text-text-secondary">{audioFileSize}</div>
                                    </div>
                                    {audioPreviewUrl && (
                                       <audio controls src={audioPreviewUrl} className="w-full h-12 rounded-2xl mt-4 opacity-80" onClick={e => e.stopPropagation()} />
                                    )}
                                  </div>
                               )}

                               <button type="button" onClick={(e) => { e.stopPropagation(); document.getElementById('audio-file-wizard')?.click(); }} className="px-6 py-2 border border-smash-orange/50 text-smash-orange rounded-full text-[11px] font-display font-black uppercase tracking-widest hover:bg-smash-orange/10 transition-colors pointer-events-auto">
                                 Change File
                               </button>
                            </div>
                         </div>
                       ) : (
                         <div className="space-y-6 pointer-events-none">
                            <div className="flex items-end justify-center gap-1 h-12 mb-4">
                              {[0.4, 0.7, 1, 0.7, 0.4, 0.9, 0.6, 1, 0.5, 0.8].map((h, i) => (
                                <div
                                  key={i}
                                  className="w-1.5 bg-smash-orange rounded-full"
                                  style={{
                                    height: `${h * 100}%`,
                                    animation: `waveBar 1.2s ease-in-out infinite alternate`,
                                    animationDelay: `${i * 0.1}s`,
                                    opacity: isDraggingAudio ? 1 : 0.5,
                                  }}
                                />
                              ))}
                            </div>
                            <div>
                               <h3 className="font-studio text-2xl md:text-3xl text-white uppercase tracking-tight mb-2">Drop your audio here</h3>
                               <p className="text-text-muted text-[13px] md:text-sm font-sans">MP3, WAV, FLAC · Max 50MB · Auto-compressed on upload</p>
                            </div>
                            <button type="button" className="px-8 py-3 rounded-full bg-smash-orange text-black font-display font-black uppercase text-xs tracking-widest hover:brightness-110 shadow-[0_0_20px_rgba(255,95,0,0.3)] transition-all pointer-events-auto">
                               Browse Files
                            </button>
                         </div>
                       )}
                       <input id="audio-file-wizard" type="file" multiple={mode === 'album'} accept="audio/*" onChange={e => {
                         if (mode === 'album') {
                           const files = Array.from(e.target.files || []);
                           setAlbumTracks(files.map((f: any) => ({ file: f, title: f.name.replace(/\.[^/.]+$/, ""), price: 2500, lyrics: '', is_explicit: false, featured_artist: '' })));
                         } else {
                           const file = e.target.files?.[0];
                           if (!file) return;
                           setSongFile(file);
                           setTitle(file.name.replace(/\.[^/.]+$/, ""));
                           const audio = new Audio();
                           audio.src = URL.createObjectURL(file);
                           setAudioPreviewUrl(audio.src);
                           audio.onloadedmetadata = () => {
                             const mins = Math.floor(audio.duration / 60);
                             const secs = Math.floor(audio.duration % 60);
                             setAudioDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
                           };
                           setAudioFileSize((file.size / (1024*1024)).toFixed(1) + ' MB');

                           const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                           const cleanName = nameWithoutExt.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
                           if (!title) setTitle(cleanName);
                         }
                       }} className="hidden" />
                    </div>

                    <div className="mt-8">
                       <button 
                         type="button" 
                         disabled={mode === 'album' ? albumTracks.length === 0 : !songFile}
                         onClick={() => setCurrentStep(2)} 
                         className="w-full h-14 bg-smash-purple text-white font-display font-black uppercase tracking-widest text-[13px] rounded-2xl disabled:opacity-50 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                       >
                         NEXT: Add Artwork <ChevronRight size={18} />
                       </button>
                    </div>
                  </div>
                )}


                {currentStep === 2 && (
                  <div className="p-6 md:p-12">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* LEFT COLUMN: COVER */}
                        <div>
                           <div 
                             className={`aspect-square w-full max-w-[280px] mx-auto md:mx-0 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all relative overflow-hidden group shadow-inner ${isDraggingCover ? 'border-smash-purple bg-smash-purple/10' : 'border-white/10 bg-bg-elevated hover:border-smash-purple/50'}`}
                             onClick={() => document.getElementById('cover-file-wizard')?.click()}
                             onDragOver={(e) => { e.preventDefault(); setIsDraggingCover(true) }}
                             onDragLeave={(e) => { e.preventDefault(); setIsDraggingCover(false) }}
                             onDrop={(e) => {
                               e.preventDefault()
                               setIsDraggingCover(false)
                               const files = Array.from(e.dataTransfer.files).filter((f: any) => f.type.startsWith('image/'));
                               if (files.length > 0) setCoverFile(files[0] as File);
                             }}
                           >
                              {coverFile ? (
                                <div className="absolute inset-0 w-full h-full group">
                                  <img src={URL.createObjectURL(coverFile)} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <button type="button" className="px-6 py-2 bg-white/20 backdrop-blur-md rounded-full text-white font-display font-black text-[11px] uppercase tracking-widest">Change</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-smash-purple/20 to-smash-orange/10 flex flex-col items-center justify-center pointer-events-none p-6">
                                   <ImageIcon size={40} className="text-smash-purple mb-4" />
                                   <h4 className="text-[14px] font-display font-black uppercase tracking-widest text-white mb-2">Cover Art</h4>
                                   <p className="text-text-muted text-[12px] font-sans">1:1 square, min 500×500px</p>
                                </div>
                              )}
                              <input id="cover-file-wizard" type="file" accept="image/*" onChange={e => {
                                 if (e.target.files && e.target.files[0]) setCoverFile(e.target.files[0]);
                              }} className="hidden" />
                           </div>
                           <p className="mt-4 text-[11px] text-text-muted italic max-w-[280px] mx-auto md:mx-0 text-center md:text-left">💡 High contrast covers get 40% more clicks</p>
                        </div>

                        {/* RIGHT COLUMN: METADATA */}
                        <div className="space-y-6">
                           <div className="group">
                             <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-2 transition-colors">Release Title *</label>
                             <input value={title} onChange={e=>setTitle(e.target.value)} required placeholder={mode === 'album' ? "e.g. The Recovery" : "e.g. Mapulani"} className="w-full h-14 bg-bg-elevated border border-white/5 rounded-2xl px-6 text-[15px] font-display font-bold focus:border-smash-purple transition-all outline-none text-white placeholder:text-white/20" />
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                             <div className="group">
                               <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-2 transition-colors">Primary Genre *</label>
                               <select required value={genre} onChange={e=>setGenre(e.target.value)} className="w-full h-14 bg-bg-elevated border border-white/5 rounded-2xl px-4 text-[14px] font-display font-bold focus:border-smash-purple transition-all appearance-none text-white outline-none">
                                 <option value="">Select genre</option>
                                 <option value="Afropop">Afropop</option>
                                 <option value="Afrobeats">Afrobeats</option>
                                 <option value="Amapiano">Amapiano</option>
                                 <option value="Dancehall">Dancehall</option>
                                 <option value="Electronic">Electronic</option>
                                 <option value="Gospel">Gospel</option>
                                 <option value="Hip Hop">Hip Hop</option>
                                 <option value="Instrumental">Instrumental</option>
                                 <option value="Pop">Pop</option>
                                 <option value="R&B">R&B</option>
                                 <option value="Reggae">Reggae</option>
                                 <option value="Spoken Word">Spoken Word</option>
                                 <option value="Traditional/Folk">Traditional/Folk</option>
                                 <option value="Other">Other</option>
                               </select>
                             </div>
                             <div className="group">
                               <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-2 transition-colors">Language</label>
                               <select required value={language} onChange={e=>setLanguage(e.target.value)} className="w-full h-14 bg-bg-elevated border border-white/5 rounded-2xl px-4 text-[14px] font-display font-bold focus:border-smash-purple transition-all appearance-none text-white outline-none">
                                 <option value="Chichewa">Chichewa</option>
                                 <option value="English">English</option>
                                 <option value="Tumbuka">Tumbuka</option>
                                 <option value="Yao">Yao</option>
                                 <option value="Other">Other</option>
                               </select>
                             </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                             <div className="group col-span-2">
                               <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-2 transition-colors">
                                 Featured Artists
                               </label>

                               {/* Added featured artists chips */}
                               {featuredArtists.length > 0 && (
                                 <div className="flex flex-wrap gap-2 mb-3">
                                   {featuredArtists.map(f => (
                                     <div key={f.name} className="flex items-center gap-2 px-3 py-1.5 bg-smash-purple/20 border border-smash-purple/30 rounded-full">
                                       {f.avatarUrl ? (
                                         <img src={f.avatarUrl} className="w-5 h-5 rounded-full object-cover" alt="" />
                                       ) : (
                                         <div className="w-5 h-5 rounded-full bg-smash-purple/40 flex items-center justify-center text-[9px] font-black text-white">
                                           {f.name[0]}
                                         </div>
                                       )}
                                       <span className="text-xs font-bold text-white">{f.name}</span>
                                       {f.profileId && (
                                         <span className="text-[9px] font-black text-smash-purple bg-smash-purple/20 px-1.5 py-0.5 rounded-full">
                                           ON SMASHIFY
                                         </span>
                                       )}
                                       <button
                                         type="button"
                                         onClick={() => removeFeaturedArtist(f.name)}
                                         className="text-white/40 hover:text-red-400 transition-colors ml-1"
                                       >
                                         <X size={12} />
                                       </button>
                                     </div>
                                   ))}
                                 </div>
                               )}

                               {/* Search input */}
                               <div className="relative">
                                 <div className="flex gap-2">
                                   <input
                                     value={featuredInput}
                                     onChange={e => searchFeaturedArtists(e.target.value)}
                                     onKeyDown={e => {
                                       if (e.key === 'Enter') {
                                         e.preventDefault();
                                         addFeaturedArtist();
                                       }
                                     }}
                                     placeholder="Search artist name or type to add..."
                                     className="flex-1 h-14 bg-bg-elevated border border-white/5 rounded-2xl px-4 text-[14px] font-display font-bold focus:border-smash-purple transition-all outline-none text-white placeholder:text-white/20"
                                   />
                                   <button
                                     type="button"
                                     onClick={() => addFeaturedArtist()}
                                     disabled={!featuredInput.trim()}
                                     className="h-14 px-5 bg-smash-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-30 hover:bg-smash-purple/80 transition-all shrink-0"
                                   >
                                     + Add
                                   </button>
                                 </div>

                                 {/* Suggestions dropdown */}
                                 {(featuredSuggestions.length > 0 || featuredSearching) && (
                                   <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl">
                                     {featuredSearching ? (
                                       <div className="px-4 py-3 text-xs text-smash-gray">Searching...</div>
                                     ) : featuredSuggestions.map(artist => (
                                       <button
                                         key={artist.id}
                                         type="button"
                                         onClick={() => addFeaturedArtist(artist)}
                                         className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                                       >
                                         {artist.avatar_url ? (
                                           <img src={artist.avatar_url} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                                         ) : (
                                           <div className="w-9 h-9 rounded-full bg-smash-purple/20 flex items-center justify-center font-black text-smash-purple shrink-0">
                                             {(artist.stage_name || artist.full_name || '?')[0]}
                                            </div>
                                         )}
                                         <div className="flex-1 min-w-0">
                                           <p className="text-sm font-bold text-white truncate">
                                             {artist.stage_name || artist.full_name}
                                           </p>
                                           <p className="text-[10px] text-smash-gray">
                                             {artist.artist_tier} · On Smashify
                                           </p>
                                         </div>
                                         {artist.verified && (
                                           <span className="text-[9px] font-black text-smash-purple shrink-0">✓ VERIFIED</span>
                                         )}
                                       </button>
                                     ))}
                                     {featuredSuggestions.length === 0 && !featuredSearching && featuredInput.length >= 2 && (
                                       <div className="px-4 py-3">
                                         <p className="text-xs text-smash-gray">No Smashify artist found.</p>
                                         <button
                                           type="button"
                                           onClick={() => addFeaturedArtist()}
                                           className="text-xs text-smash-purple font-bold mt-1 hover:underline"
                                         >
                                           Add "{featuredInput}" as external artist
                                         </button>
                                       </div>
                                     )}
                                   </div>
                                 )}
                               </div>
                               <p className="text-[9px] text-smash-gray mt-2">
                                 Artists with Smashify accounts will be linked to their profile automatically.
                               </p>
                             </div>
                             <div className="group">
                               <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-2 transition-colors">Release Date</label>
                               <input required type="date" value={releaseDate} onChange={e=>setReleaseDate(e.target.value)} className="w-full h-14 bg-bg-elevated border border-white/5 rounded-2xl px-4 text-[14px] font-display font-bold focus:border-smash-purple transition-all outline-none text-white" />
                             </div>
                           </div>

                           {(mode === 'album' || albums.length > 0) && mode !== 'snippet' && (
                             <div className="group">
                               <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-2 transition-colors">Album / EP (Optional)</label>
                               <select value={albumId} onChange={e=>setAlbumId(e.target.value)} className="w-full h-14 bg-bg-elevated border border-white/5 rounded-2xl px-4 text-[14px] font-display font-bold focus:border-smash-purple transition-all appearance-none text-white outline-none">
                                 <option value="">No Album (Single)</option>
                                 {albums.map((al: any) => (
                                   <option key={al.id} value={al.id}>{al.title}</option>
                                 ))}
                               </select>
                             </div>
                           )}

                           {mode !== 'album' && <div className="flex items-center justify-between p-4 bg-bg-elevated border border-white/5 rounded-2xl">
                              <div>
                                 <div className="text-[13px] font-display font-bold text-white mb-1">🔞 Contains explicit content</div>
                                 <div className="text-[11px] text-text-muted font-sans">Will show a warning badge on the track</div>
                              </div>
                              <button type="button" onClick={() => setIsExplicit(!isExplicit)} className={`w-12 h-6 rounded-full transition-all relative ${isExplicit ? 'bg-smash-orange' : 'bg-white/10'}`}>
                                 <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${isExplicit ? 'right-1' : 'left-1'}`} />
                              </button>
                           </div>}

                           {mode !== 'snippet' && (
                             <>
                             <div className="pt-4 border-t border-white/5">
                               <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-4 transition-colors">Distribution Mode</label>
                               <div className="flex gap-2 p-1.5 bg-bg-elevated border border-white/5 rounded-2xl mb-4">
                                  <button type="button" onClick={() => setIsForSale(false)} className={`flex-1 h-12 rounded-xl text-[11px] font-display font-black uppercase tracking-widest transition-all ${!isForSale ? 'bg-white/10 text-white shadow-lg' : 'text-text-muted hover:text-white'}`}>Free Stream</button>
                                  <button type="button" onClick={() => {
                                    if (!canSellTracks) {
                                      toast.error('Track sales are available on the Elite plan only. Upgrade in Artist Hub.');
                                      return;
                                    }
                                    setIsForSale(true);
                                  }} className={`flex-1 h-12 rounded-xl text-[11px] font-display font-black uppercase tracking-widest transition-all ${isForSale ? 'bg-smash-purple text-white shadow-lg shadow-smash-purple/20' : 'text-text-muted hover:text-white'} ${!canSellTracks ? 'opacity-50' : ''}`}>Paid Download</button>
                               </div>
                               {(isForSale && (mode !== 'album' || albumPricingMode === 'album')) && (
                                 canSellTracks ? (
                                   <div className="relative">
                                      <input type="number" required={isForSale} value={price === 0 ? '' : price} onChange={e => setPrice(e.target.value === '' ? 0 : Number(e.target.value))} min="0" step="100" className="w-full h-14 bg-bg-elevated border border-white/5 rounded-2xl px-6 text-[15px] font-display font-bold focus:border-smash-purple transition-all outline-none text-white pr-20" />
                                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[11px] font-display font-black text-text-muted uppercase">MWK</div>
                                   </div>
                                 ) : (
                                   <div className="p-4 bg-white/5 border border-white/10 rounded-xl mt-4">
                                     <p className="text-xs font-bold text-smash-gray">
                                       🔒 Track sales & downloads are available on the <span className="text-smash-orange">Elite plan</span> only.
                                     </p>
                                     <p className="text-[10px] text-smash-gray mt-1">
                                       Upgrade to Elite to sell your tracks and give buyers permanent download access.
                                     </p>
                                   </div>
                                 )
                               )}
                             </div>
                             
                             {/* Exclusive content toggle */}
                             <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                               <div>
                                 <p className="text-sm font-bold text-white">Subscriber Exclusive</p>
                                 <p className="text-[10px] text-smash-gray mt-0.5">
                                   Only fans who subscribe monthly can access this track
                                 </p>
                               </div>
                               <button
                                 type="button"
                                 onClick={() => setIsExclusive(prev => !prev)}
                                 className={`w-12 h-6 rounded-full transition-colors ${isExclusive ? 'bg-smash-orange' : 'bg-white/10'}`}
                               >
                                 <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${isExclusive ? 'translate-x-6' : 'translate-x-0'}`} />
                               </button>
                             </div>
                             </>
                           )}

                           {mode === 'album' && (
                              <div className="pt-4 border-t border-white/5 space-y-4">
                                 {isForSale && (
                                   <div className="space-y-4">
                                      <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-1 transition-colors">Pricing Mode</label>
                                      <div className="flex gap-2 p-1.5 bg-bg-elevated border border-white/5 rounded-2xl">
                                         <button type="button" onClick={() => setAlbumPricingMode('album')} className={`flex-1 h-12 rounded-xl text-[11px] font-display font-black uppercase tracking-widest transition-all ${albumPricingMode === 'album' ? 'bg-smash-purple text-white shadow-lg shadow-smash-purple/20' : 'text-text-muted hover:text-white'}`}>Single Price for full Album</button>
                                         <button type="button" onClick={() => setAlbumPricingMode('individual')} className={`flex-1 h-12 rounded-xl text-[11px] font-display font-black uppercase tracking-widest transition-all ${albumPricingMode === 'individual' ? 'bg-smash-purple text-white shadow-lg shadow-smash-purple/20' : 'text-text-muted hover:text-white'}`}>Set Track Prices</button>
                                      </div>
                                   </div>
                                 )}

                                 <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-1 transition-colors">Individual Tracks Metadata</label>
                                 <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                   {albumTracks.map((track, idx) => (
                                      <div key={idx} className="bg-bg-elevated p-4 rounded-2xl border border-white/5">
                                         <input required placeholder="Track Title" value={track.title} onChange={e => { const newTracks = [...albumTracks]; newTracks[idx].title = e.target.value; setAlbumTracks(newTracks); }} className="w-full bg-transparent font-sans font-bold text-[14px] text-white mb-3 focus:outline-none border-b border-transparent focus:border-white/20 pb-1 px-1 transition-all" />
                                         <div className="space-y-3">
                                           {isForSale && albumPricingMode === 'individual' && (
                                              canSellTracks ? (
                                                <div className="relative">
                                                  <input type="number" required value={track.price === 0 ? '' : track.price} onChange={e => { const newTracks = [...albumTracks]; newTracks[idx].price = e.target.value === '' ? 0 : Number(e.target.value); setAlbumTracks(newTracks); }} min="0" step="100" className="w-full h-10 bg-black/20 border border-white/5 rounded-xl px-4 text-[13px] font-sans text-white focus:border-smash-purple pr-16 outline-none" />
                                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-display font-black text-text-muted uppercase">MWK</div>
                                                </div>
                                              ) : (
                                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                                  <p className="text-xs font-bold text-smash-gray">
                                                    🔒 Track sales & downloads are available on the <span className="text-smash-orange">Elite plan</span> only.
                                                  </p>
                                                </div>
                                              )
                                           )}
                                           <input placeholder="Featured Artist" value={track.featured_artist} onChange={e => { const newTracks = [...albumTracks]; newTracks[idx].featured_artist = e.target.value; setAlbumTracks(newTracks); }} className="w-full h-10 bg-black/20 border border-white/5 rounded-xl px-4 text-[13px] font-sans text-white placeholder:text-white/20 outline-none focus:border-smash-purple" />
                                           <textarea placeholder="Lyrics (optional)" value={track.lyrics} onChange={e => { const newTracks = [...albumTracks]; newTracks[idx].lyrics = e.target.value; setAlbumTracks(newTracks); }} rows={2} className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-[13px] font-sans text-white placeholder:text-white/20 outline-none focus:border-smash-purple resize-y max-h-[100px]" />
                                           <div className="flex items-center justify-between pt-1">
                                              <span className="text-[11px] font-sans text-text-muted">🔞 Contains explicit content</span>
                                              <button type="button" onClick={() => { const newTracks = [...albumTracks]; newTracks[idx].is_explicit = !newTracks[idx].is_explicit; setAlbumTracks(newTracks); }} className={`w-10 h-5 rounded-full transition-all relative ${track.is_explicit ? 'bg-smash-orange' : 'bg-white/10'}`}>
                                                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${track.is_explicit ? 'right-0.5' : 'left-0.5'}`} />
                                              </button>
                                           </div>
                                         </div>
                                      </div>
                                   ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="flex gap-4 mt-10">
                        <button type="button" onClick={() => setCurrentStep(1)} className="h-14 px-8 border border-white/10 hover:bg-white/5 text-white font-display font-black uppercase tracking-widest text-[13px] rounded-2xl transition-all">← BACK</button>
                        <button type="button" onClick={() => setCurrentStep(3)} disabled={!coverFile || !title || !genre} className="flex-1 h-14 bg-smash-purple text-white font-display font-black uppercase tracking-widest text-[13px] rounded-2xl disabled:opacity-50 hover:brightness-110 transition-all">NEXT: Final Check →</button>
                     </div>
                  </div>
                )}


                {currentStep === 3 && (
                  <div className="p-6 md:p-12">
                     <div className="max-w-xl mx-auto space-y-10">
                        
                        <div className="bg-bg-elevated border border-white/5 p-4 rounded-3xl flex items-center gap-4">
                           <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/10 relative">
                              {coverFile ? <img src={URL.createObjectURL(coverFile)} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/5" />}
                           </div>
                           <div className="flex-1 min-w-0">
                              <h3 className="font-studio font-black uppercase text-xl text-white truncate">{title}</h3>
                              <p className="font-sans text-[14px] text-text-secondary truncate">{userProfile?.stage_name || userProfile?.full_name}</p>
                              <div className="flex items-center gap-2 mt-2">
                                 <span className="px-2.5 py-1 bg-white/10 rounded-md text-[10px] font-display font-black uppercase tracking-widest text-white">{genre}</span>
                                 {isForSale ? (
                                    <span className="px-2.5 py-1 bg-smash-purple/20 text-smash-purple rounded-md text-[10px] font-display font-black uppercase tracking-widest">MK {price.toLocaleString()}</span>
                                 ) : (
                                    <span className="px-2.5 py-1 bg-smash-green/20 text-smash-green rounded-md text-[10px] font-display font-black uppercase tracking-widest">Free Stream</span>
                                 )}
                              </div>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <h4 className="text-[11px] font-display font-black uppercase tracking-widest text-text-muted mb-2">Checklist</h4>
                           
                           <div className="flex items-center gap-3 bg-bg-elevated p-4 rounded-2xl border border-white/5">
                              <CircleCheck size={20} className="text-smash-green shrink-0" />
                              <div className="text-[13px] font-sans text-white truncate"><strong className="font-display uppercase tracking-widest text-[10px] text-text-muted mr-2">Audio:</strong> {mode === 'album' ? `${albumTracks.length} tracks` : songFile?.name}</div>
                           </div>
                           
                           <div className="flex items-center gap-3 bg-bg-elevated p-4 rounded-2xl border border-white/5">
                              <CircleCheck size={20} className="text-smash-green shrink-0" />
                              <div className="text-[13px] font-sans text-white truncate"><strong className="font-display uppercase tracking-widest text-[10px] text-text-muted mr-2">Cover:</strong> Uploaded</div>
                           </div>

                           <div className="flex items-center gap-3 bg-bg-elevated p-4 rounded-2xl border border-white/5">
                              <CircleCheck size={20} className="text-smash-green shrink-0" />
                              <div className="text-[13px] font-sans text-white truncate"><strong className="font-display uppercase tracking-widest text-[10px] text-text-muted mr-2">Title:</strong> {title}</div>
                           </div>

                           <div className="flex items-center gap-3 bg-bg-elevated p-4 rounded-2xl border border-white/5">
                              <CircleCheck size={20} className="text-smash-green shrink-0" />
                              <div className="text-[13px] font-sans text-white truncate"><strong className="font-display uppercase tracking-widest text-[10px] text-text-muted mr-2">Genre:</strong> {genre}</div>
                           </div>

                           {mode !== 'album' && <div className="flex items-center gap-3 bg-bg-elevated p-4 rounded-2xl border border-white/5">
                              {lyrics ? <CircleCheck size={20} className="text-smash-green shrink-0" /> : <AlertTriangle size={20} className="text-smash-orange shrink-0" />}
                              <div className="text-[13px] font-sans text-white truncate"><strong className="font-display uppercase tracking-widest text-[10px] text-text-muted mr-2">Lyrics:</strong> {lyrics ? 'Added' : 'Not added (optional but helps fans)'}</div>
                           </div>}
                           
                           {mode !== 'album' && <div className="flex items-center gap-3 bg-bg-elevated p-4 rounded-2xl border border-white/5">
                              {featuredArtists.length > 0 ? <CircleCheck size={20} className="text-smash-green shrink-0" /> : <div className="w-5 text-center text-text-muted shrink-0">—</div>}
                              <div className="text-[13px] font-sans text-white truncate"><strong className="font-display uppercase tracking-widest text-[10px] text-text-muted mr-2">Featured:</strong> {featuredArtists.length > 0 ? featuredArtists.map(f => f.name).join(', ') : 'None'}</div>
                           </div>}
                        </div>

                        {mode !== 'album' && <div>
                           <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-2 transition-colors">📝 Lyrics (optional — helps fans sing along)</label>
                           <textarea value={lyrics} onChange={e=>setLyrics(e.target.value)} rows={6} placeholder="Paste your lyrics here..." className="w-full min-h-[120px] bg-bg-elevated border border-white/5 rounded-2xl px-6 py-4 text-[14px] font-sans focus:border-smash-purple transition-all outline-none text-white resize-y" />
                        </div>}

                        <div className="bg-smash-purple/10 border border-smash-purple/20 rounded-2xl p-6">
                           <h4 className="text-[12px] font-display font-black text-smash-purple uppercase tracking-widest mb-3">After Publishing</h4>
                           <ul className="text-[13px] font-sans text-white space-y-2">
                              <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-smash-purple flex-shrink-0" /> Your music goes to our review team (2–4 hours)</li>
                              <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-smash-purple flex-shrink-0" /> You'll get notified when it's live</li>
                              <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-smash-purple flex-shrink-0" /> Fans worldwide will discover your sound</li>
                           </ul>
                        </div>

                        <div className="flex flex-col gap-4">
                           {!canUploadMore && (
                             <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-sans text-center">
                               You have reached your upload limit. Upgrade your plan to upload more songs.
                             </div>
                           )}
                           <button type="submit" disabled={!canUploadMore || guardResult?.allowed === false} onClick={() => setIsDrafting(false)} className="w-full h-16 bg-gradient-to-r from-smash-purple to-smash-orange text-white font-studio font-black uppercase tracking-widest text-[14px] rounded-2xl disabled:opacity-50 hover:brightness-110 transition-all flex items-center justify-center shadow-[0_10px_30px_rgba(168,85,247,0.3)]">
                             🚀 PUBLISH TO SMASHIFY
                           </button>
                           <button type="submit" onClick={() => setIsDrafting(true)} className="w-full h-16 bg-white/5 border border-white/10 text-white font-studio font-black uppercase tracking-widest text-[14px] rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center">
                             💾 SAVE AS DRAFT
                           </button>
                           <button type="button" onClick={() => setCurrentStep(2)} className="h-12 text-text-muted hover:text-white font-display font-bold uppercase tracking-widest text-[11px] transition-all">← EDIT DETAILS</button>
                        </div>

                     </div>
                  </div>
                )}
             </form>
         )}
      </div>
    </div>
  );
};

const ProfileTab = ({ userProfile }: any) => {
  const limits = useMemo(() => getTierLimits(userProfile), [
    userProfile?.artist_tier,
    userProfile?.subscription_tier,
    userProfile?.subscription_ends,
    userProfile?.extra_track_slots,
  ]);
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
        if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);
        avatarUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
      }

      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${userProfile.id}/banner-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('banners').upload(fileName, bannerFile, { upsert: true });
        if (uploadError) throw new Error(`Banner upload failed: ${uploadError.message}`);
        bannerUrl = supabase.storage.from('banners').getPublicUrl(fileName).data.publicUrl;
      }

      const idDocFile = fd.get('id_document_file') as File;
      let idUrl = userProfile?.id_document_url;
      if (idDocFile && idDocFile.size > 0) {
        const fileExt = idDocFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${userProfile.id}/id-document-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('artist-verifications').upload(fileName, idDocFile, { upsert: true, contentType: idDocFile.type });
        if (uploadError) throw new Error(`ID Document upload failed: ${uploadError.message}`);
        
        const { data: signedData, error: signedErr } = await supabase.storage.from('artist-verifications').createSignedUrl(fileName, 60 * 60 * 24 * 365);
        if (!signedErr && signedData) {
          idUrl = signedData.signedUrl;
        }
      }

      const updateData: any = {
        full_name: fd.get('full_name'),
        stage_name: fd.get('stage_name'),
        genre: fd.get('genre'),
        location: fd.get('location'),
        bio: fd.get('bio'),
        instagram: fd.get('instagram'),
        twitter: fd.get('twitter'),
        instagram_url: fd.get('instagram_url'),
        tiktok_url: fd.get('tiktok_url'),
        facebook_url: fd.get('facebook_url'),
        youtube_url: fd.get('youtube_url'),
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      };
      
      if (!userProfile?.is_verified) {
        if (fd.get('id_type')) updateData.id_type = fd.get('id_type');
        
        const nrcVal = fd.get('nrc_number') as string;
        if (nrcVal) {
          if (!nrcVal.trim()) throw new Error('ID Document Number is required.');
          updateData.nrc_number = nrcVal.trim();
        }

        const phoneVal = fd.get('phone') as string;
        if (phoneVal) {
          if (!phoneVal.trim()) throw new Error('ID Registered Phone Number is required.');
          updateData.phone = phoneVal.trim();
        }
        
        if (idUrl) updateData.id_document_url = idUrl;
      }

      const { error } = await supabase.from('profiles').update(updateData).eq('id', userProfile?.id);

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
                   name={userProfile?.is_verified ? "phone" : "phone_disabled"}
                   defaultValue={userProfile?.phone} 
                   disabled={true}
                   placeholder={userProfile?.is_verified ? "+265..." : "See Identity Verification below"}
                   title={userProfile?.is_verified ? "Locked for withdrawal security" : "Please register your phone number below under Identity Verification"}
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

         <div className="space-y-4 pt-4 border-t border-white/10">
           <p className="text-[11px] font-display font-bold uppercase tracking-widest text-text-muted">Social Links (Optional)</p>
           <div className="grid grid-cols-1 gap-4">
             {[
               { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
               { key: 'tiktok_url', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
               { key: 'facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
               { key: 'youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
             ].map(field => (
               <div key={field.key}>
                 <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-1">
                   {field.label}
                 </label>
                 <input
                   name={field.key}
                   type="url"
                   defaultValue={userProfile?.[field.key]}
                   placeholder={field.placeholder}
                   className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] text-text-primary placeholder:opacity-50 outline-none focus:border-smash-purple focus:ring-[3px] focus:ring-smash-purple/15 transition-all"
                 />
               </div>
             ))}
           </div>
         </div>
         
         {!userProfile?.is_verified && (
           <div className="p-6 bg-smash-orange/5 border border-smash-orange/20 rounded-[14px] space-y-4">
              <div className="flex gap-3 items-center mb-2">
                 <ShieldCheck className="text-smash-orange shrink-0" size={24} />
                 <div>
                    <h4 className="text-smash-orange font-studio font-bold uppercase tracking-widest text-sm">Action Required: Identity Verification</h4>
                    <p className="text-text-muted text-xs font-sans mt-1">To withdraw funds, you must provide your National ID details. If you already submitted a photo during onboarding, just provide the number below.</p>
                 </div>
              </div>
              
              <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-lg text-[11px] text-text-muted leading-relaxed">
                 <span className="text-smash-orange font-bold uppercase tracking-wider block mb-1">Privacy Note</span>
                 Your ID number is collected strictly to verify ownership for financial payouts and prevent fraud. Smashify encrypts this data securely and will never share it with third parties.
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">ID Document Type</label>
                    <select name="id_type" defaultValue={userProfile?.id_type || "National ID"} className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-orange focus:ring-[3px] focus:ring-smash-orange/15 transition-all text-text-primary">
                       <option value="National ID">Malawi National ID</option>
                       <option value="Passport">Passport</option>
                       <option value="Driver License">Driver's License</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">ID Document Number</label>
                    <input name="nrc_number" defaultValue={userProfile?.nrc_number} type="text" placeholder="e.g. A1234567" className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-orange focus:ring-[3px] focus:ring-smash-orange/15 transition-all text-text-primary placeholder:opacity-50" />
                 </div>
                 <div>
                    <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">ID Registered Phone Number</label>
                    <input name="phone" defaultValue={userProfile?.phone} type="text" placeholder="e.g. +26599..." className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-orange focus:ring-[3px] focus:ring-smash-orange/15 transition-all text-text-primary placeholder:opacity-50" />
                 </div>
              </div>

              {!userProfile?.id_document_url && (
                 <div>
                    <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Upload ID Document Photo</label>
                    <input name="id_document_file" type="file" accept="image/*" className="w-full bg-bg-elevated border border-border-default p-2 rounded-[10px] text-[12px] font-display outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-smash-orange file:text-white hover:file:bg-smash-orange/80 cursor-pointer text-text-muted" />
                 </div>
              )}
           </div>
         )}

         <button disabled={saving} type="submit" className="w-full h-[48px] bg-smash-purple text-white font-display font-semibold uppercase tracking-widest rounded-[10px] mt-4 hover:bg-smash-purple/90 transition-colors disabled:opacity-50 text-[13px]">
            {saving ? 'SYNCING...' : 'UPDATE STUDIO PROFILE'}
         </button>
      </form>
    </div>
  );
};



const SubscriptionTab = ({ userProfile, role }: any) => {
  const currentTierRaw = (userProfile?.subscription_tier || userProfile?.artist_tier || 'free').toLowerCase();
  // Normalize the string
  const currentTier = currentTierRaw.includes('rising') ? 'rising_star' : 
                      currentTierRaw.includes('elite') ? 'elite' : 
                      currentTierRaw.includes('standard') ? 'standard' : 'free';
                      
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
               <span className="text-[32px] font-studio font-bold text-text-primary">8,000</span>
               <span className="text-[11px] font-display font-medium text-text-muted uppercase tracking-widest">MWK / 6 MO</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-purple shrink-0 mt-0.5" /> 10 uploads per 6 months</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-purple shrink-0 mt-0.5" /> Tips & fan subscriptions only (no track sales)</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-purple shrink-0 mt-0.5" /> Accept fan subscriptions</li>
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
               <span className="text-[32px] font-studio font-bold text-text-primary">16,000</span>
               <span className="text-[11px] font-display font-medium text-text-muted uppercase tracking-widest">MWK / 6 MO</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-orange shrink-0 mt-0.5" /> 15 uploads per 6 months</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-orange shrink-0 mt-0.5" /> Tips & fan subscriptions only (no track sales)</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-orange shrink-0 mt-0.5" /> 1 free featured placement/mo</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-orange shrink-0 mt-0.5" /> Advanced analytics suite</li>
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
            <h4 className="font-studio font-bold text-[18px] mb-4 text-text-primary flex items-center gap-2"><ShieldCheck className="text-smash-purple" size={20} /> Elite</h4>
            <div className="flex items-baseline gap-1 mb-8">
               <span className="text-[32px] font-studio font-bold text-text-primary">27,000</span>
               <span className="text-[11px] font-display font-medium text-text-muted uppercase tracking-widest">MWK / 6 MO</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-purple shrink-0 mt-0.5" /> 25 uploads per 6 months</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-purple shrink-0 mt-0.5" /> Sell tracks to fans — with fan download access</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-purple shrink-0 mt-0.5" /> Elite exclusive: track sales & downloads</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-purple shrink-0 mt-0.5" /> 3 free featured placements/mo</li>
               <li className="flex items-start gap-3 text-[13px] text-text-secondary font-sans"><CircleCheck size={18} className="text-smash-purple shrink-0 mt-0.5" /> Full analytics with CSV export</li>
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

const AnalyticsTab = ({ userProfile }: any) => {
  const [songStats, setSongStats] = useState<any[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<any[]>([]);
  const [tipHistory, setTipHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const limits = useMemo(() => getTierLimits(userProfile), [userProfile?.artist_tier]);

  useEffect(() => {
    const fetch = async () => {
      if (!userProfile?.id) return;
      setLoading(true);

      // Per-song performance
      const { data: songs } = await supabase
        .from('songs')
        .select('id, title, plays, sales, cover_url, slot_mode, plays_this_month')
        .eq('artist_id', userProfile.id)
        .eq('is_active', true)
        .order('plays', { ascending: false })
        .limit(10);
      setSongStats(songs || []);

      // Monthly earnings from transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select('net_amount, type, created_at')
        .eq('artist_id', userProfile.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      // Group by month
      const grouped: Record<string, number> = {};
      (txns || []).forEach(tx => {
        const month = new Date(tx.created_at).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        grouped[month] = (grouped[month] || 0) + Number(tx.net_amount || 0);
      });
      setMonthlyEarnings(Object.entries(grouped).map(([month, amount]) => ({ month, amount })));

      // Tip/donation history
      const { data: tips } = await supabase
        .from('transactions')
        .select('gross_amount, net_amount, created_at, metadata')
        .eq('artist_id', userProfile.id)
        .eq('type', 'donation')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);
      setTipHistory(tips || []);

      setLoading(false);
    };
    fetch();
  }, [userProfile?.id]);

  if (loading) return <div className="py-20 text-center text-smash-gray">Loading analytics...</div>;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-[28px] font-studio font-bold uppercase text-text-primary flex items-center gap-3">
          <BarChart2 className="text-smash-purple" /> Analytics
        </h2>
        <p className="text-text-secondary text-sm mt-1">Track your performance across all your music</p>
      </div>

      {/* Monthly Earnings Chart */}
      <div className="bg-bg-surface border border-border-default rounded-[14px] p-6">
        <h3 className="font-bold text-white mb-1">Monthly Earnings</h3>
        <p className="text-xs text-smash-gray mb-6">Net earnings after platform fee</p>
        {monthlyEarnings.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyEarnings}>
                <defs>
                  <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `MK${v/1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#1a2232', borderColor: 'rgba(100,116,139,0.3)', borderRadius: '8px' }} formatter={(v: any) => [`MK ${Number(v).toLocaleString()}`, 'Earnings']} />
                <Area type="monotone" dataKey="amount" stroke="#a855f7" fillOpacity={1} fill="url(#earningsGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-smash-gray py-8 text-sm">No earnings data yet. Start promoting your music!</p>
        )}
      </div>

      {/* Top Songs by Performance */}
      <div className="bg-bg-surface border border-border-default rounded-[14px] p-6">
        <h3 className="font-bold text-white mb-6">Top Songs Performance</h3>
        <div className="space-y-4">
          {songStats.length === 0 ? (
            <p className="text-center text-smash-gray py-8 text-sm">No songs uploaded yet.</p>
          ) : songStats.map((song, i) => {
            const maxPlays = songStats[0]?.plays || 1;
            const pct = Math.round((song.plays / maxPlays) * 100);
            return (
              <div key={song.id} className="flex items-center gap-4">
                <span className="text-[10px] font-black text-smash-gray w-4 shrink-0">#{i + 1}</span>
                <img src={song.cover_url || ''} className="w-10 h-10 rounded-xl object-cover shrink-0" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-white truncate">{song.title}</p>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-[10px] font-black text-smash-gray">{song.plays?.toLocaleString()} plays</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        song.slot_mode === 'hot' ? 'bg-orange-500/20 text-orange-400' :
                        song.slot_mode === 'active' ? 'bg-green-500/20 text-green-400' :
                        song.slot_mode === 'cold' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-white/10 text-smash-gray'
                      }`}>
                        {song.slot_mode || 'active'}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-smash-purple rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Tips */}
      {tipHistory.length > 0 && (
        <div className="bg-bg-surface border border-border-default rounded-[14px] p-6">
          <h3 className="font-bold text-white mb-6">Recent Tips Received 💸</h3>
          <div className="space-y-3">
            {tipHistory.map((tip, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-bold text-white">MK {Number(tip.gross_amount).toLocaleString()}</p>
                  <p className="text-[10px] text-smash-gray">{new Date(tip.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <p className="text-xs text-smash-green font-bold">Net: MK {Number(tip.net_amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const FansTab = ({ userProfile }: any) => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [topTippers, setTopTippers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!userProfile?.id) return;

      // Fan subscriptions
      const { data: subs } = await supabase
        .from('fan_subscriptions')
        .select('*, user_profiles!fan_id(full_name, avatar_url)')
        .eq('artist_id', userProfile.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false });
      setSubscribers(subs || []);

      // Top tippers from transactions
      const { data: tips } = await supabase
        .from('transactions')
        .select('fan_id, gross_amount, user_profiles!fan_id(full_name, avatar_url)')
        .eq('artist_id', userProfile.id)
        .eq('type', 'donation')
        .eq('status', 'completed')
        .order('gross_amount', { ascending: false })
        .limit(10);
      setTopTippers(tips || []);

      setLoading(false);
    };
    fetch();
  }, [userProfile?.id]);

  if (loading) return <div className="py-20 text-center text-smash-gray">Loading fans...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-[28px] font-studio font-bold uppercase text-text-primary flex items-center gap-3">
          <Users className="text-smash-purple" /> Fan Base
        </h2>
        <p className="text-text-secondary text-sm mt-1">Your active subscribers and top supporters</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border-default rounded-2xl p-5 text-center">
          <p className="text-3xl font-black text-smash-purple">{subscribers.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mt-1">Active Subscribers</p>
          <p className="text-xs text-smash-gray mt-1">MK {(subscribers.length * 150).toLocaleString()} monthly</p>
        </div>
        <div className="bg-bg-surface border border-border-default rounded-2xl p-5 text-center">
          <p className="text-3xl font-black text-smash-green">{topTippers.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mt-1">Tip Supporters</p>
          <p className="text-xs text-smash-gray mt-1">Total tips received</p>
        </div>
      </div>

      {/* Active Subscribers List */}
      <div className="bg-bg-surface border border-border-default rounded-[14px] p-6">
        <h3 className="font-bold text-white mb-6">
          Active Subscribers ({subscribers.length})
        </h3>
        {subscribers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-smash-gray text-sm">No subscribers yet.</p>
            <p className="text-smash-gray text-xs mt-1">Promote your profile to attract monthly fans.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subscribers.map((sub, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-smash-purple/20 flex items-center justify-center text-smash-purple font-black text-sm">
                    {sub.user_profiles?.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{sub.user_profiles?.full_name || 'Anonymous Fan'}</p>
                    <p className="text-[10px] text-smash-gray">Since {new Date(sub.started_at).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>
                <span className="text-xs font-black text-smash-green px-2 py-1 bg-smash-green/10 rounded-full">
                  Active
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Tippers */}
      {topTippers.length > 0 && (
        <div className="bg-bg-surface border border-border-default rounded-[14px] p-6">
          <h3 className="font-bold text-white mb-6">Top Supporters 💸</h3>
          <div className="space-y-3">
            {topTippers.map((tip, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-smash-gray w-5">#{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-smash-orange/20 flex items-center justify-center text-smash-orange font-black text-sm">
                    {tip.user_profiles?.full_name?.[0] || '?'}
                  </div>
                  <p className="text-sm font-bold text-white">{tip.user_profiles?.full_name || 'Anonymous'}</p>
                </div>
                <p className="text-sm font-black text-smash-orange">MK {Number(tip.gross_amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CatalogHealthWidget = ({ artistId }: { artistId: string }) => {
  const [data, setData] = useState({ hot: 0, active: 0, cold: 0, archive: 0 });

  useEffect(() => {
    if (!artistId) return;
    supabase.from('songs').select('slot_mode').eq('artist_id', artistId).eq('is_active', true)
      .then(({ data: songs }) => {
        if (!songs) return;
        setData({
          hot:     songs.filter(s => s.slot_mode === 'hot').length,
          active:  songs.filter(s => s.slot_mode === 'active').length,
          cold:    songs.filter(s => s.slot_mode === 'cold').length,
          archive: songs.filter(s => s.slot_mode === 'archive').length,
        });
      });
  }, [artistId]);

  const total = data.hot + data.active + data.cold;
  return (
    <div className="flex gap-4 flex-wrap">
      {[
        { label: '🔥 Hot', count: data.hot, color: 'text-orange-400' },
        { label: '✅ Active', count: data.active, color: 'text-green-400' },
        { label: '🧊 Cold', count: data.cold, color: 'text-blue-400' },
        { label: '📦 Archive (free)', count: data.archive, color: 'text-smash-gray' },
      ].map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`text-sm font-black ${item.color}`}>{item.count}</span>
          <span className="text-[10px] text-smash-gray font-bold uppercase tracking-widest">{item.label}</span>
        </div>
      ))}
      {total > 0 && (
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex mt-2">
          <div className="h-full bg-orange-400" style={{ width: `${(data.hot / total) * 100}%` }} />
          <div className="h-full bg-green-400" style={{ width: `${(data.active / total) * 100}%` }} />
          <div className="h-full bg-blue-400" style={{ width: `${(data.cold / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
};
