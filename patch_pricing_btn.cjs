const fs = require('fs');
let code = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');

const oldCard = `const PricingCard = ({ title, price, features, badge, isArtist = false, onAction, subtitle, period = 'mo' }: any) => (
  <div className={\`bento-card p-6 md:p-10 flex flex-col relative overflow-hidden group hover:border-smash-orange/30 transition-all \${badge ? 'ring-2 ring-smash-orange bg-smash-dark/50' : 'bg-white/5 border-white/5'}\`}>
    {badge && (
      <div className="absolute top-4 md:top-6 right-0 bg-smash-orange text-white text-[9px] md:text-[10px] font-black px-3 md:px-4 py-1.5 rounded-l-full uppercase tracking-widest shadow-lg z-10">
        {badge}
      </div>
    )}
    <h3 className="text-xl md:text-2xl font-black font-display italic uppercase mb-1">{title}</h3>
    {subtitle && <p className="text-smash-gray text-[10px] md:text-xs mb-4 font-bold h-4">{subtitle}</p>}
    <div className="flex items-baseline gap-2 mb-6 md:mb-8">
      <span className="text-[10px] md:text-sm font-black text-smash-gray uppercase tracking-widest">MK</span>
      <span className="text-4xl md:text-5xl font-black font-display italic">{price}</span>
      <span className="text-[10px] md:text-sm font-black text-smash-gray uppercase tracking-widest">/{period}</span>
    </div>
    <ul className="space-y-3 md:space-y-4 mb-4 flex-1">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-start gap-3 text-smash-gray font-bold group-hover:text-white transition-colors text-xs md:text-sm">
          <Check size={16} className="text-smash-orange flex-shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <button 
      onClick={onAction}
      className={\`w-full py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest transition-all \${badge ? 'bg-smash-orange text-white hover:bg-smash-orange/80 shadow-xl mt-auto' : 'bg-white text-smash-black hover:bg-smash-orange hover:text-white shadow-xl mt-auto'}\`}
    >
      {price === '0' ? 'Start Free' : (isArtist ? 'Upgrade Now' : 'Get Plan')}
    </button>
  </div>
);`;

const newCard = `const PricingCard = ({ title, price, features, badge, isArtist = false, onAction, subtitle, period = 'mo', isCurrentPlan = false }: any) => (
  <div className={\`bento-card p-6 md:p-10 flex flex-col relative overflow-hidden group hover:border-smash-orange/30 transition-all \${isCurrentPlan ? 'ring-2 ring-[#22C55E] bg-[#22C55E]/5' : (badge ? 'ring-2 ring-smash-orange bg-smash-dark/50' : 'bg-white/5 border-white/5')}\`}>
    {isCurrentPlan && (
      <div className="absolute top-4 md:top-6 right-0 bg-[#22C55E] text-white text-[9px] md:text-[10px] font-black px-3 md:px-4 py-1.5 rounded-l-full uppercase tracking-widest shadow-lg z-10">
        CURRENT PLAN
      </div>
    )}
    {!isCurrentPlan && badge && (
      <div className="absolute top-4 md:top-6 right-0 bg-smash-orange text-white text-[9px] md:text-[10px] font-black px-3 md:px-4 py-1.5 rounded-l-full uppercase tracking-widest shadow-lg z-10">
        {badge}
      </div>
    )}
    <h3 className="text-xl md:text-2xl font-black font-display italic uppercase mb-1">{title}</h3>
    {subtitle && <p className="text-smash-gray text-[10px] md:text-xs mb-4 font-bold h-4">{subtitle}</p>}
    <div className="flex items-baseline gap-2 mb-6 md:mb-8">
      <span className="text-[10px] md:text-sm font-black text-smash-gray uppercase tracking-widest">MK</span>
      <span className="text-4xl md:text-5xl font-black font-display italic">{price}</span>
      <span className="text-[10px] md:text-sm font-black text-smash-gray uppercase tracking-widest">/{period}</span>
    </div>
    <ul className="space-y-3 md:space-y-4 mb-4 flex-1">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-start gap-3 text-smash-gray font-bold group-hover:text-white transition-colors text-xs md:text-sm">
          <Check size={16} className={\`\${isCurrentPlan ? 'text-[#22C55E]' : 'text-smash-orange'} flex-shrink-0 mt-0.5 md:w-[18px] md:h-[18px]\`} />
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <button 
      onClick={onAction}
      disabled={isCurrentPlan}
      className={\`w-full py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest transition-all mt-auto \${isCurrentPlan ? 'bg-[#22C55E]/20 text-[#22C55E] cursor-not-allowed border border-[#22C55E]/30' : (badge ? 'bg-smash-orange text-white hover:bg-smash-orange/80 shadow-xl' : 'bg-white text-smash-black hover:bg-smash-orange hover:text-white shadow-xl')}\`}
    >
      {isCurrentPlan ? 'Active Plan' : (price === '0' ? 'Start Free' : (isArtist ? 'Upgrade Now' : 'Get Plan'))}
    </button>
  </div>
);`;

if(code.includes(oldCard)) {
  code = code.replace(oldCard, newCard);
  fs.writeFileSync('src/pages/Pricing.tsx', code);
  console.log("PricingCard patched");
} else {
  console.log("Could not find exact oldCard");
}
