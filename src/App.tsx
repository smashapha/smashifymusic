import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ReactGA from 'react-ga4';
import { Toaster } from 'react-hot-toast';
import { PlayerProvider } from './context/PlayerContext';
import { AuthProvider } from './context/AuthContext';
import { AuthGateProvider } from './context/AuthGateContext';
import { motion } from 'motion/react';
const MainLayout = lazy(() => import('./components/common/MainLayout'));
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { verifyPayment } from './lib/paychangu';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { handleTrackDownload } from './lib/downloads';

import InstallPWA from './components/common/InstallPWA';

import { Mail, Phone, MessageSquare, Send, Facebook, Instagram, Youtube, Music } from 'lucide-react';
import toast from 'react-hot-toast';

import ScrollToTop from './components/common/ScrollToTop';
import Maintenance from './pages/Maintenance';
import Landing from './pages/Landing';
import BrandLoader from './components/common/BrandLoader';
const AuthListener = lazy(() => import('./pages/AuthListener'));
const AuthArtist = lazy(() => import('./pages/AuthArtist'));
const Home = lazy(() => import('./pages/Home'));
const ArtistHub = lazy(() => import('./pages/ArtistHub'));
const MotoFeed = lazy(() => import('./pages/MotoFeed'));
const About = lazy(() => import('./pages/About'));
const Help = lazy(() => import('./pages/Help'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Pricing = lazy(() => import('./pages/Pricing'));
const ArtistProfile = lazy(() => import('./pages/ArtistProfile'));
const SongDetails = lazy(() => import('./pages/SongDetails'));
const AlbumDetails = lazy(() => import('./pages/AlbumDetails'));
const PlaylistDetails = lazy(() => import('./pages/PlaylistDetails'));
const ArtistGuide = lazy(() => import('./pages/ArtistGuide'));
const ArtistLanding = lazy(() => import('./pages/ArtistLanding'));
const ArtistsBrowse = lazy(() => import('./pages/ArtistsBrowse'));
const Discover = lazy(() => import('./pages/Discover'));
const Library = lazy(() => import('./pages/Library'));
const Profile = lazy(() => import('./pages/Profile'));
const Trending = lazy(() => import('./pages/Trending'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ApplicationPending = lazy(() => import('./pages/ApplicationPending'));
const Admin = lazy(() => import('./pages/Admin'));
const Agent = lazy(() => import('./pages/Agent'));
const PaymentFailed = lazy(() => import('./pages/PaymentFailed'));

const PaymentRedirect = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [status, setStatus] = useState('Verifying your payment...');
  const hasKickedOff = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get('tx_ref') || params.get('reference');
    
    if (!txRef) {
      toast.error('No payment reference found.');
      navigate('/home', { replace: true });
      return;
    }

    if (hasKickedOff.current) return;
    hasKickedOff.current = true;

    const handleVerification = async () => {
      toast.loading('Confirming payment...', { id: 'payment-confirm' });
      try {
        const res = await verifyPayment(txRef);
        toast.success('Payment confirmed! ✅', { id: 'payment-confirm' });
        setStatus('Payment confirmed! Redirecting...');

        await new Promise(r => setTimeout(r, 1000));
        window.dispatchEvent(new CustomEvent('smashify:payment-success', { detail: { txRef, data: res } }));
      } catch (err) {
        toast.error('Payment received but confirmation is taking longer than usual. Your account will update shortly.', { id: 'payment-confirm', duration: 6000 });
      } finally {
        navigate('/home', { replace: true });
      }
    };
    handleVerification();
  }, [navigate, userProfile]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] text-white">
      <BrandLoader label={status || 'Verifying transaction'} />
    </div>
  );
};

const ArtistRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth/artist" />;
  // Both 'artist' AND 'pending' can enter the hub — pending is restricted inside
  if (role !== 'artist' && role !== 'pending' && role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
};

const ListenerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth/listener" />;
  // Optionally redirect artists away from listener-only pages if desired,
  // but for now, we'll let them access library/profile if they want.
  return <>{children}</>;
};

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('contact_messages').insert([formData]);
      if (error) throw error;
      toast.success('Message sent! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', message: '' });
    } catch (error: any) {
      toast.error('Failed to send message: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="text-4xl md:text-5xl font-bold font-studio tracking-tight mb-4 text-white">Contact <span className="text-[#00A3FF]">Us</span></h1>
      <p className="text-[#B0B0B0] text-lg mb-12">Have questions? We're here to help you get the most out of Smashify.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-5 p-6 bg-[#1A1A1A] rounded-[20px] border border-white/8">
            <div className="w-12 h-12 bg-[#00A3FF]/15 border border-[#00A3FF]/30 rounded-[14px] flex items-center justify-center text-[#00A3FF]">
              <Mail size={22} />
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-[#B0B0B0] mb-0.5">Email Us</p>
              <p className="font-semibold text-base text-white">smashfymusic@gmail.com</p>
            </div>
          </div>

          <div className="flex items-center gap-5 p-6 bg-[#1A1A1A] rounded-[20px] border border-white/8">
            <div className="w-12 h-12 bg-[#22C55E]/15 border border-[#22C55E]/30 rounded-[14px] flex items-center justify-center text-[#22C55E]">
              <Phone size={22} />
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-[#B0B0B0] mb-0.5">WhatsApp & Phone</p>
              <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="font-semibold text-base text-white hover:text-[#00A3FF] transition-colors">+265 88 372 88 68</a>
            </div>
          </div>

          <div className="p-6 bg-[#1A1A1A] rounded-[20px] border border-white/8">
            <h3 className="text-base font-bold text-white mb-4">Connect on Social</h3>
            <div className="grid grid-cols-2 gap-3">
              <a href="https://facebook.com/Smashify" aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[#B0B0B0] hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                <Facebook size={18} className="text-[#1877F2]" />
                <span className="font-medium text-[13px]">Facebook</span>
              </a>
              <a href="https://instagram.com/Smashify" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[#B0B0B0] hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                <Instagram size={18} className="text-[#E4405F]" />
                <span className="font-medium text-[13px]">Instagram</span>
              </a>
              <a href="https://tiktok.com/@Smashify" aria-label="TikTok" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[#B0B0B0] hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                <Music size={18} className="text-white" />
                <span className="font-medium text-[13px]">TikTok</span>
              </a>
              <a href="https://youtube.com/@Smashify" aria-label="YouTube" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[#B0B0B0] hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                <Youtube size={18} className="text-[#FF0000]" />
                <span className="font-medium text-[13px]">YouTube</span>
              </a>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-[#1A1A1A] p-6 rounded-[20px] border border-white/8">
          <div>
            <label className="text-[12px] font-medium text-[#B0B0B0] block mb-1.5">Name</label>
            <input 
              required
              type="text" 
              placeholder="Your Name" 
              className="w-full h-11 bg-[#0A0A0A] border border-white/10 px-4 rounded-[10px] text-white text-[14px] focus:outline-none focus:border-[#00A3FF]/50 transition-all placeholder:text-[#666]"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#B0B0B0] block mb-1.5">Email</label>
            <input 
              required
              type="email" 
              placeholder="Email Address" 
              className="w-full h-11 bg-[#0A0A0A] border border-white/10 px-4 rounded-[10px] text-white text-[14px] focus:outline-none focus:border-[#00A3FF]/50 transition-all placeholder:text-[#666]"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#B0B0B0] block mb-1.5">Message</label>
            <textarea 
              required
              rows={4}
              placeholder="How can we help?" 
              className="w-full bg-[#0A0A0A] border border-white/10 p-3.5 rounded-[10px] text-white text-[14px] focus:outline-none focus:border-[#00A3FF]/50 transition-all resize-none placeholder:text-[#666]"
              value={formData.message}
              onChange={e => setFormData({ ...formData, message: e.target.value })}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] text-white rounded-[10px] font-semibold text-[13px] flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={15} /> Send Message</>}
          </button>
        </form>
      </div>
    </div>
  );
};

const NotFound = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-8xl font-semibold font-studio tracking-tighter text-[#00A3FF] mb-2 drop-shadow-2xl">404</h1>
      <h2 className="text-2xl font-bold uppercase tracking-wider mb-4 text-white">Track Not Found</h2>
      <p className="text-[#B0B0B0] font-normal max-w-md mb-8 text-[14px]">
        Looks like you've navigated off the playlist. The page you're looking for doesn't exist or has moved.
      </p>
      <a href="/" className="h-11 px-8 bg-white hover:bg-white/90 text-black font-semibold rounded-[10px] transition-all shadow-xl flex items-center justify-center text-[13px]">
        Back to Home
      </a>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
    {/* Ambient Background Glow */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.16, 0.08] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="w-64 h-64 bg-[#00A3FF] rounded-full blur-[90px]"
      />
    </div>

    {/* Equalizer */}
    <div className="relative z-10 flex flex-col items-center">
      <div className="flex items-end gap-1.5 h-10">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="w-2 bg-[#00A3FF] rounded-full"
            animate={{ height: ["20%", "100%", "20%"] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
      
      {/* Loading Text */}
      <motion.p 
        className="mt-6 text-xs font-display font-semibold tracking-[0.25em] text-white uppercase"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        Loading
      </motion.p>
    </div>
  </div>
);

function AppContent() {
  const { user, role, loading: authLoading } = useAuth();
  const location = useLocation();
  const [maintenance, setMaintenance] = useState<{
    active: boolean;
    message?: string;
    estimatedTime?: string;
  } | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  // Track page views on every route change
  useEffect(() => {
    try {
      ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search });
    } catch (e) {
      console.warn('Google Analytics event tracking skipped (not initialized):', e);
    }
  }, [location]);

  

  useEffect(() => {
    const handleOffline = () => {
      toast.error('You are offline. Some features may not be available.', { duration: 5000 });
    };
    const handleOnline = () => {
      toast.success('Back online!', { duration: 3000 });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    // Initial fetch
    const fetchMaintenance = async () => {
      const timeout = setTimeout(() => {
        setMaintenance({ active: false });
        setMaintenanceLoading(false);
      }, 3000); // Safety net: always resolve within 3 seconds

      try {
        const { data } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'maintenance')
          .maybeSingle(); // Use maybeSingle instead of single — won't throw if no rows
        clearTimeout(timeout);
        setMaintenance(data?.value || { active: false });
      } catch {
        clearTimeout(timeout);
        setMaintenance({ active: false });
      } finally {
        setMaintenanceLoading(false);
      }
    };
    fetchMaintenance();

    // Realtime subscription — updates instantly when you change the flag
    const channel = supabase
      .channel('app-config-maintenance')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_config',
        filter: 'key=eq.maintenance'
      }, (payload) => {
        setMaintenance(payload.new.value);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (maintenanceLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <BrandLoader label="Connecting to Smashify" />
      </div>
    );
  }

  // Block all non-admin users during maintenance
  if (maintenance?.active && role !== 'admin') {
    return (
      <Maintenance
        message={maintenance.message}
        estimatedTime={maintenance.estimatedTime}
      />
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <BrandLoader label="Loading" />
      </div>
    }>
      <Routes>
        <Route path="/auth" element={<Navigate to="/auth/listener" replace />} />
        
        {/* Public Landing or Dashboard Redirect */}
        <Route path="/" element={<Landing />} />
        
        {/* Auth & Standalone Routes */}
        <Route path="/auth/listener" element={<AuthListener />} />
        <Route path="/auth/artist" element={<AuthArtist />} />
        <Route path="/artist-studio" element={<ArtistLanding />} />
        <Route path="/application-pending" element={role === 'pending' || role === 'artist' ? <Navigate to="/artist-hub" replace /> : <ApplicationPending />} />
        
        {/* Payment Processing Pages (Standalone) */}
        <Route path="/purchase-success" element={<PaymentRedirect />} />
        <Route path="/tip-success" element={<PaymentRedirect />} />
        <Route path="/subscribe-success" element={<PaymentRedirect />} />
        <Route path="/upgrade-success" element={<PaymentRedirect />} />
        <Route path="/tier-success" element={<PaymentRedirect />} />
        <Route path="/ad-success" element={<PaymentRedirect />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />

        {/* Artist Hub (Standalone for better editing experience) */}
        <Route 
          path="/artist-hub" 
          element={
            <ArtistRoute>
              <ArtistHub />
            </ArtistRoute>
          } 
        />

        {/* Main App Experience (Shared Layout) */}
        <Route path="/moto-feed" element={<MotoFeed />} />
        <Route element={<MainLayout />}>
          <Route path="home" element={<Home />} />
          <Route path="discover" element={<Discover />} />
          <Route path="trending" element={<Trending />} />
          <Route path="artists" element={<ArtistsBrowse />} />
          <Route 
            path="library" 
            element={
              <ListenerRoute>
                <Library />
              </ListenerRoute>
            } 
          />
          <Route 
            path="profile" 
            element={
              <ListenerRoute>
                <Profile />
              </ListenerRoute>
            } 
          />
          <Route 
            path="notifications" 
            element={
              <ListenerRoute>
                <Notifications />
              </ListenerRoute>
            } 
          />
          <Route path="artist/:id" element={<ArtistProfile />} />
          <Route path="song/:id" element={<SongDetails />} />
          <Route path="album/:id" element={<AlbumDetails />} />
          <Route path="playlist/:id" element={<PlaylistDetails />} />
          <Route path="search" element={<Discover />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="about" element={<About />} />
          <Route path="aboutus" element={<Navigate to="/about" replace />} />
          <Route path="about-us" element={<Navigate to="/about" replace />} />
          <Route path="artist-guide" element={<ArtistGuide />} />
          <Route path="help" element={<Help />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="privacypolicy" element={<Navigate to="/privacy" replace />} />
          <Route path="privacy-policy" element={<Navigate to="/privacy" replace />} />
          <Route path="contact" element={<Contact />} />
          <Route path="admin" element={<Admin />} />
          <Route 
            path="agent" 
            element={
              <ListenerRoute>
                <Agent />
              </ListenerRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <Router>
          <ScrollToTop />
          <Toaster position="bottom-center" toastOptions={{
            style: {
              background: '#1A1A1A',
              color: '#FFF',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
            }
          }} />
          <AuthProvider>
            <PlayerProvider>
              <AuthGateProvider>
              <AppContent />
                          </AuthGateProvider>
            </PlayerProvider>
          </AuthProvider>
        </Router>
        <InstallPWA />
      </ErrorBoundary>
    </HelmetProvider>
  );
}
