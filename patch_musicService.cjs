const fs = require('fs');
let code = fs.readFileSync('src/services/musicService.ts', 'utf8');

const target = `  /**
   * Records a successful purchase in Database (idempotent on fan_id,song_id)
   */
  async recordPurchase(userId: string, songId: string, amount: number, tx_ref: string) {
    const { data, error } = await supabase
      .from('fan_purchases')
      .upsert({
        fan_id: userId,
        song_id: songId,
        amount,
        transaction_id: tx_ref,
        status: 'completed'
      }, { onConflict: 'fan_id,song_id' })
      .select()
      .maybeSingle();

    if (error && error.code !== '23505') throw error;
    return data;
  },`;

if (code.includes(target)) {
    code = code.replace(target, '');
    fs.writeFileSync('src/services/musicService.ts', code);
    console.log("Removed recordPurchase from musicService.ts");
} else {
    console.log("Target not found");
}
