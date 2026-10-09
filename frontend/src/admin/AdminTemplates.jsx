import { useEffect, useRef, useState } from "react";
import { dentroDoPeriodo } from "./periodoDoPadrao.js";
import { SkeletonGraficoLinha } from "../components/Skeleton.jsx";
import AdminShell, { AdminPatternNav, AdminToast } from "./theme.jsx";
import TemplateMarkerChart from "./TemplateMarkerChart.jsx";
import ListaTemplates from "./ListaTemplates.jsx";
import { LINE_PAIRS_OCO as LINE_PAIRS, STEPS_OCO as STEPS } from "./padroesClassicos.js";
import { APIS_DE_TEMPLATE, montarDesenhoSalvo, useDesenhosSalvos, useLampadas } from "./lampadas.js";
import AtivoPicker from "./AtivoPicker.jsx";
import BotoesPeriodo from "./BotoesPeriodo.jsx";
import { useToasts } from "./toastsAdmin.js";
import { comContextoLargo } from "./contextoTemplate.js";
import { escreverModoNaUrl, lerModoDaUrl } from "./modoTemplate.js";
import { detectarPadroes, fetchAtivoCandles, templatesOcoApi, clearAdminToken } from "./adminApi";
import { iconeDoPadrao } from "../lib/iconesPadroes.js";
import { candlesGuardados, esquecerCandles, estadoDoGrafico, guardarGrafico } from "./estadoGrafico.js";
import FiltroPadroes from "./FiltroPadroes.jsx";
import { lerFiltroSalvo } from "../lib/filtroPadroes.js";
import { anotacoesParaSalvar, dataDoPrimeiroPonto, janelaDoPadrao } from "./janela.js";

const INTERVALOS = ["1d", "1wk", "60m"];
const PASSOS = STEPS.map((s) => s.key);

