import dotenv from 'dotenv';
dotenv.config();

const url1 = "https://api.paychangu.com/verify-payment/SMA-e0ecc33a971e-1780823963014";
const url2 = "https://api.paychangu.com/verify-payment/SMA-27b9c65cbcad-1780824105850";
const PAYCHANGU_SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY || 'sec-live-n5Wex6M3aL8V2h4T9pQyR1zKj'; // Wait, let's grab it from the env? Wait, we don't have PAYCHANGU_SECRET_KEY locally!

async function verify(url) {
  console.log("Verifying: ", url);
  // We can try to make a raw edge function call using supabase-js if we can't use the secret key 
}
verify(url1);
