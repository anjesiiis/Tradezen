import { createContext, useContext, useEffect, useState } from "react";
import { API } from "../lib/api.js";

// O client do Supabase (~200 KB) é carregado sob demanda: a landing e a
// lista de mercados aparecem sem esperar por ele, e a sessão é verificada
// logo em seguida. As telas de conta (login, cadastro...) importam o client
// direto, então nelas ele já vem junto com a própria tela.
const carregarSupabase = () => import("../lib/supabaseClient.js").then((m) => m.supabase);

const AuthContext = createContext({
  user: null, plano: "free", isAdmin: false, temAcesso: false, loading: true, logout: async () => {},
});

// Quem é esse usuário pro backend: o plano e se o email está na lista de
// admins. O plano também está em `profiles` (o usuário lê a própria
// linha), mas a lista de admins vive só no servidor — então as duas
// respostas vêm do mesmo lugar, e com o mesmo token.
//
// Falha de rede não derruba a sessão: cai pra free, que é o padrão seguro
// (o backend decide o acesso de verdade, isto aqui é só o que a tela mostra).
async function buscarPlano(token) {
  if (!token) return { plano: "free", admin: false, acesso: false };
  try {
    const r = await fetch(`${API}/eu`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return { plano: "free", admin: false, acesso: false };
    const d = await r.json();
    return { plano: d.plano || "free", admin: Boolean(d.admin), acesso: Boolean(d.acesso) };
  } catch {
    return { plano: "free", admin: false, acesso: false };
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [plano, setPlano] = useState("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [temAcesso, setTemAcesso] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    let assinatura = null;

    carregarSupabase().then((supabase) => {
      if (cancelado) return;

      const aplicarSessao = async (sessao) => {
        if (cancelado) return;
        setUser(sessao?.user ?? null);
        setLoading(false);
        // o plano chega depois da sessão, sem segurar a tela
        const { plano: p, admin, acesso } = await buscarPlano(sessao?.access_token);
        if (cancelado) return;
        setPlano(p);
        setIsAdmin(admin);
        setTemAcesso(acesso);
      };

      supabase.auth.getSession().then(({ data }) => aplicarSessao(data.session));

      // Cobre login (novo access_token no callback), logout, e refresh de
      // token — mantém `user` sempre igual à sessão real do Supabase.
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        aplicarSessao(session);
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
    <AuthContext.Provider value={{ user, plano, isAdmin, temAcesso, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
