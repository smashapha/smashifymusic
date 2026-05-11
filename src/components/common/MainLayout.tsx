import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Search, Library, User, Music, TrendingUp, Mic2, Compass, Flame, Wifi, WifiOff, LogOut, ShieldCheck } from 'lucide-react';
import GlobalPlayer from '../player/GlobalPlayer';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const TopBar = () => {
  const { dataSaver, toggleDataSaver } = usePlayer();
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();

  const accentColor = role === 'artist' ? 'text-smash-purple' : 'text-smash-orange';

  return (
    <div className="h-16 flex items-center justify-between px-4 lg:px-8 bg-bg-page/90 backdrop-blur-xl sticky top-0 z-30 border-b border-border-subtle">
      <div className="flex-1 max-w-xl hidden md:block">
        <form className="relative group" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const q = formData.get('q');
          if (q) {
             navigate(`/discover?q=${encodeURIComponent(q.toString())}`);
          }
        }}>
           <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:${accentColor} transition-colors`} />
           <input 
            type="text" 
            name="q"
            placeholder="Search artists, songs, podcasts..." 
            className="w-full bg-border-subtle border border-border-default rounded-[10px] h-[44px] pl-12 pr-4 text-sm font-display focus:outline-none focus:border-smash-orange focus:ring-[3px] focus:ring-smash-orange/15 transition-all"
           />
        </form>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <ThemeToggle />
        <button 
           onClick={toggleDataSaver}
           className="p-2.5 bg-bg-elevated border border-border-subtle rounded-[8px] text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-smash-orange focus:ring-offset-2 focus:ring-offset-bg-page"
           title={dataSaver ? 'Turn Data Saver Off' : 'Turn Data Saver On'}
        >
          {dataSaver ? <WifiOff size={16} className="text-smash-orange" /> : <Wifi size={16} />}
        </button>
        {user && (
          <button 
            onClick={() => signOut()}
            className="p-2.5 bg-bg-elevated border border-border-subtle rounded-[8px] text-text-muted hover:text-smash-red transition-colors focus:outline-none focus:ring-2 focus:ring-smash-orange focus:ring-offset-2 focus:ring-offset-bg-page"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { user, userProfile, role } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Flame, label: 'Feed', path: '/moto-feed' },
    { icon: Compass, label: 'Discover', path: '/discover' },
    { icon: TrendingUp, label: 'Trending', path: '/trending' },
    { icon: Library, label: 'Library', path: '/library' },
  ];

  const accentColor = role === 'artist' ? 'text-smash-purple bg-smash-purple/10' : 'text-smash-orange bg-smash-orange/10';

  return (
    <aside className="flex flex-col h-full bg-bg-surface border-r border-border-subtle py-6">
      <div className="flex items-center justify-center lg:justify-start mb-8 lg:px-6">
        <Logo size="md" />
      </div>

      <nav className="space-y-2 px-2 lg:px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center justify-center lg:justify-start gap-4 p-3 lg:px-4 lg:py-3 rounded-[10px] text-sm font-display font-medium transition-all group relative ${
                isActive 
                  ? `${accentColor}` 
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`
            }
            title={item.label}
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} />
                <span className="hidden lg:block">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="nav-pill"
                    className="absolute left-0 w-1 h-6 bg-current rounded-full"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 space-y-2 px-2 lg:px-4">
        <div className="hidden lg:block px-4 pt-4 pb-2 text-xs font-display font-medium text-text-muted">Studio</div>
        <NavLink
            to={role === 'artist' || role === 'pending' ? "/artist-hub" : "/artists"}
            className={({ isActive }) => 
              `flex items-center justify-center lg:justify-start gap-4 p-3 lg:px-4 lg:py-3 rounded-[10px] text-sm font-display font-medium transition-all group ${
                isActive 
                  ? 'bg-bg-elevated text-text-primary' 
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`
            }
            title="Artist Portal"
          >
           <Mic2 size={20} className="opacity-70 group-hover:opacity-100" />
           <span className="hidden lg:block">Artist Portal</span>
        </NavLink>

        {userProfile?.is_admin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => 
              `flex items-center justify-center lg:justify-start gap-4 p-3 lg:px-4 lg:py-3 rounded-[10px] text-sm font-display font-medium transition-all group ${
                isActive 
                  ? 'bg-bg-elevated text-text-primary' 
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`
            }
            title="Admin Panel"
          >
            <ShieldCheck size={20} className="text-smash-red opacity-70 group-hover:opacity-100" />
            <span className="hidden lg:block text-smash-red">Admin Panel</span>
          </NavLink>
        )}
      </div>

      <div className="mt-auto pt-6 border-t border-border-subtle px-2 lg:px-4">
        <NavLink
          to={user ? "/profile" : "/auth/listener"}
          className="flex items-center justify-center lg:justify-start gap-3 p-2 rounded-[10px] text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
          title="Profile"
        >
          <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center border border-border-subtle overflow-hidden shrink-0">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
            ) : (
              <User size={20} />
            )}
          </div>
          <div className="hidden lg:flex flex-col min-w-0">
            <span className="text-sm font-display font-medium text-text-primary truncate">
              {userProfile?.full_name || (user ? 'My Account' : 'Sign in')}
            </span>
          </div>
        </NavLink>
      </div>
    </aside>
  );
};

const BottomNav = () => {
  const { role } = useAuth();
  const accentColor = role === 'artist' ? 'text-smash-purple' : 'text-smash-orange';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-bg-surface/90 backdrop-blur-md border-t border-border-subtle z-40 flex items-center justify-around px-2">
      <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 ${isActive ? accentColor : 'text-text-muted hover:text-text-primary'}`}>
        <Home size={24} />
      </NavLink>
      <NavLink to="/discover" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 ${isActive ? accentColor : 'text-text-muted hover:text-text-primary'}`}>
        <Search size={24} />
      </NavLink>
      <NavLink to="/library" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 ${isActive ? accentColor : 'text-text-muted hover:text-text-primary'}`}>
        <Library size={24} />
      </NavLink>
      <NavLink to="/moto-feed" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 ${isActive ? accentColor : 'text-text-muted hover:text-text-primary'}`}>
        <Flame size={24} />
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 ${isActive ? accentColor : 'text-text-muted hover:text-text-primary'}`}>
        <User size={24} />
      </NavLink>
    </nav>
  );
};

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg-page text-text-primary flex">
      {/* Sidebar navigation */}
      <div className="hidden md:block fixed left-0 top-0 bottom-0 w-[72px] lg:w-[240px] z-40 transition-all duration-300">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-[72px] lg:ml-[240px] transition-all duration-300">
        <TopBar />
        
        {/* Content container with padding for sticky player and mobile tab bar */}
        <main className="flex-1 w-full pb-[144px] md:pb-[80px]">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <GlobalPlayer />
      <BottomNav />
    </div>
  );
};

export default MainLayout;

