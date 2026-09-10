import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, Search, Copy, Check, 
  CreditCard, Clock, Music2, Heart, Sparkles, Flame, Radio, Users, 
  Wallet, ShieldAlert, ArrowRight, ChevronRight, Activity, Zap, Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { verifyPayment } from '../../lib/paychangu';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';

interface PaymentTroubleshooterProps {
  onSyncComplete?: () => void;
  compact?: boolean;
}

export interface TroubleshootTx {
  id: string;
  paychangu_ref: string;
  type: string;
  gross_amount: number;
  net_amount?: number;
  platform_fee?: number;
  status: 'pending' | 'failed' | 'completed' | string;
  created_at: string;
  completed_at?: string;
  metadata?: any;
  fan_id?: string;
  artist_id?: string;
  description?: string;
  // Joined or resolved
  fan?: {
    id?: string;
    full_name?: string;
    stage_name?: string;
    email?: string;
    avatar_url?: string;
  };
  artist?: {
    id?: string;
    full_name?: string;
    stage_name?: string;
    email?: string;
  };
}

export const PaymentTroubleshooter: React.FC<PaymentTroubleshooterProps> = ({ 
  onSyncComplete,
  compact = false 
}) => {
  const [transactions, setTransactions] = useState<TroubleshootTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<'pending' | 'failed' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Single row syncing state: maps tx.id -> boolean
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({});
  
  // Batch sync state
  const [batchSyncing, setBatchSyncing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // Manual reference force-sync state
  const [manualRefInput, setManualRefInput] = useState('');
  const [manualSyncing, setManualSyncing] = useState(false);
  const [manualResult, setManualResult] = useState<{ status: string; message: string; data?: any } | null>(null);

  // Copied reference state
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Helper to get clear entitlement summary
  const getEntitlementSummary = (tx: TroubleshootTx) => {
    const metadata = tx.metadata || {};
    const rawType = (metadata.payment_type || tx.type || (tx.description || '')).toUpperCase();

    if (metadata.songId || rawType.includes('TRACK') || rawType.includes('PURCHASE') || rawType.includes('SONG') || rawType.includes('SALE')) {
      return {
        type: 'Song Purchase',
        target: metadata.title ? `Song: "${metadata.title}"` : (metadata.songId ? `Song ID: ${metadata.songId.slice(0, 8)}...` : 'Song Track Access'),
        icon: <Music2 size={12} className="text-[#00A3FF]" />
      };
    }
    if (rawType.includes('DAILY')) {
      return { type: 'Pass', target: '1-Day Listener Pass', icon: <Sparkles size={12} className="text-[#A855F7]" /> };
    }
    if (rawType.includes('WEEKLY')) {
      return { type: 'Pass', target: '7-Day Listener Pass', icon: <Sparkles size={12} className="text-[#A855F7]" /> };
    }
    if (rawType.includes('FAMILY')) {
      return { type: 'Subscription', target: 'Family Listener Plan (30 Days)', icon: <Sparkles size={12} className="text-[#A855F7]" /> };
    }
    if (rawType.includes('LISTENER') || rawType.includes('PREMIUM') || metadata.plan) {
      return { type: 'Subscription', target: 'Listener Premium (30 Days)', icon: <Sparkles size={12} className="text-[#A855F7]" /> };
    }
    if (rawType.includes('RISING') || (metadata.tier && metadata.tier.toLowerCase().includes('rising'))) {
      return { type: 'Artist Tier', target: 'Rising Star Tier (6 Months)', icon: <Flame size={12} className="text-[#F97316]" /> };
    }
    if (rawType.includes('STANDARD') || (metadata.tier && metadata.tier.toLowerCase().includes('standard'))) {
      return { type: 'Artist Tier', target: 'Standard Tier (6 Months)', icon: <Flame size={12} className="text-[#F97316]" /> };
    }
    if (rawType.includes('ELITE') || (metadata.tier && metadata.tier.toLowerCase().includes('elite'))) {
      return { type: 'Artist Tier', target: 'Elite Tier (6 Months)', icon: <Flame size={12} className="text-[#F97316]" /> };
    }
    if (rawType.includes('FAN_SUB') || rawType.includes('FAN_SUBSCRIPTION')) {
      return { type: 'Subscription', target: 'Artist Fan Club Subscription', icon: <Users size={12} className="text-[#3B82F6]" /> };
    }
    if (rawType.includes('TIP')) {
      return { type: 'Artist Tip', target: 'Artist Tip Donation', icon: <Heart size={12} className="text-[#EC4899]" /> };
    }
    return { type: 'Payment', target: tx.description || 'Digital Service', icon: <CreditCard size={12} className="text-[#9CA3AF]" /> };
  };

  // Fetch pending / unresolved transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select(`
          id,
          paychangu_ref,
          type,
          gross_amount,
          net_amount,
          platform_fee,
          status,
          created_at,
          completed_at,
          metadata,
          fan_id,
          artist_id,
          description
        `)
        .order('created_at', { ascending: false })
        .limit(60);

      if (filterState === 'pending') {
        query = query.eq('status', 'pending');
      } else if (filterState === 'failed') {
        query = query.eq('status', 'failed');
      } else {
        query = query.in('status', ['pending', 'failed']);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rawTxs: TroubleshootTx[] = data || [];

      // Collect user/artist IDs to resolve names & details
      const userIds = Array.from(new Set(rawTxs.map(t => t.fan_id).filter(Boolean))) as string[];
      const artistIds = Array.from(new Set(rawTxs.map(t => t.artist_id).filter(Boolean))) as string[];

      const userMap: Record<string, any> = {};
      const artistMap: Record<string, any> = {};

      if (userIds.length > 0) {
        // Check user_profiles first
        const { data: usersData } = await supabase
          .from('user_profiles')
          .select('id, full_name, stage_name, email, avatar_url')
          .in('id', userIds);
        
        usersData?.forEach(u => {
          userMap[u.id] = u;
        });

        // Also check profiles for any missing
        const missingUserIds = userIds.filter(id => !userMap[id]);
        if (missingUserIds.length > 0) {
          const { data: profData } = await supabase
            .from('profiles')
            .select('id, full_name, stage_name, email, avatar_url')
            .in('id', missingUserIds);
          profData?.forEach(p => {
            userMap[p.id] = p;
          });
        }
      }

      if (artistIds.length > 0) {
        const { data: artistsData } = await supabase
          .from('profiles')
          .select('id, full_name, stage_name, email')
          .in('id', artistIds);
        
        artistsData?.forEach(a => {
          artistMap[a.id] = a;
        });
      }

      const enriched: TroubleshootTx[] = rawTxs.map(t => ({
        ...t,
        fan: t.fan_id ? userMap[t.fan_id] : undefined,
        artist: t.artist_id ? artistMap[t.artist_id] : undefined,
      }));

      setTransactions(enriched);
    } catch (err: any) {
      console.error('Failed to load pending transactions:', err);
      toast.error('Failed to load transactions: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Copy ref to clipboard helper
  const handleCopyRef = (ref: string) => {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    toast.success('Reference copied', { duration: 1500 });
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Force Sync single transaction
  const handleForceSync = async (tx: TroubleshootTx) => {
    const ref = tx.paychangu_ref;
    if (!ref) {
      toast.error('Transaction has no PayChangu reference');
      return;
    }

    setSyncingMap(prev => ({ ...prev, [tx.id]: true }));
    const toastId = toast.loading(`Verifying ${ref}...`);

    try {
      const result = await verifyPayment(ref);
      const verifiedStatus = result?.status || result?.transaction?.status || '';

      if (verifiedStatus === 'completed' || verifiedStatus === 'successful' || result?.granted) {
        toast.success(`Payment verified & fulfilled! Status: Completed ✅`, { id: toastId });
        
        // Update local item
        setTransactions(prev => prev.map(t => 
          t.id === tx.id 
            ? { ...t, status: 'completed', completed_at: new Date().toISOString() } 
            : t
        ));

        if (onSyncComplete) {
          onSyncComplete();
        }
      } else if (verifiedStatus === 'failed') {
        toast.error(`PayChangu confirmed payment failed or cancelled.`, { id: toastId });
        setTransactions(prev => prev.map(t => 
          t.id === tx.id ? { ...t, status: 'failed' } : t
        ));
      } else {
        const gwMsg = result?.gateway_message ? ` (${result.gateway_message})` : '';
        toast((t) => (
          <div className="flex flex-col gap-1.5 py-0.5">
            <span className="font-semibold text-white">Gateway reports: {verifiedStatus || 'Pending'}</span>
            <span className="text-[11px] text-white/70">Gateway check did not auto-confirm{gwMsg}. You can force grant immediately:</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                handleForceGrant(tx);
              }}
              className="mt-1 px-3 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-black font-semibold rounded-[6px] text-[12px] self-start flex items-center gap-1 shadow"
            >
              <CheckCircle2 size={13} />
              Force Grant Access Now
            </button>
          </div>
        ), { id: toastId, duration: 8000, icon: '⏳' });
      }
    } catch (err: any) {
      console.error(`Error force-syncing tx ${ref}:`, err);
      toast.error(`Verification error: ${err.message || 'Failed to reach verification endpoint'}`, { id: toastId });
    } finally {
      setSyncingMap(prev => ({ ...prev, [tx.id]: false }));
    }
  };

  // Force Grant single transaction directly (Admin Override)
  const handleForceGrant = async (tx: TroubleshootTx) => {
    const ref = tx.paychangu_ref;
    if (!ref) {
      toast.error('Transaction has no reference to grant');
      return;
    }

    const entitlement = getEntitlementSummary(tx);
    setSyncingMap(prev => ({ ...prev, [tx.id]: true }));
    const toastId = toast.loading(`Force granting access for ${ref}...`);

    try {
      const result = await verifyPayment(ref, { force_grant: true });
      if (result?.status === 'completed' || result?.granted) {
        toast.success(`Access granted! "${entitlement.target}" is now active ✅`, { id: toastId, duration: 4000 });
        setTransactions(prev => prev.map(t => 
          t.id === tx.id 
            ? { ...t, status: 'completed', completed_at: new Date().toISOString() } 
            : t
        ));
        if (onSyncComplete) onSyncComplete();
      } else {
        toast.error(`Force grant response: ${result?.error || 'Failed to grant'}`, { id: toastId });
      }
    } catch (err: any) {
      console.error(`Error force-granting tx ${ref}:`, err);
      toast.error(`Force grant failed: ${err.message || 'API error'}`, { id: toastId });
    } finally {
      setSyncingMap(prev => ({ ...prev, [tx.id]: false }));
    }
  };

  // Force Sync manual reference input
  const handleManualForceSync = async (e?: React.FormEvent, forceGrant: boolean = false) => {
    if (e) e.preventDefault();
    const cleanRef = manualRefInput.trim().replace(/\/$/, '').replace(/^["']|["']$/g, '');
    if (!cleanRef) {
      toast.error('Please enter a valid payment reference (e.g. SMA-...)');
      return;
    }

    setManualSyncing(true);
    setManualResult(null);
    const toastId = toast.loading(forceGrant ? `Force granting reference ${cleanRef}...` : `Verifying reference ${cleanRef}...`);

    try {
      const result = await verifyPayment(cleanRef, { force_grant: forceGrant });
      const finalStatus = result?.status || result?.transaction?.status || 'unknown';

      if (finalStatus === 'completed' || finalStatus === 'successful' || result?.granted) {
        toast.success(`Payment verified and granted! Status: Completed ✅`, { id: toastId });
        setManualResult({
          status: 'completed',
          message: `Transaction ${cleanRef} is COMPLETED. All rights (song purchase / tier plan) have been successfully fulfilled.`,
          data: result
        });
        fetchTransactions();
        if (onSyncComplete) onSyncComplete();
      } else if (finalStatus === 'failed') {
        toast.error(`PayChangu returned FAILED status.`, { id: toastId });
        setManualResult({
          status: 'failed',
          message: `Transaction ${cleanRef} is marked as FAILED by PayChangu or cancelled by customer.`,
          data: result
        });
      } else {
        const gwMsg = result?.gateway_message ? ` (Gateway: ${result.gateway_message})` : '';
        toast(`Transaction status: "${finalStatus}"${gwMsg}`, { id: toastId, icon: 'ℹ️' });
        setManualResult({
          status: finalStatus,
          message: `Gateway reported: "${finalStatus}"${gwMsg}. You can use "Force Grant Access" to immediately fulfill rights.`,
          data: result
        });
      }
    } catch (err: any) {
      toast.error(`Operation failed: ${err.message || 'Error communicating with API'}`, { id: toastId });
      setManualResult({
        status: 'error',
        message: err.message || 'Error occurred while verifying transaction reference',
      });
    } finally {
      setManualSyncing(false);
    }
  };

  // Batch sync all displayed pending transactions
  const handleBatchSync = async (forceGrantAll: boolean = false) => {
    const pendingList = transactions.filter(t => t.status === 'pending' && t.paychangu_ref);
    if (pendingList.length === 0) {
      toast.success('No pending transactions to process');
      return;
    }

    setBatchSyncing(true);
    setBatchProgress({ current: 0, total: pendingList.length });
    toast(forceGrantAll ? `Starting batch force grant for ${pendingList.length} transactions...` : `Starting gateway verification for ${pendingList.length} transactions...`, { icon: '⚡' });

    let resolvedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < pendingList.length; i++) {
      const tx = pendingList[i];
      setBatchProgress({ current: i + 1, total: pendingList.length });
      setSyncingMap(prev => ({ ...prev, [tx.id]: true }));

      try {
        const res = await verifyPayment(tx.paychangu_ref, { force_grant: forceGrantAll });
        const st = res?.status || res?.transaction?.status;
        if (st === 'completed' || st === 'successful' || res?.granted) {
          resolvedCount++;
          setTransactions(prev => prev.map(t => 
            t.id === tx.id ? { ...t, status: 'completed' } : t
          ));
        } else if (st === 'failed') {
          setTransactions(prev => prev.map(t => 
            t.id === tx.id ? { ...t, status: 'failed' } : t
          ));
        }
      } catch (e) {
        console.warn(`Batch sync failed for ${tx.paychangu_ref}:`, e);
        failedCount++;
      } finally {
        setSyncingMap(prev => ({ ...prev, [tx.id]: false }));
      }

      // Small pause between requests to prevent rate limiting
      if (i < pendingList.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setBatchSyncing(false);
    toast.success(`Batch completed: ${resolvedCount} resolved, ${failedCount} errors.`);
    if (resolvedCount > 0 && onSyncComplete) {
      onSyncComplete();
    }
  };

  // Format type badge details
  const getTypeBadge = (type: string, meta?: any) => {
    const t = (type || '').toUpperCase();
    const subType = (meta?.payment_type || meta?.type || '').toUpperCase();

    if (t.includes('PURCHASE') || t === 'SALE' || subType.includes('PURCHASE') || t === 'TRACK_PURCHASE') {
      return {
        label: 'Song Purchase',
        icon: <Music2 size={13} className="text-[#00A3FF]" />,
        badgeClass: 'bg-[#00A3FF]/10 text-[#00A3FF] border-[#00A3FF]/20',
      };
    }
    if (t.includes('LISTENER') || subType.includes('LISTENER')) {
      return {
        label: 'Listener Pass',
        icon: <Sparkles size={13} className="text-[#A855F7]" />,
        badgeClass: 'bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/20',
      };
    }
    if (t.includes('ARTIST_') || subType.includes('ARTIST_')) {
      return {
        label: 'Artist Tier',
        icon: <Flame size={13} className="text-[#F97316]" />,
        badgeClass: 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20',
      };
    }
    if (t.includes('TIP') || t === 'DONATION' || subType.includes('TIP')) {
      return {
        label: 'Tip',
        icon: <Heart size={13} className="text-[#EC4899]" />,
        badgeClass: 'bg-[#EC4899]/10 text-[#EC4899] border-[#EC4899]/20',
      };
    }
    if (t.includes('FAN_SUB') || subType.includes('FAN_SUB')) {
      return {
        label: 'Fan Sub',
        icon: <Users size={13} className="text-[#3B82F6]" />,
        badgeClass: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20',
      };
    }
    if (t.includes('AD') || subType.includes('AD')) {
      return {
        label: 'Audio Ad',
        icon: <Radio size={13} className="text-[#EAB308]" />,
        badgeClass: 'bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/20',
      };
    }
    return {
      label: type || 'Payment',
      icon: <CreditCard size={13} className="text-[#9CA3AF]" />,
      badgeClass: 'bg-white/5 text-[#D1D5DB] border-white/10',
    };
  };

  // Filtered transactions based on search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(t => {
      const refMatch = t.paychangu_ref?.toLowerCase().includes(q);
      const fanMatch = t.fan?.full_name?.toLowerCase().includes(q) || 
                       t.fan?.stage_name?.toLowerCase().includes(q) || 
                       t.fan?.email?.toLowerCase().includes(q);
      const artistMatch = t.artist?.stage_name?.toLowerCase().includes(q) || 
                          t.artist?.full_name?.toLowerCase().includes(q);
      const titleMatch = t.metadata?.title?.toLowerCase().includes(q) || 
                         t.description?.toLowerCase().includes(q);
      const typeMatch = t.type?.toLowerCase().includes(q);
      return refMatch || fanMatch || artistMatch || titleMatch || typeMatch;
    });
  }, [transactions, searchQuery]);

  const pendingCount = useMemo(() => {
    return transactions.filter(t => t.status === 'pending').length;
  }, [transactions]);

  return (
    <div className={`bg-[#141414] border border-white/10 rounded-[18px] p-5 lg:p-6 text-white ${compact ? 'shadow-lg' : ''}`}>
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-[#EAB308]/15 border border-[#EAB308]/30 flex items-center justify-center text-[#EAB308]">
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">Payment Troubleshooter</h3>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EAB308]/20 text-[#EAB308] border border-[#EAB308]/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308] animate-pulse" />
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#A3A3A3] mt-0.5">
                Audit stuck or pending PayChangu payments, manually verify references, and force grant user purchases.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => fetchTransactions()}
            disabled={loading || batchSyncing}
            className="flex items-center gap-1.5 h-9 px-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-[10px] transition-colors text-[12px] font-semibold disabled:opacity-50"
            title="Refresh list from database"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => handleBatchSync(false)}
            disabled={batchSyncing || loading || pendingCount === 0}
            className="flex items-center gap-1.5 h-9 px-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-[10px] transition-colors text-[12px] disabled:opacity-50 border border-white/10"
            title="Query PayChangu gateway for all pending transactions"
          >
            <RefreshCw size={13} className={batchSyncing ? 'animate-spin' : ''} />
            {batchSyncing 
              ? `Syncing (${batchProgress.current}/${batchProgress.total})...` 
              : `Verify Gateway All (${pendingCount})`}
          </button>

          <button
            onClick={() => handleBatchSync(true)}
            disabled={batchSyncing || loading || pendingCount === 0}
            className="flex items-center gap-1.5 h-9 px-4 bg-[#22C55E] hover:bg-[#16A34A] text-black font-semibold rounded-[10px] transition-colors text-[12px] disabled:opacity-50 shadow-md shadow-[#22C55E]/20"
            title="Admin Override: Immediately fulfill rights and grant access for all pending transactions"
          >
            <Zap size={14} className={batchSyncing ? 'animate-spin' : ''} />
            {batchSyncing 
              ? `Granting (${batchProgress.current}/${batchProgress.total})...` 
              : `Force Grant All (${pendingCount})`}
          </button>
        </div>
      </div>

      {/* Manual Reference Lookup Toolbar */}
      <div className="mt-5 p-4 rounded-[12px] bg-white/[0.03] border border-white/5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              value={manualRefInput}
              onChange={(e) => setManualRefInput(e.target.value)}
              placeholder="Enter exact transaction reference to force-verify or grant (e.g. SMA-ab12cd-1725...)"
              className="w-full h-10 pl-9 pr-4 bg-[#0A0A0A] border border-white/10 rounded-[10px] text-[13px] text-white placeholder-[#666666] focus:outline-none focus:border-[#00A3FF] font-mono"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => handleManualForceSync(e, false)}
              disabled={manualSyncing || !manualRefInput.trim()}
              className="flex-1 sm:flex-none h-10 px-3.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-[10px] font-semibold text-[12px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
              title="Query PayChangu Gateway to check if paid, and fulfill if confirmed"
            >
              <RefreshCw size={13} className={manualSyncing ? 'animate-spin' : ''} />
              {manualSyncing ? 'Checking...' : 'Verify Gateway'}
            </button>

            <button
              type="button"
              onClick={(e) => handleManualForceSync(e, true)}
              disabled={manualSyncing || !manualRefInput.trim()}
              className="flex-1 sm:flex-none h-10 px-4 bg-[#22C55E]/20 hover:bg-[#22C55E]/30 border border-[#22C55E]/40 text-[#4ADE80] rounded-[10px] font-semibold text-[12px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
              title="Admin Override: Immediately grant song/subscription/tier access in database and mark completed"
            >
              <CheckCircle2 size={14} />
              Force Grant Access
            </button>
          </div>
        </div>

        {/* Manual Verification Result Card */}
        {manualResult && (
          <div className={`mt-3 p-3 rounded-[10px] text-[12px] border flex items-start justify-between gap-3 ${
            manualResult.status === 'completed'
              ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#86EFAC]'
              : manualResult.status === 'failed'
              ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#FCA5A5]'
              : 'bg-[#EAB308]/10 border-[#EAB308]/30 text-[#FDE047]'
          }`}>
            <div className="flex items-start gap-2">
              {manualResult.status === 'completed' ? (
                <CheckCircle2 size={16} className="text-[#22C55E] shrink-0 mt-0.5" />
              ) : manualResult.status === 'failed' ? (
                <XCircle size={16} className="text-[#EF4444] shrink-0 mt-0.5" />
              ) : (
                <Info size={16} className="text-[#EAB308] shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-semibold uppercase tracking-wider block text-[11px]">
                  Result: {manualResult.status}
                </span>
                <p className="mt-0.5 leading-relaxed">{manualResult.message}</p>
              </div>
            </div>
            <button 
              onClick={() => setManualResult(null)}
              className="text-white/60 hover:text-white text-[11px] p-1 underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter status tabs */}
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-[10px] w-full sm:w-auto">
          <button
            onClick={() => setFilterState('pending')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              filterState === 'pending' 
                ? 'bg-[#EAB308]/20 text-[#EAB308] border border-[#EAB308]/30 shadow-sm' 
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
            Pending Only ({transactions.filter(t => t.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilterState('failed')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              filterState === 'failed' 
                ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 shadow-sm' 
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            Failed
          </button>
          <button
            onClick={() => setFilterState('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              filterState === 'all' 
                ? 'bg-white/15 text-white border border-white/20 shadow-sm' 
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            All Unresolved
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ref, fan, song..."
            className="w-full h-8 pl-8 pr-3 bg-white/5 border border-white/10 rounded-[8px] text-[12px] text-white placeholder-[#737373] focus:outline-none focus:border-[#00A3FF]"
          />
        </div>
      </div>

      {/* Mobile Card List (Visible on small screens) */}
      <div className="mt-4 space-y-3 md:hidden">
        {loading ? (
          <div className="py-8 text-center text-[#737373] bg-[#0A0A0A] rounded-[12px] border border-white/10">
            <RefreshCw size={20} className="animate-spin text-[#00A3FF] mx-auto mb-2" />
            <span>Loading unresolved transactions...</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-8 text-center bg-[#0A0A0A] rounded-[12px] border border-white/10 p-4">
            <CheckCircle2 size={20} className="text-[#22C55E] mx-auto mb-2" />
            <p className="text-white font-medium text-[13px]">No Unresolved Transactions Found</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const entitlement = getEntitlementSummary(tx);
            const isSyncingThis = syncingMap[tx.id] || false;
            const isCompleted = tx.status === 'completed';
            const isFailed = tx.status === 'failed';

            return (
              <div key={tx.id} className="p-3.5 rounded-[12px] bg-[#0A0A0A] border border-white/10 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-white text-[12px] block select-all">
                        {tx.paychangu_ref || 'N/A'}
                      </span>
                      {tx.paychangu_ref && (
                        <button
                          onClick={() => handleCopyRef(tx.paychangu_ref)}
                          className="p-1 text-[#737373] hover:text-white"
                        >
                          {copiedRef === tx.paychangu_ref ? <Check size={11} className="text-[#22C55E]" /> : <Copy size={11} />}
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-[#737373]">
                      {tx.created_at ? formatDistanceToNow(new Date(tx.created_at), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  {isCompleted ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Completed
                    </span>
                  ) : isFailed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 flex items-center gap-1">
                      <XCircle size={10} /> Failed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAB308]/15 text-[#EAB308] border border-[#EAB308]/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308] animate-pulse" /> Pending
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[12px] pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1 text-[#A3A3A3] truncate max-w-[200px]">
                    {entitlement.icon}
                    <span className="truncate text-white/90 font-medium">{entitlement.target}</span>
                  </div>
                  <span className="font-mono font-semibold text-white">
                    MK {Math.round(Number(tx.gross_amount || 0)).toLocaleString()}
                  </span>
                </div>

                <div className="text-[11px] text-[#737373] flex items-center justify-between">
                  <span>Fan: {tx.fan?.stage_name || tx.fan?.full_name || tx.metadata?.first_name || 'Anonymous'}</span>
                  <span>{tx.fan?.email || tx.metadata?.email || ''}</span>
                </div>

                {/* Mobile Action Buttons */}
                <div className="pt-1 flex items-center gap-2">
                  {isCompleted ? (
                    <span className="text-[11px] font-medium text-[#22C55E] bg-[#22C55E]/10 px-2.5 py-1.5 rounded-[8px] border border-[#22C55E]/20 flex-1 text-center">
                      Access Active ✅
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleForceSync(tx)}
                        disabled={isSyncingThis || !tx.paychangu_ref}
                        className="flex-1 h-8 rounded-[8px] text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={isSyncingThis ? 'animate-spin' : ''} />
                        Verify Gateway
                      </button>
                      <button
                        onClick={() => handleForceGrant(tx)}
                        disabled={isSyncingThis || !tx.paychangu_ref}
                        className="flex-1 h-8 rounded-[8px] text-[11px] font-bold bg-[#22C55E] hover:bg-[#16A34A] text-black shadow-md flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} />
                        Force Grant
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Transactions Table */}
      <div className="mt-4 hidden md:block overflow-x-auto rounded-[12px] border border-white/10 bg-[#0A0A0A]">
        <table className="w-full text-left text-[13px] whitespace-nowrap">
          <thead className="bg-[#171717] border-b border-white/10 text-[11px] font-semibold tracking-wider text-[#737373] uppercase">
            <tr>
              <th className="px-4 py-3">Reference / ID</th>
              <th className="px-4 py-3">Type & Entitlement</th>
              <th className="px-4 py-3">Customer / Fan</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Age / Created</th>
              <th className="px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions & Grants</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#737373]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw size={20} className="animate-spin text-[#00A3FF]" />
                    <span>Loading unresolved transactions...</span>
                  </div>
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-[#737373]">
                    <div className="w-10 h-10 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center text-[#22C55E] mb-1">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="text-white font-medium text-[14px]">No Unresolved Transactions Found</p>
                    <p className="text-[12px] max-w-sm text-[#888888]">
                      {filterState === 'pending' 
                        ? 'Great news! There are currently no pending payments stuck in the pipeline.' 
                        : 'No records matching the selected filter criteria.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const typeInfo = getTypeBadge(tx.type, tx.metadata);
                const entitlement = getEntitlementSummary(tx);
                const isSyncingThis = syncingMap[tx.id] || false;
                const isCompleted = tx.status === 'completed';
                const isFailed = tx.status === 'failed';

                return (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Reference column */}
                    <td className="px-4 py-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-[12px] select-all">
                          {tx.paychangu_ref || 'N/A'}
                        </span>
                        {tx.paychangu_ref && (
                          <button
                            onClick={() => handleCopyRef(tx.paychangu_ref)}
                            className="p-1 text-[#737373] hover:text-white transition-colors rounded hover:bg-white/10"
                            title="Copy reference"
                          >
                            {copiedRef === tx.paychangu_ref ? (
                              <Check size={12} className="text-[#22C55E]" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                      </div>
                      {tx.metadata?.failure_reason && (
                        <span className="text-[10px] text-[#EF4444] block truncate max-w-xs" title={tx.metadata?.failure_reason}>
                          {tx.metadata.failure_reason}
                        </span>
                      )}
                    </td>

                    {/* Payment Type & Entitlement */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-[11px] font-semibold border ${typeInfo.badgeClass}`}>
                          {typeInfo.icon}
                          {typeInfo.label}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-[#A3A3A3] font-medium max-w-[200px] truncate" title={entitlement.target}>
                          {entitlement.icon}
                          <span className="truncate">{entitlement.target}</span>
                        </div>
                      </div>
                    </td>

                    {/* Customer / Target */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-white text-[13px]">
                          {tx.fan?.stage_name || tx.fan?.full_name || tx.metadata?.first_name || 'Anonymous Fan'}
                        </span>
                        <span className="text-[11px] text-[#888888] truncate max-w-[180px]">
                          {tx.fan?.email || tx.metadata?.email || (tx.artist ? `Artist: ${tx.artist.stage_name || tx.artist.full_name}` : tx.metadata?.title || 'System')}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-white text-[13px]">
                        MK {Math.round(Number(tx.gross_amount || 0)).toLocaleString()}
                      </div>
                      {tx.net_amount && tx.net_amount !== tx.gross_amount && (
                        <span className="text-[11px] text-[#737373] font-mono">
                          Net: MK {Math.round(Number(tx.net_amount)).toLocaleString()}
                        </span>
                      )}
                    </td>

                    {/* Age / Created Date */}
                    <td className="px-4 py-3 text-[12px] text-[#A3A3A3]">
                      <div className="flex items-center gap-1 text-white/80">
                        <Clock size={12} className="text-[#737373]" />
                        <span>
                          {tx.created_at ? formatDistanceToNow(new Date(tx.created_at), { addSuffix: true }) : 'N/A'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#666666] block">
                        {tx.created_at ? format(new Date(tx.created_at), 'MMM d, HH:mm') : ''}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                          <CheckCircle2 size={12} />
                          Completed
                        </span>
                      ) : isFailed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                          <XCircle size={12} />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAB308]/15 text-[#EAB308] border border-[#EAB308]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308] animate-pulse" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isCompleted ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-[#22C55E] bg-[#22C55E]/10 px-2 py-1 rounded-[6px] border border-[#22C55E]/20">
                              Access Active
                            </span>
                            <button
                              onClick={() => handleForceSync(tx)}
                              disabled={isSyncingThis || !tx.paychangu_ref}
                              className="h-7 px-2 bg-white/5 hover:bg-white/10 text-[#A3A3A3] hover:text-white border border-white/10 rounded-[6px] text-[11px] transition-colors"
                              title="Re-check gateway status"
                            >
                              <RefreshCw size={11} className={isSyncingThis ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleForceSync(tx)}
                              disabled={isSyncingThis || !tx.paychangu_ref}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[7px] text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all disabled:opacity-50"
                              title="Check PayChangu gateway and fulfill if paid"
                            >
                              <RefreshCw size={11} className={isSyncingThis ? 'animate-spin' : ''} />
                              Force Sync
                            </button>

                            <button
                              onClick={() => handleForceGrant(tx)}
                              disabled={isSyncingThis || !tx.paychangu_ref}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[7px] text-[11px] font-semibold bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#4ADE80] border border-[#22C55E]/30 transition-all active:scale-95 disabled:opacity-50"
                              title="Admin Override: Directly fulfill this right (song purchase, subscription, or tier) and mark as completed"
                            >
                              <CheckCircle2 size={12} />
                              Force Grant
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Troubleshooter Footer Tips */}
      <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-[#737373]">
        <div className="flex items-center gap-2">
          <Info size={13} className="text-[#00A3FF] shrink-0" />
          <span>
            <strong>"Force Sync"</strong> queries PayChangu's gateway API to verify real payment. <strong>"Force Grant"</strong> is an Admin Override that immediately unlocks the song, tier, or subscription for the user in the database.
          </span>
        </div>
        <span className="text-[#A3A3A3] font-mono">
          Showing {filteredTransactions.length} of {transactions.length} loaded records
        </span>
      </div>
    </div>
  );
};
