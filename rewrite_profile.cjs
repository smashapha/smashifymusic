const fs = require('fs');
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf8');

// 1. Loading state and avatar preview state
code = code.replace(
  `const { user, userProfile, signOut, refreshProfile, role } = useAuth();`,
  `const { user, userProfile, signOut, refreshProfile, role, loading: authLoading } = useAuth();`
);

code = code.replace(
  `const [uploading, setUploading] = useState(false);`,
  `const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState(false);`
);

// Phone handler
code = code.replace(
  `const handleUpdatePhone = async () => {
    if (!phone.trim()) return toast.error('Enter a valid phone number')
    setSavingPhone(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ phone_number: phone })
        .eq('id', userProfile?.id)
      if (error) throw error
      toast.success('Phone number updated!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingPhone(false)
    }
  }`,
  `const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    setPhoneError('');
    setPhoneSuccess(false);
  };

  const handleUpdatePhone = async () => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      return setPhoneError('Enter a valid phone number (e.g. +265...)');
    }
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ phone_number: cleanPhone })
        .eq('id', userProfile?.id)
      if (error) throw error;
      setPhoneSuccess(true);
      toast.success('Phone number updated!');
      setTimeout(() => setPhoneSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPhone(false);
    }
  }`
);

// Loading render
code = code.replace(
  `if (!userProfile) {`,
  `if (authLoading || (!userProfile && user)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center">
        <div className="w-8 h-8 border-4 border-smash-orange border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-text-muted font-display uppercase tracking-widest text-xs">Loading Profile...</p>
      </div>
    );
  }

  if (!userProfile) {`
);

// Header gradient and Verified Badge
code = code.replace(
  `style={{ background: 'linear-gradient(135deg, rgba(255,95,0,0.2), rgba(124,58,237,0.1))' }}`,
  `className="w-full h-full bg-gradient-to-br from-smash-orange/20 via-smash-purple/20 to-bg-page animate-pulse" style={{ animationDuration: '4s' }}`
);

// Remove extra closing tag or whatever if needed. Wait, it was:
// <div className="w-full... overflow-hidden" style="..."> />
code = code.replace(
  `<div 
           className="w-full h-[120px] md:h-[160px] rounded-b-[14px] md:rounded-[14px] overflow-hidden" 
           style={{ background: 'linear-gradient(135deg, rgba(255,95,0,0.2), rgba(124,58,237,0.1))' }} 
         />`,
  `<div className="w-full h-[120px] md:h-[160px] rounded-b-[14px] md:rounded-[14px] overflow-hidden relative bg-gradient-to-br from-smash-orange/20 via-smash-purple/10 to-bg-page">
     <div className="absolute inset-0 bg-gradient-to-t from-bg-page/80 to-transparent" />
  </div>`
);

// Avatar preview & Verified
code = code.replace(
  `<Avatar src={userProfile.avatar_url} name={userProfile.full_name} className="w-full h-full rounded-full" />`,
  `<Avatar src={avatarPreview || userProfile.avatar_url} name={userProfile.full_name} className="w-full h-full rounded-full" />`
);

code = code.replace(
  `<h1 className="text-[20px] md:text-[28px] font-studio font-bold text-text-primary uppercase tracking-tight">{userProfile.full_name || 'Listener'}</h1>
                  {role === 'artist' && (
                    <span className="px-2.5 py-0.5 bg-smash-purple text-white text-[9px] md:text-[11px] font-display font-medium rounded-full uppercase tracking-wide">
                      Artist Account
                    </span>
                  )}`,
  `<h1 className="text-[20px] md:text-[28px] font-studio font-bold text-text-primary uppercase tracking-tight flex items-center gap-2">
                     {userProfile.full_name || 'Listener'}
                     {userProfile.verified && <BadgeCheck className="text-smash-purple fill-white/10" size={24} />}
                  </h1>
                  {role === 'artist' && (
                    <span className="px-2.5 py-0.5 bg-smash-purple text-white text-[9px] md:text-[11px] font-display font-medium rounded-full uppercase tracking-wide">
                      Artist Account
                    </span>
                  )}`
);

// File input onChange
code = code.replace(
  `<input 
                                 ref={fileInputRef}
                                 name="avatar_file"
                                 type="file" 
                                 accept="image/*"
                                 className="hidden" 
                               />`,
  `<input 
                                 ref={fileInputRef}
                                 name="avatar_file"
                                 type="file" 
                                 accept="image/*"
                                 className="hidden" 
                                 onChange={(e) => {
                                   const file = e.target.files?.[0];
                                   if (file) setAvatarPreview(URL.createObjectURL(file));
                                 }}
                               />`
);

code = code.replace(
  `<Avatar src={userProfile.avatar_url} name={userProfile.full_name} className="w-full h-full" />`,
  `<Avatar src={avatarPreview || userProfile.avatar_url} name={userProfile.full_name} className="w-full h-full" />`
);

