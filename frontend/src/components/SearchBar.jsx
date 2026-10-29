import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../lib/api.js";
import { IconeAtivo } from "./IconeAtivo.jsx";
import {
  CATEGORIAS, COR_DA_CATEGORIA, categoriaDoAtivo, destaquesDaCategoria,
  filtrarPorCategoria, iniciaisDoAtivo, ordenarPorRelevancia, rotuloDaCategoria,
} from "../lib/buscaAtivos.js";
import {
  GRUPO_DA_CATEGORIA, buscarTopVolateis, precoComMoeda,
} from "../lib/topVolateis.js";

// Uma linha de resultado: logo, ticker grande, nome embaixo, e à direita
// o selo da categoria com o mercado.
function ItemDaBusca({ a, destacado, aoPassar, aoClicar }) {
  const categoria = categoriaDoAtivo(a);
  return (
    <div
      className={`search-item ${destacado ? "hi" : ""}`}
      onMouseEnter={aoPassar}
      onClick={aoClicar}
      role="option"
      aria-selected={destacado}
    >
      {/* O mesmo ícone dos cards da home: usa o logo real quando existe
          e, quando não existe, desenha o círculo com a inicial — já na
          cor da categoria. Não precisa de fallback próprio aqui. */}
      <span className="search-logo" title={iniciaisDoAtivo(a)}>
        <IconeAtivo ticker={a.ticker} simbolo={a.simbolo} corPadrao={COR_DA_CATEGORIA[categoria]} tamanho={34} />
      </span>
      <span className="search-texto">
        <span className="search-ticker">{a.simbolo}</span>
        <span className="search-nome">{a.nome}</span>
      </span>
      {/* Com número do dia, o selo da categoria sai: quem está olhando
          uma lista DE uma categoria já sabe em qual está, e o espaço vale
          mais pro preço. Na busca livre, que é global, o selo fica. */}
      {a.volatilidade_pct != null ? (
        <span className="search-numeros">
          <span className="search-preco">{precoComMoeda(a.preco, a.moeda)}</span>
          <span className="search-linha-baixo">
            <span className="search-amplitude">↕ {a.volatilidade_pct.toFixed(2)}%</span>
            <span className={`search-var ${a.variacao_pct >= 0 ? "alta" : "baixa"}`}>
              {a.variacao_pct >= 0 ? "▲" : "▼"} {Math.abs(a.variacao_pct).toFixed(2)}%
            </span>
          </span>
        </span>
      ) : (
        <span className="search-meta">
          <span className={`search-selo selo-${categoria}`}>{rotuloDaCategoria(categoria)}</span>
          <span className="search-mercado">{a.mercado}</span>
        </span>
      )}
    </div>
  );
}

