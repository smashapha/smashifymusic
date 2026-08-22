import React, { useState, useMemo } from 'react';
import { 
  CreditCard, Clock, Bell, AlertTriangle, CheckCircle2, 
  Send, RefreshCw, ShieldCheck, Flame, Search, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

export const AdminBilling = ({ 
  artists, 
  onRefresh 
}: { 
  artists: any[]; 
  onRefresh?: () => void;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'expiring_soon' | 'active' | 'expired'>('all');
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  // Filter artists that have a subscription or paid tier
  const subscriptionList = useMemo(() => {
    const now = Date.now();

    return artists
      .filter(a => (a.artist_tier && a.artist_tier !== 'Free') || a.subscription_ends)
      .map(a => {
        const subDate = a.subscription_ends ? new Date(a.subscription_ends).getTime() : null;
        const daysLeft = subDate ? Math.ceil((subDate - now) / (1000 * 60 * 60 * 24)) : 0;
        
        let status: 'active' | 'expiring' | 'expired' = 'active';
        if (daysLeft < 0) status = 'expired';
        else if (daysLeft <= 7) status = 'expiring';

        const isChurned = daysLeft < -7;

        return {
          ...a,
          daysLeft,
          status,
          isChurned
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [artists]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptionList.filter(s => {
      if (filterState === 'expiring_soon' && (s.daysLeft > 7 || s.daysLeft < 0)) return false;
      if (filterState === 'active' && s.status !== 'active') return false;
      if (filterState === 'expired' && s.status !== 'expired') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (s.stage_name && s.stage_name.toLowerCase().includes(q)) ||
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
    });
  }, [subscriptionList, filterState, searchQuery]);

  // Urgent renewal queue (expiring in <= 3 days or expired < 7 days)
  const renewalQueue = useMemo(() => {
    return subscriptionList.filter(s => s.daysLeft <= 3 && s.daysLeft >= -7);
  }, [subscriptionList]);

  const handleSendRenewalNotification = async (artist: any) => {
    setNotifyingId(artist.id);
    try {
      const days = artist.daysLeft;
      const message = days > 0
        ? `Your studio subscription (${artist.artist_tier || 'tier'}) renews in ${days} day${days === 1 ? '' : 's'} — renew to keep your upload slots and premium features active.`
        : `Your studio subscription has expired. Renew today to reactivate your upload slots.`;

      const { error } = await supabase.from('notifications').insert({
        profile_id: artist.id,
        user_type: 'artist',
        type: 'system_alert',
        message,
        link: '/pricing'
      });

      if (error) throw error;
      toast.success(`Renewal reminder sent to ${artist.stage_name || artist.full_name}`);
    } catch (err: any) {
      toast.error('Failed to dispatch notification: ' + err.message);
    } finally {
      setNotifyingId(null);
    }
  };

  const handleNotifyAllExpiring = async () => {
    if (renewalQueue.length === 0) return toast.error('No artists in urgent renewal queue');
    if (!confirm(`Send renewal reminders to all ${renewalQueue.length} artists?`)) return;

    try {
      const payloads = renewalQueue.map(a => {
        const days = a.daysLeft;
        const message = days > 0
          ? `Your studio subscription (${a.artist_tier || 'tier'}) renews in ${days} days — renew to keep your upload slots.`
          : `Your studio subscription has expired. Renew today to keep your catalog active.`;

        return {
          profile_id: a.id,
          user_type: 'artist',
          type: 'system_alert',
          message,
          link: '/pricing'
        };
      });

      const { error } = await supabase.from('notifications').insert(payloads);
      if (error) throw error;
      toast.success(`Dispatched reminders to ${renewalQueue.length} artists`);
    } catch (err: any) {
      toast.error('Failed to notify queue: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Urgent Renewal Queue Header */}
      {renewalQueue.length > 0 && (
        <div className="p-5 bg-[#1A1A1A] border border-[#F59E0B]/30 rounded-[16px] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] shrink-0">
                <Clock size={16} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">Renewal Action Queue</h3>
                <p className="text-[11px] text-[#737373]">
                  {renewalQueue.length} artist(s) expiring within 3 days or recently expired.
                </p>
              </div>
            </div>

            <button
              onClick={handleNotifyAllExpiring}
              className="px-4 py-2 bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-black font-semibold rounded-[10px] text-[13px] flex items-center justify-center gap-1.5 transition-colors shrink-0"
            >
              <Bell size={14} />
              Notify All in Queue
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {renewalQueue.slice(0, 6).map(artist => (
              <div key={artist.id} className="p-3.5 bg-white/5 border border-white/5 rounded-[12px] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{artist.stage_name || artist.full_name}</p>
                  <p className="text-[11px] font-mono text-[#EF4444]">
                    {artist.daysLeft > 0 ? `${artist.daysLeft} days remaining` : `Expired ${Math.abs(artist.daysLeft)}d ago`}
                  </p>
                </div>

                <button
                  onClick={() => handleSendRenewalNotification(artist)}
                  disabled={notifyingId === artist.id}
                  className="px-2.5 py-1.5 bg-[#00A3FF]/15 border border-[#00A3FF]/30 text-[#00A3FF] hover:bg-[#00A3FF]/25 rounded-[8px] text-[11px] font-semibold transition-colors shrink-0"
                >
                  {notifyingId === artist.id ? 'Sending...' : 'Notify'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscriptions Table Card */}
      <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search subscriptions by artist name..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#00A3FF]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { key: 'all', label: 'All' },
              { key: 'expiring_soon', label: 'Expiring (<7d)' },
              { key: 'active', label: 'Active' },
              { key: 'expired', label: 'Expired' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterState(tab.key as any)}
                className={`px-3 py-1.5 rounded-[10px] text-[12px] font-medium transition-all shrink-0 ${
                  filterState === tab.key
                    ? 'bg-[#00A3FF]/15 border border-[#00A3FF]/30 text-[#00A3FF]'
                    : 'bg-white/5 border border-white/5 text-[#737373] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto no-scrollbar pt-2">
          {filteredSubscriptions.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/10 rounded-[12px]">
              <p className="text-[13px] text-white/50">No subscriptions matching filter.</p>
            </div>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-[#737373]">
                  <th className="pb-3 font-medium">Artist</th>
                  <th className="pb-3 font-medium">Tier</th>
                  <th className="pb-3 font-medium">Expiry Date</th>
                  <th className="pb-3 font-medium text-right">Days Left</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSubscriptions.map(sub => {
                  const isUrgent = sub.daysLeft <= 3 && sub.daysLeft >= 0;
                  const isExpired = sub.daysLeft < 0;

                  return (
                    <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-medium text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center font-bold text-white text-[11px] overflow-hidden">
                            {sub.avatar_url ? <img src={sub.avatar_url} alt="" className="w-full h-full object-cover" /> : (sub.stage_name || sub.full_name || 'A')[0]}
                          </div>
                          <span>{sub.stage_name || sub.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-white/80 text-[11px] font-medium">
                          {sub.artist_tier || 'Free'}
                        </span>
                      </td>
                      <td className="py-3 text-[#737373] text-[12px]">
                        {sub.subscription_ends ? format(new Date(sub.subscription_ends), 'MMM dd, yyyy') : 'No expiry'}
                      </td>
                      <td className="py-3 text-right font-mono">
                        <span className={isUrgent ? 'text-[#EF4444] font-bold' : isExpired ? 'text-white/40' : 'text-[#22C55E]'}>
                          {isExpired ? `-${Math.abs(sub.daysLeft)}d` : `${sub.daysLeft}d`}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {sub.isChurned ? (
                          <span className="px-2 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444] text-[11px] font-medium uppercase">
                            Churned
                          </span>
                        ) : sub.status === 'expiring' ? (
                          <span className="px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] text-[11px] font-medium uppercase">
                            Expiring
                          </span>
                        ) : sub.status === 'expired' ? (
                          <span className="px-2 py-0.5 rounded bg-white/10 text-white/50 text-[11px] font-medium uppercase">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E] text-[11px] font-medium uppercase">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleSendRenewalNotification(sub)}
                          disabled={notifyingId === sub.id}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/80 rounded-[8px] text-[11px] font-medium transition-colors"
                        >
                          {notifyingId === sub.id ? '...' : 'Remind'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
