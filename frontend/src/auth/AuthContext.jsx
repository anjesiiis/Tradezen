import { createContext, useContext, useEffect, useState } from "react";

// O client do Supabase (~200 KB) é carregado sob demanda: a landing e a
// lista de mercados aparecem sem esperar por ele, e a sessão é verificada
// logo em seguida. As telas de conta (login, cadastro...) importam o client
// direto, então nelas ele já vem junto com a própria tela.
const carregarSupabase = () => import("../lib/supabaseClient.js").then((m) => m.supabase);

const AuthContext = createContext({ user: null, loading: true, logout: async () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    let assinatura = null;

    carregarSupabase().then((supabase) => {
      if (cancelado) return;

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
      assinatura = listener.subscription;
    });

    return () => {
      cancelado = true;
      assinatura?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    const supabase = await carregarSupabase();
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
