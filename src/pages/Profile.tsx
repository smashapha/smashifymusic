import React, { useState, useRef, useMemo } from 'react';
import { 
  User, CreditCard, ShoppingBag, LogOut, 
  ChevronRight, BadgeCheck, Shield, ShieldCheck, Sparkles, Mail, Phone, Camera, Upload, Crown, Check, ExternalLink, Loader2
} from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { getListenerTier, getListenerLimits } from '../lib/tierUtils';

const Profile: React.FC = () => {
  const { user, userProfile, signOut, refreshProfile, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tier = useMemo(() => getListenerTier(userProfile), [
    userProfile?.subscription_tier,
    userProfile?.subscription_expires_at,
  ]);
  const limits = useMemo(() => getListenerLimits(userProfile), [
    userProfile?.subscription_tier,
    userProfile?.subscription_expires_at,
    userProfile?.artist_tier,
  ]);
  const [phone, setPhone] = useState(() => userProfile?.phone_number || '');
  const [savingPhone, setSavingPhone] = useState(false);

  const isPaidTier = Boolean(tier && tier !== 'free');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    setPhoneError('');
    setPhoneSuccess(false);
  };

  const handleUpdatePhone = async () => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      return setPhoneError('Enter a valid phone number (e.g. +265...)');
    }
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ phone_number: cleanPhone })
        .eq('id', userProfile?.id);
      if (error) throw error;
      setPhoneSuccess(true);
      toast.success('Phone number updated');
      setTimeout(() => setPhoneSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/listener');
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const updates = {
      full_name: formData.get('full_name') as string,
    };

    try {
      const avatarFile = (e.currentTarget.elements.namedItem('avatar_file') as HTMLInputElement).files?.[0];
      let avatarUrl = userProfile?.avatar_url;

      if (avatarFile) {
        setUploading(true);
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user?.id}/avatar-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        avatarUrl = publicUrl;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          avatar_url: avatarUrl,
        })
        .eq('id', user?.id);
      
      if (error) throw error;
      toast.success('Profile updated');
      if (refreshProfile) refreshProfile();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // e) Loading state
  if (authLoading || (!userProfile && user)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center">
        <div className="w-8 h-8 border-2 border-[#00A3FF] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#B0B0B0] text-[13px]">Loading profile…</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#00A3FF]/10 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF] mb-5">
          <User size={28} />
        </div>
        <h2 className="text-2xl font-studio font-bold text-white mb-2">Access Denied</h2>
        <p className="text-[#B0B0B0] text-[14px] mb-6">Please sign in to view and manage your account profile.</p>
        <button
          onClick={() => navigate('/auth/listener')}
          className="h-11 px-8 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] text-white rounded-[10px] font-semibold text-[14px] shadow-lg shadow-[#00A3FF]/20 hover:brightness-110 active:scale-98 transition-all"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-10 pb-24 px-4 md:px-0 pt-4 md:pt-6">
      {/* a) BANNER & b) AVATAR + c) NAME */}
      <div className="relative mb-20 md:mb-16">
        {/* Static charcoal banner with soft blue corner glow */}
        <div className="w-full h-[120px] md:h-[160px] rounded-[16px] overflow-hidden relative bg-[#1A1A1A] border border-white/10">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#00A3FF]/10 rounded-full blur-3xl pointer-events-none" />
        </div>
        
        {/* Avatar and Name overlapping banner */}
        <div className="absolute -bottom-12 left-1/2 md:left-8 -translate-x-1/2 md:translate-x-0 z-20 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 w-full px-4 md:px-0">
          <div 
            className="w-[100px] h-[100px] md:w-[110px] md:h-[110px] rounded-full border-[4px] border-[#0A0A0A] bg-[#1A1A1A] overflow-hidden relative group cursor-pointer shadow-xl shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Avatar
              src={avatarPreview || userProfile.avatar_url}
              name={userProfile.full_name}
              className="w-full h-full"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white">
              <Camera size={22} />
            </div>
          </div>

          <div className="md:pb-1 text-center md:text-left space-y-1">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
              <h1 className="text-xl md:text-[28px] font-studio font-bold text-white tracking-tight flex items-center gap-2">
                <span>{userProfile.full_name || 'Listener'}</span>
                {userProfile.verified && (
                  <BadgeCheck className="text-[#00A3FF] fill-[#00A3FF]/20 shrink-0" size={22} />
                )}
              </h1>
              {role === 'artist' && (
                <span className="px-2.5 py-0.5 bg-[#00A3FF]/10 border border-[#00A3FF]/30 text-[#00A3FF] text-[11px] font-medium rounded-full">
                  Artist account
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#B0B0B0]">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* d) 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mt-12 md:mt-16">
        {/* LEFT COLUMN: Personal Info + Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Card */}
          <section className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 md:p-7 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <User size={18} className="text-[#00A3FF]" />
                <h2 className="text-lg font-studio font-bold text-white">Personal info</h2>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Profile Picture / Avatar change */}
                <div className="space-y-1.5 col-span-full">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] block">
                    Profile Picture
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-4 p-3.5 bg-white/5 border border-white/10 hover:border-[#00A3FF]/40 rounded-[12px] group transition-all cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-white/10">
                      <Avatar
                        src={avatarPreview || userProfile.avatar_url}
                        name={userProfile.full_name}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white group-hover:text-[#00A3FF] transition-colors">
                        Change avatar
                      </p>
                      <p className="text-[11px] text-[#B0B0B0]">
                        JPG, PNG or GIF up to 5MB
                      </p>
                      <input 
                        ref={fileInputRef}
                        name="avatar_file"
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setAvatarPreview(URL.createObjectURL(file));
                        }}
                      />
                    </div>
                    <Upload size={16} className="text-[#B0B0B0] group-hover:text-[#00A3FF] transition-colors mr-1 shrink-0" />
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] block">
                    Full Name
                  </label>
                  <input 
                    name="full_name"
                    defaultValue={userProfile.full_name}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-[12px] px-3.5 text-[13px] text-white focus:outline-none focus:border-[#00A3FF] focus:ring-1 focus:ring-[#00A3FF] transition-all" 
                  />
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] block">
                    Email Address
                  </label>
                  <div className="w-full h-11 bg-white/5 border border-white/10 rounded-[12px] px-3.5 flex items-center text-[13px] text-[#B0B0B0] select-none truncate">
                    {user?.email}
                  </div>
                </div>
                
                {/* Account Type */}
                <div className="space-y-1.5 col-span-full md:col-span-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B0B0B0] block">
                    Account Type
                  </label>
                  <div className="w-full h-11 bg-white/5 border border-white/10 rounded-[12px] px-3.5 text-[13px] text-white flex items-center gap-2">
                    <Shield size={15} className="text-[#00A3FF]" />
                    <span>
                      {role === 'artist' ? 'Professional Artist' : role === 'pending' ? 'Application Pending' : 'Standard Listener'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  disabled={loading || uploading}
                  className="w-full h-11 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] text-white rounded-[10px] font-semibold text-[13px] hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-[#00A3FF]/20"
                >
                  {loading || uploading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saving changes…</span>
                    </>
                  ) : (
                    'Save changes'
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Quick Actions Card — List Rows */}
          <section className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 md:p-7 space-y-4">
            <h2 className="text-lg font-studio font-bold text-white pb-2 border-b border-white/5">
              Quick actions
            </h2>
            <div className="divide-y divide-white/5">
              {/* My Collection */}
              <div 
                onClick={() => navigate('/library')} 
                className="py-3.5 px-3 flex items-center justify-between hover:bg-white/5 transition-all rounded-[10px] cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00A3FF]/15 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF]">
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-[14px] text-white group-hover:text-[#00A3FF] transition-colors">
                      My Collection
                    </span>
                    <p className="text-[11px] text-[#B0B0B0]">View purchases, likes and offline tracks</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#B0B0B0] group-hover:text-[#00A3FF] group-hover:translate-x-0.5 transition-all" />
              </div>
              
              {/* Billing & Plans */}
              <div 
                onClick={() => navigate('/pricing')}
                className="py-3.5 px-3 flex items-center justify-between hover:bg-white/5 transition-all rounded-[10px] cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00A3FF]/15 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF]">
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-[14px] text-white group-hover:text-[#00A3FF] transition-colors">
                      Billing & Plans
                    </span>
                    <p className="text-[11px] text-[#B0B0B0]">Manage active pass or subscription</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#B0B0B0] group-hover:text-[#00A3FF] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Artist Dashboard (artists only) */}
              {role === 'artist' && (
                <div 
                  onClick={() => navigate('/artist-hub')} 
                  className="py-3.5 px-3 flex items-center justify-between hover:bg-white/5 transition-all rounded-[10px] cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00A3FF]/15 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF]">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <span className="font-semibold text-[14px] text-white group-hover:text-[#00A3FF] transition-colors">
                        Artist Dashboard
                      </span>
                      <p className="text-[11px] text-[#B0B0B0]">Upload songs, view analytics & sales</p>
                    </div>
                  </div>
                  <ExternalLink size={15} className="text-[#B0B0B0] group-hover:text-[#00A3FF] group-hover:translate-x-0.5 transition-all" />
                </div>
              )}

              {/* Admin Panel (admins only) */}
              {(role === 'admin' || userProfile?.is_admin || userProfile?.role === 'admin') && (
                <div 
                  onClick={() => navigate('/admin')} 
                  className="py-3.5 px-3 flex items-center justify-between hover:bg-white/5 transition-all rounded-[10px] cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00A3FF]/15 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF]">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <span className="font-semibold text-[14px] text-white group-hover:text-[#00A3FF] transition-colors">
                        Admin Panel
                      </span>
                      <p className="text-[11px] text-[#B0B0B0]">Platform moderation & system controls</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#B0B0B0] group-hover:text-[#00A3FF] group-hover:translate-x-0.5 transition-all" />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT RAIL */}
        <div className="space-y-6">
          {/* Subscription Card */}
          <div className={`bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 space-y-4 ${
            isPaidTier ? 'border-t-2 border-t-[#00A3FF]' : ''
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00A3FF]/15 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF] shrink-0">
                  <Crown size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-[15px]">
                      {(() => {
                        const tierLabels: Record<string, string> = {
                          free:       'Free plan',
                          dailypass:  'Daily Pass',
                          weeklypass: 'Weekly Pass',
                          premium:    'Premium Monthly',
                          family:     'Family Plan',
                        };
                        return tierLabels[tier?.toLowerCase()] || 'Free plan';
                      })()}
                    </h3>
                    {isPaidTier && (
                      <span className="bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] text-[10px] font-medium px-2 py-0.5 rounded-full">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#B0B0B0] mt-0.5">
                    {(!tier || tier === 'free')
                      ? 'Upgrade to unlock HD audio and offline saves'
                      : userProfile?.subscription_expires_at
                        ? `Renews ${new Date(userProfile.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                        : 'Active'
                    }
                  </p>
                </div>
              </div>

              {tier === 'free' && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="h-8 px-3.5 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] text-white rounded-[8px] text-[12px] font-semibold hover:brightness-110 transition-all shrink-0"
                >
                  Upgrade
                </button>
              )}
            </div>

            {/* Feature Checklist */}
            <div className="pt-3 space-y-2 border-t border-white/5">
              {[
                { label: 'Ad-free listening', enabled: !limits.hasAds },
                { label: 'HD audio quality', enabled: limits.hdAudio },
                { label: 'Offline downloads', enabled: limits.canDownload },
                { label: 'Exclusive snippets', enabled: limits.canAccessSnippets },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    f.enabled ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-white/5 text-[#737373]'
                  }`}>
                    <Check size={11} />
                  </div>
                  <span className={`text-[12px] ${f.enabled ? 'text-white font-medium' : 'text-[#737373]'}`}>
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Phone Number Card */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#B0B0B0]">
              <Phone size={14} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                Phone Number
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="flex-1 min-w-0">
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="+265 XXX XXX XXX"
                  className={`w-full h-11 bg-white/5 border ${
                    phoneError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#00A3FF]'
                  } rounded-[12px] px-3.5 text-white text-[13px] outline-none transition-colors focus:ring-1 focus:ring-[#00A3FF]`}
                />
                {phoneError && <p className="text-red-400 text-[11px] mt-1">{phoneError}</p>}
              </div>
              <button
                onClick={handleUpdatePhone}
                disabled={savingPhone}
                className={`h-11 px-4 ${
                  phoneSuccess ? 'bg-[#22C55E]' : 'bg-gradient-to-r from-[#00A3FF] to-[#0084D6]'
                } text-white rounded-[10px] text-[13px] font-semibold hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center min-w-[70px] shrink-0`}
              >
                {savingPhone ? '…' : phoneSuccess ? <Check size={16} /> : 'Save'}
              </button>
            </div>
          </div>

          {/* Account Card */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#B0B0B0]">
              <Shield size={14} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                Account
              </p>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-white/5">
              <Mail size={15} className="text-[#B0B0B0] shrink-0" />
              <p className="text-white text-[13px] truncate">{user?.email || 'No email'}</p>
            </div>
            <div
              onClick={() => navigate('/pricing')}
              className="flex items-center justify-between py-1.5 hover:text-[#00A3FF] text-[#B0B0B0] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <CreditCard size={15} className="text-[#B0B0B0] group-hover:text-[#00A3FF] transition-colors" />
                <p className="text-white group-hover:text-[#00A3FF] text-[13px] font-medium transition-colors">
                  Manage subscription
                </p>
              </div>
              <ChevronRight size={15} className="text-[#B0B0B0] group-hover:text-[#00A3FF] group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* Sign Out Button */}
          <button 
            onClick={handleSignOut}
            className="w-full h-11 border border-red-500/25 hover:border-red-500/50 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-[10px] font-semibold text-[13px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
