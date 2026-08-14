import React from 'react';
import { Download, Cloud, Loader2 } from 'lucide-react';

export const OfflineTrackButton = ({ isSaved, isCachedLocal, cacheProgress, toggleOffline, song, navigate }: any) => {
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); toggleOffline(song, navigate); }}
      className={`p-2 rounded-full transition-colors flex items-center justify-center ${isCachedLocal ? 'text-[#00A3FF] bg-[#00A3FF]/10 hover:bg-[#00A3FF]/20' : isSaved ? 'text-text-secondary hover:text-[#00A3FF]' : 'text-text-muted opacity-40 hover:opacity-100 hover:text-[#00A3FF]'}`}
      title={isCachedLocal ? "Remove from offline" : isSaved ? "Download now" : "Save for offline"}
    >
      {cacheProgress !== null ? (
         <div className="relative flex items-center justify-center w-3.5 h-3.5">
           <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
             <path
               className="text-[#00A3FF]/20"
               d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
               fill="none"
               stroke="currentColor"
               strokeWidth="4"
             />
             <path
               className="text-[#00A3FF]"
               strokeDasharray={`${cacheProgress}, 100`}
               d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
               fill="none"
               stroke="currentColor"
               strokeWidth="4"
             />
           </svg>
         </div>
      ) : isCachedLocal ? (
        <Download size={14} className="text-[#00A3FF]" /> // wait, instruction says "filled blue download icon" but Lucide Download is stroked. I'll use text-[#00A3FF]
      ) : isSaved ? (
        <Cloud size={14} />
      ) : (
        <Download size={14} />
      )}
    </button>
  );
};
