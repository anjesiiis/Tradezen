import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOGO_INDICADORES, CATEGORIAS_INDICADOR } from "../../lib/grafico/config.js";

// Nome da aba por id, pra busca: quem digita "medias" quer as medias
// moveis, e nenhum rotulo de indicador tem essa palavra ("SMA 20",
// "EMA 9"). Sem isso a busca mais obvia do painel nao acha nada.
const ROTULO_CATEGORIA = Object.fromEntries(
  CATEGORIAS_INDICADOR.map((c) => [c.id, c.label]),
);

/**
 * TRADEZEN — PAINEL DE INDICADORES
 * ================================
 *
 * Era uma lista vertical com 13 linhas, uma embaixo da outra: no celular
 * dava rolagem de duas telas pra chegar no OBV. Agora é horizontal —
 * abas por categoria em cima, grade de chips embaixo — e o painel inteiro
 * cabe em 480x360 no desktop e num bottom sheet no celular.
 *
 * A REGRA QUE NÃO SE QUEBRA AQUI: chip que não desenha nada não é
 * clicável. Os treze que funcionam ficam ligáveis; os treze cuja
 * matemática já existe mas que ainda não chegam ao gráfico aparecem
 * apagados com a etiqueta "em breve" (ver INDICADORES_EM_BREVE no
 * config). Listar MACD e nada acontecer ao clicar faz a pessoa concluir
 * que a plataforma está quebrada — e ela estaria certa.
 *
 * POR QUE MODAL CENTRAL, e não um popover ancorado no botão: o painel
 * já nascia num portal no document.body, então o grid do multichart
 * nunca o cortou. O que cortava era a JANELA. Ancorado, ele abria em
 * top = (base do botão), e o botão das mesas de baixo fica perto do pé
 * da tela — 360px de painel a partir dali caem fora do viewport, e no
 * celular com quatro mesas o painel da última abria quase todo invisível.
 * Centralizado, a posição não depende de onde está a mesa.
 *
 * FAVORITOS ficam no navegador (localStorage), não no banco. É
 * preferência de quem está olhando, some junto com o navegador e não
 * vale uma tabela nem uma ida ao Supabase a cada clique.
 *
 * O ENGRENAGEM POR INDICADOR (período configurável) não existe ainda de
 * propósito: hoje o período está no PRÓPRIO id ("sma20", "ema9"), então
 * não há o que configurar sem antes separar indicador de parâmetro. Isso
 * é uma mudança no catálogo e no desenho, não neste painel.
 */

const CHAVE_FAV = "tradezen:indicadores:favoritos";

export function lerFavoritos() {
  try {
    const cru = JSON.parse(localStorage.getItem(CHAVE_FAV) || "[]");
    // Só ids que ainda existem: um favorito de indicador removido do
    // catálogo viraria um chip fantasma na aba Favoritos.
    const validos = new Set(CATALOGO_INDICADORES.map((i) => i.id));
    return new Set((Array.isArray(cru) ? cru : []).filter((id) => validos.has(id)));
  } catch {
    return new Set();   // aba anônima ou storage bloqueado
  }
}

function gravarFavoritos(favs) {
  try { localStorage.setItem(CHAVE_FAV, JSON.stringify([...favs])); } catch { /* sem storage */ }
}

