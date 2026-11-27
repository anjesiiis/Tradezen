import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "../auth/theme.jsx";

/**
 * TRADEZEN — "EMAIL CONFIRMADO"
 * =============================
 *
 * Onde o link de confirmação do cadastro cai (ver emailRedirectTo em
 * auth/Cadastro.jsx). Centralizada, sem header nem sidebar: usa o
 * AuthShell, o mesmo das telas de login, cadastro e senha nova — assim a
 * paleta é a do projeto por construção, sem CSS novo pra sair de sincronia.
 *
 * POR QUE ELA OLHA O FRAGMENTO DA URL ANTES DE COMEMORAR
 * O mesmo link que traz o token traz também o ERRO, quando ele expirou ou
 * já foi usado (#error=access_denied&error_code=otp_expired). Uma página
 * que só desenha "Email confirmado!" mentiria justamente pra quem mais
 * precisa de instrução — alguém que demorou dois dias pra abrir o email e
 * agora não entende por que não consegue entrar. Foi por isso que o
 * AuthCallback, que recebia esse link antes, já fazia essa leitura.
 *
 * O token em si não é processado aqui: o supabase-js faz isso sozinho ao
 * subir (detectSessionInUrl, ver lib/supabaseClient.js). Esperamos a
 * sessão aparecer só pra o botão não levar o usuário pro /dashboard antes
 * de ele estar logado — lá tem RequireAuth, e sem sessão ele seria
 * devolvido pro login no instante seguinte.
 */
export default function EmailConfirmado() {
  const navigate = useNavigate();
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const descricao = hash.get("error_description");
    if (descricao) {
      setErro(decodeURIComponent(descricao.replace(/\+/g, " ")));
      return;
    }

    let resolvido = false;
    let cancelado = false;
    // Declarado ANTES do uso: o `import()` resolve num microtask, depois
    // desta linha, mas depender dessa ordem é o tipo de coisa que quebra
    // quando alguém mexe no efeito meses depois.
    let desinscrever = () => {};

    // Import dinâmico pelo mesmo motivo das rotas: o client do Supabase é
    // um chunk grande, e esta página é a primeira coisa que alguém vê
    // depois do cadastro.
    import("../lib/supabaseClient.js").then(({ supabase }) => {
      if (cancelado) return;

      const marcarPronto = () => {
        if (resolvido || cancelado) return;
        resolvido = true;
        setPronto(true);
      };

      supabase.auth.getSession().then(({ data }) => { if (data.session) marcarPronto(); });

      const { data: ouvinte } = supabase.auth.onAuthStateChange((_evento, sessao) => {
        if (sessao) marcarPronto();
      });
      desinscrever = () => ouvinte.subscription.unsubscribe();
      // Desmontou antes do import resolver: cancela agora mesmo, senão o
      // ouvinte ficaria vivo sem ninguém pra desligá-lo.
      if (cancelado) desinscrever();
    });

    return () => { cancelado = true; desinscrever(); };
  }, []);

  if (erro) {
    return (
      <AuthShell>
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1>Este link não vale mais</h1>
          <p className="hint">{erro}</p>
          <button className="auth-btn" onClick={() => navigate("/cadastro")}>
            Fazer o cadastro de novo
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="auth-card" style={{ textAlign: "center" }}>
        {/* Check desenhado em SVG, não emoji: emoji muda de cara em cada
            sistema e não aceita a cor do tema. */}
        <svg
          width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"
          style={{ display: "block", margin: "0 auto 18px" }}
        >
          <circle cx="28" cy="28" r="26" fill="none" stroke="var(--up)" strokeWidth="3" opacity="0.35" />
          <path
            d="M17 29l7.5 7.5L39 22"
            fill="none" stroke="var(--up)" strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>

        <h1>Email confirmado!</h1>
        <p className="hint">
          Seu cadastro no <span className="notranslate">TradeZen</span> foi
          confirmado com sucesso.
        </p>

        <button
          className="auth-btn"
          onClick={() => navigate("/dashboard")}
          disabled={!pronto}
        >
          {pronto ? "Acessar plataforma" : "Preparando seu acesso…"}
        </button>
      </div>
    </AuthShell>
  );
}
