import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "./theme.jsx";
import { supabase } from "../lib/supabaseClient.js";

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [erro, setErro] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErro("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) {
      setStatus("error");
      console.error("[recuperar-senha] resetPasswordForEmail falhou:", error);
      if (/rate limit/i.test(error.message)) {
        setErro("Muitos pedidos em pouco tempo. Aguarde um pouco e tente de novo.");
      } else {
        setErro("Não foi possível enviar o email. Tente novamente.");
      }
      return;
    }
    // Mensagem de sucesso não confirma se o email existe ou não na base —
    // evita que alguém use esse formulário pra descobrir emails cadastrados.
    setStatus("sent");
  }

  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Recuperar senha</h1>
        <p className="hint">Informe seu email — se tiver uma conta, mandamos um link pra criar uma senha nova.</p>

        {status === "sent" ? (
          <div className="auth-msg auth-msg-ok">
            Se esse email tiver uma conta, enviamos um link de redefinição. Verifique sua caixa de entrada (e o spam).
          </div>
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
              {status === "sending" ? "Enviando..." : "Enviar link de recuperação"}
            </button>
          </form>
        )}

        <div className="auth-switch">
          Lembrou a senha? <a onClick={() => navigate("/login")}>Entrar</a>
        </div>
      </div>
    </AuthShell>
  );
}
