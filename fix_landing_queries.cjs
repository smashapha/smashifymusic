const fs = require('fs');
let code = fs.readFileSync('src/pages/Landing.tsx', 'utf8');

// Fix 'artists(...)' -> 'profiles:artist_id(stage_name, full_name)'
code = code.replace(/artists\(stage_name, full_name\)/g, "profiles:artist_id(stage_name, full_name)");

// Fix 'is_approved' -> 'approved'
code = code.replace(/\.eq\('is_approved', true\)/g, ".eq('approved', true)");

fs.writeFileSync('src/pages/Landing.tsx', code);
