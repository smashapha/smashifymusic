import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ShieldCheck, Mail, Calendar, CheckCircle2, AlertCircle, 
  Send, DollarSign, Activity, FileText, Ticket, Play, Pause, 
  Trash2, Edit3, UserCheck, UserX, Music, Disc, Wallet, 
  CreditCard, ExternalLink, Phone, MapPin, Sparkles, RefreshCw,
  Plus, Check, X, Bell, UserMinus, ShieldAlert, ListMusic
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { HealthStatus } from './types';

interface PersonItem {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  type: 'artist' | 'fan' | 'agent';
  created_at: string;
  stage_name?: string;
  artist_tier?: string;
  verified?: boolean;
  wallet_balance?: number;
  followers_count?: number;
  last_activity_event?: string;
  last_activity_date?: string;
  health: HealthStatus;
  total_paid_in?: number;
  tx_count?: number;
}

interface Person360DetailProps {
  person: PersonItem;
  onBack: () => void;
  onRefresh?: () => void;
}

export const Person360Detail: React.FC<Person360DetailProps> = ({ person, onBack, onRefresh }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'songs' | 'purchases' | 'financials' | 'activity' | 'notes' | 'tickets'>('overview');
  
  // Full details from API / Supabase
  const [profile, setProfile] = useState<any>({});
  const [songs, setSongs] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalPaid: 0, totalEarned: 0, txCount: 0, songsCount: 0 });

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    stage_name: '',
    phone: '',
    email: '',
    city: '',
    genre: '',
    bio: '',
    instagram: '',
    twitter: '',
    payout_network: 'Airtel Money',
    payout_phone: '',
    nrc_number: ''
  });

  // Wallet form
  const [walletForm, setWalletForm] = useState({
    mode: 'credit' as 'credit' | 'debit',
    amount: '',
    reason: '',
    notify: true
  });

  // Tier form
  const [tierForm, setTierForm] = useState({
    artistTier: 'Standard',
    artistMonths: 6,
    listenerPassHours: 24
  });

  // Notification form
  const [notifForm, setNotifForm] = useState({
    title: '',
    message: '',
    type: 'system_alert',
    link: '/'
  });

  // Note form
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Ticket form
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    source: 'whatsapp' as 'whatsapp' | 'in_app' | 'email'
  });

  // Audio preview state
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch full details
  const fetchDeepDetails = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`/api/admin/users/${person.id}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile || {});
        setSongs(data.songs || []);
        setAlbums(data.albums || []);
        setPurchases(data.purchases || []);
        setPlaylists(data.playlists || []);
        setTransactions(data.transactions || []);
        setPayouts(data.payouts || []);
        setActivity(data.activity || []);
        setNotes(data.notes || []);
        setTickets(data.tickets || []);
        setStats(data.stats || {});

        // Populate edit form
        const p = data.profile || {};
        setEditForm({
          full_name: p.full_name || '',
          stage_name: p.stage_name || '',
          phone: p.phone || '',
          email: p.email || '',
          city: p.city || p.location || '',
          genre: p.genre || '',
          bio: p.bio || '',
          instagram: p.instagram || '',
          twitter: p.twitter || '',
          payout_network: p.payout_network || 'Airtel Money',
          payout_phone: p.payout_phone || '',
          nrc_number: p.nrc_number || ''
        });
      } else {
        // Fallback to client Supabase queries if API returned error
        await fetchFallbackData();
      }
    } catch (err) {
      console.warn('Using Supabase fallback for user 360:', err);
      await fetchFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const fetchFallbackData = async () => {
    try {
      const [
        { data: profData },
        { data: uProfData },
        { data: songsData },
        { data: txData },
        { data: notesData },
        { data: ticketsData },
        { data: actData }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', person.id).maybeSingle(),
        supabase.from('user_profiles').select('*').eq('id', person.id).maybeSingle(),
        supabase.from('songs').select('*').eq('artist_id', person.id).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').or(`artist_id.eq.${person.id},fan_id.eq.${person.id}`).order('created_at', { ascending: false }).limit(50),
        supabase.from('people_notes').select('*').eq('profile_id', person.id).order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').eq('profile_id', person.id).order('created_at', { ascending: false }),
        supabase.from('activity_log').select('*').eq('profile_id', person.id).order('created_at', { ascending: false }).limit(50)
      ]);

      const merged = { ...(uProfData || {}), ...(profData || {}), id: person.id };
      setProfile(merged);
      setSongs(songsData || []);
      setTransactions(txData || []);
      setNotes(notesData || []);
      setTickets(ticketsData || []);
      setActivity(actData || []);
      
      const totalPaid = (txData || []).filter(t => t.status === 'completed').reduce((acc, t) => acc + Number(t.gross_amount || 0), 0);
      setStats({ totalPaid, txCount: txData?.length || 0, songsCount: songsData?.length || 0 });
    } catch (e) {
      console.error('Fallback fetch failed', e);
    }
  };

  useEffect(() => {
    fetchDeepDetails();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [person.id]);

  // Execute control action via API
  const executeControl = async (action: string, payload: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`/api/admin/users/${person.id}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, payload })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      return data;
    } catch (err: any) {
      console.error('Action error:', err);
      throw err;
    }
  };

  // Toggle Verification
  const handleToggleVerified = async () => {
    const nextVal = !(profile.verified || profile.is_verified);
    try {
      await executeControl('toggle_verification', { verified: nextVal });
      setProfile((prev: any) => ({ ...prev, verified: nextVal, is_verified: nextVal }));
      person.verified = nextVal;
      toast.success(nextVal ? 'User verified!' : 'Verification badge removed');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Toggle Admin status
  const handleToggleAdmin = async () => {
    const nextVal = !profile.is_admin;
    try {
      await executeControl('toggle_admin', { is_admin: nextVal });
      setProfile((prev: any) => ({ ...prev, is_admin: nextVal }));
      toast.success(nextVal ? 'Granted Administrator rights' : 'Admin rights revoked');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Toggle Suspension
  const handleToggleSuspension = async () => {
    const nextVal = !profile.is_suspended;
    try {
      await executeControl('toggle_suspension', { 
        is_suspended: nextVal,
        reason: nextVal ? 'Suspended by admin' : 'Reactivated by admin'
      });
      setProfile((prev: any) => ({ ...prev, is_suspended: nextVal }));
      toast.success(nextVal ? 'User account suspended' : 'User account reactivated');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Save Profile Edits
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await executeControl('update_profile', { updates: editForm });
      setProfile((prev: any) => ({ ...prev, ...editForm }));
      setEditModalOpen(false);
      toast.success('Profile details updated successfully');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  // Adjust Wallet
  const handleAdjustWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = Number(walletForm.amount);
    if (!amountVal || amountVal <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    const finalAmount = walletForm.mode === 'debit' ? -amountVal : amountVal;

    try {
      const res = await executeControl('adjust_wallet', {
        amount: finalAmount,
        reason: walletForm.reason.trim() || 'Admin adjustment',
        notify: walletForm.notify
      });
      setProfile((prev: any) => ({ ...prev, wallet_balance: res.newBalance }));
      person.wallet_balance = res.newBalance;
      setWalletModalOpen(false);
      setWalletForm({ mode: 'credit', amount: '', reason: '', notify: true });
      toast.success(`Wallet adjusted: ${finalAmount > 0 ? '+' : ''}MK ${Math.abs(finalAmount).toLocaleString()}`);
      fetchDeepDetails();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error('Adjustment failed: ' + err.message);
    }
  };

  // Manage Artist Tier / Listener Pass
  const handleManageTier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (person.type === 'artist') {
        const res = await executeControl('set_artist_tier', {
          tier: tierForm.artistTier,
          months: tierForm.artistMonths
        });
        setProfile((prev: any) => ({ 
          ...prev, 
          artist_tier: res.artist_tier, 
          subscription_tier: res.artist_tier,
          subscription_ends: res.subscription_ends 
        }));
        person.artist_tier = res.artist_tier;
        toast.success(`Artist updated to ${res.artist_tier} tier`);
      } else {
        const res = await executeControl('manage_daily_pass', {
          hours: tierForm.listenerPassHours
        });
        setProfile((prev: any) => ({ 
          ...prev, 
          daily_pass_expires_at: res.daily_pass_expires_at, 
          subscription_tier: res.subscription_tier 
        }));
        toast.success(tierForm.listenerPassHours > 0 ? 'Listener Pass granted!' : 'Listener Pass revoked');
      }
      setTierModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error('Tier update failed: ' + err.message);
    }
  };

  // Moderate Song (Approve, Reject, Trending, Delete)
  const handleModerateSong = async (songId: string, subAction: 'approve' | 'reject' | 'toggle_featured' | 'delete') => {
    try {
      await executeControl('moderate_song', { song_id: songId, sub_action: subAction });
      
      if (subAction === 'delete') {
        setSongs(prev => prev.filter(s => s.id !== songId));
        toast.success('Song deleted from catalog');
      } else if (subAction === 'approve') {
        setSongs(prev => prev.map(s => s.id === songId ? { ...s, approved: true, status: 'approved' } : s));
        toast.success('Song approved for distribution!');
      } else if (subAction === 'reject') {
        setSongs(prev => prev.map(s => s.id === songId ? { ...s, approved: false, status: 'rejected' } : s));
        toast.success('Song rejected');
      } else if (subAction === 'toggle_featured') {
        setSongs(prev => prev.map(s => s.id === songId ? { ...s, trending: !s.trending } : s));
        toast.success('Trending status updated');
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error('Moderation error: ' + err.message);
    }
  };

  // Audio Playback
  const handlePlayAudio = (song: any) => {
    if (playingSongId === song.id) {
      audioRef.current?.pause();
      setPlayingSongId(null);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = song.audio_url;
      audioRef.current.play().then(() => {
        setPlayingSongId(song.id);
      }).catch(err => {
        toast.error('Playback failed: ' + err.message);
      });
      audioRef.current.onended = () => setPlayingSongId(null);
    }
  };

  // Send Direct Notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifForm.message.trim()) return;
    try {
      await executeControl('send_notification', {
        title: notifForm.title.trim() || 'Admin Notification',
        message: notifForm.message.trim(),
        type: notifForm.type,
        link: notifForm.link
      });
      toast.success('Notification dispatched to user feed');
      setNotificationModalOpen(false);
      setNotifForm({ title: '', message: '', type: 'system_alert', link: '/' });
    } catch (err: any) {
      toast.error('Failed to send: ' + err.message);
    }
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const payload = {
        profile_id: person.id,
        body: newNote.trim(),
        created_by: authData?.user?.id
      };
      const { data, error } = await supabase.from('people_notes').insert(payload).select().single();
      if (error) throw error;
      setNotes(prev => [data, ...prev]);
      setNewNote('');
      toast.success('Note saved');
    } catch (err: any) {
      toast.error('Could not save note: ' + err.message);
    } finally {
      setSubmittingNote(false);
    }
  };

  // Create Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject.trim()) return;
    try {
      const payload = {
        profile_id: person.id,
        subject: ticketForm.subject.trim(),
        priority: ticketForm.priority,
        source: ticketForm.source,
        status: 'open'
      };
      const { data, error } = await supabase.from('tickets').insert(payload).select().single();
      if (error) throw error;
      setTickets(prev => [data, ...prev]);
      setTicketModalOpen(false);
      setTicketForm({ subject: '', priority: 'normal', source: 'whatsapp' });
      toast.success('Ticket opened');
    } catch (err: any) {
      toast.error('Failed to open ticket: ' + err.message);
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    try {
      await executeControl('delete_user', {});
      toast.success(`User ${person.name} has been deleted`);
      setDeleteConfirmOpen(false);
      if (onRefresh) onRefresh();
      onBack();
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const isSuspended = !!(profile.is_suspended || profile.suspended);
  const isVerified = !!(profile.verified || profile.is_verified);
  const isAdmin = !!(profile.is_admin);

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[12px] text-[13px] text-white transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Back to Directory
        </button>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-[10px] text-[12px] font-medium transition-colors"
          >
            <Edit3 size={13} className="text-[#00A3FF]" />
            Edit Profile
          </button>

          <button
            onClick={() => setWalletModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E]/10 hover:bg-[#22C55E]/20 border border-[#22C55E]/20 text-[#22C55E] rounded-[10px] text-[12px] font-medium transition-colors"
          >
            <Wallet size={13} />
            Adjust Wallet
          </button>

          <button
            onClick={() => setTierModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 rounded-[10px] text-[12px] font-medium transition-colors"
          >
            <Sparkles size={13} />
            {person.type === 'artist' ? 'Artist Tier' : 'Listener Pass'}
          </button>

          <button
            onClick={handleToggleVerified}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium border transition-colors ${
              isVerified 
                ? 'bg-[#00A3FF]/15 border-[#00A3FF]/30 text-[#00A3FF] hover:bg-[#00A3FF]/25' 
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
          >
            <ShieldCheck size={13} />
            {isVerified ? 'Verified' : 'Verify'}
          </button>

          <button
            onClick={handleToggleAdmin}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium border transition-colors ${
              isAdmin 
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
          >
            <UserCheck size={13} />
            {isAdmin ? 'Admin' : 'Make Admin'}
          </button>

          <button
            onClick={handleToggleSuspension}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium border transition-colors ${
              isSuspended
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-red-400 hover:border-red-500/20'
            }`}
          >
            {isSuspended ? <UserCheck size={13} /> : <UserX size={13} />}
            {isSuspended ? 'Suspended (Unlock)' : 'Suspend'}
          </button>

          <button
            onClick={() => setNotificationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-[10px] text-[12px] font-medium transition-colors"
          >
            <Bell size={13} className="text-[#00A3FF]" />
            Notify
          </button>

          <button
            onClick={() => setTicketModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-[10px] text-[12px] font-medium transition-colors"
          >
            <Ticket size={13} />
            Ticket
          </button>

          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="p-1.5 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/50 hover:text-red-400 rounded-[10px] transition-colors"
            title="Delete User"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Main 360 Header Profile Card */}
      <div className={`p-6 rounded-[18px] border transition-all ${
        isSuspended 
          ? 'bg-red-950/20 border-red-500/30' 
          : 'bg-[#141414] border-white/10 shadow-2xl'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-[16px] bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {profile.avatar_url || person.avatar_url ? (
                <img 
                  src={profile.avatar_url || person.avatar_url} 
                  alt="" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                person.name[0]
              )}
              {isVerified && (
                <div className="absolute bottom-1 right-1 p-1 bg-[#00A3FF] text-black rounded-full shadow-lg">
                  <ShieldCheck size={12} className="stroke-[3]" />
                </div>
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  {profile.stage_name || profile.full_name || person.name}
                </h1>
                
                {/* Type Badge */}
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  person.type === 'artist' 
                    ? 'bg-[#00A3FF]/15 border border-[#00A3FF]/30 text-[#00A3FF]' 
                    : person.type === 'agent' 
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' 
                    : 'bg-white/10 border border-white/10 text-white/80'
                }`}>
                  {person.type === 'fan' ? 'Listener' : person.type}
                </span>

                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                    Admin
                  </span>
                )}

                {isSuspended && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                    Suspended
                  </span>
                )}

                {/* Artist Tier or Listener Pass */}
                {person.type === 'artist' ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-medium">
                    {profile.artist_tier || person.artist_tier || 'Free'} Tier
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    profile.daily_pass_expires_at && new Date(profile.daily_pass_expires_at).getTime() > Date.now()
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-white/50'
                  }`}>
                    {profile.daily_pass_expires_at && new Date(profile.daily_pass_expires_at).getTime() > Date.now()
                      ? 'Active Pass'
                      : 'Free Listener'}
                  </span>
                )}
              </div>

              {/* Sub-details line */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/60">
                {profile.email && (
                  <span className="flex items-center gap-1 font-mono text-white/80">
                    <Mail size={12} className="text-white/40" />
                    {profile.email}
                  </span>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-1 font-mono text-white/80">
                    <Phone size={12} className="text-white/40" />
                    {profile.phone}
                  </span>
                )}
                {(profile.city || profile.location) && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-white/40" />
                    {profile.city || profile.location}
                  </span>
                )}
                <span>•</span>
                <span>Joined {formatDistanceToNow(new Date(person.created_at), { addSuffix: true })}</span>
              </div>

              {/* Referral attribution */}
              {(profile.referred_by_agent_id || profile.agent_reference) && (
                <div className="text-[11px] text-[#00A3FF] flex items-center gap-1 pt-0.5 font-mono">
                  <Sparkles size={11} />
                  Referred by Agent Ref: {profile.agent_reference || profile.referred_by_agent_id}
                </div>
              )}
            </div>
          </div>

          {/* Quick Right Side UUID & Stats */}
          <div className="flex flex-col md:items-end justify-center gap-1 text-[12px] shrink-0">
            <span className="text-[11px] uppercase tracking-wider text-white/40">UUID</span>
            <span className="font-mono text-white/70 text-[11px] bg-white/5 px-2.5 py-1 rounded-[8px] border border-white/5 select-all">
              {person.id}
            </span>
            {person.type === 'artist' && profile.subscription_ends && (
              <span className="text-[11px] text-purple-300/80 mt-1">
                Tier expires: {new Date(profile.subscription_ends).toLocaleDateString()}
              </span>
            )}
            {person.type === 'fan' && profile.daily_pass_expires_at && (
              <span className="text-[11px] text-emerald-400 mt-1">
                Pass ends: {new Date(profile.daily_pass_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(profile.daily_pass_expires_at).toLocaleDateString()})
              </span>
            )}
          </div>
        </div>

        {/* 4 Primary Metric Stat Blocks */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5 mt-5 border-t border-white/5">
          <div className="p-3.5 bg-white/[0.03] border border-white/5 rounded-[14px]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1">Total Paid In</p>
            <p className="text-lg font-mono font-bold text-[#22C55E]">
              MK {Number(stats.totalPaid || person.total_paid_in || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">{stats.txCount || 0} transactions</p>
          </div>

          <div className="p-3.5 bg-white/[0.03] border border-white/5 rounded-[14px]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1">Studio Wallet</p>
              <button
                onClick={() => setWalletModalOpen(true)}
                className="text-[10px] text-[#00A3FF] hover:underline"
              >
                ± Adjust
              </button>
            </div>
            <p className="text-lg font-mono font-bold text-white">
              MK {Number(profile.wallet_balance ?? person.wallet_balance ?? 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">Available Liquidity</p>
          </div>

          <div className="p-3.5 bg-white/[0.03] border border-white/5 rounded-[14px]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1">
              {person.type === 'artist' ? 'Catalog Uploads' : 'Music Library'}
            </p>
            <p className="text-lg font-mono font-bold text-white">
              {person.type === 'artist' ? songs.length : purchases.length}
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {person.type === 'artist' 
                ? `${songs.filter(s => s.approved).length} live • ${songs.filter(s => !s.approved).length} pending`
                : `${playlists.length} playlists created`
              }
            </p>
          </div>

          <div className="p-3.5 bg-white/[0.03] border border-white/5 rounded-[14px]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1">Support & CRM</p>
            <p className="text-lg font-mono font-bold text-white">
              {tickets.length}
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {notes.length} internal notes • {tickets.filter(t => t.status === 'open').length} open
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Identity & Details', icon: FileText },
          ...(person.type === 'artist' ? [{ id: 'songs', label: `Catalog (${songs.length})`, icon: Music }] : []),
          ...(person.type === 'fan' || purchases.length > 0 ? [{ id: 'purchases', label: `Purchases (${purchases.length})`, icon: Disc }] : []),
          { id: 'financials', label: `Financial Ledger (${transactions.length})`, icon: CreditCard },
          { id: 'activity', label: `Activity (${activity.length})`, icon: Activity },
          { id: 'notes', label: `Admin Notes (${notes.length})`, icon: Edit3 },
          { id: 'tickets', label: `Support Tickets (${tickets.length})`, icon: Ticket },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[12px] text-[13px] font-semibold transition-all shrink-0 ${
                isActive 
                  ? 'bg-[#00A3FF] text-black shadow-lg shadow-[#00A3FF]/20' 
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Identity Details */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identity & Contact Card */}
          <div className="p-5 bg-[#141414] border border-white/10 rounded-[16px] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-semibold text-white text-[14px] flex items-center gap-2">
                <FileText size={16} className="text-[#00A3FF]" />
                Personal & Contact Information
              </h3>
              <button 
                onClick={() => setEditModalOpen(true)}
                className="text-[12px] text-[#00A3FF] hover:underline"
              >
                Edit Info
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40">Full Legal Name</p>
                <p className="font-medium text-white mt-0.5">{profile.full_name || person.name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40">Stage / Display Name</p>
                <p className="font-medium text-white mt-0.5">{profile.stage_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40">Email Address</p>
                <p className="font-mono text-white/90 mt-0.5 select-all">{profile.email || person.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40">Phone Number</p>
                <p className="font-mono text-white/90 mt-0.5">{profile.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40">City / District</p>
                <p className="text-white mt-0.5">{profile.city || profile.location || 'Malawi'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40">Primary Genre</p>
                <p className="text-white mt-0.5">{profile.genre || 'General'}</p>
              </div>
            </div>

            {profile.bio && (
              <div className="pt-3 border-t border-white/5">
                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Artist Bio</p>
                <p className="text-[13px] text-white/80 leading-relaxed bg-white/[0.02] p-3 rounded-[10px] border border-white/5">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Social handles */}
            <div className="pt-3 border-t border-white/5">
              <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Social & Online Profiles</p>
              <div className="flex flex-wrap gap-2 text-[12px]">
                {profile.instagram ? (
                  <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-white/80 hover:text-white flex items-center gap-1.5">
                    IG: @{profile.instagram.replace('@', '')} <ExternalLink size={11} />
                  </a>
                ) : null}
                {profile.twitter ? (
                  <a href={`https://twitter.com/${profile.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-white/80 hover:text-white flex items-center gap-1.5">
                    X: @{profile.twitter.replace('@', '')} <ExternalLink size={11} />
                  </a>
                ) : null}
                {profile.website ? (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-white/80 hover:text-white flex items-center gap-1.5">
                    Web <ExternalLink size={11} />
                  </a>
                ) : null}
                {!profile.instagram && !profile.twitter && !profile.website && (
                  <span className="text-white/40 text-[12px]">No social handles registered</span>
                )}
              </div>
            </div>
          </div>

          {/* KYC, Banking & Security Card */}
          <div className="p-5 bg-[#141414] border border-white/10 rounded-[16px] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-semibold text-white text-[14px] flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#22C55E]" />
                KYC, Banking & Security Compliance
              </h3>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                isVerified ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-white/10 text-white/50'
              }`}>
                {isVerified ? 'KYC Verified' : 'Unverified'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40">ID Type</p>
                <p className="font-medium text-white mt-0.5">{profile.id_type || 'National ID / NRC'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40">NRC / ID Number</p>
                <p className="font-mono text-white/90 mt-0.5">{profile.nrc_number || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40">Payout Network</p>
                <p className="font-medium text-white mt-0.5">{profile.payout_network || 'Airtel Money'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40">Payout Phone / Account</p>
                <p className="font-mono text-white/90 mt-0.5">{profile.payout_phone || profile.phone || 'N/A'}</p>
              </div>
            </div>

            {/* KYC Document Previews */}
            <div className="pt-3 border-t border-white/5">
              <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Uploaded Verification Proofs</p>
              <div className="grid grid-cols-2 gap-3">
                {profile.id_document_url ? (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-[12px] space-y-2">
                    <p className="text-[11px] text-white/60 font-medium">Government ID Document</p>
                    <a 
                      href={profile.id_document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-[12px] text-[#00A3FF] hover:underline truncate"
                    >
                      View ID Document ↗
                    </a>
                  </div>
                ) : (
                  <div className="p-3 bg-white/[0.02] border border-dashed border-white/10 rounded-[12px] text-center text-white/30 text-[11px]">
                    No ID Document on file
                  </div>
                )}

                {profile.selfie_url ? (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-[12px] space-y-2">
                    <p className="text-[11px] text-white/60 font-medium">Selfie Liveness Verification</p>
                    <a 
                      href={profile.selfie_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-[12px] text-[#00A3FF] hover:underline truncate"
                    >
                      View Selfie Proof ↗
                    </a>
                  </div>
                ) : (
                  <div className="p-3 bg-white/[0.02] border border-dashed border-white/10 rounded-[12px] text-center text-white/30 text-[11px]">
                    No Selfie on file
                  </div>
                )}
              </div>
            </div>

            {/* Quick Security Toggles */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[13px] font-medium text-white">Account Active Status</p>
                <p className="text-[11px] text-white/40">
                  {isSuspended ? 'User is blocked from logging in or streaming.' : 'User has normal operational access.'}
                </p>
              </div>
              <button
                onClick={handleToggleSuspension}
                className={`px-3 py-1.5 rounded-[10px] text-[12px] font-bold border transition-colors ${
                  isSuspended 
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                {isSuspended ? 'Suspended' : 'Active'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Catalog & Songs (for Artists) */}
      {activeTab === 'songs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Music size={18} className="text-[#00A3FF]" />
              Uploaded Tracks & Releases ({songs.length})
            </h3>
            <span className="text-[12px] text-white/50">
              Live moderation & direct audio inspection
            </span>
          </div>

          {songs.length === 0 ? (
            <div className="p-12 text-center bg-[#141414] border border-white/10 rounded-[16px]">
              <p className="text-white/50 text-[14px]">No songs uploaded yet by this artist.</p>
            </div>
          ) : (
            <div className="bg-[#141414] border border-white/10 rounded-[16px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-[11px] uppercase tracking-wider text-white/40 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Track Title & Audio</th>
                      <th className="py-3 px-4">Monetization</th>
                      <th className="py-3 px-4">Plays / Revenue</th>
                      <th className="py-3 px-4">Distribution Status</th>
                      <th className="py-3 px-4 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {songs.map((song) => {
                      const isPlaying = playingSongId === song.id;
                      return (
                        <tr key={song.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {/* Artwork + Play Button */}
                              <div className="relative w-11 h-11 rounded-[10px] bg-white/5 overflow-hidden border border-white/10 shrink-0 group">
                                <img 
                                  src={song.cover_url || '/placeholder-album.png'} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                />
                                <button
                                  onClick={() => handlePlayAudio(song)}
                                  className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity ${
                                    isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                  }`}
                                >
                                  {isPlaying ? (
                                    <Pause size={16} className="text-[#00A3FF]" />
                                  ) : (
                                    <Play size={16} className="text-white fill-white ml-0.5" />
                                  )}
                                </button>
                              </div>

                              <div>
                                <p className="font-semibold text-white hover:text-[#00A3FF] transition-colors">
                                  {song.title}
                                </p>
                                <p className="text-[11px] text-white/50 mt-0.5">
                                  {song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, '0')}` : 'Full Track'} • {song.release_date ? new Date(song.release_date).toLocaleDateString() : 'Released'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              song.is_for_sale && song.price > 0 
                                ? 'bg-[#22C55E]/15 text-[#22C55E]' 
                                : 'bg-white/10 text-white/60'
                            }`}>
                              {song.is_for_sale && song.price > 0 ? `MK ${Number(song.price).toLocaleString()}` : 'Free'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-mono text-white/80">
                              {(song.plays || 0).toLocaleString()} streams
                            </div>
                            <div className="text-[11px] text-[#22C55E] font-mono">
                              MK {((song.downloads || 0) * (song.price || 0)).toLocaleString()}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                              song.approved 
                                ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30' 
                                : song.status === 'rejected'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}>
                              {song.approved ? 'Live (Approved)' : song.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {song.approved ? (
                                <button
                                  onClick={() => handleModerateSong(song.id, 'reject')}
                                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-[8px] text-[11px] font-semibold transition-colors"
                                  title="Revoke approval"
                                >
                                  Revoke
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleModerateSong(song.id, 'approve')}
                                  className="px-2.5 py-1 bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] border border-[#22C55E]/30 rounded-[8px] text-[11px] font-semibold transition-colors"
                                  title="Approve track"
                                >
                                  Approve
                                </button>
                              )}

                              <button
                                onClick={() => handleModerateSong(song.id, 'toggle_featured')}
                                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold border transition-colors ${
                                  song.trending 
                                    ? 'bg-[#00A3FF]/20 text-[#00A3FF] border-[#00A3FF]/40' 
                                    : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                                }`}
                                title="Toggle Featured"
                              >
                                {song.trending ? '★ Featured' : 'Feature'}
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm(`Permanently delete song "${song.title}"?`)) {
                                    handleModerateSong(song.id, 'delete');
                                  }
                                }}
                                className="p-1 text-white/40 hover:text-red-400 transition-colors"
                                title="Delete Track"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Purchased Music & Library (for Listeners / Fans) */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Disc size={18} className="text-[#22C55E]" />
              Purchased Tracks & Stems ({purchases.length})
            </h3>
          </div>

          {purchases.length === 0 ? (
            <div className="p-12 text-center bg-[#141414] border border-white/10 rounded-[16px]">
              <p className="text-white/50 text-[14px]">No track purchases found for this listener.</p>
            </div>
          ) : (
            <div className="bg-[#141414] border border-white/10 rounded-[16px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-[11px] uppercase tracking-wider text-white/40 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Song Details</th>
                      <th className="py-3 px-4">Price Paid</th>
                      <th className="py-3 px-4">Purchase Date</th>
                      <th className="py-3 px-4 font-mono">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-white">{p.songs?.title || 'Purchased Song'}</p>
                          <p className="text-[11px] text-white/40">ID: {p.song_id}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#22C55E] font-bold">
                          MK {Number(p.songs?.price || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-white/70">
                          {new Date(p.purchased_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-white/40 select-all">
                          {p.transaction_id || 'Direct'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Financial Transactions & Ledger */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Payouts Section (if artist) */}
          {payouts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[13px] font-bold uppercase tracking-wider text-white/60">
                Payout Requests ({payouts.length})
              </h4>
              <div className="bg-[#141414] border border-white/10 rounded-[16px] overflow-hidden">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-[11px] uppercase tracking-wider text-white/40">
                    <tr>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Network & Phone</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Requested At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payouts.map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          MK {Number(p.requested_amount || p.amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-white/80">
                          {p.network} • {p.phone_number || p.phone}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            p.status === 'paid' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                            p.status === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                            'bg-red-500/15 text-red-400'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white/50 text-[12px]">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transactions Ledger */}
          <div className="space-y-3">
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-white/60">
              Transactions Ledger ({transactions.length})
            </h4>
            {transactions.length === 0 ? (
              <div className="p-8 text-center bg-[#141414] border border-white/10 rounded-[16px]">
                <p className="text-white/40 text-[13px]">No transactions recorded yet.</p>
              </div>
            ) : (
              <div className="bg-[#141414] border border-white/10 rounded-[16px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-white/[0.02] border-b border-white/10 text-[11px] uppercase tracking-wider text-white/40 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Gross Amount</th>
                        <th className="py-3 px-4">Fee</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 font-mono">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-white/70">
                            {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[11px] font-medium uppercase tracking-wider text-white/80">
                              {(tx.type || 'payment').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            MK {Number(tx.gross_amount || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono text-white/50 text-[12px]">
                            MK {Number(tx.platform_fee || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                              tx.status === 'completed' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                              tx.status === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                              'bg-red-500/15 text-red-400'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-white/40 select-all">
                            {tx.paychangu_ref || tx.id.substring(0, 10)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Activity Log */}
      {activeTab === 'activity' && (
        <div className="bg-[#141414] border border-white/10 rounded-[16px] p-5 space-y-4">
          <h3 className="font-semibold text-white text-[14px] flex items-center gap-2">
            <Activity size={16} className="text-[#00A3FF]" />
            Chronological User Activity ({activity.length})
          </h3>

          {activity.length === 0 ? (
            <p className="text-white/40 text-[13px] py-6 text-center">No recent activities logged.</p>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
              {activity.map((log) => (
                <div key={log.id} className="p-3.5 bg-white/[0.02] border border-white/5 rounded-[12px] flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-semibold text-white capitalize">
                      {log.event.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-white/40">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })} • {new Date(log.created_at).toLocaleString()}
                    </p>
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <p className="text-[11px] text-[#00A3FF] font-mono mt-1">
                        {JSON.stringify(log.meta)}
                      </p>
                    )}
                  </div>
                  {log.amount && (
                    <span className="font-mono text-[#22C55E] font-bold text-[13px] shrink-0">
                      +MK {Number(log.amount).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Admin Notes */}
      {activeTab === 'notes' && (
        <div className="bg-[#141414] border border-white/10 rounded-[16px] p-5 space-y-4">
          <h3 className="font-semibold text-white text-[14px] flex items-center gap-2">
            <Edit3 size={16} className="text-[#00A3FF]" />
            Internal Admin Notes ({notes.length})
          </h3>

          <form onSubmit={handleAddNote} className="space-y-2">
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Write a private administrative note about this user..."
              rows={3}
              className="w-full p-3.5 bg-white/5 border border-white/10 rounded-[12px] text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#00A3FF] transition-all resize-none"
            />
            <button
              type="submit"
              disabled={submittingNote || !newNote.trim()}
              className="px-5 py-2 bg-[#00A3FF] hover:bg-[#00A3FF]/90 text-black font-semibold rounded-[10px] text-[13px] transition-colors disabled:opacity-50"
            >
              {submittingNote ? 'Saving...' : 'Add Note'}
            </button>
          </form>

          <div className="space-y-2.5 pt-2">
            {notes.length === 0 ? (
              <p className="text-white/40 text-[13px] py-4 text-center">No notes recorded yet.</p>
            ) : (
              notes.map(n => (
                <div key={n.id} className="p-3.5 bg-white/[0.02] border border-white/5 rounded-[12px] space-y-1">
                  <p className="text-[13px] text-white/90 whitespace-pre-wrap">{n.body}</p>
                  <p className="text-[11px] text-white/40">
                    Recorded {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 7: Support Tickets */}
      {activeTab === 'tickets' && (
        <div className="bg-[#141414] border border-white/10 rounded-[16px] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-[14px] flex items-center gap-2">
              <Ticket size={16} className="text-[#00A3FF]" />
              Support & Query Tickets ({tickets.length})
            </h3>
            <button
              onClick={() => setTicketModalOpen(true)}
              className="px-3 py-1.5 bg-[#00A3FF] text-black font-semibold rounded-[10px] text-[12px] transition-colors"
            >
              + Open Ticket
            </button>
          </div>

          <div className="space-y-2.5">
            {tickets.length === 0 ? (
              <p className="text-white/40 text-[13px] py-6 text-center">No tickets on record for this user.</p>
            ) : (
              tickets.map(t => (
                <div key={t.id} className="p-3.5 bg-white/[0.02] border border-white/5 rounded-[12px] flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-bold text-white">{t.subject}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Source: {t.source} • Priority: {t.priority} • {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${
                    t.status === 'resolved' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                    t.status === 'in_progress' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-[#00A3FF]/15 text-[#00A3FF]'
                  }`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Edit Profile */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-[20px] max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white">Edit Profile Details</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Stage Name</label>
                  <input
                    type="text"
                    value={editForm.stage_name}
                    onChange={e => setEditForm({ ...editForm, stage_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">City / District</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Genre</label>
                  <input
                    type="text"
                    value={editForm.genre}
                    onChange={e => setEditForm({ ...editForm, genre: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Instagram (@handle)</label>
                  <input
                    type="text"
                    value={editForm.instagram}
                    onChange={e => setEditForm({ ...editForm, instagram: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">National ID / NRC</label>
                  <input
                    type="text"
                    value={editForm.nrc_number}
                    onChange={e => setEditForm({ ...editForm, nrc_number: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Bio / Profile Description</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-[10px] text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00A3FF] hover:bg-[#0084D6] text-black font-semibold rounded-[10px] text-[13px]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Adjust Studio Wallet */}
      {walletModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-[20px] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Wallet size={18} className="text-[#22C55E]" />
                Adjust Studio Wallet
              </h3>
              <button onClick={() => setWalletModalOpen(false)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustWallet} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1.5">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalletForm({ ...walletForm, mode: 'credit' })}
                    className={`py-2 rounded-[10px] text-[13px] font-bold transition-all ${
                      walletForm.mode === 'credit' 
                        ? 'bg-[#22C55E] text-black shadow-lg shadow-[#22C55E]/20' 
                        : 'bg-white/5 text-white/60'
                    }`}
                  >
                    + Credit Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletForm({ ...walletForm, mode: 'debit' })}
                    className={`py-2 rounded-[10px] text-[13px] font-bold transition-all ${
                      walletForm.mode === 'debit' 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                        : 'bg-white/5 text-white/60'
                    }`}
                  >
                    - Debit / Deduct
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">
                  Amount in Malawian Kwacha (MWK)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 50000"
                  value={walletForm.amount}
                  onChange={e => setWalletForm({ ...walletForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-[10px] text-[15px] font-mono text-white"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">
                  Audit Reason / Memo
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Promotional credit, contest reward, settlement"
                  value={walletForm.reason}
                  onChange={e => setWalletForm({ ...walletForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifyUser"
                  checked={walletForm.notify}
                  onChange={e => setWalletForm({ ...walletForm, notify: e.target.checked })}
                  className="rounded bg-white/10 border-white/20 text-[#00A3FF]"
                />
                <label htmlFor="notifyUser" className="text-[12px] text-white/70">
                  Notify user via in-app alert about this adjustment
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setWalletModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-[10px] text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#22C55E] hover:bg-[#22C55E]/90 text-black font-semibold rounded-[10px] text-[13px]"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Manage Tier / Listener Pass */}
      {tierModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-[20px] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                {person.type === 'artist' ? 'Manage Artist Distribution Tier' : 'Grant Listener Daily Pass'}
              </h3>
              <button onClick={() => setTierModalOpen(false)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManageTier} className="space-y-4">
              {person.type === 'artist' ? (
                <>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Select Tier</label>
                    <select
                      value={tierForm.artistTier}
                      onChange={e => setTierForm({ ...tierForm, artistTier: e.target.value })}
                      className="w-full px-3 py-2 bg-[#202020] border border-white/10 rounded-[10px] text-[13px] text-white"
                    >
                      <option value="Free">Free Tier (Standard Uploads)</option>
                      <option value="RisingStar">Rising Star Tier</option>
                      <option value="Standard">Standard Tier</option>
                      <option value="Elite">Elite Tier (Priority & Unlimited)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Tier Duration</label>
                    <select
                      value={tierForm.artistMonths}
                      onChange={e => setTierForm({ ...tierForm, artistMonths: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#202020] border border-white/10 rounded-[10px] text-[13px] text-white"
                    >
                      <option value="1">1 Month</option>
                      <option value="3">3 Months</option>
                      <option value="6">6 Months</option>
                      <option value="12">12 Months (1 Year)</option>
                      <option value="-1">Lifetime / Permanent</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">
                    Pass Access Duration
                  </label>
                  <select
                    value={tierForm.listenerPassHours}
                    onChange={e => setTierForm({ ...tierForm, listenerPassHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#202020] border border-white/10 rounded-[10px] text-[13px] text-white"
                  >
                    <option value="24">+24 Hours (Daily Pass)</option>
                    <option value="72">+3 Days</option>
                    <option value="168">+7 Days (Weekly Pass)</option>
                    <option value="720">+30 Days (Monthly Premium)</option>
                    <option value="0">Revoke Pass (Set to Free)</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setTierModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-[10px] text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-[10px] text-[13px]"
                >
                  Apply Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Send Direct Notification */}
      {notificationModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-[20px] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell size={18} className="text-[#00A3FF]" />
                Send Notification to {person.name}
              </h3>
              <button onClick={() => setNotificationModalOpen(false)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Account Notice, Album Promotion, Payout Verification"
                  value={notifForm.title}
                  onChange={e => setNotifForm({ ...notifForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Message Content</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter message text that will appear in user's in-app notification box..."
                  value={notifForm.message}
                  onChange={e => setNotifForm({ ...notifForm, message: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Link Target</label>
                <input
                  type="text"
                  placeholder="e.g. /artist-hub#wallet or /discover"
                  value={notifForm.link}
                  onChange={e => setNotifForm({ ...notifForm, link: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white font-mono text-[12px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setNotificationModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-[10px] text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00A3FF] hover:bg-[#0084D6] text-black font-semibold rounded-[10px] text-[13px]"
                >
                  Send Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Open Support Ticket */}
      {ticketModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-[20px] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Ticket size={18} className="text-[#00A3FF]" />
                Open Support Ticket
              </h3>
              <button onClick={() => setTicketModalOpen(false)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payout enquiry, Audio stem re-upload, WhatsApp report"
                  value={ticketForm.subject}
                  onChange={e => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Source</label>
                  <select
                    value={ticketForm.source}
                    onChange={e => setTicketForm({ ...ticketForm, source: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#202020] border border-white/10 rounded-[10px] text-[13px] text-white"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="in_app">In-App</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#202020] border border-white/10 rounded-[10px] text-[13px] text-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setTicketModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-[10px] text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00A3FF] hover:bg-[#0084D6] text-black font-semibold rounded-[10px] text-[13px]"
                >
                  Open Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Confirm Delete User */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-red-500/30 rounded-[20px] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <ShieldAlert size={24} />
              <h3 className="text-lg font-bold text-white">Delete User Account</h3>
            </div>
            
            <p className="text-[13px] text-white/70 leading-relaxed">
              Are you sure you want to permanently remove <strong className="text-white">{person.name}</strong>? All songs, albums, and user profile data will be permanently cleared.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-[10px] text-[13px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-[10px] text-[13px]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
