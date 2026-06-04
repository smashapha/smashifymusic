import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Lock as AppLockIcon, User, Check, ArrowRight, ShieldCheck, 
  Mic2, AlertCircle, Phone, MapPin, 
  Music, ChevronLeft, Disc, Chrome, Eye, EyeOff, Headphones
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { upgradeArtistTier } from '../lib/paychangu';
import toast from 'react-hot-toast';
import Logo from '../components/common/Logo';

type AuthMode = 'login' | 'signup';
type ArtistStep = 1 | 2 | 3 | 4;

const AuthArtist: React.FC = () => {
  const { user, userProfile, role, loading, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loadingState, setLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [stageName, setStageName] = useState('');
  const [genre, setGenre] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [artistStep, setArtistStep] = useState<ArtistStep>(1);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);

  const [nrcNumber, setNrcNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [nrcFormatValid, setNrcFormatValid] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'national_id' | 'passport' | 'drivers'>('national_id');

  useEffect(() => {
    if (user && !loading && role !== null) {
      if (mode !== 'signup' || artistStep !== 4) {
         if (role === 'artist' || role === 'pending') navigate('/artist-hub');
         else {
           toast.error('You are logged in as a Listener. Please apply if you wish to use the Artist Studio.');
           navigate('/');
         }
      }
    }
  }, [user, loading, role, navigate, mode, artistStep]);

  useEffect(() => {
    localStorage.removeItem('smashify_auth_intent'); // Clear any stale intent on entry
    const qMode = searchParams.get('mode');
    if (qMode === 'signup') setMode('signup');
    else setMode('login');
  }, [searchParams]);

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
      toast.success('Studio unlocked!');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoadingState(false);
    }
  };

   const submitApplication = async () => {
    setLoadingState(true);
    
    const emailCheck = await import('../lib/emailValidation').then(m => m.validateEmailStrict(email));
    if (!emailCheck.valid) {
      setLoadingState(false);
      return toast.error(emailCheck.message || 'Invalid email');
    }

    if (password.length < 8) {
      setLoadingState(false);
      toast.error('Password must be at least 8 characters');
      return;
    }

    // Check stage name is not already taken
    const stageTrimmed = stageName.trim();
    if (stageTrimmed.length < 2) {
      toast.error('Stage name must be at least 2 characters');
      setLoadingState(false);
      return;
    }

    try {
      const { data: existingStage } = await supabase
        .from('profiles')
        .select('id')
        .ilike('stage_name', stageTrimmed)
        .maybeSingle();

      if (existingStage) {
        toast.error(
          `"${stageTrimmed}" is already registered on Smashify. ` +
            'If you are the real artist, contact smashfymusic@gmail.com'
        );
        setLoadingState(false);
        return;
      }

      const { data: pendingApp } = await supabase
        .from('artist_applications')
        .select('id')
        .ilike('stage_name', stageTrimmed)
        .neq('status', 'rejected')
        .maybeSingle();

      if (pendingApp) {
        toast.error(
          `"${stageTrimmed}" already has a pending application. ` +
            'Contact smashfymusic@gmail.com if this is your name.'
        );
        setLoadingState(false);
        return;
      }
    } catch (checkErr) {
      console.warn('Stage name check failed:', checkErr);
      // Non-fatal — continue with signup
    }

    setError(null);

    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            stage_name: stageName,
            role: 'pending',
            phone,
          }
        }
      });
      if (signUpErr) throw signUpErr;
      if (!data.user) throw new Error('Account creation failed. Please try again.');

      const userId = data.user.id;

      let idUrl: string | null = null;
      let selfieUrl: string | null = null;

      const { error: appError } = await supabase
        .from('artist_applications')
        .insert({
          profile_id: userId,
          user_id: userId,
          full_name: fullName,
          stage_name: stageName,
          email: email,
          genre: genre,
          city: city,
          phone: phone,
          nrc_number: null,
          id_type: null,
          selfie_url: selfieUrl,
          id_document_url: idUrl,
          status: 'pending',
          referral_code: referralCode || null,
          agent_reference: referralCode || null,
        });

      if (appError) {
        console.error('artist_applications insert failed:', appError);
        if (appError.code === '23502') {
          throw new Error(
            'A required field is missing. Please go back and fill all fields.'
          );
        }
        if (appError.code === '42501') {
          throw new Error(
            'Permission denied saving application. Please try again or contact support.'
          );
        }
        throw new Error(`Application could not be saved: ${appError.message}`);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: fullName,
          stage_name: stageName,
          email: email,
          genre: genre,
          city: city,
          phone: phone,
          approved: false,
          user_type: 'artist',
          artist_tier: 'Free',
          agent_reference: referralCode || null,
        });

      if (profileError) {
        console.error('profiles insert failed:', profileError.message);
      }

      toast.success('Application submitted! We will review within 48 hours.');
      setArtistStep(4);

    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoadingState(false);
    }
  };

  const handlePlanSelection = async (plan: 'Free' | 'RisingStar' | 'Standard' | 'Elite') => {
    if (plan === 'Free') {
       toast.success('Your Free Studio application is under review.');
       await refreshProfile();
       navigate('/artist-hub');
    } else {
       if (!userProfile) return;
       upgradeArtistTier({
          tier: plan,
          artist: userProfile
       });
    }
  };

  const handleOAuth = async (provider: 'google') => {
    toast.error('Google sign-in is coming soon!');
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

  const sendOtp = async () => {
    if (!phone) return toast.error('Phone number is required');
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('twilio-verify', {
        body: { action: 'send', phone }
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setOtpSent(true);
      toast.success('Verification code sent!');
    } catch (err: any) {
      toast.error('Failed to send code: ' + err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) return toast.error('Enter the code sent to your phone');
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('twilio-verify', {
        body: { action: 'check', phone, code: otpCode }
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (!data.verified) throw new Error('Incorrect code. Please try again.');
      setOtpVerified(true);
      toast.success('Phone verified!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const nextArtistStep = () => {
    if (artistStep === 1) {
       if (!fullName || !stageName || !email) return toast.error('Please fill all fields');
    } else if (artistStep === 2) {
      if (!genre) return toast.error('Please select your genre');
      if (!phone) return toast.error('Phone number is required');
      if (!city) return toast.error('City is required');
    }
    setArtistStep(prev => (prev + 1) as ArtistStep);
  };
  const prevArtistStep = () => setArtistStep(prev => (prev - 1) as ArtistStep);

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
        <div className="absolute inset-0 z-[100] bg-[#0a0a0d]/80 backdrop-blur-md flex flex-col items-center justify-center">
           <div className="w-12 h-12 border-4 border-smash-orange border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="w-full max-w-[420px] bg-[#141418]/85 backdrop-blur-[24px] saturate-180 border border-white/10 rounded-[24px] p-8 md:p-10 relative z-10 mx-auto shadow-2xl pb-16 h-[85vh] overflow-y-auto no-scrollbar">
        <div className="text-center mb-8">
          <Logo size="lg" className="mx-auto mb-4" />
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-smash-purple/10 border border-smash-purple/20 rounded-full mb-3">
            <Mic2 size={16} className="text-smash-purple" />
            <span className="text-smash-purple text-xs font-black uppercase tracking-widest">
              Artist Studio
            </span>
          </div>
          <h1 className="text-2xl font-studio font-black uppercase italic text-white">
            {mode === 'login' ? 'Studio Access' : 'Apply as Artist'}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {mode === 'login'
              ? 'Sign in to your artist account'
              : 'Create your artist account and start earning'}
          </p>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-[12px]">
           <button onClick={() => { setMode('login'); setArtistStep(1); }} className={`flex-1 py-2 rounded-[8px] font-sans font-medium text-[13px] transition-all ${mode === 'login' ? 'bg-bg-elevated text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}>Log In</button>
           <button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-[8px] font-sans font-medium text-[13px] transition-all ${mode === 'signup' ? 'bg-bg-elevated text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}>Apply</button>
        </div>

        <AnimatePresence mode="wait">
           {mode === 'login' ? (
              <motion.form key="login" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onSubmit={handleLogin} className="space-y-4">
                 <AuthInput icon={Mail} type="email" placeholder="Artist Email" value={email} onChange={setEmail} disabled={loadingState} />
                 <AuthInput icon={AppLockIcon} type="password" placeholder="Password" value={password} onChange={setPassword} disabled={loadingState} />
                 
                 <div className="flex justify-between items-center py-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                       <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 text-smash-orange focus:ring-smash-orange focus:ring-offset-0 transition-all cursor-pointer" />
                       <span className="text-[13px] font-sans text-text-muted group-hover:text-text-primary transition-colors">Remember me</span>
                    </label>
                    <button type="button" onClick={handleForgotPassword} className="text-[13px] font-sans text-text-muted hover:text-text-primary transition-colors">Forgot password?</button>
                 </div>

                 <button type="submit" disabled={loadingState} className="w-full h-[52px] rounded-[14px] font-display font-bold text-[15px] uppercase tracking-wide text-white shadow-sm transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] mt-2" style={{ background: 'linear-gradient(135deg, #ff5f00, #ff8c00)' }}>
                    LOG IN TO STUDIO
                 </button>

                 <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-white/10"></div>
                 </div>
              </motion.form>
           ) : (
              <motion.div key="artist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                 
                 {/* Removed the Grid of Listeners / Artists toggles */}

                 {/* Stepper */}
                 {artistStep < 4 && (
                    <div className="flex items-center gap-2 mb-4">
                       {[1, 2, 3].map(s => (
                          <div key={s} className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                             <motion.div initial={{ width: 0 }} animate={{ width: artistStep >= s ? '100%' : '0%' }} className="h-full bg-smash-orange" />
                          </div>
                       ))}
                    </div>
                 )}

                 <AnimatePresence mode="wait">
                    {artistStep === 1 && (
                       <motion.div key="as1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <AuthInput icon={User} type="text" placeholder="Full Legal Name" value={fullName} onChange={setFullName} />
                          <AuthInput icon={Mic2} type="text" placeholder="Stage Name" value={stageName} onChange={setStageName} />
                          <AuthInput icon={Mail} type="email" placeholder="Professional Email" value={email} onChange={setEmail} />
                          <div>
                            <label className="text-[11px] font-black text-text-muted uppercase tracking-widest block mb-2">
                              Referral Code
                              <span className="text-[10px] normal-case font-normal ml-2 text-text-muted">
                                (optional — enter if someone referred you)
                              </span>
                            </label>
                            <input
                              type="text"
                              value={referralCode}
                              onChange={(e) => setReferralCode(
                                e.target.value.toUpperCase().trim()
                              )}
                              placeholder="e.g. AGENT-ABC123"
                              className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-5 text-white text-sm outline-none focus:border-smash-orange/50 font-mono"
                            />
                          </div>
                          <button onClick={nextArtistStep} className="w-full h-[52px] rounded-[14px] bg-bg-elevated text-text-primary font-display font-bold text-[13px] uppercase tracking-wide flex items-center justify-center gap-2 mt-4 hover:bg-white/10 transition-colors">
                             Next Step <ArrowRight size={16} />
                          </button>
                       </motion.div>
                    )}
                    {artistStep === 2 && (
                       <motion.div key="as2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <div>
                             <label className="text-[11px] font-black text-text-muted uppercase tracking-widest block mb-1">
                               Primary Genre
                             </label>
                             <div className="relative group">
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-smash-orange transition-colors pointer-events-none">
                                   <Disc size={18} strokeWidth={1.5} />
                                </div>
                                <select
                                   value={genre}
                                   onChange={(e) => setGenre(e.target.value)}
                                   className="w-full h-[52px] pl-4 pr-12 bg-white/5 border border-white/10 rounded-[14px] text-[14px] font-sans text-text-primary focus:outline-none focus:border-smash-orange/60 focus:ring-[3px] focus:ring-smash-orange/12 transition-all appearance-none cursor-pointer"
                                >
                                   <option value="" disabled className="bg-[#141418] text-text-muted">Select Primary Genre</option>
                                   <option value="Afropop" className="bg-[#141418] text-text-primary">Afropop</option>
                                   <option value="Gospel" className="bg-[#141418] text-text-primary">Gospel</option>
                                   <option value="Hip Hop" className="bg-[#141418] text-text-primary">Hip Hop</option>
                                   <option value="R&B" className="bg-[#141418] text-text-primary">R&B</option>
                                   <option value="Amapiano" className="bg-[#141418] text-text-primary">Amapiano</option>
                                   <option value="Reggae/Dancehall" className="bg-[#141418] text-text-primary">Reggae/Dancehall</option>
                                   <option value="Afrobeat" className="bg-[#141418] text-text-primary">Afrobeat</option>
                                   <option value="Traditional/Folk" className="bg-[#141418] text-text-primary">Traditional/Folk</option>
                                   <option value="Jazz" className="bg-[#141418] text-text-primary">Jazz</option>
                                   <option value="Electronic" className="bg-[#141418] text-text-primary">Electronic</option>
                                   <option value="Other" className="bg-[#141418] text-text-primary">Other</option>
                                </select>
                             </div>
                           </div>
                          <AuthInput icon={Phone} type="text" placeholder="Phone" value={phone} onChange={setPhone} />
                          
                          {/* Phone verification */}
                          {false ? (
                            <div className="space-y-2">
                              {!otpSent ? (
                                <button
                                  type="button"
                                  onClick={sendOtp}
                                  disabled={otpLoading || !phone}
                                  className="w-full h-[44px] rounded-[12px] border border-smash-orange/40 text-smash-orange text-[13px] font-bold hover:bg-smash-orange/10 transition-all disabled:opacity-40"
                                >
                                  {otpLoading ? 'Sending...' : 'Send Verification Code'}
                                </button>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-[11px] text-text-muted text-center">
                                    Code sent to <span className="text-white font-bold">{phone}</span>
                                  </p>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full h-[48px] text-center text-xl font-mono tracking-[0.5em] bg-white/5 border border-white/10 rounded-[12px] text-white focus:outline-none focus:border-smash-orange/60 transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={verifyOtp}
                                    disabled={otpLoading || otpCode.length < 4}
                                    className="w-full h-[44px] rounded-[12px] text-white font-bold text-[13px] uppercase disabled:opacity-40 transition-all"
                                    style={{ background: 'linear-gradient(135deg, #ff5f00, #ff8c00)' }}
                                  >
                                    {otpLoading ? 'Verifying...' : 'Verify Code'}
                                  </button>
                                  <button type="button" onClick={sendOtp} disabled={otpLoading} className="w-full text-[11px] text-text-muted hover:text-white transition-colors">
                                    Resend code
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-[10px]">
                              <Check size={14} className="text-green-400" />
                              <span className="text-green-400 text-[12px] font-bold">Phone verified</span>
                            </div>
                          )}

                          <AuthInput icon={MapPin} type="text" placeholder="City" value={city} onChange={setCity} />

                          <div className="flex gap-2 pt-2">
                             <button onClick={prevArtistStep} className="w-[52px] h-[52px] flex items-center justify-center bg-white/5 text-white rounded-[14px] hover:bg-white/10 transition-all"><ChevronLeft size={20} /></button>
                             <button onClick={nextArtistStep} className="flex-1 h-[52px] bg-bg-elevated text-text-primary rounded-[14px] font-display font-bold text-[13px] uppercase tracking-wide hover:bg-white/10 transition-all">Review</button>
                          </div>
                       </motion.div>
                    )}
                    {artistStep === 3 && (
                       <motion.div key="as3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <AuthInput icon={AppLockIcon} type="password" placeholder="Create Password" value={password} onChange={setPassword} />
                          <div className="p-4 rounded-[14px] bg-white/5 border border-white/10 space-y-2 text-left">
                             <div className="flex items-center gap-2">
                                <ShieldCheck className="text-smash-orange" size={16} />
                                <p className="text-[11px] font-display font-medium text-text-primary uppercase tracking-wide">Verification</p>
                             </div>
                             <p className="text-[12px] text-text-muted font-sans font-medium">Applications are reviewed within 48 hours. By applying, you agree to our Terms.</p>
                          </div>
                          <div className="flex flex-col gap-4 pt-2">
                             <label className="flex items-start gap-3 cursor-pointer text-left">
                               <div
                                 onClick={() => setAgreedToTerms(!agreedToTerms)}
                                 className={`mt-0.5 w-5 h-5 rounded-md border-2
                                   flex items-center justify-center shrink-0
                                   transition-all cursor-pointer
                                   ${agreedToTerms
                                     ? 'bg-smash-orange border-smash-orange'
                                     : 'border-white/20 bg-white/5'
                                   }`}
                               >
                                 {agreedToTerms && (
                                   <svg className="w-3 h-3 text-white" fill="none"
                                     viewBox="0 0 24 24" stroke="currentColor">
                                     <path strokeLinecap="round" strokeLinejoin="round"
                                       strokeWidth={3} d="M5 13l4 4L19 7" />
                                   </svg>
                                 )}
                               </div>
                               <span className="text-smash-gray text-xs leading-relaxed font-sans">
                                 I confirm this account represents me or my official
                                 brand. Creating fake artist accounts violates
                                 Smashify Terms of Service and may result in permanent
                                 account removal and legal action under Malawian law.
                               </span>
                             </label>
                             <div className="flex gap-2">
                               <button onClick={prevArtistStep} className="w-[52px] h-[52px] flex items-center justify-center bg-white/5 text-white rounded-[14px] hover:bg-white/10 transition-all"><ChevronLeft size={20} /></button>
                               <button onClick={submitApplication} disabled={loadingState || !agreedToTerms} className="flex-1 h-[52px] text-white rounded-[14px] font-display font-bold text-[15px] uppercase tracking-wide transition-all shadow-sm hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #ff5f00, #ff8c00)' }}>
                                  {loadingState ? 'Submitting...' : 'Submit Application'}
                               </button>
                             </div>
                          </div>
                       </motion.div>
                    )}
                    {artistStep === 4 && (
                       <motion.div key="as4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                          <h3 className="text-[16px] font-display font-bold text-center mb-6 text-smash-orange">Choose Plan</h3>
                          
                          <div onClick={() => handlePlanSelection('Free')} className="p-4 rounded-[16px] border border-white/10 bg-white/5 hover:border-white/20 transition-all cursor-pointer">
                             <div className="flex justify-between items-center mb-1">
                                <h4 className="font-sans font-semibold text-[14px]">Free Studio</h4>
                                <span className="text-[12px] text-text-muted">MK 0</span>
                             </div>
                             <p className="text-[12px] text-text-muted">5 Uploads, 15% fee, basic analytics.</p>
                          </div>

                          <div onClick={() => handlePlanSelection('Standard')} className="p-4 rounded-[16px] border-[2px] border-smash-orange bg-smash-orange/10 hover:bg-smash-orange/15 transition-all cursor-pointer relative overflow-hidden">
                             <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-smash-orange text-white text-[9px] font-semibold px-2 py-[2px] rounded-b-[4px] uppercase tracking-widest">Popular</div>
                             <div className="flex justify-between items-center mb-1 mt-2">
                                <h4 className="font-sans font-semibold text-[14px] text-smash-orange">Standard</h4>
                                <span className="font-sans font-semibold text-[13px] text-white">MK 13,000 / 6mo</span>
                             </div>
                             <p className="text-[12px] text-text-muted">30 uploads per year, 7% fee, advanced analytics.</p>
                          </div>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </motion.div>
           )}
        </AnimatePresence>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-text-muted text-xs mb-3">
            Just here to listen?
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth/listener')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-smash-orange/10 border border-smash-orange/20 rounded-full text-smash-orange text-xs font-bold hover:bg-smash-orange/20 transition-all"
          >
            <Headphones size={14} />
            Go to Listener Sign Up →
          </button>
        </div>

        {error && (
           <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-[10px] flex items-center gap-2 text-red-400 font-sans font-medium text-[13px]">
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

export default AuthArtist;
