import { useEffect, useState } from "react";
import { SkeletonPagina } from "../components/Skeleton.jsx";
import AdminShell from "./theme.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { setAdminToken } from "./adminApi";

// `hashInicial` / `queryInicial`: hash e query da URL capturados no
// carregamento do módulo (ver App.jsx). São necessários porque o client do
// Supabase limpa a URL sozinho ao inicializar (detectSessionInUrl) — se
// lermos tarde demais, o token já sumiu. Sem os props, cai no
// comportamento antigo (ler a URL na hora).
export default function AdminCallback({ hashInicial, queryInicial }) {
  const [erro, setErro] = useState("");

  useEffect(() => {
    const noHash = new URLSearchParams((hashInicial || window.location.hash).replace(/^#/, ""));
    const naQuery = new URLSearchParams(queryInicial || window.location.search);
    const ler = (nome) => noHash.get(nome) || naQuery.get(nome);

    // Link expirado ou já usado: o Supabase devolve error/error_code em vez
    // do token. Antes isso caía na página inicial do site sem mensagem.
    const codigo = ler("error_code") || ler("error");
    const descricao = ler("error_description");
    if (codigo || descricao) {
      const texto = decodeURIComponent(`${codigo || ""} ${descricao || ""}`.replace(/\+/g, " "));
      setErro(/expired|invalid|denied/i.test(texto)
        ? "Esse link de acesso expirou ou já foi usado."
        : texto.trim());
      return;
    }

    const accessToken = ler("access_token");
    if (!accessToken) {
      // Inclui o formato ?code= (PKCE), que não traz o token direto: não dá
      // pra concluir o acesso por aqui, pedir outro link resolve.
      setErro("Não foi possível concluir o acesso por esse link.");
      return;
    }

    setAdminToken(accessToken);

    // Gravar a SESSÃO (não só o token) antes de sair da página. O
    // access_token do magic link vale 1 hora e não se renova sozinho;
    // quem renova é a sessão, que precisa do refresh_token. Antes a gente
    // saía daqui com window.location.replace imediato, e a gravação que o
    // próprio client faz ao ler a URL podia nem terminar — passada a hora,
    // trocar de padrão no painel caía na tela de email.
    const refreshToken = ler("refresh_token");
    const irPraTemplates = () => window.location.replace("/admin/templates/topo-duplo");

    if (!refreshToken) { irPraTemplates(); return; }
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .catch(() => {})            // sem sessão ainda dá pra entrar: o token vale 1h
      .finally(irPraTemplates);
  }, [hashInicial, queryInicial]);

  if (!erro) return <SkeletonPagina />;

  return (
    <AdminShell>
      <div className="admin-center">
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--down)", fontSize: 13, marginBottom: 14 }}>{erro}</p>
          <a href="/admin/login" className="admin-btn" style={{ textDecoration: "none" }}>
            Pedir novo link de acesso
          </a>
        </div>
      </div>
    </AdminShell>
  );
}
