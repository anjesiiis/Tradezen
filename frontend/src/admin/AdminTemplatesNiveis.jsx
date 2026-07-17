import { useEffect, useState } from "react";
import AdminShell, { AdminPatternNav } from "./theme.jsx";
import NivelMarkerChart from "./NivelMarkerChart.jsx";
import AtivoPicker from "./AtivoPicker.jsx";
import { fetchAtivoCandles, templatesNiveisApi, clearAdminToken } from "./adminApi";

const PERIODOS = ["3mo", "6mo", "1y", "2y", "5y", "10y", "max"];
const INTERVALOS = ["1d", "1wk", "60m"];
const PADDING = 15;

// Convenção deste projeto: resistência = verde, suporte = vermelho.
const corDoTipo = (tipo) => (tipo === "resistencia" ? "#00D68F" : "#FF4560");

function janelaDoPadrao(candlesContexto, toques) {
  const indices = toques.map((t) => t.i);
  const minIdx = Math.max(0, Math.min(...indices) - PADDING);
  const maxIdx = Math.min(candlesContexto.length - 1, Math.max(...indices) + PADDING);
  const candles = candlesContexto.slice(minIdx, maxIdx + 1);
  const toquesAjustados = toques.map((t) => ({ i: t.i - minIdx, preco: t.preco }));
  return { candles, toquesAjustados };
}

function Campo({ label, children }) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function TipoToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {["suporte", "resistencia"].map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className="admin-chip"
          style={
            value === t
              ? { borderColor: corDoTipo(t), color: corDoTipo(t), background: "rgba(255,255,255,.06)" }
              : undefined
          }
        >
          {t === "suporte" ? "Suporte" : "Resistência"}
        </button>
      ))}
    </div>
  );
}

