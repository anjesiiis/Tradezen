import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "./theme.jsx";
import { supabase, supabaseConfigurado } from "../lib/supabaseClient.js";
import { useAuth } from "./AuthContext.jsx";
import { CRITERIOS, avaliarSenha } from "./forcaSenha.js";

export default function Cadastro() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  // Recalculado a cada tecla: a lista abaixo do campo muda enquanto a
  // pessoa digita, em vez de só reclamar depois que ela aperta o botão.
  const forca = avaliarSenha(senha);
  // A lista só aparece depois do primeiro caractere — num campo vazio ela
  // seria uma parede de exigências antes mesmo de começar.
  const mostrarForca = senha.length > 0;
  const [erro, setErro] = useState("");
  // DESMARCADO por padrão, e tem que continuar assim: consentimento que
  // vem ligado por omissão não é consentimento (LGPD art. 7º, I). Está
  // separado de tudo o mais porque marketing é base legal PRÓPRIA — o
  // telefone para alerta e suporte se apoia em legítimo interesse e não
  // precisa desta caixa.
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (user) navigate("/mercados", { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    // Sem chave configurada o Supabase responde "Invalid API key",
    // que não diz nada pro usuário. Avisa o que realmente falta.
    if (!supabaseConfigurado) {
      setStatus("error");
      setErro("Este site está sem a chave de acesso ao banco (VITE_SUPABASE_ANON_KEY). Avise o administrador — nenhum login ou cadastro funciona até isso ser configurado.");
      return;
    }
    // O botão já fica desabilitado, mas o navegador deixa enviar o
    // formulário por Enter em alguns casos — e esta é a última linha
    // antes de uma senha fraca virar conta de verdade.
    if (!forca.forte) {
      setStatus("error");
      setErro("A senha ainda não atende todos os requisitos abaixo do campo.");
      return;
    }
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
        // marketing_whatsapp viaja junto e o trigger da migration
        // 028 copia pra profiles.marketing_whatsapp, com a data.
        data: { nome: nome.trim(), marketing_whatsapp: marketing },
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
                aria-describedby="forca-da-senha"
              />
              {mostrarForca && (
                <div id="forca-da-senha" className="senha-forca">
                  <div className="senha-barra">
                    <div
                      className="senha-barra-preenchida"
                      style={{ width: `${(forca.atendidos / forca.total) * 100}%`, background: forca.cor }}
                    />
                  </div>
                  {/* aria-live: quem usa leitor de tela ouve a mudança de
                      nível sem precisar sair do campo pra conferir */}
                  <p className="senha-nivel" style={{ color: forca.cor }} aria-live="polite">
                    {forca.rotulo}
                  </p>
                  <ul className="senha-criterios">
                    {CRITERIOS.map((c) => (
                      <li key={c.id} className={forca.criterios[c.id] ? "ok" : ""}>
                        <span aria-hidden="true">{forca.criterios[c.id] ? "✓" : "○"}</span>
                        {c.rotulo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* Consentimento de marketing. NÃO bloqueia o cadastro: se
                bloqueasse, deixaria de ser livre e não valeria como
                consentimento. Fica acima do botão pra ser lido antes de
                enviar, e não depois. */}
            <label className="auth-check">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              <span>
                Aceito receber novidades e ofertas do{" "}
                <span className="notranslate">TradeZen</span> via WhatsApp.
                Posso cancelar quando quiser.
              </span>
            </label>

            <p className="auth-aviso">
              Ao criar a conta você concorda com o uso dos seus dados descrito na{" "}
              <a href="/privacidade">Política de Privacidade</a>.
            </p>

            {status === "error" && <div className="auth-msg auth-msg-err">{erro}</div>}
            <button className="auth-btn" type="submit" disabled={status === "sending" || !forca.forte}>
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
