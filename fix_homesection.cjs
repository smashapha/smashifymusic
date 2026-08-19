const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

code = code.replace(
  'const HomeSection = ({ \n  title, \n  subtitle, \n  onViewAll, \n  children \n}: { \n  title: string; \n  subtitle: string; \n  onViewAll?: () => void; \n  children: React.ReactNode; \n}) => (',
  `const HomeSection = ({ 
  overline,
  title, 
  subtitle, 
  onViewAll, 
  children 
}: { 
  overline?: string;
  title: string; 
  subtitle: string; 
  onViewAll?: () => void; 
  children: React.ReactNode; 
}) => (`
);

code = code.replace(
  '<div>\n        <h2 className="text-[20px] md:text-[22px] font-studio font-bold tracking-[-0.01em] text-white leading-none mb-1">{title}</h2>',
  `<div>
        {overline && <p className="text-[11px] font-black uppercase tracking-widest text-[#00A3FF] mb-2">{overline}</p>}
        <h2 className="text-[20px] md:text-[22px] font-studio font-bold tracking-[-0.01em] text-white leading-none mb-1">{title}</h2>`
);

fs.writeFileSync('src/pages/Home.tsx', code);
