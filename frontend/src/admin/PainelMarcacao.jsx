import { useEffect, useRef, useState } from "react";
import { SkeletonGraficoLinha } from "../components/Skeleton.jsx";
import AdminShell, { AdminPatternNav, AdminToast } from "./theme.jsx";
import TemplateMarkerChart from "./TemplateMarkerChart.jsx";
import AtivoPicker from "./AtivoPicker.jsx";
import ListaTemplates from "./ListaTemplates.jsx";
import {
  PADROES, avisosDoPadrao, configDoTemplate, linhasDoPadrao, paresDeLinha,
  podeValidar, stepsDoPadrao, validarPadrao,
} from "./bandeira.js";
import { API_DO_PADRAO, fetchAtivoCandles, clearAdminToken } from "./adminApi";
import { APIS_DE_TEMPLATE, montarDesenhoSalvo, useLampadas } from "./lampadas.js";
import { anotacoesParaSalvar, janelaDoPadrao } from "./janela.js";
import { candlesGuardados, esquecerCandles, estadoDoGrafico, guardarGrafico } from "./estadoGrafico.js";

// Tela de marcação dos padrões de continuação (bandeira e flâmula, de alta
// e de baixa). As quatro são iguais na mecânica — 8 pontos em 4 pares —,
// então o que muda vem por prop: `padrao` (rótulos, cores, direção, forma)
// e `api` (endpoint/tabela daquele padrão). Sem isso seriam 4 arquivos
// quase idênticos, que é onde um conserto entra em três e esquece o quarto.
const PERIODOS = ["3mo", "6mo", "1y", "2y", "5y", "10y", "max"];
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
  // candles entram porque as linhas do canal são esticadas até o limite do
  // gráfico; os outros padrões ignoram esse segundo argumento
  const desenharLinhas = (pontos, candlesDoGrafico) => linhasDoPadrao(pontos, padrao, candlesDoGrafico);

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
  const [mensagem, setMensagem] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [editando, setEditando] = useState(null);
  const [avisos, setAvisos] = useState([]);
  // 💡 dos templates já salvos DESTE ativo (todos os padrões)
  const marcadoresSalvos = useLampadas(ticker, templates);
  // Desenho do template aberto por uma 💡 — sem rótulos, como o usuário verá
  const [desenhoSalvo, setDesenhoSalvo] = useState(null);
  // Última faixa visível do gráfico: o gráfico é remontado ao trocar de
  // padrão, e é isso que devolve o zoom e a posição de antes. Guardada
  // também fora do componente, pra valer entre telas diferentes.
  const faixaRef = useRef(estadoDoGrafico().faixa);

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
    setDesenhoSalvo(null);
    setEditando(null);
    setMensagem(null);
    if (marcados) {
      mostrarToasts([`Marcação mantida: os ${marcados} ponto(s) vão ser salvos como ${novoPadrao.rotulo}.`], "ok");
    }
  }

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
      setAnotacoes([]);
      // gráfico novo: guarda pra próxima tela e zera a posição antiga
      faixaRef.current = null;
      guardarGrafico({ ticker: alvo, periodo, intervalo, candles: data.candles, faixa: null });
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
      const { candles, pontosAjustados, anotacoesAjustadas } = janelaDoPadrao(candlesContexto, pontos, anotacoes);
      // Data do primeiro ponto: guardada em coluna própria pra a lista e os
      // marcadores do gráfico não precisarem abrir os candles de cada template.
      const candleP1 = candlesContexto[pontos[PASSOS[0]]?.i];
      await api.create({
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
      setMensagem({ tipo: "ok", texto: "Template salvo com sucesso." });
      setCandlesContexto(null);
      setPontos({});
      setResultado("");
      setObservacao("");
      setAnotacoes([]);
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
    // Templates salvos em formatos antigos não passam pelas regras novas
    const erros = podeValidar(editando.pontosEdit, padraoDestino) ? validarPadrao(editando.pontosEdit, padraoDestino) : [];
    if (erros.length) {
      mostrarToasts(erros, "erro");
      return;
    }
    mostrarToasts(avisosDoPadrao(editando.pontosEdit, padraoDestino), "aviso");
    setSalvando(true);
    setMensagem(null);

    const campos = {
      pontos: editando.pontosEdit,
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
          <AdminPatternNav active={padrao.nav} aoTrocar={trocarPeloMenu} />
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
                  {Object.values(PADROES).map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
                </select>
              </Campo>
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
                  pares={paresDeLinha(padrao)}
                  marcadoresExtras={marcadoresSalvos}
                  desenhoSalvo={desenhoSalvo}
                  aoClicarLampada={abrirDesenhoSalvo}
                  initialPontos={pontos}
                  faixaInicial={faixaRef.current}
                  aoMudarFaixa={(faixa) => { faixaRef.current = faixa; guardarGrafico({ faixa }); }}
                  anotacoes={anotacoes}
                  aoMudarAnotacoes={setAnotacoes}
                  onChange={setPontos}
                />

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
