const fs = require('fs');
let code = fs.readFileSync('src/pages/Notifications.tsx', 'utf8');

code = code.replace(
  "case 'new_drop':",
  "case 'new_drop':\n      case 'artist_drop':"
);

// We should also check main layout
let layout = fs.readFileSync('src/components/common/MainLayout.tsx', 'utf8');
layout = layout.replace(
  "if (newNotif.type === 'new_drop' || newNotif.type === 'track_approved') {",
  "if (newNotif.type === 'new_drop' || newNotif.type === 'track_approved' || newNotif.type === 'artist_drop') {"
);
fs.writeFileSync('src/components/common/MainLayout.tsx', layout);
fs.writeFileSync('src/pages/Notifications.tsx', code);
console.log('Patched Notifications and MainLayout');
