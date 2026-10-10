import { useEffect, useRef, useState } from "react";
import { dentroDoPeriodo } from "./periodoDoPadrao.js";
import { SkeletonGraficoLinha } from "../components/Skeleton.jsx";
import AdminShell, { AdminPatternNav, AdminToast } from "./theme.jsx";
import TemplateMarkerChart from "./TemplateMarkerChart.jsx";
import AtivoPicker from "./AtivoPicker.jsx";
import BotoesPeriodo from "./BotoesPeriodo.jsx";
import { useToasts } from "./toastsAdmin.js";
import { comContextoLargo } from "./contextoTemplate.js";
import { escreverModoNaUrl, lerModoDaUrl } from "./modoTemplate.js";
import ListaTemplates from "./ListaTemplates.jsx";
import {
  PADROES, areasDoPadrao, avisosDoPadrao, configDoTemplate, linhasDoPadrao,
  normalizarPares, padroesCompativeis, paresDeLinha, podeValidar, stepsDoPadrao,
  validarPadrao,
} from "./bandeira.js";
import { ancoraExtra, ehExtra, instrucaoExtra } from "./padroesExtras.js";
import { INSTRUCAO_CANAL } from "./canal.js";
import { ficaAcima } from "../lib/iconesPadroes.js";
import { API_DO_PADRAO, fetchAtivoCandles, clearAdminToken } from "./adminApi";
import { APIS_DE_TEMPLATE, montarDesenhoSalvo, useDesenhosSalvos, useLampadas } from "./lampadas.js";
import { anotacoesParaSalvar, janelaDoPadrao } from "./janela.js";
import { candlesGuardados, esquecerCandles, estadoDoGrafico, guardarGrafico } from "./estadoGrafico.js";
import FiltroPadroes from "./FiltroPadroes.jsx";
import { filtroInicial } from "../lib/filtroPadroes.js";

