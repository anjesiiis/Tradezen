import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../lib/api.js";
import { IconeAtivo } from "./IconeAtivo.jsx";
import {
  CATEGORIAS, COR_DA_CATEGORIA, categoriaDoAtivo, filtrarPorCategoria,
  iniciaisDoAtivo, ordenarPorRelevancia, rotuloDaCategoria, sugestoesDoMercado,
} from "../lib/buscaAtivos.js";

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
      <span className="search-meta">
        <span className={`search-selo selo-${categoria}`}>{rotuloDaCategoria(categoria)}</span>
        <span className="search-mercado">{a.mercado}</span>
      </span>
    </div>
  );
}

export function SearchBar({ onSelect, mercado = [] }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [categoria, setCategoria] = useState("todos");
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const buscando = q.trim().length > 0;

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

  // O que a lista mostra: o resultado da busca, ou as sugestões quando
  // ninguém digitou nada ainda. Nos dois casos passa pelo filtro de
  // categoria e pela ordem de relevância.
  const lista = useMemo(() => {
    if (!buscando) return filtrarPorCategoria(sugestoesDoMercado(mercado), categoria);
    // O servidor casa só ticker e nome, então "dolar" e "ouro" não
    // achavam nada por lá. O catálogo que a página já carregou é
    // vasculhado junto, e é nele que os apelidos pegam. Os dois se
    // juntam sem repetir ninguém.
    const porTicker = new Map();
    for (const a of [...res, ...mercado]) {
      if (!porTicker.has(a.ticker)) porTicker.set(a.ticker, a);
    }
    return ordenarPorRelevancia(filtrarPorCategoria([...porTicker.values()], categoria), q);
  }, [buscando, res, mercado, categoria, q]);

  // Agrupar por mercado só faz sentido em "Todos": dentro de uma
  // categoria todos os itens teriam o mesmo cabeçalho.
  const grupos = useMemo(() => {
    if (categoria !== "todos") return null;
    const porMercado = new Map();
    for (const a of lista) {
      if (!porMercado.has(a.mercado)) porMercado.set(a.mercado, []);
      porMercado.get(a.mercado).push(a);
    }
    return [...porMercado.entries()].map(([m, ativos]) => ({ mercado: m, ativos }));
  }, [lista, categoria]);

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
    setQ(""); setRes([]); setOpen(false); setCategoria("todos");
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
          <div className="search-filtros">
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
          </div>

          {lista.length === 0 && (
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
