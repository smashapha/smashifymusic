import re

def safe_replace(filepath, mapping):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    for target, rep in mapping:
        if target in content:
            content = content.replace(target, rep)
        else:
            print(f'MISSED in {filepath}: {target[:70]}')
    if content != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filepath}')
    else:
        print(f'No change in {filepath}')

# MainLayout.tsx
safe_replace('src/components/common/MainLayout.tsx', [
    ('<span className={`text-[9px] font-display font-medium uppercase tracking-wide transition-opacity ${isActive ? \'opacity-100\' : \'opacity-50\'}`>', '<span className={`text-[9px] font-display font-medium transition-opacity ${isActive ? \'opacity-100\' : \'opacity-50\'}`>')
])

# ArtistProfile.tsx
safe_replace('src/pages/ArtistProfile.tsx', [
    ('<h1 className="text-2xl font-bold font-display uppercase tracking-tight text-text-primary mb-4">Artist Vault Empty</h1>', '<h1 className="text-2xl font-bold font-display tracking-tight text-text-primary mb-4">Artist Vault Empty</h1>'),
    ('className="h-[44px] px-6 bg-[#0084D6] text-white rounded-[10px] font-display font-semibold uppercase tracking-widest text-[11px] hover:bg-[#0084D6]/90 transition-colors"', 'className="h-[44px] px-6 bg-[#0084D6] text-white rounded-[10px] font-display font-semibold text-[11px] hover:bg-[#0084D6]/90 transition-colors"'),
    ('<h1 className="text-3xl md:text-5xl font-semibold uppercase tracking-tight text-white truncate leading-none">', '<h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-white truncate leading-none">'),
    ('className="h-9 px-4 rounded-full border border-[#00A3FF]/30 text-[#00A3FF] text-xs font-semibold uppercase tracking-widest hover:bg-[#0084D6]/10 transition-all"', 'className="h-9 px-4 rounded-full border border-[#00A3FF]/30 text-[#00A3FF] text-xs font-semibold hover:bg-[#0084D6]/10 transition-all"'),
    ('className={`relative py-4 px-4 text-xs font-semibold uppercase tracking-widest transition-colors ${', 'className={`relative py-4 px-4 text-xs font-semibold transition-colors ${'),
    ('<h3 className="text-sm font-semibold uppercase tracking-widest text-white">', '<h3 className="text-sm font-semibold text-white">'),
    ('className="px-6 py-2 bg-[#0084D6] text-white rounded-full font-semibold text-xs uppercase tracking-widest"', 'className="px-6 py-2 bg-[#0084D6] text-white rounded-full font-semibold text-xs"'),
    ('<p className="text-[11px] font-semibold uppercase tracking-widest text-[#00A3FF] mb-1">Coming Soon</p>', '<p className="text-[11px] font-semibold text-[#00A3FF] mb-1">Coming soon</p>'),
    ('className="text-xs text-white/50 font-bold uppercase hover:underline"', 'className="text-xs text-white/50 font-bold hover:underline"'),
    ('<h3 className="text-sm font-semibold uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">', '<h3 className="text-sm font-semibold text-white/50 mb-4 flex items-center gap-2">'),
    ('className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-all"', 'className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-semibold text-white/50 hover:text-white transition-all"'),
])

