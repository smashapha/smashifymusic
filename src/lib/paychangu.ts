import { supabase } from './supabase';
import { Song, UserProfile } from '../types';
import toast from 'react-hot-toast';

declare const PaychanguCheckout: (config: any) => void;

const PUBLIC_KEY = import.meta.env.VITE_PAYCHANGU_PUBLIC_KEY;

interface BuyTrackParams {
  song: Song;
  user: UserProfile;
  onSuccess?: () => void;
  onClose?: () => void;
}

// Fixed subscription prices — not editable by user
const SUBSCRIPTION_PRICES = {
  rising_star: 15000,  // MWK/year
  standard: 25000,     // MWK/year
  elite: 45000,        // MWK/year
};

const LISTENER_SUBSCRIPTION_PRICES = {
  premium: 2500, // MWK/month
  family: 4500,  // MWK/month
};

export function subscribeArtist({
  plan,
  user,
  onSuccess,
  onClose,
}: {
  plan: 'rising_star' | 'standard' | 'elite';
  user: any;
  onSuccess?: () => void;
  onClose?: () => void;
}) {
  if (typeof PaychanguCheckout === 'undefined') {
    toast.error('Payment system unavailable. Please refresh the page.');
    return;
  }
  const amount = SUBSCRIPTION_PRICES[plan];
  if (!amount || amount <= 0) {
    toast.error('Invalid payment amount.');
    return;
  }

  const planNames = { rising_star: 'Rising Star', standard: 'Standard', elite: 'Elite/Label' };

  PaychanguCheckout({
    public_key: PUBLIC_KEY,
    tx_ref: `SUB-${plan.toUpperCase()}-${Date.now()}-${user.id}`,
    amount,               // FIXED — user cannot change this
    currency: 'MWK',
    callback_url: window.location.href, // keep on same page
    return_url: window.location.href,
    customer: {
      email: user.email,
      first_name: user.full_name?.split(' ')[0] || 'Artist',
      last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
    },
    customization: {
      title: `Smashify ${planNames[plan]} Plan`,
      description: `Annual subscription — MWK ${amount.toLocaleString()}/yr`,
    },
    onclose: onClose,
    callback: async (response: any) => {
      if (response?.status === 'successful') {
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        
        await supabase.from('profiles').upsert({
          ...user,
          id: user.id,
          subscription_tier: plan,
          subscription_ends: expiresAt.toISOString(),
          approved: true,  // subscribing auto-approves pending artists
          user_type: 'artist'
        });

        // Also update auth metadata to reflect role change if needed
        await supabase.auth.updateUser({
           data: { role: 'artist' }
        });

        await supabase.from('transactions').insert({
          artist_id: user.id,
          type: 'subscription',
          amount,
          status: 'completed',
          paychangu_ref: response.tx_ref,
          description: `${planNames[plan]} annual subscription`,
        });

        onSuccess?.();
      }
    },
  });
}

export function subscribeListener({
  plan,
  user,
  onSuccess,
  onClose,
}: {
  plan: 'premium' | 'family';
  user: any;
  onSuccess?: () => void;
  onClose?: () => void;
}) {
  if (typeof PaychanguCheckout === 'undefined') {
    toast.error('Payment system unavailable. Please refresh the page.');
    return;
  }
  const amount = LISTENER_SUBSCRIPTION_PRICES[plan];
  if (!amount || amount <= 0) {
    toast.error('Invalid payment amount.');
    return;
  }

  const planNames = { premium: 'Premium', family: 'Family' };

  PaychanguCheckout({
    public_key: PUBLIC_KEY,
    tx_ref: `SUB-${plan.toUpperCase()}-${Date.now()}-${user.id}`,
    amount,               // FIXED — user cannot change this
    currency: 'MWK',
    callback_url: window.location.href, // keep on same page
    return_url: window.location.href,
    customer: {
      email: user.email,
      first_name: user.full_name?.split(' ')[0] || 'Listener',
      last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
    },
    customization: {
      title: `Smashify ${planNames[plan]} Plan`,
      description: `Monthly subscription — MWK ${amount.toLocaleString()}/mo`,
    },
    onclose: onClose,
    callback: async (response: any) => {
      if (response?.status === 'successful') {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        
        await supabase.from('user_profiles').upsert({
          ...user,
          id: user.id,
          subscription_tier: plan,
          subscription_ends: expiresAt.toISOString(),
          user_type: 'listener'
        });

        // Ensure metadata reflects listener role
        await supabase.auth.updateUser({
           data: { role: 'listener' }
        });

        await supabase.from('transactions').insert({
          fan_id: user.id,
          type: 'subscription',
          amount,
          status: 'completed',
          paychangu_ref: response.tx_ref,
          description: `${planNames[plan]} monthly subscription`,
        });

        onSuccess?.();
      }
    },
  });
}

