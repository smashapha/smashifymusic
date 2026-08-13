const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

const target = `      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {userProfile?.is_admin && (
           <Link 
              to="/admin" 
              className="col-span-full p-6 bg-gradient-to-r from-red-500/20 via-smash-purple/20 to-transparent border border-red-500/30 rounded-[30px] flex items-center justify-between group hover:border-red-500 transition-all shadow-2xl shadow-red-500/10"
           >
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={32} />
                 </div>
                 <div>
                    <h3 className="text-xl font-studio font-black uppercase italic text-white leading-tight">Terminal Control</h3>
                    <p className="text-[10px] text-red-400 font-black uppercase tracking-[0.3em] mt-1">Platform Moderation & Payout Engine</p>
                 </div>
              </div>
              <div className="flex items-center gap-3 pr-4">
                 <span className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-white transition-colors">Enter System</span>
                 <ArrowRight className="text-red-400 group-hover:translate-x-2 transition-transform" />
              </div>
           </Link>
        )}
         <OverviewCards stats={stats} balance={balance} songs={songs} />
      </div>`;

const replacement = `      {/* KPI Section */}
      <div className="flex flex-col gap-4 md:gap-6">
        {userProfile?.is_admin && (
           <Link 
              to="/admin" 
              className="w-full p-6 bg-gradient-to-r from-red-500/20 via-smash-purple/20 to-transparent border border-red-500/30 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-red-500 transition-all shadow-2xl shadow-red-500/10"
           >
              <div className="flex items-center gap-4 md:gap-6">
                 <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6 md:w-8 md:h-8" />
                 </div>
                 <div>
                    <h3 className="text-lg md:text-xl font-studio font-black uppercase italic text-white leading-tight">Terminal Control</h3>
                    <p className="text-[9px] md:text-[10px] text-red-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1">Platform Moderation & Payout Engine</p>
                 </div>
              </div>
              <div className="flex items-center gap-3 md:pr-4 self-end md:self-auto">
                 <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-white transition-colors">Enter System</span>
                 <ArrowRight className="text-red-400 group-hover:translate-x-2 transition-transform" size={16} />
              </div>
           </Link>
        )}
        <OverviewCards stats={stats} balance={balance} songs={songs} />
      </div>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/ArtistHub.tsx', code);
