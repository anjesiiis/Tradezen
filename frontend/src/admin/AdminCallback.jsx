import { useEffect, useState } from "react";
import AdminShell from "./theme.jsx";
import { setAdminToken } from "./adminApi";

// `hashInicial`: o hash da URL capturado no carregamento do módulo (ver
// HASH_INICIAL em App.jsx). É preciso porque o client do Supabase limpa o
// hash da URL sozinho ao inicializar (detectSessionInUrl) — se lermos
// window.location.hash tarde demais, o token já sumiu. Sem o prop, cai no
// comportamento antigo (ler a URL na hora).
export default function AdminCallback({ hashInicial }) {
  const [erro, setErro] = useState("");

  useEffect(() => {
    const bruto = hashInicial || window.location.hash;
    const hash = new URLSearchParams(bruto.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const errorDescription = hash.get("error_description");

    if (errorDescription) {
      setErro(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
      return;
    }
    if (!accessToken) {
      setErro("Link inválido ou expirado.");
      return;
    }

    setAdminToken(accessToken);
    window.location.replace("/admin/templates/topo-duplo");
  }, [hashInicial]);

  return (
    <AdminShell>
      <div className="admin-center">
        {erro ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--down)", fontSize: 13, marginBottom: 10 }}>{erro}</p>
            <a href="/admin/login" style={{ color: "var(--accent)", fontSize: 13 }}>
              Voltar ao login
            </a>
          </div>
        ) : (
          <p style={{ color: "var(--text2)", fontSize: 13 }}>Autenticando...</p>
        )}
      </div>
    </AdminShell>
  );
}
