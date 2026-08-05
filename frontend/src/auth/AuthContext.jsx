import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const AuthContext = createContext({ user: null, loading: true, logout: async () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelado) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Cobre login (novo access_token no callback), logout, e refresh de
    // token — mantém `user` sempre igual à sessão real do Supabase.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelado) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelado = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
