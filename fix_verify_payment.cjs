const fs = require('fs');
const filePath = 'verify-payment.txt';
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `        try {
          await processSuccessfulPayment(supabase, dbTx);
          await supabase.from("transactions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", dbTx.id);
          dbTx.status = "completed";
        } catch (e) {
          console.error("Inline processing error", e);
        }`;

content = content.replace(/try {\s*await processSuccessfulPayment\(supabase, dbTx\);\s*dbTx\.status = "completed";\s*} catch \(e\) {\s*console\.error\("Inline processing error", e\);\s*}/, replacement);

fs.writeFileSync(filePath, content);
console.log("Fixed verify-payment update logic");
