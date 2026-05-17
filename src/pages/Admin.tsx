import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, CheckCircle2, Trash2, Music2, Plus, FileAudio, X, Flame, 
  Volume2, VolumeX, Edit3, LayoutDashboard, Clock, Radio, Wallet, DollarSign,
  Mic2, Users, ShoppingCart, Heart, CreditCard, Search, ArrowLeft, TrendingUp,
  Pause, Play
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'listeners' | 'artists' | 'songs' | 'applications' | 'song-reviews' | 'snippet-reviews' | 'ads' | 'payouts'>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as any;
    if (tab && ['overview', 'listeners', 'artists', 'songs', 'applications', 'song-reviews', 'snippet-reviews', 'ads', 'payouts'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);
  const [artists, setArtists] = useState<any[]>([]); 
  const [listeners, setListeners] = useState<any[]>([]); 
  const [allSongs, setAllSongs] = useState<any[]>([]); 
  const [applications, setApplications] = useState<any[]>([]); 
  const [pendingSongs, setPendingSongs] = useState<any[]>([]); 
  const [pendingSnippets, setPendingSnippets] = useState<any[]>([]); 
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdForm, setShowAdForm] = useState(false);
  const [adUploading, setAdUploading] = useState(false);
  
  const [platformStats, setPlatformStats] = useState({
    totalArtists: 0, totalListeners: 0, totalSongs: 0,
    totalPlays: 0, pendingApplications: 0, pendingSongs: 0,
    totalRevenue: 0, activeAds: 0,
  });

  const { userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const isAdmin = userProfile?.is_admin || userProfile?.role === 'admin';
    if (userProfile && !isAdmin) {
      toast.error('Unauthorized access');
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchAllData();
    }
  }, [userProfile, navigate]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchArtists(),
      fetchListeners(),
      fetchApplications(),
      fetchPendingSongs(),
      fetchPendingSnippets(),
      fetchAllSongs(),
      fetchAds(),
      fetchPayoutRequests(),
      fetchPlatformStats()
    ]);
    setLoading(false);
  };

  const fetchPendingSnippets = async () => {
    const { data } = await supabase
      .from('moto_feed')
      .select('*, profiles:artist_id(stage_name, avatar_url)')
      .eq('approved', false)
      .order('created_at', { ascending: true });
    setPendingSnippets(data || []);
  };

  const approveSnippet = async (id: string) => {
    const { error } = await supabase.from('moto_feed').update({ approved: true }).eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Feed snippet approved!');
      fetchPendingSnippets();
    }
  };

  const rejectSnippet = async (id: string) => {
    if (!confirm('Reject and delete this snippet?')) return;
    const { error } = await supabase.from('moto_feed').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Snippet removed.');
      fetchPendingSnippets();
    }
  };

  const fetchPlatformStats = async () => {
    try {
      const [
        { count: totalArtists },
        { count: totalListeners },
        { count: totalSongs },
        { count: pendingSongsCount },
        { data: revenueData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'artist'),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('songs').select('*', { count: 'exact', head: true }).eq('approved', true),
        supabase.from('songs').select('*', { count: 'exact', head: true }).eq('approved', false),
        supabase.from('transactions').select('platform_fee').eq('status', 'completed'),
      ]);
      const totalRev = (revenueData || []).reduce((a, t) => a + (t.platform_fee || 0), 0) || 0;
      
      setPlatformStats({
        totalArtists: totalArtists || 0,
        totalListeners: totalListeners || 0,
        totalSongs: totalSongs || 0,
        pendingSongs: pendingSongsCount || 0,
        pendingApplications: (applications || []).length,
        totalRevenue: totalRev,
        activeAds: (ads || []).filter(a => a?.active).length,
        totalPlays: 0, 
      });
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const fetchAds = async () => {
    const { data } = await supabase.from('audio_ads').select('*').order('created_at', { ascending: false });
    setAds(data || []);
  };

  const fetchPayoutRequests = async () => {
    const { data } = await supabase
      .from('payout_requests')
      .select('*, profiles!artist_id(full_name, stage_name, avatar_url, email, wallet_balance)')
      .order('created_at', { ascending: false });
    setPayoutRequests(data || []);
  };

  const [processingId, setProcessingId] = useState<string|null>(null);
  const [adminNote, setAdminNote] = useState('');

  const markAsPaid = async (
    payoutId: string,
    note: string
  ) => {
    setProcessingId(payoutId);
    try {
      const { error } = await supabase
        .from('payout_requests')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: userProfile?.id,
          admin_note: note || 'Paid by admin'
        })
        .eq('id', payoutId);

      if (error) throw error;
      toast.success('Marked as paid! Artist has been notified.');
      fetchPayoutRequests(); // Call the existing fetch
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const rejectPayout = async (
    payoutId: string,
    reason: string
  ) => {
    if (!reason.trim()) {
      return toast.error('Please provide a rejection reason');
    }
    setProcessingId(payoutId);
    try {
      const { error } = await supabase
        .from('payout_requests')
        .update({
          status: 'rejected',
          admin_note: reason,
          paid_by: userProfile?.id
        })
        .eq('id', payoutId);

      if (error) throw error;
      // Wallet refund is handled by the DB trigger
      toast.success('Rejected. Artist wallet has been refunded.');
      fetchPayoutRequests();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAdUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdUploading(true);
    const fd = new FormData(e.currentTarget);
    const file = fd.get('audio') as File;

    try {
      const path = `ads/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('audio_ads').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('audio_ads').getPublicUrl(path);

      const { error } = await supabase.from('audio_ads').insert({
        advertiser_name: fd.get('advertiser_name'),
        title: fd.get('title'),
        type: fd.get('type'),
        audio_url: publicUrl,
        plays_purchased: parseInt(fd.get('plays_purchased') as string),
        plays_used: 0,
        active: true,
        revenue: parseFloat(fd.get('revenue') as string) || 0,
      });
      if (error) throw error;

      toast.success('Ad uploaded and activated!');
      setShowAdForm(false);
      fetchAds();
      fetchPlatformStats();
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setAdUploading(false);
    }
  };

  const fetchListeners = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setListeners(data || []);
  };

  const fetchPendingSongs = async () => {
    const { data } = await supabase
      .from('songs')
      .select('*, profiles!artist_id(stage_name, full_name, email)')
      .eq('approved', false)
      .order('created_at', { ascending: true });
    setPendingSongs(data || []);
  };

  const fetchAllSongs = async () => {
    const { data } = await supabase
      .from('songs')
      .select('*, profiles!artist_id(stage_name, full_name, email)')
      .order('created_at', { ascending: false });
    setAllSongs(data || []);
  };

  const toggleAdStatus = async (ad: any) => {
    const { error } = await supabase.from('audio_ads').update({ active: !ad.active }).eq('id', ad.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Ad ${ad.active ? 'deactivated' : 'activated'}`);
      fetchAds();
    }
  };

  const deleteAd = async (adId: string) => {
    if (!confirm('Delete this ad permanently?')) return;
    const { error } = await supabase.from('audio_ads').delete().eq('id', adId);
    if (error) toast.error(error.message);
    else {
      toast.success('Ad deleted');
      fetchAds();
    }
  };

  const fetchArtists = async () => {
    const { data: artistsData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_type', 'artist')
      .eq('approved', true)
      .order('created_at', { ascending: false });
    
    if (artistsData) {
      const artistsWithPending = await Promise.all(artistsData.map(async (art) => {
        const { count } = await supabase.from('songs').select('*', { count: 'exact', head: true }).eq('artist_id', art.id).eq('approved', false);
        return { ...art, pending_songs: count || 0 };
      }));
      setArtists(artistsWithPending);
    }
  };

  const fetchApplications = async () => {
    const { data } = await supabase
      .from('artist_applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setApplications(data || []);
  };

  const approveArtist = async (application: any) => {
    try {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: application.profile_id,
        full_name: application.full_name,
        stage_name: application.stage_name,
        email: application.email,
        genre: application.genre,
        city: application.city,
        phone: application.phone,
        approved: true,
        verified: false,
        wallet_balance: 0,
        user_type: 'artist',
        artist_tier: 'Free',
      });
      if (profileError) throw profileError;

      const { error: appError } = await supabase
        .from('artist_applications')
        .update({ status: 'approved' })
        .eq('id', application.id);
      if (appError) throw appError;

      toast.success(`${application.stage_name} approved!`);
      fetchApplications();
      fetchArtists();

    } catch (err: any) {
      toast.error('Approval failed: ' + err.message);
    }
  };

  const approveSong = async (songId: string) => {
    const { error } = await supabase.from('songs').update({ approved: true }).eq('id', songId);
    if (error) toast.error(error.message);
    else {
      toast.success('Song approved and is now live!');
      fetchPendingSongs();
      fetchArtists();
    }
  };

  const rejectSong = async (songId: string) => {
    if (!confirm('Reject and delete this song permanently?')) return;
    const { error } = await supabase.from('songs').delete().eq('id', songId);
    if (error) toast.error(error.message);
    else {
      toast.success('Song rejected and removed');
      fetchPendingSongs();
    }
  };

  const rejectArtist = async (application: any, reason: string = "Not eligible") => {
    try {
      await supabase.from('artist_applications')
        .update({ status: 'rejected', admin_notes: reason })
        .eq('id', application.id);

      await supabase.from('user_profiles').upsert({
        id: application.profile_id,
        full_name: application.full_name,
        email: application.email,
        subscription_tier: 'Free',
        user_type: 'listener',
      });

      toast.success('Application rejected.');
      fetchApplications();

    } catch (err: any) {
      toast.error('Rejection failed: ' + err.message);
    }
  };

  const approveAllSongs = async (artistId: string) => {
    const { error } = await supabase.from('songs').update({ approved: true }).eq('artist_id', artistId).eq('approved', false);
    if (error) toast.error(error.message);
    else {
      toast.success('All songs for this artist approved!');
      fetchArtists();
      fetchPendingSongs();
    }
  };

  const toggleArtistVerification = async (artistId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ verified: !currentStatus })
      .eq('id', artistId);
    
    if (error) toast.error(error.message);
    else {
      toast.success(`Artist ${!currentStatus ? 'verified' : 'unverified'}`);
      fetchArtists();
    }
  };

  const deleteArtist = async (id: string, name: string) => {
    if (!confirm(`Permanently delete artist "${name}"?`)) return;
    try {
      await supabase.from('songs').delete().eq('artist_id', id);
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Artist removed.');
      fetchArtists();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Permanently delete listener "${name}"?`)) return;
    try {
      const { error } = await supabase.from('user_profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Listener removed.');
      fetchListeners();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  if (!userProfile?.is_admin && userProfile?.role !== 'admin') return null;

  const TabButton = ({ id, label, icon: Icon, count }: { id: typeof activeTab, label: string, icon: any, count?: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`relative flex items-center gap-2 px-6 py-4 transition-all uppercase font-black text-[10px] tracking-[0.15em] shrink-0 ${
        activeTab === id 
          ? 'text-white' 
          : 'text-smash-gray hover:text-white'
      }`}
    >
      <Icon size={14} className={activeTab === id ? 'text-smash-purple' : ''} />
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 bg-smash-red text-white rounded text-[8px] font-black animate-pulse">
          {count}
        </span>
      )}
      {activeTab === id && (
        <motion.div 
          layoutId="tab-active"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-smash-purple shadow-[0_0_10px_rgba(155,93,229,0.5)]"
        />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#060608] text-white flex overflow-hidden">
      {/* Admin Sidebar */}
      <aside className={`bg-[#0c0c10] border-r border-white/5 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} hidden lg:flex`}>
         <div className="h-16 flex items-center px-6 border-b border-white/5 gap-3">
            <div className="w-8 h-8 rounded-lg bg-smash-purple flex items-center justify-center text-white shrink-0">
               <ShieldCheck size={20} />
            </div>
            {!sidebarCollapsed && (
              <div className="leading-tight">
                <h1 className="font-studio font-black text-sm uppercase tracking-tighter">Admin <span className="text-white/40">HQ</span></h1>
                <p className="text-[8px] text-smash-purple uppercase font-bold tracking-widest leading-none">Terminal v2.4</p>
              </div>
            )}
         </div>

         <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto no-scrollbar">
            <AdminSidebarItem id="overview" label="Review Overview" icon={LayoutDashboard} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <div className="h-px bg-white/5 my-4 mx-3" />
            <p className={`text-[9px] font-black text-smash-gray uppercase tracking-widest mb-2 px-3 ${sidebarCollapsed ? 'sr-only' : ''}`}>Governance</p>
            <AdminSidebarItem id="applications" label="Applicants" icon={CheckCircle2} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={applications.length} />
            <AdminSidebarItem id="song-reviews" label="Song Reviews" icon={Music2} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={pendingSongs.length} />
            <AdminSidebarItem id="snippet-reviews" label="Moto Feed" icon={Radio} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={pendingSnippets.length} />
            <AdminSidebarItem id="payouts" label="Payout Registry" icon={Wallet} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={payoutRequests.filter(p => p.status === 'processing').length} />
            
            <div className="h-px bg-white/5 my-4 mx-3" />
            <p className={`text-[9px] font-black text-smash-gray uppercase tracking-widest mb-2 px-3 ${sidebarCollapsed ? 'sr-only' : ''}`}>Directory</p>
            <AdminSidebarItem id="artists" label="Verify Artists" icon={Mic2} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="listeners" label="Listener Base" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="songs" label="Main Catalog" icon={Music2} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="ads" label="Commercials" icon={Radio} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
         </nav>

         <div className="p-4 border-t border-white/5">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full h-10 flex items-center justify-center text-smash-gray hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
               {sidebarCollapsed ? <Plus className="rotate-45" size={18} /> : <div className="text-[10px] font-bold uppercase tracking-widest">Collapse Menu</div>}
            </button>
         </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-[#0c0c10]/80 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/')} className="p-2 -ml-2 text-smash-gray hover:text-white transition-colors lg:hidden">
                <ArrowLeft size={20} />
             </button>
             <h2 className="text-sm font-studio font-black uppercase tracking-widest italic">{activeTab.replace('-', ' ')}</h2>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative group w-64 hidden md:block">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-smash-gray" />
                <input 
                  type="text"
                  placeholder="Universal Audit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#16161e] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-[11px] font-bold focus:outline-none focus:border-smash-purple transition-all"
                />
             </div>
             <div className="h-4 w-px bg-white/10 mx-2" />
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-smash-purple/10 flex items-center justify-center text-smash-purple font-black text-xs">{userProfile?.full_name?.[0]}</div>
                <div className="hidden sm:block">
                   <p className="text-[10px] font-black uppercase tracking-tighter leading-none">{userProfile?.full_name?.split(' ')[0]}</p>
                   <p className="text-[8px] text-smash-gray uppercase font-bold tracking-widest mt-0.5">Administrator</p>
                </div>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
           <div className="max-w-7xl mx-auto space-y-12">
              {/* KPIs with refined design */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <KpiCard 
                   title="Platform Revenue" 
                   value={`MK ${platformStats.totalRevenue.toLocaleString()}`} 
                   trend="+12.4%" 
                   icon={DollarSign} 
                   color="text-smash-green" 
                 />
                 <KpiCard 
                   title="Total Network" 
                   value={(platformStats.totalArtists + platformStats.totalListeners).toLocaleString()} 
                   trend="Active" 
                   icon={Users} 
                   color="text-smash-cyan" 
                 />
                 <KpiCard 
                   title="Review Queue" 
                   value={applications.length + pendingSongs.length + pendingSnippets.length} 
                   trend="Urgent" 
                   icon={Clock} 
                   color="text-smash-orange" 
                 />
                 <KpiCard 
                   title="Net Payouts" 
                   value={payoutRequests.filter(p => p.status === 'processing').length} 
                   trend="Pending" 
                   icon={Wallet} 
                   color="text-smash-purple" 
                 />
              </div>

              {loading ? (
                 <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <div className="w-10 h-10 border-2 border-smash-purple border-t-transparent rounded-full animate-spin" />
                    <p className="text-smash-gray font-black uppercase text-[10px] tracking-widest">Hydrating Terminal...</p>
                 </div>
              ) : (
                <AnimatePresence mode="wait">
                  <div key={activeTab}>
                    {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* System Audit Card */}
                  <div className="col-span-1 lg:col-span-2 p-8 bg-white/2 border border-white/5 rounded-[40px] space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-smash-purple/20 flex items-center justify-center text-smash-purple">
                            <ShieldCheck size={20} />
                         </div>
                         <h3 className="font-studio font-black uppercase italic text-xl">Governance Dashboard</h3>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <button onClick={() => setActiveTab('applications')} className="group p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-smash-purple transition-all text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mb-1">Artist Pipeline</p>
                          <div className="flex items-center justify-between">
                             <h4 className="text-2xl font-studio font-black italic">{applications.length} PENDING</h4>
                             <ArrowLeft size={16} className="rotate-180 text-smash-purple group-hover:translate-x-1 transition-transform" />
                          </div>
                       </button>
                       <button onClick={() => setActiveTab('song-reviews')} className="group p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-smash-purple transition-all text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mb-1">Content Review</p>
                          <div className="flex items-center justify-between">
                             <h4 className="text-2xl font-studio font-black italic">{pendingSongs.length} SONGS</h4>
                             <ArrowLeft size={16} className="rotate-180 text-smash-purple group-hover:translate-x-1 transition-transform" />
                          </div>
                       </button>
                    </div>

                    <div className="p-6 bg-smash-purple/5 border border-smash-purple/10 rounded-3xl">
                       <p className="text-xs font-bold text-white/80 leading-relaxed">
                          All artist payouts are manually verified against wallet balances and transaction logs. 
                          Verification ensures that only organic earnings are withdrawn.
                       </p>
                    </div>
                  </div>

                  {/* Operational Health */}
                  <div className="p-8 bg-white/2 border border-white/5 rounded-[40px] flex flex-col justify-between">
                     <div>
                        <div className="flex items-center gap-2 mb-6">
                          <div className="w-8 h-8 rounded-lg bg-smash-green/20 flex items-center justify-center text-smash-green">
                             <ShieldCheck size={16} />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest leading-none">Security Node</p>
                        </div>
                        <h4 className="text-2xl font-studio font-black italic uppercase leading-tight mb-4">Integrity Check</h4>
                        <p className="text-xs text-smash-gray leading-relaxed font-bold">
                           Malawian ID verification is required for all Elite tier artists. Rising Star and Standard tiers are verified through social proof and phone numbers.
                        </p>
                     </div>
                     <div className="pt-6 border-t border-white/5 mt-6">
                        <div className="flex items-center justify-between mb-4">
                           <p className="text-[10px] font-black uppercase text-smash-gray">Uptime</p>
                           <p className="text-[10px] font-black uppercase text-smash-green">99.9%</p>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-smash-green w-[99.9%]" />
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'listeners' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111118] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                     <div>
                        <h3 className="font-studio font-black italic uppercase text-lg">Listener Network</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mt-1">Fanbase Management</p>
                     </div>
                     <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <p className="text-[10px] font-black uppercase text-smash-gray tracking-widest">Global Reach: {listeners.length}</p>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-smash-gray bg-white/[0.02]">
                          <th className="px-8 py-5">Full Identity</th>
                          <th className="px-8 py-5">Subscription</th>
                          <th className="px-8 py-5">Node Identity</th>
                          <th className="px-8 py-5 text-right">Moderation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {listeners.filter(l => l.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                          <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 p-0.5 border border-white/10 group-hover:border-smash-purple/30 transition-colors">
                                  <img src={l.avatar_url || "https://placehold.co/40x40/18162C/9B5DE5?text=?"} className="w-full h-full rounded-[10px] object-cover" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-white group-hover:text-smash-purple transition-colors">{l.full_name || 'Anonymous'}</p>
                                  <p className="text-[10px] text-smash-gray font-medium tracking-tight truncate max-w-[140px] lowercase">{l.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg ${l.subscription_tier === 'Premium' ? 'bg-smash-orange text-black' : 'bg-white/5 text-smash-gray'}`}>
                                {l.subscription_tier || 'Free'}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-[11px] font-bold text-white/60">
                               {l.phone || '--'}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button onClick={() => deleteUser(l.id, l.full_name)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-smash-red text-smash-gray hover:text-white rounded-lg transition-all">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'artists' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111118] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                   <div className="p-8 border-b border-white/5 flex items-center justify-between">
                      <div>
                         <h3 className="font-studio font-black italic uppercase text-lg">Artist Ecosystem</h3>
                         <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mt-1">Verified Talent Management</p>
                      </div>
                      <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <p className="text-[10px] font-black uppercase text-smash-gray tracking-widest">Active Pool: {artists.length}</p>
                      </div>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead>
                         <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-smash-gray bg-white/[0.02]">
                           <th className="px-8 py-5">Artist Signature</th>
                           <th className="px-8 py-5">Studio Wallet</th>
                           <th className="px-8 py-5">Moderation Queue</th>
                           <th className="px-8 py-5 text-right">Logic Gates</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 text-sm">
                         {artists.filter(a => a.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(a => (
                           <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-white/5 p-0.5 border border-white/10 group-hover:border-smash-purple/30 transition-colors">
                                    <img src={a.avatar_url || "https://placehold.co/40x40/18162C/9B5DE5?text=?"} className="w-full h-full rounded-[10px] object-cover" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm text-white group-hover:text-smash-purple transition-colors flex items-center gap-2">
                                      {a.stage_name} 
                                      {a.verified && <ShieldCheck size={14} className="text-smash-cyan" />}
                                    </p>
                                    <p className="text-[10px] text-smash-gray font-black uppercase tracking-widest opacity-60">
                                      {a.city} • {a.genre}
                                    </p>
                                  </div>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <div className="space-y-1">
                                   <p className="font-studio font-black italic text-smash-green text-lg leading-none">MK {a.wallet_balance?.toLocaleString() || 0}</p>
                                   <p className="text-[8px] font-black uppercase tracking-widest text-smash-gray">Available Liquidity</p>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                {a.pending_songs > 0 ? (
                                   <div onClick={() => setActiveTab('song-reviews')} className="flex items-center gap-2 text-smash-orange font-black text-[10px] uppercase tracking-widest cursor-pointer hover:underline">
                                      <div className="w-2 h-2 bg-smash-orange rounded-full animate-pulse" />
                                      {a.pending_songs} Review items
                                   </div>
                                ) : (
                                   <span className="text-smash-gray text-[9px] uppercase font-black italic tracking-widest opacity-40">Queue Clear</span>
                                )}
                             </td>
                             <td className="px-8 py-6 text-right flex items-center justify-end gap-3">
                                <button 
                                  onClick={() => toggleArtistVerification(a.id, !!a.verified)}
                                  className={`px-4 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                    a.verified 
                                      ? 'bg-smash-cyan/10 text-smash-cyan border-smash-cyan/20 hover:bg-smash-cyan hover:text-black' 
                                      : 'bg-white/5 text-smash-gray border-white/5 hover:border-smash-cyan hover:text-smash-cyan'
                                  }`}
                                >
                                  {a.verified ? 'Verified' : 'Verify'}
                                </button>
                                
                                <button onClick={() => deleteArtist(a.id, a.stage_name)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-smash-red text-smash-gray hover:text-white rounded-lg transition-all">
                                  <Trash2 size={14} />
                                </button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </motion.div>
              )}

              {activeTab === 'payouts' && (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black font-display uppercase italic text-white">
          Payout Requests
        </h2>
        <div className="flex gap-3 text-sm">
          <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full font-bold">
            {payoutRequests.filter(p => p.status === 'pending').length} Pending
          </span>
          <span className="px-3 py-1 bg-smash-green/10 text-smash-green rounded-full font-bold">
            {payoutRequests.filter(p => p.status === 'paid').length} Paid
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-smash-gray">
          Loading...
        </div>
      ) : payoutRequests.length === 0 ? (
        <div className="text-center py-12 text-smash-gray">
          No payout requests yet
        </div>
      ) : (
        <div className="space-y-4">
          {payoutRequests.map((payout) => (
            <div key={payout.id}
              className={`p-5 rounded-3xl border transition-all ${
                payout.status === 'pending'
                  ? 'bg-yellow-500/5 border-yellow-500/20'
                  : payout.status === 'paid'
                  ? 'bg-smash-green/5 border-smash-green/20'
                  : 'bg-white/5 border-white/10'
              }`}>

              {/* Header row */}
              <div className="flex items-start justify-between mb-4 gap-4">
                <div>
                  <p className="font-black text-base text-white">
                    {payout.profiles?.stage_name || payout.artist_name || 'Unknown Artist'}
                  </p>
                  <p className="text-xs text-smash-gray mt-0.5">
                    {payout.profiles?.artist_tier || 'Free'} tier •{' '}
                    {new Date(payout.requested_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className="text-2xl font-black text-smash-orange font-display shrink-0">
                  MK {Number(payout.amount || payout.requested_amount).toLocaleString()}
                </span>
              </div>

              {/* Payment details */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-white/5 rounded-2xl">
                  <p className="text-[10px] text-smash-gray uppercase tracking-widest mb-1">
                    Network
                  </p>
                  <p className="font-bold text-sm text-white">
                    {payout.network || 'Not specified'}
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl">
                  <p className="text-[10px] text-smash-gray uppercase tracking-widest mb-1">
                    Phone Number
                  </p>
                  <p className="font-bold text-sm font-mono text-white">
                    {payout.artist_phone || payout.phone || payout.profiles?.phone || 'Not set'}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">
                {(payout.status === 'pending' || payout.status === 'processing') && (
                  <span className="text-xs font-bold px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full">
                    ⏳ Awaiting Payment
                  </span>
                )}
                {payout.status === 'paid' && (
                  <div>
                    <span className="text-xs font-bold px-3 py-1 bg-smash-green/10 text-smash-green border border-smash-green/20 rounded-full">
                      ✅ Paid
                    </span>
                    {payout.paid_at && (
                      <p className="text-xs text-smash-gray mt-2">
                        Paid on {new Date(payout.paid_at).toLocaleString('en-GB')}
                      </p>
                    )}
                    {payout.admin_note && (
                      <p className="text-xs text-smash-gray mt-1">
                        Note: {payout.admin_note}
                      </p>
                    )}
                  </div>
                )}
                {(payout.status === 'rejected' || payout.status === 'failed') && (
                  <div>
                    <span className="text-xs font-bold px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
                      ✗ Rejected
                    </span>
                    {payout.admin_note && (
                      <p className="text-xs text-red-400 mt-2">
                        Reason: {payout.admin_note}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Admin actions — only for pending */}
              {(payout.status === 'pending' || payout.status === 'processing') && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="bg-smash-orange/10 border border-smash-orange/20 rounded-2xl p-3">
                    <p className="text-xs font-bold text-smash-orange mb-1">
                      📱 Action Required
                    </p>
                    <p className="text-xs text-smash-green/80">
                      Send MK {Number(payout.amount || payout.requested_amount).toLocaleString()} to{' '}
                      <span className="font-mono font-bold text-white">
                        {payout.artist_phone || payout.phone || payout.profiles?.phone}
                      </span>{' '}
                      via {payout.network}, then mark as paid.
                    </p>
                  </div>

                  <input
                    type="text"
                    placeholder="Add a note (optional, e.g. Sent 9:05am)"
                    value={processingId === payout.id ? adminNote : ''}
                    onChange={(e) => {
                      setProcessingId(payout.id);
                      setAdminNote(e.target.value);
                    }}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white placeholder-smash-gray outline-none focus:border-smash-orange/50"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => markAsPaid(
                        payout.id,
                        processingId === payout.id ? adminNote : ''
                      )}
                      disabled={processingId === payout.id ? (!adminNote && false) : false}
                      className="flex-1 h-11 bg-smash-green text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      ✅ Mark as Paid
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Rejection reason (required):');
                        if (reason) rejectPayout(payout.id, reason);
                      }}
                      className="flex-1 h-11 bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl font-bold text-sm hover:bg-red-500/30 transition-all"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )}

              {activeTab === 'songs' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111118] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                     <div>
                        <h3 className="font-studio font-black italic uppercase text-lg">Asset Master List</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mt-1">Full Song Database Governance</p>
                     </div>
                     <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <p className="text-[10px] font-black uppercase text-smash-gray tracking-widest">Global Assets: {allSongs.length}</p>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/[0.02] text-smash-gray text-[9px] uppercase tracking-[0.2em] font-black">
                        <tr>
                          <th className="px-8 py-5">Production</th>
                          <th className="px-8 py-5">Artist Signature</th>
                          <th className="px-8 py-5">Network Status</th>
                          <th className="px-8 py-5 text-right">Moderation Logic</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allSongs.filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || s.profiles?.stage_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((song) => (
                          <tr key={song.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-smash-purple group-hover:scale-105 transition-transform">
                                     <Music2 size={18} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm text-white leading-none mb-1 group-hover:text-smash-purple transition-colors truncate max-w-[200px]">{song.title}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-smash-gray opacity-60">{song.genre}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <p className="font-bold text-white/80">{song.profiles?.stage_name || 'Unknown Entity'}</p>
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full ${song.approved ? 'bg-smash-green' : 'bg-smash-orange'} animate-pulse`} />
                                  <span className={`text-[9px] font-black uppercase tracking-widest ${song.approved ? 'text-smash-green' : 'text-smash-orange'}`}>
                                     {song.approved ? 'Broadcasting' : 'Hold / Review'}
                                  </span>
                                </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                               <div className="flex items-center justify-end gap-3">
                                  {!song.approved && (
                                    <button onClick={() => approveSong(song.id)} className="px-4 py-2 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-smash-green hover:text-white transition-all shadow-lg active:scale-95">Release</button>
                                  )}
                                  <button onClick={() => rejectSong(song.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-smash-red text-smash-gray hover:text-white rounded-lg transition-all">
                                    <Trash2 size={14} />
                                  </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'applications' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111118] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-white/5 flex justify-between items-center">
                     <div>
                        <h3 className="font-studio font-black italic uppercase text-lg">Onboarding Pipeline</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mt-1">Artist Intake Controls</p>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                    {applications.filter(app => app.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) || app.email?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/[0.02] text-smash-gray text-[9px] uppercase tracking-[0.2em] font-black">
                          <tr>
                            <th className="px-8 py-5">Applicant Intelligence</th>
                            <th className="px-8 py-5">Verification Assets</th>
                            <th className="px-8 py-5 text-right">Decision Engine</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {applications.filter(app => app.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) || app.email?.toLowerCase().includes(searchQuery.toLowerCase())).map((app) => (
                            <tr key={app.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-8 py-6">
                                <div>
                                  <p className="font-bold text-lg text-white leading-none group-hover:text-smash-purple transition-colors mb-2">{app.stage_name}</p>
                                  <p className="text-[9px] text-smash-gray uppercase font-black tracking-widest opacity-60 mb-1">{app.genre} • {app.city} • {app.phone}</p>
                                  <p className="text-[10px] text-smash-purple font-bold tracking-tight lowercase underline opacity-60">{app.email}</p>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-left">
                                {app.id_document_url ? (
                                  <a href={app.id_document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 group/btn px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-smash-cyan hover:text-smash-cyan transition-all">
                                    <ShieldCheck size={14} className="opacity-40 group-hover/btn:opacity-100" /> Inspect ID Payload
                                  </a>
                                ) : (
                                  <span className="text-[9px] font-black uppercase text-smash-red tracking-widest">Document Missing</span>
                                )}
                              </td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-3">
                                   <button onClick={() => approveArtist(app)} className="h-11 w-11 bg-white text-black rounded-xl flex items-center justify-center hover:bg-smash-green hover:text-white transition-all shadow-lg active:scale-95 group/app">
                                      <CheckCircle2 size={24} />
                                   </button>
                                   <button onClick={() => rejectArtist(app)} className="h-11 w-11 bg-white/5 text-smash-gray border border-white/5 rounded-xl flex items-center justify-center hover:bg-smash-red hover:text-white transition-all active:scale-95 group/rej">
                                      <X size={24} />
                                   </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-20 text-center">
                         <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-smash-gray opacity-20">
                           <Users size={32} />
                         </div>
                         <p className="text-smash-gray font-black uppercase tracking-[0.2em] text-[10px] italic">Intake Queue Clear.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'song-reviews' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111118] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-white/5">
                     <h3 className="font-studio font-black italic uppercase text-lg">Content Compliance</h3>
                     <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mt-1">Song Review & Approval Node</p>
                  </div>
                  <div className="overflow-x-auto">
                    {pendingSongs.filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || s.profiles?.stage_name?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/[0.02] text-smash-gray text-[9px] uppercase tracking-[0.2em] font-black">
                          <tr>
                            <th className="px-8 py-5">Production Payload</th>
                            <th className="px-8 py-5">Artist Signature</th>
                            <th className="px-8 py-5 text-center">Audio Preview</th>
                            <th className="px-8 py-5 text-right">Moderation Logic</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {pendingSongs.filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || s.profiles?.stage_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((song) => (
                            <tr key={song.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-smash-purple group-hover:scale-105 transition-transform">
                                      <Music2 size={18} />
                                   </div>
                                   <div>
                                      <p className="font-bold text-sm text-white leading-none mb-1 group-hover:text-smash-purple transition-colors">{song.title}</p>
                                      <p className="text-[9px] font-black uppercase tracking-widest text-smash-gray opacity-60">{song.genre}</p>
                                   </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <p className="font-bold text-white/80">{song.profiles?.stage_name || 'Unknown'}</p>
                                <p className="text-[10px] text-smash-gray font-bold tracking-tight lowercase underline opacity-60">{song.profiles?.email}</p>
                              </td>
                              <td className="px-8 py-6">
                                <div className="bg-white/5 rounded-xl p-1.5 border border-white/5">
                                   <audio controls className="h-7 w-44 opacity-80 hover:opacity-100 transition-opacity invert brightness-200">
                                     <source src={song.audio_url} type="audio/mpeg" />
                                   </audio>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-3">
                                   <button onClick={() => approveSong(song.id)} className="px-4 py-2 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-smash-green hover:text-white transition-all shadow-lg active:scale-95">Authorize</button>
                                   <button onClick={() => rejectSong(song.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-smash-red text-smash-gray hover:text-white rounded-lg transition-all active:scale-95"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-20 text-center">
                         <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-smash-gray opacity-20">
                           <ShieldCheck size={24} />
                         </div>
                         <p className="text-smash-gray font-black uppercase tracking-[0.2em] text-[10px] italic">Compliance Clear.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'snippet-reviews' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111118] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-white/5">
                     <h3 className="font-studio font-black italic uppercase text-lg">Moto Feed Hub</h3>
                     <p className="text-[10px] font-black uppercase tracking-widest text-smash-gray mt-1">Video & Audio Snippet Governance</p>
                  </div>
                  <div className="overflow-x-auto">
                    {pendingSnippets.length > 0 ? (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/[0.02] text-smash-gray text-[9px] uppercase tracking-[0.2em] font-black">
                          <tr>
                            <th className="px-8 py-5">Content Payload</th>
                            <th className="px-8 py-5">Artist Signature</th>
                            <th className="px-8 py-5 text-center">Visual/Audio Logic</th>
                            <th className="px-8 py-5 text-right">Moderation Logic</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {pendingSnippets.map((snippet) => (
                            <tr key={snippet.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                                    <img src={snippet.cover_url || "https://placehold.co/48"} className="w-full h-full object-cover" />
                                    {snippet.is_video && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Radio size={12} className="text-white animate-pulse" /></div>}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm text-white leading-none mb-1 group-hover:text-smash-purple transition-colors truncate max-w-[140px]">{snippet.title}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-smash-gray opacity-60 line-clamp-1 truncate max-w-[140px]">{snippet.caption}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <p className="font-bold text-white/80">{snippet.profiles?.stage_name || 'Unknown'}</p>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <a href={snippet.media_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-smash-purple hover:text-smash-purple transition-all italic">
                                   Explore Meta {snippet.is_video ? '(VIDEO)' : '(AUDIO)'} <Radio size={12} />
                                </a>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-3">
                                   <button onClick={() => approveSnippet(snippet.id)} className="px-4 py-2 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-smash-green hover:text-white transition-all shadow-lg active:scale-95">Authorize</button>
                                   <button onClick={() => rejectSnippet(snippet.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-smash-red text-smash-gray hover:text-white rounded-lg transition-all active:scale-95"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-20 text-center">
                         <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-smash-gray opacity-20">
                           <Radio size={24} />
                         </div>
                         <p className="text-smash-gray font-black uppercase tracking-[0.2em] text-[10px] italic">Feed Queue Clear.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'ads' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                   <div className="relative group overflow-hidden p-10 bg-gradient-to-br from-smash-purple/10 to-[#111118] border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-2xl">
                      <div className="relative z-10 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="w-2 h-2 bg-smash-orange rounded-full animate-ping" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-smash-orange">Ad Serving Node</p>
                        </div>
                        <h4 className="text-4xl font-studio font-black italic text-white uppercase tracking-tighter leading-none">Campaign Console</h4>
                        <p className="text-xs text-smash-gray font-bold max-w-sm">Inject audio-based commercial payloads directly into the global stream.</p>
                      </div>
                      <button 
                        onClick={() => setShowAdForm(true)}
                        className="relative z-10 px-8 py-5 bg-white text-black rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-smash-orange hover:text-white transition-all shadow-2xl flex items-center gap-3 group/btn"
                      >
                         <Plus size={18} className="group-hover/btn:rotate-90 transition-transform" /> Start New Campaign
                      </button>
                      <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 transition-transform">
                         <Radio size={240} className="text-white" />
                      </div>
                   </div>

                   <motion.div className="bg-[#111118] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                     <div className="p-8 border-b border-white/5">
                        <h4 className="font-studio font-black italic text-lg uppercase leading-none">Active Commercial Roster</h4>
                     </div>
                     <div className="overflow-x-auto">
                       <table className="w-full text-left text-sm">
                         <thead className="bg-white/[0.02] text-smash-gray text-[9px] uppercase tracking-[0.2em] font-black">
                           <tr>
                             <th className="px-8 py-5">Campaign Source</th>
                             <th className="px-8 py-5">Reach / Capacity</th>
                             <th className="px-8 py-5">Network Status</th>
                             <th className="px-8 py-5 text-right">Moderation Logic</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                           {ads.filter(ad => ad.advertiser_name?.toLowerCase().includes(searchQuery.toLowerCase()) || ad.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(ad => (
                             <tr key={ad.id} className="hover:bg-white/[0.02] transition-colors group">
                               <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-smash-orange">
                                       <Radio size={18} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-sm text-white leading-none mb-1 group-hover:text-smash-orange transition-colors truncate max-w-[160px]">{ad.advertiser_name}</p>
                                      <p className="text-[9px] font-black uppercase tracking-widest text-smash-gray opacity-60 leading-none truncate max-w-[160px]">{ad.title}</p>
                                    </div>
                                 </div>
                               </td>
                               <td className="px-8 py-6">
                                  <div className="space-y-1.5">
                                     <div className="flex items-center justify-between text-[10px] font-black uppercase text-smash-gray mb-1">
                                       <span>{ad.plays_used.toLocaleString()} Delivered</span>
                                       <span>{Math.round((ad.plays_used / (ad.plays_purchased || 1)) * 100)}%</span>
                                     </div>
                                     <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-smash-orange group-hover:bg-white transition-colors" style={{ width: `${(ad.plays_used / (ad.plays_purchased || 1)) * 100}%` }} />
                                     </div>
                                  </div>
                               </td>
                               <td className="px-8 py-6">
                                  <div className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${ad.active ? 'bg-smash-green/10 text-smash-green border border-smash-green/10' : 'bg-smash-red/10 text-smash-red border border-smash-red/20'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${ad.active ? 'bg-smash-green animate-pulse' : 'bg-smash-red'}`} />
                                    {ad.active ? 'Broadcasting' : 'Halted'}
                                  </div>
                               </td>
                               <td className="px-8 py-6 text-right">
                                  <div className="flex items-center justify-end gap-3">
                                     <button onClick={() => toggleAdStatus(ad)} className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${ad.active ? 'bg-white/5 text-smash-orange hover:bg-smash-orange hover:text-black' : 'bg-smash-green/10 text-smash-green hover:bg-smash-green hover:text-white'}`}>
                                       {ad.active ? <Pause size={14} /> : <Play size={14} />}
                                     </button>
                                     <button onClick={() => deleteAd(ad.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 text-smash-gray hover:bg-smash-red hover:text-white rounded-lg transition-all">
                                       <Trash2 size={14} />
                                     </button>
                                  </div>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </motion.div>

                   <AnimatePresence>
                    {showAdForm && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                      >
                        <motion.div 
                          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                          className="w-full max-w-xl bg-[#111] border border-white/10 rounded-[40px] p-8 space-y-6 relative max-h-[90vh] overflow-y-auto"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-black text-xl uppercase tracking-widest">Upload New Ad</h3>
                            <button onClick={() => setShowAdForm(false)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                              <X size={18} />
                            </button>
                          </div>

                          <form onSubmit={handleAdUpload} className="space-y-4">
                            <input name="advertiser_name" placeholder="Advertiser Name" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:border-smash-orange transition-all" />
                            <input name="title" placeholder="Ad Title / Description" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:border-smash-orange transition-all" />

                            <select name="type" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:border-smash-orange transition-all appearance-none cursor-pointer">
                              <option value="platform">Platform Ad (Smashify promotes)</option>
                              <option value="artist">Artist Promotional Ad</option>
                              <option value="external">External Advertiser</option>
                            </select>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-smash-gray">Audio File (MP3/WAV, max 30s)</label>
                              <input name="audio" type="file" accept="audio/*" required
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-smash-orange file:text-black cursor-pointer" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-smash-gray">Plays Purchased</label>
                                <input name="plays_purchased" type="number" min={100} defaultValue={1000} required
                                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:border-smash-orange transition-all" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-smash-gray">Revenue Charged (MK)</label>
                                <input name="revenue" type="number" min={0} defaultValue={0}
                                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:border-smash-orange transition-all" />
                              </div>
                            </div>

                            <button type="submit" disabled={adUploading}
                              className="w-full py-4 bg-smash-orange text-black rounded-xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all disabled:opacity-50 shadow-xl shadow-smash-orange/20"
                            >
                              {adUploading ? 'Uploading...' : 'Activate Ad Campaign'}
                            </button>
                          </form>
                        </motion.div>
                      </motion.div>
                    )}
                   </AnimatePresence>
                </motion.div>
              )}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Professional Components for Admin
const AdminSidebarItem = ({ id, label, icon: Icon, activeTab, setActiveTab, collapsed, count }: any) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
      activeTab === id 
        ? 'bg-smash-purple text-white shadow-lg shadow-smash-purple/20' 
        : 'text-smash-gray hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon size={18} className={activeTab === id ? 'text-white' : 'text-smash-gray group-hover:text-white'} />
    {!collapsed && (
      <div className="flex-1 flex items-center justify-between overflow-hidden">
        <span className="text-[11px] font-black uppercase tracking-wider truncate">{label}</span>
        {count !== undefined && count > 0 && (
          <span className="bg-smash-red text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">
            {count}
          </span>
        )}
      </div>
    )}
    {collapsed && count !== undefined && count > 0 && (
      <div className="absolute left-14 h-4 w-4 bg-smash-red rounded-full flex items-center justify-center border-2 border-[#0c0c10]">
         <span className="text-[7px] font-black text-white">{count}</span>
      </div>
    )}
  </button>
);

const KpiCard = ({ title, value, trend, icon: Icon, color }: any) => (
  <div className="p-6 bg-[#111118] border border-white/5 rounded-3xl group hover:border-white/10 transition-all overflow-hidden relative">
     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
        <Icon size={80} />
     </div>
     <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${color}`}>
           <Icon size={20} />
        </div>
        <div className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${trend?.includes('+') ? 'bg-smash-green/10 text-smash-green' : 'bg-smash-purple/10 text-smash-purple'}`}>
           {trend}
        </div>
     </div>
     <p className="text-smash-gray text-[9px] font-black uppercase tracking-[0.2em] mb-1 relative z-10">{title}</p>
     <h4 className="text-2xl font-studio font-black italic text-white tracking-tighter relative z-10">{value}</h4>
  </div>
);

export default Admin;

