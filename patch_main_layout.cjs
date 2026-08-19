const fs = require('fs');
let code = fs.readFileSync('src/components/common/MainLayout.tsx', 'utf8');

// I need to add state for the broadcast banner.
// const [broadcast, setBroadcast] = useState(null);

code = code.replace(
  'const [unreadCount, setUnreadCount] = useState(0);',
  `const [unreadCount, setUnreadCount] = useState(0);
  const [broadcast, setBroadcast] = useState<any>(null);`
);

// I need to update the realtime listener.
const oldListener = `      const channel = supabase.channel(\`notifications-nav-\${userProfile.id}\`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: \`profile_id=eq.\${userProfile.id}\` }, () => {
        fetchUnreadCount();
      })
      .subscribe();`;

const newListener = `      const channel = supabase.channel(\`notifications-nav-\${userProfile.id}\`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: \`profile_id=eq.\${userProfile.id}\` }, (payload: any) => {
        fetchUnreadCount();
        if (payload.eventType === 'INSERT' && payload.new) {
          const newNotif = payload.new;
          // Check preferences
          try {
            const prefs = JSON.parse(localStorage.getItem('smash_notif_prefs') || '{"tips":true,"drops":true,"announcements":true,"follows":true}');
            
            // Map types to prefs
            let allowed = true;
            if (newNotif.type === 'tip_received' || newNotif.type === 'track_sold' || newNotif.type === 'subscription_started') {
              allowed = prefs.tips !== false;
            } else if (newNotif.type === 'new_drop' || newNotif.type === 'track_approved') {
              allowed = prefs.drops !== false;
            } else if (newNotif.type === 'announcement' || newNotif.type === 'system') {
              allowed = prefs.announcements !== false;
            } else if (newNotif.type === 'follow') {
              allowed = prefs.follows !== false;
            }

            if (!allowed) {
              // Mark it as read immediately if disabled in prefs to not pollute the bell, 
              // or just don't show toast. For now, just don't show the toast/banner.
              return;
            }

            if (newNotif.type === 'announcement') {
              setBroadcast(newNotif);
              // auto-dismiss after 8 seconds
              setTimeout(() => setBroadcast(null), 8000);
            } else {
              // Regular toast for other types
              // Use custom toast styling based on our new standard
              toast(newNotif.message, {
                icon: '🔔',
                style: {
                  background: '#1A1A1A',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                },
              });
            }
          } catch(e) {}
        }
      })
      .subscribe();`;

code = code.replace(oldListener, newListener);

// And we need to render the Broadcast banner.
// Where should it go? Probably absolute/fixed at top center of the screen, or at the top of the content area.
const bannerUI = `
          {/* Broadcast Banner */}
          <AnimatePresence>
            {broadcast && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4"
              >
                <div className="bg-gradient-to-r from-smash-orange to-smash-orange/80 p-[1px] rounded-[24px] shadow-2xl shadow-smash-orange/20 overflow-hidden relative">
                  <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                  <div className="bg-smash-dark/95 backdrop-blur-xl rounded-[23px] p-5 flex gap-4 relative overflow-hidden">
                    <div className="absolute -inset-10 bg-smash-orange/10 blur-3xl pointer-events-none" />
                    <div className="w-12 h-12 bg-smash-orange rounded-xl flex items-center justify-center shrink-0 relative z-10 text-white shadow-lg shadow-smash-orange/20">
                      <Bell size={24} className="animate-bounce" />
                    </div>
                    <div className="flex-1 relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-smash-orange/20 text-smash-orange rounded text-[10px] font-black uppercase tracking-widest border border-smash-orange/20">System Broadcast</span>
                      </div>
                      <p className="text-white font-bold leading-tight">{broadcast.message}</p>
                    </div>
                    <button 
                      onClick={() => setBroadcast(null)}
                      className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-20 p-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
`;

code = code.replace(
  '<div className="flex-1 min-w-0 md:ml-[var(--sidebar-width)] transition-all duration-300">',
  '<div className="flex-1 min-w-0 md:ml-[var(--sidebar-width)] transition-all duration-300">\n' + bannerUI
);

fs.writeFileSync('src/components/common/MainLayout.tsx', code);
console.log('MainLayout patched for Broadcasts');
