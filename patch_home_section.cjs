const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const regex = /const HomeSection = \(\{([^}]*)\}: \{([^}]*)\}\) => \{/;

code = code.replace(
  'const HomeSection = ({ \n  title, \n  subtitle, \n  onViewAll, \n  children \n}: { \n  title: string; \n  subtitle: string; \n  onViewAll?: () => void; \n  children: React.ReactNode; \n}) => {',
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
}) => {`
);

code = code.replace(
  '<div className="flex items-end justify-between mb-6">',
  '<div className="flex items-end justify-between mb-6">\n        <div>\n          {overline && <p className="text-[11px] font-black uppercase tracking-widest text-[#00A3FF] mb-1">{overline}</p>}'
);

code = code.replace(
  '<h2 className="text-xl md:text-[22px] font-studio font-bold text-white leading-tight">',
  '</div>\n        <h2 className="text-xl md:text-[22px] font-studio font-bold text-white leading-tight">'
); // Wait, need to see the exact structure.
fs.writeFileSync('src/pages/Home.tsx', code);
