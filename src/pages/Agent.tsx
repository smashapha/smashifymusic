import React, { useState, useEffect } from 'react';
import { motion } from "motion/react";
import { Clock, Copy, Handshake, Users, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING } from '../lib/layout';
import SEO from '../components/common/SEO';

const Agent = () => {
  const { userProfile, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agentData, setAgentData] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [stats, setStats] = useState({ referred: 0, earned: 0, available: 0 });
  
  // Application Form
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);

  const fetchAgentData = async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userProfile.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching agent data:', error);
      } else {
        setAgentData(data);
        if (data?.status === 'approved') {
          fetchCommissions(data.id, data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissions = async (agentId: string, currentAgentData?: any) => {
    try {
      const { data: comms, error } = await supabase
        .from('agent_commissions')
        .select('*, profiles!artist_id(stage_name, full_name)')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setCommissions(comms || []);
      
      // Calculate stats
      let available = 0;
      let earned = 0;
      const referredSet = new Set();
      
      comms?.forEach(c => {
        const amt = Number(c.commission_amount ?? c.amount) || 0;
        if (c.status === 'pending') available += amt;
        earned += amt;
        if (c.artist_id) referredSet.add(c.artist_id);
      });
      
      // Also get any artists who signed up but haven't paid yet
      const { data: referredProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by_agent_id', agentId);
        
      referredProfiles?.forEach(p => referredSet.add(p.id));
      
      const agentRec = currentAgentData || agentData;
      const totalEarned = (agentRec?.total_earned != null) ? Number(agentRec.total_earned) : earned;
      
      setStats({
        referred: referredSet.size || 0,
        earned: totalEarned || 0,
        available: available || 0
      });
      
    } catch (err) {
      console.error('Error fetching commissions:', err);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, [userProfile?.id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return toast.error('Phone number is required');
    if (!userProfile?.id) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('agents').insert({
        user_id: userProfile.id,
        phone: phone
      });
      
      if (error) {
        if (error.code === '23505') {
          // Already applied, just refresh
          await fetchAgentData();
          return;
        }
        throw error;
      }
      
      toast.success('Application submitted successfully!');
      fetchAgentData();
    } catch (err: any) {
      toast.error('Application failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReapply = async () => {
    if (!userProfile?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('agents')
        .update({ status: 'pending' })
        .eq('user_id', userProfile.id);
        
      if (error) throw error;
      toast.success('Application resubmitted!');
      fetchAgentData();
    } catch (err: any) {
      toast.error('Failed to resubmit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const requestPayout = async () => {
    if (stats.available <= 0) return;
    if (!agentData?.phone) return toast.error('Phone number missing');
    
    setPayoutLoading(true);
    try {
      const { error } = await supabase.rpc('request_agent_payout', {
        p_phone: agentData.phone
      });
      if (error) throw error;
      
      toast.success(`Payout of MK ${(stats.available ?? 0).toLocaleString()} requested!`);
      // Optimistically update UI
      setCommissions(prev => prev.map(c => 
        c.status === 'pending' ? { ...c, status: 'processing' } : c
      ));
      setStats(prev => ({ ...prev, available: 0 }));
    } catch (err: any) {
      toast.error('Failed to request payout: ' + err.message);
    } finally {
      setPayoutLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!agentData?.agent_code) return;
    const url = `https://smashifymusic.vercel.app/auth/artist?ref=${agentData.agent_code}`;
    navigator.clipboard.writeText(url);
    toast.success('Referral link copied');
  };
  
  const shareWhatsApp = () => {
    if (!agentData?.agent_code) return;
    const url = `https://smashifymusic.vercel.app/auth/artist?ref=${agentData.agent_code}`;
    const text = encodeURIComponent(`Join Smashify as an artist: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} max-w-4xl mx-auto space-y-12`}>
        <div className="text-center space-y-4 pt-12">
          <div className="w-48 h-4 bg-white/5 rounded-full mx-auto animate-pulse" />
          <div className="w-64 md:w-96 h-12 bg-white/5 rounded-xl mx-auto animate-pulse" />
          <div className="w-full max-w-lg h-16 bg-white/5 rounded-xl mx-auto animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white/5 rounded-[16px] animate-pulse" />
          ))}
        </div>
        <div className="max-w-md mx-auto h-[300px] bg-white/5 rounded-[16px] animate-pulse" />
      </div>
    );
  }

  // State: NOT APPLIED
  if (!agentData) {
    return (
      <div className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} max-w-4xl mx-auto space-y-12`}>
        <SEO title="Agent Programme | Smashify" description="Refer artists and earn commissions." />
        
        <div className="text-center space-y-4 pt-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A3FF]">
            SMASHIFY AGENT PROGRAMME
          </p>
          <h1 className="text-4xl md:text-5xl font-studio font-black text-white leading-tight">
            Refer artists.<br/>
            Earn <span className="text-[#00A3FF]">commissions.</span>
          </h1>
          <p className="text-[#B0B0B0] max-w-lg mx-auto text-[15px]">
            Join the movement. Bring new talent to Smashify and earn 5% on their first subscription payment.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-[#1A1A1A] border border-white/10 rounded-[16px] text-center space-y-3">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white">1</div>
            <h3 className="text-white font-semibold">Refer an artist</h3>
            <p className="text-[13px] text-[#B0B0B0]">Share your unique referral link with musicians.</p>
          </div>
          <div className="p-6 bg-[#1A1A1A] border border-white/10 rounded-[16px] text-center space-y-3">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white">2</div>
            <h3 className="text-white font-semibold">They subscribe</h3>
            <p className="text-[13px] text-[#B0B0B0]">When their first Rising Star, Standard or Elite payment clears.</p>
          </div>
          <div className="p-6 bg-[#1A1A1A] border border-white/10 rounded-[16px] text-center space-y-3">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-[#00A3FF]">3</div>
            <h3 className="text-white font-semibold">You get paid</h3>
            <p className="text-[13px] text-[#B0B0B0]">5% commission via Airtel Money or TNM Mpamba.</p>
          </div>
        </div>
        
        <div className="max-w-md mx-auto p-6 bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-white/10 rounded-[16px] text-center space-y-2">
          <p className="text-[15px] font-medium text-[#B0B0B0]">10 artists × MK 8,000 Rising Star</p>
          <div className="flex items-center justify-center gap-2 text-xl font-bold">
            <span className="text-white">You earn</span>
            <span className="text-[#22C55E]">MK 4,000</span>
          </div>
        </div>
        
        <form onSubmit={handleApply} className="max-w-md mx-auto p-6 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-5">
          <h3 className="text-lg font-semibold text-white">Apply now</h3>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] block mb-2">
              Mobile Money Number
            </label>
            <input 
              type="tel" 
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+265..." 
              required
              className="w-full h-12 bg-[#0A0A0A] border border-white/10 px-4 rounded-[12px] text-white focus:border-[#00A3FF] focus:ring-1 focus:ring-[#00A3FF] outline-none"
            />
            <p className="text-[11px] text-[#B0B0B0] mt-2">By applying, you agree to our Agent terms of service.</p>
          </div>
          <button 
            type="submit" 
            disabled={submitting}
            className="w-full h-12 bg-[#00A3FF] hover:bg-[#0084D6] text-white font-semibold rounded-[12px] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Applying...' : 'Apply to become an agent'}
          </button>
        </form>
        
        <div className="text-center">
          <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#B0B0B0] hover:text-white transition-colors">
            Questions? WhatsApp +265 88 372 88 68
          </a>
        </div>
      </div>
    );
  }

  // State: PENDING
  if (agentData.status === 'pending') {
    return (
      <div className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} flex flex-col items-center justify-center min-h-[60vh]`}>
        <div className="w-16 h-16 bg-[#00A3FF]/10 rounded-full flex items-center justify-center text-[#00A3FF] mb-6">
          <Clock size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Application under review</h2>
        <p className="text-[#B0B0B0] text-center max-w-sm">
          We review applications within 1–2 days. You'll see your referral link here once approved.
        </p>
      </div>
    );
  }
  
  // State: REJECTED
  if (agentData.status === 'rejected') {
    return (
      <div className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} flex flex-col items-center justify-center min-h-[60vh]`}>
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-[#B0B0B0] mb-6">
          <XCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Application not approved this time</h2>
        <p className="text-[#B0B0B0] text-center max-w-sm mb-6">
          Unfortunately we couldn't approve your application. You can try applying again.
        </p>
        <button 
          onClick={handleReapply}
          disabled={submitting}
          className="px-6 py-2 border border-white/20 text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Apply again'}
        </button>
      </div>
    );
  }

  // State: APPROVED
  return (
    <div className={`${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} max-w-5xl mx-auto space-y-10`}>
      <SEO title="Agent Dashboard | Smashify" description="Manage your referrals and commissions." />
      
      <div className="space-y-3 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A3FF]">
          YOUR AGENT LINK
        </p>
        <h1 className="text-3xl font-studio font-bold text-white">
          Refer artists, earn 5%.
        </h1>
      </div>
      
      {/* Referral Card */}
      <div className="p-6 md:p-8 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-6">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] block mb-2">
            Share this link to claim referrals
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-[12px] px-4 py-3 flex items-center overflow-x-auto">
              <span className="font-mono text-white text-sm whitespace-nowrap">
                https://smashifymusic.vercel.app/auth/artist?ref={agentData.agent_code}
              </span>
            </div>
            <button 
              onClick={copyReferralLink}
              className="px-6 py-3 bg-[#00A3FF] hover:bg-[#0084D6] text-white font-semibold rounded-[12px] transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              <Copy size={16} /> Copy link
            </button>
          </div>
        </div>
        <button 
          onClick={shareWhatsApp}
          className="text-[#25D366] hover:bg-[#25D366]/10 px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
        >
          Share via WhatsApp
        </button>
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] mb-2">Referred artists</p>
          <p className="text-2xl font-mono font-bold text-white">{stats.referred}</p>
        </div>
        <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] mb-2">Total earned</p>
          <p className="text-2xl font-mono font-bold text-white">MK {(stats.earned ?? 0).toLocaleString()}</p>
        </div>
        <div className="p-5 bg-[#1A1A1A] border border-[#00A3FF]/30 bg-[#00A3FF]/5 rounded-[16px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A3FF] mb-2">Available</p>
          <p className="text-2xl font-mono font-bold text-[#00A3FF]">MK {(stats.available ?? 0).toLocaleString()}</p>
        </div>
      </div>
      
      {/* Payout & List */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">Your commissions</h2>
          {stats.available > 0 ? (
            <button 
              onClick={requestPayout}
              disabled={payoutLoading}
              className="px-5 py-2.5 bg-[#00A3FF] hover:bg-[#0084D6] text-white font-semibold rounded-[10px] text-sm transition-colors disabled:opacity-50"
            >
              {payoutLoading ? 'Processing...' : `Request payout (MK ${(stats.available ?? 0).toLocaleString()})`}
            </button>
          ) : (
            <span className="text-sm text-[#B0B0B0]">No pending commissions yet.</span>
          )}
        </div>
        
        {commissions.length === 0 ? (
          <div className="text-center py-12 bg-[#1A1A1A] border border-white/10 rounded-[16px]">
            <Users size={32} className="mx-auto text-[#B0B0B0] mb-3" />
            <p className="text-white font-semibold">No commissions yet</p>
            <p className="text-[#B0B0B0] text-sm mt-1">When your referred artists subscribe, earnings appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {commissions.map(comm => (
              <div key={comm.id} className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-white/10 rounded-[12px]">
                <div>
                  <p className="font-semibold text-white">
                    {comm.profiles?.stage_name || comm.profiles?.full_name || 'Artist'}
                  </p>
                  <p className="text-xs text-[#B0B0B0] mt-0.5">
                    {new Date(comm.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-white">MK {((comm.commission_amount ?? comm.amount) ?? 0).toLocaleString()}</p>
                  <span className={`inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full mt-1 ${
                    comm.status === 'pending' ? 'bg-[#00A3FF]/10 text-[#00A3FF]' :
                    comm.status === 'processing' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-[#22C55E]/10 text-[#22C55E]'
                  }`}>
                    {comm.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
};

export default Agent;
