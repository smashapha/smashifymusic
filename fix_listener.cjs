const fs = require('fs');
let content = fs.readFileSync('src/pages/AuthListener.tsx', 'utf8');
content = content.replace('{otpSent && !otpVerified && (', '{false && (');
content = content.replace('{otpSent ? \'Code Sent ✓\' : loadingState ? \'Sending...\' : \'REGISTER\'}', '{loadingState ? \'Sending...\' : \'REGISTER\'}');
fs.writeFileSync('src/pages/AuthListener.tsx', content);
