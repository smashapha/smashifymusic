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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setRole(null);
        setArtistProfile(null);
        setListenerProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // STRATEGY: Check 'profiles' (artist table) first, then 'user_profiles' (listener table)
      // Whichever has a row for this user determines their role.

      // 1. Check if they are an artist (row in 'profiles')
      const { data: artistData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // maybeSingle returns null instead of error if no row found

      if (artistData) {
        // Check if they are approved or still pending
        if (artistData.approved === false) {
          setRole('pending');
        } else {
          setRole('artist');
        }
        setArtistProfile({ ...artistData, user_type: 'artist' });
        setListenerProfile(null);
        setLoading(false);
        return;
      }

      // 2. If not in 'profiles', check 'user_profiles' (listener table)
      const { data: listenerData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (listenerData) {
        setRole('listener');
        setListenerProfile({ ...listenerData, user_type: 'listener' });
        setArtistProfile(null);
        setLoading(false);
        return;
      }

      // 3. Neither table has a row — user just signed up, profile not created yet
      // Check auth metadata for a hint
      const { data: { user } } = await supabase.auth.getUser();
      const metaRole = user?.user_metadata?.role;
      if (metaRole === 'pending') setRole('pending');
      else setRole(null);

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
    if (user) await fetchProfile(user.id);
  };

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

