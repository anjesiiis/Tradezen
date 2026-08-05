import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "./theme.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "./AuthContext.jsx";

export default function Cadastro() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (user) navigate("/mercados", { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErro("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Vai pro raw_user_meta_data do auth.users; o trigger
        // criar_usuario_no_cadastro() (backend/sql/003_criar_usuarios.sql)
        // copia daqui pra usuarios.nome quando a conta é criada.
        data: { nome: nome.trim() },
      },
    });
    if (error) {
      setStatus("error");
      setErro(/rate limit/i.test(error.message)
        ? "Muitos pedidos em pouco tempo. Aguarde um pouco e tente de novo."
        : "Não foi possível enviar o link. Tente novamente.");
      return;
    }
    setStatus("sent");
  }

  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Criar conta</h1>
        <p className="hint">Sem senha — a gente confirma seu email com um link de acesso.</p>

        {status === "sent" ? (
          <div className="auth-msg auth-msg-ok">
            Enviamos um link de acesso pro seu email! Verifique sua caixa de entrada (e o spam).
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Nome completo</label>
              <input
                className="auth-input"
                type="text"
                required
                placeholder="Seu nome"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label>Email</label>
              <input
                className="auth-input"
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            {status === "error" && <div className="auth-msg auth-msg-err">{erro}</div>}
            <button className="auth-btn" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Enviando..." : "Criar conta grátis"}
            </button>
          </form>
        )}

        <div className="auth-switch">
          Já tem conta? <a onClick={() => navigate("/login")}>Entrar</a>
        </div>
      </div>
    </AuthShell>
  );
}