# MotoFeed.tsx
safe_replace('src/pages/MotoFeed.tsx', [
    ('<p className="text-white font-studio font-bold uppercase text-[16px]">30 sec preview ending</p>', '<p className="text-white font-studio font-bold text-[16px]">30 sec preview ending</p>'),
    ('<p className="text-[#B0B0B0] text-xs font-bold uppercase tracking-widest pb-2">Buy to hear the rest</p>', '<p className="text-[#B0B0B0] text-xs font-bold pb-2">Buy to hear the rest</p>'),
    ('className="flex-1 py-3 bg-[#0084D6] text-white rounded-xl font-semibold text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"', 'className="flex-1 py-3 bg-[#0084D6] text-white rounded-xl font-semibold text-[10px] hover:scale-105 transition-transform"'),
    ('className="flex-1 py-3 bg-white/10 text-white rounded-xl font-semibold text-[10px] uppercase tracking-widest hover:bg-white/20 transition-colors"', 'className="flex-1 py-3 bg-white/10 text-white rounded-xl font-semibold text-[10px] hover:bg-white/20 transition-colors"'),
    ('<h3 className="text-[24px] font-studio font-bold uppercase mb-2 text-white">Full Track Available</h3>', '<h3 className="text-[24px] font-studio font-bold mb-2 text-white">Full Track Available</h3>'),
    ('className="w-full max-w-[240px] px-8 py-4 bg-[#0084D6] text-white rounded-[16px] font-semibold text-sm uppercase tracking-widest shadow-xl shadow-[#00A3FF]/20 mb-4 hover:scale-105 transition-transform"', 'className="w-full max-w-[240px] px-8 py-4 bg-[#0084D6] text-white rounded-[16px] font-semibold text-sm shadow-xl shadow-[#00A3FF]/20 mb-4 hover:scale-105 transition-transform"'),
    ('className="w-full max-w-[240px] px-8 py-4 bg-transparent border border-white/20 text-white rounded-[16px] font-semibold text-sm uppercase tracking-widest hover:bg-white/5 transition-colors"', 'className="w-full max-w-[240px] px-8 py-4 bg-transparent border border-white/20 text-white rounded-[16px] font-semibold text-sm hover:bg-white/5 transition-colors"'),
    ('<h3 className="text-xl font-semibold uppercase mb-1">Send a tip</h3>', '<h3 className="text-xl font-semibold mb-1">Send a tip</h3>'),
    ('className="w-full py-4 bg-[#0084D6] text-black font-semibold uppercase text-sm tracking-widest rounded-xl hover:scale-105 transition-transform"', 'className="w-full py-4 bg-[#0084D6] text-black font-semibold text-sm rounded-xl hover:scale-105 transition-transform"'),
    ('<p className="text-[10px] text-gray-400 mt-4 uppercase font-bold text-center">', '<p className="text-[10px] text-gray-400 mt-4 font-bold text-center">'),
    ('<h3 className="text-xl font-semibold uppercase mb-2">', '<h3 className="text-xl font-semibold mb-2">'),
    ('className="w-full py-4 bg-gray-200 text-black font-semibold uppercase text-sm tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-colors"', 'className="w-full py-4 bg-gray-200 text-black font-semibold text-sm rounded-xl hover:bg-red-500 hover:text-white transition-colors"'),
    ('className="w-full py-4 bg-[#0084D6] text-white font-semibold uppercase text-sm tracking-widest rounded-xl hover:scale-105 transition-transform shadow-xl shadow-[#00A3FF]/20"', 'className="w-full py-4 bg-[#0084D6] text-white font-semibold text-sm rounded-xl hover:scale-105 transition-transform shadow-xl shadow-[#00A3FF]/20"'),
    ('<h2 className="text-[32px] md:text-[44px] font-studio font-bold uppercase tracking-tight leading-[1.1] mb-2 text-white">', '<h2 className="text-[32px] md:text-[44px] font-studio font-bold tracking-tight leading-[1.1] mb-2 text-white">'),
    ('<span className="text-[10px] font-semibold text-[#00A3FF] uppercase tracking-widest">Tip</span>', '<span className="text-[10px] font-semibold text-[#00A3FF]">Tip</span>'),
    ('<span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: isSubscribed ? \'#22C55E\' : \'#00A3FF\' }}>', '<span className="text-[10px] font-semibold" style={{ color: isSubscribed ? \'#22C55E\' : \'#00A3FF\' }}>'),
    ('<h3 className="text-lg font-semibold uppercase text-white tracking-widest">Comments', '<h3 className="text-lg font-semibold text-white">Comments'),
    ('<p className="font-bold uppercase tracking-widest">No comments yet.</p>', '<p className="font-bold">No comments yet.</p>'),
    ('<h2 className="text-[40px] font-studio font-bold uppercase tracking-tight mb-4 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">', '<h2 className="text-[40px] font-studio font-bold tracking-tight mb-4 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">'),
    ('<p className="text-xl text-[#B0B0B0] font-bold tracking-tight uppercase">', '<p className="text-xl text-[#B0B0B0] font-bold tracking-tight">'),
    ('<p className="text-[10px] font-semibold text-[#B0B0B0] uppercase tracking-widest mb-1">Skip ads forever</p>', '<p className="text-[10px] font-semibold text-[#B0B0B0] mb-1">Skip ads forever</p>'),
    ('<p className="text-sm font-semibold text-white uppercase tracking-tight">Premium MK 2,000/month</p>', '<p className="text-sm font-semibold text-white">Premium MK 2,000/month</p>'),
    ('className="px-6 py-3 bg-white text-black rounded-[16px] font-semibold text-[10px] uppercase tracking-widest hover:bg-[#0084D6] hover:text-white transition-all shadow-xl"', 'className="px-6 py-3 bg-white text-black rounded-[16px] font-semibold text-[10px] hover:bg-[#0084D6] hover:text-white transition-all shadow-xl"'),
    ('<p className="text-[10px] font-bold text-white uppercase tracking-widest">{toastMsg.message}</p>', '<p className="text-[10px] font-bold text-white">{toastMsg.message}</p>'),
    ('<h2 className="text-[32px] font-studio font-bold uppercase tracking-tight mb-4 text-white">The Feed is Cold</h2>', '<h2 className="text-[32px] font-studio font-bold tracking-tight mb-4 text-white">The Feed is Cold</h2>'),
    ('className="px-8 py-4 bg-white text-black rounded-[16px] font-semibold text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"', 'className="px-8 py-4 bg-white text-black rounded-[16px] font-semibold text-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"'),
    ('className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-[16px] font-semibold text-sm uppercase tracking-widest hover:bg-white/10 transition-all"', 'className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-[16px] font-semibold text-sm hover:bg-white/10 transition-all"')
])

