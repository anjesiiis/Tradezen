import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "./theme.jsx";
import { supabase } from "../lib/supabaseClient.js";

// Pra onde o link do email de "recuperar senha" manda o usuário. Igual o
// AuthCallback, o supabase-js já processa o token do fragmento da URL
// sozinho (detectSessionInUrl vem ligado por padrão) — aqui só esperamos a
// sessão de recuperação aparecer pra liberar o formulário de senha nova.
export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [erroLink, setErroLink] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [erro, setErro] = useState("");

  useEffect(() => {
    let resolvido = false;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !resolvido) { resolvido = true; setPronto(true); }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || session) && !resolvido) {
        resolvido = true;
        setPronto(true);
      }
    });

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const erroDescricao = hash.get("error_description");
    if (erroDescricao) setErroLink(decodeURIComponent(erroDescricao.replace(/\+/g, " ")));

    const timeout = setTimeout(() => {
      if (!resolvido) setErroLink(prev => prev || "Link inválido ou expirado. Peça um novo link de recuperação.");
    }, 6000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (senha !== confirmarSenha) {
      setStatus("error");
      setErro("As senhas não coincidem.");
      return;
    }
    setStatus("sending");
    setErro("");
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setStatus("error");
      console.error("[redefinir-senha] updateUser falhou:", error);
      if (/password/i.test(error.message)) {
        setErro("A senha precisa ter pelo menos 8 caracteres.");
      } else {
        setErro("Não foi possível trocar a senha. Tente novamente.");
      }
      return;
    }
    setStatus("done");
  }

  if (erroLink) {
    return (
      <AuthShell>
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1>Ops</h1>
          <p className="hint">{erroLink}</p>
          <button className="auth-btn" onClick={() => navigate("/recuperar-senha")}>Pedir novo link</button>
        </div>
      </AuthShell>
    );
  }

  if (status === "done") {
    return (
      <AuthShell>
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1>Senha alterada!</h1>
          <p className="hint">Sua senha foi trocada com sucesso.</p>
          <button className="auth-btn" onClick={() => navigate("/mercados")}>Ir pro TradeZen</button>
        </div>
      </AuthShell>
    );
  }

  if (!pronto) {
    return (
      <AuthShell>
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1>Confirmando o link...</h1>
          <p className="hint">Só um instante.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Nova senha</h1>
        <p className="hint">Escolha uma senha nova pra sua conta.</p>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Nova senha</label>
            <input
              className="auth-input"
              type="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              value={senha}
              onChange={e => setSenha(e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label>Confirmar nova senha</label>
            <input
              className="auth-input"
              type="password"
              required
              minLength={8}
              placeholder="Repita a senha"
              value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
            />
          </div>
          {status === "error" && <div className="auth-msg auth-msg-err">{erro}</div>}
          <button className="auth-btn" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
