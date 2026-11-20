import { useEffect, useRef, useState } from "react";
import { dentroDoPeriodo } from "./periodoDoPadrao.js";
import { dataDoPrimeiroPonto } from "./janela.js";
import { SkeletonGraficoLinha } from "../components/Skeleton.jsx";
import AdminShell, { AdminPatternNav, AdminToast } from "./theme.jsx";
import { corDoNivel } from "../lib/grafico/padroes.js";
import NivelMarkerChart from "./NivelMarkerChart.jsx";
import AtivoPicker from "./AtivoPicker.jsx";
import BotoesPeriodo from "./BotoesPeriodo.jsx";
import { useToasts } from "./toastsAdmin.js";
import FiltroPadroes from "./FiltroPadroes.jsx";
import { filtroInicial } from "../lib/filtroPadroes.js";
import { useLampadas } from "./lampadas.js";
import ListaTemplates from "./ListaTemplates.jsx";
import { fetchAtivoCandles, templatesNiveisApi, clearAdminToken } from "./adminApi";
import { candlesGuardados, esquecerCandles, estadoDoGrafico, guardarGrafico } from "./estadoGrafico.js";
import { explicarFalha, explicarFalhaAoAbrir, problemaNoTemplate, registrarFalha } from "./diagnosticoTemplate.js";
import { chaveDoAberto, useSubirAoAbrir } from "./subirAoAbrir.js";
import BarraStatusRevisao from "./BarraStatusRevisao.jsx";
import { useStatusRevisao } from "./useStatusRevisao.js";
import { useQualidade } from "./useQualidade.js";
import { qualidadeDe } from "./qualidade.js";
import { filtrar, statusDe } from "./statusRevisao.js";

const INTERVALOS = ["1d", "1wk", "60m"];
const PADDING = 15;

// Convenção deste projeto: resistência = verde, suporte = vermelho.
// A COR VEM DA FONTE ÚNICA (lib/grafico/padroes.js). Aqui havia uma
// cópia, com os mesmos valores — e durante um tempo o gráfico do USUÁRIO
// usava o inverso: suporte vermelho na marcação e verde pra quem olhava.
// Duas telas discordando sobre a mesma coisa.
const corDoTipo = (tipo) => corDoNivel(tipo);
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

/**
 * O ÚLTIMO PASSO: que tipo de zona é essa.
 *
 * Vem no fim, depois dos três pontos, por decisão do dono: escolher antes
 * obriga a decidir o que a zona é antes de vê-la desenhada.
 *
 * As cores dos botões saem de `corDoNivel`, a mesma fonte do desenho —
 * então o verde e o vermelho daqui são exatamente os que a zona vai ter.
 * Suporte é VERMELHO e resistência é VERDE neste produto, o inverso da
 * convenção de mercado.
 *
 * Esc cancela: fechar o modal NÃO apaga a zona marcada, só volta pra
 * ajustá-la. Apagar o trabalho de três cliques porque alguém apertou Esc
 * seria castigo.
 */
