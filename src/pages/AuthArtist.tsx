import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Lock as AppLockIcon, User, Check, ArrowRight, ShieldCheck, 
  Mic2, AlertCircle, Phone, MapPin, 
  Music, ChevronLeft, Disc, Chrome
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'signup';
type ArtistStep = 1 | 2 | 3;

const AuthArtist: React.FC = () => {
  const { user, role, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loadingState, setLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading && role !== null) {
      if (role === 'artist' || role === 'pending') navigate('/artist-hub');
      else {
        toast.error('You are logged in as a Listener. Please apply if you wish to use the Artist Studio.');
        navigate('/');
      }
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    const qMode = searchParams.get('mode');
    if (qMode === 'signup') setMode('signup');
    else setMode('login');
  }, [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [stageName, setStageName] = useState('');
  const [genre, setGenre] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [artistStep, setArtistStep] = useState<ArtistStep>(1);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);

  if (loading && !user) {
    return (
       <div className="min-h-screen bg-smash-black flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-smash-purple border-t-transparent rounded-full animate-spin" />
       </div>
    );
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) { toast.error('Email is required'); return; }
    if (mode === 'login' && !password) { toast.error('Password is required'); return; }
    
    if (mode === 'signup' && artistStep === 3) {
      if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
      if (!idPhoto) { toast.error('Verification ID is required'); return; }
    }

    setLoadingState(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Studio unlocked!');
      } else if (mode === 'signup' && artistStep === 3) {
        const { data, error } = await supabase.auth.signUp({ 
           email, 
           password,
           options: { data: { full_name: fullName, stage_name: stageName, role: 'pending' } }
        });
        if (error) throw error;
        if (data.user) {
           let idUrl = null;
           if (idPhoto) {
             const fileExt = idPhoto.name.split('.').pop();
             const fileName = `${data.user.id}/id-document.${fileExt}`;
             const { error: uploadError } = await supabase.storage
               .from('artist-verifications')
               .upload(fileName, idPhoto, { upsert: true });
             
             if (!uploadError) {
               const { data: urlData } = supabase.storage
                 .from('artist-verifications')
                 .getPublicUrl(fileName);
               idUrl = urlData.publicUrl;
             }
           }

           const { error: appError } = await supabase.from('artist_applications').insert({
              profile_id: data.user.id,
              full_name: fullName,
              stage_name: stageName,
              email: email,
              genre: genre,
              city: city,
              phone: phone,
              id_document_url: idUrl,
              status: 'pending'
           });
           if (appError) throw appError;

           // Insert a profile row immediately with approved: false
           const { error: profileError } = await supabase.from('profiles').insert({
              id: data.user.id,
              full_name: fullName,
              stage_name: stageName,
              email: email,
              genre: genre,
              city: city,
              phone: phone,
              approved: false,
              user_type: 'artist'
           });
           if (profileError) throw profileError;

           toast.success('Application submitted! Under review.');
           navigate('/artist-hub');
        }
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoadingState(false);
    }
  };

  const handleOAuth = async (provider: 'google') => {
    try {
      localStorage.setItem('smashify_auth_intent', 'artist');
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
          redirectTo: `${window.location.origin}/artist-hub`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email first');
      return;
    }
    setLoadingState(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/artist?mode=reset`,
      });
      if (error) throw error;
      toast.success('Password reset link sent to your email');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingState(false);
    }
  };

  const nextArtistStep = () => {
    if (artistStep === 1) {
       if (!fullName || !stageName || !email) return toast.error('Please fill all fields');
    } else if (artistStep === 2) {
       if (!genre || !phone || !city || !idPhoto) return toast.error('Please fill all fields & upload ID');
    }
    setArtistStep(prev => (prev + 1) as ArtistStep);
  };
  const prevArtistStep = () => setArtistStep(prev => (prev - 1) as ArtistStep);

  return (
    <div className="min-h-screen bg-smash-black flex flex-col md:flex-row relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-smash-purple/5 rounded-full blur-[140px] -ml-64 -mt-64" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-smash-orange/5 rounded-full blur-[140px] -mr-64 -mb-64" />

      <div className="w-full md:w-[40%] bg-smash-dark/50 p-12 md:p-20 flex flex-col justify-between border-r border-white/5 relative z-10">
         <div>
            <button onClick={() => navigate('/artists')} className="mb-12 flex items-center gap-2 text-smash-gray hover:text-white transition-colors group">
               <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
               <span className="font-black text-[10px] uppercase tracking-widest">Back to Artists</span>
            </button>
            <Logo size="lg" className="mb-20" />
            <AnimatePresence mode="wait">
               {mode === 'login' ? (
                  <motion.div key="l" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                     <h2 className="text-6xl md:text-8xl font-black font-studio italic uppercase tracking-tighter leading-none mb-10">STUDIO<br/><span className="text-smash-purple">ACCESS</span></h2>
                     <p className="text-smash-gray text-xl md:text-2xl font-medium tracking-tight">Sign in to your artist hub to manage tracks, view analytics, and withdraw earnings.</p>
                  </motion.div>
               ) : (
                  <motion.div key="sa" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                     <h2 className="text-6xl md:text-8xl font-black font-studio italic uppercase tracking-tighter leading-none mb-10">BUILD AN<br/><span className="text-smash-purple">EMPIRE</span></h2>
                     <p className="text-smash-gray text-xl md:text-2xl font-medium tracking-tight">The most artist-friendly platform in Malawi. Payouts to mobile money. Instant analytics.</p>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-20 md:px-24 md:py-32 relative z-10">
         <div className="max-w-xl w-full mx-auto">
            <h1 className="text-4xl font-black font-display uppercase italic tracking-tighter mb-8 text-smash-purple">Artist Studio</h1>
            
            <div className="flex gap-4 mb-12">
               <button onClick={() => setMode('login')} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${mode === 'login' ? 'bg-smash-purple text-white shadow-xl shadow-smash-purple/20' : 'bg-white/5 text-smash-gray hover:bg-white/10'}`}>Artist Mission Control</button>
               <button onClick={() => setMode('signup')} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${mode === 'signup' ? 'bg-smash-purple text-white shadow-xl shadow-smash-purple/20' : 'bg-white/5 text-smash-gray hover:bg-white/10'}`}>Apply for Studio</button>
            </div>

            <AnimatePresence mode="wait">
               {mode === 'login' ? (
                  <motion.form key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8" onSubmit={handleAuth}>
                     <div className="space-y-6">
                        <AuthInput icon={<Mail size={20} />} type="email" placeholder="Artist Email" value={email} onChange={setEmail} />
                        <AuthInput icon={<AppLockIcon size={20} />} type="password" placeholder="Password" value={password} onChange={setPassword} />
                     </div>
                     <button type="submit" disabled={loadingState} className="w-full py-6 bg-smash-purple text-white rounded-[32px] font-black text-2xl uppercase tracking-widest shadow-2xl shadow-smash-purple/30 hover:scale-[1.02] active:scale-95 transition-all italic">
                        {loadingState ? 'Connecting...' : 'Unlock Studio'}
                     </button>
                     <div className="flex justify-between px-2">
                        <button type="button" onClick={handleForgotPassword} className="text-[10px] font-black text-smash-gray uppercase tracking-widest hover:text-white transition-colors">Forgot Password?</button>
                     </div>
                     <div className="pt-4 border-t border-white/5 space-y-4">
                        <button type="button" onClick={() => navigate('/auth/listener')} className="w-full text-center text-[10px] font-black text-smash-gray uppercase tracking-widest hover:text-smash-orange transition-colors">Listener Login &rarr;</button>
                     </div>
                  </motion.form>
               ) : (
                  <motion.div key="artist" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                     {/* Stepper */}
                     <div className="flex items-center gap-4">
                        {[1, 2, 3].map(s => (
                           <div key={s} className="h-2 flex-1 rounded-full overflow-hidden bg-white/5">
                              <motion.div initial={{ width: 0 }} animate={{ width: artistStep >= s ? '100%' : '0%' }} className="h-full bg-smash-purple shadow-[0_0_15px_rgba(155,93,229,0.5)]" />
                           </div>
                        ))}
                     </div>

                     <AnimatePresence mode="wait">
                        {artistStep === 1 && (
                           <motion.div key="as1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                              <div className="space-y-6">
                                 <AuthInput icon={<User size={20} />} type="text" placeholder="Legal Full Name" value={fullName} onChange={setFullName} />
                                 <AuthInput icon={<Mic2 size={20} />} type="text" placeholder="Stage Name" value={stageName} onChange={setStageName} />
                                 <AuthInput icon={<Mail size={20} />} type="email" placeholder="Professional Email" value={email} onChange={setEmail} />
                              </div>
                              <button onClick={nextArtistStep} className="w-full py-6 bg-white text-smash-black rounded-[32px] font-black text-2xl uppercase tracking-widest shadow-2xl hover:bg-smash-purple hover:text-white transition-all">Next: Business Details <ArrowRight size={24} className="inline ml-2" /></button>
                           </motion.div>
                        )}
                        {artistStep === 2 && (
                           <motion.div key="as2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                              <div className="space-y-6">
                                 <AuthInput icon={<Disc size={20} />} type="text" placeholder="Primary Genre" value={genre} onChange={setGenre} />
                                 <AuthInput icon={<Phone size={20} />} type="text" placeholder="TNM / Airtel Phone" value={phone} onChange={setPhone} />
                                 <AuthInput icon={<MapPin size={20} />} type="text" placeholder="City" value={city} onChange={setCity} />
                                 <div className="relative group p-6 rounded-[32px] bg-white/5 border border-white/5 space-y-4 hover:border-smash-purple/30 transition-all text-left">
                                    <div className="flex items-center gap-3">
                                       <User size={20} className="text-smash-gray group-hover:text-white transition-colors" />
                                       <p className="text-[10px] font-black text-white uppercase tracking-widest">ID Verification (Req.)</p>
                                    </div>
                                    <input 
                                       type="file" 
                                       accept="image/*"
                                       onChange={(e) => setIdPhoto(e.target.files?.[0] || null)}
                                       className="w-full text-sm font-bold text-smash-gray file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-white/10 file:text-white hover:file:bg-smash-purple hover:file:text-white transition-all cursor-pointer" 
                                    />
                                 </div>
                              </div>
                              <div className="flex gap-4">
                                 <button onClick={prevArtistStep} className="p-6 bg-white/5 text-white rounded-[32px] hover:bg-white/10 transition-all"><ChevronLeft size={32} /></button>
                                 <button onClick={nextArtistStep} className="flex-1 py-6 bg-white text-smash-black rounded-[32px] font-black text-2xl uppercase tracking-widest shadow-2xl hover:bg-smash-purple hover:text-white transition-all">Review & Finalize</button>
                              </div>
                           </motion.div>
                        )}
                        {artistStep === 3 && (
                           <motion.div key="as3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                              <div className="space-y-6">
                                 <AuthInput icon={<AppLockIcon size={20} />} type="password" placeholder="Secure Password" value={password} onChange={setPassword} />
                                 <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 space-y-4 text-left">
                                    <div className="flex items-center gap-3">
                                       <ShieldCheck className="text-smash-purple" size={20} />
                                       <p className="text-[10px] font-black text-white uppercase tracking-widest">Verification Policy</p>
                                    </div>
                                    <p className="text-xs text-smash-gray font-bold tracking-tight">Applications are reviewed within 48 hours. By applying, you agree to our Artist Terms of Service.</p>
                                 </div>
                              </div>
                              <div className="flex gap-4">
                                 <button onClick={prevArtistStep} className="p-6 bg-white/5 text-white rounded-[32px] hover:bg-white/10 transition-all"><ChevronLeft size={32} /></button>
                                 <button onClick={handleAuth} disabled={loadingState} className="flex-1 py-6 bg-smash-purple text-white rounded-[32px] font-black text-2xl uppercase tracking-widest shadow-2xl shadow-smash-purple/20 hover:scale-[1.02] transition-all italic">
                                    {loadingState ? 'Launching Studio...' : 'Submit Application'}
                                 </button>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </motion.div>
               )}
            </AnimatePresence>

            {error && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-4 bg-smash-red/10 border border-smash-red/20 rounded-2xl flex items-center gap-3 text-smash-red font-bold text-sm">
                  <AlertCircle size={18} /> {error}
               </motion.div>
            )}
         </div>
      </div>
    </div>
  );
};

const AuthInput = ({ icon, value, onChange, ...props }: any) => (
   <div className="relative group">
      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-smash-gray group-focus-within:text-white transition-colors">
         {icon}
      </div>
      <input 
         value={value || ""}
         onChange={(e) => onChange(e.target.value)}
         {...props} 
         className="w-full pl-16 pr-8 py-5 bg-white/5 border border-white/10 rounded-[28px] text-lg font-bold placeholder:text-smash-gray/30 focus:outline-none focus:border-white transition-all"
      />
   </div>
);

export default AuthArtist;