// Remove redundant subscription block
code = code.replace(
  `<div className="space-y-2">
                        <label className="block text-[10px] md:text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-1 md:mb-2">Subscription Plan</label>
                        <div className="w-full h-[40px] md:h-[44px] bg-bg-elevated border border-border-default rounded-[10px] px-4 text-xs md:text-[14px] font-display font-semibold text-text-primary flex items-center gap-2">
                           <Sparkles size={14} className="text-smash-orange" />
                           {userProfile.subscription_tier || 'Free'}
                        </div>
                     </div>`,
  ``
);

// Style Sidebar (Tokens)
code = code.replace(
  `<div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">`,
  `<div className="bg-bg-surface border border-border-default rounded-[14px] p-5 space-y-3">`
);
code = code.replace(
  `<p className="text-white font-black uppercase text-sm tracking-widest">`,
  `<p className="text-text-primary font-black uppercase text-sm tracking-widest">`
);
code = code.replace(
  `text-white/40 text-xs font-bold mt-0.5`,
  `text-text-secondary text-xs font-bold mt-0.5`
);
code = code.replace(
  `className={tier === 'free' ? 'text-white/30' : 'text-smash-orange'}`,
  `className={tier === 'free' ? 'text-text-muted' : 'text-smash-orange'}`
);

// Feature list part 1
code = code.replace(
  `border-t border-white/5`,
  `border-t border-border-subtle`
);
// map features
code = code.replace(
  `className={\`w-4 h-4 rounded-full flex items-center justify-center \${f.enabled ? 'bg-smash-orange/20' : 'bg-white/5'}\`}`,
  `className={\`w-4 h-4 rounded-full flex items-center justify-center \${f.enabled ? 'bg-smash-orange/20' : 'bg-bg-elevated'}\`}`
);
code = code.replace(
  `className={f.enabled ? 'text-smash-orange' : 'text-white/20'}`,
  `className={f.enabled ? 'text-smash-orange' : 'text-text-muted'}`
);
code = code.replace(
  `className={\`text-xs font-bold \${f.enabled ? 'text-white' : 'text-white/30'}\`}`,
  `className={\`text-xs font-bold \${f.enabled ? 'text-text-primary' : 'text-text-muted'}\`}`
);

// Phone number section
code = code.replace(
  `<div className="bg-white/5 border border-white/10 rounded-2xl p-5">`,
  `<div className="bg-bg-surface border border-border-default rounded-[14px] p-5">`
);
code = code.replace(
  `<p className="text-white/40 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">`,
  `<p className="text-text-muted text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">`
);

code = code.replace(
  `<input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+265 XXX XXX XXX"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-smash-orange/60 transition-colors"
                />`,
  `<div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+265 XXX XXX XXX"
                    className={\`w-full bg-bg-elevated border \${phoneError ? 'border-red-500/50 focus:border-red-500' : 'border-border-default focus:border-smash-orange/60'} rounded-[10px] px-4 py-3 text-text-primary text-sm font-bold outline-none transition-colors\`}
                  />
                  {phoneError && <p className="text-red-400 text-[10px] mt-1.5 font-sans">{phoneError}</p>}
                </div>`
);

// We need to fix the layout around the input/button since it was a flex row.
code = code.replace(
  `<div className="flex gap-3">
                <div>
                  <input`,
  `<div className="flex items-start gap-3">
                <div className="flex-1">
                  <input`
);

// Phone save button
code = code.replace(
  `className="px-4 py-3 bg-smash-orange text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {savingPhone ? '...' : 'Save'}`,
  `className={\`px-4 h-[44px] \${phoneSuccess ? 'bg-smash-green' : 'bg-smash-orange'} text-white rounded-[10px] text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center min-w-[70px]\`}
                >
                  {savingPhone ? '...' : phoneSuccess ? <Check size={16} /> : 'Save'}`
);

// Account info section
code = code.replace(
  `<div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">`,
  `<div className="bg-bg-surface border border-border-default rounded-[14px] p-5 space-y-3">`
);
code = code.replace(
  `<p className="text-white/40 text-xs font-black uppercase tracking-widest flex items-center gap-2">`,
  `<p className="text-text-muted text-xs font-black uppercase tracking-widest flex items-center gap-2">`
);
code = code.replace(
  `py-2 border-b border-white/5`,
  `py-2 border-b border-border-subtle`
);
code = code.replace(
  `text-white/30 shrink-0`,
  `text-text-muted shrink-0`
);
code = code.replace(
  `text-white/30" />`,
  `text-text-muted" />`
);
code = code.replace(
  `text-white text-sm font-bold truncate`,
  `text-text-primary text-sm font-bold truncate`
);
code = code.replace(
  `text-white text-sm font-bold">Manage`,
  `text-text-primary text-sm font-bold group-hover:text-smash-orange transition-colors">Manage`
);
code = code.replace(
  `className="w-full flex items-center justify-between py-2"`,
  `className="w-full flex items-center justify-between py-2 group hover:opacity-80 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-smash-orange rounded-md"`
);
// Focus states for some buttons
code = code.replace(
  `hover:scale-105 transition-transform disabled:opacity-50 flex`,
  `hover:scale-105 transition-transform disabled:opacity-50 flex outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface`
);


fs.writeFileSync('src/pages/Profile.tsx', code);
