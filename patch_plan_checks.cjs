const fs = require('fs');
let code = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');

// We need to pass isCurrentPlan down.
// Listeners check: userProfile?.subscription_tier === 'DailyPass' etc
// Artists check: userProfile?.artist_tier === 'RisingStar' etc OR role checks if it's Free Studio

const patches = [
  {
    target: `title="Daily Pass" \n                price="150" `,
    replace: `title="Daily Pass" \n                isCurrentPlan={userProfile?.subscription_tier === 'DailyPass'}\n                price="150" `
  },
  {
    target: `title="Weekly Pass" \n                price="700" `,
    replace: `title="Weekly Pass" \n                isCurrentPlan={userProfile?.subscription_tier === 'WeeklyPass'}\n                price="700" `
  },
  {
    target: `title="Premium Monthly" \n                price="2,000" `,
    replace: `title="Premium Monthly" \n                isCurrentPlan={userProfile?.subscription_tier === 'Premium'}\n                price="2,000" `
  },
  {
    target: `title="Family Monthly" \n                price="5,000" `,
    replace: `title="Family Monthly" \n                isCurrentPlan={userProfile?.subscription_tier === 'Family'}\n                price="5,000" `
  },
  {
    target: `isArtist={true}\n                title="Free Studio" \n                price="0" `,
    replace: `isArtist={true}\n                isCurrentPlan={role === 'artist' && userProfile?.artist_tier === 'Free'}\n                title="Free Studio" \n                price="0" `
  },
  {
    target: `isArtist={true}\n                title="Rising Star" \n                price="8,000" `,
    replace: `isArtist={true}\n                isCurrentPlan={role === 'artist' && userProfile?.artist_tier === 'RisingStar'}\n                title="Rising Star" \n                price="8,000" `
  },
  {
    target: `isArtist={true}\n                title="Standard" \n                price="16,000" `,
    replace: `isArtist={true}\n                isCurrentPlan={role === 'artist' && userProfile?.artist_tier === 'Standard'}\n                title="Standard" \n                price="16,000" `
  },
  {
    target: `isArtist={true}\n                title="Elite" \n                price="27,000" `,
    replace: `isArtist={true}\n                isCurrentPlan={role === 'artist' && userProfile?.artist_tier === 'Elite'}\n                title="Elite" \n                price="27,000" `
  },
];

let changed = false;
for (const p of patches) {
  if (code.includes(p.target)) {
    code = code.replace(p.target, p.replace);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync('src/pages/Pricing.tsx', code);
  console.log("Patched plan checks");
} else {
  console.log("Failed to patch plan checks");
}
