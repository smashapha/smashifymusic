import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { PlayerProvider } from './context/PlayerContext';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/common/MainLayout';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import PaymentModal from './components/common/PaymentModal';
import { verifyPayment } from './lib/paychangu';

import ErrorBoundary from './components/common/ErrorBoundary';

import { Mail, Phone, MessageSquare, Send, Facebook, Instagram, Youtube, Music } from 'lucide-react';
import toast from 'react-hot-toast';

import { lazy, Suspense } from 'react';
import Maintenance from './pages/Maintenance';
const Landing = lazy(() => import('./pages/Landing'));
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
const AlbumDetails = lazy(() => import('./pages/AlbumDetails'));
const PlaylistDetails = lazy(() => import('./pages/PlaylistDetails'));
const ArtistLanding = lazy(() => import('./pages/ArtistLanding'));
const Discover = lazy(() => import('./pages/Discover'));
const Library = lazy(() => import('./pages/Library'));
const Profile = lazy(() => import('./pages/Profile'));
const Trending = lazy(() => import('./pages/Trending'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ApplicationPending = lazy(() => import('./pages/ApplicationPending'));
const Admin = lazy(() => import('./pages/Admin'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentFailed = lazy(() => import('./pages/PaymentFailed'));

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
      <h1 className="text-6xl font-black font-studio italic uppercase tracking-tighter mb-4">Contact <span className="text-smash-purple">US</span></h1>
      <p className="text-smash-gray text-xl mb-12">Have questions? We're here to help you amplify your music.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
            <div className="w-12 h-12 bg-smash-purple/20 rounded-2xl flex items-center justify-center text-smash-purple">
              <Mail size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-smash-gray mb-1">Email Us</p>
              <p className="font-bold text-lg">smashfymusic@gmail.com</p>
            </div>
          </div>

          <div className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
            <div className="w-12 h-12 bg-smash-cyan/20 rounded-2xl flex items-center justify-center text-smash-cyan">
              <Phone size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-smash-gray mb-1">WhatsApp & Call</p>
              <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="font-bold text-lg hover:text-smash-cyan transition-colors">+265 88 372 88 68</a>
            </div>
          </div>

          <div className="p-8 bg-smash-purple/10 rounded-3xl border border-smash-purple/20">
            <h3 className="text-lg font-black uppercase italic mb-2 text-smash-purple">Social Media</h3>
            <div className="space-y-4 mt-4">
              <a href="https://facebook.com/Smashify" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-smash-gray hover:text-white transition-colors">
                <Facebook size={18} className="text-blue-500" />
                <span className="font-bold">Smashify</span>
              </a>
              <a href="https://instagram.com/Smashify" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-smash-gray hover:text-white transition-colors">
                <Instagram size={18} className="text-pink-500" />
                <span className="font-bold">Smashify</span>
              </a>
              <a href="https://tiktok.com/@Smashify" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-smash-gray hover:text-white transition-colors">
                <Music size={18} className="text-white" />
                <span className="font-bold">Smashify</span>
              </a>
              <a href="https://youtube.com/@Smashify" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-smash-gray hover:text-white transition-colors">
                <Youtube size={18} className="text-red-500" />
                <span className="font-bold">Smashify</span>
              </a>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-smash-gray ml-2">Name</label>
            <input 
              required
              type="text" 
              placeholder="Your Name" 
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold focus:outline-none focus:border-smash-purple transition-all"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-smash-gray ml-2">Email</label>
            <input 
              required
              type="email" 
              placeholder="Email Address" 
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold focus:outline-none focus:border-smash-purple transition-all"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-smash-gray ml-2">Message</label>
            <textarea 
              required
              rows={4}
              placeholder="How can we help?" 
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold focus:outline-none focus:border-smash-purple transition-all resize-none"
              value={formData.message}
              onChange={e => setFormData({ ...formData, message: e.target.value })}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-smash-purple text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={18} /> Send Message</>}
          </button>
        </form>
      </div>
    </div>
  );
};

const NotFound = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-9xl font-black font-display italic tracking-tighter text-smash-purple mb-4 drop-shadow-2xl">404</h1>
      <h2 className="text-3xl font-bold uppercase tracking-widest mb-6">Track Not Found</h2>
      <p className="text-smash-gray font-medium max-w-md mb-8">
        Looks like you've skipped too far. The page you're looking for doesn't exist or has been removed.
      </p>
      <a href="/" className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-full hover:bg-smash-orange hover:text-white transition-all shadow-xl active:scale-95">
        Go Back Home
      </a>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="min-h-screen bg-bg-page flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-smash-purple border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function AppContent() {
  const { user, role, loading: authLoading } = useAuth();
  const [maintenance, setMaintenance] = useState<{
    active: boolean;
    message?: string;
    estimatedTime?: string;
  } | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  const [paymentModal, setPaymentModal] = useState<{
    checkoutUrl: string
    txRef: string
  } | null>(null)

  const handlePaymentSuccess = async (txRef: string) => {
    setPaymentModal(null)
    toast.loading('Confirming payment...', { id: 'payment-confirm' })
    try {
      await verifyPayment(txRef)
      toast.success('Payment confirmed! ✅', { id: 'payment-confirm' })
      // Give backend 2 seconds then refresh profile
      await new Promise(r => setTimeout(r, 2000))
      window.dispatchEvent(new CustomEvent('smashify:payment-success', { detail: { txRef } }))
    } catch {
      toast.error('Payment received but confirmation is taking longer than usual. Your account will update shortly.', { id: 'payment-confirm', duration: 6000 })
    }
  }

  // Expose globally so paychangu.ts can trigger it
  useEffect(() => {
    (window as any).__smashifyShowPayment = (checkoutUrl: string, txRef: string) => {
      setPaymentModal({ checkoutUrl, txRef })
    }
    return () => { delete (window as any).__smashifyShowPayment }
  }, [])

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
      try {
        const { data } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'maintenance')
          .single();
        setMaintenance(data?.value || { active: false });
      } catch {
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
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-smash-orange border-t-transparent rounded-full animate-spin"></div>
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
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-smash-orange border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <Routes>
        <Route path="/auth" element={<Navigate to="/auth/listener" replace />} />
        
        {/* Public Landing or Dashboard Redirect */}
        <Route path="/" element={user ? <Navigate to="/home" replace /> : <Landing />} />
        
        {/* Auth & Standalone Routes */}
        <Route path="/auth/listener" element={<AuthListener />} />
        <Route path="/auth/artist" element={<AuthArtist />} />
        <Route path="/artists" element={<ArtistLanding />} />
        <Route path="/application-pending" element={role === 'pending' || role === 'artist' ? <Navigate to="/artist-hub" replace /> : <ApplicationPending />} />
        
        {/* Payment Processing Pages (Standalone) */}
        <Route path="/purchase-success" element={<PaymentSuccess />} />
        <Route path="/tip-success" element={<PaymentSuccess />} />
        <Route path="/subscribe-success" element={<PaymentSuccess />} />
        <Route path="/upgrade-success" element={<PaymentSuccess />} />
        <Route path="/tier-success" element={<PaymentSuccess />} />
        <Route path="/ad-success" element={<PaymentSuccess />} />
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
          <Route path="home" element={user ? <Home /> : <Navigate to="/" replace />} />
          <Route path="discover" element={<Discover />} />
          <Route path="trending" element={<Trending />} />
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
          <Route path="album/:id" element={<AlbumDetails />} />
          <Route path="playlist/:id" element={<PlaylistDetails />} />
          <Route path="search" element={<Discover />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="about" element={<About />} />
          <Route path="aboutus" element={<Navigate to="/about" replace />} />
          <Route path="about-us" element={<Navigate to="/about" replace />} />
          <Route path="help" element={<Help />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="privacypolicy" element={<Navigate to="/privacy" replace />} />
          <Route path="privacy-policy" element={<Navigate to="/privacy" replace />} />
          <Route path="contact" element={<Contact />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      {paymentModal && (
        <PaymentModal
          checkoutUrl={paymentModal.checkoutUrl}
          txRef={paymentModal.txRef}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPaymentModal(null)}
        />
      )}
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
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
            <AppContent />
          </PlayerProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
