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

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

/**
 * Common function to initiate payment via Edge Function
 */
export async function initiatePayment(params: InitiatePaymentParams) {
  const toastId = toast.loading('Initializing secure payment...');
  
  try {
    const tx_ref = `SMASH-${params.type.toUpperCase()}-${params.meta.userId || 'anon'}-${Date.now()}`;
    
    const { data, error } = await supabase.functions.invoke('create-payment', {
      body: {
        ...params,
        tx_ref,
        currency: 'MWK',
        callback_url: `${APP_URL}/api/paychangu-webhook`,
      }
    });

    if (error) throw error;
    if (!data?.checkout_url) throw new Error('Failed to get checkout URL');

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
    return_url: `${APP_URL}/purchase-success?song_id=${song.id}&tx_ref=`, // ref appended by PayChangu or handled by our success page
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
    return_url: `${APP_URL}/tip-success?artist_id=${artist.id}`,
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
    return_url: `${APP_URL}/subscribe-success?artist_id=${artist.id}`,
    meta: {
      userId: fan.id,
      artistId: artist.id
    }
  });
}

/**
 * Upgrade listener account to Premium or Family
 */
export async function upgradeListenerPlan({ user, plan }: { user: UserProfile; plan: 'Premium' | 'Family' }) {
  const amount = plan === 'Premium' ? 750 : 3500;
  const type = plan === 'Premium' ? 'listener_premium' : 'listener_family';

  return initiatePayment({
    amount,
    email: user.email,
    first_name: user.full_name?.split(' ')[0] || 'Listener',
    last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
    type,
    return_url: `${APP_URL}/upgrade-success?plan=${plan}`,
    meta: {
      userId: user.id,
      plan
    }
  });
}

/**
 * Upgrade artist tier
 */
export async function upgradeArtistTier({ artist, tier }: { artist: UserProfile; tier: 'RisingStar' | 'Standard' | 'Elite' }) {
  const tierPricing: Record<string, number> = {
    'RisingStar': 15000,
    'Standard': 25000,
    'Elite': 45000
  };
  
  const amount = tierPricing[tier];
  const type = `artist_${tier.toLowerCase().replace('star', '_star')}` as PaymentType;

  return initiatePayment({
    amount,
    email: artist.email,
    first_name: artist.full_name?.split(' ')[0] || 'Artist',
    last_name: artist.full_name?.split(' ').slice(1).join(' ') || '',
    type,
    return_url: `${APP_URL}/tier-success?tier=${tier}`,
    meta: {
      userId: artist.id,
      tier
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
    return_url: `${APP_URL}/ad-success`,
    meta: {
      userId: artist.id,
      plays
    }
  });
}

/**
 * Withdraw funds (Payout)
 * This is a direct call to the process-payout function, not a checkout redirect
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
    const { data, error } = await supabase.functions.invoke('process-payout', {
      body: { amount, phone, network }
    });

    if (error) throw error;
    
    toast.success('Withdrawal successful! Funds will land in your mobile wallet shortly.', { id: toastId });
    return data;
  } catch (err: any) {
    console.error('Payout error:', err);
    toast.error(err.message || 'Withdrawal failed. Please check your balance and phone number.', { id: toastId });
    throw err;
  }
}