function Campo({ label, children }) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function AdminTemplates() {
  // Ativo, período e intervalo vêm do que a tela anterior deixou: trocar
  // de padrão não pode recomeçar do PETR4 (ver estadoGrafico.js).
  const [ticker, setTicker] = useState(() => estadoDoGrafico().ticker);
  const [periodo, setPeriodo] = useState(() => estadoDoGrafico().periodo);
  const [intervalo, setIntervalo] = useState(() => estadoDoGrafico().intervalo);
  const [candlesContexto, setCandlesContexto] = useState(() =>
    candlesGuardados(estadoDoGrafico().ticker, estadoDoGrafico().periodo, estadoDoGrafico().intervalo)
  );
  // Faixa visível (zoom e posição) — guardada e devolvida na volta
  const faixaRef = useRef(estadoDoGrafico().faixa);
  const [carregando, setCarregando] = useState(false);
  const [pontos, setPontos] = useState({});
  const [resultado, setResultado] = useState("");
  const [observacao, setObservacao] = useState("");
  // Etiquetas de texto escritas em cima do gráfico — salvas junto
  const [anotacoes, setAnotacoes] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const { avisos, mostrarToasts, fecharAviso } = useToasts();
  // id do template recém-salvo: o sidebar o destaca por uns segundos
  const [salvoAgora, setSalvoAgora] = useState(null);
  const [limpezas, setLimpezas] = useState(0);
  const [mensagem, setMensagem] = useState(null);
  const [templates, setTemplates] = useState([]);
  // 💡 dos templates já salvos deste ativo (de qualquer padrão) e o
  // desenho que a lâmpada abre — sem rótulo de ponto, como o usuário verá
  const [desenhoSalvo, setDesenhoSalvo] = useState(null);
  const [editando, setEditando] = useState(null);

  // Quais padrões já marcados ficam visíveis no gráfico (sidebar)
  const [padroesVisiveis, setPadroesVisiveis] = useState(lerFiltroSalvo);
  const lampadas = useLampadas(ticker, templates);
  const contagemPorPadrao = lampadas.reduce((acc, m) => {
    acc[m.tipo] = (acc[m.tipo] || 0) + 1;
    return acc;
  }, {});
  const marcadoresVisiveis = lampadas.filter((m) => padroesVisiveis.includes(m.tipo));
  // Os padrões ligados no sidebar aparecem DESENHADOS no gráfico, não só
  // com o emoji: enquanto se marca o próximo, dá pra ver o que já existe
  // ali do lado e seguir a lógica de confirmação.
  const desenhosVisiveis = useDesenhosSalvos(marcadoresVisiveis, candlesContexto);
  // Padrão de uma data que não está no período carregado não aparece no
  // gráfico (ver periodoDoPadrao.js): no sidebar ele fica apagado, com a
  // dica de aumentar o período, em vez de sumir sem explicação.
  const foraDaFaixa = new Set(
    lampadas.filter((m) => !dentroDoPeriodo(candlesContexto || [], m.time)).map((m) => m.id)
  );

  // ── Detecção automática no histórico do ativo ──────────────
  // Só OCO: é o único padrão que o detector automático cobre hoje. Serve
  // pra calibrar o olho — ver outros exemplos reais no mesmo ativo antes
  // de marcar o seu. Roda quando o ativo/gráfico muda, não a cada render.
  // { estado: "parado" | "procurando" | "pronto", lista }
  const [deteccao, setDeteccao] = useState({ estado: "parado", lista: [] });
  const detectados = deteccao.lista;

  useEffect(() => {
    if (!candlesContexto?.length) return;
    let vivo = true;
    detectarPadroes(ticker, periodo, intervalo)
      .then((r) => {
        if (!vivo) return;
        setDeteccao({ estado: "pronto", lista: (r.padroes || []).map((p, n) => ({
          id: `auto-${n}`,
          tipo: "oco",
          automatico: true,
          icone: iconeDoPadrao("oco"),
          dica: `OCO encontrado pelo detector · confiança ${p.confiabilidade ?? "?"}%`,
          time: Math.floor((p.pontos?.cabeca?.timestamp ?? p.intervalo_candles?.inicio_timestamp ?? 0) / 1000),
        })).filter((m) => m.time > 0) });
      })
      .catch(() => { if (vivo) setDeteccao({ estado: "pronto", lista: [] }); });
    return () => { vivo = false; };
  }, [ticker, periodo, intervalo, candlesContexto]);

  // Chegou por link com ?modo=visualizar&id=12: abre aquele template já
  // no modo pedido, em vez de cair na tela de marcação vazia.
  useEffect(() => {
    const pedido = lerModoDaUrl(window.location.search);
    if (!pedido) return;
    abrirTemplate({ id: pedido.id }, pedido.modo === "visualizar");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregarTemplates();
  }, []);

  // Clique na 💡: mostra o desenho daquele padrão no gráfico da tela.
  // Clicar de novo na mesma lâmpada fecha.
  async function abrirDesenhoSalvo(lampada) {
    if (desenhoSalvo?.chave === lampada.id) {
      setDesenhoSalvo(null);
      return;
    }
    try {
      const salvo = await APIS_DE_TEMPLATE[lampada.tipo].get(lampada.templateId);
      const desenho = montarDesenhoSalvo({
        chave: lampada.id,
        rotulo: `${lampada.rotulo} · ${salvo.ticker}${salvo.resultado ? ` · ${salvo.resultado}` : ""}`,
        tipo: lampada.tipo,
        salvo,
        candlesAtuais: candlesContexto,
      });
      if (desenho) setDesenhoSalvo(desenho);
    } catch {
      setMensagem({ tipo: "erro", texto: "Não foi possível abrir esse padrão." });
    }
  }

  async function carregarTemplates() {
    try {
      setTemplates(await templatesOcoApi.list());
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
      setPontos({});
      setAnotacoes([]);
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

  const completo = PASSOS.every((k) => pontos[k]);

  async function salvarNovo() {
    if (!completo || !candlesContexto) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const { candles, pontosAjustados, anotacoesAjustadas } = janelaDoPadrao(candlesContexto, pontos, anotacoes);
      const salvo = await templatesOcoApi.create({
        ticker: ticker.trim().toUpperCase(),
        timeframe: intervalo,
        candles,
        candles_contexto: candlesContexto,
        pontos: pontosAjustados,
        // Sem data_p1 o template fica invisível no gráfico (ver janela.js)
        data_p1: dataDoPrimeiroPonto(candlesContexto, pontos),
        resultado: resultado.trim() || null,
        observacao: observacao.trim() || null,
        anotacoes: anotacoesAjustadas,
      });
      // O gráfico FICA: mesmo ativo, mesmo período, mesmo trecho na tela.
      // Antes ele era apagado aqui (setCandlesContexto(null)) e era preciso
      // carregar tudo de novo pra marcar o próximo padrão do mesmo ativo.
      mostrarToasts(["Padrão salvo ✓"], "ok", 2500);
      setPontos({});
      setResultado("");
      setObservacao("");
      setAnotacoes([]);
      setSalvoAgora(salvo?.id ?? null);
      // Zera os pontos no gráfico sem recriá-lo (ativo, período e zoom ficam).
      setLimpezas((n) => n + 1);
      carregarTemplates();
    } catch (erro) {
      // O recado do backend vale muito mais que "erro ao salvar": é lá que
      // aparece a regra que barrou, ou a tabela que ainda não existe.
      setMensagem({ tipo: "erro", texto: erro?.message || "Erro ao salvar o template." });
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
      const completo = comContextoLargo(await templatesOcoApi.get(template.id));
      escreverModoNaUrl(readOnly ? "visualizar" : "editar", template.id);
      setEditando({
        ...completo,
        pontosEdit: completo.pontos,
        anotacoesEdit: completo.anotacoes || [],
        readOnly,
      });
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
      await templatesOcoApi.update(editando.id, {
        pontos: editando.pontosEdit,
        resultado: editando.resultado?.trim() || null,
        observacao: editando.observacao?.trim() || null,
        anotacoes: anotacoesParaSalvar(editando.anotacoesEdit),
      });
      setMensagem({ tipo: "ok", texto: "Template atualizado." });
      setEditando(null);
      escreverModoNaUrl(null);
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
      await templatesOcoApi.remove(id);
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
          <span className="admin-header-title">Admin · Templates OCO</span>
          <AdminPatternNav active="oco" />
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
              <button onClick={() => { setEditando(null); escreverModoNaUrl(null); }} className="admin-link-btn">{editando.readOnly ? "Fechar" : "Cancelar"}</button>
            </div>

            <TemplateMarkerChart
              key={`${editando.id}-${editando.readOnly}`}
              padraoMarcado={{ id: "oco", ancora: "topo_cabeca", acima: true,
                modo: editando.readOnly ? "visualizar" : "editar" }}
              enquadrarPontos={editando.readOnly}
              candles={editando.candles}
              steps={STEPS}
              linePairs={LINE_PAIRS}
              initialPontos={editando.pontos}
              onChange={(p) => setEditando((prev) => ({ ...prev, pontosEdit: p }))}
              anotacoes={editando.anotacoesEdit}
              aoMudarAnotacoes={(lista) => setEditando((prev) => ({ ...prev, anotacoesEdit: lista }))}
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

            {editando.readOnly && (
              <button
                type="button"
                className="admin-btn editar-este"
                onClick={() => {
                  escreverModoNaUrl("editar", editando.id);
                  setEditando((prev) => ({ ...prev, readOnly: false }));
                }}
              >
                Editar este padrão
              </button>
            )}

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
              <button onClick={() => carregarGrafico()} disabled={carregando || !ticker.trim()} className="admin-btn">
                Carregar gráfico
              </button>
            </div>

            {carregando && !candlesContexto && <SkeletonGraficoLinha style={{ height: 420 }} />}
            {candlesContexto && (
              <>
                {/* Gráfico + sidebar de padrões: o filtro decide quais
                    marcadores de padrão já salvo aparecem */}
                <div className="marcacao-area">
                  <div className="marcacao-grafico">
                  <TemplateMarkerChart
                    padraoMarcado={{ id: "oco", ancora: "topo_cabeca", acima: true }}
                    faixaInicial={faixaRef.current}
                    aoMudarFaixa={(faixa) => { faixaRef.current = faixa; guardarGrafico({ faixa }); }}
                    candles={candlesContexto}
                    steps={STEPS}
                    linePairs={LINE_PAIRS}
                    marcadoresExtras={[...marcadoresVisiveis, ...detectados]}
                    desenhosExtras={desenhosVisiveis}
                    desenhoSalvo={desenhoSalvo}
                    aoClicarLampada={abrirDesenhoSalvo}
                    anotacoes={anotacoes}
                    aoMudarAnotacoes={setAnotacoes}
                    limparEm={limpezas}
                    onChange={setPontos}
                  />
                  </div>
                  <FiltroPadroes
                    ligados={padroesVisiveis}
                    aoMudar={setPadroesVisiveis}
                    contagem={contagemPorPadrao}
                    salvos={lampadas}
                    destacado={salvoAgora}
                    foraDaFaixa={foraDaFaixa}
                  />
                </div>

                {candlesContexto && (
                  <p className="deteccao-aviso">
                    {deteccao.estado === "pronto"
                      ? detectados.length > 0
                        ? `${detectados.length} OCO encontrado(s) pelo detector neste histórico — aparecem apagados, pra comparar.`
                        : "O detector não encontrou nenhum OCO neste histórico."
                      : "Procurando OCOs já formados neste ativo…"}
                  </p>
                )}

                {desenhoSalvo && (
                  <div className="admin-msg admin-msg-ok" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span>Mostrando o padrão salvo: <strong>{desenhoSalvo.rotulo}</strong></span>
                    <button className="admin-link-btn" style={{ marginLeft: "auto" }} onClick={() => setDesenhoSalvo(null)}>
                      Fechar desenho
                    </button>
                  </div>
                )}

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

        <ListaTemplates
          templates={templates}
          rotulo="OCO"
          aoVisualizar={iniciarVisualizacao}
          aoEditar={iniciarEdicao}
          aoExcluir={remover}
        />
      </main>
      <AdminToast avisos={avisos} onFechar={fecharAviso} />
    </AdminShell>
  );
}
