import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "./theme.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "./AuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [erro, setErro] = useState("");

  // Já logado? Não faz sentido mostrar o formulário de login de novo.
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
        shouldCreateUser: false, // login não cria conta — evita cadastro sem nome por engano
      },
    });
    if (error) {
      setStatus("error");
      if (/signups not allowed|user not found/i.test(error.message)) {
        setErro("Não encontramos uma conta com esse email.");
      } else if (/rate limit/i.test(error.message)) {
        setErro("Muitos pedidos em pouco tempo. Aguarde um pouco e tente de novo.");
      } else {
        setErro("Não foi possível enviar o link. Tente novamente.");
      }
      return;
    }
    setStatus("sent");
  }

  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Entrar</h1>
        <p className="hint">Informe seu email — a gente te manda um link de acesso, sem senha.</p>

        {status === "sent" ? (
          <div className="auth-msg auth-msg-ok">Link de acesso enviado! Verifique seu email.</div>
        ) : (
          <form onSubmit={handleSubmit}>
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
              {status === "sending" ? "Enviando..." : "Entrar"}
            </button>
          </form>
        )}

        <div className="auth-switch">
          Não tem conta? <a onClick={() => navigate("/cadastro")}>Cadastre-se grátis</a>
        </div>
      </div>
    </AuthShell>
  );
}
