import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ujtuuvwcfosbafowsmog.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqdHV1dndjZm9zYmFmb3dzbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MTE0MzQsImV4cCI6MjA3MzI4NzQzNH0.X5zO3dgWVEIx4IiiuMlUQHPhWeNFF67IiLOn2mnlQq0" );

const AuthContext = createContext({
  user: null,
  isAdmin: false,
  signIn: async (email: string, password: string) => ({ data: null, error: null }),
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Verificar se o usuário é administrador
        const { data: userRole, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        setIsAdmin(!error && userRole?.role === "admin");
      } else {
        setIsAdmin(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      checkUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.user) {
      setUser(data.user);
      // Verificar se o usuário é administrador
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();
      setIsAdmin(!roleError && userRole?.role === "admin");
    }
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
