const fs = require('fs');
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf8');

// I'll add the preferences state:
// const [notificationPrefs, setNotificationPrefs] = useState(() => JSON.parse(localStorage.getItem('smash_notif_prefs') || '{"tips":true,"drops":true,"announcements":true,"follows":true}'));
//
// const togglePref = (key) => {
//   const newPrefs = { ...notificationPrefs, [key]: !notificationPrefs[key] };
//   setNotificationPrefs(newPrefs);
//   localStorage.setItem('smash_notif_prefs', JSON.stringify(newPrefs));
// };

// Add state to Profile:
code = code.replace(
  'const [phoneSuccess, setPhoneSuccess] = useState(false);',
  `const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState(() => JSON.parse(localStorage.getItem('smash_notif_prefs') || '{"tips":true,"drops":true,"announcements":true,"follows":true}'));

  const togglePref = (key: string) => {
    const newPrefs = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(newPrefs);
    localStorage.setItem('smash_notif_prefs', JSON.stringify(newPrefs));
    toast.success('Notification preferences updated');
  };`
);

// Add the UI
const prefsUI = `
          {/* Notification Preferences */}
          <section className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 md:p-7 space-y-4">
            <h2 className="text-lg font-studio font-bold text-white pb-2 border-b border-white/5 flex items-center gap-2">
              <Bell size={18} className="text-[#00A3FF]" /> Notification Preferences
            </h2>
            <div className="space-y-4 pt-2">
              {[
                { key: 'tips', label: 'Tips & Earnings', desc: 'Get notified when you receive a tip or payout.' },
                { key: 'drops', label: 'New Drops & Reviews', desc: 'Get notified about song approvals and new releases.' },
                { key: 'announcements', label: 'System Announcements', desc: 'Important platform updates and broadcast messages.' },
                { key: 'follows', label: 'New Followers', desc: 'Get notified when someone follows your profile.' }
              ].map(pref => (
                <div key={pref.key} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                  <div>
                    <p className="text-white text-sm font-bold">{pref.label}</p>
                    <p className="text-[#B0B0B0] text-[11px]">{pref.desc}</p>
                  </div>
                  <button 
                    onClick={() => togglePref(pref.key)}
                    className={\`w-12 h-6 rounded-full p-1 transition-colors relative \${notificationPrefs[pref.key] ? 'bg-[#00A3FF]' : 'bg-white/10'}\`}
                  >
                    <div className={\`w-4 h-4 bg-white rounded-full transition-transform \${notificationPrefs[pref.key] ? 'translate-x-6' : 'translate-x-0'}\`} />
                  </button>
                </div>
              ))}
            </div>
          </section>
`;

code = code.replace(
  '{/* Quick Actions Card — List Rows */}',
  prefsUI + '\n          {/* Quick Actions Card — List Rows */}'
);

// Also we need to import Bell if not already imported
if (!code.includes('Bell,')) {
  code = code.replace('User, CreditCard,', 'User, CreditCard, Bell,');
}

fs.writeFileSync('src/pages/Profile.tsx', code);
console.log('Profile patched with Notification Preferences');
