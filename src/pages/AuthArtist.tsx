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
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [stageName, setStageName] = useState('');
  const [genre, setGenre] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [artistStep, setArtistStep] = useState<ArtistStep>(1);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);

  const [nrcNumber, setNrcNumber] = useState('');
  const [nrcFormatValid, setNrcFormatValid] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'nrc' | 'passport' | 'drivers'>('nrc');

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
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!idDocFile) {
      toast.error('Please upload a photo of your ID document');
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
          'If you are the real artist, contact support@smashify.mw'
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
          'Contact support@smashify.mw if this is your name.'
        );
        setLoadingState(false);
        return;
      }
    } catch (checkErr) {
      console.warn('Stage name check failed:', checkErr);
      // Non-fatal — continue with signup
    }

    setLoadingState(true);
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
      try {
        const fileExt = idPhoto.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${userId}/id-document.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('artist-verifications')
          .upload(fileName, idPhoto, {
            upsert: true,
            contentType: idPhoto.type,
          });

        if (uploadError) throw uploadError;

        const { data: signedData, error: signedErr } =
          await supabase.storage
            .from('artist-verifications')
            .createSignedUrl(fileName, 60 * 60 * 24 * 365);

        if (!signedErr && signedData) {
          idUrl = signedData.signedUrl;
        }

      } catch (uploadErr: any) {
        console.error('ID upload error:', uploadErr.message);
        toast(
          'ID photo upload failed. Application saved without it. Contact support to re-upload.',
          { icon: '⚠️', duration: 5000 }
        );
      }

      // Upload selfie
      let selfieUrl: string | null = null;
      if (selfieFile) {
        try {
          const selfieExt = selfieFile.name.split('.').pop() || 'jpg';
          const selfiePath = `${userId}/selfie-with-id.${selfieExt}`;
          const { error: selfieUploadErr } = await supabase
            .storage.from('artist-verifications')
            .upload(selfiePath, selfieFile, { upsert: true });
          if (!selfieUploadErr) {
            const { data: selfieData } = await supabase.storage
              .from('artist-verifications')
              .createSignedUrl(selfiePath, 60 * 60 * 24 * 365);
            selfieUrl = selfieData?.signedUrl || null;
          }
        } catch (e) {
          console.warn('Selfie upload failed:', e);
        }
      }

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
          national_id_number: nrcNumber,
          id_type: verificationMethod,
          selfie_url: selfieUrl,
          id_document_url: idUrl,
          status: 'pending',
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
      if (!genre) return toast.error('Please select your genre');
      if (!phone) return toast.error('Phone number is required');
      if (!city) return toast.error('City is required');
      if (!idDocFile) return toast.error('Please upload a photo of your ID document');
      if (!selfieFile) return toast.error('Please take a selfie holding your ID');
      if (!nrcFormatValid && verificationMethod === 'nrc') {
        return toast.error('Please enter a valid NRC number (format: 123456/78/9)');
      }
      if (!nrcNumber) return toast.error('Please enter your ID number');
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
        <div className="flex flex-col items-center text-center mb-8">
           <Logo size="xl" />
           <p className="font-sans text-[13px] text-text-muted mt-2">Artist Studio</p>
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

                 <div className="relative flex items-center py-4">
                    <div className="flex-grow border-t border-white/10"></div>
                 </div>

                 <button type="button" onClick={() => navigate('/auth/listener')} className="w-full h-[52px] border border-white/10 hover:border-smash-orange/50 rounded-[14px] flex items-center justify-center gap-3 font-sans font-medium text-[14px] hover:bg-smash-orange/10 text-text-muted hover:text-smash-orange transition-colors">
                    <Headphones size={18} /> I'm a Listener
                 </button>
              </motion.form>
           ) : (
              <motion.div key="artist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                 
                 {artistStep === 1 && (
                     <div className="grid grid-cols-2 gap-3 mb-2">
                        <button type="button" onClick={() => navigate('/auth/listener?mode=signup')} className="h-[72px] border border-white/10 bg-white/5 rounded-[14px] flex flex-col items-center justify-center gap-1 hover:border-white/20 transition-all hover:bg-white/10">
                           <Headphones size={20} className="text-text-muted" />
                           <span className="font-sans font-medium text-[12px] text-text-muted">I'm a Listener</span>
                        </button>
                        <button type="button" className="h-[72px] border border-smash-orange bg-smash-orange/10 rounded-[14px] flex flex-col items-center justify-center gap-1 transition-all">
                           <Mic2 size={20} className="text-smash-orange" />
                           <span className="font-sans font-medium text-[12px] text-text-primary">I'm an Artist</span>
                        </button>
                     </div>
                 )}

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
                          <button onClick={nextArtistStep} className="w-full h-[52px] rounded-[14px] bg-bg-elevated text-text-primary font-display font-bold text-[13px] uppercase tracking-wide flex items-center justify-center gap-2 mt-4 hover:bg-white/10 transition-colors">
                             Next Step <ArrowRight size={16} />
                          </button>
                       </motion.div>
                    )}
                    {artistStep === 2 && (
                       <motion.div key="as2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <AuthInput icon={Disc} type="text" placeholder="Primary Genre" value={genre} onChange={setGenre} />
                          <AuthInput icon={Phone} type="text" placeholder="Phone" value={phone} onChange={setPhone} />
                          <AuthInput icon={MapPin} type="text" placeholder="City" value={city} onChange={setCity} />
                          
                          {/* Verification Method Selector */}
                          <div>
                            <p className="text-[11px] font-black text-text-muted uppercase tracking-widest mb-3">
                              Identity Verification
                            </p>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              {[
                                { id: 'nrc', label: 'NRC Card', emoji: '🪪' },
                                { id: 'passport', label: 'Passport', emoji: '📗' },
                                { id: 'drivers', label: "Driver's Licence", emoji: '🚗' }
                              ].map((method) => (
                                <button
                                  key={method.id}
                                  type="button"
                                  onClick={() => setVerificationMethod(method.id as any)}
                                  className={`p-3 rounded-[12px] border text-center transition-all text-xs font-bold
                                    ${verificationMethod === method.id
                                      ? 'border-smash-orange bg-smash-orange/10 text-smash-orange'
                                      : 'border-white/10 bg-white/5 text-text-muted'
                                    }`}
                                >
                                  <div className="text-xl mb-1">{method.emoji}</div>
                                  {method.label}
                                </button>
                              ))}
                            </div>

                            {/* NRC Number Input with format validation */}
                            {verificationMethod === 'nrc' && (
                              <div className="mb-4">
                                <label className="text-[11px] font-black text-text-muted uppercase tracking-widest block mb-2">
                                  NRC Number
                                </label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={nrcNumber}
                                    onChange={(e) => {
                                      const val = e.target.value.toUpperCase().replace(/[^0-9A-Z/]/g, '');
                                      setNrcNumber(val);
                                      const nrcRegex = /^\d{6}\/\d{2}\/\d{1}$/;
                                      setNrcFormatValid(nrcRegex.test(val));
                                    }}
                                    placeholder="e.g. 123456/78/9"
                                    maxLength={11}
                                    className={`w-full h-14 bg-white/5 border rounded-[12px] px-4 text-white font-mono text-lg tracking-widest outline-none transition-all ${nrcFormatValid
                                        ? 'border-smash-green text-smash-green'
                                        : nrcNumber.length > 0
                                        ? 'border-smash-orange/50'
                                        : 'border-white/10'
                                      }`}
                                  />
                                  {nrcFormatValid && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-smash-green">
                                      ✓
                                    </div>
                                  )}
                                </div>
                                {nrcNumber.length > 0 && !nrcFormatValid && (
                                  <p className="text-[11px] text-smash-orange mt-1">
                                    Format: 123456/78/9 (numbers and slashes only)
                                  </p>
                                )}
                                {nrcFormatValid && (
                                  <p className="text-[11px] text-smash-green mt-1">
                                    ✓ NRC format valid
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Passport/Drivers input */}
                            {verificationMethod !== 'nrc' && (
                              <div className="mb-4">
                                <label className="text-[11px] font-black text-text-muted uppercase tracking-widest block mb-2">
                                  {verificationMethod === 'passport' 
                                    ? 'Passport Number' 
                                    : 'Licence Number'}
                                </label>
                                <input
                                  type="text"
                                  value={nrcNumber}
                                  onChange={(e) => {
                                    setNrcNumber(e.target.value.toUpperCase());
                                    setNrcFormatValid(e.target.value.length >= 5);
                                  }}
                                  placeholder={verificationMethod === 'passport' 
                                    ? 'e.g. MW1234567' 
                                    : 'e.g. DL123456'}
                                  className="w-full h-14 bg-white/5 border border-white/10 rounded-[12px] px-4 text-white font-mono text-base outline-none focus:border-smash-orange/50"
                                />
                              </div>
                            )}

                            {/* ID Document Photo Upload */}
                            <div className="mb-4">
                              <label className="text-[11px] font-black text-text-muted uppercase tracking-widest block mb-2">
                                Photo of Your {verificationMethod === 'nrc' 
                                  ? 'NRC Card' 
                                  : verificationMethod === 'passport' 
                                  ? 'Passport' 
                                  : "Driver's Licence"}
                                <span className="text-smash-orange ml-1">*</span>
                              </label>
                              <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-[16px] cursor-pointer transition-all ${idDocFile
                                  ? 'border-smash-green bg-smash-green/5'
                                  : 'border-white/20 bg-white/5 hover:border-smash-orange/50'
                                }`}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setIdDocFile(file);
                                      setIdPhoto(file); // keep backward compat
                                    }
                                  }}
                                />
                                {idDocFile ? (
                                  <div className="text-center">
                                    <p className="text-smash-green font-bold text-sm">
                                      ✓ {idDocFile.name}
                                    </p>
                                    <p className="text-[11px] text-text-muted mt-1">
                                      Tap to replace
                                    </p>
                                  </div>
                                ) : (
                                  <div className="text-center px-4">
                                    <p className="text-2xl mb-2">📷</p>
                                    <p className="text-sm font-bold text-white/60">
                                      Take a photo or upload your ID
                                    </p>
                                    <p className="text-[11px] text-text-muted mt-1">
                                      Make sure all text is clearly visible
                                    </p>
                                  </div>
                                )}
                              </label>
                            </div>

                            {/* Selfie Upload */}
                            <div>
                              <label className="text-[11px] font-black text-text-muted uppercase tracking-widest block mb-2">
                                Selfie Holding Your ID
                                <span className="text-smash-orange ml-1">*</span>
                                <span className="text-[10px] font-normal normal-case text-text-muted ml-2">
                                  (Helps prevent fake accounts)
                                </span>
                              </label>
                              <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-[16px] cursor-pointer transition-all ${selfieFile
                                  ? 'border-smash-green bg-smash-green/5'
                                  : 'border-white/20 bg-white/5 hover:border-smash-orange/50'
                                }`}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="user"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setSelfieFile(file);
                                  }}
                                />
                                {selfieFile ? (
                                  <div className="text-center">
                                    <p className="text-smash-green font-bold text-sm">
                                      ✓ Selfie captured
                                    </p>
                                    <p className="text-[11px] text-text-muted mt-1">
                                      Tap to retake
                                    </p>
                                  </div>
                                ) : (
                                  <div className="text-center px-4">
                                    <p className="text-2xl mb-2">🤳</p>
                                    <p className="text-sm font-bold text-white/60">
                                      Take a selfie holding your ID
                                    </p>
                                    <p className="text-[11px] text-text-muted mt-1">
                                      Face and ID must both be visible
                                    </p>
                                  </div>
                                )}
                              </label>
                            </div>
                          </div>
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
                               <button onClick={submitApplication} disabled={loadingState || !agreedToTerms || !idDocFile} className="flex-1 h-[52px] text-white rounded-[14px] font-display font-bold text-[15px] uppercase tracking-wide transition-all shadow-sm hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #ff5f00, #ff8c00)' }}>
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
                                <span className="font-sans font-semibold text-[13px] text-white">MK 25,000 /yr</span>
                             </div>
                             <p className="text-[12px] text-text-muted">Unlimited uploads, 7% fee, advanced analytics.</p>
                          </div>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </motion.div>
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

export default AuthArtist;
