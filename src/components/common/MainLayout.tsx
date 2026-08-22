import React, { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Library, User, Music, TrendingUp, Mic2, Compass, Flame, Wifi, WifiOff, LogOut, ShieldCheck, ChevronRight, ChevronLeft, Bell, ListMusic } from 'lucide-react';
import GlobalPlayer from '../player/GlobalPlayer';
import { motion, AnimatePresence } from "motion/react";
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import Footer from './Footer';

const TopBar = ({ unreadCount }: { unreadCount: number }) => {
  const { dataSaver, toggleDataSaver } = usePlayer();
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="h-16 flex items-center px-4 lg:px-8 bg-bg-page sticky top-0 z-30 border-b border-border-subtle">
      
      {/* Mobile Logo */}
      <div className="md:hidden flex-1 flex items-center">
        <Logo size="sm" showText={true} onClick={() => navigate('/home')} className="cursor-pointer" />
      </div>

      <div className="flex-1 max-w-xl hidden md:block min-w-0 mx-4">
        <form className="relative group" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const q = formData.get('q');
          if (q) {
             navigate(`/discover?q=${encodeURIComponent(q.toString())}`);
          }
        }}>
           <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-[#00A3FF] transition-colors" />
           <input 
            type="text" 
            name="q"
            placeholder="Search artists, songs, podcasts..." 
            className="w-full bg-border-subtle border border-border-default rounded-[10px] h-[44px] pl-12 pr-4 text-sm font-display focus:outline-none focus:border-[#00A3FF] focus:ring-[3px] focus:ring-[#00A3FF]/15 transition-all"
           />
        </form>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 ml-auto shrink-0">
        {userProfile?.is_admin && (
           <Link 
             to="/admin" 
             className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-[8px] text-xs font-semibold hover:bg-red-500 hover:text-white transition-all shadow-sm"
           >
              <ShieldCheck size={14} /> Admin access
           </Link>
        )}
        
        {/* Mobile Notifications Bell */}
        {user && (
          <button aria-label="Notifications" 
            onClick={() => navigate('/notifications')}
            className="md:hidden p-2.5 relative bg-bg-elevated border border-border-subtle rounded-[8px] text-text-muted hover:text-text-primary transition-colors focus:outline-none"
            title="Notifications"
          >
            <Bell size={16} />
            <AnimatePresence>
               {unreadCount > 0 && (
                 <motion.div
                   initial={{ scale: 0 }}
                   animate={{ scale: 1 }}
                   exit={{ scale: 0 }}
                   className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-[#00A3FF] text-white text-[8px] font-semibold flex items-center justify-center px-1 border-2 border-bg-page"
                 >
                   {unreadCount > 99 ? '99+' : unreadCount}
                 </motion.div>
               )}
            </AnimatePresence>
          </button>
        )}

        <ThemeToggle />
        <button aria-label="Toggle Data Saver" 
           onClick={toggleDataSaver}
           className="p-2.5 bg-bg-elevated border border-border-subtle rounded-[8px] text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A3FF] focus:ring-offset-2 focus:ring-offset-bg-page"
           title={dataSaver ? 'Turn Data Saver Off' : 'Turn Data Saver On'}
        >
          {dataSaver ? <WifiOff size={16} className="text-[#00A3FF]" /> : <Wifi size={16} />}
        </button>
        {user && (
          <button aria-label="Sign out" 
            onClick={() => signOut()}
            className="p-2.5 bg-[#1A1A1A] border border-white/10 rounded-[8px] text-[#B0B0B0] hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A3FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export const Sidebar = ({ isCollapsed, setIsCollapsed, unreadCount }: { isCollapsed: boolean, setIsCollapsed: (val: boolean) => void, unreadCount: number }) => {
  const { user, userProfile, role } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Compass, label: 'Discover', path: '/discover' },
    { icon: Library, label: 'Library', path: '/library' },
    { icon: ListMusic, label: 'Playlists', path: '/library?tab=playlists' },
    { icon: Flame, label: 'Feed', path: '/moto-feed' },
    { icon: TrendingUp, label: 'Trending', path: '/trending' },
  ];

  const activeStyle = "bg-[#00A3FF]/10 text-[#00A3FF] border-l-[3px] border-[#00A3FF]";
  const inactiveStyle = "text-[#B0B0B0] hover:bg-white/5 hover:text-white border-l-[3px] border-transparent";

  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 72 : 240 }} 
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="flex flex-col h-full bg-[#0A0A0A] border-r border-white/10 py-6 relative overflow-hidden"
    >
      <div className="flex items-center justify-center h-8 mb-8 px-4">
        {isCollapsed ? (
          <Logo size="sm" showText={false} />
        ) : (
          <div className="flex w-full items-center justify-between">
            <Logo size="sm" />
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#B0B0B0]">{role === 'artist' ? 'ARTIST' : 'LISTENER'}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar pb-4">
        {!isCollapsed && <div className="px-5 mb-2 text-[9px] font-bold uppercase tracking-widest text-[#B0B0B0]">NAVIGATE</div>}
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isItemActive = item.path.includes('?') 
              ? (location.pathname + location.search) === item.path
              : location.pathname === item.path && !(item.path === '/library' && location.search.includes('tab=playlists'));
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center h-[44px] ${isCollapsed ? 'justify-center mx-2 rounded-[10px]' : 'px-5'} gap-3 font-medium text-[13px] transition-all group ${
                    isItemActive ? activeStyle : inactiveStyle
                  } ${isCollapsed && isItemActive ? 'border-none bg-[#00A3FF]/10 text-[#00A3FF]' : ''}`}
                  title={item.label}
                >
                  <item.icon size={20} className={`shrink-0 ${isItemActive ? 'text-[#00A3FF]' : 'opacity-70 group-hover:opacity-100'}`} strokeWidth={1.5} />
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
                </NavLink>
              </li>
            );
          })}
        </ul>

        {user && (
          <div className="mt-8">
            {!isCollapsed && <div className="px-5 mb-2 text-[9px] font-bold uppercase tracking-widest text-[#B0B0B0]">ACCOUNT</div>}
            <ul className="space-y-1">
              <li className="relative">
                <NavLink
                  to="/notifications"
                  className={({ isActive }) => 
                    `w-full flex items-center h-[44px] ${isCollapsed ? 'justify-center mx-2 rounded-[10px] w-auto' : 'px-5'} gap-3 font-medium text-[13px] transition-all group ${
                      isActive ? activeStyle : inactiveStyle
                    } ${isCollapsed && isActive ? 'border-none bg-[#00A3FF]/10 text-[#00A3FF]' : ''}`
                  }
                  title="Notifications"
                >
                  {({ isActive }) => (
                    <>
                       <Bell size={20} className={`shrink-0 ${isActive ? 'text-[#00A3FF]' : 'opacity-70 group-hover:opacity-100'}`} strokeWidth={1.5} />
                       {!isCollapsed && <span className="truncate">Notifications</span>}

                       <AnimatePresence>
                         {unreadCount > 0 && (
                           <motion.div
                             initial={{ scale: 0 }}
                             animate={{ scale: 1 }}
                             exit={{ scale: 0 }}
                             transition={{ type: 'spring', damping: 14, stiffness: 300 }}
                             className={`absolute ${isCollapsed ? 'top-1 right-1' : 'right-5'} min-w-[18px] h-[18px] rounded-full bg-[#00A3FF] text-white text-[9px] font-semibold flex items-center justify-center px-1`}
                           >
                             {unreadCount > 99 ? '99+' : unreadCount}
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </>
                  )}
                </NavLink>
              </li>

              <li>
                <NavLink
                  to={role === 'artist' || role === 'pending' ? "/artist-hub" : "/artist-studio"}
                  className={({ isActive }) => 
                    `flex items-center h-[44px] ${isCollapsed ? 'justify-center mx-2 rounded-[10px]' : 'px-5'} gap-3 font-medium text-[13px] transition-all group ${
                      isActive ? (role === 'artist' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-l-[3px] border-[#8B5CF6]' : activeStyle) : inactiveStyle
                    } ${isCollapsed && isActive ? 'border-none bg-[#00A3FF]/10 text-[#00A3FF]' : ''}`
                  }
                  title="Artist Portal"
                >
                  {({ isActive }) => (
                    <>
                      <Mic2 size={20} className={`shrink-0 ${isActive ? (role === 'artist' ? 'text-[#8B5CF6]' : 'text-[#00A3FF]') : 'opacity-70 group-hover:opacity-100'}`} strokeWidth={1.5} />
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
                      `flex items-center h-[44px] ${isCollapsed ? 'justify-center mx-2 rounded-[10px]' : 'px-5'} gap-3 font-medium text-[13px] transition-all group ${
                        isActive ? 'text-red-400 bg-red-500/10 border-l-[3px] border-red-500' : 'text-red-400 hover:bg-red-500/10 border-l-[3px] border-transparent'
                      } ${isCollapsed && isActive ? 'border-none text-red-400' : ''}`
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
                    `flex items-center h-[44px] ${isCollapsed ? 'justify-center mx-2 rounded-[10px]' : 'px-5'} gap-3 font-medium text-[13px] transition-all group ${
                      isActive ? activeStyle : inactiveStyle
                    } ${isCollapsed && isActive ? 'border-none bg-[#00A3FF]/10 text-[#00A3FF]' : ''}`
                  }
                  title="Profile"
                >
                  {({ isActive }) => (
                    <>
                      <div className="w-[20px] h-[20px] rounded-full overflow-hidden shrink-0">
                         {userProfile?.avatar_url ? (
                           <img src={userProfile.avatar_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                         ) : (
                           <User size={20} className={`shrink-0 ${isActive ? 'text-[#00A3FF]' : 'opacity-70 group-hover:opacity-100'}`} strokeWidth={1.5} />
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

      <div className="px-4 mt-6 flex justify-center shrink-0">
        <button aria-label="Toggle Sidebar" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-[36px] h-[36px] rounded-full bg-bg-elevated flex items-center justify-center text-text-muted hover:text-text-primary transition-colors hover:scale-105 active:scale-95"
        >
          {isCollapsed ? <ChevronRight size={20} strokeWidth={1.5} /> : <ChevronLeft size={20} strokeWidth={1.5} />}
        </button>
      </div>
    </motion.aside>
  );
};

export const BottomNav = () => {
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
    { icon: Home, label: 'HOME', path: '/home' },
    { icon: Compass, label: 'DISCOVER', path: '/discover' },
    { icon: Library, label: 'LIBRARY', path: '/library' },
    { icon: Flame, label: 'FEED', path: '/moto-feed' },
    { icon: User, label: 'PROFILE', path: user ? '/profile' : '/auth/listener' }
  ];

  const activeColorClass = role === 'artist' ? 'text-[#8B5CF6]' : 'text-[#00A3FF]';
  const activeBgClass = role === 'artist' ? 'bg-[#8B5CF6]' : 'bg-[#00A3FF]';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-[#0A0A0A] border-t border-white/10 z-40 flex items-center justify-around px-2 shadow-2xl">
      {tabs.map(tab => (
        <NavLink 
          key={tab.path} 
          to={tab.path} aria-label={tab.label} 
          className={({ isActive }) => `relative flex flex-col items-center justify-center gap-1 w-16 h-full ${isActive ? activeColorClass : 'text-[#B0B0B0]/60 hover:text-white transition-colors'}`}
        >
          {({ isActive }) => (
            <>
              <div className={`absolute top-1 w-[28px] h-[3px] rounded-full transition-opacity ${isActive ? activeBgClass : 'opacity-0'}`} />
              <tab.icon size={22} strokeWidth={1.5} className="mt-2" />
              <span className={`text-[9px] font-display font-medium transition-opacity ${isActive ? 'opacity-100' : 'opacity-50'}`}>
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
  const location = useLocation();
  const { userProfile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [broadcast, setBroadcast] = useState<any>(null);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!userProfile?.id) return;
      try {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', userProfile.id)
          .eq('read', false);
        setUnreadCount(count || 0);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUnreadCount();

    if (!userProfile?.id) return;
    const channel = supabase
      .channel('public:notifications:main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${userProfile.id}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id]);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const sidebarW = isSidebarCollapsed ? '72px' : '240px';
      document.documentElement.style.setProperty('--sidebar-width', sidebarW);
      document.documentElement.style.setProperty('--content-margin', w >= 768 ? sidebarW : '0px');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isSidebarCollapsed]);

  return (
    <div className="min-h-screen bg-bg-page text-text-primary flex">
      {/* Sidebar navigation */}
      <div className="hidden md:block fixed left-0 top-0 bottom-0 z-40 transition-all duration-300">
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} unreadCount={unreadCount} />
      </div>

      {/* Main content area */}
      <div 
        style={{ marginLeft: 'var(--content-margin)' }}
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
      >
        <TopBar unreadCount={unreadCount} />
        
        {/* Content container with padding for sticky player and mobile tab bar */}
        <main 
          className="flex-1 w-full overflow-x-hidden md:pb-[88px]" 
          style={{ paddingBottom: 'calc(152px + env(safe-area-inset-bottom))' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "linear" }}
              className="w-full h-full will-change-[opacity]"
            >
              <Outlet />
              <div className="mt-20">
                <Footer />
              </div>
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

