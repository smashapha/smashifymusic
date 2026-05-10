import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Search, Library, User, Music, TrendingUp, Mic2, Compass, Flame, Wifi, WifiOff, LogOut, Menu, X } from 'lucide-react';
import GlobalPlayer from '../player/GlobalPlayer';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const TopBar = ({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) => {
  const { dataSaver, toggleDataSaver } = usePlayer();
  const { user, signOut, userProfile, role } = useAuth();
  const navigate = useNavigate();

  const accentColor = role === 'artist' ? 'smash-purple' : 'smash-orange';

  return (
    <div className="h-20 flex items-center justify-between px-4 md:px-8 bg-smash-black/80 backdrop-blur-xl sticky top-0 z-30 border-b border-white/5">
      <button 
        onClick={onOpenMobileMenu}
        className="md:hidden p-2 text-smash-gray hover:text-white transition-colors"
      >
        <Menu size={24} />
      </button>

      <div className="flex-1 max-w-xl hidden md:block">
        <form className="relative group" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const q = formData.get('q');
          if (q) {
             navigate(`/discover?q=${encodeURIComponent(q.toString())}`);
          }
        }}>
           <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-smash-gray group-focus-within:text-${accentColor} transition-colors`} />
           <input 
            type="text" 
            name="q"
            placeholder="Search artists, songs, podcasts..." 
            className={`w-full bg-smash-dark/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-${accentColor}/20 transition-all backdrop-blur-md`}
           />
        </form>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <ThemeToggle />
        <button 
           onClick={toggleDataSaver}
           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${dataSaver ? `bg-${accentColor} text-white shadow-${accentColor}/20` : 'bg-smash-dark text-smash-gray hover:text-white border border-white/5'}`}
        >
          {dataSaver ? <WifiOff size={14} /> : <Wifi size={14} />}
          {dataSaver ? 'DATA SAVER ON' : 'DATA SAVER OFF'}
        </button>
        {user && (
          <button 
            onClick={() => signOut()}
            className="p-3 bg-smash-dark border border-white/5 rounded-xl text-smash-gray hover:text-smash-red transition-colors"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

const Sidebar = ({ onClose }: { onClose?: () => void }) => {
  const { user, userProfile, role } = useAuth();
  const navigate = useNavigate();
  const { dataSaver, playSong } = usePlayer();
  const [spotlightSong, setSpotlightSong] = useState<any>(null);

  React.useEffect(() => {
    supabase
      .from('songs')
      .select('*, profiles!artist_id(stage_name)')
      .eq('approved', true)
      .order('plays', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setSpotlightSong(data); });
  }, []);

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Flame, label: 'Moto Feed', path: '/moto-feed' },
    { icon: Compass, label: 'Discover', path: '/discover' },
    { icon: TrendingUp, label: 'Trending', path: '/trending' },
    { icon: Library, label: 'Library', path: '/library' },
  ];

  const accentColor = role === 'artist' ? 'smash-purple' : 'smash-orange';

  return (
    <aside className="flex flex-col h-full bg-smash-black p-6 overflow-y-auto scrollbar-hide">
      <div className="flex items-center justify-between mb-12 px-2">
        <Logo size="md" />
        {onClose && (
          <button onClick={onClose} className="md:hidden p-2 text-smash-gray hover:text-white">
            <X size={24} />
          </button>
        )}
      </div>

      <nav className="space-y-1">
        <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest px-4 mb-4">Discovery</p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group relative ${
                isActive 
                  ? 'bg-white/10 text-white shadow-lg shadow-black/20' 
                  : 'text-smash-gray hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? `text-${accentColor}` : `group-hover:text-${accentColor} transition-colors`} />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className={`absolute left-0 w-1 h-6 bg-${accentColor} rounded-full`}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-10 space-y-1">
        <p className="px-4 text-[10px] font-black text-smash-gray uppercase tracking-widest mb-4">Your Studio</p>
        <NavLink
            to={role === 'artist' || role === 'pending' ? "/artist-hub" : "/artists"}
            className={({ isActive }) => 
              `flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${
                isActive 
                  ? 'bg-white/10 text-white shadow-lg' 
                  : 'text-smash-gray hover:bg-white/5 hover:text-white'
              }`
            }
          >
           <Mic2 size={20} className={`group-hover:text-${accentColor} transition-colors`} />
           <span>Artist Portal</span>
        </NavLink>
      </div>

      {/* Sidebar Promo Card for Artists */}
      {role !== 'artist' && role !== 'pending' && (
        <div className="mt-10 p-6 rounded-[32px] bg-gradient-to-br from-smash-purple to-smash-purple/60 relative overflow-hidden group cursor-pointer shadow-xl shadow-smash-purple/10 transform hover:-translate-y-1 transition-transform">
           <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform">
              <Mic2 size={80} />
           </div>
           <p className="text-[10px] font-black tracking-widest text-white/50 mb-1 uppercase">Earn Money</p>
           <h4 className="font-display font-black italic text-lg leading-tight mb-4 tracking-tighter">WANT TO<br/>UPLOAD?</h4>
           <button 
            onClick={() => navigate('/artists')}
            className={`w-full py-2 bg-white text-smash-black rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-black hover:text-white transition-colors`}
           >
             JOIN AS ARTIST
           </button>
        </div>
      )}

      {/* Mini Slider in Sidebar */}
      {spotlightSong && (
      <div className="mt-10 p-4 rounded-3xl bg-white/5 border border-white/5 cursor-pointer" onClick={() => playSong(spotlightSong)}>
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest leading-none">Spotlight</p>
          <div className="flex gap-1">
             <div className={`w-1.5 h-1.5 rounded-full bg-${accentColor}`} />
             <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden group">
           {!dataSaver ? (
             <img 
               src={spotlightSong.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=200&fit=crop"} 
               className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
               alt="Spotlight"
               referrerPolicy="no-referrer"
             />
           ) : (
             <div className="w-full h-full bg-smash-dark flex items-center justify-center">
               <Music size={32} className="text-smash-gray opacity-20" />
             </div>
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
              <p className="text-white font-bold text-xs truncate">{spotlightSong.title}</p>
              <p className="text-smash-gray text-[10px] uppercase font-black tracking-tighter">{spotlightSong.profiles?.stage_name || 'Artist'}</p>
           </div>
        </div>
      </div>
      )}

      <div className="mt-auto pt-6 border-t border-white/5">
        <NavLink
          to={user ? "/profile" : "/auth/listener"}
          className="flex items-center gap-3 px-2 py-2 text-smash-gray hover:text-white transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-smash-dark flex items-center justify-center border border-white/10 overflow-hidden">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
            ) : (
              <User size={20} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">
              {userProfile?.full_name || (user ? 'My Account' : 'Join Smashify')}
            </span>
            <span className="text-xs truncate">
              {role === 'artist' ? 'Verified Artist' : (user ? 'Standard Profile' : 'Sign in or Register')}
            </span>
          </div>
        </NavLink>
      </div>
    </aside>
  );
};

const BottomNav = () => {
  const { role } = useAuth();
  const accentColor = role === 'artist' ? 'smash-purple' : 'smash-orange';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-morphism border-t border-white/10 z-50 flex items-center justify-around px-2">
      <NavLink to="/" className={({ isActive }) => `p-2 ${isActive ? `text-${accentColor}` : 'text-smash-gray'}`}>
        <Home size={24} />
      </NavLink>
      <NavLink to="/moto-feed" className={({ isActive }) => `p-2 ${isActive ? `text-${accentColor}` : 'text-smash-gray'}`}>
        <Flame size={24} />
      </NavLink>
      <NavLink to="/discover" className={({ isActive }) => `p-2 ${isActive ? `text-${accentColor}` : 'text-smash-gray'}`}>
        <Search size={24} />
      </NavLink>
      <NavLink to="/library" className={({ isActive }) => `p-2 ${isActive ? `text-${accentColor}` : 'text-smash-gray'}`}>
        <Library size={24} />
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `p-2 ${isActive ? `text-${accentColor}` : 'text-smash-gray'}`}>
        <User size={24} />
      </NavLink>
    </nav>
  );
};

const MainLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-smash-black text-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 bottom-0 w-64 border-r border-white/5 z-40">
        <Sidebar />
      </div>

      {/* Mobile Slider Sidebar (Drawer) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-smash-black z-[101] md:hidden shadow-2xl"
            >
              <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="md:ml-64 pb-48 md:pb-32 overflow-x-hidden min-h-screen relative">
        <TopBar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
      <BottomNav />
      <GlobalPlayer />
    </div>
  );
};

export default MainLayout;
