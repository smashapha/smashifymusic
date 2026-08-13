import React from 'react';
import { Flame, CheckCircle, Snowflake, Archive, Music2 } from 'lucide-react';
import { getTierLimits } from '../../lib/tierUtils';

export const SlotUsageCard = ({ songs, userProfile }: { songs: any[], userProfile: any }) => {
  const limits = getTierLimits(userProfile);
  const songLimit = limits.songLimit;

  const hotCount = songs.filter(s => s.slot_mode === 'hot').length;
  const activeCount = songs.filter(s => s.slot_mode === 'active').length;
  const coldCount = songs.filter(s => s.slot_mode === 'cold').length;
  const archiveCount = songs.filter(s => s.slot_mode === 'archive').length;
  const totalSlotted = hotCount + activeCount + coldCount;
  
  const pct = songLimit > 0 ? Math.round((totalSlotted / songLimit) * 100) : 0;

  return (
    <div className="bg-bg-surface border border-border-default rounded-[14px] p-4 md:p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-display font-black uppercase tracking-widest text-white">Track Slots Usage</h3>
        <span className="text-sm font-sans text-text-secondary">{totalSlotted} / {songLimit === Infinity ? '∞' : songLimit} used</span>
      </div>
      
      {songLimit !== Infinity && (
        <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden mb-6">
          <div className="h-full bg-smash-purple" style={{ width: `${pct}%` }}></div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-orange-400 flex items-center gap-1 text-[9px] sm:text-[10px] md:text-[11px] font-display font-bold uppercase"><Flame size={12}/> Hot</span>
          <span className="text-lg md:text-xl font-studio font-bold text-white">{hotCount}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-smash-green flex items-center gap-1 text-[9px] sm:text-[10px] md:text-[11px] font-display font-bold uppercase"><CheckCircle size={12}/> Active</span>
          <span className="text-lg md:text-xl font-studio font-bold text-white">{activeCount}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-cyan-400 flex items-center gap-1 text-[9px] sm:text-[10px] md:text-[11px] font-display font-bold uppercase"><Snowflake size={12}/> Cold</span>
          <span className="text-lg md:text-xl font-studio font-bold text-white">{coldCount}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-text-muted flex items-center gap-1 text-[9px] sm:text-[10px] md:text-[11px] font-display font-bold uppercase"><Archive size={12}/> Archive</span>
          <span className="text-lg md:text-xl font-studio font-bold text-white">{archiveCount}</span>
        </div>
      </div>
    </div>
  );
};
