const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `onClick={() => adminCompleteAgentPayout(agent.user_id)}`;
const replacement = `onClick={() => adminCompleteAgentPayout(agent.id)}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/pages/Admin.tsx', code);
    console.log("Patched adminCompleteAgentPayout argument");
} else {
    console.log("Target not found");
}
