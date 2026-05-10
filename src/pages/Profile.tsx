import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, CreditCard, ShoppingBag, Settings, LogOut, 
  ChevronRight, BadgeCheck, Shield, ExternalLink, Sparkles, Mail, Phone, MapPin
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
      <div className="relative group">
         <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-smash-black z-10" />
         <div className="h-48 rounded-[32px] overflow-hidden">
            <img src="https://images.unsplash.com/photo-1619983081563-430f63602796?w=1200&h=400&fit=crop" className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity" alt="" />
         </div>
         
         <div className="absolute -bottom-16 left-12 z-20 flex items-end gap-8">
            <div className="w-40 h-40 rounded-full border-8 border-smash-black overflow-hidden shadow-2xl relative group">
               <Avatar src={userProfile.avatar_url} name={userProfile.full_name} className="w-full h-full rounded-full" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <BadgeCheck className="text-white" size={32} />
               </div>
            </div>
            <div className="pb-4 space-y-2">
               <div className="flex items-center gap-3">
                  <h1 className="text-5xl font-black font-display italic uppercase tracking-tighter drop-shadow-xl">{userProfile.full_name || 'Muzic Listener'}</h1>
                  {role === 'artist' && <span className="px-3 py-1 bg-smash-purple text-white text-[10px] font-black rounded-full uppercase">Artist</span>}
               </div>
               <p className="text-smash-gray font-bold tracking-tight flex items-center gap-2"><Mail size={16} /> {user?.email}</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-24">
        {/* Account Details Form */}
        <div className="lg:col-span-2 space-y-12">
           <section className="bento-card p-12 bg-white/5 space-y-12">
              <div className="flex items-center justify-between">
                 <h2 className="text-3xl font-black font-display italic uppercase tracking-tighter">PERSONAL <span className="text-smash-orange">INFO</span></h2>
                 <User size={32} className="text-smash-gray opacity-20" />
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 col-span-full">
                        <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Profile Picture</label>
                        <div className="flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-[28px] group hover:border-smash-orange/30 transition-all">
                           <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
                              <Avatar src={userProfile.avatar_url} name={userProfile.full_name} className="w-full h-full" />
                           </div>
                           <div className="flex-1 space-y-2">
                              <p className="text-xs font-bold text-white uppercase tracking-tight">Upload New Avatar</p>
                              <input 
                                name="avatar_file"
                                type="file" 
                                accept="image/*"
                                className="w-full text-[10px] font-black text-smash-gray file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-white/10 file:text-white hover:file:bg-smash-orange transition-all cursor-pointer" 
                              />
                           </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Full Name</label>
                       <input 
                         name="full_name"
                         defaultValue={userProfile.full_name}
                         className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-4 font-bold outline-none focus:border-smash-orange transition-all" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Email Address</label>
                       <div className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-4 font-bold text-smash-gray opacity-60">
                          {user?.email}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Subscription Plan</label>
                       <div className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-4 font-black uppercase text-xs tracking-widest flex items-center gap-3">
                          <Sparkles size={16} className="text-smash-orange" />
                          {userProfile.subscription_tier || 'Free'}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-smash-gray uppercase tracking-widest ml-4">Account Type</label>
                       <div className="w-full bg-white/5 border border-white/10 rounded-[20px] px-8 py-4 font-black uppercase text-xs tracking-widest flex items-center gap-3">
                          <Shield size={16} className={role === 'artist' ? "text-smash-purple" : "text-smash-orange"} />
                          {role === 'artist' ? 'Professional Artist' : role === 'pending' ? 'Application Pending' : 'Standard Listener'}
                       </div>
                    </div>
                 </div>

                 <button 
                   disabled={loading || uploading}
                   className="w-full py-6 bg-white text-smash-black rounded-[32px] font-black text-xl uppercase tracking-widest hover:bg-smash-orange hover:text-white transition-all shadow-xl disabled:opacity-50"
                 >
                   {loading || uploading ? 'SAVING...' : 'UPDATE PROFILE'}
                 </button>
              </form>
           </section>

           <section className="bento-card p-12 bg-white/5 space-y-12">
              <h2 className="text-3xl font-black font-display italic uppercase tracking-tighter">QUICK <span className="text-smash-orange">ACTIONS</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <button onClick={() => navigate('/library')} className="p-6 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-between group hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                       <ShoppingBag className="text-smash-orange" />
                       <span className="font-black uppercase tracking-widest text-xs">View Purchases</span>
                    </div>
                    <ChevronRight className="text-smash-gray group-hover:translate-x-2 transition-transform" />
                 </button>
                 {role === 'artist' && (
                    <button onClick={() => navigate('/artist-hub')} className="p-6 bg-smash-purple/10 border border-smash-purple/20 rounded-[24px] flex items-center justify-between group hover:bg-smash-purple/20 transition-all">
                       <div className="flex items-center gap-4">
                          <Sparkles className="text-smash-purple" />
                          <span className="font-black uppercase tracking-widest text-xs text-smash-purple">Artist Dashboard</span>
                       </div>
                       <ExternalLink className="text-smash-purple" size={18} />
                    </button>
                 )}
                 <button className="p-6 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-between group hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                       <CreditCard className="text-green-500" />
                       <span className="font-black uppercase tracking-widest text-xs">Billing & Subscription</span>
                    </div>
                    <ChevronRight className="text-smash-gray group-hover:translate-x-2 transition-transform" />
                 </button>
              </div>
           </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
           <div className="bento-card p-8 bg-gradient-to-br from-smash-orange/20 to-transparent border-smash-orange/20">
              <h3 className="text-xl font-black font-display italic uppercase mb-6 flex items-center gap-2">
                 <CreditCard size={20} className="text-smash-orange" /> Plan: <span className="text-smash-orange">{userProfile.subscription_tier || 'Free'}</span>
              </h3>
              <p className="text-sm text-smash-gray font-medium mb-6 leading-relaxed">
                 Enjoy high fidelity audio, unlimited skips and offline listening by upgrading your plan.
              </p>
              <button onClick={() => navigate('/pricing')} className="w-full py-4 bg-white text-smash-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-smash-orange hover:text-white transition-all">
                 UPGRADE PLAN
              </button>
           </div>

           <div className="bento-card p-8 space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-smash-gray">Security</h4>
              <button className="w-full flex items-center justify-between group">
                 <span className="font-bold text-sm">Change Password</span>
                 <Settings size={18} className="text-smash-gray group-hover:rotate-90 transition-transform" />
              </button>
              <button className="w-full flex items-center justify-between group">
                 <span className="font-bold text-sm">Email Notifications</span>
                 <div className="w-10 h-5 bg-smash-orange rounded-full relative">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                 </div>
              </button>
           </div>

           <button 
             onClick={handleSignOut}
             className="w-full py-6 border-2 border-smash-red/20 text-smash-red rounded-[24px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-smash-red hover:text-white transition-all"
           >
             <LogOut size={18} /> SIGN OUT ACCOUNT
           </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