// Busca sem acento e sem caixa: quem digita "medias" acha "Médias
// Móveis", e quem digita "MACD" acha pelo alias.
function normalizar(t) {
  return (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function filtrarIndicadores(lista, { categoria, busca, favoritos }) {
  const q = normalizar(busca).trim();
  return lista.filter((ind) => {
    // Busca atravessa as abas: procurar e ainda ter que achar a aba certa
    // é duas buscas pro mesmo resultado.
    if (!q) {
      if (categoria === "favoritos") return favoritos.has(ind.id);
      if (categoria !== "todos" && ind.categoria !== categoria) return false;
    }
    if (!q) return true;
    const alvo = normalizar(
      [ind.label, ind.subgrupo, ind.aliases, ind.id, ROTULO_CATEGORIA[ind.categoria]]
        .filter(Boolean).join(" "),
    );
    return q.split(/\s+/).every((parte) => alvo.includes(parte));
  });
}

export default function PainelIndicadores({ tools, aoAlternar, aoFechar }) {
  const [categoria, setCategoria] = useState("todos");
  const [busca, setBusca] = useState("");
  const [favoritos, setFavoritos] = useState(lerFavoritos);
  const buscaRef = useRef(null);

  useEffect(() => {
    const tecla = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();               // o gráfico atrás também escuta Esc
      if (busca) { setBusca(""); return; }
      aoFechar?.();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [busca, aoFechar]);

  // Trava a rolagem do body enquanto o modal está aberto: sem isso a
  // roda do mouse sobre o fundo escurecido rola a página atrás, e no
  // celular o gesto de rolar a grade de chips arrasta a tela inteira.
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, []);

  const alternarFavorito = (id) => {
    setFavoritos((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      gravarFavoritos(novo);
      return novo;
    });
  };

  const visiveis = useMemo(
    () => filtrarIndicadores(CATALOGO_INDICADORES, { categoria, busca, favoritos }),
    [categoria, busca, favoritos],
  );

  // Agrupa por subgrupo mantendo a ordem do catálogo — Map preserva a
  // ordem de inserção, então não há sort nenhum aqui.
  const porSubgrupo = useMemo(() => {
    const m = new Map();
    for (const ind of visiveis) {
      const chave = ind.subgrupo || "Outros";
      if (!m.has(chave)) m.set(chave, []);
      m.get(chave).push(ind);
    }
    return [...m.entries()];
  }, [visiveis]);

  const ativos = CATALOGO_INDICADORES.filter((i) => tools.has(i.id));

  const contarNaAba = (id) => {
    if (id === "favoritos") return ativos.filter((i) => favoritos.has(i.id)).length;
    return ativos.filter((i) => i.categoria === id).length;
  };

  const abas = [
    { id: "todos", label: "Todos" },
    ...CATEGORIAS_INDICADOR,
    ...(favoritos.size ? [{ id: "favoritos", label: "★ Favoritos" }] : []),
  ];

  return (
    <div
      className="pind-fundo"
      // Fecha só no clique no PRÓPRIO fundo. Sem o teste de target, um
      // clique que começa num chip e solta no fundo fecharia o painel.
      onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar?.(); }}
      role="presentation"
    >
      <div
        className="pind"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Indicadores"
      >
      <div className="pind-topo">
        <span className="pind-titulo">Indicadores</span>
        <input
          ref={buscaRef}
          className="pind-busca"
          type="search"
          value={busca}
          placeholder="Buscar indicador..."
          aria-label="Buscar indicador"
          onChange={(e) => setBusca(e.target.value)}
        />
        <button type="button" className="pind-x" onClick={aoFechar} aria-label="Fechar">✕</button>
      </div>

      {/* As abas desaparecem durante a busca: com o filtro valendo pra
          todas elas, uma aba "ativa" que não limita nada é mentira na
          tela. */}
      {!busca && (
        <div className="pind-abas" role="tablist" aria-label="Categorias de indicador">
          {abas.map((aba) => {
            const n = contarNaAba(aba.id);
            return (
              <button
                key={aba.id}
                type="button"
                role="tab"
                aria-selected={categoria === aba.id}
                className={`pind-aba${categoria === aba.id ? " ativa" : ""}`}
                onClick={() => setCategoria(aba.id)}
              >
                {aba.label}
                {aba.id !== "todos" && n > 0 && <span className="pind-aba-n">{n}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="pind-corpo">
        {porSubgrupo.length === 0 && (
          <p className="pind-vazio">Nenhum indicador com esse nome.</p>
        )}

        {porSubgrupo.map(([subgrupo, itens]) => (
          <div key={subgrupo} className="pind-secao">
            <div className="pind-secao-titulo">{subgrupo}</div>
            <div className="pind-grade">
              {itens.map((ind) => {
                const ligado = tools.has(ind.id);
                return (
                  <div
                    key={ind.id}
                    className={`pind-chip${ligado ? " ligado" : ""}${ind.pronto ? "" : " breve"}`}
                  >
                    <button
                      type="button"
                      className="pind-chip-btn"
                      disabled={!ind.pronto}
                      aria-pressed={ind.pronto ? ligado : undefined}
                      title={ind.pronto ? ind.label : `${ind.label} — em breve`}
                      onClick={() => ind.pronto && aoAlternar?.(ind.id)}
                    >
                      <span className="pind-bolinha" style={{ background: ind.cor }} />
                      <span className="pind-nome">{ind.label}</span>
                      {!ind.pronto && <span className="pind-breve">em breve</span>}
                    </button>
                    {/* Favoritar só o que funciona: guardar atalho pra
                        algo que não desenha não serve de atalho. */}
                    {ind.pronto && (
                      <button
                        type="button"
                        className={`pind-fav${favoritos.has(ind.id) ? " on" : ""}`}
                        onClick={() => alternarFavorito(ind.id)}
                        aria-label={favoritos.has(ind.id)
                          ? `Tirar ${ind.label} dos favoritos`
                          : `Favoritar ${ind.label}`}
                      >
                        {favoritos.has(ind.id) ? "★" : "☆"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="pind-rodape">
        <span className="pind-conta">
          {ativos.length === 0
            ? "Nenhum ativo"
            : `${ativos.length} ${ativos.length === 1 ? "ativo" : "ativos"}`}
        </span>
        <button
          type="button"
          className="pind-limpar"
          disabled={ativos.length === 0}
          onClick={() => ativos.forEach((i) => aoAlternar?.(i.id))}
        >
          Limpar todos
        </button>
        <button type="button" className="pind-ok" onClick={aoFechar}>Aplicar</button>
      </div>
      </div>
    </div>
  );
}
