const fs = require('fs');
let code = fs.readFileSync('supabase/functions/create-payment/index.ts', 'utf8');

const target = `    } else {
      finalAmount = canonicalAmount ?? Number(amount);
    }`;

const replacement = `    } else if (type === 'fan_subscription') {
      if (!meta?.artistId) {
        return new Response(JSON.stringify({ error: 'Missing artistId for fan subscription' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      const { data: artistProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('subscription_price')
        .eq('id', meta.artistId)
        .single();
      if (profileErr || !artistProfile) {
        return new Response(JSON.stringify({ error: 'Artist not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      finalAmount = artistProfile.subscription_price || 1500;
    } else {
      finalAmount = canonicalAmount ?? Number(amount);
    }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('supabase/functions/create-payment/index.ts', code);
    console.log("Patched create-payment");
} else {
    console.log("Target not found");
}
