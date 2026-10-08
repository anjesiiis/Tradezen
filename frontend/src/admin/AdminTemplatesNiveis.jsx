import { useEffect, useRef, useState } from "react";
import { SkeletonGraficoLinha } from "../components/Skeleton.jsx";
import AdminShell, { AdminPatternNav } from "./theme.jsx";
import NivelMarkerChart from "./NivelMarkerChart.jsx";
import AtivoPicker from "./AtivoPicker.jsx";
import BotoesPeriodo from "./BotoesPeriodo.jsx";
import ListaTemplates from "./ListaTemplates.jsx";
import { fetchAtivoCandles, templatesNiveisApi, clearAdminToken } from "./adminApi";
import { candlesGuardados, esquecerCandles, estadoDoGrafico, guardarGrafico } from "./estadoGrafico.js";

const INTERVALOS = ["1d", "1wk", "60m"];
const PADDING = 15;

// Convenção deste projeto: resistência = verde, suporte = vermelho.
const corDoTipo = (tipo) => (tipo === "resistencia" ? "#00D68F" : "#FF4560");
const CORES_NIVEL = { suporte: corDoTipo("suporte"), resistencia: corDoTipo("resistencia") };

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
  // Ativo, período e intervalo vêm do que a tela anterior deixou: trocar
  // de padrão não pode recomeçar do PETR4 (ver estadoGrafico.js).
  const [ticker, setTicker] = useState(() => estadoDoGrafico().ticker);
  const [periodo, setPeriodo] = useState(() => estadoDoGrafico().periodo);
  const [intervalo, setIntervalo] = useState(() => estadoDoGrafico().intervalo);
  const [tipo, setTipo] = useState("suporte");
  const [candlesContexto, setCandlesContexto] = useState(() =>
    candlesGuardados(estadoDoGrafico().ticker, estadoDoGrafico().periodo, estadoDoGrafico().intervalo)
  );
  // Faixa visível (zoom e posição) — guardada e devolvida na volta
  const faixaRef = useRef(estadoDoGrafico().faixa);
  const [carregando, setCarregando] = useState(false);
  const [toquesPorGrupo, setToquesPorGrupo] = useState({ suporte: [], resistencia: [] });
  const [resultado, setResultado] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [editando, setEditando] = useState(null);
  const [marcacaoKey, setMarcacaoKey] = useState(0);

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

  async function carregarGrafico(tickerParam, periodoParam) {
    const alvo = (tickerParam ?? ticker).trim();
    // `periodoParam`: o botão de período chama já com o valor novo, antes
    // do estado atualizar
    const janela = periodoParam ?? periodo;
    if (!alvo) return;
    setCarregando(true);
    setMensagem(null);
    try {
      const data = await fetchAtivoCandles(alvo, janela, intervalo);
      setCandlesContexto(data.candles);
      // gráfico novo: guarda pra próxima tela e zera a posição antiga
      faixaRef.current = null;
      guardarGrafico({ ticker: alvo, periodo: janela, intervalo, candles: data.candles, faixa: null });
      setToquesPorGrupo({ suporte: [], resistencia: [] });
      setMarcacaoKey((k) => k + 1);
    } catch {
      setMensagem({ tipo: "erro", texto: `Não foi possível carregar candles para '${alvo}'.` });
      setCandlesContexto(null);
      esquecerCandles();
    } finally {
      setCarregando(false);
    }
  }

  function selecionarTicker(novoTicker) {
    setTicker(novoTicker);
    carregarGrafico(novoTicker);
  }

  const toquesAtivos = toquesPorGrupo[tipo] || [];
  const completo = toquesAtivos.length >= 2;

  async function salvarNovo() {
    if (!completo || !candlesContexto) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const { candles, toquesAjustados } = janelaDoPadrao(candlesContexto, toquesAtivos);
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
      const tipoLabel = tipo === "resistencia" ? "Resistência" : "Suporte";
      setMensagem({ tipo: "ok", texto: `${tipoLabel} salvo com sucesso. Gráfico continua aberto — marque o próximo nível.` });
      setToquesPorGrupo((prev) => ({ ...prev, [tipo]: [] }));
      setResultado("");
      setObservacao("");
      setMarcacaoKey((k) => k + 1);
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
      const completo = await templatesNiveisApi.get(template.id);
      setEditando({ ...completo, toquesEdit: completo.pontos?.toques || [], readOnly });
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
          <span className="admin-logo notranslate">Trade<span>Zen</span></span>
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
              <h2>{editando.readOnly ? "Visualizando" : "Editando"} #{editando.id} — {editando.ticker} · {editando.timeframe}</h2>
              <button onClick={() => setEditando(null)} className="admin-link-btn">{editando.readOnly ? "Fechar" : "Cancelar"}</button>
            </div>

            <Campo label="Tipo">
              {editando.readOnly ? (
                <span style={{ color: corDoTipo(editando.tipo), fontWeight: 600 }}>
                  {editando.tipo === "resistencia" ? "Resistência" : "Suporte"}
                </span>
              ) : (
                <TipoToggle value={editando.tipo} onChange={(t) => setEditando((prev) => ({ ...prev, tipo: t }))} />
              )}
            </Campo>

            <NivelMarkerChart
              key={`${editando.id}-${editando.readOnly}`}
              candles={editando.candles}
              cor={corDoTipo(editando.tipo)}
              initialToques={editando.toquesEdit}
              onChange={(t) => setEditando((prev) => ({ ...prev, toquesEdit: t }))}
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
                <BotoesPeriodo
                  valor={periodo}
                  desabilitado={carregando}
                  aoEscolher={(novo) => { setPeriodo(novo); carregarGrafico(undefined, novo); }}
                />
              </Campo>
              <Campo label="Intervalo">
                <select value={intervalo} onChange={(e) => setIntervalo(e.target.value)} className="admin-select">
                  {INTERVALOS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </Campo>
              <Campo label="Tipo">
                <TipoToggle value={tipo} onChange={setTipo} />
              </Campo>
              <button onClick={() => carregarGrafico()} disabled={carregando || !ticker.trim()} className="admin-btn">
                Carregar gráfico
              </button>
            </div>

            {carregando && !candlesContexto && <SkeletonGraficoLinha style={{ height: 420 }} />}
            {candlesContexto && (
              <>
                <NivelMarkerChart
                  faixaInicial={faixaRef.current}
                  aoMudarFaixa={(faixa) => { faixaRef.current = faixa; guardarGrafico({ faixa }); }}
                  key={marcacaoKey}
                  candles={candlesContexto}
                  dual
                  cores={CORES_NIVEL}
                  toquesIniciais={toquesPorGrupo}
                  grupoAtivo={tipo}
                  onChange={setToquesPorGrupo}
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

                <button onClick={salvarNovo} disabled={!completo || salvando} className="admin-btn" style={{ alignSelf: "flex-start" }}>
                  {salvando ? "Salvando..." : `Salvar ${tipo === "resistencia" ? "Resistência" : "Suporte"}`}
                </button>
              </>
            )}
          </section>
        )}

        <ListaTemplates
          templates={templates}
          rotulo="Suporte/Resistência"
          aoVisualizar={iniciarVisualizacao}
          aoEditar={iniciarEdicao}
          aoExcluir={remover}
        />
      </main>
    </AdminShell>
  );
}
