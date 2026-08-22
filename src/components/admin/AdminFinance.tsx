import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, 
  Clock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export const AdminFinance = ({ 
  onNavigateToPayouts 
}: { 
  onNavigateToPayouts?: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [payables, setPayables] = useState<any[]>([]);
  const [ledgerRows, setLedgerRows] = useState<any[]>([]);
  const [mrrData, setMrrData] = useState<{ mrr: number; subscribers: number }>({ mrr: 0, subscribers: 0 });

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch payables_view
      let payablesData: any[] = [];
      try {
        const { data, error } = await supabase.from('payables_view').select('*');
        if (!error && data) payablesData = data;
      } catch {
        // Fallback: fetch from payout_requests and agent_commissions
      }

      if (payablesData.length === 0) {
        // Fallback query
        const [{ data: payouts }, { data: comms }] = await Promise.all([
          supabase.from('payout_requests').select('*, profiles!artist_id(stage_name, full_name)').eq('status', 'pending'),
          supabase.from('agent_commissions').select('*, agents(user_id, user_profiles(full_name))').eq('status', 'pending')
        ]);

        const formattedPayouts = (payouts || []).map((p: any) => ({
          kind: 'Artist Payout',
          person_name: p.profiles?.stage_name || p.profiles?.full_name || 'Artist',
          amount: Number(p.amount || 0),
          created_at: p.created_at,
          days_outstanding: Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
        }));

        const formattedComms = (comms || []).map((c: any) => ({
          kind: 'Agent Commission',
          person_name: c.agents?.user_profiles?.full_name || 'Agent',
          amount: Number(c.amount || 0),
          created_at: c.created_at,
          days_outstanding: Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
        }));

        payablesData = [...formattedPayouts, ...formattedComms];
      }

      setPayables(payablesData);

      // 2. Fetch ledger_view / transactions
      let transactionsData: any[] = [];
      try {
        const { data, error } = await supabase.from('ledger_view').select('*').limit(200);
        if (!error && data) transactionsData = data;
      } catch {
        // Fallback: transactions
      }

      if (transactionsData.length === 0) {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(200);
        transactionsData = data || [];
      }
      setLedgerRows(transactionsData);

      // 3. Fetch MRR
      try {
        const { data: mrrRows } = await supabase.from('mrr_view').select('*').single();
        if (mrrRows) {
          setMrrData({
            mrr: Number(mrrRows.monthly_total || mrrRows.mrr || 0),
            subscribers: Number(mrrRows.subscriber_count || mrrRows.subscribers || 0)
          });
        }
      } catch {
        // Fallback: estimate MRR from profiles with paid tier
        const { data: paidArtists } = await supabase
          .from('profiles')
          .select('artist_tier')
          .neq('artist_tier', 'Free')
          .not('subscription_ends', 'is', null);

        const tierPricing: Record<string, number> = {
          'Rising Star': 8000,
          'Standard': 15000,
          'Elite': 30000,
          'Label': 60000
        };

        const totalMRR = (paidArtists || []).reduce((acc: number, a: any) => acc + (tierPricing[a.artist_tier] || 8000), 0);
        setMrrData({
          mrr: totalMRR,
          subscribers: paidArtists?.length || 0
        });
      }

    } catch (err: any) {
      console.error('Error fetching finance cockpit data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute Revenue breakdown from ledgerRows
  const revenueBreakdown = useMemo(() => {
    const breakdown = {
      tips: 0,
      sales: 0,
      subscriptions: 0,
      other: 0,
      totalGross: 0,
      platformFees: 0
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    for (const row of ledgerRows) {
      const gross = Number(row.gross_amount || row.gross || row.amount || 0);
      const fee = Number(row.platform_fee || (gross * 0.05));
      const type = (row.transaction_type || row.type || '').toLowerCase();
      const rowDate = new Date(row.created_at || Date.now()).getTime();

      if (rowDate >= startOfMonth) {
        breakdown.totalGross += gross;
        breakdown.platformFees += fee;
      }

      if (type.includes('tip')) breakdown.tips += gross;
      else if (type.includes('sale') || type.includes('purchase')) breakdown.sales += gross;
      else if (type.includes('sub') || type.includes('studio')) breakdown.subscriptions += gross;
      else breakdown.other += gross;
    }

    return breakdown;
  }, [ledgerRows]);

  const totalPayablesAmount = useMemo(() => {
    return payables.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [payables]);

  const sortedPayables = useMemo(() => {
    return [...payables].sort((a, b) => (b.days_outstanding || 0) - (a.days_outstanding || 0));
  }, [payables]);

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue This Month */}
        <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#737373] font-medium">Revenue This Month</span>
            <div className="w-7 h-7 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
              <DollarSign size={15} />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-white">
            MK {revenueBreakdown.totalGross.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#737373]">Gross transactions processed in current calendar month</p>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#737373] font-medium">Monthly Recurring (MRR)</span>
            <div className="w-7 h-7 rounded-full bg-[#00A3FF]/10 flex items-center justify-center text-[#00A3FF]">
              <TrendingUp size={15} />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-white">
            MK {mrrData.mrr.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#737373]">{mrrData.subscribers} active studio subscribers</p>
        </div>

        {/* Platform Fees */}
        <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#737373] font-medium">Platform Fees (Month)</span>
            <div className="w-7 h-7 rounded-full bg-[#A855F7]/10 flex items-center justify-center text-[#A855F7]">
              <ShieldCheck size={15} />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-[#22C55E]">
            MK {revenueBreakdown.platformFees.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#737373]">Smashify retained commissions & fees</p>
        </div>

        {/* Total Payables */}
        <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#737373] font-medium">Total Payables</span>
            <div className="w-7 h-7 rounded-full bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
              <Wallet size={15} />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-[#F59E0B]">
            MK {totalPayablesAmount.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#737373]">{payables.length} payouts & commissions pending</p>
        </div>
      </div>

      {/* 2-Column Split: Payables Aging Table & Revenue by Source */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payables Aging Table (2 columns) */}
        <div className="lg:col-span-2 p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-white">Outstanding Payables & Aging</h3>
              <p className="text-[11px] text-[#737373] mt-0.5">
                Obligations due to artists and agents sorted by days outstanding.
              </p>
            </div>

            {onNavigateToPayouts && (
              <button
                onClick={onNavigateToPayouts}
                className="text-[12px] text-[#00A3FF] hover:underline flex items-center gap-1 shrink-0"
              >
                Go to Payout Registry
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="overflow-x-auto no-scrollbar">
            {sortedPayables.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-[12px]">
                <CheckCircle2 size={24} className="mx-auto text-[#22C55E] mb-2" />
                <p className="text-[13px] text-white/60">All payables cleared. Zero outstanding obligations.</p>
              </div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-[#737373]">
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Recipient</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                    <th className="pb-3 font-medium text-right">Aging</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedPayables.slice(0, 20).map((p, idx) => {
                    const days = p.days_outstanding || 0;
                    const isOverdue = days > 7;

                    return (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            p.kind?.includes('Artist') ? 'bg-[#00A3FF]/15 text-[#00A3FF]' : 'bg-emerald-500/15 text-emerald-400'
                          }`}>
                            {p.kind || 'Payout'}
                          </span>
                        </td>
                        <td className="py-3 text-white font-medium">
                          {p.person_name || p.name || 'Recipient'}
                        </td>
                        <td className="py-3 text-right font-mono font-semibold text-white">
                          MK {Number(p.amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                            isOverdue
                              ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]'
                              : 'bg-white/5 text-[#737373]'
                          }`}>
                            {days === 0 ? 'Today' : `${days}d ago`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Revenue by Source (1 column) */}
        <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4">
          <div>
            <h3 className="text-[15px] font-semibold text-white">Revenue by Source</h3>
            <p className="text-[11px] text-[#737373] mt-0.5">Historical breakdown across income channels.</p>
          </div>

          <div className="space-y-4 pt-2">
            {[
              { label: 'Fan Tips', amount: revenueBreakdown.tips, color: 'bg-[#00A3FF]' },
              { label: 'Studio Subscriptions', amount: revenueBreakdown.subscriptions, color: 'bg-[#A855F7]' },
              { label: 'Track Sales & Downloads', amount: revenueBreakdown.sales, color: 'bg-[#22C55E]' },
              { label: 'Other / Promotions', amount: revenueBreakdown.other, color: 'bg-white/40' },
            ].map((src, i) => {
              const total = revenueBreakdown.tips + revenueBreakdown.subscriptions + revenueBreakdown.sales + revenueBreakdown.other;
              const percent = total > 0 ? Math.round((src.amount / total) * 100) : 0;

              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-white/80 font-medium">{src.label}</span>
                    <span className="font-mono text-white font-semibold">MK {src.amount.toLocaleString()} ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${src.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-white/5 rounded-[12px] border border-white/5 text-[11px] text-[#737373] mt-4">
            <p>Tips have a flat 5% platform fee (artists keep 95%). Track sales feature tiered artist retainers.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