# ArtistLanding.tsx
safe_replace('src/pages/ArtistLanding.tsx', [
    ('<Link to="/" className="font-display font-medium text-[13px] text-white/50 hover:text-white transition-colors uppercase tracking-widest">Listener App</Link>', '<Link to="/" className="font-display font-medium text-[13px] text-white/50 hover:text-white transition-colors">Listener App</Link>'),
    ('<button onClick={() => navigate(\'/auth/artist\')} className="px-6 h-[40px] font-display font-bold text-[12px] text-white/60 hover:text-white uppercase tracking-widest transition-all">Sign in</button>', '<button onClick={() => navigate(\'/auth/artist\')} className="px-6 h-[40px] font-display font-bold text-[12px] text-white/60 hover:text-white transition-all">Sign in</button>'),
    ('className="h-[40px] px-6 bg-white text-black font-display font-bold text-[12px] uppercase tracking-widest rounded-[10px] hover:bg-[#0084D6] hover:text-white transition-all transform hover:-translate-y-0.5 active:scale-95"', 'className="h-[40px] px-6 bg-white text-black font-display font-bold text-[12px] rounded-[10px] hover:bg-[#0084D6] hover:text-white transition-all transform hover:-translate-y-0.5 active:scale-95"'),
    ('<h2 className="text-3xl font-studio font-bold uppercase tracking-tighter">', '<h2 className="text-3xl font-studio font-bold tracking-tight">'),
    ('<h2 className="text-4xl md:text-6xl font-studio font-bold uppercase leading-tight">', '<h2 className="text-4xl md:text-6xl font-studio font-bold leading-tight">'),
    ('<h3 className="text-xl font-studio font-bold uppercase text-white mb-3">', '<h3 className="text-xl font-studio font-bold text-white mb-3">'),
    ('<h3 className="text-center text-2xl font-studio font-bold uppercase mb-8">', '<h3 className="text-center text-2xl font-studio font-bold mb-8">'),
    ('<h3 className="text-5xl md:text-7xl font-studio font-bold uppercase leading-tight">Three steps to <span className="text-[#00A3FF]">monetising</span> your art.</h3>', '<h3 className="text-5xl md:text-7xl font-studio font-bold leading-tight">Three steps to <span className="text-[#00A3FF]">monetising</span> your art.</h3>'),
    ('<h4 className="text-[clamp(1.5rem,3vw,2rem)] font-studio font-bold uppercase text-white mb-4">{s.title}</h4>', '<h4 className="text-[clamp(1.5rem,3vw,2rem)] font-studio font-bold text-white mb-4">{s.title}</h4>'),
    ('<h3 className="text-5xl md:text-8xl font-studio font-bold uppercase tracking-tighter leading-none mb-4">Studio plans</h3>', '<h3 className="text-5xl md:text-8xl font-studio font-bold tracking-tight leading-none mb-4">Studio plans</h3>'),
    ('<h3 className="text-2xl font-studio font-bold uppercase mb-2 text-white/60">Free Studio</h3>', '<h3 className="text-2xl font-studio font-bold mb-2 text-white/60">Free Studio</h3>'),
    ('className="w-full h-[54px] bg-white/5 border border-white/10 text-white/60 rounded-[10px] font-display font-bold text-[12px] uppercase tracking-widest hover:bg-white/10 transition-all mt-8"', 'className="w-full h-[54px] bg-white/5 border border-white/10 text-white/60 rounded-[10px] font-display font-bold text-[12px] hover:bg-white/10 transition-all mt-8"'),
    ('<h3 className="text-2xl font-studio font-bold uppercase mb-2">Rising Star</h3>', '<h3 className="text-2xl font-studio font-bold mb-2">Rising Star</h3>'),
    ('className="w-full h-[54px] bg-white text-black rounded-[10px] font-display font-bold text-[12px] uppercase tracking-widest hover:bg-[#0084D6] hover:text-white transition-all shadow-xl mt-auto md:mt-8"', 'className="w-full h-[54px] bg-white text-black rounded-[10px] font-display font-bold text-[12px] hover:bg-[#0084D6] hover:text-white transition-all shadow-xl mt-auto md:mt-8"'),
    ('<h3 className="text-2xl font-studio font-bold uppercase mb-2 text-[#00A3FF]">Standard</h3>', '<h3 className="text-2xl font-studio font-bold mb-2 text-[#00A3FF]">Standard</h3>'),
    ('className="w-full h-[54px] bg-[#0084D6] text-white rounded-[10px] font-display font-bold text-[12px] uppercase tracking-widest hover:brightness-110 shadow-xl mt-auto md:mt-8"', 'className="w-full h-[54px] bg-[#0084D6] text-white rounded-[10px] font-display font-bold text-[12px] hover:brightness-110 shadow-xl mt-auto md:mt-8"'),
    ('<h3 className="text-2xl font-studio font-bold uppercase mb-2">Elite</h3>', '<h3 className="text-2xl font-studio font-bold mb-2">Elite</h3>'),
    ('className="w-full h-[54px] bg-white text-black rounded-[10px] font-display font-bold text-[12px] uppercase tracking-widest hover:bg-[#0084D6] hover:text-white transition-all shadow-xl mt-auto md:mt-8"', 'className="w-full h-[54px] bg-white text-black rounded-[10px] font-display font-bold text-[12px] hover:bg-[#0084D6] hover:text-white transition-all shadow-xl mt-auto md:mt-8"'),
    ('<h2 className="text-4xl md:text-6xl font-studio font-bold uppercase mb-4">', '<h2 className="text-4xl md:text-6xl font-studio font-bold mb-4">'),
    ('className="inline-flex items-center gap-3 h-14 px-10 bg-smash-green text-white rounded-full font-display font-bold uppercase tracking-widest text-sm hover:brightness-110 transition-all"', 'className="inline-flex items-center gap-3 h-14 px-10 bg-smash-green text-white rounded-full font-display font-bold text-sm hover:brightness-110 transition-all"'),
    ('<h2 className="text-5xl md:text-8xl font-studio font-bold uppercase leading-none text-white mb-8">Ready to <span className="text-black">smash</span> the charts?</h2>', '<h2 className="text-5xl md:text-8xl font-studio font-bold leading-none text-white mb-8">Ready to <span className="text-black">smash</span> the charts?</h2>'),
    ('className="h-[64px] px-12 bg-white text-[#00A3FF] font-display font-bold text-lg uppercase tracking-widest rounded-[16px] transform hover:scale-105 active:scale-95 transition-all shadow-2xl"', 'className="h-[64px] px-12 bg-white text-[#00A3FF] font-display font-bold text-lg rounded-[16px] transform hover:scale-105 active:scale-95 transition-all shadow-2xl"')
])

