import { useEffect, useState } from "react";
import { SkeletonGraficoLinha } from "../components/Skeleton.jsx";
import AdminShell, { AdminPatternNav, AdminToast } from "./theme.jsx";
import TemplateMarkerChart from "./TemplateMarkerChart.jsx";
import AtivoPicker from "./AtivoPicker.jsx";
import {
  avisosDoPadrao, configDoTemplate, linhasDoPadrao, stepsDoPadrao, temFormatoPares, validarPadrao,
} from "./bandeira.js";
import { fetchAtivoCandles, clearAdminToken } from "./adminApi";

// Tela de marcação dos padrões de continuação (bandeira e flâmula, de alta
// e de baixa). As quatro são iguais na mecânica — 8 pontos em 4 pares —,
// então o que muda vem por prop: `padrao` (rótulos, cores, direção, forma)
// e `api` (endpoint/tabela daquele padrão). Sem isso seriam 4 arquivos
// quase idênticos, que é onde um conserto entra em três e esquece o quarto.
const PERIODOS = ["3mo", "6mo", "1y", "2y", "5y", "10y", "max"];
const INTERVALOS = ["1d", "1wk", "60m"];
const PADDING = 15;

// Recorta a janela em volta do padrão (com folga) — é ela que vai pro
// banco como `candles`, junto com os pontos já reindexados.
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

export default function PainelMarcacao({ padrao, api }) {
  const STEPS = stepsDoPadrao(padrao);
  const PASSOS = STEPS.map((s) => s.key);
  const desenharLinhas = (pontos) => linhasDoPadrao(pontos, padrao);

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
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    carregarTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padrao.id]);

  // Cada mensagem vira um toast próprio, some sozinho em 8s. Vermelho
  // (erro) impede salvar; amarelo (aviso) é só um "confira isso".
  function mostrarToasts(mensagens, tipo = "erro") {
    const novos = mensagens.map((texto, i) => ({ id: `${Date.now()}-${tipo}-${i}`, texto, tipo }));
    setAvisos((prev) => [...prev, ...novos]);
    novos.forEach((a) => setTimeout(() => fecharAviso(a.id), 8000));
  }

  function fecharAviso(id) {
    setAvisos((prev) => prev.filter((a) => a.id !== id));
  }

  async function carregarTemplates() {
    try {
      setTemplates(await api.list());
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
    const erros = validarPadrao(pontos, padrao);
    if (erros.length) {
      mostrarToasts(erros, "erro");
      return;
    }
    // Avisos não impedem o salvamento — só chamam atenção pra marcação
    mostrarToasts(avisosDoPadrao(pontos, padrao), "aviso");

    setSalvando(true);
    setMensagem(null);
    try {
      const { candles, pontosAjustados } = janelaDoPadrao(candlesContexto, pontos);
      await api.create({
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

  // A listagem não traz candles/pontos (respostas grandes demais derrubavam
  // o servidor — ver _COLUNAS_LISTA no backend), então busca o template
  // completo aqui, só quando o usuário abre um.
  async function abrirTemplate(template, readOnly) {
    setMensagem(null);
    try {
      const completoDoBanco = await api.get(template.id);
      setEditando({ ...completoDoBanco, pontosEdit: completoDoBanco.pontos, readOnly });
    } catch {
      setMensagem({ tipo: "erro", texto: "Não foi possível abrir este template." });
    }
  }

  async function salvarEdicao() {
    if (!editando) return;
    // Templates salvos em formatos antigos não passam pelas regras novas
    const erros = temFormatoPares(editando.pontosEdit) ? validarPadrao(editando.pontosEdit, padrao) : [];
    if (erros.length) {
      mostrarToasts(erros, "erro");
      return;
    }
    mostrarToasts(avisosDoPadrao(editando.pontosEdit, padrao), "aviso");
    setSalvando(true);
    setMensagem(null);
    try {
      await api.update(editando.id, {
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
      await api.remove(id);
      carregarTemplates();
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro ao excluir o template." });
    }
  }

  function sair() {
    clearAdminToken();
    window.location.href = "/admin/login";
  }

  const configEdicao = editando ? configDoTemplate(editando.pontos, padrao) : null;

  return (
    <AdminShell>
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="admin-logo notranslate">Trade<span>Zen</span></span>
          <span className="admin-header-title">Admin · Templates {padrao.rotulo}</span>
          <AdminPatternNav active={padrao.nav} />
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
              steps={configEdicao.steps}
              linePairs={configEdicao.linePairs}
              linhas={configEdicao.linhas}
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
                <TemplateMarkerChart
                  key={padrao.id}
                  candles={candlesContexto}
                  steps={STEPS}
                  linhas={desenharLinhas}
                  onChange={setPontos}
                />

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
                      <a className="action" onClick={() => abrirTemplate(t, true)}>Visualizar</a>
                      <a className="action" onClick={() => abrirTemplate(t, false)}>Editar</a>
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
