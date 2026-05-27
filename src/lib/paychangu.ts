import { supabase } from './supabase';
import { Song, UserProfile } from '../types';
import toast from 'react-hot-toast';

export type PaymentType = 
  | 'listener_premium' 
  | 'listener_family' 
  | 'artist_rising_star' 
  | 'artist_standard' 
  | 'artist_elite' 
  | 'track_purchase' 
  | 'tip' 
  | 'fan_subscription' 
  | 'artist_ad_campaign' 
  | 'featured_placement';

interface InitiatePaymentParams {
  amount: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  type: PaymentType;
  meta: Record<string, any>;
  return_url: string;
}

const envAppUrl = import.meta.env.VITE_APP_URL;
const APP_URL = (envAppUrl && envAppUrl !== 'YOUR_APP_URL') ? envAppUrl : window.location.origin;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Common function to initiate payment via Supabase Edge Functions
 */
export async function initiatePayment(params: InitiatePaymentParams) {
  const toastId = toast.loading('Initializing secure payment...');
  
  try {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    const tx_ref = `SMASH-${params.type.toUpperCase()}-${params.meta.userId || 'anon'}-${randomHex}-${Date.now()}`;
    
    const session = (await supabase.auth.getSession()).data.session;

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/create-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          ...params,
          tx_ref,
          currency: 'MWK'
        })
      }
    );

    const textToLog = await response.text();
    let data;
    try {
      data = JSON.parse(textToLog);
    } catch (e) {
      console.error("Failed to parse response JSON. Raw text:", textToLog);
      throw new Error(`Server returned invalid response format. Status: ${response.status}`);
    }

    if (!response.ok) {
       console.error("Payment Function Error:", data);
       throw new Error(data.error || data.message || 'Failed to initialize payment');
    }
    
    if (!data?.checkout_url) {
      console.error("Invalid response data:", data);
      throw new Error('Failed to get checkout URL from response');
    }

    toast.success('Redirecting to PayChangu...', { id: toastId });
    
    // Redirect user to hosted checkout
    window.location.href = data.checkout_url;
  } catch (err: any) {
    console.error('Payment error:', err);
    toast.error(err.message || 'Payment initialization failed', { id: toastId });
    throw err;
  }
}

/**
 * Buy a specific track
 */
export async function purchaseTrack({ song, user }: { song: Song; user: UserProfile }) {
  return initiatePayment({
    amount: song.price || 500,
    email: user.email,
    first_name: user.full_name?.split(' ')[0] || 'Fan',
    last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
    type: 'track_purchase',
    return_url: `${APP_URL}/purchase-success?song_id=${song.id}&tx_ref=`,
    meta: {
      userId: user.id,
      songId: song.id,
      artistId: song.artist_id
    }
  });
}

/**
 * Send a tip to an artist
 */
export async function sendTip({ artist, fan, amount, anonymous = false }: { artist: UserProfile; fan: UserProfile; amount: number; anonymous?: boolean }) {
  if (amount < 500) {
    toast.error('Minimum tip is MK 500');
    return;
  }

  return initiatePayment({
    amount,
    email: fan.email,
    first_name: fan.full_name?.split(' ')[0] || 'Fan',
    last_name: fan.full_name?.split(' ').slice(1).join(' ') || '',
    type: 'tip',
    return_url: `${APP_URL}/tip-success?artist_id=${artist.id}&tx_ref=`,
    meta: {
      userId: fan.id,
      artistId: artist.id,
      anonymous
    }
  });
}

/**
 * Start a monthly subscription to an artist
 */
export async function startFanSubscription({ artist, fan }: { artist: UserProfile; fan: UserProfile }) {
  const amount = artist.subscription_price || 500;
  
  return initiatePayment({
    amount,
    email: fan.email,
    first_name: fan.full_name?.split(' ')[0] || 'Fan',
    last_name: fan.full_name?.split(' ').slice(1).join(' ') || '',
    type: 'fan_subscription',
    return_url: `${APP_URL}/subscribe-success?artist_id=${artist.id}&tx_ref=`,
    meta: {
      userId: fan.id,
      artistId: artist.id
    }
  });
}