# WithdrawTab.tsx
safe_replace('src/components/artist/WithdrawTab.tsx', [
    ('<h2 className="text-[28px] md:text-[32px] font-studio font-bold flex items-center justify-start gap-3 uppercase text-text-primary leading-tight">', '<h2 className="text-[28px] md:text-[32px] font-studio font-bold flex items-center justify-start gap-3 text-text-primary leading-tight">'),
    ('<h4 className="text-[#00A3FF] font-studio font-bold uppercase tracking-wider text-sm">', '<h4 className="text-[#00A3FF] font-studio font-bold text-sm">'),
    ('<span className="text-[#00A3FF] font-bold uppercase tracking-wider block mb-1">Secure Payout Encryption Note</span>', '<span className="text-[#00A3FF] font-bold block mb-1">Secure Payout Encryption Note</span>'),
    ('<label className="block text-[11px] font-display font-medium uppercase tracking-wider text-text-muted mb-2">', '<label className="block text-[11px] font-display font-medium text-text-muted mb-2">'),
    ('className="w-full h-[46px] bg-[#00A3FF]/20 border border-[#00A3FF]/30 hover:border-[#00A3FF]/60 text-[#00A3FF] text-[12px] font-display font-bold uppercase tracking-widest rounded-[10px] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"', 'className="w-full h-[46px] bg-[#00A3FF]/20 border border-[#00A3FF]/30 hover:border-[#00A3FF]/60 text-[#00A3FF] text-[12px] font-display font-bold rounded-[10px] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"'),
    ('<h4 className="text-white font-studio font-bold uppercase tracking-widest text-md">Upgrade to Payout</h4>', '<h4 className="text-white font-studio font-bold text-md">Upgrade to Payout</h4>'),
    ('className="px-6 py-2.5 bg-[#0084D6] hover:bg-[#0084D6]/90 text-white text-[11px] font-display font-bold uppercase tracking-widest rounded-[10px] transition-all"', 'className="px-6 py-2.5 bg-[#0084D6] hover:bg-[#0084D6]/90 text-white text-[11px] font-display font-bold rounded-[10px] transition-all"'),
    ('<h4 className="text-white font-studio font-bold uppercase tracking-wider text-sm flex items-center gap-2">', '<h4 className="text-white font-studio font-bold text-sm flex items-center gap-2">'),
    ('<label className="text-[11px] text-text-muted font-display font-medium uppercase tracking-wider block mb-2">', '<label className="text-[11px] text-text-muted font-display font-medium block mb-2">'),
    ('className="w-full h-[48px] bg-[#0084D6] text-white rounded-[10px] font-display font-semibold uppercase tracking-widest text-[12px] shadow-sm hover:bg-[#0084D6]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"', 'className="w-full h-[48px] bg-[#0084D6] text-white rounded-[10px] font-display font-semibold text-[12px] shadow-sm hover:bg-[#0084D6]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"'),
    ('<h3 className="text-[18px] font-studio font-semibold uppercase tracking-tight text-white mb-6">Recent <span className="text-[#00A3FF]">Payouts</span></h3>', '<h3 className="text-[18px] font-studio font-semibold tracking-tight text-white mb-6">Recent <span className="text-[#00A3FF]">Payouts</span></h3>'),
])
