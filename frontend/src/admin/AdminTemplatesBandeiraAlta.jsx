import { useEffect, useState } from "react";
import { SkeletonGraficoLinha } from "../components/Skeleton.jsx";
import AdminShell, { AdminPatternNav, AdminToast } from "./theme.jsx";
import TemplateMarkerChart from "./TemplateMarkerChart.jsx";
import AtivoPicker from "./AtivoPicker.jsx";
import {
  LINE_PAIRS_LEGADO, linhasAltaPares, linhasBandeira, stepsAltaPares, stepsBandeira, stepsLegado,
  avisosAltaPares, temFormatoPares, temFormatoNovo, validarAltaPares, validarBandeira,
} from "./bandeira.js";
import { fetchAtivoCandles, templatesBandeiraAltaApi, clearAdminToken } from "./adminApi";

const PERIODOS = ["3mo", "6mo", "1y", "2y", "5y", "10y", "max"];
const INTERVALOS = ["1d", "1wk", "60m"];
const PADDING = 15;

// 6 pontos na ordem em que o padrão acontece no tempo (ver bandeira.js):
// mastro → consolidação dentro do canal → rompimento. O desenho sai de
// `linhasBandeira`: mastro, as duas linhas do canal esticadas até o
// rompimento e o alvo projetado.
const ALTA = true;

// 8 pontos em 4 pares independentes (ver PARES_ALTA em bandeira.js): cada
// par são 2 cliques e vira uma linha própria, que aparece assim que os 2
// pontos daquele par são marcados.
const STEPS = stepsAltaPares();
const PASSOS = STEPS.map((s) => s.key);

// Formatos anteriores — só pra abrir/editar o que já foi salvo antes
const STEPS_6 = stepsBandeira(ALTA);
const STEPS_LEGADO = stepsLegado();

function configDoTemplate(pontos) {
  if (temFormatoPares(pontos)) return { steps: STEPS, linhas: linhasAltaPares, linePairs: [] };
  if (temFormatoNovo(pontos)) {
    return { steps: STEPS_6, linhas: (p, candles) => linhasBandeira(p, candles, { alta: ALTA }), linePairs: [] };
  }
  return { steps: STEPS_LEGADO, linhas: undefined, linePairs: LINE_PAIRS_LEGADO };
}

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
  const [avisos, setAvisos] = useState([]);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    carregarTemplates();
  }, []);

  // Cada mensagem vira um toast próprio, some sozinho em 8s. Vermelho
  // (erro) impede salvar; amarelo (aviso) é só um "confira isso".
  function mostrarToasts(mensagens, tipo = "erro") {
    const novos = mensagens.map((texto, i) => ({ id: `${Date.now()}-${tipo}-${i}`, texto, tipo }));
    setAvisos((prev) => [...prev, ...novos]);
    novos.forEach((a) => setTimeout(() => fecharAviso(a.id), 8000));
  }

  const mostrarErros = (erros) => mostrarToasts(erros, "erro");

  function fecharAviso(id) {
    setAvisos((prev) => prev.filter((a) => a.id !== id));
  }

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
    const erros = validarAltaPares(pontos);
    if (erros.length) {
      mostrarErros(erros);
      return;
    }
    // Avisos não impedem o salvamento — só chamam atenção pra marcação
    mostrarToasts(avisosAltaPares(pontos), "aviso");
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

  // A listagem nao traz candles/pontos (respostas grandes demais derrubavam
  // o servidor — ver _COLUNAS_LISTA no backend), entao busca o template
  // completo aqui, so quando o usuario abre um.
  async function abrirTemplate(template, readOnly) {
    setMensagem(null);
    try {
      const completo = await templatesBandeiraAltaApi.get(template.id);
      setEditando({ ...completo, pontosEdit: completo.pontos, readOnly });
    } catch {
      setMensagem({ tipo: "erro", texto: "Não foi possível abrir este template." });
    }
  }

  function iniciarEdicao(template) {
    abrirTemplate(template, false);
  }

  function iniciarVisualizacao(template) {
    abrirTemplate(template, true);
  }

  async function salvarEdicao() {
    if (!editando) return;
    // Cada template é validado pelas regras do formato em que foi marcado
    const p = editando.pontosEdit;
    const erros = temFormatoPares(p)
      ? validarAltaPares(p)
      : temFormatoNovo(p)
        ? validarBandeira(p, { alta: ALTA })
        : [];
    if (erros.length) {
      mostrarErros(erros);
      return;
    }
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
          <span className="admin-logo notranslate">Trade<span>Zen</span></span>
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
              steps={configDoTemplate(editando.pontos).steps}
              linePairs={configDoTemplate(editando.pontos).linePairs}
              linhas={configDoTemplate(editando.pontos).linhas}
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
                Carregar gráfico
              </button>
            </div>

            {carregando && !candlesContexto && <SkeletonGraficoLinha style={{ height: 420 }} />}
            {candlesContexto && (
              <>
                <TemplateMarkerChart candles={candlesContexto} steps={STEPS} linhas={linhasAltaPares} onChange={setPontos} />

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

                {completo && (
                  <button onClick={salvarNovo} disabled={salvando} className="admin-btn" style={{ alignSelf: "flex-start" }}>
                    {salvando ? "Salvando..." : "Salvar Template"}
                  </button>
                )}
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

      <AdminToast avisos={avisos} onFechar={fecharAviso} />
    </AdminShell>
  );
}
