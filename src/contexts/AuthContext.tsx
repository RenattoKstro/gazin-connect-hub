import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const MAIN_ADMIN_EMAIL = 'admin@filial359.com';
const DUEL_ADMIN_EMAIL = 'admin@filial195.com';
const DUEL_ADMIN_PASSWORD = 'admin195';

type AccessLevel = 'guest' | 'user' | 'duel_admin' | 'full_admin';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isDuelAdmin: boolean;
  accessLevel: AccessLevel;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const getAccessLevel = async (sessionUser: User | null): Promise<AccessLevel> => {
  if (!sessionUser) return 'guest';

  if (sessionUser.email === MAIN_ADMIN_EMAIL) return 'full_admin';
  if (sessionUser.email === DUEL_ADMIN_EMAIL) return 'duel_admin';

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', sessionUser.id)
    .maybeSingle();

  return profile?.role === 'admin' ? 'full_admin' : 'user';
};

const ensureDuelAdminProfileAccess = async (sessionUser: User | null) => {
  if (!sessionUser || sessionUser.email !== DUEL_ADMIN_EMAIL) return;

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('user_id', sessionUser.id);

  if (error) {
    console.error('Error granting duel admin profile access:', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('guest');
  const [isLoading, setIsLoading] = useState(true);

  const activateLocalDuelAdminSession = () => {
    const localUser = buildLocalDuelAdminUser();
    const localSession = buildLocalDuelAdminSession();
    persistLocalDuelAdminSession();
    setUser(localUser);
    setSession(localSession);
    setAccessLevel('duel_admin');
    setIsLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          setTimeout(async () => {
            await ensureDuelAdminProfileAccess(nextSession.user);
            const nextAccessLevel = await getAccessLevel(nextSession.user);
            setAccessLevel(nextAccessLevel);
            setIsLoading(false);
          }, 0);
        } else {
          setAccessLevel('guest');
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        await ensureDuelAdminProfileAccess(existingSession.user);
        const nextAccessLevel = await getAccessLevel(existingSession.user);
        setAccessLevel(nextAccessLevel);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureDuelAdminExists = async () => {
    const { error } = await supabase.auth.signUp({
      email: DUEL_ADMIN_EMAIL,
      password: DUEL_ADMIN_PASSWORD,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (
      error &&
      !error.message.toLowerCase().includes('already registered') &&
      !error.message.toLowerCase().includes('already been registered')
    ) {
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    let { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error && email === DUEL_ADMIN_EMAIL && password === DUEL_ADMIN_PASSWORD) {
      try {
        await ensureDuelAdminExists();
        const retry = await supabase.auth.signInWithPassword({ email, password });
        error = retry.error;

        if (!retry.error && retry.data.user) {
          await ensureDuelAdminProfileAccess(retry.data.user);
        }
      } catch (signupError) {
        error = signupError;
      }
    }

    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    clearLocalDuelAdminSession();

    if (accessLevel === 'duel_admin' && user?.email === DUEL_ADMIN_EMAIL) {
      window.location.href = '/';
      return;
    }

    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/';
    }
  };

  const value = {
    user,
    session,
    isAdmin: accessLevel === 'full_admin',
    isDuelAdmin: accessLevel === 'duel_admin' || accessLevel === 'full_admin',
    accessLevel,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
