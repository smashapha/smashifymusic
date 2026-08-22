import { optimizeImage } from "../lib/imageUtils";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, CircleCheck, Trash2, Music2, Plus, FileAudio, X, Flame, 
  Volume2, VolumeX, Edit3, LayoutDashboard, Clock, Radio, Wallet, DollarSign,
  Mic2, Users, ShoppingCart, Heart, CreditCard, Search, ArrowLeft, TrendingUp,
  Pause, Play, Activity, ArrowUpRight, ArrowDownRight, MoreHorizontal, ChevronDown, Menu, Settings, Bell, Send, RefreshCw,
  Ticket, CheckSquare, Sparkles, CheckCircle2, AlertTriangle, Smartphone, Film, Check, XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { verifyPayment } from '../lib/paychangu';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { AdminPeople } from '../components/admin/AdminPeople';
import { AdminPipeline } from '../components/admin/AdminPipeline';
import { AdminTickets } from '../components/admin/AdminTickets';
import { AdminCampaigns } from '../components/admin/AdminCampaigns';
import { AdminFinance } from '../components/admin/AdminFinance';
import { AdminBilling } from '../components/admin/AdminBilling';
import { AdminOperations } from '../components/admin/AdminOperations';

type AdminTab = 
  | 'overview' 
  | 'people' 
  | 'pipeline' 
  | 'tickets' 
  | 'campaigns' 
  | 'finance' 
  | 'billing' 
  | 'operations' 
  | 'listeners' 
  | 'artists' 
  | 'songs' 
  | 'applications' 
  | 'song-reviews' 
  | 'snippet-reviews' 
  | 'ads' 
  | 'payouts' 
  | 'agents' 
  | 'maintenance' 
  | 'notifications' 
  | 'expiry-monitor';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as any;
    const validTabs: AdminTab[] = [
      'overview', 'people', 'pipeline', 'tickets', 'campaigns', 
      'finance', 'billing', 'operations', 'listeners', 'artists', 
      'songs', 'applications', 'song-reviews', 'snippet-reviews', 
      'ads', 'payouts', 'agents', 'maintenance', 'notifications', 'expiry-monitor'
    ];
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const [artists, setArtists] = useState<any[]>([]); 
  const [listeners, setListeners] = useState<any[]>([]); 
  const [allSongs, setAllSongs] = useState<any[]>([]); 
  const [applications, setApplications] = useState<any[]>([]); 
  const [agentApplications, setAgentApplications] = useState<any[]>([]);
  const [approvedAgents, setApprovedAgents] = useState<any[]>([]);
  const [pendingSongs, setPendingSongs] = useState<any[]>([]); 
  const [pendingSnippets, setPendingSnippets] = useState<any[]>([]); 
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expiringArtists, setExpiringArtists] = useState<any[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdForm, setShowAdForm] = useState(false);
  const [adUploading, setAdUploading] = useState(false);
  const [fixStuckLoading, setFixStuckLoading] = useState(false);
  const [adFormDraft, setAdFormDraft] = useState({
    advertiser_name: '',
    title: '',
    type: 'platform',
    plays_purchased: 1000,
    revenue: 0,
  });

  const loadAdDraft = () => {
    try {
      const saved = sessionStorage.getItem('smashify_ad_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAdFormDraft(prev => ({
          ...prev,
          ...parsed
        }));
      }
    } catch (e) {
      console.warn('Failed to load ad draft from sessionStorage', e);
    }
  };

  useEffect(() => {
    loadAdDraft();
  }, []);

  useEffect(() => {
    if (activeTab === 'ads' || showAdForm) {
      loadAdDraft();
    }
  }, [activeTab, showAdForm]);

  const handleAdFieldChange = (field: string, value: any) => {
    setAdFormDraft(prev => {
      const next = { ...prev, [field]: value };
      try {
        sessionStorage.setItem('smashify_ad_draft', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };
  
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

      // Auto-refresh urgent counts every 60 seconds
      const refreshInterval = setInterval(() => {
        fetchPayoutRequests();
        fetchApplications();
        fetchPendingSongs();
      }, 60000);
      
      // Auto-refresh everything every 30 minutes
      const fullRefreshInterval = setInterval(() => {
        fetchAllData(false);
      }, 30 * 60 * 1000);
      
      return () => {
        clearInterval(refreshInterval);
        clearInterval(fullRefreshInterval);
      };
    }
  }, [userProfile, navigate]);

  const fetchExpiringArtists = async () => {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('profiles')
      .select('id, stage_name, artist_tier, subscription_ends, wallet_balance, email')
      .neq('artist_tier', 'Free')
      .not('subscription_ends', 'is', null)
      .lte('subscription_ends', thirtyDaysFromNow)
      .order('subscription_ends', { ascending: true });
    setExpiringArtists(data || []);
  };

  const fetchAgents = async () => {
    try {
      const { data: pending } = await supabase
        .from('agents')
        .select('*, user_profiles!user_id(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setAgentApplications(pending || []);

      const { data: approved } = await supabase
        .from('agents')
        .select('*, user_profiles!user_id(full_name)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (approved) {
        // Also fetch pending commissions for them
        const { data: comms } = await supabase
          .from('agent_commissions')
          .select('agent_id, status, artist_id');
          
        const { data: referredProfiles } = await supabase
          .from('profiles')
          .select('id, referred_by_agent_id')
          .not('referred_by_agent_id', 'is', null);
          
        const agentsWithCounts = approved.map(a => {
          const aComms = comms?.filter(c => c.agent_id === a.id) || [];
          
          const referredSet = new Set();
          aComms.forEach(c => {
             if (c.artist_id) referredSet.add(c.artist_id);
          });
          
          const aReferred = referredProfiles?.filter(p => p.referred_by_agent_id === a.id) || [];
          aReferred.forEach(p => referredSet.add(p.id));

          return {
            ...a,
            referred_count: referredSet.size,
            has_processing: aComms.some(c => c.status === 'processing')
          };
        });
        setApprovedAgents(agentsWithCounts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setIsRefreshing(true);
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
      fetchMaintenance(),
      fetchExpiringArtists(),
      fetchAgents()
    ]);
    if (showSpinner) setLoading(false);
    setIsRefreshing(false);
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

  const handleRefreshStuckTransactions = async () => {
    setFixStuckLoading(true);
    try {
      const { data: stuckTxs } = await supabase
        .from('transactions')
        .select('paychangu_ref')
        .in('status', ['pending', 'failed'])
        .not('paychangu_ref', 'is', null);

      if (!stuckTxs || stuckTxs.length === 0) {
        toast.success('No pending/failed transactions found');
        return;
      }

      toast(`Found ${stuckTxs.length} unresolved transactions. Verifying...`);
      
      let fixedCount = 0;
      for (const tx of stuckTxs) {
        if (tx.paychangu_ref) {
          try {
            await verifyPayment(tx.paychangu_ref);
            fixedCount++;
          } catch (e) {
            console.warn('Failed to verify tx', tx.paychangu_ref, e);
          }
        }
      }
      
      await fetchPlatformStats(); 
      toast.success(`Processed ${fixedCount} pending transactions`);
    } catch (error: any) {
      toast.error('Failed to sync transactions: ' + error.message);
    } finally {
      setFixStuckLoading(false);
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

  const bulkApproveSongs = async () => {
    if (selectedSongs.length === 0) return;
    const { error } = await supabase
      .from('songs')
      .update({ approved: true })
      .in('id', selectedSongs);
    if (!error) {
      toast.success(`${selectedSongs.length} songs approved`);
      setSelectedSongs([]);
      fetchPendingSongs();
    }
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
        supabase.from('songs').select('*', { count: 'exact', head: true }).eq('approved', false),
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
        { name: 'Subscriptions', value: splits.subscriptions, color: '#00A3FF' },
        { name: 'Tips', value: splits.tips, color: '#10b981' },
        { name: 'Sales', value: splits.sales, color: '#00A3FF' },
      ].filter(s => s.value > 0).length ? [
        { name: 'Subscriptions', value: splits.subscriptions, color: '#00A3FF' },
        { name: 'Tips', value: splits.tips, color: '#10b981' },
        { name: 'Sales', value: splits.sales, color: '#00A3FF' },
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

  const adminApproveAgent = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_approve_agent', { p_user_id: userId });
      if (error) throw error;
      toast.success('Agent approved! Code: ' + data);
      fetchAgents();
    } catch (e: any) {
      toast.error('Approval failed: ' + e.message);
    }
  };

  const adminRejectAgent = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('admin_reject_agent', { p_user_id: userId });
      if (error) throw error;
      toast.success('Agent rejected.');
      fetchAgents();
    } catch (e: any) {
      toast.error('Rejection failed: ' + e.message);
    }
  };

  const adminCompleteAgentPayout = async (agentId: string) => {
    try {
      const { error } = await supabase.rpc('admin_complete_agent_payout', { p_agent_id: agentId });
      if (error) throw error;
      toast.success('Payout marked as paid.');
      fetchAgents();
    } catch (e: any) {
      toast.error('Payout completion failed: ' + e.message);
    }
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
        message: `Your withdrawal of MK ${Number(payout.requested_amount).toLocaleString()} has been paid! MK ${netAmount.toLocaleString()} sent to ${payout.network} ${payout.phone}.`,
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

    const advertiser_name = (fd.get('advertiser_name') as string) || '';
    const title = (fd.get('title') as string) || '';
    const type = (fd.get('type') as string) || 'platform';
    const plays_purchased = parseInt(fd.get('plays_purchased') as string) || 1000;
    const revenue = parseFloat(fd.get('revenue') as string) || 0;

    // 1. Before upload starts, stash form values into sessionStorage
    try {
      sessionStorage.setItem('smashify_ad_draft', JSON.stringify({
        advertiser_name,
        title,
        type,
        plays_purchased,
        revenue,
      }));
    } catch (err) {
      console.warn('Failed to stash ad draft', err);
    }

    if (file && !file.name.toLowerCase().endsWith('.mp3') && file.type !== 'audio/mpeg') {
      toast.error('Only MP3 files are allowed.');
      setAdUploading(false);
      return;
    }
    if (!file || file.size === 0) {
      toast.error('Please select an MP3 audio file.');
      setAdUploading(false);
      return;
    }

    try {
      const path = `ads/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('audio_ads').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('audio_ads').getPublicUrl(path);

      const { error } = await supabase.from('audio_ads').insert({
        advertiser_name,
        title,
        type,
        audio_url: publicUrl,
        plays_purchased,
        plays_used: 0,
        active: true,
        revenue,
      });
      if (error) throw error;

      // 3. Clear draft ONLY after upload + DB insert succeed
      try {
        sessionStorage.removeItem('smashify_ad_draft');
      } catch (err) {}
      setAdFormDraft({
        advertiser_name: '',
        title: '',
        type: 'platform',
        plays_purchased: 1000,
        revenue: 0,
      });

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
    const { data, error } = await supabase
      .from('songs')
      .select('*, profiles!artist_id(stage_name, full_name, email)')
      .eq('approved', false)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching pending songs:', error);
    }
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
          const { count } = await supabase.from('songs').select('*', { count: 'exact', head: true }).eq('artist_id', art.id).eq('approved', false);
          
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
    const { error } = await supabase.from('songs').update({ approved: true, status: 'approved' }).eq('artist_id', artistId).eq('approved', false);
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
      className={`relative flex items-center gap-2 px-4 py-3 transition-all  font-bold text-[13px] tracking-[0.15em] shrink-0 ${
        activeTab === id 
          ? 'text-white' 
          : 'text-[#B0B0B0] hover:text-white'
      }`}
    >
      <Icon size={14} className={activeTab === id ? 'text-[#00A3FF]' : ''} />
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 bg-[#FF453A] text-white rounded text-[13px] font-bold animate-pulse">
          {count}
        </span>
      )}
      {activeTab === id && (
        <motion.div 
          layoutId="tab-active"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0084D6] shadow-[0_0_10px_rgba(155,93,229,0.5)]"
        />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex overflow-hidden">
      {/* Admin Sidebar */}
      <aside className={`bg-[#0A0A0A] border-r border-white/10 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} hidden lg:flex`}>
         <div className="h-16 flex items-center px-6 border-b border-white/10 gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-[#00A3FF]/15 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF] shrink-0">
               <ShieldCheck size={18} />
            </div>
            {!sidebarCollapsed && (
              <div className="leading-tight">
                <h1 className="font-studio font-semibold text-[14px]">Smashify Admin</h1>
              </div>
            )}
         </div>

         <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto no-scrollbar">
            {/* CRM Group */}
            <p className={`text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2 px-3 ${sidebarCollapsed ? 'sr-only' : ''}`}>CRM</p>
            <AdminSidebarItem id="people" label="People" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="pipeline" label="Pipeline" icon={TrendingUp} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="tickets" label="Tickets" icon={Ticket} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="campaigns" label="Campaigns" icon={Sparkles} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="artists" label="Verify Artists" icon={Mic2} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="listeners" label="Listener Base" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="agents" label="Agents" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={agentApplications.length} />
            <AdminSidebarItem id="applications" label="Applicants" icon={CircleCheck} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={applications.length} />

            <div className="h-px bg-white/5 my-4 mx-3" />

            {/* ERP Group */}
            <p className={`text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2 px-3 ${sidebarCollapsed ? 'sr-only' : ''}`}>ERP</p>
            <AdminSidebarItem id="overview" label="Review Overview" icon={LayoutDashboard} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="finance" label="Finance" icon={DollarSign} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="billing" label="Billing" icon={CreditCard} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="operations" label="Operations" icon={CheckSquare} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="song-reviews" label="Song Reviews" icon={Music2} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={pendingSongs.length} />
            <AdminSidebarItem id="snippet-reviews" label="Moto Feed" icon={Radio} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={pendingSnippets.length} />
            <AdminSidebarItem id="payouts" label="Payout Registry" icon={Wallet} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} count={payoutRequests.filter(p => p.status === 'pending').length} />
            <AdminSidebarItem id="songs" label="Main Catalog" icon={Music2} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="ads" label="Commercials" icon={Radio} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="maintenance" label="Maintenance" icon={Settings} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem id="notifications" label="Notifications" icon={Bell} activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} />
            <AdminSidebarItem 
              id="expiry-monitor" 
              label="Expiry Monitor" 
              icon={Clock} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              collapsed={sidebarCollapsed} 
              count={expiringArtists?.filter(a => {
                const days = Math.ceil((new Date(a.subscription_ends).getTime() - Date.now()) / 86400000);
                return days <= 7 && days > 0;
              }).length} 
            />
         </nav>

         <div className="p-4 border-t border-white/5">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full h-10 flex items-center justify-center text-[#B0B0B0] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
               {sidebarCollapsed ? <Plus className="rotate-45" size={18} /> : <div className="text-[13px] font-bold  ">Collapse Menu</div>}
            </button>
         </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-2 lg:gap-4">
             <button onClick={() => navigate('/')} className="p-2 -ml-2 text-[#B0B0B0] hover:text-white transition-colors lg:hidden">
                <ArrowLeft size={18} />
             </button>
             <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-[#B0B0B0] hover:text-white transition-colors lg:hidden">
                <Menu size={18} />
             </button>
             <h2 className="text-[14px] font-studio font-semibold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
          </div>

          <div className="flex items-center gap-4">
             <button 
                onClick={() => {
                  toast.success('Refreshing data...', { id: 'admin-refresh', duration: 2000 });
                  fetchAllData(false);
                }}
                disabled={isRefreshing}
                className="p-2 text-[#B0B0B0] hover:text-white transition-colors disabled:opacity-50"
                title="Refresh Data"
             >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
             </button>
             <div className="relative group w-64 hidden md:block">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B0B0]" />
                <input 
                  type="text"
                  placeholder="Universal Audit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-[10px] py-2 pl-10 pr-4 text-[13px] text-white placeholder-[#737373] focus:outline-none focus:border-[#00A3FF] transition-all"
                />
             </div>
             <div className="hidden md:block h-4 w-px bg-white/10 mx-2" />
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#4c9aff]/10 flex items-center justify-center text-[#4c9aff] font-bold text-[13px]">{userProfile?.full_name?.[0] || 'A'}</div>
                <div className="hidden sm:block">
                   <p className="text-[13px] font-bold  tracking-tighter leading-none">{userProfile?.full_name?.split(' ')[0]}</p>
                   <p className="text-[13px] text-[#B0B0B0]  font-bold  mt-0.5">Administrator</p>
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
                className="w-64 h-full bg-[#0A0A0A] border-r border-white/5 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0084D6] flex items-center justify-center text-white shrink-0">
                       <ShieldCheck size={20} />
                    </div>
                    <div className="leading-tight">
                      <h1 className="font-studio font-bold text-[13px]  tracking-tighter">Admin <span className="text-white/40">HQ</span></h1>
                    </div>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-[#B0B0B0] hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto no-scrollbar">
                  {/* CRM Group */}
                  <p className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2 px-3">CRM</p>
                  <AdminSidebarItem id="people" label="People" icon={Users} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="pipeline" label="Pipeline" icon={TrendingUp} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="tickets" label="Tickets" icon={Ticket} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="campaigns" label="Campaigns" icon={Sparkles} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="artists" label="Verify Artists" icon={Mic2} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="listeners" label="Listener Base" icon={Users} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="agents" label="Agents" icon={Users} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} count={agentApplications.length} />
                  <AdminSidebarItem id="applications" label="Applicants" icon={CircleCheck} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} count={applications.length} />
                  
                  <div className="h-px bg-white/5 my-4 mx-3" />

                  {/* ERP Group */}
                  <p className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2 px-3">ERP</p>
                  <AdminSidebarItem id="overview" label="Review Overview" icon={LayoutDashboard} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="finance" label="Finance" icon={DollarSign} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="billing" label="Billing" icon={CreditCard} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="operations" label="Operations" icon={CheckSquare} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="song-reviews" label="Song Reviews" icon={Music2} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} count={pendingSongs.length} />
                  <AdminSidebarItem id="snippet-reviews" label="Moto Feed" icon={Radio} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} count={pendingSnippets.length} />
                  <AdminSidebarItem id="payouts" label="Payout Registry" icon={Wallet} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} count={payoutRequests.filter(p => p.status === 'pending').length} />
                  <AdminSidebarItem id="songs" label="Main Catalog" icon={Music2} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="ads" label="Commercials" icon={Radio} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="maintenance" label="Maintenance" icon={Settings} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem id="notifications" label="Notifications" icon={Bell} activeTab={activeTab} setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} collapsed={false} />
                  <AdminSidebarItem 
                    id="expiry-monitor" 
                    label="Expiry Monitor" 
                    icon={Clock} 
                    activeTab={activeTab} 
                    setActiveTab={(id: any) => {setActiveTab(id); setMobileMenuOpen(false);}} 
                    collapsed={false} 
                    count={expiringArtists?.filter(a => {
                      const days = Math.ceil((new Date(a.subscription_ends).getTime() - Date.now()) / 86400000);
                      return days <= 7 && days > 0;
                    }).length} 
                  />
                </nav>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
           <div className="max-w-7xl mx-auto space-y-8">
              {loading ? (
                 <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <div className="w-10 h-10 border-2 border-[#00A3FF] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#B0B0B0] font-medium text-[13px]">Loading admin workspace...</p>
                 </div>
              ) : (
                <AnimatePresence mode="wait">
                  <div key={activeTab}>
                    {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Row 1: 4 Stat Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 hover:border-[#00A3FF]/30 transition-all">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#00A3FF] mb-3">
                        <Mic2 size={16} />
                      </div>
                      <p className="text-[26px] font-mono font-semibold text-white leading-none">
                        {platformStats.totalArtists.toLocaleString()}
                      </p>
                      <p className="text-[12px] text-[#B0B0B0] mt-1.5">Total artists</p>
                    </div>

                    <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 hover:border-[#00A3FF]/30 transition-all">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#00A3FF] mb-3">
                        <Users size={16} />
                      </div>
                      <p className="text-[26px] font-mono font-semibold text-white leading-none">
                        {platformStats.totalListeners.toLocaleString()}
                      </p>
                      <p className="text-[12px] text-[#B0B0B0] mt-1.5">Total listeners</p>
                    </div>

                    <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 hover:border-[#00A3FF]/30 transition-all">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#00A3FF] mb-3">
                        <Music2 size={16} />
                      </div>
                      <p className="text-[26px] font-mono font-semibold text-white leading-none">
                        {platformStats.totalSongs.toLocaleString()}
                      </p>
                      <p className="text-[12px] text-[#B0B0B0] mt-1.5">Total songs</p>
                    </div>

                    <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 hover:border-[#00A3FF]/30 transition-all">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#00A3FF] mb-3">
                        <DollarSign size={16} />
                      </div>
                      <p className="text-[24px] font-mono font-semibold text-white leading-none truncate">
                        MK {Number(platformStats.totalRevenue || 0).toLocaleString()}
                      </p>
                      <p className="text-[12px] text-[#B0B0B0] mt-1.5">Platform revenue</p>
                    </div>
                  </div>

                  {/* Row 2: Needs Attention Section */}
                  <div>
                    <h3 className="text-[11px] font-semibold text-[#737373] uppercase tracking-[0.12em] mb-3">
                      Needs Attention
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {[
                        {
                          label: 'Pending songs',
                          count: pendingSongs.length,
                          tab: 'song-reviews' as const,
                          icon: Music2,
                        },
                        {
                          label: 'Artist applications',
                          count: applications.length,
                          tab: 'applications' as const,
                          icon: Mic2,
                        },
                        {
                          label: 'Feed pending',
                          count: pendingSnippets.length,
                          tab: 'snippet-reviews' as const,
                          icon: Film,
                        },
                        {
                          label: 'Pending payouts',
                          count: payoutRequests.filter(p => p.status === 'pending').length,
                          tab: 'payouts' as const,
                          icon: Wallet,
                        },
                        {
                          label: 'Agent applications',
                          count: agentApplications.length,
                          tab: 'agents' as const,
                          icon: Users,
                        }
                      ].map((item) => (
                        <div
                          key={item.tab}
                          className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-4 flex flex-col justify-between hover:border-[#00A3FF]/30 transition-all group"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#00A3FF]">
                                <item.icon size={14} />
                              </div>
                              {item.count > 0 && (
                                <span className="text-[11px] font-semibold bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/30 px-2 py-0.5 rounded-full font-mono">
                                  {item.count}
                                </span>
                              )}
                            </div>
                            <p className="text-[22px] font-mono font-semibold text-white leading-none">
                              {item.count}
                            </p>
                            <p className="text-[12px] text-[#B0B0B0] mt-1 truncate">{item.label}</p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-white/5">
                            {item.count > 0 ? (
                              <button
                                onClick={() => setActiveTab(item.tab)}
                                className="text-[12px] font-semibold text-[#00A3FF] hover:text-white flex items-center gap-1 transition-colors"
                              >
                                Review &rarr;
                              </button>
                            ) : (
                              <span className="text-[12px] text-[#737373]">Queue clear</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: Revenue Overview Chart */}
                  <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 hover:border-[#00A3FF]/30 transition-all">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-base font-semibold text-white">Revenue Overview</h3>
                        <p className="text-[13px] text-[#B0B0B0] mt-0.5">Monthly platform revenue trends</p>
                      </div>
                    </div>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00A3FF" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#00A3FF" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                          <XAxis dataKey="name" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `MK ${v/1000}k`} />
                          <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px' }} itemStyle={{ color: '#FFFFFF', fontSize: '12px' }} />
                          <Area isAnimationActive={false} type="monotone" dataKey="revenue" stroke="#00A3FF" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Row 4: Revenue Split & Recent Transactions */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 hover:border-[#00A3FF]/30 transition-all flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-white mb-1">Revenue Split</h3>
                        <p className="text-[13px] text-[#B0B0B0] mb-4">By category this quarter</p>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie isAnimationActive={false} data={revenueSplits} innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                                {revenueSplits.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }} itemStyle={{ color: '#FFFFFF', fontSize: '12px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                        {revenueSplits.filter(s => s.name !== 'No Data').map(s => (
                          <div key={s.name} className="flex items-center justify-between text-[12px]">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                              <span className="text-[#B0B0B0]">{s.name}</span>
                            </div>
                            <span className="font-mono text-white font-medium">MK {Number(s.value || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-2 bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-base font-semibold text-white">Recent Transactions</h3>
                          <button 
                            onClick={handleRefreshStuckTransactions}
                            disabled={fixStuckLoading}
                            className="flex items-center gap-1.5 h-8 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-[10px] transition-colors text-[12px] font-semibold"
                          >
                            <RefreshCw size={13} className={fixStuckLoading ? 'animate-spin' : ''} />
                            {fixStuckLoading ? 'Syncing...' : 'Sync Pending'}
                          </button>
                        </div>
                        <p className="text-[13px] text-[#B0B0B0] mb-4">Latest financial activity on the platform</p>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[13px]">
                            <thead className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 z-10">
                              <tr className="text-[11px] font-semibold tracking-[0.12em] text-[#737373] uppercase">
                                <th className="px-4 py-2.5">Artist</th>
                                <th className="px-4 py-2.5">Type</th>
                                <th className="text-right px-4 py-2.5">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                               {recentActivities.map(tx => (
                                 <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                   <td className="font-medium text-white px-4 py-3">{tx.profiles?.stage_name || tx.profiles?.full_name || 'System'}</td>
                                   <td className="px-4 py-3">
                                     <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-semibold border bg-white/5 text-[#00A3FF] border-[#00A3FF]/20 capitalize">
                                       {tx.type || 'tx'}
                                     </span>
                                   </td>
                                   <td className="text-right font-mono font-semibold text-[#22C55E] px-4 py-3">MK {Math.round(tx.net_amount || tx.platform_fee || 0).toLocaleString()}</td>
                                 </tr>
                               ))}
                               {recentActivities.length === 0 && (
                                 <tr><td colSpan={3} className="py-8 text-center text-[13px] text-[#737373]">No recent transactions</td></tr>
                               )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[12px] text-[#B0B0B0]">
                        <span>Platform Target: MK 5,000,000</span>
                        <span className="text-[#00A3FF] font-semibold">{Math.min(100, Math.round((platformStats.totalRevenue / 5000000) * 100))}% Achieved</span>
                      </div>
                    </div>
                  </div>
               </div>
              )}

              {activeTab === 'people' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <AdminPeople
                    artists={artists}
                    listeners={listeners}
                    agents={[...agentApplications, ...approvedAgents]}
                  />
                </motion.div>
              )}

              {activeTab === 'pipeline' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <AdminPipeline
                    artists={artists}
                    applications={applications}
                  />
                </motion.div>
              )}

              {activeTab === 'tickets' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <AdminTickets
                    artists={artists}
                    listeners={listeners}
                    agents={[...agentApplications, ...approvedAgents]}
                  />
                </motion.div>
              )}

              {activeTab === 'campaigns' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <AdminCampaigns
                    artists={artists}
                    listeners={listeners}
                    agents={[...agentApplications, ...approvedAgents]}
                    onNavigateToNotifications={() => setActiveTab('notifications')}
                  />
                </motion.div>
              )}

              {activeTab === 'finance' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <AdminFinance
                    onNavigateToPayouts={() => setActiveTab('payouts')}
                  />
                </motion.div>
              )}

              {activeTab === 'billing' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <AdminBilling
                    artists={artists}
                    onRefresh={() => fetchAllData(false)}
                  />
                </motion.div>
              )}

              {activeTab === 'operations' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <AdminOperations
                    pendingSongsCount={pendingSongs.length}
                    applicationsCount={applications.length}
                    pendingSnippetsCount={pendingSnippets.length}
                    payoutsCount={payoutRequests.filter(p => p.status === 'pending').length}
                    agentsCount={agentApplications.length}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                </motion.div>
              )}

              {activeTab === 'listeners' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0A] rounded-[16px] border border-white/10 overflow-hidden">
                  <div className="p-5 border-b border-white/10 flex items-center justify-between">
                     <div>
                        <h3 className="font-studio font-bold   text-[15px]">Listener Network</h3>
                        <p className="text-[13px] font-bold   text-[#B0B0B0] mt-1">Fanbase Management</p>
                     </div>
                     <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <p className="text-[13px] font-bold  text-[#B0B0B0] ">Global Reach: {listeners.length}</p>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 z-10">
                        <tr className="text-[13px] font-bold  tracking-[0.2em] text-[#B0B0B0] bg-white/[0.02]">
                          <th className="px-4 py-3">Full Identity</th>
                          <th className="px-4 py-3">Subscription</th>
                          <th className="px-4 py-3">Node Identity</th>
                          <th className="text-right px-4 py-3">Moderation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[13px]">
                        {listeners.filter(l => (l.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (l.email || '').toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                          <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 p-0.5 border border-white/10 group-hover:border-[#00A3FF]/30 transition-colors">
                                  <img src={optimizeImage(l.avatar_url, 80, 80)} className="w-full h-full rounded-[10px] object-cover" loading="lazy" decoding="async" />
                                </div>
                                <div>
                                  <p className="font-bold text-[13px] text-white group-hover:text-[#00A3FF] transition-colors">{l.full_name || 'Anonymous'}</p>
                                  <p className="text-[13px] text-[#B0B0B0] font-medium tracking-tight truncate max-w-[140px] lowercase">{l.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                              <span className={`px-3 py-1 rounded-lg text-[13px] font-bold   shadow-lg ${l.subscription_tier === 'Premium' ? 'bg-[#0084D6] text-black' : 'bg-white/5 text-[#B0B0B0]'}`}>
                                {l.subscription_tier || 'Free'}
                              </span>
                            </td>
                            <td className="md:px-5 text-[11px] font-bold text-white/60 px-4 py-3 md:px-5 text-[13px]">
                               {l.phone || '--'}
                            </td>
                            <td className="md:px-5 text-right px-4 py-3 md:px-5 text-[13px]">
                              <button onClick={() => deleteUser(l.id, l.full_name)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-[#FF453A] text-[#B0B0B0] hover:text-white rounded-lg transition-all">
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0A] rounded-[16px] border border-white/10 overflow-hidden">
                   <div className="p-5 border-b border-white/10 flex items-center justify-between">
                      <div>
                         <h3 className="font-studio font-bold   text-[15px]">Artist Ecosystem</h3>
                         <p className="text-[13px] font-bold   text-[#B0B0B0] mt-1">Verified Talent Management</p>
                      </div>
                      <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <p className="text-[13px] font-bold  text-[#B0B0B0] ">Active Pool: {artists.length}</p>
                      </div>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 z-10">
                         <tr className="text-[13px] font-bold  tracking-[0.2em] text-[#B0B0B0] bg-white/[0.02]">
                           <th className="px-4 py-3">Artist Signature</th>
                           <th className="px-4 py-3">Studio Wallet</th>
                           <th className="px-4 py-3">ID Details</th>
                           <th className="px-4 py-3">Queue</th>
                           <th className="text-right px-4 py-3">Gate</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 text-[13px]">
                         {artists.filter(a => !searchQuery || (a.stage_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (a.email || '').toLowerCase().includes(searchQuery.toLowerCase())).map(a => (
                           <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                             <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-white/5 p-0.5 border border-white/10 group-hover:border-[#00A3FF]/30 transition-colors">
                                    <img src={optimizeImage(a.avatar_url, 80, 80)} className="w-full h-full rounded-[10px] object-cover" loading="lazy" decoding="async" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-[13px] text-white group-hover:text-[#00A3FF] transition-colors flex items-center gap-2">
                                      {a.stage_name} 
                                      {(a.verified || a.is_verified) && <ShieldCheck size={14} className="text-[#00A3FF]" />}
                                    </p>
                                    <p className="text-[13px] text-[#B0B0B0] font-bold   opacity-60 mb-1">
                                      {a.city} • {a.genre}
                                    </p>
                                    <p className="text-[13px] text-[#00A3FF] font-medium tracking-tight truncate max-w-[140px] lowercase underline opacity-80">
                                      {a.email}
                                    </p>
                                  </div>
                                </div>
                             </td>
                             <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                <div className="space-y-1">
                                   <p className="font-studio font-bold  text-[#22C55E] text-[15px] leading-none">MK {a.wallet_balance?.toLocaleString() || 0}</p>
                                   <p className="text-[13px] font-bold   text-[#B0B0B0]">Available Liquidity</p>
                                </div>
                             </td>
                             <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                <div className="flex flex-col gap-2">
                                   <p className="text-[13px] font-bold  text-white/50">{a.id_type || 'ID'}: {a.nrc_number || 'N/A'}</p>
                                   <div className="flex gap-2">
                                     {a.id_document_url && (
                                       <a href={a.id_document_url} target="_blank" rel="noopener noreferrer" className="text-[13px] hover:underline text-[#00A3FF]">View ID</a>
                                     )}
                                     {a.selfie_url && (
                                       <a href={a.selfie_url} target="_blank" rel="noopener noreferrer" className="text-[13px] hover:underline text-[#00A3FF]">View Selfie</a>
                                     )}
                                   </div>
                                </div>
                             </td>
                             <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                {a.pending_songs > 0 ? (
                                   <div onClick={() => setActiveTab('song-reviews')} className="flex items-center gap-2 text-[#FF453A] font-bold text-[13px]   cursor-pointer hover:underline">
                                      <div className="w-2 h-2 bg-[#0084D6] rounded-full animate-pulse" />
                                      {a.pending_songs} items
                                   </div>
                                ) : (
                                   <span className="text-[#B0B0B0] text-[13px]  font-bold   opacity-40">Clear</span>
                                )}
                             </td>
                             <td className="md:px-5 text-right flex items-center justify-end gap-3 px-4 py-3 md:px-5 text-[13px]">
                                <button onClick={() => setSelectedArtist(a)} className="border border-white/10 text-white hover:border-white/30 h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">
                                   <ShieldCheck size={14} /> Profile
                                </button>
                                <button 
                                  onClick={() => toggleArtistVerification(a.id, !!(a.verified || a.is_verified))}
                                  className={`px-4 py-1.5 border rounded-lg text-[13px] font-bold   transition-all ${
                                    (a.verified || a.is_verified)
                                      ? 'bg-[#0084D6]/10 text-[#00A3FF] border-[#00A3FF]/20 hover:bg-[#0084D6] hover:text-black' 
                                      : 'bg-white/5 text-[#B0B0B0] border-white/5 hover:border-[#00A3FF] hover:text-[#00A3FF]'
                                  }`}
                                >
                                  {(a.verified || a.is_verified) ? 'Verified' : 'Verify'}
                                </button>
                                
                                <button onClick={() => deleteArtist(a.id, a.stage_name)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-[#FF453A] text-[#B0B0B0] hover:text-white rounded-lg transition-all">
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
        <h2 className="text-[22px] font-studio font-bold text-white mb-6">
          Payout Requests
        </h2>
        <div className="flex gap-3 text-[13px]">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize border bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30">
            {payoutRequests.filter(p => p.status === 'pending').length} Pending
          </span>
          <span className="px-3 py-1 bg-[#22C55E]/10 text-[#22C55E] rounded-full font-bold">
            {payoutRequests.filter(p => p.status === 'paid').length} Paid
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#B0B0B0]">
          Loading...
        </div>
      ) : payoutRequests.length === 0 ? (
        <div className="text-center py-12 text-[#B0B0B0]">
          No payout requests yet
        </div>
      ) : (
        <div className="space-y-4">
          {payoutRequests.map((payout) => (
            <div key={payout.id}
              className={`p-5 rounded-[16px] border transition-all ${
                payout.status === 'pending'
                  ? 'bg-[#F59E0B]/5 border-[#F59E0B]/20'
                  : payout.status === 'paid'
                  ? 'bg-[#22C55E]/5 border-[#22C55E]/20'
                  : 'bg-white/5 border-white/10'
              }`}>

              {/* Header row */}
              <div className="flex items-start justify-between mb-4 gap-4">
                <div>
                  <p className="font-bold text-base text-white">
                    {payout.profiles?.stage_name || payout.artist_name || 'Unknown Artist'}
                  </p>
                  <p className="text-[13px] text-[#B0B0B0] mt-0.5">
                    {payout.profiles?.artist_tier || 'Free'} tier •{' '}
                    {new Date(payout.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className="text-[24px] font-mono text-white shrink-0">
                  MK {Number(payout.amount || payout.requested_amount).toLocaleString()}
                </span>
              </div>

              {/* Payment details */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-white/5 rounded-[16px]">
                  <p className="text-[13px] text-[#B0B0B0]   mb-1">
                    Network
                  </p>
                  <p className="font-bold text-[13px] text-white">
                    {payout.network || 'Not specified'}
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-[16px]">
                  <p className="text-[13px] text-[#B0B0B0]   mb-1">
                    Phone Number
                  </p>
                  <p className="font-bold text-[13px] font-mono text-white">
                    {payout.artist_phone || payout.phone || payout.profiles?.phone || 'Not set'}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">
                {(payout.status === 'pending' || payout.status === 'processing') && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize border bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30">
                    Awaiting Payment
                  </span>
                )}
                {payout.status === 'paid' && (
                  <div>
                    <span className="text-[13px] font-bold px-3 py-1 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 rounded-full">
                      Paid
                    </span>
                    {payout.paid_at && (
                      <p className="text-[13px] text-[#B0B0B0] mt-2">
                        Paid on {new Date(payout.paid_at).toLocaleString('en-GB')}
                      </p>
                    )}
                    {payout.admin_note && (
                      <p className="text-[13px] text-[#B0B0B0] mt-1">
                        Note: {payout.admin_note}
                      </p>
                    )}
                  </div>
                )}
                {(payout.status === 'rejected' || payout.status === 'failed') && (
                  <div>
                    <span className="text-[13px] font-bold px-3 py-1 bg-[#FF453A]/10 text-[#FF453A] border border-red-500/20 rounded-full">
                      Rejected
                    </span>
                    {payout.admin_note && (
                      <p className="text-[13px] text-[#FF453A] mt-2">
                        Reason: {payout.admin_note}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Admin actions — only for pending */}
              {(payout.status === 'pending' || payout.status === 'processing') && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="bg-[#0084D6]/10 border border-[#00A3FF]/20 rounded-[16px] p-3">
                    <p className="text-[13px] font-bold text-[#FF453A] mb-1">
                      Action Required
                    </p>
                    <p className="text-[13px] text-[#22C55E]/80">
                      Send <span className="text-white font-bold">MK {Math.round(Number(payout.amount || payout.requested_amount) * 0.97).toLocaleString()}</span> (Net of 3% Fee) to{' '}
                      <span className="font-mono font-bold text-white">
                        {payout.artist_phone || payout.phone || payout.profiles?.phone}
                      </span>{' '}
                      via {payout.network}, then mark as paid.
                      <br/>
                      <span className="text-[13px] opacity-70">Gross Requested: MK {Number(payout.amount || payout.requested_amount).toLocaleString()} | Fee: MK {Math.round(Number(payout.amount || payout.requested_amount) * 0.03).toLocaleString()}</span>
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
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-[13px] text-white placeholder-[#737373] outline-none focus:border-[#00A3FF]/50"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => markAsPaid(
                        payout.id,
                        processingId === payout.id ? adminNote : ''
                      )}
                      disabled={processingId === payout.id ? (!adminNote && false) : false}
                      className="flex-1 h-11 bg-[#22C55E] text-white rounded-[16px] font-bold text-[13px] hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      Mark as Paid
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(payout.id);
                        setRejectReason('');
                      }}
                      className="flex-1 h-11 bg-[#FF453A]/20 text-[#FF453A] border border-red-500/20 rounded-[16px] font-bold text-[13px] hover:bg-[#FF453A]/30 transition-all"
                    >
                      Reject
                    </button>
                  </div>

                  {rejectingId === payout.id && (
                    <div className="mt-3 p-4 bg-[#FF453A]/5 border border-red-500/20 rounded-[16px] space-y-3">
                      <p className="text-[13px] font-bold text-[#FF453A]  ">
                        Rejection Reason
                      </p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain why this payout is being rejected..."
                        rows={3}
                        className="w-full bg-white/5 border border-red-500/20 rounded-xl p-3 text-[13px] text-white placeholder-[#737373] outline-none focus:border-red-500/50 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { rejectPayout(payout.id, rejectReason); setRejectingId(null); }}
                          disabled={!rejectReason.trim()}
                          className="flex-1 h-10 bg-[#FF453A] text-white rounded-xl font-bold text-[13px] disabled:opacity-40"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => setRejectingId(null)}
                          className="px-4 h-10 bg-white/5 text-[#B0B0B0] rounded-xl font-bold text-[13px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )}

              {activeTab === 'songs' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0A] rounded-[16px] border border-white/10 overflow-hidden">
                  <div className="p-5 border-b border-white/10 flex items-center justify-between">
                     <div>
                        <h3 className="font-studio font-bold   text-[15px]">Asset Master List</h3>
                        <p className="text-[13px] font-bold   text-[#B0B0B0] mt-1">Full Song Database Governance</p>
                     </div>
                     <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <p className="text-[13px] font-bold  text-[#B0B0B0] ">Global Assets: {allSongs.length}</p>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 z-10">
                        <tr>
                          <th className="px-4 py-3">Production</th>
                          <th className="px-4 py-3">Artist Signature</th>
                          <th className="px-4 py-3">Network Status</th>
                          <th className="text-right px-4 py-3">Moderation Logic</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allSongs.filter(s => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.profiles?.stage_name || '').toLowerCase().includes(searchQuery.toLowerCase())).map((song) => (
                          <tr key={song.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#00A3FF] group-hover:scale-105 transition-transform">
                                     <Music2 size={18} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-[13px] text-white leading-none mb-1 group-hover:text-[#00A3FF] transition-colors truncate max-w-[200px]">{song.title}</p>
                                    <p className="text-[13px] font-bold   text-[#B0B0B0] opacity-60">{song.genre}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                               <p className="font-bold text-white/80">{song.profiles?.stage_name || 'Unknown Entity'}</p>
                            </td>
                            <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                <div className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full ${song.approved ? 'bg-[#22C55E]' : 'bg-[#0084D6]'} animate-pulse`} />
                                  <span className={`text-[13px] font-bold   ${song.approved ? 'text-[#22C55E]' : 'text-[#FF453A]'}`}>
                                     {song.approved ? 'Broadcasting' : 'Hold / Review'}
                                  </span>
                                </div>
                            </td>
                            <td className="md:px-5 text-right px-4 py-3 md:px-5 text-[13px]">
                               <div className="flex items-center justify-end gap-3">
                                  {!song.approved && (
                                    <button onClick={() => approveSong(song.id)} className="bg-[#0084D6] hover:bg-[#00A3FF] text-white h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">Release</button>
                                  )}
                                  <button onClick={() => rejectSong(song.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-[#FF453A] text-[#B0B0B0] hover:text-white rounded-lg transition-all">
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

              {activeTab === 'agents' && (
                <div className="space-y-6">
                  {/* Agents Pipeline */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0A] rounded-[16px] border border-white/10 overflow-hidden">
                    <div className="p-5 border-b border-white/10">
                       <h3 className="font-studio font-bold   text-[15px]">Agent Applications</h3>
                       <p className="text-[13px] font-bold   text-[#B0B0B0] mt-1">Pending approvals</p>
                    </div>
                    {agentApplications.length === 0 ? (
                      <div className="p-8 text-center border-t border-white/5">
                        <p className="text-[#B0B0B0] text-[13px] font-bold  ">No pending agent applications</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 z-10">
                            <tr className="border-b border-white/5">
                              <th className="text-[13px] font-bold tracking-[0.25em] text-[#B0B0B0]/60 w-1/4 px-4 py-3">User</th>
                              <th className="text-[13px] font-bold tracking-[0.25em] text-[#B0B0B0]/60 w-1/4 px-4 py-3">Phone</th>
                              <th className="text-[13px] font-bold tracking-[0.25em] text-[#B0B0B0]/60 w-1/4 px-4 py-3">Date</th>
                              <th className="text-[13px] font-bold tracking-[0.25em] text-[#B0B0B0]/60 text-right w-1/4 px-4 py-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {agentApplications.map((app) => (
                              <tr key={app.user_id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="md:px-5 text-[13px] font-bold text-white px-4 py-3 md:px-5 text-[13px]">{app.user_profiles?.full_name || 'Unknown'}</td>
                                <td className="md:px-5 text-[13px] text-[#B0B0B0] font-mono px-4 py-3 md:px-5 text-[13px]">{app.phone}</td>
                                <td className="md:px-5 text-[13px] text-[#B0B0B0] font-mono px-4 py-3 md:px-5 text-[13px]">{new Date(app.created_at).toLocaleDateString()}</td>
                                <td className="md:px-5 text-right px-4 py-3 md:px-5 text-[13px]">
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => adminApproveAgent(app.user_id)}
                                      className="px-4 py-2 bg-[#00A3FF] hover:bg-[#0084D6] text-white rounded-lg text-[13px] font-bold   transition-all"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => adminRejectAgent(app.user_id)}
                                      className="px-4 py-2 bg-[#FF453A]/10 hover:bg-[#FF453A]/20 text-[#FF453A] rounded-lg text-[13px] font-bold   transition-all"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>

                  {/* Approved Agents Roster */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0A] rounded-[16px] border border-white/10 overflow-hidden">
                    <div className="p-5 border-b border-white/10 flex justify-between items-center">
                       <div>
                         <h3 className="font-studio font-bold   text-[15px]">Approved Agents</h3>
                         <p className="text-[13px] font-bold   text-[#B0B0B0] mt-1">Active roster & payouts</p>
                       </div>
                    </div>
                    {approvedAgents.length === 0 ? (
                      <div className="p-8 text-center border-t border-white/5">
                        <p className="text-[#B0B0B0] text-[13px] font-bold  ">No approved agents</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 z-10">
                            <tr className="border-b border-white/5">
                              <th className="text-[13px] font-bold tracking-[0.25em] text-[#B0B0B0]/60 px-4 py-3">Agent</th>
                              <th className="text-[13px] font-bold tracking-[0.25em] text-[#B0B0B0]/60 px-4 py-3">Phone</th>
                              <th className="text-[13px] font-bold tracking-[0.25em] text-[#B0B0B0]/60 px-4 py-3">Referred</th>
                              <th className="text-[13px] font-bold tracking-[0.25em] text-[#B0B0B0]/60 px-4 py-3">Total Earned</th>
                              <th className="text-[13px] font-bold tracking-[0.25em] text-[#B0B0B0]/60 text-right px-4 py-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {approvedAgents.map((agent) => (
                              <tr key={agent.user_id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                  <p className="text-[13px] font-bold text-white">{agent.user_profiles?.full_name || 'Unknown'}</p>
                                  <p className="text-[13px] text-[#00A3FF] font-mono">{agent.agent_code}</p>
                                </td>
                                <td className="md:px-5 text-[13px] text-[#B0B0B0] font-mono px-4 py-3 md:px-5 text-[13px]">{agent.phone}</td>
                                <td className="md:px-5 text-[13px] text-white font-bold px-4 py-3 md:px-5 text-[13px]">{agent.referred_count}</td>
                                <td className="md:px-5 text-[13px] text-white font-mono font-bold px-4 py-3 md:px-5 text-[13px]">MK {(agent.total_earned || 0).toLocaleString()}</td>
                                <td className="md:px-5 text-right px-4 py-3 md:px-5 text-[13px]">
                                  {agent.has_processing ? (
                                    <button
                                      onClick={() => adminCompleteAgentPayout(agent.id)}
                                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-[13px] font-bold   transition-all"
                                    >
                                      Mark Payout Paid
                                    </button>
                                  ) : (
                                    <span className="text-[13px] font-bold   text-[#B0B0B0]">Clear</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}

              {activeTab === 'applications' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0A] rounded-[16px] border border-white/10 overflow-hidden">
                  <div className="p-5 border-b border-white/10 flex justify-between items-center">
                     <div>
                        <h3 className="font-studio font-bold   text-[15px]">Onboarding Pipeline</h3>
                        <p className="text-[13px] font-bold   text-[#B0B0B0] mt-1">Artist Intake Controls</p>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                    {applications.filter(app => (app.stage_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (app.email || '').toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                      <table className="w-full text-left text-[13px]">
                        <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 z-10">
                          <tr>
                            <th className="px-4 py-3">Applicant Intelligence</th>
                            <th className="px-4 py-3">Verification Assets</th>
                            <th className="text-right px-4 py-3">Decision Engine</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {applications.filter(app => (app.stage_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (app.email || '').toLowerCase().includes(searchQuery.toLowerCase())).map((app) => (
                            <tr key={app.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                <div>
                                  <p className="font-bold text-[15px] text-white leading-none group-hover:text-[#00A3FF] transition-colors mb-2">{app.stage_name}</p>
                                  <p className="text-[13px] text-[#B0B0B0]  font-bold  opacity-60 mb-1">{app.genre} • {app.city} • {app.phone}</p>
                                  <p className="text-[13px] text-[#00A3FF] font-bold tracking-tight lowercase underline opacity-60">{app.email}</p>
                                </div>
                              </td>
                              <td className="md:px-5 text-left px-4 py-3 md:px-5 text-[13px]">
                                <div className="flex items-center gap-2">
                                 {app.id_document_url ? (
                                   <span className="text-[13px] bg-[#00d68f]/15 text-[#00d68f] px-2 py-1 flex items-center gap-1 rounded-md  font-bold"><ShieldCheck size={12} /> ID Verified</span>
                                 ) : (
                                   <span className="text-[13px] font-bold  text-[#FF453A] ">Document Missing</span>
                                 )}
                                </div>
                              </td>
                              <td className="md:px-5 text-right px-4 py-3 md:px-5 text-[13px]">
                                <div className="flex items-center justify-end gap-3">
                                   <button onClick={() => setSelectedApp(app)} className="border border-white/10 text-white hover:border-white/30 h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">
                                      <ShieldCheck size={14} /> Review Details
                                   </button>
                                   <button onClick={() => approveArtist(app)} className="h-9 w-9 bg-white text-black rounded-xl flex items-center justify-center hover:bg-[#22C55E] hover:text-white transition-all shadow-lg active:scale-95 group/app tooltip" title="Approve">
                                      <CircleCheck size={16} />
                                   </button>
                                   <button onClick={() => rejectArtist(app)} className="border border-[#FF453A]/30 text-[#FF453A] hover:bg-[#FF453A]/10 h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2" title="Reject">
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
                         <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-[#B0B0B0] opacity-20">
                           <Users size={32} />
                         </div>
                         <p className="text-[#B0B0B0] font-bold  tracking-[0.2em] text-[13px] ">Intake Queue Clear.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'song-reviews' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0A] rounded-[16px] border border-white/10 overflow-hidden">
                  <div className="p-5 border-b border-white/10">
                     <h3 className="font-studio font-bold   text-[15px]">Content Compliance</h3>
                     <p className="text-[13px] font-bold   text-[#B0B0B0] mt-1">Song Review & Approval Node</p>
                  </div>
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-[13px] text-[#B0B0B0] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSongs.length === pendingSongs.length && pendingSongs.length > 0}
                        onChange={(e) => setSelectedSongs(e.target.checked ? pendingSongs.map(s => s.id) : [])}
                        className="w-4 h-4 rounded"
                      />
                      Select All ({pendingSongs.length})
                    </label>
                    {selectedSongs.length > 0 && (
                      <button
                        onClick={bulkApproveSongs}
                        className="px-4 py-2 bg-[#22C55E] text-white rounded-xl font-bold text-[13px]  "
                      >
                        Approve {selectedSongs.length} Selected
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    {pendingSongs.filter(s => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.profiles?.stage_name || '').toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                      <table className="w-full text-left text-[13px]">
                        <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 z-10">
                          <tr>
                            <th className="px-4 py-3">Production Payload</th>
                            <th className="px-4 py-3">Artist Signature</th>
                            <th className="text-center px-4 py-3">Audio Preview</th>
                            <th className="text-right px-4 py-3">Moderation Logic</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {pendingSongs.filter(s => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.profiles?.stage_name || '').toLowerCase().includes(searchQuery.toLowerCase())).map((song) => (
                            <tr key={song.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                <div className="flex items-center gap-4">
                                   <input
                                      type="checkbox"
                                      checked={selectedSongs.includes(song.id)}
                                      onChange={(e) => setSelectedSongs(prev =>
                                        e.target.checked ? [...prev, song.id] : prev.filter(id => id !== song.id)
                                      )}
                                      className="w-4 h-4 text-[#00A3FF] bg-white/5 border-white/10 rounded cursor-pointer"
                                    />
                                   <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#00A3FF] group-hover:scale-105 transition-transform">
                                      <Music2 size={18} />
                                   </div>
                                   <div>
                                      <p className="font-bold text-[13px] text-white leading-none mb-1 group-hover:text-[#00A3FF] transition-colors">{song.title}</p>
                                      <p className="text-[13px] font-bold   text-[#B0B0B0] opacity-60">{song.genre}</p>
                                   </div>
                                </div>
                              </td>
                              <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                <p className="font-bold text-white/80">{song.profiles?.stage_name || 'Unknown'}</p>
                                <p className="text-[13px] text-[#B0B0B0] font-bold tracking-tight lowercase underline opacity-60">{song.profiles?.email}</p>
                              </td>
                              <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
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
                              <td className="md:px-5 text-right px-4 py-3 md:px-5 text-[13px]">
                                <div className="flex items-center justify-end gap-3">
                                   <button onClick={() => approveSong(song.id)} className="bg-[#0084D6] hover:bg-[#00A3FF] text-white h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">Authorize</button>
                                   <button onClick={() => rejectSong(song.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-[#FF453A] text-[#B0B0B0] hover:text-white rounded-lg transition-all active:scale-95"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-20 text-center">
                         <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-[#B0B0B0] opacity-20">
                           <ShieldCheck size={24} />
                         </div>
                         <p className="text-[#B0B0B0] font-bold  tracking-[0.2em] text-[13px] ">Compliance Clear.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'snippet-reviews' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0A] rounded-[16px] border border-white/10 overflow-hidden">
                  <div className="p-5 border-b border-white/10">
                     <h3 className="font-studio font-bold   text-[15px]">Moto Feed Hub</h3>
                     <p className="text-[13px] font-bold   text-[#B0B0B0] mt-1">Video & Audio Snippet Governance</p>
                  </div>
                  <div className="overflow-x-auto">
                    {pendingSnippets.length > 0 ? (
                      <table className="w-full text-left text-[13px]">
                        <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 z-10">
                          <tr>
                            <th className="px-4 py-3">Content Payload</th>
                            <th className="px-4 py-3">Artist Signature</th>
                            <th className="text-center px-4 py-3">Visual/Audio Logic</th>
                            <th className="text-right px-4 py-3">Moderation Logic</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {pendingSnippets.map((snippet) => (
                            <tr key={snippet.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                <div className="flex items-center gap-4">
                                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                                    <img src={optimizeImage(snippet.cover_url, 100, 100)} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                    {snippet.is_video && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Radio size={12} className="text-white animate-pulse" /></div>}
                                  </div>
                                  <div>
                                    <p className="font-bold text-[13px] text-white leading-none mb-1 group-hover:text-[#00A3FF] transition-colors truncate max-w-[140px]">{snippet.title}</p>
                                    <p className="text-[13px] font-bold   text-[#B0B0B0] opacity-60 line-clamp-1 truncate max-w-[140px]">{snippet.caption}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                <p className="font-bold text-white/80">{snippet.profiles?.stage_name || 'Unknown'}</p>
                              </td>
                              <td className="md:px-5 text-center px-4 py-3 md:px-5 text-[13px]">
                                <a href={snippet.media_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[13px] font-bold   hover:border-[#00A3FF] hover:text-[#00A3FF] transition-all ">
                                   Explore Meta {snippet.is_video ? '(VIDEO)' : '(AUDIO)'} <Radio size={12} />
                                </a>
                              </td>
                              <td className="md:px-5 text-right px-4 py-3 md:px-5 text-[13px]">
                                <div className="flex items-center justify-end gap-3">
                                   <button onClick={() => approveSnippet(snippet.id)} className="bg-[#0084D6] hover:bg-[#00A3FF] text-white h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">Authorize</button>
                                   <button onClick={() => rejectSnippet(snippet.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-[#FF453A] text-[#B0B0B0] hover:text-white rounded-lg transition-all active:scale-95"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-20 text-center">
                         <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-[#B0B0B0] opacity-20">
                           <Radio size={24} />
                         </div>
                         <p className="text-[#B0B0B0] font-bold  tracking-[0.2em] text-[13px] ">Feed Queue Clear.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'ads' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                   <div className="relative group overflow-hidden p-10 bg-[#1A1A1A] border border-white/5 rounded-[16px] flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-2xl">
                      <div className="relative z-10 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="w-2 h-2 bg-[#0084D6] rounded-full animate-ping" />
                           <p className="text-[13px] font-bold   text-[#FF453A]">Ad Serving Node</p>
                        </div>
                        <h4 className="text-4xl font-studio font-bold  text-white  tracking-tighter leading-none">Campaign Console</h4>
                        <p className="text-[13px] text-[#B0B0B0] font-bold max-w-sm">Inject audio-based commercial payloads directly into the global stream.</p>
                      </div>
                      <button 
                        onClick={() => setShowAdForm(true)}
                        className="relative z-10 px-8 py-5 bg-white text-black rounded-xl text-[11px] font-bold   hover:bg-[#0084D6] hover:text-white transition-all shadow-2xl flex items-center gap-3 group/btn"
                      >
                         <Plus size={18} className="group-hover/btn:rotate-90 transition-transform" /> Start New Campaign
                      </button>
                      <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 transition-transform">
                         <Radio size={240} className="text-white" />
                      </div>
                   </div>

                   <motion.div className="bg-[#0A0A0A] rounded-[16px] border border-white/10 overflow-hidden">
                     <div className="p-5 border-b border-white/10">
                        <h4 className="font-studio font-bold  text-[15px]  leading-none">Active Commercial Roster</h4>
                     </div>
                     <div className="overflow-x-auto">
                       <table className="w-full text-left text-[13px]">
                         <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 z-10">
                           <tr>
                             <th className="px-4 py-3">Campaign Source</th>
                             <th className="px-4 py-3">Reach / Capacity</th>
                             <th className="px-4 py-3">Network Status</th>
                             <th className="text-right px-4 py-3">Moderation Logic</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                           {ads.filter(ad => (ad.advertiser_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (ad.title || '').toLowerCase().includes(searchQuery.toLowerCase())).map(ad => (
                             <tr key={ad.id} className="hover:bg-white/[0.02] transition-colors group">
                               <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#FF453A]">
                                       <Radio size={18} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-[13px] text-white leading-none mb-1 group-hover:text-[#FF453A] transition-colors truncate max-w-[160px]">{ad.advertiser_name}</p>
                                      <p className="text-[13px] font-bold   text-[#B0B0B0] opacity-60 leading-none truncate max-w-[160px]">{ad.title}</p>
                                    </div>
                                 </div>
                               </td>
                               <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                  <div className="space-y-1.5">
                                     <div className="flex items-center justify-between text-[13px] font-bold  text-[#B0B0B0] mb-1">
                                       <span>{ad.plays_used.toLocaleString()} Delivered</span>
                                       <span>{Math.round((ad.plays_used / (ad.plays_purchased || 1)) * 100)}%</span>
                                     </div>
                                     <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#0084D6] group-hover:bg-white transition-colors" style={{ width: `${(ad.plays_used / (ad.plays_purchased || 1)) * 100}%` }} />
                                     </div>
                                  </div>
                               </td>
                               <td className="md:px-5 px-4 py-3 md:px-5 text-[13px]">
                                  <div className={`px-4 py-1.5 rounded-lg text-[13px] font-bold   inline-flex items-center gap-2 ${ad.active ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/10' : 'bg-[#FF453A]/10 text-[#FF453A] border border-red-500/20'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${ad.active ? 'bg-[#22C55E] animate-pulse' : 'bg-[#FF453A]'}`} />
                                    {ad.active ? 'Broadcasting' : 'Halted'}
                                  </div>
                               </td>
                               <td className="md:px-5 text-right px-4 py-3 md:px-5 text-[13px]">
                                  <div className="flex items-center justify-end gap-3">
                                     <button onClick={() => toggleAdStatus(ad)} className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${ad.active ? 'bg-white/5 text-[#FF453A] hover:bg-[#0084D6] hover:text-black' : 'bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E] hover:text-white'}`}>
                                       {ad.active ? <Pause size={14} /> : <Play size={14} />}
                                     </button>
                                     <button onClick={() => deleteAd(ad.id)} className="w-9 h-9 flex items-center justify-center bg-white/5 text-[#B0B0B0] hover:bg-[#FF453A] hover:text-white rounded-lg transition-all">
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
                          className="w-full max-w-xl bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 space-y-6 relative max-h-[90vh] overflow-y-auto"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-xl  ">Upload New Ad</h3>
                            <button onClick={() => setShowAdForm(false)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                              <X size={18} />
                            </button>
                          </div>

                          <form onSubmit={handleAdUpload} className="space-y-4">
                            <input
                              name="advertiser_name"
                              placeholder="Advertiser Name"
                              value={adFormDraft.advertiser_name}
                              onChange={(e) => handleAdFieldChange('advertiser_name', e.target.value)}
                              required
                              className="w-full px-4 bg-white/5 border border-white/10 rounded-[12px] h-10 text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"
                            />
                            <input
                              name="title"
                              placeholder="Ad Title / Description"
                              value={adFormDraft.title}
                              onChange={(e) => handleAdFieldChange('title', e.target.value)}
                              required
                              className="w-full px-4 bg-white/5 border border-white/10 rounded-[12px] h-10 text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"
                            />

                            <select
                              name="type"
                              value={adFormDraft.type}
                              onChange={(e) => handleAdFieldChange('type', e.target.value)}
                              className="w-full px-4 bg-white/5 border border-white/10 rounded-[12px] h-10 text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"
                            >
                              <option value="platform">Platform Ad (Smashify promotes)</option>
                              <option value="artist">Artist Promotional Ad</option>
                              <option value="external">External Advertiser</option>
                            </select>

                            <div className="space-y-2">
                              <label className="text-[13px] font-bold text-[#B0B0B0]">Audio File (MP3, max 30s)</label>
                              <input
                                name="audio"
                                type="file"
                                accept="audio/mpeg, audio/mp3, .mp3"
                                required
                                className="w-full px-4 bg-white/5 border border-white/10 rounded-[12px] h-10 text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[13px] font-bold text-[#B0B0B0]">Plays Purchased</label>
                                <input
                                  name="plays_purchased"
                                  type="number"
                                  min={100}
                                  value={adFormDraft.plays_purchased}
                                  onChange={(e) => handleAdFieldChange('plays_purchased', parseInt(e.target.value) || '')}
                                  required
                                  className="w-full px-4 bg-white/5 border border-white/10 rounded-[12px] h-10 text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[13px] font-bold text-[#B0B0B0]">Revenue Charged (MK)</label>
                                <input
                                  name="revenue"
                                  type="number"
                                  min={0}
                                  value={adFormDraft.revenue}
                                  onChange={(e) => handleAdFieldChange('revenue', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                                  className="w-full px-4 bg-white/5 border border-white/10 rounded-[12px] h-10 text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"
                                />
                              </div>
                            </div>

                            <button type="submit" disabled={adUploading}
                              className="w-full h-10 bg-[#0084D6] hover:bg-[#00A3FF] text-white rounded-[10px] font-semibold text-[13px] transition-colors disabled:opacity-50"
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
                   <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 relative overflow-hidden">
                     <h2 className="text-[22px] font-studio font-bold text-white mb-6">System Maintenance</h2>
                     
                     <div className="flex items-center justify-between py-4 border-b border-white/5 mb-6">
                        <div>
                          <p className="text-[14px] font-semibold text-white">Maintenance Mode</p>
                          <p className="text-[12px] text-[#B0B0B0] mt-1">Enable to show the maintenance screen to all users.</p>
                        </div>
                        <button
                          onClick={() => toggleMaintenance(!maintenance.active)}
                          disabled={maintenanceLoading}
                          className={`w-11 h-6 rounded-full flex items-center transition-colors px-1 ${maintenance.active ? 'bg-[#00A3FF]' : 'bg-white/10'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${maintenance.active ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                     </div>

                     <form onSubmit={saveMaintenanceConfig} className="space-y-4 max-w-xl">
                        <div className="space-y-2">
                          <label className="text-[13px] text-[#B0B0B0]">Maintenance Message</label>
                          <textarea
                             value={maintenance.message}
                             onChange={e => setMaintenance({...maintenance, message: e.target.value})}
                             className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-[12px] min-h-[100px] text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"
                            placeholder="We are upgrading..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] text-[#B0B0B0]">Estimated Time</label>
                          <input 
                            type="text"
                            value={maintenance.estimatedTime}
                            onChange={e => setMaintenance({...maintenance, estimatedTime: e.target.value})}
                            className="w-full px-4 bg-white/5 border border-white/10 rounded-[12px] h-10 text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"
                            placeholder="e.g. 30 minutes, 1 hour"
                          />
                        </div>
                        <button
                           type="submit"
                           disabled={maintenanceLoading}
                          className="bg-[#0084D6] hover:bg-[#00A3FF] text-white h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          {maintenanceLoading ? 'Saving...' : 'Save Configuration'}
                        </button>
                     </form>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-5 bg-white/5 border border-white/10 rounded-[16px]">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="font-bold text-white text-[13px]">Manual Vault Job</p>
                           <p className="text-[13px] text-[#B0B0B0] mt-1">
                             Vault tracks for expired subscriptions. Runs automatically at 2am daily.
                           </p>
                         </div>
                         <button
                           onClick={async () => {
                             toast.loading('Running vault job...');
                             const { error } = await supabase.rpc('vault_expired_artist_tracks');
                             toast.dismiss();
                             if (error) toast.error('Vault job failed: ' + error.message);
                             else toast.success('Vault job completed successfully.');
                           }}
                           className="px-4 py-2 bg-[#0084D6]/20 text-[#FF453A] border border-[#00A3FF]/20 rounded-xl font-bold text-[13px]   hover:bg-[#0084D6]/30 transition-all whitespace-nowrap"
                         >
                           Run Now
                         </button>
                       </div>
                     </div>

                     <div className="p-5 bg-white/5 border border-white/10 rounded-[16px]">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="font-bold text-white text-[13px]">Slot Reclassification</p>
                           <p className="text-[13px] text-[#B0B0B0] mt-1">
                             Reclassifies songs based on monthly plays. Runs automatically at 3am daily.
                           </p>
                         </div>
                         <button
                           onClick={async () => {
                             toast.loading('Running slot reclassification...');
                             const { error } = await supabase.rpc('reclassify_song_slots');
                             toast.dismiss();
                             if (error) toast.error('Reclassification failed: ' + error.message);
                             else toast.success('Slot reclassification completed successfully.');
                           }}
                           className="px-4 py-2 bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/20 rounded-xl font-bold text-[13px]   hover:bg-[#22C55E]/30 transition-all whitespace-nowrap"
                         >
                           Run Now
                         </button>
                       </div>
                     </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                   <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 relative overflow-hidden">
                     <h2 className="text-[22px] font-studio font-bold text-white mb-6">Send Out Notifications</h2>
                     
                     <form onSubmit={handleSendNotification} className="space-y-6 max-w-2xl">
                        <div className="space-y-2">
                           <label className="text-[13px] font-bold   text-[#B0B0B0]">Target Audience</label>
                           <div className="flex flex-wrap gap-2">
                             {['all', 'artists', 'listeners', 'specific'].map((t) => (
                               <button
                                 key={t}
                                 type="button"
                                 onClick={() => setNotificationTarget(t as any)}
                                 className={`px-4 py-2 rounded-lg text-[13px] font-bold  tracking-[0.12em] transition-colors ${
                                   notificationTarget === t 
                                   ? 'bg-[#0084D6] text-white' 
                                   : 'bg-white/5 text-[#B0B0B0] hover:bg-white/10 hover:text-white'
                                 }`}
                               >
                                 {t}
                               </button>
                             ))}
                           </div>
                        </div>

                        {notificationTarget === 'specific' && (
                          <div className="space-y-2 relative">
                            <label className="text-[13px] font-bold   text-[#B0B0B0]">Search User (Specific User)</label>
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
                              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[13px] font-medium focus:outline-none focus:border-[#00A3FF] transition-all"
                            />
                            {notificationUserId && (
                              <p className="text-[13px] text-green-400 mt-1">Selected UUID: {notificationUserId}</p>
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
                                          <p className="text-[13px] font-bold text-white">{u.name}</p>
                                          <p className="text-[13px] text-[#B0B0B0] font-mono">{u.id}</p>
                                        </div>
                                        <span className={`text-[13px]  font-bold px-2 py-1 rounded-md ${u.type === 'Artist' ? 'bg-[#0084D6]/20 text-[#FF453A]' : 'bg-[#0084D6]/20 text-[#00A3FF]'}`}>
                                          {u.type}
                                        </span>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-4 py-3 text-[13px] text-[#B0B0B0]">No users found</div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[13px] font-bold   text-[#B0B0B0]">Notification Message</label>
                          <textarea 
                            value={notificationMessage}
                            onChange={e => setNotificationMessage(e.target.value)}
                            placeholder="Type the message to send out..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[13px] font-medium focus:outline-none focus:border-[#00A3FF] transition-all min-h-[120px]"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[13px] font-bold   text-[#B0B0B0]">Optional Link (Where should it go when clicked?)</label>
                          <input 
                            type="text"
                            value={notificationLink}
                            onChange={e => setNotificationLink(e.target.value)}
                            placeholder="e.g. /discover or /artist-hub"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[13px] font-medium focus:outline-none focus:border-[#00A3FF] transition-all"
                          />
                        </div>

                        <button 
                          type="submit"
                          disabled={notificationSending}
                          className="px-8 py-4 bg-[#0084D6] hover:bg-[#0084D6]/90 text-white rounded-xl font-bold   text-[13px] transition-all flex items-center gap-2"
                        >
                          <Send size={18} />
                          {notificationSending ? 'Sending...' : 'Dispatch Notification'}
                        </button>
                     </form>
                   </div>
                </motion.div>
              )}

              {activeTab === 'expiry-monitor' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-[22px] font-studio font-bold text-white mb-6">
                        Subscription Expiry Monitor
                      </h2>
                      <p className="text-[13px] text-[#B0B0B0] mt-1">
                        Artists expiring within 30 days — {expiringArtists.length} found
                      </p>
                    </div>
                  </div>

                  {expiringArtists.length === 0 ? (
                    <div className="text-center py-16 text-[#B0B0B0]">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-[#00A3FF]"><CheckCircle2 size={24} /></div>
                      <p className="font-bold">No artists expiring in the next 30 days</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expiringArtists.map(artist => {
                        const daysLeft = Math.ceil(
                          (new Date(artist.subscription_ends).getTime() - Date.now()) / 86400000
                        );
                        const isExpired = daysLeft <= 0;
                        const isUrgent = daysLeft <= 7 && daysLeft > 0;

                        return (
                          <div key={artist.id} className={`p-4 rounded-[16px] border ${
                            isExpired ? 'bg-[#FF453A]/5 border-red-500/20' :
                            isUrgent  ? 'bg-[#F59E0B]/5 border-[#F59E0B]/20' :
                                        'bg-white/5 border-white/10'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-white">{artist.stage_name}</p>
                                <p className="text-[13px] text-[#B0B0B0] mt-0.5">
                                  {artist.artist_tier} · Wallet: MK {Number(artist.wallet_balance || 0).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`text-[13px] font-bold px-3 py-1 rounded-full ${
                                  isExpired ? 'bg-[#FF453A]/20 text-[#FF453A]' :
                                  isUrgent  ? 'bg-[#F59E0B]/20 text-yellow-400' :
                                              'bg-white/10 text-white'
                                }`}>
                                  {isExpired ? 'EXPIRED' : `${daysLeft} days left`}
                                </span>
                                <p className="text-[13px] text-[#B0B0B0] mt-1">
                                  {new Date(artist.subscription_ends).toLocaleDateString('en-GB')}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

                </div>
              </AnimatePresence>
            )}

            {/* Modals */}
            <AnimatePresence>
              {selectedApp && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-2xl bg-[#1A1A1A] border border-white/10 rounded-[16px] max-h-[85vh] overflow-y-auto flex flex-col">
                    <div className="p-5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1A1A1A] z-10 rounded-t-[16px]">
                      <h3 className="font-bold text-[15px] text-white">Application Details</h3>
                      <button onClick={() => setSelectedApp(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1A1A1A] border border-white/10 text-[#B0B0B0] hover:text-[#ff4757] hover:border-[#ff4757] transition-all">
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
                          <div className="text-[13px] text-[#B0B0B0] mt-1">Real name: {selectedApp.full_name || selectedApp.name}</div>
                          <div className="mt-2 flex gap-2">
                             <span className="bg-[#ffaa00]/15 text-[#ffaa00] px-2 py-1 rounded-md text-[11px] font-bold ">{selectedApp.status || 'Pending'}</span>
                             <span className="bg-[#ff6b35]/15 text-[#ff6b35] px-2 py-1 rounded-md text-[11px] font-bold   font-mono">APP-{selectedApp.id?.split('-')[0]}</span>
                          </div>
                        </div>
                      </div>

                      <h4 className="font-bold text-[13px] text-[#ff6b35] mb-2 mt-6">Personal Identity</h4>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">Email</span><span className="font-semibold text-white">{selectedApp.email}</span></div>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">Phone</span><span className="font-semibold text-white">{selectedApp.phone || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">City</span><span className="font-semibold text-white">{selectedApp.city || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">ID Type</span><span className="font-semibold text-white">{selectedApp.id_type || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">ID Number</span><span className="font-medium text-white font-mono">{selectedApp.national_id_number || selectedApp.nrc_number || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">Agent Reference</span><span className={`font-semibold font-mono ${selectedApp.agent_reference || selectedApp.referral_code ? 'text-[#00d68f]' : 'text-white'}`}>{selectedApp.agent_reference || selectedApp.referral_code || 'N/A'}</span></div>

                      <h4 className="font-bold text-[13px] text-[#ff6b35] mb-2 mt-8">Verification Documents</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                         <div>
                            <p className="text-[11px] text-[#B0B0B0] mb-1">ID Document</p>
                            {selectedApp.id_document_url ? (
                              <img src={selectedApp.id_document_url} alt="ID Document" className="w-full rounded-lg border border-white/10 hover:scale-105 transition-transform cursor-pointer" onClick={() => window.open(selectedApp.id_document_url, '_blank')} />
                            ) : (
                              <div className="p-4 bg-white/5 rounded-lg text-[11px] text-[#B0B0B0]">Not provided</div>
                            )}
                         </div>
                         <div>
                            <p className="text-[11px] text-[#B0B0B0] mb-1">Selfie Image</p>
                            {selectedApp.selfie_url ? (
                              <img src={selectedApp.selfie_url} alt="Selfie" className="w-full rounded-lg border border-white/10 hover:scale-105 transition-transform cursor-pointer" onClick={() => window.open(selectedApp.selfie_url, '_blank')} />
                            ) : (
                              <div className="p-4 bg-white/5 rounded-lg text-[11px] text-[#B0B0B0]">Not provided</div>
                            )}
                         </div>
                      </div>
                      
                      <h4 className="font-bold text-[13px] text-[#ff6b35] mb-2 mt-8">Artist Roster Data</h4>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">Stage Name</span><span className="font-semibold text-white">{selectedApp.stage_name}</span></div>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">Genre</span><span className="font-semibold text-white">{selectedApp.genre}</span></div>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">Agent Reference</span><span className={`font-semibold font-mono ${selectedApp.agent_reference || selectedApp.referral_code ? 'text-[#00d68f]' : 'text-white'}`}>{selectedApp.agent_reference || selectedApp.referral_code || 'N/A'}</span></div>

                      <div className="flex gap-3 mt-8 pt-5 border-t border-white/10">
                         <button onClick={() => { approveArtist(selectedApp); setSelectedApp(null); }} className="flex-1 h-10 bg-[#0084D6] hover:bg-[#00A3FF] text-white font-semibold text-[13px] rounded-[10px] flex items-center justify-center gap-2 transition-colors">
                            <CircleCheck size={16} /> Approve Application
                         </button>
                         <button onClick={() => { rejectArtist(selectedApp); setSelectedApp(null); }} className="flex-1 h-10 bg-[#FF453A]/10 border border-[#FF453A]/30 text-[#FF453A] hover:bg-[#FF453A]/20 font-semibold text-[13px] rounded-[10px] flex items-center justify-center gap-2 transition-colors">
                            <X size={16} /> Reject
                         </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
              {selectedArtist && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-2xl bg-[#1A1A1A] border border-white/10 rounded-[16px] max-h-[85vh] overflow-y-auto flex flex-col">
                    <div className="p-5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1A1A1A] z-10 rounded-t-[16px]">
                      <h3 className="font-bold text-[15px] text-white">Artist Profile</h3>
                      <button onClick={() => setSelectedArtist(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1A1A1A] border border-white/10 text-[#B0B0B0] hover:text-[#ff4757] hover:border-[#ff4757] transition-all">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="flex gap-4 mb-6">
                        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                          <img src={optimizeImage(selectedArtist.avatar_url, 150, 150)} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        </div>
                        <div>
                          <div className="font-bold text-xl text-white flex items-center gap-2">
                            {selectedArtist.stage_name}
                            {(selectedArtist.verified || selectedArtist.is_verified) && <ShieldCheck size={18} className="text-[#00d68f]" />}
                          </div>
                          <div className="text-[13px] text-[#B0B0B0] mt-1">{selectedArtist.genre} • {selectedArtist.city || 'Malawi'}</div>
                          <div className="mt-2 flex gap-2">
                             <span className="bg-[#4c9aff]/15 text-[#4c9aff] px-2 py-1 rounded-md text-[11px] font-bold ">{selectedArtist.artist_tier || 'Standard'} Tier</span>
                             <span className="bg-[#ff6b35]/15 text-[#ff6b35] px-2 py-1 rounded-md text-[11px] font-bold   font-mono">AP-{selectedArtist.id?.split('-')[0]}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                         <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-[11px] text-[#B0B0B0]  font-bold  mb-1">Wallet Balance</p>
                            <p className="text-xl font-bold text-[#00d68f]">MK {selectedArtist.wallet_balance?.toLocaleString() || 0}</p>
                         </div>
                         <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-[11px] text-[#B0B0B0]  font-bold  mb-1">Pending Songs</p>
                            <p className="text-xl font-bold text-[#ffaa00]">{selectedArtist.pending_songs || 0}</p>
                         </div>
                      </div>

                      <h4 className="font-bold text-[13px] text-white mb-2">Platform Identity</h4>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">Email Address</span><span className="font-semibold text-white">{selectedArtist.email || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">Phone / Mobile Money</span><span className="font-semibold text-white">{selectedArtist.phone || 'N/A'}</span></div>

                      <h4 className="font-bold text-[13px] text-white mb-2 mt-8">KYC Information</h4>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">Name</span><span className="font-semibold text-white">{selectedArtist.full_name || selectedArtist.name || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">ID Number</span><span className="font-medium text-white font-mono">{selectedArtist.nrc_number || 'N/A'}</span></div>
                      <div className="flex justify-between py-2 border-b border-white/10 text-[13px]"><span className="text-[#B0B0B0]">Agent Reference</span><span className={`font-semibold font-mono ${selectedArtist.agent_reference || selectedArtist.referral_code ? 'text-[#00d68f]' : 'text-white'}`}>{selectedArtist.agent_reference || selectedArtist.referral_code || 'N/A'}</span></div>

                      <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
                         <div>
                            <p className="text-[11px] text-[#B0B0B0] mb-1">ID Document</p>
                            {selectedArtist.id_document_url ? (
                              <img src={selectedArtist.id_document_url} alt="ID Document" className="w-full rounded-lg border border-white/10 hover:scale-105 transition-transform cursor-pointer" onClick={() => window.open(selectedArtist.id_document_url, '_blank')} />
                            ) : (
                              <div className="p-4 bg-white/5 rounded-lg text-[11px] text-[#B0B0B0]">Not provided</div>
                            )}
                         </div>
                         <div>
                            <p className="text-[11px] text-[#B0B0B0] mb-1">Selfie Image</p>
                            {selectedArtist.selfie_url ? (
                              <img src={selectedArtist.selfie_url} alt="Selfie" className="w-full rounded-lg border border-white/10 hover:scale-105 transition-transform cursor-pointer" onClick={() => window.open(selectedArtist.selfie_url, '_blank')} />
                            ) : (
                              <div className="p-4 bg-white/5 rounded-lg text-[11px] text-[#B0B0B0]">Not provided</div>
                            )}
                         </div>
                      </div>

                      <div className="flex gap-3 mt-8 pt-5 border-t border-white/10">
                         <button 
                            onClick={() => { toggleArtistVerification(selectedArtist.id, !!(selectedArtist.verified || selectedArtist.is_verified)); setSelectedArtist(null); }} 
                            className={`flex-1 py-3 font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all ${
                              (selectedArtist.verified || selectedArtist.is_verified) ? 'bg-white/5 text-white hover:bg-white border text-black hover:text-black' : 'bg-[#00d68f] hover:brightness-110 text-black'
                            }`}
                         >
                            <ShieldCheck size={16} /> {(selectedArtist.verified || selectedArtist.is_verified) ? 'Revoke Verification' : 'Verify Artist'}
                         </button>
                         <button onClick={() => { deleteArtist(selectedArtist.id, selectedArtist.stage_name); setSelectedArtist(null); }} className="flex-1 h-10 bg-[#FF453A]/10 border border-[#FF453A]/30 text-[#FF453A] hover:bg-[#FF453A]/20 font-semibold text-[13px] rounded-[10px] flex items-center justify-center gap-2 transition-colors">
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
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-[10px] transition-colors group relative ${
      activeTab === id 
        ? 'bg-[#00A3FF]/10 text-[#00A3FF]' 
        : 'text-[#B0B0B0] hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon size={18} className={activeTab === id ? 'text-[#00A3FF]' : 'text-[#B0B0B0] group-hover:text-white transition-colors'} />
    {!collapsed && (
      <div className="flex-1 flex items-center justify-between overflow-hidden">
        <span className="text-[13px] font-medium truncate">{label}</span>
        {count !== undefined && count > 0 && (
          <span className="bg-[#FF453A]/15 text-[#FF453A] text-[11px] font-medium px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
    )}
    {collapsed && count !== undefined && count > 0 && (
      <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-[#FF453A]" />
    )}
  </button>
);

const KpiCard = ({ title, value, trend, icon: Icon, color }: any) => (
  <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] overflow-hidden">
    <div className="flex justify-between items-start mb-4">
       <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#00A3FF]">
          <Icon size={16} />
       </div>
       {trend && (
         <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${trend?.includes('+') ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-white/5 text-[#B0B0B0]'}`}>
            {trend}
         </div>
       )}
    </div>
    <div>
      <h3 className="text-[12px] text-[#B0B0B0] mb-1 capitalize">{title}</h3>
      <p className="text-[24px] font-mono text-white leading-none">{value}</p>
    </div>
  </div>
);

export default Admin;

