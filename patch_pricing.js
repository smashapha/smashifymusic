const fs = require('fs');
let code = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');

// Check if it already has the tab state
if (!code.includes('const [activeTab, setActiveTab] = useState')) {
  // Add state and replace layout
  code = code.replace(
    'const Pricing = () => {',
    `const Pricing = () => {
  const [activeTab, setActiveTab] = useState<'listener' | 'artist'>('listener');`
  );

  // Add the tab switcher UI above the plans
  const tabSwitcher = `
      <div className="flex justify-center mb-12">
        <div className="bg-white/5 p-1.5 rounded-full inline-flex relative">
          <div 
            className="absolute inset-y-1.5 bg-smash-orange rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: 'calc(50% - 6px)',
              left: activeTab === 'listener' ? '6px' : 'calc(50%)'
            }}
          />
          <button 
            onClick={() => setActiveTab('listener')}
            className={\`px-8 py-3 rounded-full text-[13px] font-black uppercase tracking-widest relative z-10 transition-colors \${activeTab === 'listener' ? 'text-white' : 'text-smash-gray hover:text-white'}\`}
          >
            For Listeners
          </button>
          <button 
            onClick={() => setActiveTab('artist')}
            className={\`px-8 py-3 rounded-full text-[13px] font-black uppercase tracking-widest relative z-10 transition-colors \${activeTab === 'artist' ? 'text-white' : 'text-smash-gray hover:text-white'}\`}
          >
            For Artists
          </button>
        </div>
      </div>
  `;
  
  // Need to find where to insert the switcher and wrap the plans
  // It looks like it currently renders:
  // <h1 ...>Choose Your Sound</h1>
  // <p ...>...</p>
  // <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-24">
  
  code = code.replace(
    '<div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-24">',
    tabSwitcher + '\n      {activeTab === \'listener\' ? (\n      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-24">'
  );
  
  // End of listener plans is before Artist plans if they exist or end of that grid.
  // Actually looking at the file it seems it has:
  // <h3 className="text-4xl ...>Artist Studio Plans</h3>
  // Wait, let's grep to see how Artist plans are rendered.
}

fs.writeFileSync('patch_temp.js', code);
