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
  const [senha, setSenha] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (user) navigate("/mercados", { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErro("");
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: senha,
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
      // Loga o erro real do Supabase no console — a mensagem que a gente
      // mostra na tela é sempre resumida/traduzida, então sem isso não dá
      // pra diagnosticar um erro que ainda não bateu em nenhum dos casos
      // abaixo (ex: trigger do banco falhando por falta da tabela
      // `usuarios` — ver backend/sql/003_criar_usuarios.sql).
      console.error("[cadastro] signUp falhou:", error);
      if (/already registered|already exists/i.test(error.message)) {
        setErro("Esse email já tem uma conta. Tente entrar.");
      } else if (/rate limit/i.test(error.message)) {
        setErro("Muitos pedidos em pouco tempo. Aguarde um pouco e tente de novo.");
      } else if (/password/i.test(error.message)) {
        setErro("A senha precisa ter pelo menos 8 caracteres.");
      } else if (/database error|unexpected_failure|saving new user/i.test(error.message)) {
        setErro("Erro ao salvar o cadastro no banco. Verifique se a tabela \"usuarios\" e o trigger foram criados no Supabase (backend/sql/003_criar_usuarios.sql).");
      } else {
        setErro(`Não foi possível criar a conta: ${error.message}`);
      }
      return;
    }
    setStatus("sent");
  }

  return (
    <AuthShell>
      <div className="auth-card">
        <h1>Criar conta</h1>
        <p className="hint">Depois de confirmar o email, sua conta já fica pronta pra usar.</p>

        {status === "sent" ? (
          <div className="auth-msg auth-msg-ok">
            Enviamos um email de confirmação! Verifique sua caixa de entrada (e o spam) e clique no link pra ativar sua conta.
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
            <div className="auth-field">
              <label>Senha</label>
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
