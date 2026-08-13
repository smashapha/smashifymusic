const fs = require('fs');
let code = fs.readFileSync('src/components/artist/SlotUsageCard.tsx', 'utf8');

code = code.replace(
  `className="bg-bg-surface border border-border-default rounded-[14px] p-6 mb-8"`,
  `className="bg-bg-surface border border-border-default rounded-[14px] p-4 md:p-6 mb-8"`
);

code = code.replace(
  `grid grid-cols-4 gap-4`,
  `grid grid-cols-4 gap-2 md:gap-4`
);

code = code.replace(
  /text-\[11px\]/g,
  `text-[9px] sm:text-[10px] md:text-[11px]`
);

code = code.replace(
  /text-xl/g,
  `text-lg md:text-xl`
);

fs.writeFileSync('src/components/artist/SlotUsageCard.tsx', code);
