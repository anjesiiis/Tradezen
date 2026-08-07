import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "./theme.jsx";
import { supabase } from "../lib/supabaseClient.js";

// Pra onde o Supabase manda o usuário depois de confirmar o email do
// cadastro (link "Confirm signup"). O próprio supabase-js já processa o
// token que vem no fragmento da URL (#access_token=...) sozinho ao
// inicializar o client — detectSessionInUrl vem ligado por padrão —
// então só precisamos esperar a sessão aparecer e mandar pro dashboard.
export default function AuthCallback() {
  const navigate = useNavigate();
  const [erro, setErro] = useState("");

  useEffect(() => {
    let resolvido = false;

    const irParaDashboard = () => {
      if (resolvido) return;
      resolvido = true;
      navigate("/dashboard", { replace: true });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) irParaDashboard();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) irParaDashboard();
    });

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const erroDescricao = hash.get("error_description");
    if (erroDescricao) setErro(decodeURIComponent(erroDescricao.replace(/\+/g, " ")));

    const timeout = setTimeout(() => {
      if (!resolvido) setErro(prev => prev || "Não foi possível confirmar o acesso. O link pode ter expirado.");
    }, 6000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <AuthShell>
      <div className="auth-card" style={{ textAlign: "center" }}>
        {erro ? (
          <>
            <h1>Ops</h1>
            <p className="hint">{erro}</p>
            <button className="auth-btn" onClick={() => navigate("/login")}>Voltar pro login</button>
          </>
        ) : (
          <>
            <h1>Confirmando seu acesso...</h1>
            <p className="hint">Só um instante.</p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