// Tela de marcação dos padrões de continuação (bandeira e flâmula, de alta
// e de baixa). As quatro são iguais na mecânica — 8 pontos em 4 pares —,
// então o que muda vem por prop: `padrao` (rótulos, cores, direção, forma)
// e `api` (endpoint/tabela daquele padrão). Sem isso seriam 4 arquivos
// quase idênticos, que é onde um conserto entra em três e esquece o quarto.
const INTERVALOS = ["1d", "1wk", "60m"];
function Campo({ label, children }) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function PainelMarcacao({ padraoInicial }) {
  // O seletor do topo troca o padrão sem sair da página: a marcação em
  // andamento é descartada e a tela recarrega a lista daquele padrão.
  const [padrao, setPadrao] = useState(padraoInicial);
  const api = API_DO_PADRAO[padrao.id];
  const STEPS = stepsDoPadrao(padrao);
  const PASSOS = STEPS.map((s) => s.key);
  const desenharLinhas = (pontos, candlesDoGrafico) => linhasDoPadrao(pontos, padrao, candlesDoGrafico);
  // Onde o emoji do padrão fica ancorado. Nos padrões de 4 pares é o topo
  // do primeiro mastro; nos de reversão e consolidação, o ponto mais
  // característico de cada um (a cabeça do OCO invertido, etc); nos
  // demais, o primeiro ponto marcado — sem isso o canal ficava sem emoji,
  // porque a chave do mastro não existe lá.
  const ancoraDoEmoji = (p) => {
    if (ehExtra(p)) return ancoraExtra(p);
    return p.canal ? stepsDoPadrao(p)[0].key : "p2_topo_mastro1";
  };

  // Ativo, período, intervalo e candles vêm do que a tela anterior
  // deixou: trocar de padrão não pode recomeçar do PETR4 nem obrigar a
  // procurar de novo o trecho que se estava olhando (ver estadoGrafico.js).
  const [ticker, setTicker] = useState(() => estadoDoGrafico().ticker);
  const [periodo, setPeriodo] = useState(() => estadoDoGrafico().periodo);
  const [intervalo, setIntervalo] = useState(() => estadoDoGrafico().intervalo);
  const [candlesContexto, setCandlesContexto] = useState(() =>
    candlesGuardados(estadoDoGrafico().ticker, estadoDoGrafico().periodo, estadoDoGrafico().intervalo)
  );
  const [carregando, setCarregando] = useState(false);
  const [pontos, setPontos] = useState({});
  const [resultado, setResultado] = useState("");
  const [observacao, setObservacao] = useState("");
  // Etiquetas de texto escritas em cima do gráfico — salvas junto
  const [anotacoes, setAnotacoes] = useState([]);
  const [salvando, setSalvando] = useState(false);
  // id do template recém-salvo: o sidebar o destaca por uns segundos
  const [salvoAgora, setSalvoAgora] = useState(null);
  const [limpezas, setLimpezas] = useState(0);
  const [mensagem, setMensagem] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [editando, setEditando] = useState(null);
  const { avisos, mostrarToasts, fecharAviso } = useToasts();
  // Quais padrões já marcados ficam visíveis no gráfico (sidebar)
  // O sidebar abre com só o padrão desta tela ligado (filtroPadroes.js)
  const [padroesVisiveis, setPadroesVisiveis] = useState(() => filtroInicial(padrao.id));

  // 💡 dos templates já salvos DESTE ativo (todos os padrões)
  const marcadoresSalvos = useLampadas(ticker, templates);
  // quantos de cada padrão existem neste ativo — o sidebar mostra ao lado
  const contagemPorPadrao = marcadoresSalvos.reduce((acc, m) => {
    acc[m.tipo] = (acc[m.tipo] || 0) + 1;
    return acc;
  }, {});
  const marcadoresVisiveis = marcadoresSalvos.filter((m) => padroesVisiveis.includes(m.tipo));
  // Os padrões ligados no sidebar aparecem DESENHADOS no gráfico, não só
  // com o emoji: enquanto se marca o próximo, dá pra ver o que já existe
  // ali do lado e seguir a lógica de confirmação.
  const desenhosVisiveis = useDesenhosSalvos(marcadoresVisiveis, candlesContexto);
  // Padrão de uma data que não está no período carregado não aparece no
  // gráfico (ver periodoDoPadrao.js): no sidebar ele fica apagado, com a
  // dica de aumentar o período, em vez de sumir sem explicação.
  const foraDaFaixa = new Set(
    marcadoresSalvos.filter((m) => !dentroDoPeriodo(candlesContexto || [], m.time)).map((m) => m.id)
  );
  // Desenho do template aberto por uma 💡 — sem rótulos, como o usuário verá
  const [desenhoSalvo, setDesenhoSalvo] = useState(null);
  // Última faixa visível do gráfico: o gráfico é remontado ao trocar de
  // padrão, e é isso que devolve o zoom e a posição de antes. Guardada
  // também fora do componente, pra valer entre telas diferentes.
  const faixaRef = useRef(estadoDoGrafico().faixa);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padrao.id]);


  // Clique na 💡: busca o template e desenha os pontos dele no gráfico que
  // está na tela. Sem rótulos — é assim que o padrão vai aparecer pro
  // usuário. Clicar de novo na mesma lâmpada fecha o desenho.
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
      else mostrarToasts(["Esse padrão não está na faixa de candles carregada — carregue um período maior."], "aviso");
    } catch {
      setMensagem({ tipo: "erro", texto: "Não foi possível abrir esse padrão." });
    }
  }

  // Trocar o padrão MANTÉM a marcação: os seis padrões de continuação usam
  // os mesmos 8 pontos, então perceber no meio do caminho que aquilo é uma
  // flâmula e não uma bandeira é só trocar aqui — salva na tabela da
  // flâmula, sem remarcar nada. O que muda é a validação na hora de salvar.
  // Chave da nav do topo ("bandeira-baixa") → padrão. Só os de continuação:
  // OCO, topo duplo e níveis marcam outros pontos, aí é tela mesmo.
  function padraoDaNav(chave) {
    return Object.values(PADROES).find((p) => p.nav === chave) || null;
  }

  function trocarPeloMenu(chave, href) {
    const novoPadrao = padraoDaNav(chave);
    if (!novoPadrao) return false;                 // deixa navegar normalmente
    if (novoPadrao.id !== padrao.id) {
      trocarPadrao(novoPadrao.id);
      // endereço acompanha o padrão sem remontar a tela (recarregar aqui
      // jogaria fora candles, zoom e marcação — que é o que se quer manter)
      window.history.replaceState(null, "", href);
    }
    return true;
  }

  function trocarPadrao(id) {
    const novoPadrao = PADROES[id];
    if (!novoPadrao || novoPadrao.id === padrao.id) return;
    const marcados = Object.keys(pontos).length;
    setPadrao(novoPadrao);
    // Trocar de padrão no seletor é entrar naquele padrão: o sidebar
    // volta a mostrar só ele, como ao abrir a tela.
    setPadroesVisiveis(filtroInicial(novoPadrao.id));
    setDesenhoSalvo(null);
    setEditando(null);
    setMensagem(null);
    if (marcados) {
      mostrarToasts([`Marcação mantida: os ${marcados} ponto(s) vão ser salvos como ${novoPadrao.rotulo}.`], "ok");
    }
  }

  // Cada mensagem vira um toast próprio, some sozinho em 8s. Vermelho
  // (erro) impede salvar; amarelo (aviso) é só um "confira isso".

  async function carregarTemplates() {
    try {
      setTemplates(await api.list());
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
      setPontos({});
      setAnotacoes([]);
      // O gráfico guarda a própria cópia dos pontos, por ÍNDICE de candle:
      // sem zerar aqui, as linhas do ativo anterior continuavam desenhadas
      // sobre o ativo novo, em preços que não existem nele.
      setLimpezas((n) => n + 1);
      setDesenhoSalvo(null);
      // gráfico novo: guarda pra próxima tela e zera a posição antiga
      faixaRef.current = null;
      guardarGrafico({ ticker: alvo, periodo: janela, intervalo, candles: data.candles, faixa: null });
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

  // Passos marcados como `opcional` (o 3º toque do canal) não seguram o
  // salvamento — os outros padrões não têm nenhum, então nada muda neles.
  const completo = STEPS.filter((s) => !s.opcional).every((s) => pontos[s.key]);

  async function salvarNovo() {
    if (!completo || !candlesContexto) return;
    // Clicar a ponta direita de uma linha antes da esquerda desenha a mesma
    // linha — o que vai pro banco é sempre com o "início" à esquerda.
    const pontosEmOrdem = normalizarPares(pontos, padrao);
    const erros = validarPadrao(pontosEmOrdem, padrao);
    if (erros.length) {
      mostrarToasts(erros, "erro");
      return;
    }
    // Avisos não impedem o salvamento — só chamam atenção pra marcação
    mostrarToasts(avisosDoPadrao(pontosEmOrdem, padrao), "aviso");

    setSalvando(true);
    setMensagem(null);
    try {
      const { candles, pontosAjustados, anotacoesAjustadas } = janelaDoPadrao(candlesContexto, pontosEmOrdem, anotacoes);
      // Data do primeiro ponto: guardada em coluna própria pra a lista e os
      // marcadores do gráfico não precisarem abrir os candles de cada template.
      const candleP1 = candlesContexto[pontosEmOrdem[PASSOS[0]]?.i];
      const salvo = await api.create({
        ticker: ticker.trim().toUpperCase(),
        timeframe: intervalo,
        candles,
        candles_contexto: candlesContexto,
        pontos: pontosAjustados,
        data_p1: candleP1 ? new Date(candleP1.timestamp).toISOString() : null,
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
      // o que acabou de ser salvo precisa aparecer: se o padrão estava
      // desmarcado no sidebar, ele volta ligado
      setPadroesVisiveis((atuais) => (atuais.includes(padrao.id) ? atuais : [...atuais, padrao.id]));
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

  // A listagem não traz candles/pontos (respostas grandes demais derrubavam
  // o servidor — ver _COLUNAS_LISTA no backend), então busca o template
  // completo aqui, só quando o usuário abre um.
  async function abrirTemplate(template, readOnly) {
    setMensagem(null);
    try {
      const completoDoBanco = comContextoLargo(await api.get(template.id));
      escreverModoNaUrl(readOnly ? "visualizar" : "editar", template.id);
      setEditando({
        ...completoDoBanco,
        pontosEdit: completoDoBanco.pontos,
        anotacoesEdit: completoDoBanco.anotacoes || [],
        tipoEdit: padrao.id,   // pode ser trocado na edição (ver salvarEdicao)
        readOnly,
      });
    } catch {
      setMensagem({ tipo: "erro", texto: "Não foi possível abrir este template." });
    }
  }

  async function salvarEdicao() {
    if (!editando) return;
    const padraoDestino = PADROES[editando.tipoEdit] || padrao;
    const pontosEmOrdem = normalizarPares(editando.pontosEdit, padraoDestino);
    // Templates salvos em formatos antigos não passam pelas regras novas
    const erros = podeValidar(pontosEmOrdem, padraoDestino) ? validarPadrao(pontosEmOrdem, padraoDestino) : [];
    if (erros.length) {
      mostrarToasts(erros, "erro");
      return;
    }
    mostrarToasts(avisosDoPadrao(pontosEmOrdem, padraoDestino), "aviso");
    setSalvando(true);
    setMensagem(null);

    const campos = {
      pontos: pontosEmOrdem,
      resultado: editando.resultado?.trim() || null,
      observacao: editando.observacao?.trim() || null,
      anotacoes: anotacoesParaSalvar(editando.anotacoesEdit),
    };

    try {
      if (padraoDestino.id === padrao.id) {
        await api.update(editando.id, campos);
        setMensagem({ tipo: "ok", texto: "Template atualizado." });
      } else {
        await mudarDePadrao(padraoDestino, campos);
      }
      setEditando(null);
      escreverModoNaUrl(null);
      carregarTemplates();
    } catch (err) {
      setMensagem({ tipo: "erro", texto: err?.mensagemAmigavel || "Erro ao atualizar o template." });
    } finally {
      setSalvando(false);
    }
  }

  // Cada padrão tem tabela própria, então corrigir o tipo de um template já
  // salvo é recriar do outro lado e apagar deste. A ordem importa: só apaga
  // depois que o novo existe — se o segundo passo falhar, o template não se
  // perde (fica nos dois lugares, e o aviso diz o que apagar).
  async function mudarDePadrao(padraoDestino, campos) {
    const destino = API_DO_PADRAO[padraoDestino.id];
    let criado;
    try {
      criado = await destino.create({
        ticker: editando.ticker,
        timeframe: editando.timeframe,
        candles: editando.candles,
        candles_contexto: editando.candles_contexto,
        data_p1: editando.data_p1 || null,
        ...campos,
      });
    } catch (err) {
      err.mensagemAmigavel = `Não foi possível salvar como ${padraoDestino.rotulo} — a marcação não passou nas regras desse padrão.`;
      throw err;
    }

    try {
      await api.remove(editando.id);
    } catch {
      setMensagem({
        tipo: "erro",
        texto: `Salvo como ${padraoDestino.rotulo}, mas a cópia antiga em ${padrao.rotulo} (#${editando.id}) não foi apagada — apague à mão.`,
      });
      return criado;
    }

    setMensagem({ tipo: "ok", texto: `Template movido para ${padraoDestino.rotulo}.` });
    return criado;
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

  const padraoEmEdicao = (editando && PADROES[editando.tipoEdit]) || padrao;
  const configEdicao = editando ? configDoTemplate(editando.pontos, padraoEmEdicao) : null;

  return (
    <AdminShell>
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="admin-logo notranslate">Trade<span>Zen</span></span>
          <span className="admin-header-title">Admin · Templates {padrao.rotulo}</span>
        </div>
        <AdminPatternNav active={padrao.nav} aoTrocar={trocarPeloMenu} />
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
              /* tipoEdit na key: trocar o padrão redesenha com as cores e
                 as linhas do padrão novo */
              key={`${editando.id}-${editando.readOnly}-${padraoEmEdicao.id}`}
              candles={editando.candles}
              steps={configEdicao.steps}
              linePairs={configEdicao.linePairs}
              linhas={configEdicao.linhas}
              pares={configEdicao.pares}
              initialPontos={editando.pontos}
              onChange={(p) => setEditando((prev) => ({ ...prev, pontosEdit: p }))}
              anotacoes={editando.anotacoesEdit}
              aoMudarAnotacoes={(lista) => setEditando((prev) => ({ ...prev, anotacoesEdit: lista }))}
              areas={areasDoPadrao(editando.pontosEdit || editando.pontos, padraoEmEdicao, editando.candles)}
              padraoMarcado={{
                id: padraoEmEdicao.id,
                ancora: ancoraDoEmoji(padraoEmEdicao),
                acima: ficaAcima(padraoEmEdicao.id),
                modo: editando.readOnly ? "visualizar" : "editar",
              }}
              enquadrarPontos={editando.readOnly}
              readOnly={editando.readOnly}
            />

            <Campo label="Padrão">
              {/* Errou o tipo na marcação? Troca aqui: o template vai pra
                  tabela do padrão certo, com os mesmos pontos. */}
              <select
                value={padraoEmEdicao.id}
                onChange={(e) => setEditando((prev) => ({ ...prev, tipoEdit: e.target.value }))}
                className="admin-select"
                disabled={editando.readOnly}
                title="Trocar o padrão deste template — ele passa para a tabela do padrão escolhido"
                style={{ maxWidth: 260 }}
              >
                {Object.values(PADROES).map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
              </select>
              {padraoEmEdicao.id !== padrao.id && (
                <span style={{ fontSize: 12, color: "var(--text2)" }}>
                  Ao salvar, sai de {padrao.rotulo} e passa a ser {padraoEmEdicao.rotulo}.
                </span>
              )}
            </Campo>

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
              <Campo label="Padrão">
                <select
                  value={padrao.id}
                  onChange={(e) => trocarPadrao(e.target.value)}
                  className="admin-select"
                  title="Trocar o padrão marcado — a marcação em andamento é descartada"
                >
                  {padroesCompativeis(padrao).map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
                </select>
              </Campo>
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
                    key={padrao.id}
                    padraoMarcado={{ id: padrao.id, ancora: ancoraDoEmoji(padrao), acima: ficaAcima(padrao.id) }}
                    instrucao={padrao.canal ? INSTRUCAO_CANAL : instrucaoExtra(padrao)}
                    areas={[
                      ...areasDoPadrao(pontos, padrao, candlesContexto),
                      // o aberto pela 💡 ganha do mesmo padrão vindo do
                      // sidebar: os dois têm o mesmo id de área, e duas
                      // áreas iguais davam "two children with the same key"
                      ...desenhosVisiveis
                        .filter((d) => d.chave !== desenhoSalvo?.chave)
                        .flatMap((d) => d.areas || []),
                      ...(desenhoSalvo?.areas || []),
                    ]}
                    candles={candlesContexto}
                    steps={STEPS}
                    linhas={desenharLinhas}
                    pares={paresDeLinha(padrao)}
                    marcadoresExtras={marcadoresVisiveis}
                    desenhosExtras={desenhosVisiveis}
                    desenhoSalvo={desenhoSalvo}
                    aoClicarLampada={abrirDesenhoSalvo}
                    initialPontos={pontos}
                    faixaInicial={faixaRef.current}
                    aoMudarFaixa={(faixa) => { faixaRef.current = faixa; guardarGrafico({ faixa }); }}
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
                    salvos={marcadoresSalvos}
                    destacado={salvoAgora}
                    foraDaFaixa={foraDaFaixa}
                  />
                </div>

                {desenhoSalvo && (
                  <div className="admin-msg admin-msg-ok" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span>Mostrando o padrão salvo: <strong>{desenhoSalvo.rotulo}</strong></span>
                    <button className="admin-link-btn" style={{ marginLeft: "auto" }} onClick={() => setDesenhoSalvo(null)}>
                      Fechar desenho
                    </button>
                  </div>
                )}

                <Campo label="Resultado">
                  <input
                    placeholder="ex: sucesso, falha"
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value)}
                    className="admin-input"
                    style={{ maxWidth: 260 }}
                  />
                </Campo>
                <Campo label="Anotação">
                  <textarea
                    placeholder="o que chamou atenção nesse padrão — ex: rompimento forte, volume baixo na bandeira"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="admin-input admin-textarea"
                    rows={3}
                  />
                </Campo>

                {completo && (
                  <button onClick={salvarNovo} disabled={salvando} className="admin-btn" style={{ alignSelf: "flex-start" }}>
                    {salvando ? "Salvando..." : "Salvar Template"}
                  </button>
                )}
              </>
            )}
          </section>
        )}

        <ListaTemplates
          templates={templates}
          rotulo={padrao.rotulo}
          aoVisualizar={(t) => abrirTemplate(t, true)}
          aoEditar={(t) => abrirTemplate(t, false)}
          aoExcluir={remover}
        />

      </main>

      <AdminToast avisos={avisos} onFechar={fecharAviso} />
    </AdminShell>
  );
}
