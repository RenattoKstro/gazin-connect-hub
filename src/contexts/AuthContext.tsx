import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const MAIN_ADMIN_EMAIL = 'admin@filial359.com';
const DUEL_ADMIN_EMAIL = 'admin@filial195.com';
const DUEL_ADMIN_PASSWORD = 'admin195';
const DUEL_ADMIN_SESSION_KEY = 'duel-admin-session';

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

const buildLocalDuelAdminUser = (): User => ({
  id: 'local-duel-admin',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: DUEL_ADMIN_EMAIL,
}) as User;

const buildLocalDuelAdminSession = (): Session => ({
  access_token: 'local-duel-admin-token',
  refresh_token: 'local-duel-admin-refresh',
  expires_in: 60 * 60 * 24 * 365,
  token_type: 'bearer',
  user: buildLocalDuelAdminUser(),
}) as Session;

const persistLocalDuelAdminSession = () => {
  localStorage.setItem(DUEL_ADMIN_SESSION_KEY, 'true');
};

const clearLocalDuelAdminSession = () => {
  localStorage.removeItem(DUEL_ADMIN_SESSION_KEY);
};

const hasLocalDuelAdminSession = () => localStorage.getItem(DUEL_ADMIN_SESSION_KEY) === 'true';

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
        if (nextSession?.user) {
          clearLocalDuelAdminSession();
          setSession(nextSession);
          setUser(nextSession.user);
          setTimeout(async () => {
            const nextAccessLevel = await getAccessLevel(nextSession.user);
            setAccessLevel(nextAccessLevel);
            setIsLoading(false);
          }, 0);
          return;
        }

        if (hasLocalDuelAdminSession()) {
          activateLocalDuelAdminSession();
          return;
        }

        setSession(null);
        setUser(null);
        setAccessLevel('guest');
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (existingSession?.user) {
        clearLocalDuelAdminSession();
        setSession(existingSession);
        setUser(existingSession.user);
        const nextAccessLevel = await getAccessLevel(existingSession.user);
        setAccessLevel(nextAccessLevel);
        setIsLoading(false);
        return;
      }

      if (hasLocalDuelAdminSession()) {
        activateLocalDuelAdminSession();
        return;
      }

      setSession(null);
      setUser(null);
      setAccessLevel('guest');
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (email === DUEL_ADMIN_EMAIL && password === DUEL_ADMIN_PASSWORD) {
      activateLocalDuelAdminSession();
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
