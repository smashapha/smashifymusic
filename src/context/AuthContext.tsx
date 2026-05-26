import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

// Define separate profile types matching your actual tables
export interface ArtistProfile {
  id: string;
  full_name: string;
  stage_name: string;
  email?: string;
  genre?: string;
  city?: string;
  phone?: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  wallet_balance?: number;
  verified?: boolean;
  approved?: boolean;
  user_type: 'artist';
}

export interface ListenerProfile {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  subscription_tier?: string;
  user_type: 'listener';
}

export type UserRole = 'artist' | 'listener' | 'admin' | 'pending' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  artistProfile: ArtistProfile | null;
  listenerProfile: ListenerProfile | null;
  // Keep userProfile for backwards compat — points to whichever profile is active
  userProfile: any | null; // using any to avoid type errors in other files for now
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [listenerProfile, setListenerProfile] = useState<ListenerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session fetch error:", error);
        supabase.auth.signOut();
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error("Session fetch rejected:", err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);
      if (event === 'SIGNED_OUT' || !session) {
        setSession(null);
        setUser(null);
        setRole(null);
        setArtistProfile(null);
        setListenerProfile(null);
        setLoading(false);
      } else if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    // Real-time profile updates
    let profilesChannel: any = null;
    let userProfilesChannel: any = null;

    const setupProfileSubscription = (userId: string) => {
      if (profilesChannel) profilesChannel.unsubscribe();
      if (userProfilesChannel) userProfilesChannel.unsubscribe();

      profilesChannel = supabase
        .channel(`profiles-realtime-${userId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles', 
          filter: `id=eq.${userId}` 
        }, () => fetchProfile(userId))
        .subscribe();

      userProfilesChannel = supabase
        .channel(`user-profiles-realtime-${userId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'user_profiles', 
          filter: `id=eq.${userId}` 
        }, () => fetchProfile(userId))
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_profiles', 
          filter: `id=eq.${userId}` 
        }, () => fetchProfile(userId))
        .subscribe();
    };

    if (session?.user) {
      setupProfileSubscription(session.user.id);
    }

    return () => {
      subscription.unsubscribe();
      if (profilesChannel) profilesChannel.unsubscribe();
      if (userProfilesChannel) userProfilesChannel.unsubscribe();
    };
  }, [session?.user?.id]);

  const fetchProfile = async (userId: string) => {
    try {
      // 1. Get user role from metadata to decide which table to check first
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const metaRole = authUser?.user_metadata?.role;
      
      const checkListener = async () => {
        const { data: listenerData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (listenerData) {
          let currentListenerData = listenerData;
          const tier = (listenerData.subscription_tier || 'free').toLowerCase();
          console.log('Fetched listener tier:', listenerData?.subscription_tier)
          
          if (listenerData.subscription_ends && tier !== 'free') {
            const endsAt = new Date(listenerData.subscription_ends);
            const now = new Date();
            if (endsAt.getTime() < now.getTime()) {
               const { data: updatedListener } = await supabase
                 .from('user_profiles')
                 .update({ subscription_tier: 'free' })
                 .eq('id', userId)
                 .select()
                 .single();
               if (updatedListener) {
                  currentListenerData = updatedListener;
               }
            }
          }
          
          if (listenerData.is_admin || listenerData.role === 'admin') {
            setRole('admin');
          } else {
            setRole('listener');
          }
          setListenerProfile({ ...currentListenerData, user_type: 'listener' });
          setArtistProfile(null);
          return true;
        }
        return false;
      };

      const checkArtist = async () => {
        const { data: artistData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (artistData) {
          let currentArtistData = artistData;
          const tier = (artistData.subscription_tier || 'free').toLowerCase();
          console.log('Fetched artist tier:', artistData?.artist_tier)
          console.log('Fetched artist subscription_tier:', artistData?.subscription_tier)
          
          if (artistData.subscription_ends && new Date(artistData.subscription_ends) < new Date() && tier !== 'free') {
             const { data: updatedArtist } = await supabase
               .from('profiles')
               .update({ subscription_tier: 'free' })
               .eq('id', userId)
               .select()
               .single();
             if (updatedArtist) {
                currentArtistData = updatedArtist;
             }
          }
          
          if (currentArtistData.approved === false) {
            setRole('pending');
          } else {
            setRole('artist');
          }
          setArtistProfile({ ...currentArtistData, user_type: 'artist' });
          setListenerProfile(null);
          return true;
        }
        return false;
      };

      // Execution based on metaRole
      let profileFound = false;
      if (metaRole === 'artist' || metaRole === 'pending') {
        profileFound = await checkArtist();
        if (!profileFound) profileFound = await checkListener();
      } else {
        profileFound = await checkListener();
        if (!profileFound) profileFound = await checkArtist();
      }

      if (profileFound) return;

      // 3. Neither table has a row
      const intent = localStorage.getItem('smashify_auth_intent');
      
      if (metaRole === 'artist' || metaRole === 'pending' || intent === 'artist') {
          // Check if it really doesn't exist before upserting (to avoid loops)
          const { data: existing } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
          if (existing) {
             // Should have been caught by checkArtist, but just in case
             return;
          }

          const profileData: any = {
            id: userId,
            full_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'New Artist',
            stage_name: authUser?.user_metadata?.stage_name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'New Artist',
            email: authUser?.email || '',
            phone: authUser?.user_metadata?.phone || null,
            approved: false,
            user_type: 'artist',
            artist_tier: 'free',
            subscription_tier: 'free'
          };
          const { error: createError } = await supabase.from('profiles').upsert(profileData);
          if (!createError) {
             setRole('pending');
             setArtistProfile(profileData);
             localStorage.removeItem('smashify_auth_intent');
          }
      } else {
          // Check if it really doesn't exist before upserting
          const { data: existing } = await supabase.from('user_profiles').select('id').eq('id', userId).maybeSingle();
          if (existing) return;

          const { data: existingArtist } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
          let listenerTier = 'free';
          let listenerEnds: string | null = null;
          if (existingArtist && existingArtist.artist_tier && existingArtist.artist_tier.toLowerCase() !== 'free') {
             listenerTier = 'Premium';
             listenerEnds = existingArtist.subscription_ends;
          }

          const profileData: any = {
            id: userId,
            full_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'New Listener',
            email: authUser?.email || '',
            phone: authUser?.user_metadata?.phone || null,
            subscription_tier: listenerTier,
            subscription_ends: listenerEnds,
            user_type: 'listener'
          };
          const { error: createError } = await supabase.from('user_profiles').upsert(profileData);
          if (!createError) {
             setRole('listener');
             setListenerProfile(profileData);
             localStorage.removeItem('smashify_auth_intent');
          }
      }

    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setArtistProfile(null);
    setListenerProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  // userProfile points to whichever profile is active (backwards compat)
  const userProfile = artistProfile || listenerProfile;

  const value = useMemo(() => ({
    user,
    session,
    role,
    artistProfile,
    listenerProfile,
    userProfile,
    loading,
    signOut,
    refreshProfile
  }), [user, session, role, artistProfile, listenerProfile, userProfile, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