/**
 * Upgrade listener account to Premium or Family
 */
export async function upgradeListenerPlan({ user, plan }: { user: any; plan: string }) {
  const normalizedPlan = plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
  const amount = normalizedPlan === 'Premium' ? 750 : 3500;
  const type = normalizedPlan === 'Premium' ? 'listener_premium' : 'listener_family';

  return initiatePayment({
    amount,
    email: user.email,
    first_name: user.full_name?.split(' ')[0] || 'Listener',
    last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
    type,
    return_url: `${APP_URL}/upgrade-success?plan=${normalizedPlan}&tx_ref=`,
    meta: {
      userId: user.id,
      plan: normalizedPlan,
      payment_type: type // Explicitly add payment_type to prevent fallback string parsing issues
    }
  });
}

/**
 * Upgrade artist tier
 */
export async function upgradeArtistTier({ artist, tier }: { artist: UserProfile; tier: 'RisingStar' | 'Standard' | 'Elite' }) {
  const tierPricing: Record<string, number> = {
    'RisingStar': 8000,
    'Standard': 13000,
    'Elite': 24000
  };
  
  const amount = tierPricing[tier];
  const tierTypeMap: Record<string, string> = {
    'RisingStar': 'artist_rising_star',
    'Standard': 'artist_standard',
    'Elite': 'artist_elite'
  };
  const type = tierTypeMap[tier] as PaymentType;

  return initiatePayment({
    amount,
    email: artist.email,
    first_name: artist.full_name?.split(' ')[0] || 'Artist',
    last_name: artist.full_name?.split(' ').slice(1).join(' ') || '',
    type,
    return_url: `${APP_URL}/tier-success?tier=${tier}&tx_ref=`,
    meta: {
      userId: artist.id,
      tier,
      payment_type: type // Explicitly add payment_type for consistency and robust tier decoding
    }
  });
}

/**
 * Pay for an ad campaign
 */
export async function payForAdCampaign({ artist, plays, amount }: { artist: UserProfile; plays: number; amount: number }) {
  return initiatePayment({
    amount,
    email: artist.email,
    first_name: artist.full_name?.split(' ')[0] || 'Artist',
    last_name: artist.full_name?.split(' ').slice(1).join(' ') || '',
    type: 'artist_ad_campaign',
    return_url: `${APP_URL}/ad-success?tx_ref=`,
    meta: {
      userId: artist.id,
      plays
    }
  });
}

/**
 * Withdraw funds (Payout) via Supabase Edge Functions
 */
export async function requestPayout({ 
  amount, 
  phone, 
  network 
}: { 
  amount: number; 
  phone: string; 
  network: 'AIRTEL' | 'TNM';
}) {
  const toastId = toast.loading('Processing withdrawal...');
  
  try {
    const session = (await supabase.auth.getSession()).data.session;
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/process-payout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ amount, phone, network })
      }
    );
    
    const textToLog = await response.text();
    let data: any;
    try {
      data = JSON.parse(textToLog);
    } catch (e) {
      console.error("Payout JSON Parse Error. Raw text:", textToLog);
      throw new Error(`Server returned invalid payout response. Status: ${response.status}`);
    }

    if (!response.ok) {
      console.error("Payout Function Error:", data);
      throw new Error(data.error || data.message || 'Withdrawal failed on server');
    }
    
    toast.success(data.message || 'Withdrawal request submitted! Please wait for a moment while we verify your payout.', { id: toastId, duration: 6000 });
    return data;
  } catch (err: any) {
    console.error('Payout error:', err);
    toast.error(err.message || 'Withdrawal failed. Please check your balance and phone number.', { id: toastId });
    throw err;
  }
}

/**
 * Verify a payment by its transaction reference
 */
export async function verifyPayment(tx_ref: string) {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/verify-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ tx_ref })
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to verify payment');
    }
    
    return await response.json();
  } catch (err: any) {
    console.error('Verify payment error:', err);
    throw err;
  }
}
