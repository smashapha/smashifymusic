import React from 'react';
import { Wallet, DollarSign, Play, Music2 } from 'lucide-react';

const MetricCard = ({ label, value, icon, sub, color }: any) => (
  <div className="bg-bg-surface border border-border-default rounded-[14px] p-4 md:p-6 hover:border-[#00A3FF]/50 transition-colors group shadow-sm flex flex-col justify-between h-full">
     <div className="flex items-center justify-between mb-4">
        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-[8px] md:rounded-[10px] bg-bg-elevated border border-border-default flex items-center justify-center ${color || 'text-text-muted'} group-hover:text-[#00A3FF] transition-colors`}>
           {icon}
        </div>
        <svg className="w-12 h-4 md:w-16 md:h-6 text-[#00A3FF]/10 group-hover:text-[#00A3FF] transition-colors opacity-50 relative top-1" viewBox="0 0 100 25" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M0 25L20 15L40 20L60 5L75 10L100 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
     </div>
     <div className="space-y-1">
        <div className={`text-[18px] md:text-[28px] font-studio font-bold leading-tight md:leading-none mb-1 md:mb-2 ${value === 'No data yet' ? 'text-text-muted text-xs md:text-sm' : 'text-text-primary'}`}>{value}</div>
        <div className="text-[9px] md:text-[11px] text-text-muted font-display font-medium uppercase tracking-wider leading-tight">
           {label}
        </div>
        {sub && <div className="text-[9px] md:text-[11px] text-text-secondary font-sans leading-tight mt-1 md:mt-2">{sub}</div>}
     </div>
  </div>
);

export const OverviewCards = ({ stats, balance, songs }: { stats: any, balance: number, songs: any[] }) => {
  const activeTracks = songs ? songs.filter(s => s.is_active).length : 0;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
      <MetricCard
        label="AVAILABLE BALANCE"
        value={balance > 0 ? `MK ${balance.toLocaleString()}` : 'No data yet'}
        icon={<Wallet size={20} />}
        color="text-[#22C55E]"
        sub="Ready for withdrawal"
      />
      <MetricCard
        label="TOTAL EARNINGS"
        value={stats.revenue > 0 ? `MK ${stats.revenue.toLocaleString()}` : 'No data yet'}
        icon={<DollarSign size={20} />}
        color="text-[#22C55E]"
        sub="Lifetime earnings"
      />
      <MetricCard
        label="RECENT PLAYS"
        value={stats.streams > 0 ? stats.streams.toLocaleString() : 'No data yet'}
        icon={<Play size={20} />}
        color="text-[#00A3FF]"
        sub="NOT tied to earnings"
      />
      <MetricCard
        label="ACTIVE TRACKS"
        value={activeTracks > 0 ? activeTracks.toString() : 'No data yet'}
        icon={<Music2 size={20} />}
        color="text-white"
        sub="Currently distributed"
      />
    </div>
  );
};
