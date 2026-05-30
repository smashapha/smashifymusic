import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  User, CreditCard, ShoppingBag, Settings, LogOut, 
  ChevronRight, BadgeCheck, Shield, ShieldCheck, ExternalLink, Sparkles, Mail, Phone, MapPin, Camera, Upload, Crown, Check
} from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { getListenerTier, getListenerLimits } from '../lib/tierUtils'

const Profile: React.FC = () => {
  const { user, userProfile, signOut, refreshProfile, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tier = getListenerTier(userProfile)
  const limits = getListenerLimits(userProfile)
  const [phone, setPhone] = useState(userProfile?.phone_number || '')
  const [savingPhone, setSavingPhone] = useState(false)

  const handleUpdatePhone = async () => {
    if (!phone.trim()) return toast.error('Enter a valid phone number')
    setSavingPhone(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ phone_number: phone })
        .eq('id', userProfile?.id)
      if (error) throw error
      toast.success('Phone number updated!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingPhone(false)
    }
  }

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
      // Handle avatar upload if a file was selected
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
      toast.success('Profile updated successfully!');
      if (refreshProfile) refreshProfile();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-[32px] font-studio font-bold uppercase mb-4 text-text-primary">Access Denied</h2>
        <p className="mb-8">Please sign in to view your profile.</p>
        <button onClick={() => navigate('/auth/listener')} className="btn-smash-orange">Sign In</button>
      </div>
    );
  }

   return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 pb-24 px-4 md:px-0">
      {/* Profile Header */}
      <div className="relative group mb-20 md:mb-16">
         <div 
           className="w-full h-[120px] md:h-[160px] rounded-b-[14px] md:rounded-[14px] overflow-hidden" 
           style={{ background: 'linear-gradient(135deg, rgba(255,95,0,0.2), rgba(124,58,237,0.1))' }} 
         />
         
         <div className="absolute -bottom-12 left-1/2 md:left-12 -translate-x-1/2 md:translate-x-0 z-20 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 w-full px-4 md:px-0">
            <div 
              className="w-[100px] h-[100px] md:w-[110px] md:h-[110px] rounded-full border-[4px] border-bg-page overflow-hidden relative group cursor-pointer shadow-xl bg-bg-surface"
              onClick={() => fileInputRef.current?.click()}
            >
               <Avatar src={userProfile.avatar_url} name={userProfile.full_name} className="w-full h-full rounded-full" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <Camera className="text-white" size={24} />
               </div>
            </div>
            <div className="md:pb-2 space-y-1 text-center md:text-left">
               <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
                  <h1 className="text-[20px] md:text-[28px] font-studio font-bold text-text-primary uppercase tracking-tight">{userProfile.full_name || 'Listener'}</h1>
                  {role === 'artist' && (
                    <span className="px-2.5 py-0.5 bg-smash-purple text-white text-[9px] md:text-[11px] font-display font-medium rounded-full uppercase tracking-wide">
                      Artist Account
                    </span>
                  )}
               </div>
               <p className="text-[12px] md:text-[14px] font-display font-normal text-text-muted">{user?.email}</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12 md:mt-16">
         {/* Account Details Form */}
         <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <section className="bg-bg-surface border border-border-default rounded-[12px] md:rounded-[14px] p-5 md:p-8 space-y-6 md:space-y-8">
               <div className="flex items-center justify-between">
                  <h2 className="text-lg md:text-[20px] font-studio font-bold text-text-primary">PERSONAL INFO</h2>
                  <User size={20} className="text-text-muted md:w-6 md:h-6" />
               </div>

               <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2 col-span-full">
                         <label className="block text-[10px] md:text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-1 md:mb-2">Profile Picture</label>
                         <div 
                           onClick={() => fileInputRef.current?.click()}
                           className="flex items-center gap-4 p-4 bg-bg-elevated border border-border-default rounded-[10px] group hover:border-smash-orange/40 transition-all cursor-pointer min-h-[70px]"
                         >
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shrink-0">
                               <Avatar src={userProfile.avatar_url} name={userProfile.full_name} className="w-full h-full" />
                            </div>
                            <div className="flex-1">
                               <p className="text-xs md:text-[14px] font-display font-semibold text-text-primary mb-0.5">Change Avatar</p>
                               <p className="text-[10px] md:text-[12px] font-sans text-text-muted leading-none">JPG, PNG or GIF up to 5MB</p>
                               <input 
                                 ref={fileInputRef}
                                 name="avatar_file"
                                 type="file" 
                                 accept="image/*"
                                 className="hidden" 
                               />
                            </div>
                            <Upload size={18} className="text-text-muted group-hover:text-smash-orange transition-colors mr-1" />
                         </div>
                     </div>

                     <div className="space-y-2">
                        <label className="block text-[10px] md:text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-1 md:mb-2">Full Name</label>
                        <input 
                          name="full_name"
                          defaultValue={userProfile.full_name}
                          className="w-full h-[40px] md:h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 text-xs md:text-[14px] font-display text-text-primary outline-none focus:border-smash-orange focus:ring-[3px] focus:ring-smash-orange/15 transition-all font-medium" 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="block text-[10px] md:text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-1 md:mb-2">Email Address</label>
                        <div className="w-full h-[40px] md:h-[44px] bg-bg-elevated/50 border border-border-default rounded-[10px] px-4 flex items-center text-xs md:text-[14px] font-display text-text-muted opacity-80 select-none">
                           {user?.email}
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="block text-[10px] md:text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-1 md:mb-2">Subscription Plan</label>
                        <div className="w-full h-[40px] md:h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 text-xs md:text-[14px] font-display font-semibold text-text-primary flex items-center gap-2">
                           <Sparkles size={14} className="text-smash-orange" />
                           {userProfile.subscription_tier || 'Free'}
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="block text-[10px] md:text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-1 md:mb-2">Account Type</label>
                        <div className="w-full h-[40px] md:h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 text-xs md:text-[14px] font-display text-text-primary flex items-center gap-2">
                           <Shield size={14} className={role === 'artist' ? "text-smash-purple" : "text-smash-orange"} />
                           {role === 'artist' ? 'Professional Artist' : role === 'pending' ? 'Application Pending' : 'Standard Listener'}
                        </div>
                     </div>
                  </div>

                  <button 
                    disabled={loading || uploading}
                    className="w-full h-[44px] md:h-[48px] bg-smash-orange text-white rounded-[10px] font-display font-semibold text-[11px] md:text-[13px] uppercase tracking-widest hover:bg-smash-orange/90 transition-colors disabled:opacity-50 mt-2"
                  >
                    {loading || uploading ? 'SAVING...' : 'UPDATE PROFILE'}
                  </button>
               </form>
            </section>

            <section className="bg-bg-surface border border-border-default rounded-[12px] md:rounded-[14px] p-5 md:p-8 flex flex-col gap-5 md:gap-6 relative overflow-hidden">
               <h2 className="text-lg md:text-[20px] font-studio font-bold text-text-primary uppercase tracking-tight">Quick Actions</h2>
               <div className="flex flex-col md:flex-row flex-wrap gap-3 md:gap-4">
                  <button 
                    key="action-collection" 
                    onClick={() => navigate('/library')} 
                    className="flex-1 min-w-[200px] p-3 md:p-4 bg-bg-elevated border border-border-default rounded-[10px] flex items-center justify-between group hover:border-smash-orange/30 transition-all text-left"
                  >
                     <div className="flex items-center gap-3">
                        <ShoppingBag className="text-smash-orange shrink-0" size={18} />
                        <span className="font-display font-medium text-xs md:text-[13px] text-text-primary">My Collection</span>
                     </div>
                     <ChevronRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  {role === 'artist' && (
                     <button 
                       key="action-artist-hub" 
                       onClick={() => navigate('/artist-hub')} 
                       className="flex-1 min-w-[200px] p-3 md:p-4 bg-smash-purple/10 border border-smash-purple/20 rounded-[10px] flex items-center justify-between group hover:bg-smash-purple/20 transition-all text-left"
                     >
                        <div className="flex items-center gap-3">
                           <Sparkles className="text-smash-purple shrink-0" size={18} />
                           <span className="font-display font-medium text-xs md:text-[13px] text-smash-purple">Artist Dashboard</span>
                        </div>
                        <ExternalLink className="text-smash-purple" size={14} />
                     </button>
                  )}

                  {(role === 'admin' || userProfile?.is_admin || userProfile?.role === 'admin') && (
                     <button 
                       key="action-admin-main" 
                       onClick={() => navigate('/admin')} 
                       className="flex-1 min-w-[200px] p-3 md:p-4 bg-smash-purple/10 border border-smash-purple/20 rounded-[10px] flex items-center justify-between group hover:bg-smash-purple/20 transition-all text-left"
                     >
                        <div className="flex items-center gap-3">
                           <ShieldCheck className="text-smash-purple shrink-0" size={18} />
                           <span className="font-display font-medium text-xs md:text-[13px] text-smash-purple">Admin Panel</span>
                        </div>
                        <ChevronRight size={16} className="text-smash-purple group-hover:translate-x-1 transition-transform" />
                     </button>
                  )}

                  <button 
                    key="action-billing" 
                    onClick={() => navigate('/pricing')}
                    className="flex-1 min-w-[200px] p-3 md:p-4 bg-bg-elevated border border-border-default rounded-[10px] flex items-center justify-between group hover:border-smash-orange/30 transition-all text-left"
                  >
                     <div className="flex items-center gap-3">
                        <CreditCard className="text-smash-green shrink-0" size={18} />
                        <span className="font-display font-medium text-xs md:text-[13px] text-text-primary">Billing & Plans</span>
                     </div>
                     <ChevronRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                  </button>
               </div>
            </section>
         </div>

         {/* Sidebar Controls */}
         <div className="space-y-6">
            {/* Subscription Status */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown size={20} className={tier === 'free' ? 'text-white/30' : 'text-smash-orange'} />
                  <div>
                    <p className="text-white font-black uppercase text-sm tracking-widest">
                      {tier === 'free' ? 'Free Plan' : tier === 'premium' ? 'Premium' : 'Family Plan'}
                    </p>
                    <p className="text-white/40 text-xs font-bold mt-0.5">
                      {tier === 'free'
                        ? 'Upgrade to remove ads and unlock HD audio'
                        : `Active · Renews ${userProfile?.subscription_expires_at
                            ? new Date(userProfile.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'soon'}`
                      }
                    </p>
                  </div>
                </div>
                {tier === 'free' ? (
                  <button
                    onClick={() => navigate('/pricing')}
                    className="px-4 py-2 bg-smash-orange text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform"
                  >
                    Upgrade
                  </button>
                ) : (
                  <div className="w-8 h-8 bg-smash-orange/10 rounded-full flex items-center justify-center">
                    <Check size={16} className="text-smash-orange" />
                  </div>
                )}
              </div>

              {/* Feature list */}
              <div className="pt-2 space-y-2 border-t border-white/5">
                {[
                  { label: 'Ad-free listening', enabled: !limits.hasAds },
                  { label: 'HD audio quality', enabled: limits.hdAudio },
                  { label: 'Offline downloads', enabled: limits.canDownload },
                  { label: 'Exclusive snippets', enabled: limits.canAccessSnippets },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${f.enabled ? 'bg-smash-orange/20' : 'bg-white/5'}`}>
                      <Check size={10} className={f.enabled ? 'text-smash-orange' : 'text-white/20'} />
                    </div>
                    <span className={`text-xs font-bold ${f.enabled ? 'text-white' : 'text-white/30'}`}>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone number */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <Phone size={12} /> Phone Number
              </p>
              <div className="flex gap-3">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+265 XXX XXX XXX"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-smash-orange/60 transition-colors"
                />
                <button
                  onClick={handleUpdatePhone}
                  disabled={savingPhone}
                  className="px-4 py-3 bg-smash-orange text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {savingPhone ? '...' : 'Save'}
                </button>
              </div>
            </div>

            {/* Account info */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <p className="text-white/40 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Shield size={12} /> Account
              </p>
              <div className="flex items-center gap-3 py-2 border-b border-white/5">
                <Mail size={14} className="text-white/30 shrink-0" />
                <p className="text-white text-sm font-bold truncate">{user?.email || 'No email'}</p>
              </div>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={14} className="text-white/30" />
                  <p className="text-white text-sm font-bold">Manage Subscription</p>
                </div>
                <ChevronRight size={14} className="text-white/30" />
              </button>
            </div>

            <button 
              onClick={handleSignOut}
              className="w-full h-[40px] md:h-[44px] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-[10px] font-display font-semibold text-[10px] md:text-[12px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <LogOut size={16} /> SIGN OUT
            </button>
         </div>
      </div>
    </div>
  );
};

export default Profile;
