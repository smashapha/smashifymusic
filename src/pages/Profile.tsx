import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  User, CreditCard, ShoppingBag, Settings, LogOut, 
  ChevronRight, BadgeCheck, Shield, ExternalLink, Sparkles, Mail, Phone, MapPin, Camera, Upload
} from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, userProfile, signOut, refreshProfile, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <h2 className="text-4xl font-black font-display italic uppercase mb-4 text-smash-gray">Access Denied</h2>
        <p className="mb-8">Please sign in to view your profile.</p>
        <button onClick={() => navigate('/auth/listener')} className="btn-smash-orange">Sign In</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      {/* Profile Header */}
      <div className="relative group mb-16">
         <div 
           className="w-full h-[160px] rounded-[14px] overflow-hidden" 
           style={{ background: 'linear-gradient(135deg, rgba(255,95,0,0.15), rgba(124,58,237,0.08))' }} 
         />
         
         <div className="absolute -bottom-10 left-12 z-20 flex items-end gap-6">
            <div 
              className="w-[96px] h-[96px] rounded-full border-[3px] border-bg-page overflow-hidden relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
               <Avatar src={userProfile.avatar_url} name={userProfile.full_name} className="w-full h-full rounded-full" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <Camera className="text-white" size={24} />
               </div>
            </div>
            <div className="pb-2 space-y-1">
               <div className="flex items-center gap-3">
                  <h1 className="text-[24px] font-studio font-bold text-text-primary">{userProfile.full_name || 'Muzic Listener'}</h1>
                  {role === 'artist' && <span className="px-2.5 py-0.5 bg-smash-purple text-white text-[11px] font-display font-medium rounded-full uppercase tracking-wide">Artist</span>}
               </div>
               <p className="text-[13px] font-display font-normal text-text-muted">{user?.email}</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16 px-4 md:px-0">
        {/* Account Details Form */}
        <div className="lg:col-span-2 space-y-8">
           <section className="bg-bg-surface border border-border-default rounded-[14px] p-6 md:p-8 space-y-8">
              <div className="flex items-center justify-between">
                 <h2 className="text-[20px] font-studio font-bold text-text-primary">PERSONAL INFO</h2>
                 <User size={24} className="text-text-muted" />
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-full">
                        <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Profile Picture</label>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-4 p-4 bg-bg-elevated border border-border-default rounded-[10px] group hover:border-smash-orange/40 transition-all cursor-pointer min-h-[80px]"
                        >
                           <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                              <Avatar src={userProfile.avatar_url} name={userProfile.full_name} className="w-full h-full" />
                           </div>
                           <div className="flex-1">
                              <p className="text-[14px] font-display font-semibold text-text-primary mb-1">Click to upload new image</p>
                              <p className="text-[12px] font-sans text-text-muted">JPG, PNG or GIF up to 5MB</p>
                              <input 
                                ref={fileInputRef}
                                name="avatar_file"
                                type="file" 
                                accept="image/*"
                                className="hidden" 
                              />
                           </div>
                           <Upload size={20} className="text-text-muted group-hover:text-smash-orange transition-colors mr-2" />
                        </div>
                    </div>

                    <div className="space-y-2">
                       <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Full Name</label>
                       <input 
                         name="full_name"
                         defaultValue={userProfile.full_name}
                         className="w-full h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 text-[14px] font-display text-text-primary outline-none focus:border-smash-orange focus:ring-[3px] focus:ring-smash-orange/15 transition-all" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Email Address</label>
                       <div className="w-full h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 flex items-center text-[14px] font-display text-text-muted opacity-70">
                          {user?.email}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Subscription Plan</label>
                       <div className="w-full h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 text-[14px] font-display font-semibold text-text-primary flex items-center gap-2">
                          <Sparkles size={16} className="text-smash-orange" />
                          {userProfile.subscription_tier || 'Free'}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">Account Type</label>
                       <div className="w-full h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 text-[14px] font-display text-text-primary flex items-center gap-2">
                          <Shield size={16} className={role === 'artist' ? "text-smash-purple" : "text-smash-orange"} />
                          {role === 'artist' ? 'Professional Artist' : role === 'pending' ? 'Application Pending' : 'Standard Listener'}
                       </div>
                    </div>
                 </div>

                 <button 
                   disabled={loading || uploading}
                   className="w-full h-[48px] bg-smash-orange text-white rounded-[10px] font-display font-semibold text-[13px] uppercase tracking-widest hover:bg-smash-orange/90 transition-colors disabled:opacity-50 mt-4"
                 >
                   {loading || uploading ? 'SAVING...' : 'UPDATE PROFILE'}
                 </button>
              </form>
           </section>

           <section className="bg-bg-surface border border-border-default rounded-[14px] p-6 md:p-8 space-y-6">
              <h2 className="text-[20px] font-studio font-bold text-text-primary">QUICK ACTIONS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button onClick={() => navigate('/library')} className="p-4 bg-bg-elevated border border-border-default rounded-[10px] flex items-center justify-between group hover:border-smash-orange/30 transition-all">
                    <div className="flex items-center gap-3">
                       <ShoppingBag className="text-smash-orange shrink-0" size={20} />
                       <span className="font-display font-medium text-[13px] text-text-primary">View Purchases</span>
                    </div>
                    <ChevronRight size={18} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                 </button>
                 {role === 'artist' && (
                    <button onClick={() => navigate('/artist-hub')} className="p-4 bg-smash-purple/10 border border-smash-purple/20 rounded-[10px] flex items-center justify-between group hover:bg-smash-purple/20 transition-all">
                       <div className="flex items-center gap-3">
                          <Sparkles className="text-smash-purple shrink-0" size={20} />
                          <span className="font-display font-medium text-[13px] text-smash-purple">Artist Dashboard</span>
                       </div>
                       <ExternalLink className="text-smash-purple" size={16} />
                    </button>
                 )}
                 <button className="p-4 bg-bg-elevated border border-border-default rounded-[10px] flex items-center justify-between group hover:border-smash-orange/30 transition-all">
                    <div className="flex items-center gap-3">
                       <CreditCard className="text-smash-green shrink-0" size={20} />
                       <span className="font-display font-medium text-[13px] text-text-primary">Billing & Subscription</span>
                    </div>
                    <ChevronRight size={18} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
           </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
           <div className="bg-bg-surface border border-smash-orange/20 rounded-[14px] p-5">
              <h3 className="text-[14px] font-display font-semibold mb-3 flex items-center gap-2 text-text-primary">
                 Plan: <span className="text-smash-orange">{userProfile.subscription_tier || 'Free'}</span>
              </h3>
              <p className="text-[14px] text-text-secondary font-sans leading-[1.7] mb-6">
                 Enjoy high fidelity audio, unlimited skips and offline listening by upgrading your plan.
              </p>
              <button 
                onClick={() => navigate('/pricing')} 
                className="w-full h-[44px] px-5 bg-transparent border border-border-default text-text-primary rounded-[10px] font-display font-semibold text-[12px] uppercase tracking-widest hover:border-smash-orange hover:text-smash-orange transition-colors"
              >
                 UPGRADE PLAN
              </button>
           </div>

           <div className="bg-bg-surface border border-border-default rounded-[14px] p-5 space-y-5">
              <h4 className="text-[11px] font-display font-semibold uppercase tracking-widest text-text-muted">Security</h4>
              <button className="w-full flex items-center justify-between group">
                 <span className="font-display font-medium text-[14px] text-text-primary">Change Password</span>
                 <Settings size={18} className="text-text-muted group-hover:rotate-90 transition-transform" />
              </button>
              <button className="w-full flex items-center justify-between group">
                 <span className="font-display font-medium text-[14px] text-text-primary">Email Notifications</span>
                 <div className="w-10 h-5 bg-smash-orange rounded-full relative">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                 </div>
              </button>
           </div>

           <button 
             onClick={handleSignOut}
             className="w-full h-[44px] border border-smash-red/20 text-smash-red hover:bg-smash-red hover:text-white rounded-[10px] font-display font-semibold text-[12px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
           >
             <LogOut size={16} /> SIGN OUT
           </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