export default function AdminTemplatesNiveis() {
  const [ticker, setTicker] = useState("PETR4.SA");
  const [periodo, setPeriodo] = useState("1y");
  const [intervalo, setIntervalo] = useState("1d");
  const [tipo, setTipo] = useState("suporte");
  const [candlesContexto, setCandlesContexto] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [toques, setToques] = useState([]);
  const [resultado, setResultado] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    carregarTemplates();
  }, []);

  async function carregarTemplates() {
    try {
      setTemplates(await templatesNiveisApi.list());
    } catch {
      setMensagem({ tipo: "erro", texto: "Não foi possível carregar os templates." });
    }
  }

  async function carregarGrafico() {
    setCarregando(true);
    setMensagem(null);
    try {
      const data = await fetchAtivoCandles(ticker.trim(), periodo, intervalo);
      setCandlesContexto(data.candles);
      setToques([]);
    } catch {
      setMensagem({ tipo: "erro", texto: `Não foi possível carregar candles para '${ticker}'.` });
      setCandlesContexto(null);
    } finally {
      setCarregando(false);
    }
  }

  const completo = toques.length >= 2;

  async function salvarNovo() {
    if (!completo || !candlesContexto) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const { candles, toquesAjustados } = janelaDoPadrao(candlesContexto, toques);
      await templatesNiveisApi.create({
        ticker: ticker.trim().toUpperCase(),
        timeframe: intervalo,
        tipo,
        candles,
        candles_contexto: candlesContexto,
        pontos: { toques: toquesAjustados },
        resultado: resultado.trim() || null,
        observacao: observacao.trim() || null,
      });
      setMensagem({ tipo: "ok", texto: "Template salvo com sucesso." });
      setCandlesContexto(null);
      setToques([]);
      setResultado("");
      setObservacao("");
      carregarTemplates();
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro ao salvar o template." });
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(template) {
    setEditando({ ...template, toquesEdit: template.pontos?.toques || [] });
    setMensagem(null);
  }

  async function salvarEdicao() {
    if (!editando) return;
    setSalvando(true);
    setMensagem(null);
    try {
      await templatesNiveisApi.update(editando.id, {
        tipo: editando.tipo,
        pontos: { toques: editando.toquesEdit },
        resultado: editando.resultado?.trim() || null,
        observacao: editando.observacao?.trim() || null,
      });
      setMensagem({ tipo: "ok", texto: "Template atualizado." });
      setEditando(null);
      carregarTemplates();
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro ao atualizar o template." });
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id) {
    if (!window.confirm("Excluir este template?")) return;
    try {
      await templatesNiveisApi.remove(id);
      carregarTemplates();
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro ao excluir o template." });
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
          <span className="admin-logo">Trade<span>Up</span></span>
          <span className="admin-header-title">Admin · Templates Suporte/Resistência</span>
          <AdminPatternNav active="niveis" />
        </div>
        <button onClick={sair} className="admin-link-btn">Sair</button>
      </div>

      <main className="admin-main">
        {mensagem && (
          <div className={`admin-msg ${mensagem.tipo === "ok" ? "admin-msg-ok" : "admin-msg-err"}`}>
            {mensagem.texto}
          </div>
        )}

        {editando ? (
          <section className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2>Editando #{editando.id} — {editando.ticker} · {editando.timeframe}</h2>
              <button onClick={() => setEditando(null)} className="admin-link-btn">Cancelar</button>
            </div>

            <Campo label="Tipo">
              <TipoToggle value={editando.tipo} onChange={(t) => setEditando((prev) => ({ ...prev, tipo: t }))} />
            </Campo>

            <NivelMarkerChart
              candles={editando.candles}
              cor={corDoTipo(editando.tipo)}
              initialToques={editando.toquesEdit}
              onChange={(t) => setEditando((prev) => ({ ...prev, toquesEdit: t }))}
            />

            <div className="admin-grid2">
              <Campo label="Resultado">
                <input
                  placeholder="ex: sucesso, falha"
                  defaultValue={editando.resultado || ""}
                  onChange={(e) => setEditando((prev) => ({ ...prev, resultado: e.target.value }))}
                  className="admin-input"
                />
              </Campo>
              <Campo label="Observação">
                <input
                  placeholder="anotações sobre o template"
                  defaultValue={editando.observacao || ""}
                  onChange={(e) => setEditando((prev) => ({ ...prev, observacao: e.target.value }))}
                  className="admin-input"
                />
              </Campo>
            </div>

            <button onClick={salvarEdicao} disabled={salvando} className="admin-btn" style={{ alignSelf: "flex-start" }}>
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
          </section>
        ) : (
          <section className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2>Nova marcação</h2>

            <div className="admin-row">
              <Campo label="Ticker">
                <div style={{ width: 260 }}><AtivoPicker value={ticker} onChange={setTicker} /></div>
              </Campo>
              <Campo label="Período">
                <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="admin-select">
                  {PERIODOS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Campo>
              <Campo label="Intervalo">
                <select value={intervalo} onChange={(e) => setIntervalo(e.target.value)} className="admin-select">
                  {INTERVALOS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </Campo>
              <Campo label="Tipo">
                <TipoToggle value={tipo} onChange={setTipo} />
              </Campo>
              <button onClick={carregarGrafico} disabled={carregando || !ticker.trim()} className="admin-btn">
                {carregando ? "Carregando..." : "Carregar gráfico"}
              </button>
            </div>

            {candlesContexto && (
              <>
                <NivelMarkerChart candles={candlesContexto} cor={corDoTipo(tipo)} onChange={setToques} />

                <div className="admin-grid2">
                  <Campo label="Resultado">
                    <input
                      placeholder="ex: sucesso, falha"
                      value={resultado}
                      onChange={(e) => setResultado(e.target.value)}
                      className="admin-input"
                    />
                  </Campo>
                  <Campo label="Observação">
                    <input
                      placeholder="anotações sobre o template"
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      className="admin-input"
                    />
                  </Campo>
                </div>

                <button onClick={salvarNovo} disabled={!completo || salvando} className="admin-btn" style={{ alignSelf: "flex-start" }}>
                  {salvando ? "Salvando..." : "Salvar template"}
                </button>
              </>
            )}
          </section>
        )}

        <section className="admin-card" style={{ padding: 0 }}>
          <h2 style={{ padding: "16px 16px 12px" }}>Templates salvos ({templates.length})</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Ticker</th>
                  <th>Timeframe</th>
                  <th>Resultado</th>
                  <th>Criado em</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td style={{ color: corDoTipo(t.tipo) }}>{t.tipo === "resistencia" ? "Resistência" : "Suporte"}</td>
                    <td>{t.ticker}</td>
                    <td>{t.timeframe}</td>
                    <td>{t.resultado || "—"}</td>
                    <td className="muted">{new Date(t.criado_em).toLocaleString("pt-BR")}</td>
                    <td style={{ textAlign: "right" }}>
                      <a className="action" onClick={() => iniciarEdicao(t)}>Editar</a>
                      <a className="action danger" onClick={() => remover(t.id)}>Excluir</a>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text2)", padding: 24 }}>Nenhum template ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
