import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, CheckCircle2, Trash2, Music2, Plus, FileAudio, X, Flame, 
  Volume2, VolumeX, Edit3, LayoutDashboard, Clock, Radio, Wallet, DollarSign,
  Mic2, Users, ShoppingCart, Heart, CreditCard, Search, ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'listeners' | 'artists' | 'songs' | 'applications' | 'song-reviews' | 'snippet-reviews' | 'ads' | 'payouts'>('overview');
  const [artists, setArtists] = useState<any[]>([]); // Approved artists
  const [listeners, setListeners] = useState<any[]>([]); // All listeners
  const [allSongs, setAllSongs] = useState<any[]>([]); // All songs on platform
  const [applications, setApplications] = useState<any[]>([]); // Pending artists
  const [pendingSongs, setPendingSongs] = useState<any[]>([]); // Songs awaiting review
  const [pendingSnippets, setPendingSnippets] = useState<any[]>([]); // Feed snippets awaiting review
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
    if (userProfile && !userProfile.is_admin) {
      toast.error('Unauthorized access');
      navigate('/');
      return;
    }
    if (userProfile?.is_admin) {
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
    const totalRev = revenueData?.reduce((a, t) => a + (t.platform_fee || 0), 0) || 0;
    
    setPlatformStats({
      totalArtists: totalArtists || 0,
      totalListeners: totalListeners || 0,
      totalSongs: totalSongs || 0,
      pendingSongs: pendingSongsCount || 0,
      pendingApplications: applications.length,
      totalRevenue: totalRev,
      activeAds: ads.filter(a => a.active).length,
      totalPlays: 0, 
    });
  };

  const fetchAds = async () => {
    const { data } = await supabase.from('audio_ads').select('*').order('created_at', { ascending: false });
    setAds(data || []);
  };

  const fetchPayoutRequests = async () => {
    const { data } = await supabase
      .from('payout_requests')
      .select('*, profiles!artist_id(stage_name, avatar_url, email)')
      .order('created_at', { ascending: false });
    setPayoutRequests(data || []);
  };

  const markPayoutComplete = async (payout: any) => {
    const { error } = await supabase
      .from('payout_requests')
      .update({ status: 'completed', paid_at: new Date().toISOString() })
      .eq('id', payout.id);
    
    if (error) return toast.error(error.message);

    await supabase.from('transactions').update({ status: 'completed' })
      .eq('reference', payout.reference);

    toast.success(`Payout of MWK ${payout.requested_amount?.toLocaleString()} marked as paid!`);
    fetchPayoutRequests();
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

  if (!userProfile?.is_admin) return null;

  const TabButton = ({ id, label, icon: Icon, count }: { id: typeof activeTab, label: string, icon: any, count?: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all uppercase font-black text-[10px] tracking-widest ${
        activeTab === id 
          ? 'border-smash-purple text-white bg-smash-purple/5' 
          : 'border-transparent text-smash-gray hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={16} />
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 px-2 py-0.5 bg-smash-red text-white rounded-full text-[8px] animate-pulse">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-smash-black text-white p-6 md:p-12 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-left flex items-center gap-6">
            <button 
              onClick={() => navigate(-1)} 
              className="p-3 bg-white/5 border border-white/10 rounded-2xl text-smash-gray hover:text-white hover:bg-white/10 transition-all transition-transform hover:-translate-x-1"
            >
               <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-4xl font-studio font-black flex items-center gap-3 uppercase italic tracking-tighter">
                <ShieldCheck className="text-smash-purple" size={40} /> Admin Control
              </h2>
              <p className="text-smash-gray text-xs font-bold uppercase tracking-widest mt-1">Platform Governance & Asset Moderation</p>
            </div>
          </div>
          <div className="bg-smash-purple/10 text-smash-purple px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border border-smash-purple/20 flex items-center gap-2">
            <div className="w-2 h-2 bg-smash-purple rounded-full animate-ping" />
            Live Admin Session
          </div>
        </div>

        {/* Platform Overview — 4-column grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Artists', value: platformStats.totalArtists, icon: <Mic2 size={20} />, color: 'text-smash-purple', bg: 'bg-smash-purple/10' },
            { label: 'Total Listeners', value: platformStats.totalListeners, icon: <Users size={20} />, color: 'text-smash-cyan', bg: 'bg-smash-cyan/10' },
            { label: 'Total Songs', value: platformStats.totalSongs, icon: <Music2 size={20} />, color: 'text-smash-orange', bg: 'bg-smash-orange/10' },
            { label: 'Platform Revenue', value: `MK ${platformStats.totalRevenue.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'text-smash-green', bg: 'bg-smash-green/10' },
            { label: 'Pending Apps', value: applications.length, icon: <Clock size={20} />, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            { label: 'Pending Songs', value: pendingSongs.length, icon: <FileAudio size={20} />, color: 'text-smash-red', bg: 'bg-smash-red/10' },
            { label: 'Active Ads', value: platformStats.activeAds, icon: <Radio size={20} />, color: 'text-smash-purple', bg: 'bg-smash-purple/10' },
            { label: 'Payout Requests', value: payoutRequests.length, icon: <Wallet size={20} />, color: 'text-smash-orange', bg: 'bg-smash-orange/10' },
          ].map((stat, i) => (
            <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xl font-black text-white truncate">{stat.value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-smash-gray truncate">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs Navigation */}
        <div className="flex overflow-x-auto border-b border-white/5 no-scrollbar mb-8">
          <TabButton id="overview" label="Review" icon={ShieldCheck} />
          <TabButton id="applications" label={`Apps (${applications.length})`} icon={CheckCircle2} />
          <TabButton id="song-reviews" label={`Songs (${pendingSongs.length})`} icon={Music2} />
          <TabButton id="snippet-reviews" label={`Snippets (${pendingSnippets.length})`} icon={Radio} />
          <TabButton id="payouts" label={`Payouts (${payoutRequests.length})`} icon={Wallet} />
          <TabButton id="artists" label="Artists" icon={Flame} />
          <TabButton id="songs" label="Database" icon={Music2} />
          <TabButton id="listeners" label="Fans" icon={Volume2} />
          <TabButton id="ads" label="Ads" icon={FileAudio} />
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-smash-gray" size={18} />
          <input 
            type="text" 
            placeholder="Search roster, songs, or applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold focus:outline-none focus:border-smash-purple transition-all"
          />
        </div>

        <div className="min-h-[400px] mb-20">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-12 h-12 border-4 border-smash-purple border-t-transparent rounded-full animate-spin" />
                <p className="text-smash-gray font-black uppercase text-[10px] tracking-widest">Hydrating Dashboard...</p>
             </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-gradient-to-br from-smash-purple/20 to-transparent border border-smash-purple/20 rounded-[40px] space-y-6">
                      <h3 className="text-2xl font-black font-studio italic uppercase tracking-tighter">System Health</h3>
                      <p className="text-smash-gray text-sm font-bold leading-relaxed">Platform is running with 0 critical issues. All artist payouts are processed weekly. Ad inventory is at 65% capacity.</p>
                      <div className="flex gap-4">
                        <button onClick={() => setActiveTab('applications')} className="flex-1 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-smash-purple hover:text-white transition-all">Review Apps</button>
                        <button onClick={() => setActiveTab('song-reviews')} className="flex-1 py-3 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">Review Music</button>
                      </div>
                    </div>
                    <div className="p-8 bg-white/5 border border-white/5 rounded-[40px] flex flex-col justify-center items-center text-center space-y-4">
                      <LayoutDashboard size={40} className="text-smash-gray/20" />
                      <p className="text-smash-gray font-black uppercase tracking-widest text-[10px]">Administrative Tip</p>
                      <p className="text-sm font-bold text-white/60">Verifying artists manually check for valid Malawian government IDs provided in applications.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'listeners' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 rounded-[32px] border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 font-black uppercase text-[10px] tracking-widest text-smash-gray">Listener Directory</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-smash-gray bg-white/5">
                          <th className="p-6">User</th>
                          <th className="p-6">Subscription</th>
                          <th className="p-6">Contact</th>
                          <th className="p-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {listeners.filter(l => l.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                          <tr key={l.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-6">
                              <div className="flex items-center gap-3">
                                <img src={l.avatar_url || "https://placehold.co/40x40/18162C/9B5DE5?text=?"} className="w-10 h-10 rounded-full object-cover" />
                                <div>
                                  <p className="font-bold">{l.full_name}</p>
                                  <p className="text-[10px] text-smash-gray truncate max-w-[150px]">{l.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${l.subscription_tier === 'Premium' ? 'bg-smash-orange text-white' : 'bg-white/10 text-smash-gray'}`}>
                                {l.subscription_tier || 'Free'}
                              </span>
                            </td>
                            <td className="p-6 text-xs text-smash-gray font-bold uppercase">{l.phone || 'No Phone'}</td>
                            <td className="p-6 text-right">
                              <button onClick={() => deleteUser(l.id, l.full_name)} className="p-2 hover:bg-smash-red/20 text-smash-gray hover:text-smash-red rounded-lg transition-all">
                                <Trash2 size={16} />
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 rounded-[32px] border border-white/5 overflow-hidden">
                   <div className="p-6 border-b border-white/5 flex justify-between items-center">
                      <span className="font-black uppercase text-[10px] tracking-widest text-smash-gray">Verified Artist Roster</span>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead>
                         <tr className="text-[10px] font-black uppercase tracking-widest text-smash-gray bg-white/5">
                           <th className="p-6">Artist</th>
                           <th className="p-6">Wallet</th>
                           <th className="p-6">Pending</th>
                           <th className="p-6 text-right">Actions</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 text-sm">
                         {artists.filter(a => a.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(a => (
                           <tr key={a.id} className="hover:bg-white/5 transition-colors">
                             <td className="p-6">
                                <div className="flex items-center gap-3">
                                  <img src={a.avatar_url || "https://placehold.co/40x40/18162C/9B5DE5?text=?"} className="w-10 h-10 rounded-full object-cover" />
                                  <div>
                                    <p className="font-bold flex items-center gap-1">{a.stage_name} {a.verified && <ShieldCheck size={12} className="text-smash-cyan" />}</p>
                                    <p className="text-[10px] text-smash-gray">{a.city} • {a.genre}</p>
                                  </div>
                                </div>
                             </td>
                             <td className="p-6 font-bold text-smash-green uppercase text-xs">MK {a.wallet_balance?.toLocaleString() || 0}</td>
                             <td className="p-6">
                                {a.pending_songs > 0 ? (
                                   <div className="flex items-center gap-2 text-smash-orange font-bold text-xs">
                                      <Music2 size={14} /> {a.pending_songs} pending
                                   </div>
                                ) : (
                                   <span className="text-smash-gray text-[10px] uppercase font-bold italic">Clean</span>
                                )}
                             </td>
                             <td className="p-6 text-right space-x-2">
                                <button 
                                  onClick={() => toggleArtistVerification(a.id, !!a.verified)}
                                  className={`px-3 py-1.5 border rounded-lg text-[8px] font-black uppercase transition-all ${
                                    a.verified 
                                      ? 'bg-smash-cyan/10 text-smash-cyan border-smash-cyan/20 hover:bg-smash-cyan hover:text-black' 
                                      : 'bg-white/5 text-smash-gray border-white/10 hover:border-smash-cyan hover:text-smash-cyan'
                                  }`}
                                >
                                  {a.verified ? 'Verified' : 'Verify'}
                                </button>
                                {a.pending_songs > 0 && (
                                   <button onClick={() => approveAllSongs(a.id)} className="px-3 py-1.5 bg-smash-purple/10 text-smash-purple border border-smash-purple/20 rounded-lg text-[8px] font-black uppercase hover:bg-smash-purple hover:text-white transition-all">Approve All</button>
                                )}
                                <button onClick={() => deleteArtist(a.id, a.stage_name)} className="p-2 hover:bg-smash-red/20 text-smash-gray hover:text-smash-red rounded-lg transition-all">
                                  <Trash2 size={16} />
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {payoutRequests.length > 0 ? payoutRequests.map(p => (
                    <div key={p.id} className="flex items-center gap-4 p-5 bg-white/5 border border-white/5 rounded-2xl">
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-white/10">
                        <img src={p.profiles?.avatar_url || 'https://placehold.co/48'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm">{p.profiles?.stage_name || 'Artist'}</p>
                        <p className="text-[10px] text-smash-gray font-bold uppercase tracking-widest">{p.phone} · {p.network}</p>
                        <p className="text-[9px] text-smash-gray/60 font-bold mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg text-smash-orange">MK {p.requested_amount?.toLocaleString()}</p>
                        <p className="text-[9px] text-smash-gray font-bold uppercase tracking-widest">After 3% fee</p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 ${p.status === 'completed' ? 'bg-smash-green/10 text-smash-green' : 'bg-yellow-400/10 text-yellow-400'}`}>
                        {p.status}
                      </span>
                      {p.status === 'pending' && (
                        <button
                          onClick={() => markPayoutComplete(p)}
                          className="px-4 py-2.5 bg-smash-green text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shrink-0"
                        >
                          Mark Paid ✓
                        </button>
                      )}
                    </div>
                  )) : (
                    <div className="p-20 text-center bg-white/5 border border-dashed border-white/10 rounded-[32px] text-smash-gray font-bold uppercase tracking-widest text-xs italic">
                      No payout requests.
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'songs' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 rounded-[32px] border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 font-black uppercase text-[10px] tracking-widest text-smash-gray">Master Song List</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-smash-gray text-[10px] uppercase tracking-widest font-black">
                        <tr>
                          <th className="p-6">Song</th>
                          <th className="p-6">Artist</th>
                          <th className="p-6">Status</th>
                          <th className="p-6 text-right">Moderation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allSongs.filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || s.profiles?.stage_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((song) => (
                          <tr key={song.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-6">
                              <div className="flex items-center gap-3 font-bold">
                                 <div className="w-10 h-10 bg-smash-purple/20 rounded-xl flex items-center justify-center text-smash-purple">
                                    <Music2 size={18} />
                                 </div>
                                 <p>{song.title}</p>
                              </div>
                            </td>
                            <td className="p-6">
                              <p className="font-bold">{song.profiles?.stage_name || 'Unknown'}</p>
                            </td>
                            <td className="p-6">
                               <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${song.approved ? 'bg-smash-green/10 text-smash-green' : 'bg-smash-orange/10 text-smash-orange'}`}>
                                  {song.approved ? 'Live' : 'Pending'}
                               </span>
                            </td>
                            <td className="p-6 text-right flex items-center justify-end gap-2">
                              {!song.approved && (
                                <button onClick={() => approveSong(song.id)} className="px-3 py-1.5 bg-smash-green/10 text-smash-green border border-smash-green/20 rounded-lg text-[8px] font-black uppercase hover:bg-smash-green hover:text-white transition-all">Approve</button>
                              )}
                              <button onClick={() => rejectSong(song.id)} className="p-2 hover:bg-smash-red/20 text-smash-gray hover:text-smash-red rounded-lg transition-all">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'applications' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 rounded-[32px] border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 font-black uppercase text-[10px] tracking-widest text-smash-gray">Artist Applications</div>
                  <div className="overflow-x-auto">
                    {applications.filter(app => app.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) || app.email?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-smash-gray text-[10px] uppercase tracking-widest font-black">
                          <tr>
                            <th className="p-6">Applicant</th>
                            <th className="p-6">Verification</th>
                            <th className="p-6 text-right">Review</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {applications.filter(app => app.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) || app.email?.toLowerCase().includes(searchQuery.toLowerCase())).map((app) => (
                            <tr key={app.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-6">
                                <div>
                                  <p className="font-bold">{app.stage_name}</p>
                                  <p className="text-[10px] text-smash-gray uppercase font-bold tracking-widest">{app.genre} • {app.city}</p>
                                  <p className="text-[10px] text-smash-gray italic">{app.email}</p>
                                </div>
                              </td>
                              <td className="p-6">
                                {app.id_document_url && (
                                  <a href={app.id_document_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-smash-cyan/10 text-smash-cyan border border-smash-cyan/20 rounded-lg text-[8px] font-black uppercase hover:bg-smash-cyan hover:text-white transition-all inline-block">
                                    ID Document
                                  </a>
                                )}
                              </td>
                              <td className="p-6 text-right flex items-center justify-end gap-2">
                                <button onClick={() => approveArtist(app)} className="p-3 bg-smash-green text-white rounded-xl hover:bg-smash-green/80 transition-all active:scale-95"><CheckCircle2 size={18} /></button>
                                <button onClick={() => rejectArtist(app)} className="p-3 bg-smash-red text-white rounded-xl hover:bg-smash-red/80 transition-all active:scale-95"><X size={18} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-20 text-center text-smash-gray font-black uppercase tracking-widest text-xs italic">No matching applications.</div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'song-reviews' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 rounded-[32px] border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 font-black uppercase text-[10px] tracking-widest text-smash-gray">Song Review Queue</div>
                  <div className="overflow-x-auto">
                    {pendingSongs.filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || s.profiles?.stage_name?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-smash-gray text-[10px] uppercase tracking-widest font-black">
                          <tr>
                            <th className="p-6">Song</th>
                            <th className="p-6">Artist</th>
                            <th className="p-6">Preview</th>
                            <th className="p-6 text-right">Moderation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {pendingSongs.filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || s.profiles?.stage_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((song) => (
                            <tr key={song.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-6">
                                <div className="flex items-center gap-3 font-bold">
                                   <div className="w-10 h-10 bg-smash-purple/20 rounded-xl flex items-center justify-center text-smash-purple">
                                      <Music2 size={18} />
                                   </div>
                                   <div>
                                      <p>{song.title}</p>
                                      <p className="text-[10px] text-smash-gray uppercase tracking-widest">{song.genre}</p>
                                   </div>
                                </div>
                              </td>
                              <td className="p-6">
                                <p className="font-bold">{song.profiles?.stage_name || 'Unknown'}</p>
                                <p className="text-[10px] text-smash-gray">{song.profiles?.email}</p>
                              </td>
                              <td className="p-6">
                                <audio controls className="h-8 w-40 opacity-50 hover:opacity-100 transition-opacity">
                                  <source src={song.audio_url} type="audio/mpeg" />
                                </audio>
                              </td>
                              <td className="p-6 text-right flex items-center justify-end gap-2">
                                <button onClick={() => approveSong(song.id)} className="px-3 py-1.5 bg-smash-green/10 text-smash-green border border-smash-green/20 rounded-lg text-[8px] font-black uppercase hover:bg-smash-green hover:text-white transition-all">Approve</button>
                                <button onClick={() => rejectSong(song.id)} className="p-2 hover:bg-smash-red/20 text-smash-gray hover:text-smash-red rounded-lg transition-all">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-20 text-center text-smash-gray font-black uppercase tracking-widest text-xs italic">Review Queue Clear.</div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'snippet-reviews' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 rounded-[32px] border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 font-black uppercase text-[10px] tracking-widest text-smash-gray">Moto Feed Moderation</div>
                  <div className="overflow-x-auto">
                    {pendingSnippets.length > 0 ? (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-smash-gray text-[10px] uppercase tracking-widest font-black">
                          <tr>
                            <th className="p-6">Content</th>
                            <th className="p-6">Artist</th>
                            <th className="p-6">Preview</th>
                            <th className="p-6 text-right">Moderation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {pendingSnippets.map((snippet) => (
                            <tr key={snippet.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-6">
                                <div className="flex items-center gap-3">
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/10 shrink-0">
                                    <img src={snippet.cover_url || "https://placehold.co/48"} className="w-full h-full object-cover" />
                                    {snippet.is_video && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Radio size={12} className="text-white" /></div>}
                                  </div>
                                  <div>
                                    <p className="font-bold truncate max-w-[200px]">{snippet.title}</p>
                                    <p className="text-[10px] text-smash-gray line-clamp-1">{snippet.caption}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-6">
                                <p className="font-bold">{snippet.profiles?.stage_name || 'Unknown'}</p>
                              </td>
                              <td className="p-6">
                                <a href={snippet.media_url} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-smash-purple hover:text-white transition-colors">
                                  {snippet.is_video ? 'Watch Video' : 'Listen Audio'} →
                                </a>
                              </td>
                              <td className="p-6 text-right flex items-center justify-end gap-2">
                                <button onClick={() => approveSnippet(snippet.id)} className="px-3 py-1.5 bg-smash-green/10 text-smash-green border border-smash-green/20 rounded-lg text-[8px] font-black uppercase hover:bg-smash-green hover:text-white transition-all">Approve</button>
                                <button onClick={() => rejectSnippet(snippet.id)} className="p-2 hover:bg-smash-red/20 text-smash-gray hover:text-smash-red rounded-lg transition-all">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-20 text-center text-smash-gray font-black uppercase tracking-widest text-xs italic">Feed Queue Clear.</div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'ads' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                   <div className="flex justify-between items-center bg-white/5 p-6 rounded-[32px] border border-white/5">
                      <div className="space-y-1">
                        <h4 className="font-black text-sm uppercase tracking-widest">Ad Management</h4>
                        <p className="text-xs text-smash-gray font-bold">Upload audio commercials that play between tracks.</p>
                      </div>
                      <button 
                        onClick={() => setShowAdForm(true)}
                        className="px-6 py-3 bg-smash-orange text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                      >
                         <Plus size={16} /> New Ad Campaign
                      </button>
                   </div>

                   <motion.div className="bg-white/5 rounded-[32px] border border-white/5 overflow-hidden">
                     <div className="overflow-x-auto">
                       <table className="w-full text-left text-sm">
                         <thead className="bg-white/5 text-smash-gray text-[10px] uppercase tracking-widest font-black">
                           <tr>
                             <th className="p-6">Campaign</th>
                             <th className="p-6">Budget</th>
                             <th className="p-6">Status</th>
                             <th className="p-6 text-right">Manage</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                           {ads.filter(ad => ad.advertiser_name?.toLowerCase().includes(searchQuery.toLowerCase()) || ad.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(ad => (
                             <tr key={ad.id} className="hover:bg-white/5 transition-colors">
                               <td className="p-6 text-left">
                                 <p className="font-bold">{ad.advertiser_name}</p>
                                 <p className="text-[10px] text-smash-gray uppercase tracking-widest">{ad.title}</p>
                               </td>
                               <td className="p-6">
                                  <p className="text-xs font-bold">{ad.plays_used.toLocaleString()} / {ad.plays_purchased.toLocaleString()}</p>
                                  <div className="w-20 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                     <div className="h-full bg-smash-orange" style={{ width: `${(ad.plays_used / ad.plays_purchased) * 100}%` }} />
                                  </div>
                               </td>
                               <td className="p-6">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ad.active ? 'bg-smash-green/10 text-smash-green border border-smash-green/20' : 'bg-smash-red/10 text-smash-red border border-smash-red/20'}`}>
                                     {ad.active ? 'Active' : 'Offline'}
                                  </span>
                               </td>
                               <td className="p-6 text-right space-x-2">
                                  <button onClick={() => toggleAdStatus(ad)} className={`p-2 rounded-lg transition-all ${ad.active ? 'bg-smash-red/10 text-smash-red hover:bg-smash-red hover:text-white' : 'bg-smash-green/10 text-smash-green hover:bg-smash-green hover:text-white'}`}>
                                     {ad.active ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                  </button>
                                  <button onClick={() => deleteAd(ad.id)} className="p-2 hover:bg-smash-red/20 text-smash-gray hover:text-smash-red rounded-lg transition-all"><Trash2 size={16} /></button>
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
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
