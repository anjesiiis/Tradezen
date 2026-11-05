import { useEffect, useRef, useState } from "react";
import { gravarUltimoVisto, lerUltimoVisto, limparUltimoVisto, posicaoNaLista } from "./ultimoVisto.js";
import { COM_FAIXA, FILTROS, SELO, contarPorFiltro, filtrar, statusDe } from "./statusRevisao.js";

// Marcações salvas em cards — um por template, com o que interessa relembrar
// depois: ticker, padrão, data do primeiro ponto e a anotação inteira (numa
// tabela ela ficava cortada). Mesma lista nas telas de todos os padrões.
//
// Duas coisas servem pra não se perder numa revisão de 212 marcações:
//
//   O NÚMERO (#47/212) é a posição na lista como ela está na tela. Muda
//   quando se salva marcação nova — a listagem vem da mais recente pra
//   mais antiga —, e é por isso que o marcador guarda o id e não o número.
//
//   O MARCADOR é o último template aberto nesta lista. Fica no navegador
//   (ver ultimoVisto.js), então sobrevive ao F5 e a fechar a aba.
//
// `abertoId` é o id do template que está aberto lá em cima, ou null. É só
// por ele que a lista sabe das duas transições que importam: abriu um
// (marca) e fechou (rola de volta até onde estava).
export default function ListaTemplates({
  templates: todos = [], rotulo, aoVisualizar, aoEditar, aoExcluir, aoMover, destinoDoMover,
  abertoId = null, statusMapa = null,
}) {
  // Filtro de status. Sem o mapa (migration 025 não rodada) a barra de
  // filtros não aparece e a lista é a lista inteira, como era antes.
  const [filtro, setFiltro] = useState("todos");
  const temStatus = !!statusMapa && Object.keys(statusMapa).length > 0;
  const contas = temStatus ? contarPorFiltro(todos, statusMapa) : null;
  const templates = temStatus ? filtrar(todos, statusMapa, filtro) : todos;
  const [ultimoVisto, setUltimoVisto] = useState(() => lerUltimoVisto(rotulo));
  const refDoMarcado = useRef(null);
  // Trocar de tela (de Bandeira de Alta pra Topo Duplo) tem que trocar o
  // marcador junto: sem isto a lista nova mostraria o marcador da antiga.
  useEffect(() => { setUltimoVisto(lerUltimoVisto(rotulo)); }, [rotulo]);

  // Abriu um template: ele passa a ser o "onde parei".
  useEffect(() => {
    if (abertoId == null) return;
    gravarUltimoVisto(rotulo, abertoId);
    setUltimoVisto(abertoId);
  }, [abertoId, rotulo]);

  // Fechou: rola de volta até o card, centralizado. A lista fica montada o
  // tempo todo (ela só sai de vista porque o gráfico abre acima), então a
  // transição de aberto pra fechado é o único sinal de "voltei pra cá".
  const estavaAberto = useRef(false);
  useEffect(() => {
    const fechouAgora = estavaAberto.current && abertoId == null;
    estavaAberto.current = abertoId != null;
    if (!fechouAgora) return;
    const alvo = refDoMarcado.current;
    if (typeof alvo?.scrollIntoView !== "function") return;   // jsdom não tem
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    alvo.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "center" });
  }, [abertoId]);

  const posicaoDoUltimo = posicaoNaLista(templates, ultimoVisto);
  // Posição 0 = o marcado não está mais na lista (apagado, ou movido pro
  // outro lado). Melhor não mostrar marcador nenhum que apontar pro card
  // errado — os números todos andaram quando ele saiu.
  const temMarcador = posicaoDoUltimo > 0 && abertoId == null;

  function esquecerMarcador() {
    limparUltimoVisto(rotulo);
    setUltimoVisto(null);
  }

  return (
    <section className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2>
        Marcados em {rotulo} ({templates.length}
        {templates.length !== todos.length ? ` de ${todos.length}` : ""})
      </h2>

      {/* Filtros por status. Primeiro o que falta decidir: é o que se
          procura quando se senta pra revisar. */}
      {temStatus && (
        <div className="sr-filtros" role="group" aria-label="Filtrar por status">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtro === f.id}
              className={`sr-filtro${filtro === f.id ? " aceso" : ""}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.rotulo} <span className="sr-filtro-n">{contas[f.id]}</span>
            </button>
          ))}
        </div>
      )}

      {templates.length === 0 && (
        <p style={{ color: "var(--text2)", fontSize: 13, margin: 0 }}>Nenhum template ainda.</p>
      )}

      {/* Atalho pra retomar sem procurar. Mostra o número pra conferir que
          é mesmo onde se parou antes de clicar. */}
      {temMarcador && (
        <div className="lt-retomar">
          <button
            type="button"
            className="lt-retomar-btn"
            onClick={() => aoVisualizar(templates[posicaoDoUltimo - 1])}
          >
            📍 Continuar de onde parei (#{posicaoDoUltimo})
          </button>
          <button type="button" className="lt-retomar-limpar" onClick={esquecerMarcador}>
            Limpar marcador
          </button>
        </div>
      )}

      <div className="admin-cards">
        {templates.map((t, i) => {
          const marcado = temMarcador && i === posicaoDoUltimo - 1;
          return (
            <article
              key={t.id}
              ref={marcado ? refDoMarcado : undefined}
              className={`admin-card-item${marcado ? " lt-marcado" : ""}`
                + (temStatus && COM_FAIXA.has(statusDe(statusMapa, t.id))
                   ? ` sr-borda-${statusDe(statusMapa, t.id)}` : "")}
            >
              {/* Número tabular: a coluna não dança entre #9 e #10 */}
              <span className="lt-numero" aria-label={`Marcação ${i + 1} de ${templates.length}`}>
                #{i + 1}<span className="lt-numero-total">/{templates.length}</span>
              </span>
              {marcado && <span className="lt-selo">📍 Você parou aqui</span>}
              {/* Selo de status. Sai do lado esquerdo, embaixo do número,
                  pra não disputar o canto com o "você parou aqui". */}
              {temStatus && SELO[statusDe(statusMapa, t.id)] && (
                <span className={`sr-badge ${SELO[statusDe(statusMapa, t.id)].classe}`}>
                  <span aria-hidden="true">{SELO[statusDe(statusMapa, t.id)].marca}</span>
                  {" "}{SELO[statusDe(statusMapa, t.id)].rotulo}
                </span>
              )}
              <header>
                <strong>{t.ticker}</strong>
                <span className="admin-tag">{rotulo}</span>
              </header>
              <dl>
                <div>
                  <dt>P1</dt>
                  {/* UTC: o candle é do dia inteiro; converter pro fuso local
                      jogaria a data um dia pra trás */}
                  <dd>{t.data_p1 ? new Date(t.data_p1).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}</dd>
                </div>
                <div><dt>Timeframe</dt><dd>{t.timeframe}</dd></div>
                <div><dt>Resultado</dt><dd>{t.resultado || "—"}</dd></div>
                <div><dt>Salvo em</dt><dd>{new Date(t.criado_em).toLocaleDateString("pt-BR")}</dd></div>
              </dl>
              {t.observacao && <p className="admin-card-nota">{t.observacao}</p>}
              {/* Marcação que já trocou de lado. Serve pra enxergar o que
                  foi revisado à mão sem abrir um a um. */}
              {t.movido_de && (
                <p className="admin-card-nota revisada" title={t.motivo_movimento || "Revisada manualmente"}>
                  ✎ movida de {t.movido_de.includes("fracasso") ? "fracassos" : "padrões"}
                  {t.motivo_movimento ? ` — ${t.motivo_movimento}` : ""}
                </p>
              )}
              {/* botão de verdade, não <a> sem href: o mouse vira mãozinha, dá
                  pra chegar pelo teclado e o leitor de tela anuncia como botão */}
              <footer>
                <button type="button" className="action" onClick={() => aoVisualizar(t)}>Visualizar</button>
                <button type="button" className="action" onClick={() => aoEditar(t)}>Editar</button>
                {/* Trocar de lado em vez de apagar e remarcar: a marcação
                    leva candles, pontos e anotações junto. */}
                {aoMover && (
                  <button type="button" className="action" onClick={() => aoMover(t)}>
                    {destinoDoMover === "fracasso" ? "Não é o padrão" : "É o padrão"}
                  </button>
                )}
                <button type="button" className="action danger" onClick={() => aoExcluir(t.id)}>Excluir</button>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
