import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Lock as AppLockIcon, User, Chrome, AlertCircle, Headphones, Phone, Eye, EyeOff, Mic2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { upgradeListenerPlan } from '../lib/paychangu';
import toast from 'react-hot-toast';
import Logo from '../components/common/Logo';

type AuthMode = 'login' | 'signup';
type PlanChoice = 'Free' | 'Premium' | 'Family';

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
    localStorage.removeItem('smashify_auth_intent'); // Clear any stale intent on entry
    const qMode = searchParams.get('mode');
    if (qMode === 'signup') setMode('signup');
    else setMode('login');
  }, [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  if (loading && !user) {
    return (
       <div className="min-h-screen bg-[#0a0a0d] flex items-center justify-center">
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Email is required'); return; }
    if (!password || password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!fullName) { toast.error('Full name is required'); return; }
    if (!phone) { toast.error('Phone is required'); return; }
    
    await handleSignupAndSubscribe('Free');
  };

  const handleSignupAndSubscribe = async (plan: PlanChoice) => {
    setLoadingState(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: fullName, role: 'listener', phone } }
      });
      if (error) throw error;
      
      if (!data.user) throw new Error("Registration failed");
      
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        phone: phone,
        phone_verified: true,
        subscription_tier: 'Free',
        user_type: 'listener'
      });
      if (profileError) throw profileError;
      
      const userProfileObj = { id: data.user.id, email, full_name: fullName, is_artist: false };

      if (plan === 'Free') {
        toast.success('Account created! Vibes loading...');
        await refreshProfile();
        navigate('/');
      } else {
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
    <div className="min-h-screen bg-[#0a0a0d] flex items-center justify-center relative overflow-hidden px-4">
      {/* Background radial gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,95,0,0.07), transparent)'
        }}
      />
      {/* Background SVG Waveforms */}
      <div className="absolute inset-0 pointer-events-none opacity-40 flex items-center justify-center">
        <svg viewBox="0 0 1000 400" className="w-[150vw] max-w-none text-smash-orange/5" preserveAspectRatio="none">
           <path d="M0,200 C200,100 300,300 500,200 C700,100 800,300 1000,200" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 10"/>
           <path d="M0,250 C200,150 300,350 500,250 C700,150 800,350 1000,250" fill="none" stroke="currentColor" strokeWidth="1" />
           <path d="M0,150 C200,50 300,250 500,150 C700,50 800,250 1000,150" fill="none" stroke="currentColor" strokeWidth="1" />
           <path d="M0,220 C250,50 400,350 600,150 C800,-50 900,250 1000,220" fill="none" stroke="currentColor" strokeWidth="0.5" />
           <path d="M0,180 C150,300 350,50 550,250 C750,450 850,150 1000,180" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </div>

      {loadingState && (
        <div className="absolute inset-0 z-50 bg-[#0a0a0d]/80 backdrop-blur-md flex flex-col items-center justify-center">
           <div className="w-12 h-12 border-4 border-smash-orange border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="w-full max-w-[420px] bg-[#141418]/85 backdrop-blur-[24px] saturate-180 border border-white/10 rounded-[24px] p-8 md:p-10 relative z-10 mx-auto shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
           <Logo size="xl" />
           <p className="font-sans text-[13px] text-text-muted mt-2">Your music. Your stage.</p>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-[12px]">
           <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-[8px] font-sans font-medium text-[13px] transition-all ${mode === 'login' ? 'bg-bg-elevated text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}>Log In</button>
           <button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-[8px] font-sans font-medium text-[13px] transition-all ${mode === 'signup' ? 'bg-bg-elevated text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}>Sign Up</button>
        </div>

        <AnimatePresence mode="wait">
           {mode === 'login' ? (
              <motion.form key="login" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onSubmit={handleLogin} className="space-y-4">
                 <AuthInput icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} disabled={loadingState} />
                 <AuthInput icon={AppLockIcon} type="password" placeholder="Password" value={password} onChange={setPassword} disabled={loadingState} />
                 
                 <div className="flex justify-between items-center py-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                       <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 text-smash-orange focus:ring-smash-orange focus:ring-offset-0 transition-all cursor-pointer" />
                       <span className="text-[13px] font-sans text-text-muted group-hover:text-text-primary transition-colors">Remember me</span>
                    </label>
                    <button type="button" onClick={handleForgotPassword} className="text-[13px] font-sans text-text-muted hover:text-text-primary transition-colors">Forgot password?</button>
                 </div>

                 <button type="submit" disabled={loadingState} className="w-full h-[52px] rounded-[14px] font-display font-bold text-[15px] uppercase tracking-wide text-white shadow-sm transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] mt-2" style={{ background: 'linear-gradient(135deg, #ff5f00, #ff8c00)' }}>
                    LOG IN
                 </button>

                 <div className="relative flex items-center py-4">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink-0 mx-4 text-text-muted text-[11px] font-display font-medium uppercase tracking-widest">or</span>
                    <div className="flex-grow border-t border-white/10"></div>
                 </div>

                 <button type="button" onClick={() => handleOAuth('google')} className="w-full h-[52px] border border-white/10 rounded-[14px] flex items-center justify-center gap-3 font-sans font-medium text-[14px] hover:bg-white/5 transition-colors">
                    <Chrome size={18} /> Continue with Google
                 </button>
              </motion.form>
           ) : (
              <motion.form key="signup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onSubmit={handleSignup} className="space-y-4">
                 
                 {/* Role Selector BEFORE form */}
                 <div className="grid grid-cols-2 gap-3 mb-2">
                    <button type="button" className="h-[72px] border border-smash-orange bg-smash-orange/10 rounded-[14px] flex flex-col items-center justify-center gap-1 transition-all">
                       <Headphones size={20} className="text-smash-orange" />
                       <span className="font-sans font-medium text-[12px] text-text-primary">I'm a Listener</span>
                    </button>
                    <button type="button" onClick={() => navigate('/auth/artist?mode=signup')} className="h-[72px] border border-white/10 bg-white/5 rounded-[14px] flex flex-col items-center justify-center gap-1 hover:border-white/20 transition-all hover:bg-white/10">
                       <Mic2 size={20} className="text-text-muted" />
                       <span className="font-sans font-medium text-[12px] text-text-muted">I'm an Artist</span>
                    </button>
                 </div>

                 <AuthInput icon={User} type="text" placeholder="Full Name" value={fullName} onChange={setFullName} disabled={loadingState} />
                 <AuthInput icon={Mail} type="email" placeholder="Email Address" value={email} onChange={setEmail} disabled={loadingState} />
                 <AuthInput icon={Phone} type="tel" placeholder="Phone" value={phone} onChange={setPhone} disabled={loadingState} />
                 <AuthInput icon={AppLockIcon} type="password" placeholder="Create Password" value={password} onChange={setPassword} disabled={loadingState} />
                 
                 <button type="submit" disabled={loadingState} className="w-full h-[52px] rounded-[14px] font-display font-bold text-[15px] uppercase tracking-wide text-white shadow-sm transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] mt-2" style={{ background: 'linear-gradient(135deg, #ff5f00, #ff8c00)' }}>
                    REGISTER
                 </button>

                 <button type="button" onClick={() => handleOAuth('google')} className="w-full h-[52px] border border-white/10 rounded-[14px] flex items-center justify-center gap-3 font-sans font-medium text-[14px] hover:bg-white/5 transition-colors mt-4">
                    <Chrome size={18} /> Join with Google
                 </button>
              </motion.form>
           )}
        </AnimatePresence>

        {error && (
           <div className="mt-4 p-3 bg-smash-red/10 border border-smash-red/20 rounded-[10px] flex items-center gap-2 text-smash-red font-sans font-medium text-[13px]">
              <AlertCircle size={16} /> {error}
           </div>
        )}
      </div>
    </div>
  );
};

const AuthInput = ({ icon: Icon, value, onChange, type, ...props }: any) => {
   const [showPass, setShowPass] = useState(false);
   const isPassword = type === 'password';
   
   return (
      <div className="relative group">
         <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-smash-orange transition-colors pointer-events-none">
            {isPassword ? null : <Icon size={18} strokeWidth={1.5} />}
         </div>
         <input 
            type={isPassword ? (showPass ? 'text' : 'password') : type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            {...props} 
            className="w-full h-[52px] pl-4 pr-12 bg-white/5 border border-white/10 rounded-[14px] text-[14px] font-sans text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-smash-orange/60 focus:ring-[3px] focus:ring-smash-orange/12 transition-all"
         />
         {isPassword && (
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none">
               {showPass ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
            </button>
         )}
      </div>
   );
};

export default AuthListener;