export function SearchBar({ onSelect, mercado = [], autoFoco = false }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  // Abre nas ações brasileiras, e não em "Todos": a lista padrão agora é
  // um ranking do dia, e ranking só existe dentro de uma categoria —
  // juntar cripto com ação daria uma lista em que a cripto ganha sempre.
  const [categoria, setCategoria] = useState("acoes_br");
  // { [categoria]: Array } — o que já foi buscado nesta sessão. Trocar de
  // pílula e voltar não repete a ida ao servidor.
  const [volateis, setVolateis] = useState({});
  // Por CATEGORIA, não um booleano só: trocar de pílula no meio de uma
  // busca deixava a marca de "carregando" presa na categoria errada —
  // ora girando sobre uma lista já pronta, ora nenhum aviso sobre uma
  // lista que ainda estava vindo.
  const [estadoVolateis, setEstadoVolateis] = useState({});   // { [cat]: "carregando"|"erro"|"pronto" }
  // Quem já foi tentada mora numa REF, não no estado. Em estado, marcar
  // "carregando" entrava nas dependências do próprio efeito: ele rodava
  // de novo, a limpeza marcava a busca anterior como morta, e a resposta
  // que chegava era jogada fora — a lista nunca aparecia.
  const tentadas = useRef(new Set());
  const [tentativa, setTentativa] = useState(0);
  const tentarDeNovo = (cat) => {
    tentadas.current.delete(cat);
    setTentativa((t) => t + 1);   // só pra o efeito rodar outra vez
  };
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  // O catálogo inteiro (283 ativos). A home só carrega os ~69 do resumo,
  // e era por isso que "Forex" mostrava um par só: não havia mais nada
  // pra mostrar do lado de cá. Buscado uma vez, na primeira abertura.
  const [catalogo, setCatalogo] = useState([]);

  const buscando = q.trim().length > 0;

  useEffect(() => {
    if (!open || catalogo.length) return;
    fetch(`${API}/ativos`)
      .then((r) => r.json())
      .then((d) => setCatalogo(d.ativos || []))
      .catch(() => setCatalogo([]));
  }, [open, catalogo.length]);

  useEffect(() => {
    if (!q.trim()) { setRes([]); return; }
    const timer = setTimeout(() => {
      fetch(`${API}/ativos/buscar?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => { setRes(d.resultados || []); setOpen(true); setHi(0); })
        .catch(() => setRes([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  // Os mais voláteis da pílula escolhida — é a lista padrão, no lugar dos
  // destaques fixos. "Mais volátil" é onde o preço se mexeu hoje, que é a
  // pergunta de quem abre a busca sem saber o que procurar.
  const grupoVolateis = GRUPO_DA_CATEGORIA[categoria];
  useEffect(() => {
    if (!open || buscando || !grupoVolateis) return;
    if (tentadas.current.has(categoria)) return;
    tentadas.current.add(categoria);
    let vivo = true;
    setEstadoVolateis((e) => ({ ...e, [categoria]: "carregando" }));
    buscarTopVolateis(grupoVolateis, 10)
      .then((d) => {
        if (!vivo) return;
        setVolateis((c) => ({ ...c, [categoria]: d.top }));
        setEstadoVolateis((e) => ({ ...e, [categoria]: "pronto" }));
      })
      .catch(() => {
        // Desistiu, caiu ou demorou demais: a lista de destaques assume
        // (ver `lista`), e aqui fica o recado com o botão de tentar de
        // novo. Não gravo [] em `volateis` de propósito — gravar marcaria
        // a categoria como resolvida e impediria a nova tentativa.
        if (vivo) setEstadoVolateis((e) => ({ ...e, [categoria]: "erro" }));
      });
    return () => { vivo = false; };
  }, [open, buscando, grupoVolateis, categoria, tentativa]);

  // Casa cada ativo do ranking com a linha do catálogo: é de lá que vêm
  // o logo e o mercado, e é a linha do catálogo que quem escolhe recebe —
  // assim abrir um ativo daqui é igual a abrir de qualquer outro lugar.
  const rankingDaCategoria = useMemo(() => {
    const medidos = volateis[categoria];
    if (!medidos?.length) return null;
    const porTicker = new Map(catalogo.map((a) => [a.ticker, a]));
    return medidos
      .map((m) => {
        const doCatalogo = porTicker.get(m.ticker);
        if (!doCatalogo) return null;   // fora do catálogo: não abriria gráfico
        return { ...doCatalogo, preco: m.preco, moeda: m.moeda,
                 variacao_pct: m.variacao_pct, volatilidade_pct: m.volatilidade_pct };
      })
      .filter(Boolean);
  }, [volateis, categoria, catalogo]);

  // O que a lista mostra: o resultado da busca, ou o ranking do dia
  // quando ninguém digitou nada ainda.
  const lista = useMemo(() => {
    const base = catalogo.length ? catalogo : mercado;
    // Sem texto: o ranking da categoria, com os destaques como rede de
    // segurança (servidor fora do ar, categoria sem ranking, catálogo
    // ainda chegando — melhor uma lista velha que uma tela vazia).
    if (!buscando) return rankingDaCategoria || destaquesDaCategoria(base, categoria);
    // O servidor casa só ticker e nome, então "dolar" e "ouro" não
    // achavam nada por lá. O catálogo que a página já carregou é
    // vasculhado junto, e é nele que os apelidos pegam. Os dois se
    // juntam sem repetir ninguém.
    const porTicker = new Map();
    for (const a of [...res, ...catalogo, ...mercado]) {
      if (!porTicker.has(a.ticker)) porTicker.set(a.ticker, a);
    }
    // Digitar busca em TUDO, sem filtro de categoria. Antes a pílula
    // escolhida continuava valendo, e agora que a busca abre em "Ações
    // BR" isso significaria digitar AAPL e não achar nada.
    return ordenarPorRelevancia([...porTicker.values()], q);
  }, [buscando, res, mercado, catalogo, categoria, rankingDaCategoria, q]);

  // Agrupar por mercado só faz sentido em "Todos": dentro de uma
  // categoria todos os itens teriam o mesmo cabeçalho.
  const grupos = useMemo(() => {
    // Na busca livre, que é global, agrupar por mercado ajuda a separar
    // PETR4 de PETR4.SA de um ADR homônimo.
    if (categoria !== "todos" && !buscando) return null;
    const porMercado = new Map();
    for (const a of lista) {
      if (!porMercado.has(a.mercado)) porMercado.set(a.mercado, []);
      porMercado.get(a.mercado).push(a);
    }
    return [...porMercado.entries()].map(([m, ativos]) => ({ mercado: m, ativos }));
  }, [lista, categoria, buscando]);

  // Aberto dentro de um modal, o campo já nasce pronto pra digitar: o
  // modal só existe porque a pessoa quer procurar alguma coisa.
  useEffect(() => {
    if (!autoFoco) return;
    setOpen(true);
    inputRef.current?.focus();
  }, [autoFoco]);

  // Fecha ao clicar fora
  useEffect(() => {
    const click = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  // Cmd+K / Ctrl+K abre a busca de qualquer tela — o atalho que quem usa
  // terminal e editor já tem no dedo.
  useEffect(() => {
    const atalho = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  const escolher = (a) => {
    // Volta pra pílula de abertura, não pra "Todos": a próxima vez que a
    // busca abrir tem que mostrar um ranking, e "Todos" não tem ranking.
    setQ(""); setRes([]); setOpen(false); setCategoria("acoes_br");
    onSelect(a);
  };

  const handleKey = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open || lista.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, lista.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (lista[hi]) escolher(lista[hi]); }
  };

  const renderItem = (a) => {
    const i = lista.indexOf(a);
    return (
      <ItemDaBusca
        key={a.ticker}
        a={a}
        destacado={i === hi}
        aoPassar={() => setHi(i)}
        aoClicar={() => escolher(a)}
      />
    );
  };

  return (
    <div className="search" ref={boxRef}>
      <span className="search-ic" aria-hidden="true">⌕</span>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder="Buscar ativo... ex: PETR4, VALE3, BTC, OURO, USD/BRL"
        aria-label="Buscar ativo"
      />
      {buscando && (
        <button type="button" className="search-limpar" aria-label="Limpar busca"
          onClick={() => { setQ(""); setRes([]); inputRef.current?.focus(); }}>×</button>
      )}

      {open && (
        <div className="search-dd" role="listbox">
          {/* As pílulas somem enquanto se digita: a busca é global, e
              deixá-las na tela sugeriria que o texto só procura dentro da
              categoria escolhida. */}
          {!buscando && <div className="search-filtros">
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`search-chip ${categoria === c.id ? "ativo" : ""}`}
                // o destaque volta pro topo junto com a troca de filtro —
                // feito aqui, e não num efeito, pra não disparar render extra
                onClick={() => { setCategoria(c.id); setHi(0); }}
                aria-pressed={categoria === c.id}
              >
                {c.rotulo}
              </button>
            ))}
          </div>}

          {/* Diz o que a lista É. Sem isso, dez ações em ordem estranha
              parecem uma lista aleatória, e ninguém adivinha que o
              critério é o quanto o preço andou hoje. */}
          {!buscando && rankingDaCategoria && (
            <div className="search-group-head search-ranking-head">
              <span>Mais voláteis hoje</span>
              <span className="search-ranking-nota">maior amplitude do dia</span>
            </div>
          )}

          {!buscando && estadoVolateis[categoria] === "carregando" && !rankingDaCategoria && (
            <div className="search-vazio">Medindo o pregão…</div>
          )}

          {/* Aviso curto, EM CIMA da lista de destaques que já está na
              tela. A pessoa continua podendo escolher um ativo enquanto
              decide se tenta de novo. */}
          {!buscando && estadoVolateis[categoria] === "erro" && (
            <div className="search-aviso">
              <span>Cotações indisponíveis agora — mostrando os ativos de sempre.</span>
              <button type="button" className="search-retentar" onClick={() => tentarDeNovo(categoria)}>
                Tentar de novo
              </button>
            </div>
          )}

          {lista.length === 0 && estadoVolateis[categoria] !== "carregando" && (
            <div className="search-vazio">
              {buscando
                ? <>Nenhum ativo encontrado para <strong>{q.trim()}</strong>. Tente outro termo.</>
                : "Digite para buscar entre os ativos disponíveis."}
            </div>
          )}

          {grupos
            ? grupos.map((g) => (
                <div key={g.mercado}>
                  <div className="search-group-head">{g.mercado}</div>
                  {g.ativos.map(renderItem)}
                </div>
              ))
            : lista.map(renderItem)}
        </div>
      )}
    </div>
  );
}
