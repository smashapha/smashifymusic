const fs = require('fs');
let code = fs.readFileSync('src/lib/paychangu.ts', 'utf8');

const target = `    const sanitizedRef = (tx_ref || '').trim().replace(/\\/$/, '').replace(/^["']|["']$/g, '');
    const session = (await supabase.auth.getSession()).data.session;`;

const replacement = `    const sanitizedRef = (tx_ref || '').trim().replace(/\\/$/, '').replace(/^["']|["']$/g, '');
    
    let session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 400));
        session = (await supabase.auth.getSession()).data.session;
        if (session) break;
      }
    }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/paychangu.ts', code);