export function supportArtist({ artist, user, amount, onSuccess, onClose }: { artist: UserProfile, user: UserProfile, amount: number, onSuccess?: () => void, onClose?: () => void }) {
  if (typeof PaychanguCheckout === 'undefined') {
    toast.error('Payment system unavailable. Please refresh the page.');
    return;
  }
  if (!amount || amount <= 0 || amount < 500) {
    toast.error('Invalid payment amount. Minimum is 500 MWK.');
    return;
  }

  PaychanguCheckout({
    public_key: PUBLIC_KEY,
    tx_ref: 'TIP-' + Date.now() + '-' + artist.id,
    amount: amount,
    currency: 'MWK',
    callback_url: window.location.href,
    return_url: window.location.href,
    customer: {
      email: user.email,
      name: user.full_name || 'Fan',
    },
    customization: {
      title: 'Support ' + artist.stage_name,
      description: 'Support for ' + artist.stage_name,
    },
    onclose: onClose,
    callback: async (response: any) => {
      if (response?.status === 'successful') {
        try {
          const grossAmount = amount; // what the fan paid
          const platformFee = Math.round(grossAmount * 0.10); // 10% to Smashify
          const artistReceives = grossAmount - platformFee;   // 90% to artist — always

          // 1. Record the transaction with full fee breakdown
          await supabase.from('transactions').insert({
            artist_id: artist.id,
            fan_id: user.id,
            type: 'donation',
            gross_amount: grossAmount,
            platform_fee: platformFee,
            net_amount: artistReceives,
            status: 'completed',
            paychangu_ref: response.tx_ref,
            description: `Donation to ${artist.stage_name}`
          });

          // 2. Credit artist wallet immediately — 90% only, never gross
          const { error: rpcError } = await supabase.rpc('increment_wallet_balance', { 
            user_id: artist.id, 
            amount_to_add: artistReceives 
          });
          
          // 3. Fallback if RPC not set up
          if (rpcError) {
             const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', artist.id).single();
             await supabase.from('profiles').update({
               wallet_balance: (profile?.wallet_balance || 0) + artistReceives
             }).eq('id', artist.id);
          }
          onSuccess?.();
        } catch (error) {
          console.error("Donation sync failed: ", error);
        }
      }
    }
  });
}

export function buyTrack({ song, user, onSuccess, onClose }: BuyTrackParams) {
  if (typeof PaychanguCheckout === 'undefined') {
    toast.error('Payment system unavailable. Please refresh the page.');
    return;
  }
  if (!song.price || song.price <= 0) {
    toast.error('Invalid payment amount.');
    return;
  }

  PaychanguCheckout({
    public_key: PUBLIC_KEY,
    tx_ref: 'SMASH-' + Date.now() + '-' + song.id,
    amount: song.price,
    currency: 'MWK',
    callback_url: window.location.href,
    return_url: window.location.href,
    customer: {
      email: user.email,
      first_name: user.full_name?.split(' ')[0] || 'Listener',
      last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
    },
    customization: {
      title: 'Buy: ' + song.title,
      description: song.title + ' by ' + song.artist_name,
    },
    onclose: onClose,
    callback: async (response: any) => {
      if (response?.status === 'successful') {
        try {
          // Record purchase
          const { error: purchaseError } = await supabase.from('purchases').insert({
            user_id: user.id,
            song_id: song.id,
            artist_id: song.artist_id,
            amount: song.price,
            paychangu_ref: response.tx_ref
          });

          if (purchaseError) throw purchaseError;

          const grossAmount = song.price; // what the fan paid
          const platformFee = Math.round(grossAmount * 0.10); // 10% to Smashify
          const artistReceives = grossAmount - platformFee;   // 90% to artist — always

          // 1. Record the transaction with full fee breakdown
          await supabase.from('transactions').insert({
            artist_id: song.artist_id,
            fan_id: user.id,
            type: 'sale',
            gross_amount: grossAmount,
            platform_fee: platformFee,
            net_amount: artistReceives,
            status: 'completed',
            paychangu_ref: response.tx_ref,
            description: `Sale of "${song.title}"`
          });

          // 2. Credit artist wallet immediately — 90% only, never gross
          const { error: rpcError } = await supabase.rpc('increment_wallet_balance', { 
            user_id: song.artist_id, 
            amount_to_add: artistReceives 
          });
          
          // 3. Fallback if RPC not set up
          if (rpcError) {
             const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', song.artist_id).single();
             await supabase.from('profiles').update({
               wallet_balance: (profile?.wallet_balance || 0) + artistReceives
             }).eq('id', song.artist_id);
          }

          onSuccess?.();
        } catch (error) {
          console.error("Payment sync failed: ", error);
        }
      }
    }
  });
}
