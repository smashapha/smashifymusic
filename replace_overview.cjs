const fs = require('fs');
let code = fs.readFileSync('src/components/artist/OverviewCards.tsx', 'utf8');

code = code.replace(
  `className="bg-bg-surface border border-border-default rounded-[14px] p-6 hover:border-smash-purple/50 transition-colors group shadow-sm flex flex-col justify-between h-full"`,
  `className="bg-bg-surface border border-border-default rounded-[14px] p-4 md:p-6 hover:border-smash-purple/50 transition-colors group shadow-sm flex flex-col justify-between h-full"`
);

code = code.replace(
  `w-10 h-10 rounded-[10px]`,
  `w-8 h-8 md:w-10 md:h-10 rounded-[8px] md:rounded-[10px]`
);

code = code.replace(
  `w-16 h-6`,
  `w-12 h-4 md:w-16 md:h-6`
);

code = code.replace(
  `text-[20px] md:text-[28px] font-studio font-bold leading-none mb-2 \${value === 'No data yet' ? 'text-text-muted text-sm' : 'text-text-primary'}\`}>{value}`,
  `text-[18px] md:text-[28px] font-studio font-bold leading-tight md:leading-none mb-1 md:mb-2 \${value === 'No data yet' ? 'text-text-muted text-xs md:text-sm' : 'text-text-primary'}\`}>{value}`
);

code = code.replace(
  `text-[11px] text-text-muted font-display font-medium uppercase tracking-wider`,
  `text-[9px] md:text-[11px] text-text-muted font-display font-medium uppercase tracking-wider leading-tight`
);

code = code.replace(
  `text-[11px] text-text-secondary font-sans leading-tight mt-2`,
  `text-[9px] md:text-[11px] text-text-secondary font-sans leading-tight mt-1 md:mt-2`
);

code = code.replace(
  `grid grid-cols-2 md:grid-cols-4 gap-6`,
  `grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6`
);

fs.writeFileSync('src/components/artist/OverviewCards.tsx', code);
