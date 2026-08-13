const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');
code = code.replace(
  'import { OnboardingChecklist } from "../components/artist/OnboardingChecklist";',
  'import { OnboardingChecklist } from "../components/artist/ArtistOnboarding";'
);
fs.writeFileSync('src/pages/ArtistHub.tsx', code);
