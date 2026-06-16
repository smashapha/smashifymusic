import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Wallet, AlertCircle, ShieldCheck, Smartphone, Check, 
  ArrowUpRight, AlertTriangle, Sparkles, Loader2, DollarSign,
  Calendar, Clock, Landmark, Users, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getTierLimits } from '../../lib/tierUtils';

export const WithdrawTab = ({ setActiveTab }: { setActiveTab: (tab: any) => void }) => {
  const { userProfile, refreshProfile } = useAuth();
  
  // States
  const [history, setHistory] = useState<any[]>([]);
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(0);
  const [requesting, setRequesting] = useState(false);
  const [phone, setPhone] = useState(() => userProfile?.phone || '');
  const [verificationPhone, setVerificationPhone] = useState(() => userProfile?.phone || '');
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Verification states (fallback if user is unverified)
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [idType, setIdType] = useState('National ID');
  const [nrcNumber, setNrcNumber] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);

  const detectedNetwork = (() => {
    const cleaned = phone?.replace(/\D/g, '') || '';
    const prefix = cleaned.startsWith('265') ? cleaned.slice(3, 6) : cleaned.slice(0, 3);
    const tnmPrefixes = ['088', '088', '885', '886', '887', '888', '889'];
    const airtelPrefixes = ['099', '098', '097', '096', '091', '990', '991', '992', '993', '994', '995', '996', '997', '998', '999'];
    if (tnmPrefixes.some(p => prefix.startsWith(p.slice(0,3)))) return 'TNM';
    if (airtelPrefixes.some(p => prefix.startsWith(p.slice(0,3)))) return 'AIRTEL';
    // Fallback: 088 = TNM, 099 = Airtel
    return cleaned.startsWith('088') || cleaned.startsWith('088') ? 'TNM' : 'AIRTEL';
  })();

  const balance = Number(userProfile?.wallet_balance || 0);
  const limits = useMemo(() => getTierLimits(userProfile), [
    userProfile?.artist_tier,
    userProfile?.subscription_tier,
    userProfile?.subscription_ends,
    userProfile?.extra_track_slots,
  ]);
  const isVerified = !!userProfile?.is_verified;
  const isPendingVerification = !isVerified && !!userProfile?.nrc_number;

  useEffect(() => {
    fetchPayoutHistory();
    if (userProfile?.phone) {
      setPhone(userProfile.phone);
      setVerificationPhone(userProfile.phone);
    }
  }, [userProfile]);

  const fetchPayoutHistory = async () => {
    if (!userProfile?.id) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('artist_id', userProfile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setHistory(data);
    } catch (err: any) {
      console.error('Error fetching payout history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nrcNumber.trim()) {
      return toast.error('Please enter your ID number');
    }
    if (!verificationPhone.trim()) {
      return toast.error('Please enter the phone number registered with this ID');
    }
    if (!idFile && !userProfile?.id_document_url) {
      return toast.error('Please upload a photo of your ID document');
    }

    setSubmittingVerification(true);
    try {
      let idUrl = userProfile?.id_document_url;

      if (idFile) {
        const fileExt = idFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${userProfile.id}/id-document-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('artist-verifications')
          .upload(fileName, idFile, { upsert: true, contentType: idFile.type });

        if (uploadError) throw new Error(`Document upload failed: ${uploadError.message}`);

        const { data: signedData, error: signedErr } = await supabase.storage
          .from('artist-verifications')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365);

        if (!signedErr && signedData) {
          idUrl = signedData.signedUrl;
        }
      }

      const updateData = {
        id_type: idType,
        nrc_number: nrcNumber,
        phone: verificationPhone,
        ...(idUrl ? { id_document_url: idUrl } : {})
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userProfile?.id);

      if (error) throw error;

      toast.success('Identity verification details submitted successfully!');
      if (refreshProfile) await refreshProfile();
    } catch (err: any) {
      console.error('Verification error:', err);
      toast.error(err.message || 'Failed to submit verification details');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleWithdrawRequest = async () => {
    if (!limits.canWithdraw) {
      toast.error('Free tier accounts cannot withdraw. Please upgrade your Studio Access tier.');
      return;
    }
    if (!isVerified) {
      toast.error('Identity verification is required before initiating payouts.');
      return;
    }
    if (balance < 10000) {
      toast.error('Minimum withdrawal balance is MK 10,000.');
      return;
    }
    if (!withdrawalAmount || withdrawalAmount < 10000) {
      toast.error('Please enter a withdrawal amount of at least MK 10,000.');
      return;
    }
    if (withdrawalAmount > balance) {
      toast.error('Amount exceeds your available balance.');
      return;
    }
    if (!phone) {
      toast.error('Phone number is required for receiving mobile money transfer.');
      return;
    }

    setRequesting(true);
    try {
      // Invoke the payout supabase Edge Function
      const response = await supabase.functions.invoke('process-payout', {
        body: {
          amount: withdrawalAmount,
          phone,
          network: detectedNetwork.toUpperCase()
        }
      });

      if (response.error) {
        console.error("Payout Frontend Invoke Error:", response.error);
        throw new Error(response.error.message || 'Withdrawal request failed');
      }

      toast.success(response.data?.message || 'Withdrawal requested! We will transfer your funds within 24 hours.');
      setWithdrawalAmount(0);
      fetchPayoutHistory();
      if (refreshProfile) await refreshProfile();
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      toast.error(err.message || 'Withdrawal request failed');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto text-left">
      <div>
        <h2 className="text-[28px] md:text-[32px] font-studio font-bold flex items-center justify-start gap-3 uppercase text-text-primary leading-tight">
          <Wallet className="text-smash-purple shrink-0 animate-pulse" /> Wallet & <span className="text-smash-purple">Withdrawals</span>
        </h2>
        <p className="text-text-secondary text-[12px] md:text-[14px] font-sans mt-2">
          Manage your payout settings, verify identity details, and request mobile money transfers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: WALLET BALANCE & WITHDRAW FORM */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* WALLET BALANCE HEADER CARD */}
          <div className="bg-bg-surface border border-border-default rounded-[16px] p-8 relative overflow-hidden group shadow-md bg-gradient-to-br from-bg-surface to-bg-elevated/40">
            <div className="absolute top-0 right-0 w-48 h-48 bg-smash-purple/5 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-smash-purple block mb-2">Available Balance</span>
                <h3 className="text-[36px] md:text-[44px] font-studio font-bold text-white leading-none italic">
                  MK {balance.toLocaleString()}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <div className="px-2.5 py-1 bg-smash-green/10 text-smash-green border border-smash-green/10 rounded-full text-[9px] font-display font-medium uppercase tracking-wider">
                     Payouts Active
                  </div>
                  <div className="px-2.5 py-1 bg-white/5 text-text-muted border border-white/5 rounded-full text-[9px] font-display font-medium uppercase tracking-wider">
                     3% Transfer Fee
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white/5 rounded-[12px] border border-white/5 min-w-[170px]">
                <p className="text-[10px] font-display font-bold text-text-muted uppercase tracking-wider mb-1">Your Tier Status</p>
                <p className="text-[13px] font-display font-bold text-white mb-2 uppercase">
                  {userProfile?.subscription_tier || userProfile?.artist_tier || 'Free'}
                </p>
                {limits.canWithdraw ? (
                  <span className="text-[10px] font-sans text-smash-green font-medium flex items-center gap-1">
                     <Check size={12} /> Standard Withdrawals Active
                  </span>
                ) : (
                  <button 
                    onClick={() => setActiveTab('subscription')}
                    className="text-[10px] text-smash-purple font-bold uppercase tracking-wider hover:underline block text-left"
                  >
                     Upgrade tier to payout &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* PARENT CONTAINER CONDITIONAL FOR VERIFICATION STATUS OR WITHDRAWAL CAPABILITY */}
          {!isVerified ? (
            <div className="bg-bg-surface border border-smash-orange/20 rounded-[14px] p-6 space-y-6 shadow-sm">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-[10px] bg-smash-orange/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="text-smash-orange" size={24} />
                </div>
                <div>
                  <h4 className="text-smash-orange font-studio font-bold uppercase tracking-wider text-sm">
                    {isPendingVerification ? 'Verification Pending Review' : 'Identity Verification Required'}
                  </h4>
                  <p className="text-text-secondary text-xs font-sans mt-1 leading-relaxed">
                    {isPendingVerification
                      ? 'You have successfully submitted your National ID document for verification. Our compliance team is currently reviewing your application. This normally takes up to 24 hours.'
                      : 'To safeguard artist royalties and meet financial regulations, you must provide your National ID details. Once verified, you can instantly withdraw your earnings straight to your Airtel or TNM mobile money account.'
                    }
                  </p>
                </div>
              </div>

              {!isPendingVerification && (
                <form onSubmit={handleVerificationSubmit} className="border-t border-border-default pt-6 space-y-5">
                  <div className="p-3.5 bg-zinc-950/40 border border-white/5 rounded-lg text-[11px] text-text-muted leading-relaxed">
                    <span className="text-smash-orange font-bold uppercase tracking-wider block mb-1">Secure Payout Encryption Note</span>
                    Your verification data is securely stored, highly encrypted, and strictly used to verify payment transfers.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">ID Document Type</label>
                      <select 
                        value={idType} 
                        onChange={e => setIdType(e.target.value)}
                        className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-orange focus:ring-[3px] focus:ring-smash-orange/15 transition-all text-text-primary"
                      >
                        <option value="National ID">Malawi National ID</option>
                        <option value="Passport">Passport</option>
                        <option value="Driver License">Driver's License</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Document Number</label>
                      <input 
                        type="text" 
                        value={nrcNumber}
                        onChange={e => setNrcNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. A1234567" 
                        className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-orange focus:ring-[3px] focus:ring-smash-orange/15 transition-all text-text-primary placeholder:opacity-40" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">ID Registered Phone Number</label>
                      <input 
                        type="text" 
                        value={verificationPhone}
                        onChange={e => setVerificationPhone(e.target.value)}
                        placeholder="e.g. +26599..." 
                        className="w-full h-[44px] bg-bg-elevated border border-border-default px-4 rounded-[10px] text-[14px] font-display outline-none focus:border-smash-orange focus:ring-[3px] focus:ring-smash-orange/15 transition-all text-text-primary placeholder:opacity-40" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Upload ID Photo (Clear scan or snapshot)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => setIdFile(e.target.files?.[0] || null)}
                      className="w-full bg-bg-elevated border border-border-default p-2 rounded-[10px] text-[12px] font-display outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-smash-orange file:text-white hover:file:bg-smash-orange/80 cursor-pointer text-text-muted" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={submittingVerification}
                    className="w-full h-[46px] bg-smash-orange/20 border border-smash-orange/30 hover:border-smash-orange/60 text-smash-orange text-[12px] font-display font-bold uppercase tracking-widest rounded-[10px] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {submittingVerification ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SUBMIT DETAILS FOR VERIFICATION'}
                  </button>
                </form>
              )}
            </div>
          ) : !limits.canWithdraw ? (
            <div className="bg-bg-surface border border-border-default rounded-[14px] p-6 space-y-4 shadow-sm text-center">
              <div className="w-12 h-12 rounded-full bg-smash-purple/10 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="text-smash-purple animate-bounce" size={24} />
              </div>
              <h4 className="text-white font-studio font-bold uppercase tracking-widest text-md">Upgrade to Payout</h4>
              <p className="text-text-secondary text-xs font-sans max-w-sm mx-auto leading-relaxed">
                Your available wallet balance is safe and protected, however payouts are restricted to standard/elite subscribers. Upgrade your tier to activate payouts today!
              </p>
              <button 
                onClick={() => setActiveTab('subscription')} 
                className="px-6 py-2.5 bg-smash-purple hover:bg-smash-purple/90 text-white text-[11px] font-display font-bold uppercase tracking-widest rounded-[10px] transition-all"
              >
                UPGRADE STUDIO ACCESS
              </button>
            </div>
          ) : (
            /* WITHDRAWAL TRANSFER CONTROLS */
            <div className="bg-bg-surface border border-border-default rounded-[14px] p-6 md:p-8 space-y-6 shadow-sm">
              <h4 className="text-white font-studio font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                <Smartphone className="text-smash-purple" size={18} /> Transfer to Mobile Money
              </h4>

              {/* NETWORK SELECTOR */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                  Network Detected:
                </span>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${
                  detectedNetwork === 'TNM'
                    ? 'bg-smash-green/10 text-smash-green border border-smash-green/30'
                    : 'bg-red-500/10 text-red-500 border border-red-500/30'
                }`}>
                  {detectedNetwork === 'TNM' ? 'TNM (Mpamba)' : 'Airtel Money'}
                </span>
              </div>

              {/* PHONE IN */}
              <div>
                <label className="text-[11px] text-text-muted font-display font-medium uppercase tracking-wider block mb-2">Verified Mobile Money Phone Number</label>
                <div className="relative">
                  <input 
                    value={phone || "Not set. Save verified ID registered phone number first."}
                    readOnly
                    className="w-full h-[44px] bg-bg-muted/40 border border-border-default rounded-[10px] px-4 font-display text-[14px] text-text-muted cursor-not-allowed outline-none opacity-80"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px] text-smash-orange font-display font-bold uppercase tracking-widest pointer-events-none">
                    <Lock size={12} className="text-smash-orange opacity-80" /> Locked secure
                  </div>
                </div>
                <p className="text-[10px] text-text-secondary mt-1.5 italic">
                  * This payout recipient number is securely locked after identity verification.
                </p>
              </div>

              {/* AMOUNT IN */}
              <div>
                <label className="text-[11px] text-text-muted font-display font-medium uppercase tracking-wider block mb-2">Withdraw Amount</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={withdrawalAmount || ''} 
                    onChange={e => setWithdrawalAmount(Math.max(0, Number(e.target.value)))}
                    placeholder="Minimum 10,000"
                    className="w-full bg-bg-elevated border border-border-default rounded-[14px] px-4 h-14 font-studio font-bold text-[24px] outline-none focus:border-smash-purple text-text-primary placeholder:text-text-muted"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-display font-semibold uppercase tracking-widest text-text-muted">MWK</div>
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-[10px] text-text-muted uppercase font-semibold">Min: MK 10,000</span>
                  <button 
                    onClick={() => setWithdrawalAmount(balance)}
                    className="text-[10px] text-smash-purple font-medium uppercase tracking-widest hover:underline"
                  >
                    Use Max (MK {balance.toLocaleString()})
                  </button>
                </div>
              </div>

              {/* PLATFORM FEES PREVIEW */}
              {withdrawalAmount >= 10000 && (
                <div className="p-4 bg-bg-elevated/50 border border-border-subtle rounded-[14px] space-y-3 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Network Transfer Fee (3%)</p>
                      <p className="text-[9px] text-smash-gray">Charged by {detectedNetwork} — not a Smashify fee</p>
                    </div>
                    <p className="text-sm font-black text-red-400">-MK {Math.round(withdrawalAmount * 0.03).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <p className="text-xs font-bold text-smash-green">Smashify Fee</p>
                    <p className="text-sm font-black text-smash-green">MK 0 (0%)</p>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[11px] font-display font-bold uppercase tracking-widest text-text-primary">Net Transfer Disbursed</span>
                    <span className="text-[18px] font-studio font-bold text-white">MK {Math.round(withdrawalAmount * 0.97).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* WITHDRAW SUBMIT BUTTON */}
              <button 
                onClick={handleWithdrawRequest}
                disabled={requesting || balance < 10000 || withdrawalAmount < 10000 || withdrawalAmount > balance}
                className="w-full h-[48px] bg-smash-purple text-white rounded-[10px] font-display font-semibold uppercase tracking-widest text-[12px] shadow-sm hover:bg-smash-purple/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {requesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'INITIATE payout REQUEST'}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: RECENT PAYOUT HISTORY */}
        <div className="space-y-6">
          <div className="bg-bg-surface border border-border-default rounded-[14px] p-6 shadow-sm">
            <h3 className="text-[18px] font-studio font-semibold uppercase tracking-tight text-white mb-6">Recent <span className="text-smash-purple">Payouts</span></h3>
            
            {loadingHistory ? (
              <div className="py-12 text-center text-text-muted animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-smash-purple mb-2" />
                <p className="text-[11px] font-display font-medium uppercase tracking-widest">Inquiring ledger...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center text-text-muted">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <Landmark className="text-text-muted/40" size={20} />
                </div>
                <p className="text-xs font-semibold text-white/50 mb-1">No withdrawals filed yet</p>
                <p className="text-[10px] leading-relaxed text-text-muted">Once we dispatch money to your device, the ledger listings status will instantly log here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((req) => (
                  <div key={req.id} className="p-4 bg-bg-elevated/40 border border-white/5 rounded-xl space-y-3 hover:bg-bg-elevated/60 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-sm font-studio font-bold text-white">MK {Number(req.amount || req.requested_amount || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-text-muted mt-1 font-mono uppercase">{req.network} {req.phone}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-display font-bold uppercase tracking-widest ${
                        req.status === 'completed' || req.status === 'success' || req.status === 'approved'
                          ? 'bg-smash-green/10 text-smash-green'
                          : req.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-red-500/10 text-red-400'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[9px] text-text-muted uppercase tracking-wider font-semibold">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} /> {new Date(req.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};
