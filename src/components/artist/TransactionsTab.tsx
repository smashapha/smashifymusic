import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { verifyPayment } from '../../lib/paychangu';
import { Loader2, Receipt, Music2, Heart, Sparkles, DollarSign, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const TransactionsTab = ({ userProfile }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userProfile?.id) return;
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          gross_amount,
          net_amount,
          status,
          created_at,
          metadata,
          fan:user_profiles!fan_id(full_name, stage_name, avatar_url)
        `)
        .eq('artist_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback if foreign key fails
        const { data: fallbackData } = await supabase
          .from('transactions')
          .select('*')
          .eq('artist_id', userProfile.id)
          .order('created_at', { ascending: false });
        
        if (fallbackData) {
          // fetch fans manually
          const fanIds = Array.from(new Set(fallbackData.map(t => t.fan_id).filter(Boolean)));
          let fans = {};
          if (fanIds.length > 0) {
            const { data: fansData } = await supabase.from('user_profiles').select('id, full_name, stage_name, avatar_url').in('id', fanIds);
            fansData?.forEach(f => fans[f.id] = f);
          }
          const merged = fallbackData.map(t => ({
             ...t,
             fan: t.fan_id ? fans[t.fan_id] : null
          }));
          setTransactions(merged);
        }
      } else {
        setTransactions(data || []);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [userProfile?.id]);

  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleVerify = async (tx: any) => {
    if (!tx.paychangu_ref) {
      toast.error('Missing payment reference for verification');
      return;
    }
    try {
      setVerifyingId(tx.id);
      await verifyPayment(tx.paychangu_ref);
      toast.success('Payment verified successfully!');
      
      // Update local state
      setTransactions(prev => prev.map(t => 
        t.id === tx.id ? { ...t, status: 'completed' } : t
      ));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Verification failed. Payment may still be pending.');
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  const getTransactionInfo = (tx: any) => {
    const typeLabel = (tx.type || '').toLowerCase();
    
    if (typeLabel.includes('purchase') || typeLabel === 'sale') {
      return {
        icon: <Music2 className="text-[#0EA5E9]" size={20} />,
        label: 'Song Purchase',
        color: 'text-[#0EA5E9]',
        bg: 'bg-[#0EA5E9]/10'
      };
    }
    
    if (typeLabel.includes('tip') || typeLabel === 'donation') {
      return {
        icon: <Heart className="text-pink-500" size={20} />,
        label: 'Tip Received',
        color: 'text-pink-500',
        bg: 'bg-pink-500/10'
      };
    }

    if (typeLabel.includes('subscription')) {
      return {
        icon: <Sparkles className="text-yellow-500" size={20} />,
        label: 'Subscription',
        color: 'text-yellow-500',
        bg: 'bg-yellow-500/10'
      };
    }

    return {
      icon: <Receipt className="text-slate-500" size={20} />,
      label: 'Transaction',
      color: 'text-slate-500',
      bg: 'bg-slate-500/10'
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary">Transaction History</h2>
      </div>

      <div className="bg-bg-surface rounded-2xl border border-border-subtle overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-12 md:p-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[#0EA5E9]/10 rounded-full flex items-center justify-center mb-6">
              <DollarSign className="w-8 h-8 text-[#0EA5E9]" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">No earnings yet</h3>
            <p className="text-text-secondary max-w-sm">
              Your transaction history will appear here once fans start buying your music, subscribing, or sending tips.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {transactions.map(tx => {
              const info = getTransactionInfo(tx);
              const fanName = tx.fan?.stage_name || tx.fan?.full_name || 'Anonymous Fan';
              
              return (
                <div key={tx.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-bg-elevated transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${info.bg}`}>
                      {info.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary mb-1">
                        {info.label} from {fanName}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {new Date(tx.created_at).toLocaleDateString()} at {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center space-x-4">
                    <div className="flex flex-col items-end">
                      <div className="text-lg font-bold text-text-primary">
                        +MK {Number(tx.net_amount || tx.gross_amount).toFixed(2)}
                      </div>
                      <div className={`text-xs capitalize font-medium ${
                        tx.status === 'completed' || tx.status === 'success' 
                          ? 'text-green-500' 
                          : tx.status === 'pending'
                            ? 'text-yellow-500'
                            : 'text-red-500'
                      }`}>
                        {tx.status}
                      </div>
                    </div>
                    {tx.status === 'pending' && (
                      <button
                        onClick={() => handleVerify(tx)}
                        disabled={verifyingId === tx.id}
                        className="p-2 ml-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 rounded-lg transition-colors cursor-pointer"
                        title="Verify Payment Status manually"
                      >
                        <RefreshCw size={16} className={verifyingId === tx.id ? 'animate-spin' : ''} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
