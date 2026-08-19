import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "./theme.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "./AuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [erro, setErro] = useState("");

  // Já logado? Não faz sentido mostrar o formulário de login de novo.
  // Também cobre o próprio login: signInWithPassword só atualiza a sessão
  // (via AuthContext), quem manda pra /mercados é este efeito.
  useEffect(() => {
    if (user) navigate("/mercados", { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErro("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    if (error) {
      setStatus("error");
      if (/invalid login credentials/i.test(error.message)) {
        setErro("Email ou senha incorretos.");
      } else if (/email not confirmed/i.test(error.message)) {
        setErro("Confirme seu email antes de entrar — verifique sua caixa de entrada (e o spam).");
      } else if (/rate limit/i.test(error.message)) {
        setErro("Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.");
      } else {
        setErro("Não foi possível entrar. Tente novamente.");
      }
      return;
    }
    // Sucesso: onAuthStateChange atualiza `user` no contexto, o useEffect
    // acima faz o redirect — não precisa mexer em `status` aqui.
  }

  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Entrar</h1>
        <p className="hint">Informe seu email e senha pra acessar sua conta.</p>

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
          <div className="auth-field">
            <label>Senha</label>
            <input
              className="auth-input"
              type="password"
              required
              placeholder="Sua senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
            />
          </div>
          <div style={{ textAlign: "right", marginTop: -8, marginBottom: 14 }}>
            <a onClick={() => navigate("/recuperar-senha")} style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}>
              Esqueci minha senha
            </a>
          </div>
          {status === "error" && <div className="auth-msg auth-msg-err">{erro}</div>}
          <button className="auth-btn" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="auth-switch">
          Não tem conta? <a onClick={() => navigate("/cadastro")}>Cadastre-se grátis</a>
        </div>
      </div>
    </AuthShell>
  );
}
