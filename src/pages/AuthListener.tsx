import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Lock as AppLockIcon, User, ChevronLeft, Chrome, AlertCircle, Headphones, Phone, Check
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import { upgradeListenerPlan } from '../lib/paychangu';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'signup';
type SignupStep = 1 | 2;
type PlanChoice = 'free' | 'premium' | 'family';

const AuthListener: React.FC = () => {
  const { user, role, loading, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loadingState, setLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading && role !== null) {
      if (role === 'artist' || role === 'pending') {
        toast.error('This is a Listener portal. Please use Artist Studio login.');
        navigate('/auth/artist');
      }
      else if (role === 'listener') navigate('/');
      else navigate('/');
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
  const [phone, setPhone] = useState('');
  
  const [signupStep, setSignupStep] = useState<SignupStep>(1);

  if (loading && !user) {
    return (
       <div className="min-h-screen bg-smash-black flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-smash-orange border-t-transparent rounded-full animate-spin" />
       </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Email is required'); return; }
    if (!password) { toast.error('Password is required'); return; }

    setLoadingState(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Welcome back!');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoadingState(false);
    }
  };

  const nextStep = () => {
    if (!email) { toast.error('Email is required'); return; }
    if (!password || password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!fullName) { toast.error('Full name is required'); return; }
    if (!phone) { toast.error('Phone is required'); return; }
    setSignupStep(2);
  };

  const handleSignupAndSubscribe = async (plan: PlanChoice) => {
    setLoadingState(true);
    setError(null);
    try {
      // 1. Create User
      const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: fullName, role: 'listener', phone } }
      });
      if (error) throw error;
      
      if (!data.user) throw new Error("Registration failed");
      
      // 2. Set base listener profile
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        phone: phone,
        phone_verified: true, // Auto-verified for this prompt's requirement
        subscription_tier: 'Free',
        user_type: 'listener'
      });
      if (profileError) throw profileError;
      
      const userProfileObj = { id: data.user.id, email, full_name: fullName, is_artist: false };

      if (plan === 'free') {
        toast.success('Account created! Vibes loading...');
        await refreshProfile();
        navigate('/');
      } else {
        // Pop Paychangu for Premium/Family
        upgradeListenerPlan({
            plan: plan as any,
            user: userProfileObj
        });
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
      localStorage.setItem('smashify_auth_intent', 'listener');
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
          redirectTo: `${window.location.origin}/`
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
        redirectTo: `${window.location.origin}/auth/listener?mode=reset`,
      });
      if (error) throw error;
      toast.success('Password reset link sent to your email');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <div className="min-h-screen bg-smash-black flex flex-col md:flex-row relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-smash-orange/5 rounded-full blur-[140px] -ml-64 -mt-64" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-smash-cyan/5 rounded-full blur-[140px] -mr-64 -mb-64" />

      <div className="w-full md:w-[40%] bg-smash-dark/50 p-12 md:p-20 flex flex-col justify-between border-r border-white/5 relative z-10">
         <div>
            <button onClick={() => navigate('/')} className="mb-12 flex items-center gap-2 text-smash-gray hover:text-white transition-colors group">
               <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
               <span className="font-black text-[10px] uppercase tracking-widest">Back to Home</span>
            </button>
            <Logo size="lg" className="mb-20" />
            <AnimatePresence mode="wait">
               {mode === 'login' ? (
                  <motion.div key="l" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                     <h2 className="text-6xl md:text-8xl font-black font-studio italic uppercase tracking-tighter leading-none mb-10">HEAR<br/><span className="text-smash-orange">MORE</span></h2>
                     <p className="text-smash-gray text-xl md:text-2xl font-medium tracking-tight">Sign in to access your library, playlists, and personalized picks.</p>
                  </motion.div>
               ) : (
                  <motion.div key="sl" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                     <h2 className="text-6xl md:text-8xl font-black font-studio italic uppercase tracking-tighter leading-none mb-10">HEAR THE<br/><span className="text-smash-cyan">FUTURE</span></h2>
                     <p className="text-smash-gray text-xl md:text-2xl font-medium tracking-tight">Join 50k+ Malawians discovering the next local superstars every day.</p>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-20 md:px-24 md:py-32 relative z-10">
         <div className="max-w-xl w-full mx-auto">
            <h1 className="text-4xl font-black font-display uppercase italic tracking-tighter mb-8 bg-gradient-to-r from-smash-orange to-smash-cyan bg-clip-text text-transparent">Listener Portal</h1>
            
            <div className="flex gap-4 mb-12">
               <button onClick={() => { setMode('login'); setSignupStep(1); }} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${mode === 'login' ? 'bg-white text-black shadow-xl' : 'bg-white/5 text-smash-gray hover:bg-white/10'}`}>Log In</button>
               <button onClick={() => setMode('signup')} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${mode === 'signup' ? 'bg-white text-black shadow-xl' : 'bg-white/5 text-smash-gray hover:bg-white/10'}`}>Sign Up</button>
            </div>

            <AnimatePresence mode="wait">
               {mode === 'login' ? (
                  <motion.form key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8" onSubmit={handleLogin}>
                     <div className="space-y-6">
                        <AuthInput icon={<Mail size={20} />} type="email" placeholder="Email Address" value={email} onChange={setEmail} />
                        <AuthInput icon={<AppLockIcon size={20} />} type="password" placeholder="Password" value={password} onChange={setPassword} />
                     </div>
                     <button type="submit" disabled={loadingState} className="w-full py-6 bg-white text-smash-black rounded-[32px] font-black text-2xl uppercase tracking-widest shadow-2xl hover:bg-smash-orange hover:text-white transition-all transform hover:scale-[1.02] active:scale-95">
                        {loadingState ? 'Entering...' : 'Sign In'}
                     </button>
                     <div className="flex justify-between px-2">
                        <button type="button" onClick={handleForgotPassword} className="text-[10px] font-black text-smash-gray uppercase tracking-widest hover:text-white transition-colors">Forgot Password?</button>
                     </div>
                     <div className="pt-4 border-t border-white/5 space-y-4">
                        <button type="button" onClick={() => handleOAuth('google')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-white/10 transition-all">
                           <Chrome size={20} /> Continue with Google
                        </button>
                        <button type="button" onClick={() => navigate('/auth/artist')} className="w-full text-center text-[10px] font-black text-smash-gray uppercase tracking-widest hover:text-smash-purple transition-colors">Are you an Artist? Studio Access &rarr;</button>
                     </div>
                  </motion.form>
               ) : (
                  <motion.div key="signup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                     {signupStep === 1 ? (
                        <>
                           <div className="space-y-6">
                              <AuthInput icon={<User size={20} />} type="text" placeholder="Full Name" value={fullName} onChange={setFullName} />
                              <AuthInput icon={<Mail size={20} />} type="email" placeholder="Email Address" value={email} onChange={setEmail} />
                              <AuthInput icon={<Phone size={20} />} type="tel" placeholder="Phone (Airtel / TNM)" value={phone} onChange={setPhone} />
                              <AuthInput icon={<AppLockIcon size={20} />} type="password" placeholder="Create Password" value={password} onChange={setPassword} />
                           </div>
                           <button onClick={nextStep} className="w-full py-6 bg-white text-smash-black rounded-[32px] font-black text-2xl uppercase tracking-widest shadow-2xl hover:bg-smash-cyan hover:text-white transition-all transform hover:scale-[1.02] active:scale-95">
                              Next: Choose Plan
                           </button>
                           <div className="pt-4 border-t border-white/5">
                              <button type="button" onClick={() => handleOAuth('google')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-white/10 transition-all">
                                 <Chrome size={20} /> Join with Google
                              </button>
                           </div>
                        </>
                     ) : (
                        <div className="space-y-6">
                           <h3 className="text-xl font-black uppercase tracking-widest text-center mb-6">Choose Your Plan</h3>
                           
                           <div onClick={() => handleSignupAndSubscribe('free')} className="p-6 rounded-3xl border border-white/10 bg-white/5 hover:border-white transition-all cursor-pointer group">
                              <div className="flex justify-between items-center mb-2">
                                 <h4 className="font-black text-xl">FREE</h4>
                                 <span className="text-smash-gray font-bold group-hover:text-white transition-colors">MK 0</span>
                              </div>
                              <p className="text-sm text-smash-gray mb-4">Ad-supported listening, tips, limits on skips.</p>
                              <div className="text-[10px] font-black uppercase tracking-widest text-smash-cyan">Select Free &rarr;</div>
                           </div>

                           <div onClick={() => handleSignupAndSubscribe('premium')} className="p-6 rounded-3xl border-2 border-smash-orange bg-smash-orange/10 hover:bg-smash-orange/20 transition-all cursor-pointer relative overflow-hidden">
                              <div className="absolute top-4 right-4 bg-smash-orange text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Recommended</div>
                              <div className="flex justify-between items-center mb-2">
                                 <h4 className="font-black text-xl text-smash-orange">PREMIUM</h4>
                                 <span className="font-bold text-white mt-4">MK 750 /mo</span>
                              </div>
                              <p className="text-sm text-smash-gray mb-4">Ad-free, offline downloads, direct fan support.</p>
                              <div className="text-[10px] font-black uppercase tracking-widest text-smash-orange">Select Premium &rarr;</div>
                           </div>

                           <div onClick={() => handleSignupAndSubscribe('family')} className="p-6 rounded-3xl border border-white/10 bg-white/5 hover:border-white transition-all cursor-pointer group">
                              <div className="flex justify-between items-center mb-2">
                                 <h4 className="font-black text-xl">FAMILY</h4>
                                 <span className="text-smash-gray font-bold group-hover:text-white transition-colors">MK 3,500 /mo</span>
                              </div>
                              <p className="text-sm text-smash-gray mb-4">Up to 5 accounts, sharing allowed.</p>
                              <div className="text-[10px] font-black uppercase tracking-widest text-smash-cyan">Select Family &rarr;</div>
                           </div>
                           
                           <button onClick={() => setSignupStep(1)} className="w-full text-center mt-4 text-xs font-black uppercase tracking-widest text-smash-gray hover:text-white py-4">
                              <ChevronLeft size={16} className="inline mr-1" /> Back
                           </button>
                        </div>
                     )}
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

export default AuthListener;
