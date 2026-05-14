import React, { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { Home, Search, Library, User, Music, TrendingUp, Mic2, Compass, Flame, Wifi, WifiOff, LogOut, ShieldCheck, ChevronRight, ChevronLeft, Bell } from 'lucide-react';
import GlobalPlayer from '../player/GlobalPlayer';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const TopBar = () => {
  const { dataSaver, toggleDataSaver } = usePlayer();
  const { user, userProfile, signOut, role } = useAuth();
  const navigate = useNavigate();

  const accentColor = role === 'artist' ? 'text-smash-purple' : 'text-smash-orange';

  return (
    <div className="h-16 flex items-center px-4 lg:px-8 bg-bg-page/90 backdrop-blur-xl sticky top-0 z-30 border-b border-border-subtle">
      
      {/* Mobile Logo */}
      <div className="md:hidden flex-1 flex items-center">
        <Logo size="sm" showText={true} onClick={() => navigate('/')} className="cursor-pointer scale-75 origin-left" />
      </div>

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
        {userProfile?.is_admin && (
           <Link 
             to="/admin" 
             className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-smash-red/10 text-smash-red border border-smash-red/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-smash-red hover:text-white transition-all shadow-lg shadow-smash-red/10"
           >
              <ShieldCheck size={14} /> Admin access
           </Link>
        )}
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

const Sidebar = ({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean, setIsCollapsed: (val: boolean) => void }) => {
  const { user, userProfile, role } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Compass, label: 'Discover', path: '/discover' },
    { icon: Library, label: 'Library', path: '/library' },
    { icon: Flame, label: 'Feed', path: '/moto-feed' },
    { icon: TrendingUp, label: 'Trending', path: '/trending' },
  ];

  // Placeholder for real notification count
  const unreadCount = 0; 

  const activeStyle = "bg-smash-orange/10 text-smash-orange border-l-[4px] border-smash-orange";
  const inactiveStyle = "text-text-secondary hover:bg-bg-elevated hover:text-text-primary border-l-[4px] border-transparent";

  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 72 : 240 }} 
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="flex flex-col h-full bg-bg-surface border-r border-border-subtle py-6 relative overflow-visible"
    >
      <div className="flex items-center justify-center h-8 mb-8 px-4">
        {isCollapsed ? (
          <Logo size="sm" showText={false} />
        ) : (
          <div className="flex w-full items-center justify-between">
            <Logo size="sm" />
            <span className="text-[9px] uppercase font-display tracking-widest text-text-muted">{role === 'artist' ? 'ARTIST' : 'LISTENER'}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {!isCollapsed && <div className="px-5 mb-2 text-[9px] font-display font-medium uppercase tracking-widest text-text-muted">NAVIGATE</div>}
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center h-[44px] ${isCollapsed ? 'justify-center mx-2 rounded-[10px]' : 'px-5'} gap-3 font-display font-medium text-[13px] transition-all group ${
                    isActive ? activeStyle : inactiveStyle
                  } ${isCollapsed && isActive ? 'border-none bg-smash-orange/10 text-smash-orange' : ''}`
                }
                title={item.label}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={20} className={`shrink-0 ${isActive ? 'text-smash-orange' : 'opacity-70 group-hover:opacity-100'}`} strokeWidth={1.5} />
                    {!isCollapsed && (
                      <motion.span 
                        initial={false}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.1 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {user && (
          <div className="mt-8">
            {!isCollapsed && <div className="px-5 mb-2 text-[9px] font-display font-medium uppercase tracking-widest text-text-muted">ACCOUNT</div>}
            <ul className="space-y-1">
              <li className="relative">
                <button
                  className={`w-full flex items-center h-[44px] ${isCollapsed ? 'justify-center mx-2 rounded-[10px] w-auto' : 'px-5'} gap-3 font-display font-medium text-[13px] text-text-secondary hover:bg-bg-elevated hover:text-text-primary border-l-[4px] border-transparent transition-all group`}
                  title="Notifications"
                >
                   <Bell size={20} className="shrink-0 opacity-70 group-hover:opacity-100" strokeWidth={1.5} />
                   {!isCollapsed && <span className="truncate">Notifications</span>}

                   <AnimatePresence>
                     {unreadCount > 0 && (
                       <motion.div
                         initial={{ scale: 0 }}
                         animate={{ scale: 1 }}
                         exit={{ scale: 0 }}
                         transition={{ type: 'spring', damping: 14, stiffness: 300 }}
                         className={`absolute ${isCollapsed ? 'top-1 right-1' : 'right-5'} min-w-[18px] h-[18px] rounded-full bg-smash-orange text-white text-[9px] font-semibold flex items-center justify-center px-1`}
                       >
                         {unreadCount > 99 ? '99+' : unreadCount}
                       </motion.div>
                     )}
                   </AnimatePresence>
                </button>
              </li>

              <li>
                <NavLink
                  to={role === 'artist' || role === 'pending' ? "/artist-hub" : "/artists"}
                  className={({ isActive }) => 
                    `flex items-center h-[44px] ${isCollapsed ? 'justify-center mx-2 rounded-[10px]' : 'px-5'} gap-3 font-display font-medium text-[13px] transition-all group ${
                      isActive ? activeStyle : inactiveStyle
                    } ${isCollapsed && isActive ? 'border-none bg-smash-orange/10 text-smash-orange' : ''}`
                  }
                  title="Artist Portal"
                >
                  {({ isActive }) => (
                    <>
                      <Mic2 size={20} className={`shrink-0 ${isActive ? 'text-smash-orange' : 'opacity-70 group-hover:opacity-100'}`} strokeWidth={1.5} />
                      {!isCollapsed && <span className="truncate">Artist Portal</span>}
                    </>
                  )}
                </NavLink>
              </li>

              {userProfile?.is_admin && (
                <li>
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => 
                      `flex items-center h-[44px] ${isCollapsed ? 'justify-center mx-2 rounded-[10px]' : 'px-5'} gap-3 font-display font-medium text-[13px] transition-all group ${
                        isActive ? 'text-smash-red bg-smash-red/10 border-l-[4px] border-smash-red' : 'text-smash-red hover:bg-smash-red/10 border-l-[4px] border-transparent'
                      } ${isCollapsed && isActive ? 'border-none text-smash-red' : ''}`
                    }
                    title="Admin Panel"
                  >
                    {({ isActive }) => (
                      <>
                        <ShieldCheck size={20} className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} strokeWidth={1.5} />
                        {!isCollapsed && <span className="truncate">Admin Panel</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              )}
              
              <li>
                <NavLink
                  to={user ? "/profile" : "/auth/listener"}
                  className={({ isActive }) => 
                    `flex items-center h-[44px] ${isCollapsed ? 'justify-center mx-2 rounded-[10px]' : 'px-5'} gap-3 font-display font-medium text-[13px] transition-all group ${
                      isActive ? activeStyle : inactiveStyle
                    } ${isCollapsed && isActive ? 'border-none bg-smash-orange/10 text-smash-orange' : ''}`
                  }
                  title="Profile"
                >
                  {({ isActive }) => (
                    <>
                      <div className="w-[20px] h-[20px] rounded-full overflow-hidden shrink-0">
                         {userProfile?.avatar_url ? (
                           <img src={userProfile.avatar_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                         ) : (
                           <User size={20} className={`shrink-0 ${isActive ? 'text-smash-orange' : 'opacity-70 group-hover:opacity-100'}`} strokeWidth={1.5} />
                         )}
                      </div>
                      {!isCollapsed && <span className="truncate">Profile</span>}
                    </>
                  )}
                </NavLink>
              </li>
            </ul>
          </div>
        )}
      </nav>

      <div className="absolute bottom-6 w-full flex justify-center">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-[36px] h-[36px] rounded-full bg-bg-elevated flex items-center justify-center text-text-muted hover:text-text-primary transition-colors hover:scale-105 active:scale-95"
        >
          {isCollapsed ? <ChevronRight size={20} strokeWidth={1.5} /> : <ChevronLeft size={20} strokeWidth={1.5} />}
        </button>
      </div>
    </motion.aside>
  );
};

const BottomNav = () => {
  const { role, user } = useAuth();
  
  // Listener tabs: Home · Discover · Library · Feed · Profile
  // Artist tabs (using best matching existing routes): Hub · Discover · Feed · Library · Profile
  const tabs = role === 'artist' || role === 'pending' ? [
    { icon: Mic2, label: 'HUB', path: '/artist-hub' },
    { icon: Compass, label: 'DISCOVER', path: '/discover' },
    { icon: Flame, label: 'FEED', path: '/moto-feed' },
    { icon: Library, label: 'LIBRARY', path: '/library' },
    { icon: User, label: 'PROFILE', path: '/profile' }
  ] : [
    { icon: Home, label: 'HOME', path: '/' },
    { icon: Compass, label: 'DISCOVER', path: '/discover' },
    { icon: Library, label: 'LIBRARY', path: '/library' },
    { icon: Flame, label: 'FEED', path: '/moto-feed' },
    { icon: User, label: 'PROFILE', path: user ? '/profile' : '/auth/listener' }
  ];

  const activeColorClass = role === 'artist' ? 'text-smash-purple' : 'text-smash-orange';
  const activeBgClass = role === 'artist' ? 'bg-smash-purple/20' : 'bg-smash-orange/20';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-[#0a0a0d]/92 backdrop-blur-xl border-t border-white/5 z-40 flex items-center justify-around px-2">
      {tabs.map(tab => (
        <NavLink 
          key={tab.path} 
          to={tab.path} 
          className={({ isActive }) => `relative flex flex-col items-center justify-center gap-1 w-16 h-full ${isActive ? activeColorClass : 'text-text-muted/50 transition-colors'}`}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div 
                  layoutId="bottomNavPill"
                  className={`absolute top-1 w-[28px] h-[4px] rounded-full ${activeBgClass}`}
                />
              )}
              <tab.icon size={22} strokeWidth={1.5} className={isActive ? 'mt-3' : 'mt-0'} />
              <span className={`text-[9px] font-display font-medium uppercase tracking-wide ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

const MainLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-bg-page text-text-primary flex">
      {/* Sidebar navigation */}
      <div className="hidden md:block fixed left-0 top-0 bottom-0 z-40 transition-all duration-300">
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      </div>

      {/* Main content area */}
      <motion.div 
        animate={{ 
          marginLeft: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : (isSidebarCollapsed ? 72 : 240) 
        }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="flex-1 flex flex-col min-w-0 md:ml-0 transition-all"
      >
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
      </motion.div>

      <GlobalPlayer />
      <BottomNav />
    </div>
  );
};

export default MainLayout;

