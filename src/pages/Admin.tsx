import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, CircleCheck, Trash2, Music2, Plus, FileAudio, X, Flame, 
  Volume2, VolumeX, Edit3, LayoutDashboard, Clock, Radio, Wallet, DollarSign,
  Mic2, Users, ShoppingCart, Heart, CreditCard, Search, ArrowLeft, TrendingUp,
  Pause, Play, Activity, ArrowUpRight, ArrowDownRight, MoreHorizontal, ChevronDown, Menu, Settings, Bell, Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'listeners' | 'artists' | 'songs' | 'applications' | 'song-reviews' | 'snippet-reviews' | 'ads' | 'payouts' | 'maintenance' | 'notifications'>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as any;
    if (tab && ['overview', 'listeners', 'artists', 'songs', 'applications', 'song-reviews', 'snippet-reviews', 'ads', 'payouts', 'maintenance', 'notifications'].includes(tab)) {
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
  const [maintenance, setMaintenance] = useState({ active: false, message: '', estimatedTime: '' });
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  
  const [notificationTarget, setNotificationTarget] = useState<'all' | 'artists' | 'listeners' | 'specific'>('all');
  const [notificationUserId, setNotificationUserId] = useState('');
  const [userSearchText, setUserSearchText] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationLink, setNotificationLink] = useState('');
  const [notificationSending, setNotificationSending] = useState(false);

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

  const filteredNotificationUsers = useMemo(() => {
    if (!userSearchText.trim()) return [];
    const searchLower = userSearchText.toLowerCase();
    const combined = [
      ...artists.map(a => ({ id: a.id, name: `${a.stage_name || ''} ${a.full_name || ''}`.trim(), type: 'Artist' })),
      ...listeners.map(l => ({ id: l.id, name: l.full_name || 'Unknown', type: 'Listener' }))
    ];
    return combined.filter(u => u.name.toLowerCase().includes(searchLower) || u.id.toLowerCase().includes(searchLower)).slice(0, 5);
  }, [artists, listeners, userSearchText]);

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
      fetchPlatformStats(),
      fetchMaintenance()
    ]);
    setLoading(false);
  };

  const fetchMaintenance = async () => {
    try {
      const { data } = await supabase.from('app_config').select('value').eq('key', 'maintenance').single();
      if (data?.value) {
        setMaintenance(data.value);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMaintenance = async (active: boolean) => {
    setMaintenanceLoading(true);
    const newVal = { ...maintenance, active };
    try {
      const { error } = await supabase.from('app_config').update({ value: newVal, updated_at: new Date().toISOString() }).eq('key', 'maintenance');
      if (error) throw error;
      setMaintenance(newVal);
      toast.success(`Maintenance mode ${active ? 'activated' : 'deactivated'}`);
    } catch (e: any) {
      toast.error('Failed to update maintenance: ' + e.message);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const saveMaintenanceConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaintenanceLoading(true);
    try {
      const { error } = await supabase.from('app_config').update({ value: maintenance, updated_at: new Date().toISOString() }).eq('key', 'maintenance');
      if (error) throw error;
      toast.success('Maintenance config saved');
    } catch (e: any) {
      toast.error('Failed to save config: ' + e.message);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const fetchPendingSnippets = async () => {
    const { data } = await supabase
      .from('moto_feed')
      .select('*, profiles:artist_id(stage_name, avatar_url)')
      .eq('approved', false)
      .neq('status', 'draft')
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

  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [revenueSplits, setRevenueSplits] = useState<any[]>([]);

  const fetchPlatformStats = async () => {
    try {
      const [
        { count: totalArtists },
        { count: totalListeners },
        { count: totalSongs },
        { count: pendingSongsCount },
        { data: revenueData },
        { data: recentTxs },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'artist'),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('songs').select('*', { count: 'exact', head: true }).eq('approved', true),
        supabase.from('songs').select('*', { count: 'exact', head: true }).eq('approved', false).neq('status', 'draft'),
        supabase.from('transactions').select('platform_fee, type, created_at, net_amount').eq('status', 'completed'),
        supabase.from('transactions').select('id, type, platform_fee, created_at, net_amount, profiles:artist_id(full_name, stage_name)').eq('status', 'completed').order('created_at', { ascending: false }).limit(6),
      ]);
      const totalRev = (revenueData || []).reduce((a, t) => a + (t.platform_fee || 0), 0) || 0;
      
      // Process revenue splits
      const splits: Record<string, number> = { subscriptions: 0, tips: 0, sales: 0, events: 0 };
      revenueData?.forEach(tx => {
         const type = (tx.type || '').toLowerCase();
         if (type.includes('sub')) splits.subscriptions += tx.platform_fee || 0;
         else if (type.includes('tip') || type.includes('donat')) splits.tips += tx.platform_fee || 0;
         else if (type.includes('sale') || type.includes('song')) splits.sales += tx.platform_fee || 0;
         else splits.events += tx.platform_fee || 0;
      });
      setRevenueSplits([
        { name: 'Subscriptions', value: splits.subscriptions, color: '#0ea5e9' },
        { name: 'Tips', value: splits.tips, color: '#10b981' },
        { name: 'Sales', value: splits.sales, color: '#38bdf8' },
      ].filter(s => s.value > 0).length ? [
        { name: 'Subscriptions', value: splits.subscriptions, color: '#0ea5e9' },
        { name: 'Tips', value: splits.tips, color: '#10b981' },
        { name: 'Sales', value: splits.sales, color: '#38bdf8' },
      ] : [{ name: 'No Data', value: 1, color: 'rgba(100, 116, 139, 0.2)' }]);

      // Process monthly trend
      const monthlyData: Record<string, any> = {};
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      months.forEach(m => monthlyData[m] = { name: m, revenue: 0 });
      revenueData?.forEach(tx => {
         if (tx.created_at) {
            const date = new Date(tx.created_at);
            const m = months[date.getMonth()];
            if (monthlyData[m]) monthlyData[m].revenue += tx.platform_fee || 0;
         }
      });
      setRevenueTrend(Object.values(monthlyData));
      setRecentActivities(recentTxs || []);

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

  // Modals state
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [selectedArtist, setSelectedArtist] = useState<any>(null);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (url: string, id: string) => {
    if (playingSongId === id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    } else {
      if (audioRef.current) {
         audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingSongId(id);
      
      audioRef.current.onended = () => {
         setPlayingSongId(null);
      };
    }
  };

  const markAsPaid = async (payoutId: string, note: string) => {
    setProcessingId(payoutId);
    try {
      const payout = payoutRequests.find(p => p.id === payoutId);
      if (!payout) return toast.error('Payout not found');

      // 1. Update payout request status
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

      // 2. Update the matching transaction to completed
      await supabase
        .from('transactions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('paychangu_ref', payout.reference)
        .eq('type', 'withdrawal');

      // 3. Notify the artist
      const netAmount = Number(payout.net_amount || payout.requested_amount);
      await supabase.from('notifications').insert({
        profile_id: payout.artist_id,
        user_type: 'artist',
        type: 'payout_paid',
        message: `✅ Your withdrawal of MK ${Number(payout.requested_amount).toLocaleString()} has been paid! MK ${netAmount.toLocaleString()} sent to ${payout.network} ${payout.phone}.`,
        link: '/artist-hub#wallet'
      });

      toast.success('Marked as paid! Artist has been notified.');
      fetchPayoutRequests();
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
    
    const payout = payoutRequests.find(p => p.id === payoutId);
    if (!payout) return toast.error('Payout not found');

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
      
      // Manually refund the wallet balance
      const refundAmount = Number(payout.requested_amount || 0);
      if (payout.artist_id && refundAmount > 0) {
        const { error: refundError } = await supabase.rpc('increment_wallet', {
          artist_id: payout.artist_id,
          amount: refundAmount
        });
        if (refundError) throw new Error('Refund failed: ' + refundError.message);
        
        await supabase.from('notifications').insert({
          profile_id: payout.artist_id,
          user_type: 'artist',
          type: 'payout_rejected',
          message: `Your withdrawal of MK ${refundAmount.toLocaleString()} was rejected. Reason: ${reason}. Amount returned to your wallet.`,
          link: '/artist-hub#wallet'
        });
      }

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
      .neq('status', 'draft')
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

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationMessage.trim()) return toast.error('Message is required.');
    if (notificationTarget === 'specific' && !notificationUserId.trim()) return toast.error('User ID is required.');
    
    if (!confirm(`Are you sure you want to send this notification to ${notificationTarget}?`)) return;

    setNotificationSending(true);
    try {
      let targets: any[] = [];
      
      if (notificationTarget === 'specific') {
        let isArtist = null;
        const { data: artistProfile } = await supabase.from('profiles').select('id').eq('id', notificationUserId.trim()).single();
        if (artistProfile) {
          targets = [{ id: notificationUserId.trim(), role: 'artist' }];
        } else {
          const { data: listenerProfile } = await supabase.from('user_profiles').select('id').eq('id', notificationUserId.trim()).single();
          if (listenerProfile) {
            targets = [{ id: notificationUserId.trim(), role: 'listener' }];
          } else {
            throw new Error('User UUID not found in any database');
          }
        }
      } else if (notificationTarget === 'artists') {
        const { data } = await supabase.from('profiles').select('id');
        targets = (data || []).map((p: any) => ({ id: p.id, role: 'artist' }));
      } else if (notificationTarget === 'listeners') {
        const { data } = await supabase.from('user_profiles').select('id');
        targets = (data || []).map((p: any) => ({ id: p.id, role: 'listener' }));
      } else if (notificationTarget === 'all') {
        const [{ data: artists }, { data: listeners }] = await Promise.all([
          supabase.from('profiles').select('id'),
          supabase.from('user_profiles').select('id')
        ]);
        targets = [
          ...(artists || []).map((p: any) => ({ id: p.id, role: 'artist' })),
          ...(listeners || []).map((p: any) => ({ id: p.id, role: 'listener' }))
        ];
      }

      if (targets.length === 0) throw new Error('No targets found');

      // Chunk the inserts to avoid payload limits
      const chunkSize = 500;
      for (let i = 0; i < targets.length; i += chunkSize) {
        const chunk = targets.slice(i, i + chunkSize);
        const payloads = chunk.map(t => ({
          profile_id: t.id,
          user_type: t.role,
          type: 'system_alert',
          message: notificationMessage,
          link: notificationLink || null
        }));
        
        const { error } = await supabase.from('notifications').insert(payloads);
        if (error) throw error;
      }

      toast.success(`Notification sent to ${targets.length} user(s)`);
      setNotificationMessage('');
      setNotificationLink('');
    } catch (err: any) {
      toast.error('Failed to send notifications: ' + err.message);
    } finally {
      setNotificationSending(false);
    }
  };

  const fetchArtists = async () => {
    const { data: artistsData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_type', 'artist')
      .not('stage_name', 'is', null)
      .neq('stage_name', '')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Fetch artists error:', error);
      toast.error('Fetch artists error: ' + error.message);
    }
    
    if (artistsData) {
      const artistsWithPending = await Promise.all(artistsData.map(async (art) => {
        try {
          const { count } = await supabase.from('songs').select('*', { count: 'exact', head: true }).eq('artist_id', art.id).eq('approved', false).neq('status', 'draft');
          
          // Fetch agent reference / referral code from their application
          const { data: appData } = await supabase.from('artist_applications').select('*').eq('profile_id', art.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
          
          return { 
            ...art, 
            pending_songs: count || 0,
            referral_code: art.referral_code || appData?.referral_code || null,
            agent_reference: art.agent_reference || appData?.agent_reference || null
          };
        } catch (err: any) {
           console.error("Map artist error", err);
           return { ...art, pending_songs: 0 };
        }
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
      const { error: profileError } = await supabase.from('profiles').update({
        approved: true,
        artist_tier: 'Free',
        email: application.email,
        agent_reference: application.agent_reference || application.referral_code || null
      }).eq('id', application.profile_id);
      
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
    // First figure out if the song belongs to an album
    let albumIdToApprove = null;
    const { data: song } = await supabase.from('songs').select('album_id, artist_id, title, profiles!artist_id(stage_name)').eq('id', songId).single();
    if (song?.album_id) {
       albumIdToApprove = song.album_id;
    }

    let query = supabase.from('songs').update({ approved: true, status: 'approved' });
    if (albumIdToApprove) {
       query = query.eq('album_id', albumIdToApprove);
    } else {
       query = query.eq('id', songId);
    }
    
    const { error } = await query;
    if (error) toast.error(error.message);
    else {
      toast.success(albumIdToApprove ? 'Album and all its songs approved and are now live!' : 'Song approved and is now live!');
      
      // Notify artist
      if (song?.artist_id) {
        await supabase.from('notifications').insert({
          profile_id: song.artist_id,
          user_type: 'artist',
          type: 'system_alert',
          message: `Your song "${song.title}" has been approved!`,
          link: '/artist-hub'
        });

        // Notify followers
        const { data: followers } = await supabase
          .from('followers')
          .select('follower_id')
          .eq('artist_id', song.artist_id);
          
        if (followers && followers.length > 0) {
          const stageName = (song as any).profiles?.stage_name || 'An artist you follow';
          const payload = followers.map((f: any) => ({
            listener_id: f.follower_id,
            type: 'new_release',
            message: `${stageName} just dropped a new song: ${song.title}`,
            link: '/'
          }));
          await supabase.from('listener_notifications').insert(payload);
        }
      }

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
    const { error } = await supabase.from('songs').update({ approved: true, status: 'approved' }).eq('artist_id', artistId).eq('approved', false).neq('status', 'draft');
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
      .update({ verified: !currentStatus, is_verified: !currentStatus })
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
        <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded text-[8px] font-black animate-pulse">
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
            <AdminSidebarItem id="applications" label="Applicants" icon={CircleCheck} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={applications.length} />
            <AdminSidebarItem id="song-reviews" label="Song Reviews" icon={Music2} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={pendingSongs.length} />
            <AdminSidebarItem id="snippet-reviews" label="Moto Feed" icon={Radio} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={pendingSnippets.length} />
            <AdminSidebarItem id="payouts" label="Payout Registry" icon={Wallet} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={payoutRequests.filter(p => p.status === 'pending').length} />
            
            <div className="h-px bg-white/5 my-4 mx-3" />
            <p className={`text-[9px] font-black text-smash-gray uppercase tracking-widest mb-2 px-3 ${sidebarCollapsed ? 'sr-only' : ''}`}>Directory</p>
            <AdminSidebarItem id="artists" label="Verify Artists" icon={Mic2} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="listeners" label="Listener Base" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="songs" label="Main Catalog" icon={Music2} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="ads" label="Commercials" icon={Radio} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="maintenance" label="Maintenance" icon={Settings} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="notifications" label="Notifications" icon={Bell} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
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
        <header className="h-16 bg-[#0c0c10]/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-2 lg:gap-4">
             <button onClick={() => navigate('/')} className="p-2 -ml-2 text-smash-gray hover:text-white transition-colors lg:hidden">
                <ArrowLeft size={18} />
             </button>
             <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-smash-gray hover:text-white transition-colors lg:hidden">
                <Menu size={18} />
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
             <div className="hidden md:block h-4 w-px bg-white/10 mx-2" />
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#4c9aff]/10 flex items-center justify-center text-[#4c9aff] font-black text-xs">{userProfile?.full_name?.[0] || 'A'}</div>
                <div className="hidden sm:block">
                   <p className="text-[10px] font-black uppercase tracking-tighter leading-none">{userProfile?.full_name?.split(' ')[0]}</p>
                   <p className="text-[8px] text-smash-gray uppercase font-bold tracking-widest mt-0.5">Administrator</p>
                </div>
             </div>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-64 h-full bg-[#0c0c10] border-r border-white/5 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-smash-purple flex items-center justify-center text-white shrink-0">
                       <ShieldCheck size={20} />
                    </div>
                    <div className="leading-tight">
                      <h1 className="font-studio font-black text-sm uppercase tracking-tighter">Admin <span className="text-white/40">HQ</span></h1>
                    </div>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-smash-gray hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto no-scrollbar">
                  <AdminSidebarItem id="overview" label="Review Overview" icon={LayoutDashboard} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <div className="h-px bg-white/5 my-4 mx-3" />
                  <p className="text-[9px] font-black text-smash-gray uppercase tracking-widest mb-2 px-3">Governance</p>
                  <AdminSidebarItem id="applications" label="Applicants" icon={CircleCheck} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} count={applications.length} />
                  <AdminSidebarItem id="song-reviews" label="Song Reviews" icon={Music2} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} count={pendingSongs.length} />
                  <AdminSidebarItem id="snippet-reviews" label="Moto Feed" icon={Radio} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} count={pendingSnippets.length} />
                  <AdminSidebarItem id="payouts" label="Payout Registry" icon={Wallet} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} count={payoutRequests.filter(p => p.status === 'pending').length} />
                  
                  <div className="h-px bg-white/5 my-4 mx-3" />
                  <p className="text-[9px] font-black text-smash-gray uppercase tracking-widest mb-2 px-3">Directory</p>
                  <AdminSidebarItem id="artists" label="Verify Artists" icon={Mic2} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="listeners" label="Listener Base" icon={Users} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="songs" label="Main Catalog" icon={Music2} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="ads" label="Commercials" icon={Radio} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="maintenance" label="Maintenance" icon={Settings} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="notifications" label="Notifications" icon={Bell} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                </nav>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
           <div className="max-w-7xl mx-auto space-y-12">
              {/* KPIs with refined design */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                 <KpiCard 
                   title="Platform Rev" 
                   value={`MK ${(platformStats.totalRevenue / 1000).toFixed(0)}k`} 
                   trend="Net Earnings" 
                   icon={DollarSign} 
                   color="text-[#FF6B35]" 
                 />
                 <KpiCard 
                   title="Users" 
                   value={platformStats.totalListeners.toLocaleString()} 
                   trend="Active" 
                   icon={Users} 
                   color="text-[#4C9AFF]" 
                 />
                 <KpiCard 
                   title="Artists" 
                   value={platformStats.totalArtists.toLocaleString()} 
                   trend="Creators" 
                   icon={Mic2} 
                   color="text-[#A855F7]" 
                 />
                 <KpiCard 
                   title="Songs Live" 
                   value={platformStats.totalSongs.toLocaleString()} 
                   trend="Catalog" 
                   icon={Music2} 
                   color="text-[#FFAA00]" 
                 />
                 <KpiCard 
                   title="Review Queue" 
                   value={applications.length + pendingSongs.length + pendingSnippets.length} 
                   trend="Pending" 
                   icon={Clock} 
                   color="text-[#FF4757]" 
                 />
                 <KpiCard 
                   title="Net Payouts" 
                   value={payoutRequests.filter(p => p.status === 'processing').length} 
                   trend="Action Req" 
                   icon={Wallet} 
                   color="text-[#00D68F]" 
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
                <div className="space-y-6">
                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-bg-surface border border-border-default rounded-[14px] p-6 hover:border-smash-purple/30 transition-all">
                      <h3 className="text-base font-semibold text-white mb-1">Revenue Overview</h3>
                      <p className="text-xs text-[#7878a0] mb-6">Monthly revenue breakdown by source</p>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `MK${v/1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a2232', borderColor: 'rgba(100, 116, 139, 0.3)', borderRadius: '8px' }} itemStyle={{ color: '#EAEAF2' }} />
                            <Area isAnimationActive={false} type="monotone" dataKey="revenue" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorRev)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-bg-surface border border-border-default rounded-[14px] p-6 hover:border-smash-purple/30 transition-all">
                      <h3 className="text-base font-semibold text-white mb-1">Revenue Split</h3>
                      <p className="text-xs text-[#7878a0] mb-6">By source this quarter</p>
                      <div className="h-[230px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie isAnimationActive={false} data={revenueSplits} innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                              {revenueSplits.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1a2232', borderColor: 'rgba(100, 116, 139, 0.3)', borderRadius: '8px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap justify-center gap-4 mt-2">
                        {revenueSplits.filter(s => s.name !== 'No Data').map(s => (
                          <div key={s.name} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-[11px] text-[#7878a0] leading-none">{s.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Goal + Recent Txs */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-bg-surface border border-border-default rounded-[14px] p-6">
                      <h3 className="text-base font-semibold text-white mb-1">Platform Goal</h3>
                      <p className="text-xs text-[#7878a0] mb-6">Target: MK 5,000,000</p>
                      <div className="mt-8">
                        <div className="flex justify-between text-[13px] mb-2">
                          <span className="text-[#7878a0]">Progress</span>
                          <span className="font-bold text-[#0ea5e9]">{Math.min(100, Math.round((platformStats.totalRevenue / 5000000) * 100))}%</span>
                        </div>
                        <div className="w-full h-3 bg-bg-elevated rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] rounded-full" style={{ width: `${Math.min(100, Math.round((platformStats.totalRevenue / 5000000) * 100))}%` }} />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-8">
                         <div className="text-center">
                            <h4 className="text-xl font-bold text-white">MK {(platformStats.totalRevenue / 1000).toFixed(1)}K</h4>
                            <p className="text-[11px] text-[#505070] mt-1 uppercase tracking-widest font-bold">Earned</p>
                         </div>
                         <div className="text-center">
                            <h4 className="text-xl font-bold text-[#FFAA00]">MK {Math.max(0, (5000000 - platformStats.totalRevenue) / 1000).toFixed(1)}K</h4>
                            <p className="text-[11px] text-[#505070] mt-1 uppercase tracking-widest font-bold">Remaining</p>
                         </div>
                         <div className="text-center">
                            <h4 className="text-xl font-bold text-[#00D68F]">{platformStats.totalArtists}</h4>
                            <p className="text-[11px] text-[#505070] mt-1 uppercase tracking-widest font-bold">Active Acts</p>
                         </div>
                      </div>
                    </div>

                    <div className="bg-[#141428] border border-[#22223e] rounded-[14px] p-6">
                      <h3 className="text-base font-semibold text-white mb-1">Recent Transactions</h3>
                      <p className="text-xs text-[#7878a0] mb-6">Latest platform financial activity</p>
                      <table className="w-full mt-2">
                        <thead>
                          <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[#7878a0] border-b border-[#22223e]">
                            <th className="pb-3 text-white/50">Artist</th>
                            <th className="pb-3 text-white/50">Type</th>
                            <th className="pb-3 text-white/50">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#22223e]">
                           {recentActivities.map(tx => (
                             <tr key={tx.id} className="hover:bg-[#1a1a35] transition-colors">
                               <td className="py-3 text-[13px] font-medium text-white">{tx.profiles?.stage_name || tx.profiles?.full_name || 'System'}</td>
                               <td className="py-3">
                                 <span className={`px-2 py-1 rounded-md text-[11px] font-semibold capitalize ${tx.type?.includes('sub') ? 'bg-[#ff6b35]/15 text-[#ff6b35]' : tx.type?.includes('tip') || tx.type?.includes('donat') ? 'bg-[#00d68f]/15 text-[#00d68f]' : 'bg-[#4c9aff]/15 text-[#4c9aff]'}`}>
                                   {tx.type || 'tx'}
                                 </span>
                               </td>
                               <td className="py-3 text-[13px] font-bold font-mono text-[#00d68f]">MK {Math.round(tx.net_amount || tx.platform_fee || 0).toLocaleString()}</td>
                             </tr>
                           ))}
                           {recentActivities.length === 0 && (
                             <tr><td colSpan={3} className="py-6 text-center text-[13px] text-[#505070]">No recent transactions</td></tr>
                           )}
                        </tbody>
                      </table>
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
                              <button onClick={() => deleteUser(l.id, l.full_name)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-red-500 text-smash-gray hover:text-white rounded-lg transition-all">
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
                           <th className="px-8 py-5">ID Details</th>
                           <th className="px-8 py-5">Queue</th>
                           <th className="px-8 py-5 text-right">Gate</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 text-sm">
                         {artists.filter(a => !searchQuery || a.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(a => (
                           <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-white/5 p-0.5 border border-white/10 group-hover:border-smash-purple/30 transition-colors">
                                    <img src={a.avatar_url || "https://placehold.co/40x40/18162C/9B5DE5?text=?"} className="w-full h-full rounded-[10px] object-cover" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm text-white group-hover:text-smash-purple transition-colors flex items-center gap-2">
                                      {a.stage_name} 
                                      {(a.verified || a.is_verified) && <ShieldCheck size={14} className="text-smash-cyan" />}
                                    </p>
                                    <p className="text-[10px] text-smash-gray font-black uppercase tracking-widest opacity-60 mb-1">
                                      {a.city} • {a.genre}
                                    </p>
                                    <p className="text-[10px] text-smash-purple font-medium tracking-tight truncate max-w-[140px] lowercase underline opacity-80">
                                      {a.email}
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
                                <div className="flex flex-col gap-2">
                                   <p className="text-[10px] font-black uppercase text-white/50">{a.id_type || 'ID'}: {a.nrc_number || 'N/A'}</p>
                                   <div className="flex gap-2">
                                     {a.id_document_url && (
                                       <a href={a.id_document_url} target="_blank" rel="noopener noreferrer" className="text-[9px] hover:underline text-smash-cyan">View ID</a>
                                     )}
                                     {a.selfie_url && (
                                       <a href={a.selfie_url} target="_blank" rel="noopener noreferrer" className="text-[9px] hover:underline text-smash-purple">View Selfie</a>
                                     )}
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                {a.pending_songs > 0 ? (
                                   <div onClick={() => setActiveTab('song-reviews')} className="flex items-center gap-2 text-smash-orange font-black text-[10px] uppercase tracking-widest cursor-pointer hover:underline">
                                      <div className="w-2 h-2 bg-smash-orange rounded-full animate-pulse" />
                                      {a.pending_songs} items
                                   </div>
                                ) : (
                                   <span className="text-smash-gray text-[9px] uppercase font-black italic tracking-widest opacity-40">Clear</span>
                                )}
                             </td>
                             <td className="px-8 py-6 text-right flex items-center justify-end gap-3">
                                <button onClick={() => setSelectedArtist(a)} className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-smash-purple hover:text-smash-purple transition-all flex items-center gap-2">
                                   <ShieldCheck size={14} /> Profile
                                </button>
                                <button 
                                  onClick={() => toggleArtistVerification(a.id, !!(a.verified || a.is_verified))}
                                  className={`px-4 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                    (a.verified || a.is_verified)
                                      ? 'bg-smash-cyan/10 text-smash-cyan border-smash-cyan/20 hover:bg-smash-cyan hover:text-black' 
                                      : 'bg-white/5 text-smash-gray border-white/5 hover:border-smash-cyan hover:text-smash-cyan'
                                  }`}
                                >
                                  {(a.verified || a.is_verified) ? 'Verified' : 'Verify'}
                                </button>
                                
                                <button onClick={() => deleteArtist(a.id, a.stage_name)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-red-500 text-smash-gray hover:text-white rounded-lg transition-all">
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
                    {new Date(payout.created_at).toLocaleDateString('en-GB', {
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
                      Send <span className="text-white font-black">MK {Math.round(Number(payout.amount || payout.requested_amount) * 0.97).toLocaleString()}</span> (Net of 3% Fee) to{' '}
                      <span className="font-mono font-bold text-white">
                        {payout.artist_phone || payout.phone || payout.profiles?.phone}
                      </span>{' '}
                      via {payout.network}, then mark as paid.
                      <br/>
                      <span className="text-[9px] opacity-70">Gross Requested: MK {Number(payout.amount || payout.requested_amount).toLocaleString()} | Fee: MK {Math.round(Number(payout.amount || payout.requested_amount) * 0.03).toLocaleString()}</span>
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
                                  <button onClick={() => rejectSong(song.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-red-500 text-smash-gray hover:text-white rounded-lg transition-all">
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
                                <div className="flex items-center gap-2">
                                 {app.id_document_url ? (
                                   <span className="text-[10px] bg-[#00d68f]/15 text-[#00d68f] px-2 py-1 flex items-center gap-1 rounded-md uppercase font-bold"><ShieldCheck size={12} /> ID Verified</span>
                                 ) : (
                                   <span className="text-[9px] font-black uppercase text-red-400 tracking-widest">Document Missing</span>
                                 )}
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-3">
                                   <button onClick={() => setSelectedApp(app)} className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-smash-cyan hover:text-smash-cyan transition-all flex items-center gap-2">
                                      <ShieldCheck size={14} /> Review Details
                                   </button>
                                   <button onClick={() => approveArtist(app)} className="h-9 w-9 bg-white text-black rounded-xl flex items-center justify-center hover:bg-smash-green hover:text-white transition-all shadow-lg active:scale-95 group/app tooltip" title="Approve">
                                      <CircleCheck size={16} />
                                   </button>
                                   <button onClick={() => rejectArtist(app)} className="h-9 w-9 bg-white/5 text-smash-gray border border-white/5 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-95 group/rej tooltip" title="Reject">
                                      <X size={16} />
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
                                <div className="flex items-center gap-3">
                                   <button 
                                      onClick={() => togglePlay(song.audio_url, song.id)}
                                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                        playingSongId === song.id 
                                        ? 'bg-[#ff6b35] text-white shadow-[0_0_20px_rgba(255,107,53,0.4)]' 
                                        : 'bg-[#ff6b35]/15 text-[#ff6b35] hover:bg-[#ff6b35] hover:text-white'
                                      }`}
                                   >
                                      {playingSongId === song.id ? <Pause size={16} /> : <Play size={16} />}
                                   </button>
                                   <div className="flex-1 flex flex-col justify-center">
                                      <div className="flex items-center gap-[2px] h-6 opacity-60">
                                         {Array.from({length:15}).map((_, i) => (
                                            <div key={i} className={`w-[3px] rounded-full bg-[#ff6b35] transition-all duration-150 ${playingSongId === song.id ? 'animate-pulse' : ''}`} style={{height: playingSongId === song.id ? `${8 + Math.random() * 16}px` : '4px'}} />
                                         ))}
                                      </div>
                                   </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-3">
                                   <button onClick={() => approveSong(song.id)} className="px-4 py-2 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-smash-green hover:text-white transition-all shadow-lg active:scale-95">Authorize</button>
                                   <button onClick={() => rejectSong(song.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-red-500 text-smash-gray hover:text-white rounded-lg transition-all active:scale-95"><Trash2 size={14} /></button>
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
                                   <button onClick={() => rejectSnippet(snippet.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-red-500 text-smash-gray hover:text-white rounded-lg transition-all active:scale-95"><Trash2 size={14} /></button>
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
                                  <div className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${ad.active ? 'bg-smash-green/10 text-smash-green border border-smash-green/10' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${ad.active ? 'bg-smash-green animate-pulse' : 'bg-red-500'}`} />
                                    {ad.active ? 'Broadcasting' : 'Halted'}
                                  </div>
                               </td>
                               <td className="px-8 py-6 text-right">
                                  <div className="flex items-center justify-end gap-3">
                                     <button onClick={() => toggleAdStatus(ad)} className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${ad.active ? 'bg-white/5 text-smash-orange hover:bg-smash-orange hover:text-black' : 'bg-smash-green/10 text-smash-green hover:bg-smash-green hover:text-white'}`}>
                                       {ad.active ? <Pause size={14} /> : <Play size={14} />}
                                     </button>
                                     <button onClick={() => deleteAd(ad.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 text-smash-gray hover:bg-red-500 hover:text-white rounded-lg transition-all">
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

              {activeTab === 'maintenance' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                   <div className="bg-[#111118] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                     <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-6">System Maintenance</h2>
                     
                     <div className="flex flex-col md:flex-row gap-6 relative z-10">
                        <div className="flex-1 space-y-6">
                           <form onSubmit={saveMaintenanceConfig} className="space-y-4 max-w-xl">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-smash-gray">Maintenance Message</label>
                                <textarea 
                                  value={maintenance.message} 
                                  onChange={e => setMaintenance({...maintenance, message: e.target.value})} 
                                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium focus:outline-none focus:border-smash-orange transition-all min-h-[100px]"
                                  placeholder="We are upgrading..."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-smash-gray">Estimated Time</label>
                                <input 
                                  type="text"
                                  value={maintenance.estimatedTime} 
                                  onChange={e => setMaintenance({...maintenance, estimatedTime: e.target.value})} 
                                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium focus:outline-none focus:border-smash-orange transition-all"
                                  placeholder="e.g. 30 minutes, 1 hour"
                                />
                              </div>
                              <button 
                                type="submit" 
                                disabled={maintenanceLoading}
                                className="px-6 py-3 bg-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/20 transition-all"
                              >
                                {maintenanceLoading ? 'Saving...' : 'Save Configuration'}
                              </button>
                           </form>
                        </div>
                        
                        <div className="w-full md:w-80 shrink-0 p-6 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center text-center justify-center space-y-4">
                           <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${maintenance.active ? 'bg-smash-orange text-white shadow-smash-orange/30 animate-pulse' : 'bg-white/10 text-smash-gray'}`}>
                              <Settings size={36} className={maintenance.active ? 'animate-spin-slow' : ''} />
                           </div>
                           <div>
                             <h4 className="font-bold text-lg">{maintenance.active ? 'Maintenance Mode ACTIVE' : 'Maintenance Mode OFF'}</h4>
                             <p className="text-xs text-smash-gray mt-1">
                               {maintenance.active ? 'Users currently see the maintenance screen.' : 'App is functioning normally.'}
                             </p>
                           </div>
                           
                           <button 
                             type="button"
                             onClick={() => toggleMaintenance(!maintenance.active)}
                             disabled={maintenanceLoading}
                             className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl ${
                               maintenance.active 
                               ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                               : 'bg-smash-orange hover:bg-smash-orange/90 text-black shadow-smash-orange/20'
                             }`}
                           >
                              {maintenanceLoading ? 'Updating...' : (maintenance.active ? 'Deactivate Maintenance' : 'Activate Maintenance')}
                           </button>
                        </div>
                     </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                   <div className="bg-[#111118] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                     <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-6">Send Out Notifications</h2>
                     
                     <form onSubmit={handleSendNotification} className="space-y-6 max-w-2xl">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-smash-gray">Target Audience</label>
                           <div className="flex flex-wrap gap-2">
                             {['all', 'artists', 'listeners', 'specific'].map((t) => (
                               <button
                                 key={t}
                                 type="button"
                                 onClick={() => setNotificationTarget(t as any)}
                                 className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${
                                   notificationTarget === t 
                                   ? 'bg-smash-purple text-white' 
                                   : 'bg-white/5 text-smash-gray hover:bg-white/10 hover:text-white'
                                 }`}
                               >
                                 {t}
                               </button>
                             ))}
                           </div>
                        </div>

                        {notificationTarget === 'specific' && (
                          <div className="space-y-2 relative">
                            <label className="text-[10px] font-black uppercase tracking-widest text-smash-gray">Search User (Specific User)</label>
                            <input 
                              type="text"
                              value={userSearchText}
                              onChange={e => {
                                setUserSearchText(e.target.value);
                                setShowUserDropdown(true);
                                if (!e.target.value) setNotificationUserId('');
                              }}
                              onFocus={() => setShowUserDropdown(true)}
                              placeholder="Search by name or UUID..."
                              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium focus:outline-none focus:border-smash-purple transition-all"
                            />
                            {notificationUserId && (
                              <p className="text-[10px] text-green-400 mt-1">Selected UUID: {notificationUserId}</p>
                            )}

                            <AnimatePresence>
                              {showUserDropdown && userSearchText.trim() && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 5 }}
                                  className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                                >
                                  {filteredNotificationUsers.length > 0 ? (
                                    filteredNotificationUsers.map(u => (
                                      <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => {
                                          setNotificationUserId(u.id);
                                          setUserSearchText(`${u.name} (${u.type})`);
                                          setShowUserDropdown(false);
                                        }}
                                        className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors flex items-center justify-between"
                                      >
                                        <div>
                                          <p className="text-sm font-bold text-white">{u.name}</p>
                                          <p className="text-[10px] text-smash-gray font-mono">{u.id}</p>
                                        </div>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${u.type === 'Artist' ? 'bg-smash-orange/20 text-smash-orange' : 'bg-smash-purple/20 text-smash-purple'}`}>
                                          {u.type}
                                        </span>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-4 py-3 text-sm text-smash-gray">No users found</div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-smash-gray">Notification Message</label>
                          <textarea 
                            value={notificationMessage}
                            onChange={e => setNotificationMessage(e.target.value)}
                            placeholder="Type the message to send out..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium focus:outline-none focus:border-smash-purple transition-all min-h-[120px]"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-smash-gray">Optional Link (Where should it go when clicked?)</label>
                          <input 
                            type="text"
                            value={notificationLink}
                            onChange={e => setNotificationLink(e.target.value)}
                            placeholder="e.g. /discover or /artist-hub"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium focus:outline-none focus:border-smash-purple transition-all"
                          />
                        </div>

                        <button 
                          type="submit"
                          disabled={notificationSending}
                          className="px-8 py-4 bg-smash-purple hover:bg-smash-purple/90 text-white rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex items-center gap-2"
                        >
                          <Send size={18} />
                          {notificationSending ? 'Sending...' : 'Dispatch Notification'}
                        </button>
                     </form>
                   </div>
                </motion.div>
              )}

                </div>
              </AnimatePresence>
            )}

            {/* Modals */}
            <AnimatePresence>
              {selectedApp && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-2xl bg-[#141428] border border-[#22223e] rounded-[16px] max-h-[85vh] overflow-y-auto flex flex-col">
                    <div className="p-5 border-b border-[#22223e] flex items-center justify-between sticky top-0 bg-[#10101e] z-10 rounded-t-[16px]">
                      <h3 className="font-bold text-lg text-white">Application Details</h3>
                      <button onClick={() => setSelectedApp(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#141428] border border-[#22223e] text-[#7878a0] hover:text-[#ff4757] hover:border-[#ff4757] transition-all">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="flex gap-4 mb-6">
                        <div className="w-16 h-16 rounded-xl bg-[#ff6b35]/15 flex items-center justify-center text-[28px] font-bold text-[#ff6b35]">
                          {selectedApp.stage_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-xl text-white">{selectedApp.stage_name}</div>
                          <div className="text-[13px] text-[#7878a0] mt-1">Real name: {selectedApp.full_name || selectedApp.name}</div>
                          <div className="mt-2 flex gap-2">
                             <span className="bg-[#ffaa00]/15 text-[#ffaa00] px-2 py-1 rounded-md text-[11px] font-bold uppercase">{selectedApp.status || 'Pending'}</span>
                             <span className="bg-[#ff6b35]/15 text-[#ff6b35] px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest font-mono">APP-{selectedApp.id?.split('-')[0]}</span>
                          </div>
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-[#ff6b35] mb-2 mt-6">Personal Identity</h4>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">Email</span><span className="font-semibold text-white">{selectedApp.email}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">Phone</span><span className="font-semibold text-white">{selectedApp.phone || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">City</span><span className="font-semibold text-white">{selectedApp.city || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">ID Type</span><span className="font-semibold text-white">{selectedApp.id_type || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">ID Number</span><span className="font-medium text-white font-mono">{selectedApp.national_id_number || selectedApp.nrc_number || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">Agent Reference</span><span className={`font-semibold font-mono ${selectedApp.agent_reference || selectedApp.referral_code ? 'text-[#00d68f]' : 'text-white'}`}>{selectedApp.agent_reference || selectedApp.referral_code || 'N/A'}</span></div>

                      <h4 className="font-bold text-sm text-[#ff6b35] mb-2 mt-8">Verification Documents</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                         <div>
                            <p className="text-[11px] text-[#7878a0] mb-1">ID Document</p>
                            {selectedApp.id_document_url ? (
                              <img src={selectedApp.id_document_url} alt="ID Document" className="w-full rounded-lg border border-[#22223e] hover:scale-105 transition-transform cursor-pointer" onClick={() => window.open(selectedApp.id_document_url, '_blank')} />
                            ) : (
                              <div className="p-4 bg-[#22223e] rounded-lg text-[11px] text-[#7878a0]">Not provided</div>
                            )}
                         </div>
                         <div>
                            <p className="text-[11px] text-[#7878a0] mb-1">Selfie Image</p>
                            {selectedApp.selfie_url ? (
                              <img src={selectedApp.selfie_url} alt="Selfie" className="w-full rounded-lg border border-[#22223e] hover:scale-105 transition-transform cursor-pointer" onClick={() => window.open(selectedApp.selfie_url, '_blank')} />
                            ) : (
                              <div className="p-4 bg-[#22223e] rounded-lg text-[11px] text-[#7878a0]">Not provided</div>
                            )}
                         </div>
                      </div>
                      
                      <h4 className="font-bold text-sm text-[#ff6b35] mb-2 mt-8">Artist Roster Data</h4>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">Stage Name</span><span className="font-semibold text-white">{selectedApp.stage_name}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">Genre</span><span className="font-semibold text-white">{selectedApp.genre}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">Agent Reference</span><span className={`font-semibold font-mono ${selectedApp.agent_reference || selectedApp.referral_code ? 'text-[#00d68f]' : 'text-white'}`}>{selectedApp.agent_reference || selectedApp.referral_code || 'N/A'}</span></div>

                      <div className="flex gap-3 mt-8 pt-5 border-t border-[#22223e]">
                         <button onClick={() => { approveArtist(selectedApp); setSelectedApp(null); }} className="flex-1 py-3 bg-[#00d68f] hover:brightness-110 text-black font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all">
                            <CircleCheck size={16} /> Approve Application
                         </button>
                         <button onClick={() => { rejectArtist(selectedApp); setSelectedApp(null); }} className="flex-1 py-3 bg-[#ff4757]/15 border border-[#ff4757]/30 text-[#ff4757] hover:bg-[#ff4757] hover:text-white font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all">
                            <X size={16} /> Reject
                         </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
              {selectedArtist && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-2xl bg-[#141428] border border-[#22223e] rounded-[16px] max-h-[85vh] overflow-y-auto flex flex-col">
                    <div className="p-5 border-b border-[#22223e] flex items-center justify-between sticky top-0 bg-[#10101e] z-10 rounded-t-[16px]">
                      <h3 className="font-bold text-lg text-white">Artist Profile</h3>
                      <button onClick={() => setSelectedArtist(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#141428] border border-[#22223e] text-[#7878a0] hover:text-[#ff4757] hover:border-[#ff4757] transition-all">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="flex gap-4 mb-6">
                        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                          <img src={selectedArtist.avatar_url || "https://placehold.co/100x100/18162C/9B5DE5?text=?"} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="font-bold text-xl text-white flex items-center gap-2">
                            {selectedArtist.stage_name}
                            {(selectedArtist.verified || selectedArtist.is_verified) && <ShieldCheck size={18} className="text-[#00d68f]" />}
                          </div>
                          <div className="text-[13px] text-[#7878a0] mt-1">{selectedArtist.genre} • {selectedArtist.city || 'Malawi'}</div>
                          <div className="mt-2 flex gap-2">
                             <span className="bg-[#4c9aff]/15 text-[#4c9aff] px-2 py-1 rounded-md text-[11px] font-bold uppercase">{selectedArtist.artist_tier || 'Standard'} Tier</span>
                             <span className="bg-[#ff6b35]/15 text-[#ff6b35] px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest font-mono">AP-{selectedArtist.id?.split('-')[0]}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                         <div className="p-4 bg-[#1a1a35] rounded-xl border border-[#22223e]">
                            <p className="text-[11px] text-[#7878a0] uppercase font-bold tracking-widest mb-1">Wallet Balance</p>
                            <p className="text-xl font-bold text-[#00d68f]">MK {selectedArtist.wallet_balance?.toLocaleString() || 0}</p>
                         </div>
                         <div className="p-4 bg-[#1a1a35] rounded-xl border border-[#22223e]">
                            <p className="text-[11px] text-[#7878a0] uppercase font-bold tracking-widest mb-1">Pending Songs</p>
                            <p className="text-xl font-bold text-[#ffaa00]">{selectedArtist.pending_songs || 0}</p>
                         </div>
                      </div>

                      <h4 className="font-bold text-sm text-white mb-2">Platform Identity</h4>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">Email Address</span><span className="font-semibold text-white">{selectedArtist.email || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">Phone / Mobile Money</span><span className="font-semibold text-white">{selectedArtist.phone || 'N/A'}</span></div>

                      <h4 className="font-bold text-sm text-white mb-2 mt-8">KYC Information</h4>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">Name</span><span className="font-semibold text-white">{selectedArtist.full_name || selectedArtist.name || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">ID Number</span><span className="font-medium text-white font-mono">{selectedArtist.nrc_number || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-[#22223e] text-[13px]"><span className="text-[#7878a0]">Agent Reference</span><span className={`font-semibold font-mono ${selectedArtist.agent_reference || selectedArtist.referral_code ? 'text-[#00d68f]' : 'text-white'}`}>{selectedArtist.agent_reference || selectedArtist.referral_code || 'N/A'}</span></div>

                      <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
                         <div>
                            <p className="text-[11px] text-[#7878a0] mb-1">ID Document</p>
                            {selectedArtist.id_document_url ? (
                              <img src={selectedArtist.id_document_url} alt="ID Document" className="w-full rounded-lg border border-[#22223e] hover:scale-105 transition-transform cursor-pointer" onClick={() => window.open(selectedArtist.id_document_url, '_blank')} />
                            ) : (
                              <div className="p-4 bg-[#22223e] rounded-lg text-[11px] text-[#7878a0]">Not provided</div>
                            )}
                         </div>
                         <div>
                            <p className="text-[11px] text-[#7878a0] mb-1">Selfie Image</p>
                            {selectedArtist.selfie_url ? (
                              <img src={selectedArtist.selfie_url} alt="Selfie" className="w-full rounded-lg border border-[#22223e] hover:scale-105 transition-transform cursor-pointer" onClick={() => window.open(selectedArtist.selfie_url, '_blank')} />
                            ) : (
                              <div className="p-4 bg-[#22223e] rounded-lg text-[11px] text-[#7878a0]">Not provided</div>
                            )}
                         </div>
                      </div>

                      <div className="flex gap-3 mt-8 pt-5 border-t border-[#22223e]">
                         <button 
                            onClick={() => { toggleArtistVerification(selectedArtist.id, !!(selectedArtist.verified || selectedArtist.is_verified)); setSelectedArtist(null); }} 
                            className={`flex-1 py-3 font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all ${
                              (selectedArtist.verified || selectedArtist.is_verified) ? 'bg-[#22223e] text-white hover:bg-white border text-black hover:text-black' : 'bg-[#00d68f] hover:brightness-110 text-black'
                            }`}
                         >
                            <ShieldCheck size={16} /> {(selectedArtist.verified || selectedArtist.is_verified) ? 'Revoke Verification' : 'Verify Artist'}
                         </button>
                         <button onClick={() => { deleteArtist(selectedArtist.id, selectedArtist.stage_name); setSelectedArtist(null); }} className="flex-1 py-3 bg-[#ff4757]/15 border border-[#ff4757]/30 text-[#ff4757] hover:bg-[#ff4757] hover:text-white font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all">
                            <Trash2 size={16} /> Remove from Platform
                         </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

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
          <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">
            {count}
          </span>
        )}
      </div>
    )}
    {collapsed && count !== undefined && count > 0 && (
      <div className="absolute left-14 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#0c0c10]">
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

