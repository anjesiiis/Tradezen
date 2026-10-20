import { useEffect, useMemo, useState } from "react";
import AdminShell from "./theme.jsx";
import { clearAdminToken, usuariosApi } from "./adminApi";

/**
 * TRADEZEN — ADMIN: USUÁRIOS E PLANOS
 * ===================================
 *
 * Quem se cadastrou e quem pode ver as detecções. O botão troca o plano
 * na hora: o backend grava em `profiles` com a chave secreta, porque a
 * RLS proíbe o próprio usuário de mexer no seu plano (é isso que faz o
 * premium valer algo — ver sql/017).
 *
 * Fica fora da navegação de padrões de propósito: não é marcação, e o
 * menu lateral de padrões só confundiria aqui.
 */

const ROTULO_PLANO = { free: "Free", premium: "Premium" };

function formatarData(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  // id do usuário cujo plano está sendo salvo — desabilita só aquela linha
  const [salvando, setSalvando] = useState(null);

  useEffect(() => {
    let cancelado = false;
    usuariosApi
      .list()
      .then((lista) => { if (!cancelado) setUsuarios(lista); })
      .catch((e) => { if (!cancelado) setErro(e?.message || "Não foi possível carregar os usuários."); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) =>
      (u.email || "").toLowerCase().includes(q) || (u.nome || "").toLowerCase().includes(q));
  }, [usuarios, busca]);

  const premium = usuarios.filter((u) => u.plano === "premium").length;

  async function trocarPlano(usuario) {
    const novo = usuario.plano === "premium" ? "free" : "premium";
    setSalvando(usuario.id);
    setErro("");
    try {
      await usuariosApi.mudarPlano(usuario.id, novo);
      // atualiza só a linha mexida: recarregar a lista inteira piscaria a
      // tabela e perderia a busca que o admin digitou
      setUsuarios((atuais) =>
        atuais.map((u) => (u.id === usuario.id ? { ...u, plano: novo, sem_perfil: false } : u)));
    } catch (e) {
      setErro(e?.message || "Não foi possível mudar o plano.");
    } finally {
      setSalvando(null);
    }
  }

  function sair() {
    clearAdminToken();
    window.location.href = "/admin/login";
  }

  return (
    <AdminShell>
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="admin-logo notranslate">Trade<span>Zen</span></span>
          <span className="admin-header-title">Admin · Usuários</span>
        </div>
        <a href="/admin/templates" className="admin-link-btn">Templates</a>
        <button onClick={sair} className="admin-link-btn">Sair</button>
      </div>

      <main className="admin-main">
        <section className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2>Usuários</h2>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text2)" }}>
            O plano Premium libera os padrões marcados no gráfico. Todo cadastro
            novo entra como Free.
          </p>

          <div className="usuarios-topo">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por email ou nome"
              className="admin-input"
              style={{ maxWidth: 280 }}
            />
            <span className="usuarios-contagem">
              {usuarios.length} {usuarios.length === 1 ? "usuário" : "usuários"} · {premium} premium
            </span>
          </div>

          {erro && <p className="usuarios-erro">{erro}</p>}
          {carregando && <p style={{ color: "var(--text2)", fontSize: 13 }}>Carregando…</p>}

          {!carregando && filtrados.length === 0 && (
            <p style={{ color: "var(--text2)", fontSize: 13 }}>
              {usuarios.length === 0 ? "Nenhum usuário cadastrado ainda." : "Nenhum usuário com esse email ou nome."}
            </p>
          )}

          {filtrados.length > 0 && (
            <div className="usuarios-lista">
              {filtrados.map((u) => (
                <div key={u.id} className="usuarios-linha">
                  <span className="usuarios-quem">
                    <strong>{u.email || "(sem email)"}</strong>
                    <span>{u.nome || "sem nome"} · cadastro {formatarData(u.criado_em)}</span>
                  </span>
                  <span className={`usuarios-plano ${u.plano}`}>{ROTULO_PLANO[u.plano] || u.plano}</span>
                  <button
                    type="button"
                    className={`admin-btn-pequeno${u.plano === "premium" ? " secundario" : ""}`}
                    onClick={() => trocarPlano(u)}
                    disabled={salvando === u.id}
                    title={u.plano === "premium" ? "Voltar para Free" : "Liberar Premium"}
                  >
                    {salvando === u.id ? "Salvando…" : u.plano === "premium" ? "Tornar Free" : "Tornar Premium"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </AdminShell>
  );
}
