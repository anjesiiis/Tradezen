import { useEffect, useState } from "react";
import AdminShell from "./theme.jsx";
import { requestMagicLink } from "./adminApi";

const COOLDOWN_SEGUNDOS = 60;

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [erro, setErro] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErro("");
    try {
      await requestMagicLink(email.trim().toLowerCase());
      setStatus("sent");
      setCooldown(COOLDOWN_SEGUNDOS);
    } catch (err) {
      setStatus("error");
      if (err.status === 403) {
        setErro("Este email não tem acesso ao painel admin.");
      } else if (err.status === 429) {
        setErro(err.data?.detail || "Muitos links pedidos em pouco tempo. Aguarde e tente de novo.");
        setCooldown(COOLDOWN_SEGUNDOS);
      } else if (err.data?.detail) {
        setErro(err.data.detail);
      } else {
        setErro("Não foi possível enviar o link. Tente novamente.");
      }
    }
  }

  const bloqueado = status === "sending" || cooldown > 0;

  return (
    <AdminShell>
      <div className="admin-center">
        <div className="admin-card" style={{ width: "100%", maxWidth: 360 }}>
          <h1>Admin</h1>
          <p className="hint">Acesso restrito. Informe seu email para receber o link de acesso.</p>

          {status === "sent" && (
            <div className="admin-msg admin-msg-ok" style={{ marginBottom: 14 }}>
              Link enviado para <strong>{email}</strong>. Abra o email e clique no link para entrar.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-input"
            />
            <button type="submit" disabled={bloqueado} className="admin-btn">
              {status === "sending"
                ? "Enviando..."
                : cooldown > 0
                ? `Aguarde ${cooldown}s para reenviar`
                : status === "sent"
                ? "Reenviar link"
                : "Enviar link de acesso"}
            </button>
            {status === "error" && <div className="admin-msg admin-msg-err">{erro}</div>}
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