function ModalTipoDaZona({ aoEscolher, aoCancelar, salvando }) {
  useEffect(() => {
    const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); aoCancelar?.(); } };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoCancelar]);

  return (
    <div className="niv-modal-fundo" role="presentation" onMouseDown={aoCancelar}>
      <div
        className="niv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="niv-modal-titulo"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 id="niv-modal-titulo">Que tipo de zona é essa?</h3>
        <div className="niv-modal-tipos">
          <button
            type="button"
            disabled={salvando}
            style={{ "--niv-cor": corDoNivel("suporte") }}
            onClick={() => aoEscolher("suporte")}
          >
            <span className="niv-bola" aria-hidden="true" />
            Suporte
          </button>
          <button
            type="button"
            disabled={salvando}
            style={{ "--niv-cor": corDoNivel("resistencia") }}
            onClick={() => aoEscolher("resistencia")}
          >
            <span className="niv-bola" aria-hidden="true" />
            Resistência
          </button>
        </div>
        <button type="button" className="niv-modal-cancelar" onClick={aoCancelar} disabled={salvando}>
          {salvando ? "Salvando…" : "Cancelar"}
        </button>
      </div>
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
  // `tipo` deixou de ser escolha PRÉVIA: agora ele chega no fim, pelo
  // modal, depois dos três pontos. Fica como estado porque é ele que diz
  // a cor da zona enquanto a pessoa marca (antes da escolha, cinza) e é
  // o que vai pro banco.
  const [tipo, setTipo] = useState("suporte");
  // Os três pontos ficam num grupo só: o fluxo novo marca UMA zona por
  // vez e escolhe o tipo no fim, então não há mais dois grupos abertos.
  const GRUPO = "zona";
  // Aberto depois do terceiro ponto. Enquanto está aberto, a zona está
  // marcada e esperando o tipo — e o clique no gráfico já está travado.
  const [escolhendoTipo, setEscolhendoTipo] = useState(false);
  // Padrões já marcados neste ativo (de qualquer tipo) — viram emoji
  // O sidebar abre com só o padrão desta tela ligado (filtroPadroes.js)
  const [padroesVisiveis, setPadroesVisiveis] = useState(() => filtroInicial("niveis"));
  const [candlesContexto, setCandlesContexto] = useState(() =>
    candlesGuardados(estadoDoGrafico().ticker, estadoDoGrafico().periodo, estadoDoGrafico().intervalo)
  );
  // Faixa visível (zoom e posição) — guardada e devolvida na volta
  const faixaRef = useRef(estadoDoGrafico().faixa);
  const [carregando, setCarregando] = useState(false);
  const [toquesPorGrupo, setToquesPorGrupo] = useState({ suporte: [], resistencia: [] });
  // A faixa ajustada à mão, por tipo. Sem isto, arrastar a faixa e salvar
  // guardaria só os toques — e ao reabrir a faixa voltaria a ser o
  // intervalo deles, desfazendo o ajuste em silêncio.
  const [ajustePorGrupo, setAjustePorGrupo] = useState({});

  // Apagar os toques apaga o ajuste do mesmo tipo: faixa ajustada sem
  // toque nenhum não tem o que sustentá-la, e sobraria desenhada sobre o
  // próximo nível que a pessoa começasse a marcar.
  function esquecerAjuste(tipoAlvo) {
    setAjustePorGrupo((prev) => {
      if (!prev[tipoAlvo]) return prev;
      const { [tipoAlvo]: _fora, ...resto } = prev;
      return resto;
    });
  }
  const [resultado, setResultado] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { avisos, mostrarToasts, fecharAviso } = useToasts();
  const [salvoAgora, setSalvoAgora] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [templates, setTemplates] = useState([]);
  const lampadas = useLampadas(ticker, templates);
  const contagemPorPadrao = lampadas.reduce((acc, m) => {
    acc[m.tipo] = (acc[m.tipo] || 0) + 1;
    return acc;
  }, {});
  const marcadoresVisiveis = lampadas.filter((m) => padroesVisiveis.includes(m.tipo));
  // Padrão de uma data que não está no período carregado não aparece no
  // gráfico (ver periodoDoPadrao.js): no sidebar ele fica apagado, com a
  // dica de aumentar o período, em vez de sumir sem explicação.
  const foraDaFaixa = new Set(
    lampadas.filter((m) => !dentroDoPeriodo(candlesContexto || [], m.time)).map((m) => m.id)
  );
  const [editando, setEditando] = useState(null);
  const [marcacaoKey, setMarcacaoKey] = useState(0);
  const [limpezas, setLimpezas] = useState(0);

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

  const toquesAtivos = toquesPorGrupo[GRUPO] || [];
  // TRÊS PONTOS, e os três importam: 1 é o preço e a borda esquerda, 2 é
  // o preço oposto, 3 é a borda direita. Com menos que isso a zona não
  // tem altura ou não tem largura.
  const TOTAL_PONTOS = 3;
  const completo = toquesAtivos.length === TOTAL_PONTOS;

  // As três validações que impedem zona impossível. Elas existem porque
  // dois cliques no mesmo pixel são fáceis de dar sem perceber, e o
  // resultado seria um retângulo invisível salvo no banco.
  function motivoParaNaoSalvar() {
    if (!candlesContexto) return "Carregue o gráfico primeiro.";
    if (toquesAtivos.length < TOTAL_PONTOS) {
      const faltam = TOTAL_PONTOS - toquesAtivos.length;
      return `Faltam ${faltam} ponto${faltam > 1 ? "s" : ""} pra fechar a zona.`;
    }
    const [p1, p2, p3] = toquesAtivos;
    if (p1.preco === p2.preco) return "Zona sem altura: os pontos 1 e 2 estão no mesmo preço.";
    if (p1.i === p3.i) return "Zona sem largura: os pontos 1 e 3 estão no mesmo candle.";
    return null;
  }

  async function salvarNovo(tipoEscolhido) {
    const tipoFinal = tipoEscolhido || tipo;
    if (motivoParaNaoSalvar() || !candlesContexto) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const { candles, toquesAjustados } = janelaDoPadrao(candlesContexto, toquesAtivos);
      const salvo = await templatesNiveisApi.create({
        ticker: ticker.trim().toUpperCase(),
        timeframe: intervalo,
        tipo: tipoFinal,
        candles,
        candles_contexto: candlesContexto,
        // `faixa` só entra quando foi ajustada: nível sem ajuste continua
        // guardando exatamente o que guardava antes, e reabre igual.
        pontos: ajustePorGrupo[GRUPO]
          ? { toques: toquesAjustados, faixa: ajustePorGrupo[GRUPO] }
          : { toques: toquesAjustados },
        // Sem data_p1 o nível fica invisível no gráfico (ver janela.js)
        data_p1: dataDoPrimeiroPonto(candlesContexto, toquesAtivos),
        resultado: resultado.trim() || null,
        observacao: observacao.trim() || null,
      });
      mostrarToasts(["Padrão salvo ✓"], "ok", 2500);
      setSalvoAgora(salvo?.id ?? null);
      // o que acabou de ser salvo precisa aparecer: se o padrão estava
      // desmarcado no sidebar, ele volta ligado
      setPadroesVisiveis((atuais) => (atuais.includes("niveis") ? atuais : [...atuais, "niveis"]));
      // RESET COMPLETO, e é aqui que morava o bug de "marcar o segundo
      // S/R dá errado": sem limpar os três estados, a zona seguinte
      // nascia com o resto da anterior — pontos velhos, faixa velha, e o
      // clique travado porque o teto de 3 já estava cheio.
      setToquesPorGrupo((prev) => ({ ...prev, [GRUPO]: [] }));
      esquecerAjuste(GRUPO);
      setEscolhendoTipo(false);
      setResultado("");
      setObservacao("");
      // O gráfico FICA: mesmo ativo, mesmo período, mesmo trecho na tela.
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
      const cru = await templatesNiveisApi.get(template.id);
      const falta = problemaNoTemplate(cru);
      if(falta){
        registrarFalha("abrir template", template?.id, { message: falta, data: { template: cru } });
        setMensagem({ tipo: "erro", texto: falta });
        return;
      }
      const completo = cru;
      setEditando({
        ...completo,
        toquesEdit: completo.pontos?.toques || [],
        // A faixa ajustada volta do banco junto dos toques; sem ela, abrir
        // pra editar desfaria o ajuste na primeira gravação.
        faixaEdit: completo.pontos?.faixa || null,
        readOnly,
      });
    } catch (erro) {
      // O recado do backend é o que diz o que fazer: tabela que falta,
      // sessão vencida, linha apagada. Engolir isso aqui era o bug.
      registrarFalha("abrir template", template?.id, erro);
      setMensagem({ tipo: "erro", texto: explicarFalhaAoAbrir(erro, template?.id) });
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
        pontos: editando.faixaEdit
          ? { toques: editando.toquesEdit, faixa: editando.faixaEdit }
          : { toques: editando.toquesEdit },
        resultado: editando.resultado?.trim() || null,
        observacao: editando.observacao?.trim() || null,
      });
      // Toast flutuante de 3s em vez do banner fixo: "deu certo" é um aviso
      // de passagem, e como banner ele empurrava a lista pra baixo e ficava
      // na tela até a próxima ação. Erro continua banner, porque erro tem
      // de esperar ser lido.
      mostrarToasts(["Template atualizado."], "ok", 3000);
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

  // Em que pé está cada marcação na revisão (ver useStatusRevisao).
  // `aoFalhar` em vez de engolir: um selo que não gravou e não avisa é
  // pior que selo nenhum, porque a pessoa marca e segue adiante.
  const statusRev = useStatusRevisao("niveis", {
    aoFalhar: (erro) => setMensagem({ tipo: "erro", texto: explicarFalha(erro, "o status") }),
  });
  // Quão bom exemplo da FORMA é cada marcação (ver useQualidade). Eixo
  // separado do `resultado`, que é o desfecho: um padrão de livro que
  // não andou é qualidade alta com resultado ruim.
  const qualidadeRev = useQualidade("niveis", {
    aoFalhar: (erro) => setMensagem({ tipo: "erro", texto: explicarFalha(erro, "a qualidade") }),
  });
  // Abriu: registra que PASSOU pelos olhos, e só. Não diz "está certa" —
  // isso é clique em Visto.
  useEffect(() => { if (editando?.id != null) statusRev.registrarAbertura(editando.id); },
    [editando?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Clicar em Visualizar/Editar monta o gráfico no topo da página,
  // longe de onde o dedo estava: isto leva a pessoa até lá.
  const refDoGrafico = useSubirAoAbrir(chaveDoAberto(editando));
  return (
    <AdminShell>
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="admin-logo notranslate">Trade<span>Zen</span></span>
          <span className="admin-header-title">Admin · Templates Suporte/Resistência</span>
        </div>
        <AdminPatternNav active="niveis" />
        <button onClick={sair} className="admin-link-btn">Sair</button>
      </div>

      <main className="admin-main">
        {mensagem && (
          <div className={`admin-msg ${mensagem.tipo === "ok" ? "admin-msg-ok" : "admin-msg-err"}`}>
            {mensagem.texto}
          </div>
        )}

        {editando ? (
          <section ref={refDoGrafico} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Os três status no lugar do "Fechar" solto: o ✕ continua, no
                canto. Ver BarraStatusRevisao — é grupo de rádio e não
                caixinhas, porque os três são exclusivos entre si. */}
            <BarraStatusRevisao
              titulo={`${editando.readOnly ? "Visualizando" : "Editando"} #${editando.id} — ${editando.ticker} · ${editando.timeframe}`}
              subtitulo={editando.readOnly ? "Visualização — somente leitura." : undefined}
              status={statusDe(statusRev.mapa, editando.id)}
              aoMudar={(s) => statusRev.mudar(editando.id, s)}
              indisponivel={statusRev.indisponivel}
              motivo={statusRev.motivo}
              aoTentarDeNovo={statusRev.recarregar}
              qualidade={qualidadeDe(qualidadeRev.mapa, editando.id)}
              aoMudarQualidade={(q) => qualidadeRev.mudar(editando.id, q)}
              qualidadeIndisponivel={qualidadeRev.indisponivel}
              qualidadeMotivo={qualidadeRev.motivo}
              aoFechar={() => setEditando(null)}
            />

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
              ajustesIniciais={editando.faixaEdit}
              aoAjustarFaixa={(f) => setEditando((prev) => ({ ...prev, faixaEdit: f }))}
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
              {/* O seletor de tipo saiu daqui: ele agora é o último passo,
                  no modal que abre depois do terceiro ponto. Escolher
                  antes obrigava a decidir o que a zona é antes de vê-la
                  desenhada. */}
              <button onClick={() => carregarGrafico()} disabled={carregando || !ticker.trim()} className="admin-btn">
                Carregar gráfico
              </button>
            </div>

            {carregando && !candlesContexto && <SkeletonGraficoLinha style={{ height: 420 }} />}
            {candlesContexto && (
              <>
                <div className="marcacao-area">
                  <div className="marcacao-grafico">
                <NivelMarkerChart
                  marcadoresExtras={marcadoresVisiveis}
                  faixaInicial={faixaRef.current}
                  aoMudarFaixa={(faixa) => { faixaRef.current = faixa; guardarGrafico({ faixa }); }}
                  key={marcacaoKey}
                  candles={candlesContexto}
                  dual
                  cores={CORES_NIVEL}
                  toquesIniciais={toquesPorGrupo}
                  grupoAtivo={GRUPO}
                  limparEm={limpezas}
                  onChange={setToquesPorGrupo}
                  ajustesIniciais={ajustePorGrupo}
                  aoAjustarFaixa={setAjustePorGrupo}
                  maxToques={TOTAL_PONTOS}
                  aoCompletar={() => setEscolhendoTipo(true)}
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

                {/* O PASSO A PASSO NA TELA. Com três pontos e o tipo no
                    fim, quem marca precisa saber em que passo está — sem
                    isso o clique travado no quarto parece defeito. */}
                <p className="niv-passo" role="status">
                  {toquesAtivos.length === 0 && "Clique 1: o preço da zona e onde ela começa."}
                  {toquesAtivos.length === 1 && "Clique 2: o preço oposto — é o que dá altura à zona."}
                  {toquesAtivos.length === 2 && "Clique 3: até onde a zona vai. Depois dá pra arrastar a faixa."}
                  {completo && (motivoParaNaoSalvar()
                    || "Zona fechada. Arraste as bordas pra ajustar, e escolha o tipo.")}
                </p>

                {/* Fechou a zona e o modal foi fechado sem escolher: o
                    botão traz a escolha de volta, em vez de obrigar a
                    apagar tudo e marcar de novo. */}
                {completo && !escolhendoTipo && (
                  <button
                    onClick={() => setEscolhendoTipo(true)}
                    disabled={salvando || !!motivoParaNaoSalvar()}
                    className="admin-btn"
                    style={{ alignSelf: "flex-start" }}
                  >
                    Escolher o tipo e salvar
                  </button>
                )}

                {escolhendoTipo && (
                  <ModalTipoDaZona
                    salvando={salvando}
                    aoEscolher={(t) => { setTipo(t); salvarNovo(t); }}
                    aoCancelar={() => setEscolhendoTipo(false)}
                  />
                )}
              </>
            )}
          </section>
        )}

        <ListaTemplates
          templates={templates}
          abertoId={editando?.id ?? null}
          statusMapa={statusRev.mapa}
          qualidadeMapa={qualidadeRev.mapa}
          qualidadeMotivo={qualidadeRev.motivo}
          rotulo="Suporte/Resistência"
          aoVisualizar={iniciarVisualizacao}
          aoEditar={iniciarEdicao}
          aoExcluir={remover}
        />
      </main>
      <AdminToast avisos={avisos} onFechar={fecharAviso} />
    </AdminShell>
  );
}
