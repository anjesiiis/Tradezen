import { useEffect, useState } from "react";
import AdminShell, { AdminPatternNav } from "./theme.jsx";
import TemplateMarkerChart from "./TemplateMarkerChart.jsx";
import AtivoPicker from "./AtivoPicker.jsx";
import { fetchAtivoCandles, templatesBandeiraAltaApi, clearAdminToken } from "./adminApi";

const PERIODOS = ["3mo", "6mo", "1y", "2y", "5y", "10y", "max"];
const INTERVALOS = ["1d", "1wk", "60m"];
const PADDING = 15;

// Mastro (o movimento forte que antecede a bandeira) em azul, canal de
// consolidação em verde (topo) / vermelho (fundo) — mesma cor de
// resistência/suporte no resto do app (ver _desenharNivel em App.jsx).
const STEPS = [
  { key: "mastro_inicio", label: "Início do Mastro", short: "M1", color: "#3D7EFF" },
  { key: "mastro_fim",    label: "Fim do Mastro",    short: "M2", color: "#3D7EFF" },
  { key: "topo1",         label: "Topo 1 (canal)",   short: "T1", color: "#00D68F" },
  { key: "topo2",         label: "Topo 2 (canal)",   short: "T2", color: "#00D68F" },
  { key: "fundo1",        label: "Fundo 1 (canal)",  short: "F1", color: "#FF4560" },
  { key: "fundo2",        label: "Fundo 2 (canal)",  short: "F2", color: "#FF4560" },
];
const LINE_PAIRS = [["mastro_inicio", "mastro_fim"], ["topo1", "topo2"], ["fundo1", "fundo2"]];
const PASSOS = STEPS.map((s) => s.key);

function janelaDoPadrao(candlesContexto, pontos) {
  const indices = Object.values(pontos).map((p) => p.i);
  const minIdx = Math.max(0, Math.min(...indices) - PADDING);
  const maxIdx = Math.min(candlesContexto.length - 1, Math.max(...indices) + PADDING);
  const candles = candlesContexto.slice(minIdx, maxIdx + 1);
  const pontosAjustados = Object.fromEntries(
    Object.entries(pontos).map(([k, p]) => [k, { i: p.i - minIdx, preco: p.preco }])
  );
  return { candles, pontosAjustados };
}

function Campo({ label, children }) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function AdminTemplatesBandeiraAlta() {
  const [ticker, setTicker] = useState("PETR4.SA");
  const [periodo, setPeriodo] = useState("1y");
  const [intervalo, setIntervalo] = useState("1d");
  const [candlesContexto, setCandlesContexto] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [pontos, setPontos] = useState({});
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
      setTemplates(await templatesBandeiraAltaApi.list());
    } catch {
      setMensagem({ tipo: "erro", texto: "Não foi possível carregar os templates." });
    }
  }

  async function carregarGrafico(tickerParam) {
    const alvo = (tickerParam ?? ticker).trim();
    if (!alvo) return;
    setCarregando(true);
    setMensagem(null);
    try {
      const data = await fetchAtivoCandles(alvo, periodo, intervalo);
      setCandlesContexto(data.candles);
      setPontos({});
    } catch {
      setMensagem({ tipo: "erro", texto: `Não foi possível carregar candles para '${alvo}'.` });
      setCandlesContexto(null);
    } finally {
      setCarregando(false);
    }
  }

  function selecionarTicker(novoTicker) {
    setTicker(novoTicker);
    carregarGrafico(novoTicker);
  }

  const completo = PASSOS.every((k) => pontos[k]);

  async function salvarNovo() {
    if (!completo || !candlesContexto) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const { candles, pontosAjustados } = janelaDoPadrao(candlesContexto, pontos);
      await templatesBandeiraAltaApi.create({
        ticker: ticker.trim().toUpperCase(),
        timeframe: intervalo,
        candles,
        candles_contexto: candlesContexto,
        pontos: pontosAjustados,
        resultado: resultado.trim() || null,
        observacao: observacao.trim() || null,
      });
      setMensagem({ tipo: "ok", texto: "Template salvo com sucesso." });
      setCandlesContexto(null);
      setPontos({});
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
    setEditando({ ...template, pontosEdit: template.pontos, readOnly: false });
    setMensagem(null);
  }

  function iniciarVisualizacao(template) {
    setEditando({ ...template, pontosEdit: template.pontos, readOnly: true });
    setMensagem(null);
  }

  async function salvarEdicao() {
    if (!editando) return;
    setSalvando(true);
    setMensagem(null);
    try {
      await templatesBandeiraAltaApi.update(editando.id, {
        pontos: editando.pontosEdit,
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
      await templatesBandeiraAltaApi.remove(id);
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
          <span className="admin-header-title">Admin · Templates Bandeira de Alta</span>
          <AdminPatternNav active="bandeira-alta" />
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
              <h2>{editando.readOnly ? "Visualizando" : "Editando"} #{editando.id} — {editando.ticker} · {editando.timeframe}</h2>
              <button onClick={() => setEditando(null)} className="admin-link-btn">{editando.readOnly ? "Fechar" : "Cancelar"}</button>
            </div>

            <TemplateMarkerChart
              key={`${editando.id}-${editando.readOnly}`}
              candles={editando.candles}
              steps={STEPS}
              linePairs={LINE_PAIRS}
              initialPontos={editando.pontos}
              onChange={(p) => setEditando((prev) => ({ ...prev, pontosEdit: p }))}
              readOnly={editando.readOnly}
            />

            <div className="admin-grid2">
              <Campo label="Resultado">
                <input
                  placeholder="ex: sucesso, falha"
                  defaultValue={editando.resultado || ""}
                  onChange={(e) => setEditando((prev) => ({ ...prev, resultado: e.target.value }))}
                  className="admin-input"
                  disabled={editando.readOnly}
                />
              </Campo>
              <Campo label="Observação">
                <input
                  placeholder="anotações sobre o template"
                  defaultValue={editando.observacao || ""}
                  onChange={(e) => setEditando((prev) => ({ ...prev, observacao: e.target.value }))}
                  className="admin-input"
                  disabled={editando.readOnly}
                />
              </Campo>
            </div>

            {!editando.readOnly && (
              <button onClick={salvarEdicao} disabled={salvando} className="admin-btn" style={{ alignSelf: "flex-start" }}>
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
            )}
          </section>
        ) : (
          <section className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2>Nova marcação</h2>

            <div className="admin-row">
              <Campo label="Ticker">
                <div style={{ width: 260 }}><AtivoPicker value={ticker} onChange={selecionarTicker} /></div>
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
              <button onClick={() => carregarGrafico()} disabled={carregando || !ticker.trim()} className="admin-btn">
                {carregando ? "Carregando..." : "Carregar gráfico"}
              </button>
            </div>

            {candlesContexto && (
              <>
                <TemplateMarkerChart candles={candlesContexto} steps={STEPS} linePairs={LINE_PAIRS} onChange={setPontos} />

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
                    <td>{t.ticker}</td>
                    <td>{t.timeframe}</td>
                    <td>{t.resultado || "—"}</td>
                    <td className="muted">{new Date(t.criado_em).toLocaleString("pt-BR")}</td>
                    <td style={{ textAlign: "right" }}>
                      <a className="action" onClick={() => iniciarVisualizacao(t)}>Visualizar</a>
                      <a className="action" onClick={() => iniciarEdicao(t)}>Editar</a>
                      <a className="action danger" onClick={() => remover(t.id)}>Excluir</a>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text2)", padding: 24 }}>Nenhum template ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
