import { useEffect, useState } from "react";
import AdminShell from "./theme.jsx";
import { setAdminToken } from "./adminApi";

export default function AdminCallback() {
  const [erro, setErro] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
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
    window.location.replace("/admin/templates");
  }, []);

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
